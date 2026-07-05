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

  const malformedJson = await fetch(`${baseUrl}/api/auth/login`, {
    body: "{",
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  assert.equal(malformedJson.status, 400);
  assert.deepEqual(await malformedJson.json(), { error: "JSON 格式錯誤" });

  const oversizedJson = await fetch(`${baseUrl}/api/auth/login`, {
    body: JSON.stringify({ email: "a".repeat(1024 * 1024), password: "x" }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  assert.equal(oversizedJson.status, 413);
  assert.deepEqual(await oversizedJson.json(), { error: "請求內容太大" });

  const malformedCookie = await api<UserResponse>(baseUrl, "/api/me", {
    headers: { cookie: "otter_session=%E0%A4%A" },
  });
  assert.equal(malformedCookie.response.status, 200);
  assert.equal(malformedCookie.data.user, null);

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

  const invalidTripCurrencyCreate = await api<{ error: string }>(
    baseUrl,
    "/api/trips",
    {
      body: JSON.stringify({ baseCurrency: "BTC", name: "Bad Currency" }),
      headers: { cookie },
      method: "POST",
    },
  );
  assert.equal(invalidTripCurrencyCreate.response.status, 400);
  assert.equal(invalidTripCurrencyCreate.data.error, "不支援的基準貨幣");

  const defaultCurrencyTrip = await api<TripPayload>(baseUrl, "/api/trips", {
    body: JSON.stringify({ name: "Nara" }),
    headers: { cookie },
    method: "POST",
  });
  assert.equal(defaultCurrencyTrip.response.status, 201);
  assert.equal(defaultCurrencyTrip.data.trip.baseCurrency, "TWD");

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

  const archivedTrip = await api<TripPayload>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}`,
    {
      body: JSON.stringify({ archived: true }),
      headers: { cookie },
      method: "PATCH",
    },
  );
  assert.equal(archivedTrip.response.status, 200);
  assert.ok(archivedTrip.data.trip.archivedAt);

  const archivedTrips = await api<TripsResponse>(baseUrl, "/api/trips", {
    headers: { cookie },
  });
  assert.equal(
    archivedTrips.data.trips.some(({ id }) => id === createdTrip.data.trip.id),
    false,
  );
  assert.equal(
    archivedTrips.data.archivedTrips.some(
      ({ id }) => id === createdTrip.data.trip.id,
    ),
    true,
  );

  const loadedArchivedTrip = await api<TripPayload>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}`,
    { headers: { cookie } },
  );
  assert.ok(loadedArchivedTrip.data.trip.archivedAt);

  const archivedRename = await api<{ error: string }>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}`,
    {
      body: JSON.stringify({ name: "Archived Kyoto" }),
      headers: { cookie },
      method: "PATCH",
    },
  );
  assert.equal(archivedRename.response.status, 409);
  assert.equal(archivedRename.data.error, "支出群組已封存，請先還原");

  const archivedParticipantAdd = await api<{ error: string }>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}/participants`,
    {
      body: JSON.stringify({ name: "Bob" }),
      headers: { cookie },
      method: "POST",
    },
  );
  assert.equal(archivedParticipantAdd.response.status, 409);

  const owner = createdTrip.data.trip.participants[0];
  assert.ok(owner);
  const archivedExpenseAdd = await api<{ error: string }>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}/expenses`,
    {
      body: JSON.stringify({
        amount: "100",
        currency: "TWD",
        description: "Dinner",
        expenseDate: "2026-06-24",
        paidById: owner.id,
        participantIds: [owner.id],
      }),
      headers: { cookie },
      method: "POST",
    },
  );
  assert.equal(archivedExpenseAdd.response.status, 409);

  const restoredTrip = await api<TripPayload>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}`,
    {
      body: JSON.stringify({ archived: false }),
      headers: { cookie },
      method: "PATCH",
    },
  );
  assert.equal(restoredTrip.data.trip.archivedAt, null);

  const ratedTrip = await api<TripPayload>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}`,
    {
      body: JSON.stringify({
        exchangeRates: { JPY: "0.007", TWD: "0.03", USD: "1" },
      }),
      headers: { cookie },
      method: "PATCH",
    },
  );
  assert.equal(ratedTrip.response.status, 200);
  assert.equal(ratedTrip.data.trip.exchangeRates?.USD, 1);
  assert.equal(ratedTrip.data.trip.exchangeRates?.TWD, 0.03);

  // Changing baseCurrency without providing exchangeRates should clear stale rates
  const rebasedAfterRates = await api<TripPayload>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}`,
    {
      body: JSON.stringify({ baseCurrency: "TWD" }),
      headers: { cookie },
      method: "PATCH",
    },
  );
  assert.equal(rebasedAfterRates.response.status, 200);
  assert.equal(rebasedAfterRates.data.trip.baseCurrency, "TWD");
  assert.equal(rebasedAfterRates.data.trip.exchangeRates, null);

  const invalidExchangeRate = await api<{ error: string }>(
    baseUrl,
    `/api/trips/${createdTrip.data.trip.id}`,
    {
      body: JSON.stringify({ exchangeRates: { TWD: "0" } }),
      headers: { cookie },
      method: "PATCH",
    },
  );
  assert.equal(invalidExchangeRate.response.status, 400);

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

  const deletedDefaultCurrencyTrip = await api<{ ok: true }>(
    baseUrl,
    `/api/trips/${defaultCurrencyTrip.data.trip.id}`,
    { headers: { cookie }, method: "DELETE" },
  );
  assert.equal(deletedDefaultCurrencyTrip.response.status, 200);
  assert.equal(deletedDefaultCurrencyTrip.data.ok, true);

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
