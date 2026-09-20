import type { Pool as PgPool } from "pg";
import { apiTokenLifetimeSeconds, hashApiSecret } from "./server-api-tokens.js";
import type { OtterApp, OtterMiddleware } from "./server-http.js";
import { parseRequestBody } from "./server-http.js";
import {
  currentUser,
  nowIso,
  requestBody,
  sendError,
  stringField,
} from "./server-support.js";

type ApiTokenRow = {
  id: string;
  name: string;
  created_at: Date | string;
  expires_at: Date | string;
};

type StoredApiTokenRow = ApiTokenRow & {
  token_hash: string;
};

const apiTokenIdPattern =
  /^token_[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const accessTokenPattern = /^otter_api_[A-Za-z0-9_-]{43}$/;

export function registerPersonalApiTokenRoutes(
  app: OtterApp,
  pool: PgPool,
  mustHaveBrowserSession: OtterMiddleware,
) {
  app.get(
    "/api/auth/tokens",
    mustHaveBrowserSession,
    parseRequestBody,
    async (context) => {
      const result = await pool.query<ApiTokenRow>(
        `SELECT id, name, created_at, expires_at
         FROM api_tokens
         WHERE user_id = $1
           AND revoked_at IS NULL
           AND expires_at > now()
         ORDER BY created_at DESC, id DESC`,
        [currentUser(context).id],
      );
      return context.json({ tokens: result.rows.map(publicApiToken) });
    },
  );

  app.post(
    "/api/auth/tokens",
    mustHaveBrowserSession,
    parseRequestBody,
    async (context) => {
      const body = requestBody(context);
      const accessToken = stringField(body, "accessToken");
      const id = stringField(body, "id");
      const name = stringField(body, "name");
      if (!name || name.length > 80) {
        return sendError(
          context,
          400,
          "Token name must be between 1 and 80 characters",
        );
      }
      if (!id || !apiTokenIdPattern.test(id)) {
        return sendError(context, 400, "Invalid API token request ID");
      }
      if (!accessToken || !accessTokenPattern.test(accessToken)) {
        return sendError(context, 400, "Invalid API token secret");
      }

      const userId = currentUser(context).id;
      const tokenHash = hashApiSecret(accessToken);
      const createdAt = nowIso();
      const token = {
        createdAt,
        expiresAt: new Date(
          Date.now() + apiTokenLifetimeSeconds * 1000,
        ).toISOString(),
        id,
        name,
      };
      const inserted = await pool.query(
        `INSERT INTO api_tokens
           (id, user_id, token_hash, name, created_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [
          token.id,
          userId,
          tokenHash,
          token.name,
          token.createdAt,
          token.expiresAt,
        ],
      );
      if (inserted.rowCount === 1) {
        return context.json({ accessToken, token }, 201);
      }

      const existing = await pool.query<StoredApiTokenRow>(
        `SELECT id, name, token_hash, created_at, expires_at
         FROM api_tokens
         WHERE id = $1
           AND user_id = $2
           AND token_hash = $3
           AND revoked_at IS NULL
           AND expires_at > now()`,
        [id, userId, tokenHash],
      );
      if (!existing.rows[0]) {
        return sendError(
          context,
          409,
          "API token request conflicts with an existing token",
        );
      }
      return context.json({
        accessToken,
        token: publicApiToken(existing.rows[0]),
      });
    },
  );

  app.delete(
    "/api/auth/tokens/:tokenId",
    mustHaveBrowserSession,
    parseRequestBody,
    async (context) => {
      const result = await pool.query(
        `UPDATE api_tokens
         SET revoked_at = $1
         WHERE id = $2 AND user_id = $3 AND revoked_at IS NULL`,
        [nowIso(), context.req.param("tokenId"), currentUser(context).id],
      );
      if (result.rowCount === 0) {
        return sendError(context, 404, "API token not found");
      }
      return context.json({ ok: true });
    },
  );
}

function publicApiToken(row: ApiTokenRow) {
  return {
    createdAt: toIso(row.created_at),
    expiresAt: toIso(row.expires_at),
    id: row.id,
    name: row.name,
  };
}

function toIso(value: Date | string): string {
  return (value instanceof Date ? value : new Date(value)).toISOString();
}
