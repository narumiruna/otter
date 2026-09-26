import { randomUUID } from "node:crypto";
import { cp, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import pg from "pg";
import { expect, test } from "vitest";
import { migrationsDirectory, runMigrations } from "../scripts/migrate.js";
import { postgresTestOptions, testDatabaseUrl } from "./server-test-utils.js";

test(
  "019 and 020 backfill legacy estimates using saved custom rates when available",
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
      INSERT INTO trip_exchange_rates (trip_id,currency,rate_to_base) VALUES ('t','USD',40), ('t','EUR',1000000000);
      INSERT INTO expenses (id,trip_id,description,amount_minor,currency,paid_by_id,expense_date) VALUES
        ('e','t','Dinner',100,'USD','a','2020-01-01'),
        ('edit','t','Edited later',100,'USD','a','2020-01-01'),
        ('unsafe','t','Large',1000000000,'EUR','a','2020-01-01');
      INSERT INTO expense_participants (trip_id,expense_id,participant_id,position) VALUES
        ('t','e','a',0), ('t','edit','a',0), ('t','unsafe','a',0);
      INSERT INTO expense_revisions (id,trip_id,expense_id,version,action,source,snapshot)
        SELECT 'r_' || e.id,'t',e.id,1,'baseline','migration',expense_revision_snapshot(e)
        FROM expenses e;
    `);
      await cp(
        path.join(migrationsDirectory(), "019_expense_exchange_rate.sql"),
        path.join(dir, "019_expense_exchange_rate.sql"),
      );
      expect(await runMigrations(pool, { migrationsDir: dir, logger })).toBe(1);
      // A retained legacy snapshot edited after 019 must stay aligned with its latest revision.
      await pool.query(`
        UPDATE expenses SET description = 'Changed description', version = 2 WHERE id = 'edit';
        INSERT INTO expense_revisions (id,trip_id,expense_id,version,action,source,snapshot)
          SELECT 'edit_new','t','edit',2,'updated','expense',expense_revision_snapshot(e) FROM expenses e WHERE id = 'edit';
      `);
      // A legacy snapshot made after 019 (e.g. a v1 restore) must not be rewritten.
      await pool.query(`
        INSERT INTO expenses (id,trip_id,description,amount_minor,currency,paid_by_id,expense_date,exchange_rate)
        VALUES ('new','t','New',100,'USD','a','2020-01-01',legacy_expense_rate('USD','TWD'));
        INSERT INTO expense_participants (trip_id,expense_id,participant_id,position) VALUES ('t','new','a',0);
        INSERT INTO expense_revisions (id,trip_id,expense_id,version,action,source,snapshot)
          SELECT 'new_rev','t','new',1,'created','backup_restore',expense_revision_snapshot(e) FROM expenses e WHERE id = 'new';
      `);
      await cp(
        path.join(migrationsDirectory(), "020_legacy_custom_rates.sql"),
        path.join(dir, "020_legacy_custom_rates.sql"),
      );
      await expect(
        runMigrations(pool, { migrationsDir: dir, logger }),
      ).rejects.toThrow(/Legacy custom rate exceeds safe conversion range/);
      expect(
        (
          await pool.query(
            "SELECT exchange_rate->>'rateToBase' AS rate FROM expenses WHERE id = 'e'",
          )
        ).rows[0].rate,
      ).toMatch(/^32(\.0+)?$/);
      expect(
        (
          await pool.query(
            "SELECT count(*)::int AS count FROM schema_migrations WHERE version = '020_legacy_custom_rates'",
          )
        ).rows[0].count,
      ).toBe(0);
      await pool.query(
        "DELETE FROM expense_revisions WHERE expense_id = 'unsafe'",
      );
      await pool.query("DELETE FROM expenses WHERE id = 'unsafe'");
      expect(await runMigrations(pool, { migrationsDir: dir, logger })).toBe(1);
      expect(await runMigrations(pool, { migrationsDir: dir, logger })).toBe(0);
      const edited = await pool.query(
        "SELECT e.exchange_rate, r.version, r.snapshot->'expense'->'exchangeRate' AS historical FROM expenses e JOIN expense_revisions r ON r.expense_id = e.id WHERE e.id = 'edit' ORDER BY r.version",
      );
      expect(edited.rows[0].historical.rateToBase).toBe(40);
      expect(edited.rows[1].historical.rateToBase).toBe(32);
      expect(edited.rows[1].exchange_rate.rateToBase).toBe(32);
      const later = await pool.query(
        "SELECT e.exchange_rate, r.snapshot->'expense'->'exchangeRate' AS historical FROM expenses e JOIN expense_revisions r ON r.expense_id = e.id WHERE e.id = 'new'",
      );
      expect(later.rows[0].exchange_rate.rateToBase).toBe(32);
      expect(later.rows[0].historical.rateToBase).toBe(32);
      const result =
        await pool.query(`SELECT e.exchange_rate, expense_revision_snapshot(e) AS live,
      r.snapshot AS historical FROM expenses e JOIN expense_revisions r ON r.expense_id = e.id WHERE e.id = 'e'`);
      expect(result.rows[0].exchange_rate).toEqual({
        baseCurrency: "TWD",
        rateToBase: 40,
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
