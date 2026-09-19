import crypto from "node:crypto";
import type { Pool as PgPool } from "pg";
import {
  bearerTokenFromRequest,
  generateAccessToken,
  hashApiSecret,
} from "./server-api-tokens.js";
import type { OtterApp, OtterMiddleware } from "./server-http.js";
import {
  asyncHandler,
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
const tokenLifetimeSeconds = 90 * 24 * 60 * 60;
const pollingIntervalSeconds = 3;
const userCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

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
  app.post(
    "/api/auth/device",
    asyncHandler(async (req, res) => {
      const clientName =
        stringField(requestBody(req), "clientName") ?? "Otter CLI";
      if (clientName.length > 80) {
        sendError(res, 400, "Client name must be 80 characters or fewer");
        return;
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
      const verificationUri = `${req.protocol}://${req.get("host")}/device`;
      res.status(201).json({
        device_code: deviceCode,
        expires_in: deviceLifetimeSeconds,
        interval: pollingIntervalSeconds,
        user_code: userCode,
        verification_uri: verificationUri,
        verification_uri_complete: `${verificationUri}?code=${encodeURIComponent(userCode)}`,
      });
    }),
  );

  app.get(
    "/api/auth/device/:userCode",
    mustHaveBrowserSession,
    asyncHandler(async (req, res) => {
      const userCode = normalizeUserCode(req.params.userCode);
      if (!userCode) {
        sendError(res, 404, "Device code not found or expired");
        return;
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
        sendError(res, 404, "Device code not found or expired");
        return;
      }
      res.json({
        clientName: row.client_name,
        expiresAt: toIso(row.expires_at),
        userCode,
      });
    }),
  );

  app.post(
    "/api/auth/device/approve",
    mustHaveBrowserSession,
    asyncHandler(async (req, res) => {
      const userCode = normalizeUserCode(
        stringField(requestBody(req), "userCode") ?? "",
      );
      if (!userCode) {
        sendError(res, 400, "Enter a valid device code");
        return;
      }
      const result = await pool.query<{ client_name: string }>(
        `UPDATE device_authorizations
         SET approved_by_user_id = $1, approved_at = $2
         WHERE user_code = $3
           AND expires_at > now()
           AND approved_at IS NULL
           AND consumed_at IS NULL
         RETURNING client_name`,
        [currentUser(res).id, nowIso(), userCode],
      );
      const row = result.rows[0];
      if (!row) {
        sendError(res, 404, "Device code not found or expired");
        return;
      }
      res.json({ clientName: row.client_name, ok: true });
    }),
  );

  app.post(
    "/api/auth/device/token",
    asyncHandler(async (req, res) => {
      const deviceCode = stringField(requestBody(req), "device_code");
      if (!deviceCode) {
        sendError(res, 400, "invalid_request");
        return;
      }
      const exchange = await exchangeDeviceCode(pool, deviceCode);
      if ("error" in exchange) {
        sendError(res, 400, exchange.error);
        return;
      }
      res.json({
        access_token: exchange.accessToken,
        expires_at: exchange.expiresAt,
        token_type: "Bearer",
      });
    }),
  );

  app.delete(
    "/api/auth/tokens/current",
    mustBeSignedIn,
    asyncHandler(async (req, res) => {
      const token = bearerTokenFromRequest(req);
      if (!token) {
        sendError(res, 400, "This request is not using an API token");
        return;
      }
      const result = await pool.query(
        `UPDATE api_tokens
         SET revoked_at = $1
         WHERE token_hash = $2 AND user_id = $3 AND revoked_at IS NULL`,
        [nowIso(), hashApiSecret(token), currentUser(res).id],
      );
      if (result.rowCount === 0) {
        sendError(res, 404, "API token not found");
        return;
      }
      res.json({ ok: true });
    }),
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
      Date.now() + tokenLifetimeSeconds * 1000,
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
