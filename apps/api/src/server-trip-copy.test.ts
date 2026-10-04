import assert from "node:assert/strict";
import type { TripPayload, TripsResponse } from "@narumitw/otter-contracts";
import { expect, test } from "vitest";
import { generateAccessToken, hashApiSecret } from "./server-api-tokens.js";
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
    const emojiTrip = await request<TripPayload>("/api/trips", "POST", {
      name: "😀".repeat(50),
    });
    expect(emojiTrip.response.status).toBe(201);
    const emojiCopy = await request<TripPayload>(
      `/api/trips/${emojiTrip.data.trip.id}/copy`,
      "POST",
    );
    expect(emojiCopy.response.status).toBe(201);
    expect(emojiCopy.data.trip.name).toBe(`${"😀".repeat(46)} (copy)`);
    expect(emojiCopy.data.trip.name.length).toBeLessThanOrEqual(100);
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

test(
  "copy names stay unique alongside create, rename and restore",
  postgresTestOptions,
  async () => {
    const { baseUrl, pool } = await withTestApp({
      prepare: async (db) => {
        await db.query(
          "INSERT INTO users (id, name, username, password_hash) VALUES ('owner', 'Owner', 'owner', 'unused')",
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
    const source = await request<TripPayload>("/api/trips", "POST", {
      name: "Tokyo",
    });
    const other = await request<TripPayload>("/api/trips", "POST", {
      name: "Other",
    });
    assert.equal(source.response.status, 201);
    assert.equal(other.response.status, 201);
    const sourcePath = `/api/trips/${source.data.trip.id}`;
    const backup = await request<{ trip: { name: string } }>(
      `${sourcePath}/backup`,
    );
    assert.equal(backup.response.status, 200);
    backup.data.trip.name = "Tokyo (copy)";

    const [copy, created, renamed, restored] = await Promise.all([
      request<TripPayload>(`${sourcePath}/copy`, "POST"),
      request<TripPayload>("/api/trips", "POST", { name: "Tokyo (copy)" }),
      request<TripPayload>(`/api/trips/${other.data.trip.id}`, "PATCH", {
        name: "Tokyo (copy)",
      }),
      request<TripPayload>("/api/trips/restore", "POST", backup.data),
    ]);
    expect(copy.response.status).toBe(201);
    expect([201, 409]).toContain(created.response.status);
    expect([200, 409]).toContain(renamed.response.status);
    expect(restored.response.status).toBe(201);
    const listing = await request<TripsResponse>("/api/trips");
    const names = listing.data.trips.map((trip) =>
      trip.name.trim().toLowerCase(),
    );
    expect(new Set(names).size).toBe(names.length);
    expect(
      listing.data.trips.find((trip) => trip.id === copy.data.trip.id),
    ).toBeDefined();
  },
);

test(
  "guest copy cannot deadlock share-link revocation",
  postgresTestOptions,
  async () => {
    const { baseUrl, pool } = await withTestApp({
      prepare: async (db) => {
        await db.query(
          "INSERT INTO users (id, name, username, password_hash) VALUES ('owner', 'Owner', 'owner', 'unused')",
        );
      },
    });
    const cookie = `otter_session=${(await createSession(pool, "owner")).id}`;
    const source = await api<TripPayload>(baseUrl, "/api/trips", {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({ name: "Tokyo" }),
    });
    const path = `/api/trips/${source.data.trip.id}`;
    const shared = await api<TripPayload>(baseUrl, `${path}/share-links`, {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({ mode: "anyone-edit" }),
    });
    const link = shared.data.shareLinks?.[0];
    assert.ok(link?.url);
    const token = new URL(link.url).pathname.split("/").at(-1);
    assert.ok(token);
    const guest = await pool.query<{ guest_user_id: string }>(
      "SELECT guest_user_id FROM trip_share_links WHERE id = $1",
      [link.id],
    );
    const guestId = guest.rows[0]?.guest_user_id;
    assert.ok(guestId);

    const blocker = await pool.connect();
    await blocker.query("BEGIN");
    try {
      await blocker.query("SELECT id FROM trips WHERE id = $1 FOR UPDATE", [
        source.data.trip.id,
      ]);
      const blockerPid = await blocker.query<{ pid: number }>(
        "SELECT pg_backend_pid() AS pid",
      );
      const attempt = api<{ error: string }>(baseUrl, `${path}/copy`, {
        method: "POST",
        headers: { "X-Otter-Share-Token": token },
      });
      // Wait until the guest copy is blocked on the trip, not on its user.
      let waiting = false;
      for (let i = 0; i < 200; i += 1) {
        const result = await pool.query<{ waiting: boolean }>(
          `SELECT EXISTS (
           SELECT 1 FROM pg_stat_activity
           WHERE wait_event_type = 'Lock'
             AND query LIKE 'SELECT allow_api_writes FROM trips WHERE id = $1 FOR UPDATE%'
             AND $1 = ANY(pg_blocking_pids(pid))
         ) AS waiting`,
          [blockerPid.rows[0].pid],
        );
        if (result.rows[0]?.waiting) {
          waiting = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(waiting).toBe(true);
      await pool.query("SELECT id FROM users WHERE id = $1 FOR UPDATE NOWAIT", [
        guestId,
      ]);
      const revoke = api<TripPayload>(
        baseUrl,
        `${path}/share-links/${link.id}`,
        {
          method: "DELETE",
          headers: { cookie },
        },
      );
      await blocker.query("COMMIT");
      expect([403, 404]).toContain((await attempt).response.status);
      expect((await revoke).response.status).toBe(200);
    } finally {
      await blocker.query("ROLLBACK");
      blocker.release();
    }
  },
);

test(
  "token copy rechecks API-write permission after waiting for the trip lock",
  postgresTestOptions,
  async () => {
    const { baseUrl, pool } = await withTestApp({
      prepare: async (db) => {
        await db.query(
          "INSERT INTO users (id, name, username, password_hash) VALUES ('owner', 'Owner', 'owner', 'unused')",
        );
      },
    });
    const cookie = `otter_session=${(await createSession(pool, "owner")).id}`;
    const created = await api<TripPayload>(baseUrl, "/api/trips", {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({ name: "Tokyo" }),
    });
    assert.equal(created.response.status, 201);
    const path = `/api/trips/${created.data.trip.id}`;
    const token = generateAccessToken();
    await pool.query(
      "INSERT INTO api_tokens (id, user_id, token_hash, name, expires_at) VALUES ('copy-token', 'owner', $1, 'Copy', now() + interval '1 day')",
      [hashApiSecret(token)],
    );
    const asToken = { authorization: `Bearer ${token}` };
    const denied = await api<{ error: string }>(baseUrl, `${path}/copy`, {
      method: "POST",
      headers: asToken,
    });
    expect(denied.response.status).toBe(403);
    const enabled = await api<TripPayload>(baseUrl, path, {
      method: "PATCH",
      headers: { cookie },
      body: JSON.stringify({ allowApiWrites: true }),
    });
    expect(enabled.response.status).toBe(200);

    const writer = await pool.connect();
    await writer.query("BEGIN");
    try {
      await writer.query("SELECT id FROM trips WHERE id = $1 FOR UPDATE", [
        created.data.trip.id,
      ]);
      const blockerPid = await writer.query<{ pid: number }>(
        "SELECT pg_backend_pid() AS pid",
      );
      const pending = api<{ error: string }>(baseUrl, `${path}/copy`, {
        method: "POST",
        headers: asToken,
      });
      let waiting = false;
      for (let i = 0; i < 200; i += 1) {
        const result = await pool.query<{ waiting: boolean }>(
          `SELECT EXISTS (
           SELECT 1 FROM pg_stat_activity
           WHERE wait_event_type = 'Lock'
             AND query LIKE 'SELECT allow_api_writes FROM trips WHERE id = $1 FOR UPDATE%'
             AND $1 = ANY(pg_blocking_pids(pid))
         ) AS waiting`,
          [blockerPid.rows[0].pid],
        );
        if (result.rows[0]?.waiting) {
          waiting = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(waiting).toBe(true);
      await writer.query(
        "UPDATE trips SET allow_api_writes = false WHERE id = $1",
        [created.data.trip.id],
      );
      await writer.query("COMMIT");
      const rejected = await pending;
      expect(rejected.response.status).toBe(403);
      expect(rejected.data.error).toBe("此群組不允許透過 API Token 修改");
      const listing = await api<TripsResponse>(baseUrl, "/api/trips", {
        headers: { cookie },
      });
      expect(listing.data.trips).toHaveLength(1);
    } finally {
      await writer.query("ROLLBACK");
      writer.release();
    }
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
