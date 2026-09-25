import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import type {
  CreateApiTokenResponse,
  TripPayload,
} from "@narumitw/otter-contracts";
import { test } from "vitest";
import { generateAccessToken, hashApiSecret } from "./server-api-tokens.js";
import { createSession, makeId } from "./server-support.js";
import { api, postgresTestOptions, withTestApp } from "./server-test-utils.js";

test(
  "API token writes require an owner-enabled group setting, default off",
  postgresTestOptions,
  async () => {
    const { baseUrl, pool } = await withTestApp();
    const registered = await api(baseUrl, "/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        username: `api-writes-${Date.now()}`,
        password: "password123",
      }),
    });
    const cookie = registered.response.headers.get("set-cookie")?.split(";")[0];
    assert.ok(cookie);
    const created = await api<TripPayload>(baseUrl, "/api/trips", {
      headers: { cookie },
      method: "POST",
      body: JSON.stringify({ name: "Test group" }),
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.data.trip.allowApiWrites, false);
    const path = `/api/trips/${created.data.trip.id}`;
    const person = created.data.trip.participants[0].id;
    const token = await api<CreateApiTokenResponse>(
      baseUrl,
      "/api/auth/tokens",
      {
        headers: { cookie },
        method: "POST",
        body: JSON.stringify({
          accessToken: generateAccessToken(),
          id: makeId("token"),
          name: "CLI",
        }),
      },
    );
    assert.equal(token.response.status, 201);
    const authorization = `Bearer ${token.data.accessToken}`;
    const asToken = { authorization };
    const patch = (
      headers: Record<string, string>,
      body: Record<string, unknown>,
    ) =>
      api<TripPayload & { error?: string }>(baseUrl, path, {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      });

    assert.equal(
      (await api<TripPayload>(baseUrl, path, { headers: asToken })).data.trip
        .allowApiWrites,
      false,
    );
    const blocked = await patch(asToken, { name: "Blocked name" });
    assert.equal(blocked.response.status, 403);
    assert.equal(blocked.data.error, "此群組不允許透過 API Token 修改");
    assert.equal(
      (
        await api(baseUrl, `${path}/participants`, {
          headers: asToken,
          method: "POST",
          body: JSON.stringify({ name: "Blocked person" }),
        })
      ).response.status,
      403,
    );
    assert.equal(
      (await api(baseUrl, path, { headers: asToken, method: "DELETE" }))
        .response.status,
      403,
    );
    assert.equal(
      (await patch({ cookie }, { allowApiWrites: "true" })).response.status,
      400,
    );
    await pool.query(
      "INSERT INTO users (id, name, username, password_hash) VALUES ('editor', 'Editor', 'editor', 'unused')",
    );
    await pool.query(
      "INSERT INTO trip_members (id, trip_id, user_id, role) VALUES ('editor-member', $1, 'editor', 'editor')",
      [created.data.trip.id],
    );
    const editorCookie = `otter_session=${(await createSession(pool, "editor")).id}`;
    assert.equal(
      (await patch({ cookie: editorCookie }, { allowApiWrites: true })).response
        .status,
      403,
    );
    assert.equal(
      (await patch({ cookie }, { allowApiWrites: true })).data.trip
        .allowApiWrites,
      true,
    );
    const renamed = await patch(asToken, { name: "Allowed name" });
    assert.equal(renamed.response.status, 200);
    assert.equal(renamed.data.trip.name, "Allowed name");
    assert.equal(
      (await patch(asToken, { allowApiWrites: false })).response.status,
      403,
    );
    const expense = await api<TripPayload>(baseUrl, `${path}/expenses`, {
      headers: asToken,
      method: "POST",
      body: JSON.stringify({
        amount: "10",
        currency: "TWD",
        description: "Dinner",
        paidById: person,
        participantIds: [person],
      }),
    });
    assert.equal(expense.response.status, 201);
    assert.equal(
      (await patch({ cookie }, { allowApiWrites: false })).data.trip
        .allowApiWrites,
      false,
    );
    assert.equal(
      (await patch(asToken, { name: "Blocked again" })).response.status,
      403,
    );
    assert.equal(
      (await api<TripPayload>(baseUrl, path, { headers: asToken })).data.trip
        .name,
      "Allowed name",
    );
    assert.equal(
      (await patch({ cookie }, { name: "Browser still works" })).response
        .status,
      200,
    );
    assert.equal(
      (
        await pool.query("SELECT allow_api_writes FROM trips WHERE id = $1", [
          created.data.trip.id,
        ])
      ).rows[0].allow_api_writes,
      false,
    );
  },
);

test(
  "a token write waiting for the trip lock rechecks a disabled setting",
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
      headers: { cookie },
      method: "POST",
      body: JSON.stringify({ name: "Race" }),
    });
    const path = `/api/trips/${created.data.trip.id}`;
    const enabled = await api<TripPayload>(baseUrl, path, {
      headers: { cookie },
      method: "PATCH",
      body: JSON.stringify({ allowApiWrites: true }),
    });
    assert.equal(enabled.response.status, 200);
    const token = generateAccessToken();
    await pool.query(
      "INSERT INTO api_tokens (id, user_id, token_hash, name, expires_at) VALUES ('test-token', 'owner', $1, 'Test', now() + interval '1 day')",
      [hashApiSecret(token)],
    );
    const writer = await pool.connect();
    try {
      await writer.query("BEGIN");
      await writer.query("SELECT id FROM trips WHERE id = $1 FOR UPDATE", [
        created.data.trip.id,
      ]);
      const pending = api(baseUrl, `${path}/participants`, {
        headers: { authorization: `Bearer ${token}` },
        method: "POST",
        body: JSON.stringify({ name: "Too late" }),
      });
      let waiting = false;
      for (let i = 0; i < 1000; i++) {
        const result = await pool.query<{ count: string }>(
          "SELECT count(*) FROM pg_stat_activity WHERE wait_event_type = 'Lock' AND query LIKE 'SELECT t.id, t.allow_api_writes FROM trips t%'",
        );
        if (Number(result.rows[0].count) > 0) {
          waiting = true;
          break;
        }
        await setImmediate();
      }
      assert.ok(waiting, "Token write did not wait for the trip lock");
      await writer.query(
        "UPDATE trips SET allow_api_writes = false WHERE id = $1",
        [created.data.trip.id],
      );
      await writer.query("COMMIT");
      assert.equal((await pending).response.status, 403);
      assert.equal(
        (
          await pool.query(
            "SELECT count(*) FROM participants WHERE trip_id = $1",
            [created.data.trip.id],
          )
        ).rows[0].count,
        "1",
      );
    } finally {
      await writer.query("ROLLBACK");
      writer.release();
    }
  },
);
