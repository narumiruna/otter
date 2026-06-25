import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool as PgPool, PoolClient } from "pg";
import pg from "pg";

const { Pool } = pg;
const lockKey = [2026, 625];

type Logger = Pick<typeof console, "log">;

type Migration = {
  sql: string;
  version: string;
};

type MigrationOptions = {
  logger?: Logger;
  migrationsDir?: string;
};

export async function runMigrations(
  pool: PgPool,
  options: MigrationOptions = {},
): Promise<number> {
  const logger = options.logger ?? console;
  const migrationsDir =
    options.migrationsDir ?? path.resolve(process.cwd(), "db/migrations");
  const migrations = await readMigrations(migrationsDir);
  const client = await pool.connect();
  let locked = false;
  let appliedCount = 0;

  try {
    await client.query("SELECT pg_advisory_lock($1, $2)", lockKey);
    locked = true;
    await ensureMigrationTable(client);
    const applied = await appliedVersions(client);

    for (const migration of migrations) {
      if (applied.has(migration.version)) {
        continue;
      }

      logger.log(`Applying ${migration.version}`);
      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query(
          "INSERT INTO schema_migrations (version) VALUES ($1)",
          [migration.version],
        );
        await client.query("COMMIT");
        appliedCount += 1;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    if (locked) {
      await client.query("SELECT pg_advisory_unlock($1, $2)", lockKey);
    }
    client.release();
  }

  logger.log(
    appliedCount === 0
      ? "No pending migrations."
      : `Applied ${appliedCount} migration(s).`,
  );
  return appliedCount;
}

async function ensureMigrationTable(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function appliedVersions(client: PoolClient): Promise<Set<string>> {
  const result = await client.query<{ version: string }>(
    "SELECT version FROM schema_migrations",
  );
  return new Set(result.rows.map((row) => row.version));
}

async function readMigrations(migrationsDir: string): Promise<Migration[]> {
  const names = (await readdir(migrationsDir))
    .filter((name) => /^\d+_.+\.sql$/.test(name))
    .sort();

  return Promise.all(
    names.map(async (name) => ({
      sql: await readFile(path.join(migrationsDir, name), "utf8"),
      version: name.slice(0, -".sql".length),
    })),
  );
}

function usage(): string {
  return `Usage: DATABASE_URL=postgres://user:pass@host:5432/db npm run migrate

Applies pending db/migrations/*.sql files once.

Options:
  --help    Show this help.`;
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log(usage());
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required.\n");
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    await runMigrations(pool);
  } finally {
    await pool.end();
  }
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === thisFile) {
  void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
