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
    expenses: {
      amountMinor: number;
      description: string;
      expenseDate: string;
      id: string;
      participantIds: string[];
    }[];
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

  assert.equal(await runMigrations(pool, { logger: silentLogger }), 2);
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

  const withBobby = await api<TripPayload>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}/participants/${bob.id}`,
    {
      body: JSON.stringify({ name: "Bobby" }),
      headers: { cookie },
      method: "PATCH",
    },
  );
  assert.equal(withBobby.response.status, 200);
  assert.equal(
    withBobby.data.trip.participants.find(({ id }) => id === bob.id)?.name,
    "Bobby",
  );

  const invalidExpenseDate = await api<{ error: string }>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}/expenses`,
    {
      body: JSON.stringify({
        amount: "100",
        currency: "TWD",
        description: "Dinner",
        expenseDate: "2026-13-40",
        paidById: owner.id,
        participantIds: [owner.id, bob.id],
      }),
      headers: { cookie },
      method: "POST",
    },
  );
  assert.equal(invalidExpenseDate.response.status, 400);

  const withExpense = await api<TripPayload>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}/expenses`,
    {
      body: JSON.stringify({
        amount: "100",
        currency: "TWD",
        description: "Dinner",
        expenseDate: "2026-06-24",
        paidById: owner.id,
        participantIds: [owner.id, bob.id],
      }),
      headers: { cookie },
      method: "POST",
    },
  );
  assert.equal(withExpense.response.status, 201);
  assert.equal(withExpense.data.trip.expenses.length, 1);
  assert.equal(withExpense.data.trip.expenses[0]?.expenseDate, "2026-06-24");
  const expense = withExpense.data.trip.expenses[0];
  assert.ok(expense);

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

  const renamedExpense = await api<TripPayload>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}/expenses/${expense.id}`,
    {
      body: JSON.stringify({ description: "Supper" }),
      headers: { cookie },
      method: "PATCH",
    },
  );
  assert.equal(renamedExpense.response.status, 200);
  assert.equal(renamedExpense.data.trip.expenses[0]?.description, "Supper");

  const forbiddenExpenseRename = await api<{ error: string }>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}/expenses/${expense.id}`,
    {
      body: JSON.stringify({ description: "Hack" }),
      headers: { cookie: otherCookie },
      method: "PATCH",
    },
  );
  assert.equal(forbiddenExpenseRename.response.status, 404);

  const reamountedExpense = await api<TripPayload>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}/expenses/${expense.id}`,
    {
      body: JSON.stringify({ amount: "200" }),
      headers: { cookie },
      method: "PATCH",
    },
  );
  assert.equal(reamountedExpense.response.status, 200);
  assert.equal(reamountedExpense.data.trip.expenses[0]?.amountMinor, 200);
  assert.deepEqual(
    reamountedExpense.data.balances.map(({ amountMinor, participantId }) => ({
      amountMinor,
      participantId,
    })),
    [
      { amountMinor: 100, participantId: owner.id },
      { amountMinor: -100, participantId: bob.id },
    ],
  );
  assert.deepEqual(
    reamountedExpense.data.settlements.map(({ amountMinor, fromId, toId }) => ({
      amountMinor,
      fromId,
      toId,
    })),
    [{ amountMinor: 100, fromId: bob.id, toId: owner.id }],
  );

  const forbiddenExpenseAmount = await api<{ error: string }>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}/expenses/${expense.id}`,
    {
      body: JSON.stringify({ amount: "300" }),
      headers: { cookie: otherCookie },
      method: "PATCH",
    },
  );
  assert.equal(forbiddenExpenseAmount.response.status, 404);

  const repaidExpense = await api<TripPayload>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}/expenses/${expense.id}`,
    {
      body: JSON.stringify({ paidById: bob.id }),
      headers: { cookie },
      method: "PATCH",
    },
  );
  assert.equal(repaidExpense.response.status, 200);
  assert.deepEqual(
    repaidExpense.data.balances.map(({ amountMinor, participantId }) => ({
      amountMinor,
      participantId,
    })),
    [
      { amountMinor: -100, participantId: owner.id },
      { amountMinor: 100, participantId: bob.id },
    ],
  );
  assert.deepEqual(
    repaidExpense.data.settlements.map(({ amountMinor, fromId, toId }) => ({
      amountMinor,
      fromId,
      toId,
    })),
    [{ amountMinor: 100, fromId: owner.id, toId: bob.id }],
  );

  const forbiddenExpensePayer = await api<{ error: string }>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}/expenses/${expense.id}`,
    {
      body: JSON.stringify({ paidById: owner.id }),
      headers: { cookie: otherCookie },
      method: "PATCH",
    },
  );
  assert.equal(forbiddenExpensePayer.response.status, 404);

  const resplitExpense = await api<TripPayload>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}/expenses/${expense.id}`,
    {
      body: JSON.stringify({ participantIds: [owner.id] }),
      headers: { cookie },
      method: "PATCH",
    },
  );
  assert.equal(resplitExpense.response.status, 200);
  assert.deepEqual(resplitExpense.data.trip.expenses[0]?.participantIds, [
    owner.id,
  ]);
  assert.deepEqual(
    resplitExpense.data.balances.map(({ amountMinor, participantId }) => ({
      amountMinor,
      participantId,
    })),
    [
      { amountMinor: -200, participantId: owner.id },
      { amountMinor: 200, participantId: bob.id },
    ],
  );
  assert.deepEqual(
    resplitExpense.data.settlements.map(({ amountMinor, fromId, toId }) => ({
      amountMinor,
      fromId,
      toId,
    })),
    [{ amountMinor: 200, fromId: owner.id, toId: bob.id }],
  );

  const forbiddenExpenseSplit = await api<{ error: string }>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}/expenses/${expense.id}`,
    {
      body: JSON.stringify({ participantIds: [owner.id] }),
      headers: { cookie: otherCookie },
      method: "PATCH",
    },
  );
  assert.equal(forbiddenExpenseSplit.response.status, 404);

  const loadedTrip = await api<TripPayload>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}`,
    { headers: { cookie } },
  );
  assert.equal(loadedTrip.data.trip.expenses.length, 1);

  const usedParticipantDelete = await api<{ error: string }>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}/participants/${bob.id}`,
    { headers: { cookie }, method: "DELETE" },
  );
  assert.equal(usedParticipantDelete.response.status, 409);
  assert.equal(usedParticipantDelete.data.error, "參與者已有支出，不能刪除");

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

  const afterParticipantDelete = await api<TripPayload>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}/participants/${bob.id}`,
    { headers: { cookie }, method: "DELETE" },
  );
  assert.equal(afterParticipantDelete.response.status, 200);
  assert.deepEqual(
    afterParticipantDelete.data.trip.participants.map(({ id }) => id),
    [owner.id],
  );

  const lastParticipantDelete = await api<{ error: string }>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}/participants/${owner.id}`,
    { headers: { cookie }, method: "DELETE" },
  );
  assert.equal(lastParticipantDelete.response.status, 400);
  assert.equal(lastParticipantDelete.data.error, "至少需要一位參與者");

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
        participantCount: 1,
      },
    ],
  );

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

  const forbiddenParticipantRename = await api<{ error: string }>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}/participants/${owner.id}`,
    {
      body: JSON.stringify({ name: "Hack" }),
      headers: { cookie: otherCookie },
      method: "PATCH",
    },
  );
  assert.equal(forbiddenParticipantRename.response.status, 404);

  const forbiddenParticipantDelete = await api<{ error: string }>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}/participants/${owner.id}`,
    { headers: { cookie: otherCookie }, method: "DELETE" },
  );
  assert.equal(forbiddenParticipantDelete.response.status, 404);

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
