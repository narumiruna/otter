import { randomUUID } from "node:crypto";
import { cp, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { isExpenseExchangeRate } from "@narumitw/otter-core/money";
import { calculateBalances, type Trip } from "@narumitw/otter-core/settlement";
import pg from "pg";
import { expect, onTestFinished, test } from "vitest";
import {
  importRateBaselines,
  parseRateBaselines,
} from "../scripts/import-rate-baseline.js";
import { migrationsDirectory, runMigrations } from "../scripts/migrate.js";
import { loadTripForUser } from "./server-support.js";
import { postgresTestOptions, testDatabaseUrl } from "./server-test-utils.js";

const logger = { log: () => {} };
const date = "2026-07-05";
async function legacyDatabase() {
  const admin = new pg.Pool({ connectionString: testDatabaseUrl });
  const schema = `visa_cutover_${randomUUID().replaceAll("-", "")}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new pg.Pool({
    connectionString: testDatabaseUrl,
    options: `-c search_path=${schema}`,
  });
  const dir = await mkdtemp(path.join(tmpdir(), "otter-visa-cutover-"));
  onTestFinished(async () => {
    await pool.end();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
    await rm(dir, { recursive: true, force: true });
  });
  for (const file of await readdir(migrationsDirectory()))
    if (file < "027")
      await cp(path.join(migrationsDirectory(), file), path.join(dir, file));
  expect(await runMigrations(pool, { migrationsDir: dir, logger })).toBe(26);
  await pool.query(`
    INSERT INTO users (id,name,username,password_hash) VALUES ('u','Owner','owner','unused');
    INSERT INTO trips (id,owner_id,name,base_currency) VALUES ('t','u','Japan','JPY');
    INSERT INTO trip_members (id,trip_id,user_id,role) VALUES ('m','t','u','owner');
    INSERT INTO participants (id,trip_id,name) VALUES ('a','t','Alice'), ('b','t','Bob');
    INSERT INTO expenses (id,trip_id,description,amount_minor,currency,paid_by_id,expense_date,exchange_rate)
      VALUES ('e','t','Hotel',100,'USD','a','2026-07-05','{"baseCurrency":"TWD","rateToBase":32,"source":"bank","provider":"BANK_OF_TAIWAN","rateType":"spotMid","fetchedAt":"2026-07-05T00:00:00Z","date":{"oldExtra":"preserved"}}');
    INSERT INTO expense_participants (trip_id,expense_id,participant_id,position) VALUES ('t','e','a',0), ('t','e','b',1);
    INSERT INTO expense_revisions (id,trip_id,expense_id,version,action,source,snapshot)
      SELECT 'r','t','e',1,'created','expense',expense_revision_snapshot(e) FROM expenses e;
    INSERT INTO settlement_payments (id,trip_id,from_id,to_id,amount_minor,currency,paid_at)
      VALUES ('p','t','b','a',10,'USD','2026-07-05');
  `);
  return pool;
}

test(
  "cutover stops without approved rates, then preserves old values and freezes floating conversions",
  postgresTestOptions,
  async () => {
    const pool = await legacyDatabase();
    const before = (
      await pool.query(
        "SELECT exchange_rate, amount_minor FROM expenses WHERE id = 'e'",
      )
    ).rows[0];
    const history = (
      await pool.query("SELECT snapshot FROM expense_revisions WHERE id = 'r'")
    ).rows[0].snapshot;
    const book = { JPY: 1, TWD: 5, USD: 160 };
    const previous: Trip = {
      id: "t",
      name: "Japan",
      ownerId: "u",
      baseCurrency: "JPY",
      createdAt: "2026-07-05T00:00:00Z",
      exchangeRates: book,
      participants: [
        { id: "a", name: "Alice" },
        { id: "b", name: "Bob" },
      ],
      expenses: [{ ...history.expense }],
      settlementPayments: [
        {
          id: "p",
          fromId: "b",
          toId: "a",
          amountMinor: 10,
          currency: "USD",
          paidAt: date,
          note: "",
          createdAt: "2026-07-05T00:00:00Z",
        },
      ],
    };
    const balances = calculateBalances(previous);
    expect(balances.map((b) => b.amountMinor)).toEqual([64, -64]);
    await expect(runMigrations(pool, { logger })).rejects.toThrow(
      "Missing rate cutover baseline",
    );
    expect(
      (
        await pool.query(
          "SELECT exchange_rate_bridge FROM expenses WHERE id = 'e'",
        )
      ).rows[0].exchange_rate_bridge,
    ).toBeNull();
    expect(
      (
        await pool.query(
          "SELECT version FROM schema_migrations WHERE version LIKE '027%' ",
        )
      ).rowCount,
    ).toBe(1);
    await expect(
      importRateBaselines(
        pool,
        parseRateBaselines([
          {
            tripId: "t",
            baseCurrency: "TWD",
            rates: { TWD: 1 },
            capturedAt: "2026-10-25T00:00:00Z",
          },
        ]),
      ),
    ).rejects.toThrow("changed base");
    expect(
      (await pool.query("SELECT * FROM rate_cutover_baselines")).rowCount,
    ).toBe(0);
    await importRateBaselines(
      pool,
      parseRateBaselines([
        {
          tripId: "t",
          baseCurrency: "JPY",
          rates: book,
          capturedAt: "2026-10-25T00:00:00Z",
        },
      ]),
    );
    expect(await runMigrations(pool, { logger })).toBe(2);
    expect(await runMigrations(pool, { logger })).toBe(0);
    const after = (
      await pool.query(
        "SELECT exchange_rate, amount_minor, exchange_rate_bridge FROM expenses WHERE id = 'e'",
      )
    ).rows[0];
    expect(after.exchange_rate).toEqual(before.exchange_rate);
    expect(after.amount_minor).toBe(before.amount_minor);
    expect(after.exchange_rate_bridge).toEqual({
      sourceCurrency: "TWD",
      baseCurrency: "JPY",
      rateToBase: 5,
      source: "legacy",
    });
    expect(
      (
        await pool.query(
          "SELECT snapshot FROM expense_revisions WHERE id = 'r'",
        )
      ).rows[0].snapshot,
    ).toEqual(history);
    const current = await loadTripForUser(pool, "u", "t");
    expect(current).toBeDefined();
    if (!current) throw new Error("Missing migrated trip");
    expect(calculateBalances(current)).toEqual(balances);
    expect(current.settlementPayments?.[0].exchangeRate).toMatchObject({
      source: "legacy",
      rateToBase: 160,
    });
    await expect(importRateBaselines(pool, [])).rejects.toThrow(
      "already complete",
    );
  },
);

test(
  "Visa SQL and TypeScript guards reject stale dates, wrong metadata and unsafe rates",
  postgresTestOptions,
  async () => {
    const pool = await legacyDatabase();
    await pool.query(
      "INSERT INTO trip_exchange_rates (trip_id,currency,rate_to_base) VALUES ('t','TWD',5),('t','USD',160)",
    );
    expect(await runMigrations(pool, { logger })).toBe(3);
    const valid = {
      baseCurrency: "TWD",
      source: "visa",
      provider: "VISA",
      rateType: "visa",
      rateToBase: 32,
      date,
      fetchedAt: "2026-07-05T00:00:00Z",
    };
    await pool.query("UPDATE expenses SET exchange_rate = $1 WHERE id = 'e'", [
      valid,
    ]);
    expect(isExpenseExchangeRate(valid, "USD", date)).toBe(true);
    for (const invalid of [
      { ...valid, date: "2026-07-06" },
      { ...valid, date: undefined },
      { ...valid, provider: "BANK_OF_TAIWAN" },
      { ...valid, rateToBase: 0 },
      { ...valid, fetchedAt: "invalid" },
    ]) {
      expect(isExpenseExchangeRate(invalid, "USD", date)).toBe(false);
      await expect(
        pool.query("UPDATE expenses SET exchange_rate = $1 WHERE id = 'e'", [
          invalid,
        ]),
      ).rejects.toThrow();
    }
    await expect(
      pool.query(
        'UPDATE expenses SET exchange_rate_bridge = \'{"sourceCurrency":"EUR","baseCurrency":"JPY","rateToBase":1,"source":"legacy"}\' WHERE id = \'e\'',
      ),
    ).rejects.toThrow();
  },
);

test("baseline input rejects duplicates, unknown currencies and non-finite rates", () => {
  const valid = {
    tripId: "t",
    baseCurrency: "JPY",
    rates: { JPY: 1, TWD: 5 },
    capturedAt: "2026-10-25T00:00:00Z",
  };
  expect(parseRateBaselines([valid])).toEqual([valid]);
  for (const invalid of [
    [valid, valid],
    [{ ...valid, rates: { JPY: 2 } }],
    [{ ...valid, rates: { JPY: 1, BTC: 5 } }],
    [{ ...valid, rates: { JPY: 1, TWD: Number.POSITIVE_INFINITY } }],
  ])
    expect(() => parseRateBaselines(invalid)).toThrow();
});
