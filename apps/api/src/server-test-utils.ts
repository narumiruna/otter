import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { createAdaptorServer } from "@hono/node-server";
import type {
  TripPayload,
  TripsResponse,
  UserResponse,
} from "@narumitw/otter-contracts";
import { fixedExchangeRates, isCurrency } from "@narumitw/otter-core/money";
import type {
  VisaRate,
  VisaRateQuery,
} from "@narumitw/otter-visa-exchange-rates";
import type { Pool as PgPool } from "pg";
import pg from "pg";
import { onTestFinished } from "vitest";
import { runMigrations } from "../scripts/migrate.js";
import { createApp } from "./server.js";

const { Pool } = pg;
const silentLogger = { log: (..._messages: unknown[]) => {} };
export const testDatabaseUrl = process.env.DATABASE_URL;

export const postgresTestOptions = {
  skip: testDatabaseUrl ? false : "set DATABASE_URL to run",
};

export type ApiInit = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

export type { TripPayload, TripsResponse, UserResponse };

type TestAppOptions = {
  appOptions?: Parameters<typeof createApp>[1];
  prepare?: (pool: PgPool) => Promise<void>;
};

export async function withTestApp(
  options: TestAppOptions = {},
): Promise<{ baseUrl: string; pool: PgPool }> {
  assert.ok(testDatabaseUrl);
  const schema = `otter_test_${process.pid}_${Date.now()}_${randomUUID().replaceAll("-", "")}`;
  const adminPool = new Pool({ connectionString: testDatabaseUrl });
  await adminPool.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({
    connectionString: testDatabaseUrl,
    options: `-c search_path=${schema}`,
  });
  let server: Server | undefined;

  onTestFinished(async () => {
    if (server) {
      await closeServer(server);
    }
    await pool.end();
    await adminPool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await adminPool.end();
  });

  assert.equal(await runMigrations(pool, { logger: silentLogger }), 29);
  assert.equal(await runMigrations(pool, { logger: silentLogger }), 0);
  await options.prepare?.(pool);

  const app = createApp(pool, {
    ...options.appOptions,
    exchangeRates: {
      ...options.appOptions?.exchangeRates,
      fetchRate:
        options.appOptions?.exchangeRates?.fetchRate ??
        options.appOptions?.visaSettlement?.fetchRate ??
        testVisaRate,
    },
  });
  server = await listen(createAdaptorServer({ fetch: app.fetch }));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return { baseUrl: `http://127.0.0.1:${address.port}`, pool };
}

export async function api<T>(
  baseUrl: string,
  pathname: string,
  init: ApiInit = {},
): Promise<{ data: T; response: Response }> {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const data = (await response.json()) as T;
  return { data, response };
}

export async function testVisaRate(query: VisaRateQuery): Promise<VisaRate> {
  const rates = fixedExchangeRates("TWD");
  if (!isCurrency(query.source) || !isCurrency(query.target))
    throw new Error("Unsupported test currency");
  const rate = rates[query.source] / rates[query.target];
  return {
    source: query.source,
    target: query.target,
    date: query.date ?? "2026-10-25",
    amount: 1,
    bankFeePercent: 0,
    visaRate: rate,
    rate,
    convertedAmount: rate,
    fetchedAt: "2026-10-25T00:00:00.000Z",
  };
}

async function listen(server: Server): Promise<Server> {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}
