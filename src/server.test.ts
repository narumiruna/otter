import assert from "node:assert/strict";
import type { Server } from "node:http";
import test from "node:test";
import pg from "pg";
import { runMigrations } from "../scripts/migrate.js";
import { createApp } from "./server.js";

const { Pool } = pg;
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const silentLogger = { log: (..._messages: unknown[]) => {} };

type ApiInit = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

type UserResponse = {
  user: { email: string; id: string; name: string } | null;
};

type TripPayload = {
  balances: { amountMinor: number; participantId: string }[];
  settlements: { amountMinor: number; fromId: string; toId: string }[];
  trip: {
    expenses: { id: string }[];
    id: string;
    participants: { id: string; name: string }[];
  };
};

type TripsResponse = {
  trips: {
    expenseCount: number;
    id: string;
    name: string;
    participantCount: number;
  }[];
};

test("auth and trip APIs use Postgres", {
  skip: testDatabaseUrl ? false : "set TEST_DATABASE_URL to run",
}, async (t) => {
  assert.ok(testDatabaseUrl);
  const schema = `otter_test_${process.pid}_${Date.now()}`;
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

  assert.equal(await runMigrations(pool, { logger: silentLogger }), 1);
  assert.equal(await runMigrations(pool, { logger: silentLogger }), 0);

  const app = createApp(pool);
  server = await listen(app);
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const email = `alice-${Date.now()}@example.com`;

  const register = await api<UserResponse>(baseUrl, "/api/auth/register", {
    body: JSON.stringify({
      email,
      name: "Alice",
      password: "password123",
    }),
    method: "POST",
  });
  assert.equal(register.response.status, 201);
  assert.equal(register.data.user?.email, email);
  const cookie = register.response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);

  const me = await api<UserResponse>(baseUrl, "/api/me", {
    headers: { cookie },
  });
  assert.equal(me.data.user?.name, "Alice");

  const createdTrip = await api<TripPayload>(baseUrl, "/api/trips", {
    body: JSON.stringify({ baseCurrency: "TWD", name: "Tokyo" }),
    headers: { cookie },
    method: "POST",
  });
  assert.equal(createdTrip.response.status, 201);

  const renamedTrip = await api<TripPayload>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}`,
    {
      body: JSON.stringify({ name: "Kyoto" }),
      headers: { cookie },
      method: "PATCH",
    },
  );
  assert.equal(renamedTrip.response.status, 200);
  assert.equal(renamedTrip.data.trip.name, "Kyoto");
  const renamedTrips = await api<TripsResponse>(baseUrl, "/api/trips", {
    headers: { cookie },
  });
  assert.equal(renamedTrips.data.trips[0]?.name, "Kyoto");

  const owner = createdTrip.data.trip.participants[0];
  assert.ok(owner);

  const withBob = await api<TripPayload>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}/participants`,
    {
      body: JSON.stringify({ name: "Bob" }),
      headers: { cookie },
      method: "POST",
    },
  );
  const bob = withBob.data.trip.participants.find(({ name }) => name === "Bob");
  assert.ok(bob);

  const withExpense = await api<TripPayload>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}/expenses`,
    {
      body: JSON.stringify({
        amount: "100",
        currency: "TWD",
        description: "Dinner",
        paidById: owner.id,
        participantIds: [owner.id, bob.id],
      }),
      headers: { cookie },
      method: "POST",
    },
  );
  assert.equal(withExpense.response.status, 201);
  assert.equal(withExpense.data.trip.expenses.length, 1);
  assert.deepEqual(
    withExpense.data.balances.map(({ amountMinor, participantId }) => ({
      amountMinor,
      participantId,
    })),
    [
      { amountMinor: 50, participantId: owner.id },
      { amountMinor: -50, participantId: bob.id },
    ],
  );
  assert.deepEqual(
    withExpense.data.settlements.map(({ amountMinor, fromId, toId }) => ({
      amountMinor,
      fromId,
      toId,
    })),
    [{ amountMinor: 50, fromId: bob.id, toId: owner.id }],
  );

  const loadedTrip = await api<TripPayload>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}`,
    { headers: { cookie } },
  );
  assert.equal(loadedTrip.data.trip.expenses.length, 1);

  const expense = withExpense.data.trip.expenses[0];
  assert.ok(expense);
  const afterDelete = await api<TripPayload>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}/expenses/${expense.id}`,
    { headers: { cookie }, method: "DELETE" },
  );
  assert.equal(afterDelete.response.status, 200);
  assert.equal(afterDelete.data.trip.expenses.length, 0);
  assert.deepEqual(
    afterDelete.data.balances.map(({ amountMinor, participantId }) => ({
      amountMinor,
      participantId,
    })),
    [
      { amountMinor: 0, participantId: owner.id },
      { amountMinor: 0, participantId: bob.id },
    ],
  );
  assert.deepEqual(afterDelete.data.settlements, []);

  const trips = await api<TripsResponse>(baseUrl, "/api/trips", {
    headers: { cookie },
  });
  assert.deepEqual(
    trips.data.trips.map(({ expenseCount, id, participantCount }) => ({
      expenseCount,
      id,
      participantCount,
    })),
    [
      {
        expenseCount: 0,
        id: createdTrip.data.trip.id,
        participantCount: 2,
      },
    ],
  );

  const otherRegister = await api<UserResponse>(baseUrl, "/api/auth/register", {
    body: JSON.stringify({
      email: `bob-${Date.now()}@example.com`,
      name: "Bob Owner",
      password: "password123",
    }),
    method: "POST",
  });
  assert.equal(otherRegister.response.status, 201);
  const otherCookie = otherRegister.response.headers
    .get("set-cookie")
    ?.split(";")[0];
  assert.ok(otherCookie);

  const forbiddenRename = await api<{ error: string }>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}`,
    {
      body: JSON.stringify({ name: "Hack" }),
      headers: { cookie: otherCookie },
      method: "PATCH",
    },
  );
  assert.equal(forbiddenRename.response.status, 404);

  const forbiddenDelete = await api<{ error: string }>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}`,
    { headers: { cookie: otherCookie }, method: "DELETE" },
  );
  assert.equal(forbiddenDelete.response.status, 404);

  const deletedTrip = await api<{ ok: true }>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}`,
    { headers: { cookie }, method: "DELETE" },
  );
  assert.equal(deletedTrip.response.status, 200);
  assert.equal(deletedTrip.data.ok, true);

  const missingTrip = await api<{ error: string }>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}`,
    { headers: { cookie } },
  );
  assert.equal(missingTrip.response.status, 404);
  assert.equal(missingTrip.data.error, "找不到旅行");

  const emptyTrips = await api<TripsResponse>(baseUrl, "/api/trips", {
    headers: { cookie },
  });
  assert.deepEqual(emptyTrips.data.trips, []);
});

async function api<T>(
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
