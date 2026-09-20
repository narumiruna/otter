import type { Pool as PgPool } from "pg";
import {
  apiTokenLifetimeSeconds,
  generateAccessToken,
  hashApiSecret,
} from "./server-api-tokens.js";
import type { OtterApp, OtterMiddleware } from "./server-http.js";
import {
  asyncHandler,
  currentUser,
  makeId,
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
      const name = stringField(requestBody(req), "name");
      if (!name || name.length > 80) {
        sendError(res, 400, "Token name must be between 1 and 80 characters");
        return;
      }

      const accessToken = generateAccessToken();
      const createdAt = nowIso();
      const token = {
        createdAt,
        expiresAt: new Date(
          Date.now() + apiTokenLifetimeSeconds * 1000,
        ).toISOString(),
        id: makeId("token"),
        name,
      };
      await pool.query(
        `INSERT INTO api_tokens
           (id, user_id, token_hash, name, created_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          token.id,
          currentUser(res).id,
          hashApiSecret(accessToken),
          token.name,
          token.createdAt,
          token.expiresAt,
        ],
      );
      res.status(201).json({ accessToken, token });
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
