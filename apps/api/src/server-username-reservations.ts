import type { QueryResult, QueryResultRow } from "pg";

type Queryable = {
  query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<Row>>;
};

// Use this inside a transaction before claiming a username, including a
// pending passkey signup. It serializes checks against inserts and renames.
export async function lockUsernameClaim(db: Queryable, username: string) {
  await db.query(
    "SELECT pg_advisory_xact_lock(hashtextextended('otter:username:' || $1, 0))",
    [username],
  );
}

export async function isUsernameReserved(db: Queryable, username: string) {
  const result = await db.query(
    `SELECT 1 FROM passkey_signup_challenges
     WHERE username = $1 AND expires_at > now() LIMIT 1`,
    [username],
  );
  return result.rowCount !== 0;
}
