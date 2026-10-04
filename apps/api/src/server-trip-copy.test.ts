import assert from "node:assert/strict";
import type { TripPayload, TripsResponse } from "@narumitw/otter-contracts";
import { expect, test } from "vitest";
import { createSession } from "./server-support.js";
import { api, postgresTestOptions, withTestApp } from "./server-test-utils.js";

test(
  "owner duplicates an active or archived group as an independent empty group",
  postgresTestOptions,
  async () => {
    const { baseUrl, pool } = await withTestApp({
      prepare: async (db) => {
        await db.query(
          "INSERT INTO users (id, name, username, password_hash) VALUES ('owner', 'Owner', 'owner', 'unused'), ('editor', 'Editor', 'editor', 'unused')",
        );
      },
    });
    const cookie = `otter_session=${(await createSession(pool, "owner")).id}`;
    const request = <T>(path: string, method = "GET", body?: unknown) =>
      api<T>(baseUrl, path, {
        method,
        headers: { cookie },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    const created = await request<TripPayload>("/api/trips", "POST", {
      name: "Tokyo",
      baseCurrency: "USD",
    });
    expect(created.response.status).toBe(201);
    const path = `/api/trips/${created.data.trip.id}`;
    const withBob = await request<TripPayload>(`${path}/participants`, "POST", {
      name: "Bob",
    });
    const ownerId = created.data.trip.participants[0].id;
    const bob = withBob.data.trip.participants.find((p) => p.name === "Bob");
    assert.ok(bob);
    const bobId = bob.id;
    const preferences = await request<TripPayload>(path, "PATCH", {
      allowApiWrites: true,
      exchangeRates: { TWD: 0.03 },
    });
    expect(preferences.response.status).toBe(200);
    expect(preferences.data.trip.allowApiWrites).toBe(true);
    await request<TripPayload>(`${path}/expenses`, "POST", {
      amount: "10",
      currency: "USD",
      description: "Dinner",
      paidById: ownerId,
      participantIds: [ownerId, bobId],
    });
    await request<TripPayload>(`${path}/settlement-payments`, "POST", {
      amount: "2",
      currency: "USD",
      fromId: bobId,
      toId: ownerId,
    });
    const addEditor = await request<TripPayload>(`${path}/members`, "POST", {
      username: "editor",
    });
    expect(addEditor.response.status).toBe(201);
    const share = await request<TripPayload>(`${path}/share-links`, "POST");
    expect(share.response.status).toBe(201);
    const archived = await request<TripPayload>(path, "PATCH", {
      archived: true,
    });
    expect(archived.response.status).toBe(200);
    const sourceNames = archived.data.trip.participants.map((p) => p.name);

    const first = await request<TripPayload>(`${path}/copy`, "POST");
    expect(first.response.status).toBe(201);
    const copy = first.data.trip;
    expect(copy).toMatchObject({
      name: "Tokyo (copy)",
      baseCurrency: "USD",
      archivedAt: null,
      allowApiWrites: false,
      ownerId: "owner",
      exchangeRates: { USD: 1, TWD: 0.03 },
      expenses: [],
      settlementPayments: [],
    });
    expect(copy.id).not.toBe(created.data.trip.id);
    expect(copy.participants.map((p) => p.name)).toEqual(sourceNames);
    expect(copy.participants.map((p) => p.id)).not.toContain(ownerId);
    expect(copy.participants.map((p) => p.id)).not.toContain(bobId);
    expect(first.data.collaborators?.map((member) => member.role)).toEqual([
      "owner",
    ]);
    expect(first.data.shareLinks).toEqual([]);
    expect(
      first.data.balances.every((balance) => balance.amountMinor === 0),
    ).toBe(true);
    expect(first.data.settlements).toEqual([]);

    const second = await request<TripPayload>(`${path}/copy`, "POST");
    expect(second.response.status).toBe(201);
    expect(second.data.trip.name).toBe("Tokyo (copy 2)");
    const parallel = await Promise.all([
      request<TripPayload>(`${path}/copy`, "POST"),
      request<TripPayload>(`${path}/copy`, "POST"),
    ]);
    expect(parallel.map(({ response }) => response.status)).toEqual([201, 201]);
    expect(parallel.map(({ data }) => data.trip.name).sort()).toEqual([
      "Tokyo (copy 3)",
      "Tokyo (copy 4)",
    ]);
    const listing = await request<TripsResponse>("/api/trips");
    expect(listing.data.trips.map((trip) => trip.id)).toContain(copy.id);
    const longName = "A".repeat(100);
    const longTrip = await request<TripPayload>("/api/trips", "POST", {
      name: longName,
    });
    expect(longTrip.response.status).toBe(201);
    const longCopy = await request<TripPayload>(
      `/api/trips/${longTrip.data.trip.id}/copy`,
      "POST",
    );
    expect(longCopy.response.status).toBe(201);
    expect(longCopy.data.trip.name).toBe(`${"A".repeat(93)} (copy)`);
    const updated = await request<TripPayload>(
      `/api/trips/${copy.id}/participants`,
      "POST",
      { name: "Charlie" },
    );
    expect(updated.response.status).toBe(201);
    const original = await request<TripPayload>(path);
    expect(original.data.trip.participants.map((p) => p.name)).toEqual(
      sourceNames,
    );
    expect(original.data.trip.expenses).toHaveLength(1);
    expect(original.data.trip.settlementPayments).toHaveLength(1);
    expect(original.data.shareLinks).toHaveLength(1);
    expect(original.data.collaborators).toHaveLength(2);
    expect(original.data.trip.archivedAt).not.toBeNull();
    expect(original.data.trip.allowApiWrites).toBe(true);
  },
);

test("only the owner may duplicate a group", postgresTestOptions, async () => {
  const { baseUrl, pool } = await withTestApp({
    prepare: async (db) => {
      await db.query(
        "INSERT INTO users (id, name, username, password_hash) VALUES ('owner', 'Owner', 'owner', 'unused'), ('editor', 'Editor', 'editor', 'unused')",
      );
    },
  });
  const owner = `otter_session=${(await createSession(pool, "owner")).id}`;
  const editor = `otter_session=${(await createSession(pool, "editor")).id}`;
  const created = await api<TripPayload>(baseUrl, "/api/trips", {
    method: "POST",
    headers: { cookie: owner },
    body: JSON.stringify({ name: "Trip" }),
  });
  assert.equal(created.response.status, 201);
  const path = `/api/trips/${created.data.trip.id}`;
  const addEditor = await api(baseUrl, `${path}/members`, {
    method: "POST",
    headers: { cookie: owner },
    body: JSON.stringify({ username: "editor" }),
  });
  expect(addEditor.response.status).toBe(201);
  const unauthorized = await api<{ error: string }>(baseUrl, `${path}/copy`, {
    method: "POST",
  });
  expect(unauthorized.response.status).toBe(401);
  const forbidden = await api<{ error: string }>(baseUrl, `${path}/copy`, {
    method: "POST",
    headers: { cookie: editor },
  });
  expect(forbidden.response.status).toBe(403);
  const missing = await api<{ error: string }>(
    baseUrl,
    "/api/trips/missing/copy",
    { method: "POST", headers: { cookie: editor } },
  );
  expect(missing.response.status).toBe(404);
  const listing = await api<TripsResponse>(baseUrl, "/api/trips", {
    headers: { cookie: owner },
  });
  expect(listing.data.trips).toHaveLength(1);
});
