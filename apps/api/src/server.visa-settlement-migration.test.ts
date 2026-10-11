import { randomUUID } from "node:crypto";
import { cp, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import pg from "pg";
import { expect, test } from "vitest";
import { migrationsDirectory, runMigrations } from "../scripts/migrate.js";
import { postgresTestOptions, testDatabaseUrl } from "./server-test-utils.js";

test(
  "023 starts Visa mode off and preserves original expenses, payments, and history",
  postgresTestOptions,
  async () => {
    const admin = new pg.Pool({ connectionString: testDatabaseUrl });
    const schema = `visa_migration_${randomUUID().replaceAll("-", "")}`;
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new pg.Pool({
      connectionString: testDatabaseUrl,
      options: `-c search_path=${schema}`,
    });
    const dir = await mkdtemp(path.join(tmpdir(), "otter-visa-migrations-"));
    const logger = { log: () => {} };
    try {
      for (const file of await readdir(migrationsDirectory())) {
        if (file < "023")
          await cp(
            path.join(migrationsDirectory(), file),
            path.join(dir, file),
          );
      }
      expect(await runMigrations(pool, { migrationsDir: dir, logger })).toBe(
        22,
      );
      await pool.query(`
      INSERT INTO users (id,name,username,password_hash) VALUES ('u','User','user','unused');
      INSERT INTO trips (id,owner_id,name,base_currency) VALUES ('t','u','Existing trip','JPY');
      INSERT INTO participants (id,trip_id,name) VALUES ('a','t','Alice'), ('b','t','Bob');
      INSERT INTO expenses (id,trip_id,description,amount_minor,currency,paid_by_id,expense_date,exchange_rate)
        VALUES ('e','t','Dinner',1000,'JPY','a','2026-07-05','{"baseCurrency":"JPY","rateToBase":1,"source":"fixed"}');
      INSERT INTO expense_participants (trip_id,expense_id,participant_id,position) VALUES ('t','e','a',0), ('t','e','b',1);
      INSERT INTO settlement_payments (id,trip_id,from_id,to_id,amount_minor,currency,paid_at,note)
        VALUES ('p','t','b','a',100,'JPY','2026-07-06','Paid');
      INSERT INTO expense_revisions (id,trip_id,expense_id,version,action,source,snapshot)
        SELECT 'r','t',e.id,1,'created','expense',expense_revision_snapshot(e) FROM expenses e;
    `);
      const before = (
        await pool.query(
          "SELECT expense_revision_snapshot(e) AS snapshot FROM expenses e",
        )
      ).rows[0].snapshot;
      const paymentBefore = (
        await pool.query(
          "SELECT to_jsonb(p) AS payment FROM settlement_payments p",
        )
      ).rows[0].payment;
      await cp(
        path.join(migrationsDirectory(), "023_visa_settlement.sql"),
        path.join(dir, "023_visa_settlement.sql"),
      );
      expect(await runMigrations(pool, { migrationsDir: dir, logger })).toBe(1);
      expect(
        (
          await pool.query(
            "SELECT visa_settlement_enabled,visa_settlement_currency FROM trips",
          )
        ).rows[0],
      ).toEqual({
        visa_settlement_enabled: false,
        visa_settlement_currency: null,
      });
      const after = (
        await pool.query(
          "SELECT amount_minor,visa_exchange_rate,expense_revision_snapshot(e) AS snapshot FROM expenses e",
        )
      ).rows[0];
      expect(Number(after.amount_minor)).toBe(1000);
      expect(after.visa_exchange_rate).toBeNull();
      expect(after.snapshot).toEqual(before);
      expect(
        (await pool.query("SELECT snapshot FROM expense_revisions")).rows[0]
          .snapshot,
      ).toEqual(before);
      expect(
        (
          await pool.query(
            "SELECT to_jsonb(p) AS payment FROM settlement_payments p",
          )
        ).rows[0].payment,
      ).toEqual(paymentBefore);
      await expect(
        pool.query(
          "UPDATE trips SET visa_settlement_enabled=true WHERE id='t'",
        ),
      ).rejects.toThrow();
      await expect(
        pool.query(
          "UPDATE trips SET visa_settlement_currency='BTC' WHERE id='t'",
        ),
      ).rejects.toThrow();
      await pool.query(
        "UPDATE trips SET visa_settlement_currency='USD' WHERE id='t'",
      );
      await pool.query(
        `UPDATE expenses SET visa_exchange_rate='{"sourceCurrency":"JPY","targetCurrency":"USD","date":"2026-07-05","rate":0.0065,"fetchedAt":"2026-07-06T00:00:00Z"}' WHERE id='e'`,
      );
      expect(
        (
          await pool.query(
            "SELECT expense_revision_snapshot(e)->'expense'->'visaExchangeRate' AS rate FROM expenses e",
          )
        ).rows[0].rate.targetCurrency,
      ).toBe("USD");
      await expect(
        pool.query(
          "UPDATE expenses SET visa_exchange_rate=jsonb_set(visa_exchange_rate,'{targetCurrency}','\"JPY\"') WHERE id='e'",
        ),
      ).rejects.toThrow();
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await admin.end();
      await rm(dir, { recursive: true, force: true });
    }
  },
);
