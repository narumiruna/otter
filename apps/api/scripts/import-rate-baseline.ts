import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type Currency, isCurrency } from "@narumitw/otter-core/money";
import type { Pool } from "pg";
import pg from "pg";

type Baseline = {
  tripId: string;
  baseCurrency: Currency;
  rates: Partial<Record<Currency, number>>;
  capturedAt: string;
};
export function parseRateBaselines(value: unknown): Baseline[] {
  if (!Array.isArray(value))
    throw new Error("Expected a JSON array of approved rate baselines");
  const ids = new Set<string>();
  return value.map((item: unknown) => {
    if (!item || typeof item !== "object" || Array.isArray(item))
      throw new Error("Invalid baseline");
    const entry = item as Record<string, unknown>;
    if (
      typeof entry.tripId !== "string" ||
      !entry.tripId ||
      ids.has(entry.tripId) ||
      !isCurrency(entry.baseCurrency) ||
      typeof entry.capturedAt !== "string" ||
      !Number.isFinite(Date.parse(entry.capturedAt)) ||
      !entry.rates ||
      typeof entry.rates !== "object" ||
      Array.isArray(entry.rates)
    )
      throw new Error("Invalid baseline metadata");
    ids.add(entry.tripId);
    const rates: Partial<Record<Currency, number>> = {};
    for (const [currency, rate] of Object.entries(entry.rates)) {
      if (
        !isCurrency(currency) ||
        typeof rate !== "number" ||
        !Number.isFinite(rate) ||
        rate <= 0
      )
        throw new Error("Invalid baseline rate");
      rates[currency] = rate;
    }
    if (rates[entry.baseCurrency] !== 1)
      throw new Error("Baseline base rate must be 1");
    return {
      tripId: entry.tripId,
      baseCurrency: entry.baseCurrency,
      rates,
      capturedAt: entry.capturedAt,
    };
  });
}

export async function importRateBaselines(
  pool: Pool,
  entries: readonly Baseline[],
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(2026, 625)");
    const cutover = await client.query(
      "SELECT 1 FROM schema_migrations WHERE version = '028_visa_rate_cutover'",
    );
    if (cutover.rowCount)
      throw new Error(
        "Cutover is already complete; its approved baselines cannot be changed",
      );
    for (const entry of [...entries].sort((a, b) =>
      a.tripId.localeCompare(b.tripId),
    )) {
      const trip = await client.query<{ base_currency: string }>(
        "SELECT base_currency FROM trips WHERE id = $1 FOR UPDATE",
        [entry.tripId],
      );
      if (trip.rows[0]?.base_currency !== entry.baseCurrency)
        throw new Error(
          `Missing trip or changed base currency: ${entry.tripId}`,
        );
      await client.query(
        "INSERT INTO rate_cutover_baselines (trip_id, base_currency, rates, captured_at) VALUES ($1, $2, $3, $4) ON CONFLICT (trip_id) DO UPDATE SET base_currency = EXCLUDED.base_currency, rates = EXCLUDED.rates, captured_at = EXCLUDED.captured_at",
        [entry.tripId, entry.baseCurrency, entry.rates, entry.capturedAt],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const input = process.argv[2];
  if (!input || !process.env.DATABASE_URL)
    throw new Error(
      "Usage: set DATABASE_URL, then run tsx scripts/import-rate-baseline.ts <approved-baselines.json>",
    );
  const entries = parseRateBaselines(JSON.parse(await readFile(input, "utf8")));
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await importRateBaselines(pool, entries);
    console.log(`Imported ${entries.length} approved rate baselines`);
  } finally {
    await pool.end();
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
