import { randomUUID } from "node:crypto";
import { cp, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import pg from "pg";
import { expect, test } from "vitest";
import { migrationsDirectory, runMigrations } from "../scripts/migrate.js";
import { postgresTestOptions, testDatabaseUrl } from "./server-test-utils.js";

test(
  "019 marks existing expenses and revisions as estimates without inventing quotes",
  postgresTestOptions,
  async () => {
    const admin = new pg.Pool({ connectionString: testDatabaseUrl });
    const schema = `rate_migration_${randomUUID().replaceAll("-", "")}`;
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new pg.Pool({
      connectionString: testDatabaseUrl,
      options: `-c search_path=${schema}`,
    });
    const dir = await mkdtemp(path.join(tmpdir(), "otter-rate-migrations-"));
    const logger = { log: () => {} };
    try {
      for (const file of await readdir(migrationsDirectory())) {
        if (file < "019")
          await cp(
            path.join(migrationsDirectory(), file),
            path.join(dir, file),
          );
      }
      expect(await runMigrations(pool, { migrationsDir: dir, logger })).toBe(
        18,
      );
      await pool.query(`
      INSERT INTO users (id,name,username,password_hash) VALUES ('u','User','user','unused');
      INSERT INTO trips (id,owner_id,name,base_currency) VALUES ('t','u','Legacy','TWD');
      INSERT INTO trip_members (id,trip_id,user_id,role) VALUES ('m','t','u','owner');
      INSERT INTO participants (id,trip_id,name) VALUES ('a','t','Alice');
      INSERT INTO expenses (id,trip_id,description,amount_minor,currency,paid_by_id,expense_date) VALUES ('e','t','Dinner',100,'USD','a','2020-01-01');
      INSERT INTO expense_participants (trip_id,expense_id,participant_id,position) VALUES ('t','e','a',0);
      INSERT INTO expense_revisions (id,trip_id,expense_id,version,action,source,snapshot)
        SELECT 'r','t','e',1,'baseline','migration',expense_revision_snapshot(e) FROM expenses e WHERE id = 'e';
    `);
      await cp(
        path.join(migrationsDirectory(), "019_expense_exchange_rate.sql"),
        path.join(dir, "019_expense_exchange_rate.sql"),
      );
      expect(await runMigrations(pool, { migrationsDir: dir, logger })).toBe(1);
      expect(await runMigrations(pool, { migrationsDir: dir, logger })).toBe(0);
      const result =
        await pool.query(`SELECT e.exchange_rate, expense_revision_snapshot(e) AS live,
      r.snapshot AS historical FROM expenses e JOIN expense_revisions r ON r.expense_id = e.id`);
      expect(result.rows[0].exchange_rate).toEqual({
        baseCurrency: "TWD",
        rateToBase: 32,
        source: "legacy",
      });
      expect(result.rows[0].live.expense.exchangeRate).toEqual(
        result.rows[0].exchange_rate,
      );
      expect(result.rows[0].historical.expense.exchangeRate).toEqual(
        result.rows[0].exchange_rate,
      );
      await expect(
        pool.query(
          "UPDATE expenses SET exchange_rate = '{}'::jsonb WHERE id = 'e'",
        ),
      ).rejects.toThrow();
      await pool.query(
        "INSERT INTO expenses (id,trip_id,description,amount_minor,currency,paid_by_id,expense_date) VALUES ('old_writer','t','Old',100,'USD','a','2020-01-01')",
      );
      expect(
        (
          await pool.query(
            "SELECT expense_revision_snapshot(e) AS snapshot FROM expenses e WHERE id = 'old_writer'",
          )
        ).rows[0].snapshot.expense.exchangeRate.source,
      ).toBe("legacy");
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
      await rm(dir, { recursive: true, force: true });
    }
  },
);
