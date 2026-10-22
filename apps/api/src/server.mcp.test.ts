import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { parseTripPayload, type TripPayload } from "@narumitw/otter-contracts";
import { onTestFinished, test, vi } from "vitest";
import { generateAccessToken, hashApiSecret } from "./server-api-tokens.js";
import { createSession } from "./server-support.js";
import { api, postgresTestOptions, withTestApp } from "./server-test-utils.js";

const accept = { Accept: "application/json, text/event-stream" };
const initialize = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "otter-test", version: "1.0.0" },
  },
};

async function setup() {
  const { baseUrl, pool } = await withTestApp({
    prepare: async (db) => {
      await db.query(`INSERT INTO users (id, name, username, password_hash)
        VALUES ('owner', 'Owner', 'owner', 'unused'),
               ('editor', 'Editor', 'editor', 'unused'),
               ('outsider', 'Outsider', 'outsider', 'unused')`);
    },
  });
  const cookie = `otter_session=${(await createSession(pool, "owner")).id}`;
  const token = generateAccessToken();
  const outsiderToken = generateAccessToken();
  const editorToken = generateAccessToken();
  for (const [user, secret] of [
    ["owner", token],
    ["outsider", outsiderToken],
    ["editor", editorToken],
  ]) {
    await pool.query(
      `INSERT INTO api_tokens (id, user_id, token_hash, name, expires_at)
       VALUES ($1, $1, $2, 'MCP', now() + interval '1 day')`,
      [user, hashApiSecret(secret)],
    );
  }
  const created = await api<TripPayload>(baseUrl, "/api/trips", {
    method: "POST",
    headers: { cookie },
    body: JSON.stringify({ name: "MCP group" }),
  });
  assert.equal(created.response.status, 201);
  const trip = created.data.trip;
  await pool.query(
    `INSERT INTO trip_members (id, trip_id, user_id, role) VALUES ('editor', $1, 'editor', 'editor')`,
    [trip.id],
  );
  const enableWrites = () =>
    api<TripPayload>(baseUrl, `/api/trips/${trip.id}`, {
      method: "PATCH",
      headers: { cookie },
      body: JSON.stringify({ allowApiWrites: true }),
    });
  return {
    baseUrl,
    pool,
    cookie,
    token,
    outsiderToken,
    editorToken,
    trip,
    enableWrites,
  };
}

async function connect(baseUrl: string, token: string): Promise<Client> {
  const client = new Client({ name: "otter-test", version: "1.0.0" });
  onTestFinished(() => client.close());
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${token}` } },
    }),
  );
  return client;
}

function toolData(
  result: Awaited<ReturnType<Client["callTool"]>>,
  status = 200,
): unknown {
  const structured = result.structuredContent;
  assert.ok(structured);
  assert.equal(structured.status, status);
  assert.equal(result.isError === true, status >= 400);
  return structured.data;
}

async function call(
  client: Client,
  name: string,
  args: Record<string, unknown> = {},
  status = 200,
) {
  return toolData(await client.callTool({ name, arguments: args }), status);
}

const tripResult = async (
  client: Client,
  name: string,
  args: Record<string, unknown>,
  status = 200,
) => parseTripPayload(await call(client, name, args, status));

test(
  "MCP requires a live Bearer token, not browser or share credentials",
  postgresTestOptions,
  async () => {
    const { baseUrl, pool, cookie, token } = await setup();
    for (const headers of [
      {},
      { cookie },
      { "X-Otter-Share-Token": "share-secret" },
      { Authorization: "Bearer invalid", cookie },
      { Authorization: "Basic invalid" },
    ]) {
      const response = await fetch(`${baseUrl}/mcp`, {
        method: "POST",
        headers: { ...accept, "Content-Type": "application/json", ...headers },
        body: JSON.stringify(initialize),
      });
      assert.equal(response.status, 401);
      assert.equal(
        response.headers.get("www-authenticate"),
        'Bearer realm="otter"',
      );
    }
    for (const expiry of [
      "revoked_at = now()",
      "expires_at = now() - interval '1 day'",
    ]) {
      await pool.query(
        "UPDATE api_tokens SET revoked_at = NULL, expires_at = now() + interval '1 day' WHERE id = 'owner'",
      );
      await pool.query(`UPDATE api_tokens SET ${expiry} WHERE id = 'owner'`);
      const response = await fetch(`${baseUrl}/mcp`, {
        method: "POST",
        headers: {
          ...accept,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(initialize),
      });
      assert.equal(response.status, 401);
    }
  },
);

test(
  "MCP Streamable HTTP validates Origin, methods, protocol, headers, JSON, and body size",
  postgresTestOptions,
  async () => {
    const { baseUrl, token } = await setup();
    const headers = {
      ...accept,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    for (const Origin of [
      "https://untrusted.example",
      "null",
      `${baseUrl}/path`,
    ]) {
      assert.equal(
        (
          await fetch(`${baseUrl}/mcp`, {
            method: "POST",
            headers: { ...headers, Origin },
            body: JSON.stringify(initialize),
          })
        ).status,
        403,
      );
    }
    const initialized = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: { ...headers, Origin: baseUrl },
      body: JSON.stringify(initialize),
    });
    assert.equal(initialized.status, 200);
    assert.match(
      initialized.headers.get("content-type") ?? "",
      /application\/json/,
    );
    assert.equal(initialized.headers.get("mcp-session-id"), null);
    assert.equal(initialized.headers.get("cache-control"), "no-store");
    const data = await initialized.json();
    assert.equal(data.result.serverInfo.name, "otter");
    for (const method of ["GET", "DELETE", "PUT", "PATCH", "OPTIONS", "HEAD"]) {
      const response = await fetch(`${baseUrl}/mcp`, { method, headers });
      assert.equal(response.status, 405);
      assert.equal(response.headers.get("allow"), "POST");
    }
    assert.equal(
      (
        await fetch(`${baseUrl}/mcp`, {
          method: "POST",
          headers: { ...headers, Accept: "application/json" },
          body: JSON.stringify(initialize),
        })
      ).status,
      406,
    );
    assert.equal(
      (
        await fetch(`${baseUrl}/mcp`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "text/plain" },
          body: JSON.stringify(initialize),
        })
      ).status,
      415,
    );
    assert.equal(
      (await fetch(`${baseUrl}/mcp`, { method: "POST", headers, body: "{" }))
        .status,
      400,
    );
    assert.equal(
      (
        await fetch(`${baseUrl}/mcp`, {
          method: "POST",
          headers: { ...headers, "MCP-Protocol-Version": "unsupported" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await fetch(`${baseUrl}/mcp`, {
          method: "POST",
          headers,
          body: "x".repeat(1024 * 1024 + 1),
        })
      ).status,
      413,
    );
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(600 * 1024));
        controller.enqueue(new Uint8Array(600 * 1024));
        controller.close();
      },
    });
    const streamInit = {
      method: "POST",
      headers,
      body: stream,
      duplex: "half",
    };
    assert.equal((await fetch(`${baseUrl}/mcp`, streamInit)).status, 413);
    const batch = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(2000),
      body: JSON.stringify([
        { jsonrpc: "2.0", id: 1, method: "tools/list" },
        {
          jsonrpc: "2.0",
          method: "notifications/cancelled",
          params: { requestId: 1 },
        },
      ]),
    });
    assert.equal(batch.status, 400);
    const notification = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      }),
    });
    assert.equal(notification.status, 202);
  },
);

test(
  "an SDK client discovers tools, reads groups, and cannot read another user's data",
  postgresTestOptions,
  async () => {
    const { baseUrl, token, outsiderToken, trip } = await setup();
    const owner = await connect(baseUrl, token);
    const outsider = await connect(baseUrl, outsiderToken);
    const tools = await owner.listTools();
    assert.equal(tools.tools.length, 15);
    assert.equal(
      tools.tools.find(({ name }) => name === "otter_get_trip")?.annotations
        ?.readOnlyHint,
      true,
    );
    for (let i = 0; i < 3; i++) {
      const [owned, other] = await Promise.all([
        call(owner, "otter_list_trips"),
        call(outsider, "otter_list_trips"),
      ]);
      assert.deepEqual(other, { trips: [], archivedTrips: [] });
      assert.ok(JSON.stringify(owned).includes(trip.id));
    }
    const payload = await tripResult(owner, "otter_get_trip", {
      tripId: trip.id,
    });
    assert.equal(payload.trip.id, trip.id);
    assert.deepEqual(
      await call(owner, "otter_get_balances", { tripId: trip.id }),
      {
        tripId: trip.id,
        currency: "TWD",
        unit: "minor",
        balances: payload.balances,
      },
    );
    assert.deepEqual(
      await call(owner, "otter_get_settlements", { tripId: trip.id }),
      {
        tripId: trip.id,
        currency: "TWD",
        unit: "minor",
        settlements: payload.settlements,
      },
    );
    await call(outsider, "otter_get_trip", { tripId: trip.id }, 404);
  },
);

test(
  "MCP writes retain group permission, owner, archive, and user isolation checks",
  postgresTestOptions,
  async () => {
    const {
      baseUrl,
      token,
      outsiderToken,
      editorToken,
      trip,
      enableWrites,
      pool,
    } = await setup();
    const owner = await connect(baseUrl, token);
    const outsider = await connect(baseUrl, outsiderToken);
    const editor = await connect(baseUrl, editorToken);
    await call(
      owner,
      "otter_add_participant",
      { tripId: trip.id, name: "Blocked" },
      403,
    );
    assert.equal((await enableWrites()).response.status, 200);
    await call(
      outsider,
      "otter_add_participant",
      { tripId: trip.id, name: "Intruder" },
      404,
    );
    await call(
      editor,
      "otter_update_trip",
      { tripId: trip.id, name: "Not owner" },
      403,
    );
    const added = await tripResult(
      editor,
      "otter_add_participant",
      { tripId: trip.id, name: "Friend" },
      201,
    );
    const friend = added.trip.participants.find(
      ({ name }) => name === "Friend",
    );
    assert.ok(friend);
    await tripResult(owner, "otter_rename_participant", {
      tripId: trip.id,
      participantId: friend.id,
      name: "Renamed",
    });
    await tripResult(owner, "otter_delete_participant", {
      tripId: trip.id,
      participantId: friend.id,
      confirm: true,
    });
    await tripResult(owner, "otter_update_trip", {
      tripId: trip.id,
      archived: true,
    });
    await call(
      owner,
      "otter_add_participant",
      { tripId: trip.id, name: "Archived" },
      409,
    );
    await tripResult(owner, "otter_update_trip", {
      tripId: trip.id,
      archived: false,
    });
    await pool.query(
      "UPDATE trips SET allow_api_writes = false WHERE id = $1",
      [trip.id],
    );
    await call(
      owner,
      "otter_update_trip",
      { tripId: trip.id, name: "Blocked again" },
      403,
    );
    await pool.query(
      "UPDATE api_tokens SET revoked_at = now() WHERE id = 'owner'",
    );
    await assert.rejects(() => owner.listTools());
  },
);

test(
  "MCP validates the configured public Origin behind an HTTPS proxy",
  postgresTestOptions,
  async () => {
    vi.stubEnv("PASSKEY_ORIGIN", "https://otter.example.com");
    onTestFinished(() => vi.unstubAllEnvs());
    const { baseUrl, token } = await setup();
    const headers = {
      ...accept,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    assert.equal(
      (
        await fetch(`${baseUrl}/mcp`, {
          method: "POST",
          headers: { ...headers, Origin: "https://otter.example.com" },
          body: JSON.stringify(initialize),
        })
      ).status,
      200,
    );
    for (const Origin of [baseUrl, "https://attacker.example"]) {
      assert.equal(
        (
          await fetch(`${baseUrl}/mcp`, {
            method: "POST",
            headers: {
              ...headers,
              Origin,
              "X-Forwarded-Proto": "https",
              "X-Forwarded-Host": "attacker.example",
            },
            body: JSON.stringify(initialize),
          })
        ).status,
        403,
      );
    }
  },
);

test(
  "MCP rejects unsafe tool inputs and ignores owner cookies and share capabilities",
  postgresTestOptions,
  async () => {
    const { baseUrl, token, outsiderToken, cookie, pool, trip, enableWrites } =
      await setup();
    await enableWrites();
    const client = await connect(baseUrl, token);
    const initial = await call(client, "otter_get_trip", { tripId: trip.id });
    for (const [name, args] of [
      ["otter_delete_trip", { tripId: trip.id }],
      ["otter_delete_trip", { tripId: trip.id, confirm: false }],
      [
        "otter_delete_participant",
        { tripId: trip.id, participantId: trip.participants[0].id },
      ],
      [
        "otter_delete_expense",
        { tripId: trip.id, expenseId: "expense", confirm: true },
      ],
      ["otter_delete_settlement", { tripId: trip.id, paymentId: "payment" }],
      [
        "otter_update_expense",
        {
          tripId: trip.id,
          expenseId: "expense",
          description: "Missing version",
        },
      ],
      ["otter_update_trip", { tripId: trip.id, allowApiWrites: true }],
    ] satisfies [string, Record<string, unknown>][]) {
      const result = await client.callTool({ name, arguments: args });
      assert.equal(result.isError, true);
    }
    assert.deepEqual(
      await call(client, "otter_get_trip", { tripId: trip.id }),
      initial,
    );
    const shared = await api<TripPayload>(
      baseUrl,
      `/api/trips/${trip.id}/share-links`,
      {
        method: "POST",
        headers: { cookie },
        body: JSON.stringify({ mode: "anyone-edit" }),
      },
    );
    assert.equal(shared.response.status, 201);
    const shareUrl = shared.data.shareLinks?.find(
      ({ mode }) => mode === "anyone-edit",
    )?.url;
    assert.ok(shareUrl);
    const shareToken = new URL(shareUrl).pathname.split("/").at(-1);
    assert.ok(shareToken);
    const response = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: {
        ...accept,
        "Content-Type": "application/json",
        Authorization: `Bearer ${outsiderToken}`,
        cookie,
        "X-Otter-Share-Token": shareToken,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "otter_get_trip", arguments: { tripId: trip.id } },
      }),
    });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.result.structuredContent.status, 404);
    assert.equal(result.result.isError, true);
    assert.equal(
      (
        await pool.query("SELECT allow_api_writes FROM trips WHERE id = $1", [
          trip.id,
        ])
      ).rows[0].allow_api_writes,
      true,
    );
  },
);

test(
  "MCP expense versions, settlements, and confirmed deletion use existing REST transactions",
  postgresTestOptions,
  async () => {
    const { baseUrl, token, trip, enableWrites } = await setup();
    await enableWrites();
    const client = await connect(baseUrl, token);
    const added = await tripResult(
      client,
      "otter_add_participant",
      { tripId: trip.id, name: "Friend" },
      201,
    );
    const friend = added.trip.participants.find(
      ({ name }) => name === "Friend",
    );
    assert.ok(friend);
    const paidById = trip.participants[0].id;
    const created = await tripResult(
      client,
      "otter_add_expense",
      {
        tripId: trip.id,
        description: "Dinner",
        amount: "100",
        currency: "TWD",
        paidById,
        participantIds: [paidById, friend.id],
      },
      201,
    );
    const expense = created.trip.expenses[0];
    assert.equal(expense.amountMinor, 100);
    assert.equal(expense.version, 1);
    await call(
      client,
      "otter_add_expense",
      {
        tripId: trip.id,
        description: "Bad precision",
        amount: "1.25",
        currency: "TWD",
        paidById,
        participantIds: [paidById],
      },
      400,
    );
    const updated = await tripResult(client, "otter_update_expense", {
      tripId: trip.id,
      expenseId: expense.id,
      version: 1,
      description: "Lunch",
    });
    assert.equal(updated.trip.expenses[0].version, 2);
    await call(
      client,
      "otter_update_expense",
      {
        tripId: trip.id,
        expenseId: expense.id,
        version: 1,
        description: "Stale",
      },
      412,
    );
    await call(
      client,
      "otter_delete_expense",
      { tripId: trip.id, expenseId: expense.id, version: 1, confirm: true },
      412,
    );
    const settled = await tripResult(
      client,
      "otter_record_settlement",
      {
        tripId: trip.id,
        fromId: friend.id,
        toId: paidById,
        amount: "50",
        currency: "TWD",
      },
      201,
    );
    assert.deepEqual(settled.settlements, []);
    assert.equal(settled.trip.settlementPayments?.length, 1);
    const paymentId = settled.trip.settlementPayments?.[0].id;
    assert.ok(paymentId);
    await tripResult(client, "otter_delete_settlement", {
      tripId: trip.id,
      paymentId,
      confirm: true,
    });
    await tripResult(client, "otter_delete_expense", {
      tripId: trip.id,
      expenseId: expense.id,
      version: 2,
      confirm: true,
    });
    const newTrip = await tripResult(
      client,
      "otter_create_trip",
      { name: "Created by MCP", baseCurrency: "USD" },
      201,
    );
    assert.equal(newTrip.trip.allowApiWrites, false);
    await call(client, "otter_delete_trip", { tripId: trip.id, confirm: true });
    await call(client, "otter_get_trip", { tripId: trip.id }, 404);
  },
);
