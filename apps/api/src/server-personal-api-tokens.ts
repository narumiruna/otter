import type { Pool as PgPool } from "pg";
import { apiTokenLifetimeSeconds, hashApiSecret } from "./server-api-tokens.js";
import type { OtterApp, OtterMiddleware } from "./server-http.js";
import {
  asyncHandler,
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
    asyncHandler(async (_req, res) => {
      const result = await pool.query<ApiTokenRow>(
        `SELECT id, name, created_at, expires_at
         FROM api_tokens
         WHERE user_id = $1
           AND revoked_at IS NULL
           AND expires_at > now()
         ORDER BY created_at DESC, id DESC`,
        [currentUser(res).id],
      );
      res.json({ tokens: result.rows.map(publicApiToken) });
    }),
  );

  app.post(
    "/api/auth/tokens",
    mustHaveBrowserSession,
    asyncHandler(async (req, res) => {
      const body = requestBody(req);
      const accessToken = stringField(body, "accessToken");
      const id = stringField(body, "id");
      const name = stringField(body, "name");
      if (!name || name.length > 80) {
        sendError(res, 400, "Token name must be between 1 and 80 characters");
        return;
      }
      if (!id || !apiTokenIdPattern.test(id)) {
        sendError(res, 400, "Invalid API token request ID");
        return;
      }
      if (!accessToken || !accessTokenPattern.test(accessToken)) {
        sendError(res, 400, "Invalid API token secret");
        return;
      }

      const userId = currentUser(res).id;
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
        res.status(201).json({ accessToken, token });
        return;
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
        sendError(
          res,
          409,
          "API token request conflicts with an existing token",
        );
        return;
      }
      res.json({ accessToken, token: publicApiToken(existing.rows[0]) });
    }),
  );

  app.delete(
    "/api/auth/tokens/:tokenId",
    mustHaveBrowserSession,
    asyncHandler(async (req, res) => {
      const result = await pool.query(
        `UPDATE api_tokens
         SET revoked_at = $1
         WHERE id = $2 AND user_id = $3 AND revoked_at IS NULL`,
        [nowIso(), req.params.tokenId, currentUser(res).id],
      );
      if (result.rowCount === 0) {
        sendError(res, 404, "API token not found");
        return;
      }
      res.json({ ok: true });
    }),
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
