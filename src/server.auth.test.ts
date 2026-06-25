import assert from "node:assert/strict";
import test from "node:test";
import {
  api,
  postgresTestOptions,
  type TripPayload,
  type TripsResponse,
  type UserResponse,
  withTestApp,
} from "./server-test-utils.js";

test("auth and trip APIs use Postgres", postgresTestOptions, async (t) => {
  const { baseUrl } = await withTestApp(t);
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

  const duplicateTripCreate = await api<{ error: string }>(
    baseUrl,
    "/api/trips",
    {
      body: JSON.stringify({ baseCurrency: "TWD", name: " kyoto " }),
      headers: { cookie },
      method: "POST",
    },
  );
  assert.equal(duplicateTripCreate.response.status, 409);
  assert.equal(duplicateTripCreate.data.error, "旅行名稱已存在");

  const secondTrip = await api<TripPayload>(baseUrl, "/api/trips", {
    body: JSON.stringify({ baseCurrency: "TWD", name: "Osaka" }),
    headers: { cookie },
    method: "POST",
  });
  assert.equal(secondTrip.response.status, 201);

  const duplicateTripRename = await api<{ error: string }>(
    baseUrl,
    `/api/trips/${secondTrip.data.trip.id}`,
    {
      body: JSON.stringify({ name: "Kyoto" }),
      headers: { cookie },
      method: "PATCH",
    },
  );
  assert.equal(duplicateTripRename.response.status, 409);
  assert.equal(duplicateTripRename.data.error, "旅行名稱已存在");

  const rebasedTrip = await api<TripPayload>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}`,
    {
      body: JSON.stringify({ baseCurrency: "USD" }),
      headers: { cookie },
      method: "PATCH",
    },
  );
  assert.equal(rebasedTrip.response.status, 200);
  assert.equal(rebasedTrip.data.trip.name, "Kyoto");
  assert.equal(rebasedTrip.data.trip.baseCurrency, "USD");

  const invalidBaseCurrency = await api<{ error: string }>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}`,
    {
      body: JSON.stringify({ baseCurrency: "BTC" }),
      headers: { cookie },
      method: "PATCH",
    },
  );
  assert.equal(invalidBaseCurrency.response.status, 400);
  assert.equal(invalidBaseCurrency.data.error, "不支援的基準貨幣");

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

  const forbiddenBaseCurrency = await api<{ error: string }>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}`,
    {
      body: JSON.stringify({ baseCurrency: "TWD" }),
      headers: { cookie: otherCookie },
      method: "PATCH",
    },
  );
  assert.equal(forbiddenBaseCurrency.response.status, 404);

  const deletedTrip = await api<{ ok: true }>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}`,
    { headers: { cookie }, method: "DELETE" },
  );
  assert.equal(deletedTrip.response.status, 200);
  assert.equal(deletedTrip.data.ok, true);

  const deletedSecondTrip = await api<{ ok: true }>(
    baseUrl,
    `/api/trips/${secondTrip.data.trip.id}`,
    { headers: { cookie }, method: "DELETE" },
  );
  assert.equal(deletedSecondTrip.response.status, 200);
  assert.equal(deletedSecondTrip.data.ok, true);

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
