import crypto from "node:crypto";
import type { QueryResult, QueryResultRow } from "pg";
import type { RouteRequest } from "./server-http.js";
import type { User } from "./server-support.js";

type Queryable = {
  query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<Row>>;
};

type UserRow = {
  id: string;
  name: string;
  username: string;
  created_at: Date | string;
};

export function generateAccessToken(): string {
  return `otter_api_${crypto.randomBytes(32).toString("base64url")}`;
}

export function hashApiSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

export function bearerTokenFromRequest(req: RouteRequest): string | undefined {
  const authorization = req.get("authorization");
  if (!authorization) {
    return undefined;
  }
  const match = /^Bearer ([^\s]+)$/.exec(authorization);
  return match?.[1];
}

export async function userFromApiToken(
  db: Queryable,
  token: string,
): Promise<User | undefined> {
  if (!token.startsWith("otter_api_")) {
    return undefined;
  }
  const result = await db.query<UserRow>(
    `SELECT users.id, users.name, users.username, users.created_at
     FROM api_tokens
     JOIN users ON users.id = api_tokens.user_id
     WHERE api_tokens.token_hash = $1
       AND api_tokens.revoked_at IS NULL
       AND api_tokens.expires_at > now()`,
    [hashApiSecret(token)],
  );
  const row = result.rows[0];
  return row
    ? {
        createdAt: (row.created_at instanceof Date
          ? row.created_at
          : new Date(row.created_at)
        ).toISOString(),
        id: row.id,
        name: row.name,
        passwordHash: "",
        username: row.username,
      }
    : undefined;
}
