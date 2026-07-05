import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { TestContext } from "node:test";
import pg from "pg";
import { runMigrations } from "../scripts/migrate.js";
import { createApp } from "./server.js";

const { Pool } = pg;
const silentLogger = { log: (..._messages: unknown[]) => {} };
export const testDatabaseUrl = process.env.TEST_DATABASE_URL;

export const postgresTestOptions = {
  skip: testDatabaseUrl ? false : "set TEST_DATABASE_URL to run",
};

export type ApiInit = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

export type UserResponse = {
  user: { email: string; id: string; name: string } | null;
};

export type TripPayload = {
  balances: { amountMinor: number; participantId: string }[];
  settlements: { amountMinor: number; fromId: string; toId: string }[];
  trip: {
    archivedAt?: string | null;
    exchangeRates?: Record<string, number>;
    expenses: {
      amountMinor: number;
      currency: string;
      description: string;
      expenseDate: string;
      id: string;
      paidById: string;
      participantIds: string[];
      participantShares?: { participantId: string; shareMinor: number }[];
    }[];
    id: string;
    name: string;
    participants: { id: string; name: string }[];
    settlementPayments?: {
      amountMinor: number;
      currency: string;
      fromId: string;
      id: string;
      note: string;
      paidAt: string;
      toId: string;
    }[];
  };
};

export type TripsResponse = {
  archivedTrips: {
    archivedAt: string | null;
    expenseCount: number;
    id: string;
    name: string;
    participantCount: number;
  }[];
  trips: {
    archivedAt: string | null;
    expenseCount: number;
    id: string;
    name: string;
    participantCount: number;
  }[];
};

export async function withTestApp(
  t: TestContext,
): Promise<{ baseUrl: string }> {
  assert.ok(testDatabaseUrl);
  const schema = `otter_test_${process.pid}_${Date.now()}_${randomUUID().replaceAll("-", "")}`;
  const adminPool = new Pool({ connectionString: testDatabaseUrl });
  await adminPool.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({
    connectionString: testDatabaseUrl,
    options: `-c search_path=${schema}`,
  });
  let server: Server | undefined;

  t.after(async () => {
    if (server) {
      await closeServer(server);
    }
    await pool.end();
    await adminPool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await adminPool.end();
  });

  assert.equal(await runMigrations(pool, { logger: silentLogger }), 6);
  assert.equal(await runMigrations(pool, { logger: silentLogger }), 0);

  const app = createApp(pool);
  server = await listen(app);
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return { baseUrl: `http://127.0.0.1:${address.port}` };
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

async function listen(app: ReturnType<typeof createApp>): Promise<Server> {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
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
