import crypto from "node:crypto";
import type { Pool as PgPool } from "pg";
import {
  apiTokenLifetimeSeconds,
  bearerTokenFromRequest,
  generateAccessToken,
  hashApiSecret,
} from "./server-api-tokens.js";
import type { OtterApp, OtterMiddleware } from "./server-http.js";
import { parseRequestBody, requestRemoteAddress } from "./server-http.js";
import { createFixedWindowRateLimiter } from "./server-rate-limit.js";
import {
  currentUser,
  isPgCode,
  makeId,
  nowIso,
  requestBody,
  sendError,
  stringField,
  withTransaction,
} from "./server-support.js";

const deviceLifetimeSeconds = 10 * 60;
const pollingIntervalSeconds = 3;
const userCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const authorizationRateLimitWindowMs = 60 * 1000;
const authorizationPerClientLimit = 10;
const authorizationGlobalLimit = 120;

type DeviceAuthorizationRow = {
  id: string;
  client_name: string;
  expires_at: Date | string;
  approved_by_user_id: string | null;
  approved_at: Date | string | null;
  consumed_at: Date | string | null;
};

type DeviceInspectionRow = {
  client_name: string;
  expires_at: Date | string;
};

type TokenExchangeResult =
  | { error: "authorization_pending" | "expired_token" | "invalid_grant" }
  | { accessToken: string; expiresAt: string };

export function registerDeviceAuthRoutes(
  app: OtterApp,
  pool: PgPool,
  mustBeSignedIn: OtterMiddleware,
  mustHaveBrowserSession: OtterMiddleware,
) {
  const limitAuthorizationRequests = createFixedWindowRateLimiter({
    globalLimit: authorizationGlobalLimit,
    perClientLimit: authorizationPerClientLimit,
    trustProxy: process.env.DEVICE_AUTH_TRUST_PROXY === "true",
    windowMs: authorizationRateLimitWindowMs,
  });

  app.post("/api/auth/device", parseRequestBody, async (context) => {
    const retryAfter = limitAuthorizationRequests(
      context.req.raw,
      requestRemoteAddress(context),
    );
    if (retryAfter !== undefined) {
      context.header("Retry-After", String(retryAfter));
      return sendError(context, 429, "Too many device authorization requests");
    }

    const clientName =
      stringField(requestBody(context), "clientName") ?? "Otter CLI";
    if (!clientName || clientName.length > 80) {
      return sendError(
        context,
        400,
        "Client name must be between 1 and 80 characters",
      );
    }

    await pool.query(
      "DELETE FROM device_authorizations WHERE expires_at <= now()",
    );
    const deviceCode = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(
      Date.now() + deviceLifetimeSeconds * 1000,
    ).toISOString();
    const userCode = await insertDeviceAuthorization(
      pool,
      deviceCode,
      clientName,
      expiresAt,
    );
    const verificationUri = `${new URL(context.req.url).protocol}//${context.req.header("host")}/device`;
    return context.json(
      {
        device_code: deviceCode,
        expires_in: deviceLifetimeSeconds,
        interval: pollingIntervalSeconds,
        user_code: userCode,
        verification_uri: verificationUri,
        verification_uri_complete: `${verificationUri}?code=${encodeURIComponent(userCode)}`,
      },
      201,
    );
  });

  app.get(
    "/api/auth/device/:userCode",
    mustHaveBrowserSession,
    parseRequestBody,
    async (context) => {
      const userCode = normalizeUserCode(context.req.param("userCode"));
      if (!userCode) {
        return sendError(context, 404, "Device code not found or expired");
      }
      const result = await pool.query<DeviceInspectionRow>(
        `SELECT client_name, expires_at
         FROM device_authorizations
         WHERE user_code = $1
           AND expires_at > now()
           AND approved_at IS NULL
           AND consumed_at IS NULL`,
        [userCode],
      );
      const row = result.rows[0];
      if (!row) {
        return sendError(context, 404, "Device code not found or expired");
      }
      return context.json({
        clientName: row.client_name,
        expiresAt: toIso(row.expires_at),
        userCode,
      });
    },
  );

  app.post(
    "/api/auth/device/approve",
    mustHaveBrowserSession,
    parseRequestBody,
    async (context) => {
      const userCode = normalizeUserCode(
        stringField(requestBody(context), "userCode") ?? "",
      );
      if (!userCode) {
        return sendError(context, 400, "Enter a valid device code");
      }
      const result = await pool.query<{ client_name: string }>(
        `UPDATE device_authorizations
         SET approved_by_user_id = $1, approved_at = $2
         WHERE user_code = $3
           AND expires_at > now()
           AND approved_at IS NULL
           AND consumed_at IS NULL
         RETURNING client_name`,
        [currentUser(context).id, nowIso(), userCode],
      );
      const row = result.rows[0];
      if (!row) {
        return sendError(context, 404, "Device code not found or expired");
      }
      return context.json({ clientName: row.client_name, ok: true });
    },
  );

  app.post("/api/auth/device/token", parseRequestBody, async (context) => {
    const deviceCode = stringField(requestBody(context), "device_code");
    if (!deviceCode) {
      return sendError(context, 400, "invalid_request");
    }
    const exchange = await exchangeDeviceCode(pool, deviceCode);
    if ("error" in exchange) {
      return sendError(context, 400, exchange.error);
    }
    return context.json({
      access_token: exchange.accessToken,
      expires_at: exchange.expiresAt,
      token_type: "Bearer",
    });
  });

  app.delete(
    "/api/auth/tokens/current",
    mustBeSignedIn,
    parseRequestBody,
    async (context) => {
      const token = bearerTokenFromRequest(context.req.raw);
      if (!token) {
        return sendError(
          context,
          400,
          "This request is not using an API token",
        );
      }
      const result = await pool.query(
        `UPDATE api_tokens
         SET revoked_at = $1
         WHERE token_hash = $2 AND user_id = $3 AND revoked_at IS NULL`,
        [nowIso(), hashApiSecret(token), currentUser(context).id],
      );
      if (result.rowCount === 0) {
        return sendError(context, 404, "API token not found");
      }
      return context.json({ ok: true });
    },
  );
}

async function insertDeviceAuthorization(
  pool: PgPool,
  deviceCode: string,
  clientName: string,
  expiresAt: string,
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const userCode = generateUserCode();
    try {
      await pool.query(
        `INSERT INTO device_authorizations
           (id, device_code_hash, user_code, client_name, created_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          makeId("device"),
          hashApiSecret(deviceCode),
          userCode,
          clientName,
          nowIso(),
          expiresAt,
        ],
      );
      return userCode;
    } catch (error) {
      if (!isPgCode(error, "23505")) {
        throw error;
      }
    }
  }
  throw new Error("Could not allocate a unique device code");
}

async function exchangeDeviceCode(
  pool: PgPool,
  deviceCode: string,
): Promise<TokenExchangeResult> {
  return withTransaction(pool, async (client) => {
    const result = await client.query<DeviceAuthorizationRow>(
      `SELECT id, client_name, expires_at, approved_by_user_id, approved_at, consumed_at
       FROM device_authorizations
       WHERE device_code_hash = $1
       FOR UPDATE`,
      [hashApiSecret(deviceCode)],
    );
    const row = result.rows[0];
    if (!row || row.consumed_at) {
      return { error: "invalid_grant" };
    }
    if (new Date(row.expires_at).getTime() <= Date.now()) {
      return { error: "expired_token" };
    }
    if (!row.approved_by_user_id || !row.approved_at) {
      return { error: "authorization_pending" };
    }

    const accessToken = generateAccessToken();
    const expiresAt = new Date(
      Date.now() + apiTokenLifetimeSeconds * 1000,
    ).toISOString();
    const consumedAt = nowIso();
    await client.query(
      `INSERT INTO api_tokens
         (id, user_id, token_hash, name, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        makeId("token"),
        row.approved_by_user_id,
        hashApiSecret(accessToken),
        row.client_name,
        consumedAt,
        expiresAt,
      ],
    );
    await client.query(
      "UPDATE device_authorizations SET consumed_at = $1 WHERE id = $2",
      [consumedAt, row.id],
    );
    return { accessToken, expiresAt };
  });
}

function generateUserCode(): string {
  const bytes = crypto.randomBytes(8);
  const characters = Array.from(bytes, (byte) => {
    return userCodeAlphabet[byte % userCodeAlphabet.length];
  }).join("");
  return `${characters.slice(0, 4)}-${characters.slice(4)}`;
}

export function normalizeUserCode(value: string): string | undefined {
  const compact = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z2-9]/g, "");
  if (compact.length !== 8) {
    return undefined;
  }
  return `${compact.slice(0, 4)}-${compact.slice(4)}`;
}

function toIso(value: Date | string): string {
  return (value instanceof Date ? value : new Date(value)).toISOString();
}
