import assert from "node:assert/strict";
import type {
  ApiTokensResponse,
  CreateApiTokenResponse,
} from "@narumitw/otter-contracts";
import { test } from "vitest";
import { hashApiSecret } from "./server-api-tokens.js";
import {
  api,
  postgresTestOptions,
  type TripsResponse,
  type UserResponse,
  withTestApp,
} from "./server-test-utils.js";

test(
  "browser sessions create, list, use, and revoke hashed API tokens",
  postgresTestOptions,
  async () => {
    const { baseUrl, pool } = await withTestApp();
    const registration = await api<UserResponse>(
      baseUrl,
      "/api/auth/register",
      {
        body: JSON.stringify({
          password: "password123",
          username: `personal-token-${Date.now()}`,
        }),
        method: "POST",
      },
    );
    const cookie = registration.response.headers
      .get("set-cookie")
      ?.split(";")[0];
    assert.ok(cookie);

    const unauthenticated = await api<{ error: string }>(
      baseUrl,
      "/api/auth/tokens",
    );
    assert.equal(unauthenticated.response.status, 401);

    for (const name of ["", " ", "x".repeat(81)]) {
      const invalid = await api<{ error: string }>(
        baseUrl,
        "/api/auth/tokens",
        {
          body: JSON.stringify({ name }),
          headers: { cookie },
          method: "POST",
        },
      );
      assert.equal(invalid.response.status, 400);
      assert.equal(
        invalid.data.error,
        "Token name must be between 1 and 80 characters",
      );
    }

    const created = await api<CreateApiTokenResponse>(
      baseUrl,
      "/api/auth/tokens",
      {
        body: JSON.stringify({ name: "  CI travel agent  " }),
        headers: { cookie },
        method: "POST",
      },
    );
    assert.equal(created.response.status, 201);
    assert.match(created.data.accessToken, /^otter_api_[A-Za-z0-9_-]{43}$/);
    assert.equal(created.data.token.name, "CI travel agent");
    assert.match(created.data.token.id, /^token_/);
    assert.ok(new Date(created.data.token.expiresAt).getTime() > Date.now());

    const stored = await pool.query<{ token_hash: string }>(
      "SELECT token_hash FROM api_tokens WHERE id = $1",
      [created.data.token.id],
    );
    assert.equal(
      stored.rows[0]?.token_hash,
      hashApiSecret(created.data.accessToken),
    );
    assert.notEqual(stored.rows[0]?.token_hash, created.data.accessToken);

    const listed = await api<ApiTokensResponse>(baseUrl, "/api/auth/tokens", {
      headers: { cookie },
    });
    assert.deepEqual(listed.data.tokens, [created.data.token]);

    const authorization = `Bearer ${created.data.accessToken}`;
    const trips = await api<TripsResponse>(baseUrl, "/api/trips", {
      headers: { authorization },
    });
    assert.equal(trips.response.status, 200);

    const bearerManagement = await Promise.all([
      api<{ error: string }>(baseUrl, "/api/auth/tokens", {
        headers: { authorization },
      }),
      api<{ error: string }>(baseUrl, "/api/auth/tokens", {
        body: JSON.stringify({ name: "Escalation attempt" }),
        headers: { authorization },
        method: "POST",
      }),
      api<{ error: string }>(
        baseUrl,
        `/api/auth/tokens/${encodeURIComponent(created.data.token.id)}`,
        { headers: { authorization }, method: "DELETE" },
      ),
    ]);
    assert.deepEqual(
      bearerManagement.map(({ response }) => response.status),
      [401, 401, 401],
    );

    const revoked = await api<{ ok: true }>(
      baseUrl,
      `/api/auth/tokens/${encodeURIComponent(created.data.token.id)}`,
      { headers: { cookie }, method: "DELETE" },
    );
    assert.equal(revoked.response.status, 200);
    assert.equal(revoked.data.ok, true);

    const afterRevoke = await api<TripsResponse>(baseUrl, "/api/trips", {
      headers: { authorization },
    });
    assert.equal(afterRevoke.response.status, 401);
    const listedAfterRevoke = await api<ApiTokensResponse>(
      baseUrl,
      "/api/auth/tokens",
      { headers: { cookie } },
    );
    assert.deepEqual(listedAfterRevoke.data.tokens, []);
  },
);
