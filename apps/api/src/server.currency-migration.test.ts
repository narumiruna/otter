import { randomUUID } from "node:crypto";
import { cp, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fixedExchangeRates } from "@narumitw/otter-core/money";
import pg from "pg";
import { expect, test } from "vitest";
import { migrationsDirectory, runMigrations } from "../scripts/migrate.js";
import { postgresTestOptions, testDatabaseUrl } from "./server-test-utils.js";

test(
  "024 preserves records and accepts new currencies in all financial constraints",
  postgresTestOptions,
  async () => {
    const admin = new pg.Pool({ connectionString: testDatabaseUrl });
    const schema = `currency_migration_${randomUUID().replaceAll("-", "")}`;
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new pg.Pool({
      connectionString: testDatabaseUrl,
      options: `-c search_path=${schema}`,
    });
    const dir = await mkdtemp(
      path.join(tmpdir(), "otter-currency-migrations-"),
    );
    const logger = { log: () => {} };
    try {
      for (const file of await readdir(migrationsDirectory())) {
        if (file < "024")
          await cp(
            path.join(migrationsDirectory(), file),
            path.join(dir, file),
          );
      }
      expect(await runMigrations(pool, { migrationsDir: dir, logger })).toBe(
        23,
      );
      await pool.query(`
      INSERT INTO users (id,name,username,password_hash) VALUES ('u','User','user','unused');
      INSERT INTO trips (id,owner_id,name,base_currency) VALUES ('t','u','Trip','TWD');
      INSERT INTO participants (id,trip_id,name) VALUES ('a','t','Alice'), ('b','t','Bob');
      INSERT INTO expenses (id,trip_id,description,amount_minor,currency,paid_by_id,expense_date)
        VALUES ('e','t','Dinner',1000,'TWD','a','2026-07-05');
      INSERT INTO expense_participants (trip_id,expense_id,participant_id,position) VALUES ('t','e','a',0), ('t','e','b',1);
      INSERT INTO settlement_payments (id,trip_id,from_id,to_id,amount_minor,currency,paid_at)
        VALUES ('p','t','b','a',100,'TWD','2026-07-06');
      INSERT INTO trip_exchange_rates (trip_id,currency,rate_to_base) VALUES ('t','TWD',1);
    `);
      const before = (
        await pool.query(
          "SELECT expense_revision_snapshot(e) AS snapshot FROM expenses e",
        )
      ).rows[0].snapshot;
      await cp(
        path.join(migrationsDirectory(), "024_travel_currencies.sql"),
        path.join(dir, "024_travel_currencies.sql"),
      );
      expect(await runMigrations(pool, { migrationsDir: dir, logger })).toBe(1);
      expect(
        (
          await pool.query(
            "SELECT expense_revision_snapshot(e) AS snapshot FROM expenses e",
          )
        ).rows[0].snapshot,
      ).toEqual(before);
      for (const currency of ["SGD", "GBP", "AUD", "CAD", "KRW"] as const) {
        await pool.query(
          "UPDATE trips SET base_currency=$1, visa_settlement_currency=$1, visa_settlement_enabled=true",
          [currency],
        );
        await pool.query("UPDATE settlement_payments SET currency=$1", [
          currency,
        ]);
        await pool.query("UPDATE trip_exchange_rates SET currency=$1", [
          currency,
        ]);
        await pool.query(
          `UPDATE expenses SET currency=$1,
        exchange_rate=jsonb_build_object('baseCurrency',$1::text,'rateToBase',1,'source','fixed'),
        visa_exchange_rate=jsonb_build_object('sourceCurrency',$1::text,'targetCurrency',$1::text,'date',expense_date::text,'rate',1,'fetchedAt','2026-07-05T00:00:00Z')`,
          [currency],
        );
        const snapshot = (
          await pool.query(
            "SELECT expense_revision_snapshot(e) AS snapshot FROM expenses e",
          )
        ).rows[0].snapshot;
        expect(snapshot.expense.currency).toBe(currency);
        expect(snapshot.expense.visaExchangeRate.targetCurrency).toBe(currency);
        const legacy = (
          await pool.query("SELECT legacy_expense_rate($1,'TWD') AS rate", [
            currency,
          ])
        ).rows[0].rate;
        expect(legacy.rateToBase).toBe(fixedExchangeRates("TWD")[currency]);
      }
      for (const statement of [
        "UPDATE trips SET base_currency='BTC'",
        "UPDATE trips SET visa_settlement_currency='BTC'",
        "UPDATE expenses SET currency='BTC'",
        "UPDATE settlement_payments SET currency='BTC'",
        "UPDATE trip_exchange_rates SET currency='BTC'",
        `UPDATE expenses SET exchange_rate=jsonb_set(exchange_rate,'{baseCurrency}','"BTC"')`,
        `UPDATE expenses SET visa_exchange_rate=jsonb_set(visa_exchange_rate,'{targetCurrency}','"BTC"')`,
      ]) {
        await expect(pool.query(statement)).rejects.toMatchObject({
          code: "23514",
        });
      }
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await admin.end();
      await rm(dir, { recursive: true, force: true });
    }
  },
);
