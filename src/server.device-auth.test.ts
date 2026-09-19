import assert from "node:assert/strict";
import { test } from "vitest";
import {
  api,
  postgresTestOptions,
  type TripsResponse,
  type UserResponse,
  withTestApp,
} from "./server-test-utils.js";

type DeviceAuthorization = {
  device_code: string;
  expires_in: number;
  interval: number;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
};

type DeviceInspection = {
  clientName: string;
  expiresAt: string;
  userCode: string;
};

type TokenResponse = {
  access_token: string;
  expires_at: string;
  token_type: "Bearer";
};

test(
  "device authorization issues, authenticates, and revokes a hashed Bearer token",
  postgresTestOptions,
  async () => {
    const { baseUrl, pool } = await withTestApp();
    const username = `device-${Date.now()}`;
    const registration = await api<UserResponse>(
      baseUrl,
      "/api/auth/register",
      {
        body: JSON.stringify({ password: "password123", username }),
        method: "POST",
      },
    );
    const cookie = registration.response.headers
      .get("set-cookie")
      ?.split(";")[0];
    assert.ok(cookie);

    const created = await api<DeviceAuthorization>(
      baseUrl,
      "/api/auth/device",
      {
        body: JSON.stringify({ clientName: "Travel agent" }),
        method: "POST",
      },
    );
    assert.equal(created.response.status, 201);
    assert.match(created.data.user_code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    assert.equal(created.data.expires_in, 600);
    assert.equal(created.data.interval, 3);
    assert.equal(created.data.verification_uri, `${baseUrl}/device`);
    assert.equal(
      created.data.verification_uri_complete,
      `${baseUrl}/device?code=${created.data.user_code}`,
    );

    const pending = await api<{ error: string }>(
      baseUrl,
      "/api/auth/device/token",
      {
        body: JSON.stringify({ device_code: created.data.device_code }),
        method: "POST",
      },
    );
    assert.equal(pending.response.status, 400);
    assert.equal(pending.data.error, "authorization_pending");

    const inspection = await api<DeviceInspection>(
      baseUrl,
      `/api/auth/device/${created.data.user_code.replace("-", "")}`,
      { headers: { cookie } },
    );
    assert.equal(inspection.response.status, 200);
    assert.equal(inspection.data.clientName, "Travel agent");
    assert.equal(inspection.data.userCode, created.data.user_code);

    const approved = await api<{ clientName: string; ok: true }>(
      baseUrl,
      "/api/auth/device/approve",
      {
        body: JSON.stringify({ userCode: created.data.user_code }),
        headers: { cookie },
        method: "POST",
      },
    );
    assert.equal(approved.response.status, 200);
    assert.equal(approved.data.clientName, "Travel agent");

    const exchanged = await api<TokenResponse>(
      baseUrl,
      "/api/auth/device/token",
      {
        body: JSON.stringify({ device_code: created.data.device_code }),
        method: "POST",
      },
    );
    assert.equal(exchanged.response.status, 200);
    assert.match(exchanged.data.access_token, /^otter_api_/);
    assert.equal(exchanged.data.token_type, "Bearer");
    assert.ok(new Date(exchanged.data.expires_at).getTime() > Date.now());

    const stored = await pool.query<{ token_hash: string }>(
      "SELECT token_hash FROM api_tokens",
    );
    assert.equal(stored.rows.length, 1);
    assert.notEqual(stored.rows[0]?.token_hash, exchanged.data.access_token);
    assert.doesNotMatch(stored.rows[0]?.token_hash ?? "", /otter_api_/);

    const authorization = `Bearer ${exchanged.data.access_token}`;
    const me = await api<UserResponse>(baseUrl, "/api/me", {
      headers: { authorization },
    });
    assert.equal(me.data.user?.username, username);
    const trips = await api<TripsResponse>(baseUrl, "/api/trips", {
      headers: { authorization },
    });
    assert.equal(trips.response.status, 200);

    const renewal = await api<DeviceAuthorization>(
      baseUrl,
      "/api/auth/device",
      {
        body: JSON.stringify({ clientName: "Token renewal attempt" }),
        method: "POST",
      },
    );
    const tokenOnlyInspection = await api<{ error: string }>(
      baseUrl,
      `/api/auth/device/${renewal.data.user_code}`,
      { headers: { authorization } },
    );
    assert.equal(tokenOnlyInspection.response.status, 401);
    const tokenOnlyApproval = await api<{ error: string }>(
      baseUrl,
      "/api/auth/device/approve",
      {
        body: JSON.stringify({ userCode: renewal.data.user_code }),
        headers: { authorization },
        method: "POST",
      },
    );
    assert.equal(tokenOnlyApproval.response.status, 401);
    const renewalStillPending = await api<{ error: string }>(
      baseUrl,
      "/api/auth/device/token",
      {
        body: JSON.stringify({ device_code: renewal.data.device_code }),
        method: "POST",
      },
    );
    assert.equal(renewalStillPending.data.error, "authorization_pending");

    const reused = await api<{ error: string }>(
      baseUrl,
      "/api/auth/device/token",
      {
        body: JSON.stringify({ device_code: created.data.device_code }),
        method: "POST",
      },
    );
    assert.equal(reused.data.error, "invalid_grant");

    const malformedBearer = await api<{ error: string }>(
      baseUrl,
      "/api/trips",
      { headers: { authorization: "Basic invalid", cookie } },
    );
    assert.equal(malformedBearer.response.status, 401);

    const revoked = await api<{ ok: true }>(
      baseUrl,
      "/api/auth/tokens/current",
      { headers: { authorization }, method: "DELETE" },
    );
    assert.equal(revoked.response.status, 200);
    const afterRevoke = await api<{ error: string }>(baseUrl, "/api/trips", {
      headers: { authorization },
    });
    assert.equal(afterRevoke.response.status, 401);
  },
);

test(
  "device authorization rejects expired requests",
  postgresTestOptions,
  async () => {
    const { baseUrl, pool } = await withTestApp();
    const created = await api<DeviceAuthorization>(
      baseUrl,
      "/api/auth/device",
      { body: JSON.stringify({}), method: "POST" },
    );
    await pool.query(
      "UPDATE device_authorizations SET expires_at = now() - interval '1 second' WHERE user_code = $1",
      [created.data.user_code],
    );

    const expired = await api<{ error: string }>(
      baseUrl,
      "/api/auth/device/token",
      {
        body: JSON.stringify({ device_code: created.data.device_code }),
        method: "POST",
      },
    );
    assert.equal(expired.response.status, 400);
    assert.equal(expired.data.error, "expired_token");
  },
);
