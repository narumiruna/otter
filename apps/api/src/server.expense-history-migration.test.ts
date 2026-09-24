import { randomUUID } from "node:crypto";
import { cp, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { isExpenseSnapshot } from "@narumitw/otter-contracts";
import pg from "pg";
import { expect, test } from "vitest";
import { migrationsDirectory, runMigrations } from "../scripts/migrate.js";
import { postgresTestOptions, testDatabaseUrl } from "./server-test-utils.js";

test("014 upgrades 10,000 legacy expenses without changing ledger data and records honest baselines", {
  ...postgresTestOptions,
  timeout: 120_000,
}, async () => {
  const admin = new pg.Pool({ connectionString: testDatabaseUrl });
  const schema = `history_migration_${randomUUID().replaceAll("-", "")}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new pg.Pool({
    connectionString: testDatabaseUrl,
    options: `-c search_path=${schema}`,
  });
  const directory = await mkdtemp(
    path.join(tmpdir(), "otter-history-migrations-"),
  );
  const logger = { log: () => {} };
  try {
    for (const file of await readdir(migrationsDirectory())) {
      if (file < "014")
        await cp(
          path.join(migrationsDirectory(), file),
          path.join(directory, file),
        );
    }
    expect(
      await runMigrations(pool, { migrationsDir: directory, logger }),
    ).toBe(13);
    await pool.query(`
      INSERT INTO users (id, name, username, password_hash) VALUES ('u','User','user','unused');
      INSERT INTO trips (id,owner_id,name,base_currency) VALUES ('t','u','Legacy','TWD');
      INSERT INTO trip_members (id,trip_id,user_id,role) VALUES ('m','t','u','owner');
      INSERT INTO participants (id,trip_id,name) VALUES ('a','t','Alice'),('b','t','Bob');
      INSERT INTO expenses (id,trip_id,description,amount_minor,currency,paid_by_id,expense_date)
        SELECT 'e_' || i, 't', 'Legacy ' || i, 100, 'TWD', 'a', DATE '2020-01-01' FROM generate_series(1,10000) i;
      INSERT INTO expense_participants (trip_id,expense_id,participant_id,position,share_minor)
        SELECT 't', 'e_' || i, p.id, p.position, CASE WHEN i % 2 = 0 THEN p.share ELSE NULL END
        FROM generate_series(1,10000) i CROSS JOIN (VALUES ('b',0,75),('a',1,25)) p(id,position,share);
      INSERT INTO receipt_attachments (id,trip_id,expense_id,mime_type,data) VALUES ('receipt','t','e_1','image/png',decode('010203','hex'));
      INSERT INTO settlement_payments (id,trip_id,from_id,to_id,amount_minor,currency,paid_at,note) VALUES ('payment','t','b','a',50,'TWD','2020-01-02','Paid');
    `);
    const fingerprint = async () =>
      (
        await pool.query(`SELECT
      (SELECT md5(string_agg((to_jsonb(e) - 'version')::text, '' ORDER BY id)) FROM expenses e) AS expenses,
      (SELECT md5(string_agg(to_jsonb(s)::text, '' ORDER BY expense_id, position)) FROM expense_participants s) AS shares,
      (SELECT md5(string_agg(to_jsonb(r)::text, '' ORDER BY id)) FROM receipt_attachments r) AS receipts,
      (SELECT md5(string_agg(to_jsonb(p)::text, '' ORDER BY id)) FROM settlement_payments p) AS payments`)
      ).rows[0];
    const original = await fingerprint();
    await cp(
      path.join(migrationsDirectory(), "014_expense_revisions.sql"),
      path.join(directory, "014_expense_revisions.sql"),
    );
    const start = performance.now();
    expect(
      await runMigrations(pool, { migrationsDir: directory, logger }),
    ).toBe(1);
    const milliseconds = performance.now() - start;
    expect(
      await runMigrations(pool, { migrationsDir: directory, logger }),
    ).toBe(0);
    expect(await fingerprint()).toEqual(original);
    const rows = await pool.query("SELECT * FROM expense_revisions");
    expect(rows.rowCount).toBe(10000);
    for (const row of rows.rows) {
      expect(row.version).toBe(1);
      expect(row.action).toBe("baseline");
      expect(row.source).toBe("migration");
      expect(row.actor).toBeNull();
      expect(isExpenseSnapshot(row.snapshot)).toBe(true);
      expect(row.snapshot.expense.participantIds).toEqual(["b", "a"]);
    }
    const equal = rows.rows.find((row) => row.expense_id === "e_1");
    expect(equal?.snapshot.expense.participantShares).toBeUndefined();
    expect(equal?.snapshot.receipt).toEqual({
      id: "receipt",
      mimeType: "image/png",
    });
    expect(JSON.stringify(equal?.snapshot)).not.toMatch(/receiptUrl|010203/);
    const bytes = Number(
      (
        await pool.query(
          "SELECT pg_total_relation_size('expense_revisions') AS bytes",
        )
      ).rows[0].bytes,
    );
    expect(milliseconds).toBeLessThan(60_000);
    expect(bytes).toBeLessThan(128 * 1024 * 1024);
    console.log(
      `Expense history rehearsal: 10000 expenses, ${Math.round(milliseconds)} ms, ${bytes} history bytes, unchanged ledger fingerprints`,
    );
  } finally {
    await pool.end();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
    await rm(directory, { force: true, recursive: true });
  }
});
