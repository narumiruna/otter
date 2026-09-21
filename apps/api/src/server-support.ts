import crypto from "node:crypto";
import type {
  ExchangeRateInfo,
  ExpenseSnapshot,
  User as PublicUser,
  Trip,
  TripCollaborator,
  TripPayload,
  TripRole,
  TripShareLink,
  VersionedTrip,
} from "@narumitw/otter-contracts";
import { type Currency, isCurrency } from "@narumitw/otter-core/money";
import {
  calculateBalances,
  calculateSettlements,
} from "@narumitw/otter-core/settlement";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type {
  Pool as PgPool,
  PoolClient,
  QueryResult,
  QueryResultRow,
} from "pg";
import pg from "pg";
import {
  bearerTokenFromRequest,
  userFromApiToken,
} from "./server-api-tokens.js";
import type { OtterContext, OtterMiddleware } from "./server-http.js";

const { Pool } = pg;

export type User = {
  id: string;
  name: string;
  username: string;
  passwordHash: string;
  createdAt: string;
};

export type Session = {
  id: string;
  userId: string;
  expiresAt: string;
};

export type { TripRole } from "@narumitw/otter-contracts";

export type LoadedTrip = VersionedTrip & {
  currentUserRole?: TripRole;
  collaborators?: TripCollaborator[];
  shareLinks?: TripShareLink[];
};

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
  password_hash: string;
  created_at: Date | string;
};

type TripRow = {
  id: string;
  owner_id: string;
  name: string;
  base_currency: string;
  archived_at: Date | string | null;
  created_at: Date | string;
  current_user_role?: TripRole;
};

type ParticipantRow = {
  id: string;
  name: string;
};

type ExpenseRow = {
  version: number;
  snapshot: ExpenseSnapshot;
  id: string;
};

type SettlementPaymentRow = {
  id: string;
  from_id: string;
  to_id: string;
  amount_minor: string | number;
  currency: string;
  paid_at: Date | string;
  note: string;
  created_at: Date | string;
};

type ExchangeRateRow = {
  currency: string;
  rate_to_base: string | number;
};

type TripMemberRow = {
  user_id: string;
  name: string;
  username: string;
  role: TripRole;
  created_at: Date | string;
};

type TripShareLinkRow = {
  id: string;
  created_at: Date | string;
  revoked_at: Date | string | null;
  expires_at: Date | string | null;
};

export const isProduction = process.env.NODE_ENV === "production";
export { isDateOnly } from "@narumitw/otter-core/date";

const sessionDays = 7;
const sessionMaxAgeSeconds = sessionDays * 24 * 60 * 60;
const passwordIterations = 210_000;

export function publicUser(user: User): PublicUser {
  return {
    username: user.username,
    id: user.id,
    name: user.name,
  };
}

export function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export { normalizeUsername } from "@narumitw/otter-core/username";

function derivePassword(
  password: string,
  salt: string,
  iterations: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, iterations, 32, "sha256", (error, key) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = (
    await derivePassword(password, salt, passwordIterations)
  ).toString("hex");
  return `pbkdf2:${passwordIterations}:${salt}:${hash}`;
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  const [algorithm, iterationsText, salt, hash] = passwordHash.split(":");
  const iterations = Number(iterationsText);

  if (
    algorithm !== "pbkdf2" ||
    !Number.isSafeInteger(iterations) ||
    iterations < 1 ||
    !salt ||
    !hash ||
    !/^[0-9a-f]{64}$/i.test(hash)
  ) {
    return false;
  }

  const candidateBuffer = await derivePassword(password, salt, iterations);
  const hashBuffer = Buffer.from(hash, "hex");

  return crypto.timingSafeEqual(hashBuffer, candidateBuffer);
}

export function requestBody(context: OtterContext): Record<string, unknown> {
  const body = context.get("requestBody");
  return body && typeof body === "object"
    ? (body as Record<string, unknown>)
    : {};
}

export function stringField(
  body: Record<string, unknown>,
  field: string,
): string | undefined {
  const value = body[field];
  return typeof value === "string" ? value.trim() : undefined;
}

export function sendError(
  context: OtterContext,
  status: ContentfulStatusCode,
  error: string,
) {
  return context.json({ error }, status);
}

export function getCookie(req: Request, name: string): string | undefined {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) {
    return undefined;
  }

  for (const cookie of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = cookie.trim().split("=");
    if (rawName === name) {
      try {
        return decodeURIComponent(rawValue.join("="));
      } catch {
        return undefined;
      }
    }
  }

  return undefined;
}

function secureCookieAttribute(): string {
  if (process.env.COOKIE_SECURE === "true") {
    return "; Secure";
  }
  if (process.env.COOKIE_SECURE === "false") {
    return "";
  }
  return process.env.NODE_ENV === "production" ? "; Secure" : "";
}

export function sessionCookieHeader(sessionId: string): string {
  return `otter_session=${encodeURIComponent(sessionId)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${sessionMaxAgeSeconds}${secureCookieAttribute()}`;
}

export function clearSessionCookieHeader(): string {
  return `otter_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secureCookieAttribute()}`;
}

export function setSessionCookie(context: OtterContext, sessionId: string) {
  context.header("Set-Cookie", sessionCookieHeader(sessionId));
}

export function clearSessionCookie(context: OtterContext) {
  context.header("Set-Cookie", clearSessionCookieHeader());
}

export type BuildTripPayload = (trip: LoadedTrip) => Promise<TripPayload>;

export function tripPayload(
  trip: LoadedTrip,
  exchangeRateInfo?: ExchangeRateInfo,
): TripPayload {
  const { collaborators, currentUserRole, shareLinks, ...plainTrip } = trip;
  return {
    balances: calculateBalances(plainTrip),
    ...(exchangeRateInfo ? { exchangeRateInfo } : {}),
    settlements: calculateSettlements(plainTrip),
    trip: plainTrip,
    ...(currentUserRole ? { currentUserRole } : {}),
    ...(collaborators ? { collaborators } : {}),
    ...(shareLinks ? { shareLinks } : {}),
  };
}

export function participantExists(trip: Trip, participantId: string): boolean {
  return trip.participants.some(
    (participant) => participant.id === participantId,
  );
}

export function archivedTripResponse(context: OtterContext) {
  return sendError(context, 409, "支出群組已封存，請先還原");
}

export function participantNameExists(
  trip: Trip,
  name: string,
  exceptParticipantId?: string,
): boolean {
  const normalized = name.trim().toLocaleLowerCase();
  return trip.participants.some(
    (participant) =>
      participant.id !== exceptParticipantId &&
      participant.name.trim().toLocaleLowerCase() === normalized,
  );
}

export async function tripNameExistsForUser(
  db: Queryable,
  ownerId: string,
  name: string,
  exceptTripId?: string,
): Promise<boolean> {
  const result = await db.query(
    `SELECT 1
     FROM trips
     WHERE owner_id = $1
       AND lower(trim(name)) = lower(trim($2))
       AND ($3::text IS NULL OR id <> $3)
     LIMIT 1`,
    [ownerId, name, exceptTripId ?? null],
  );
  return result.rows.length > 0;
}

export function iso(value: Date | string): string {
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

function dateOnly(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : value.slice(0, 10);
}

export function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function currencyFromDb(value: string): Currency {
  if (!isCurrency(value)) {
    throw new Error(`Unsupported currency in database: ${value}`);
  }
  return value;
}

function rowToUser(row: UserRow): User {
  return {
    createdAt: iso(row.created_at),
    username: row.username,
    id: row.id,
    name: row.name,
    passwordHash: row.password_hash,
  };
}

function rowToTrip(
  row: TripRow,
): Omit<Trip, "expenses" | "participants" | "settlementPayments"> {
  return {
    archivedAt: row.archived_at ? iso(row.archived_at) : null,
    baseCurrency: currencyFromDb(row.base_currency),
    createdAt: iso(row.created_at),
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
  };
}

export function isPgCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

export function currentUser(context: OtterContext): User {
  const user = context.get("user");
  if (!user) {
    throw new Error("Authenticated user is missing from Hono context");
  }
  return user;
}

function databaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) {
    throw new Error("DATABASE_URL is required");
  }
  return value;
}

export function createPool(): PgPool {
  return new Pool({ connectionString: databaseUrl() });
}

export async function withTransaction<T>(
  pool: PgPool | PoolClient,
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  // A supplied client belongs to the surrounding tripMutation transaction.
  if ("release" in pool) return callback(pool);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function findUserByUsername(
  db: Queryable,
  username: string,
): Promise<User | undefined> {
  const result = await db.query<UserRow>(
    `SELECT id, name, username, password_hash, created_at
     FROM users
     WHERE username = $1`,
    [username],
  );
  const row = result.rows[0];
  return row ? rowToUser(row) : undefined;
}

export async function createSession(
  db: Queryable,
  userId: string,
): Promise<Session> {
  const session = {
    expiresAt: new Date(Date.now() + sessionMaxAgeSeconds * 1000).toISOString(),
    id: crypto.randomBytes(32).toString("hex"),
    userId,
  };
  await db.query(
    `INSERT INTO sessions (id, user_id, expires_at)
     VALUES ($1, $2, $3)`,
    [session.id, session.userId, session.expiresAt],
  );
  return session;
}

export async function userFromSessionRequest(
  db: Queryable,
  req: Request,
): Promise<User | undefined> {
  const sessionId = getCookie(req, "otter_session");
  if (!sessionId) {
    return undefined;
  }

  await db.query("DELETE FROM sessions WHERE id = $1 AND expires_at <= now()", [
    sessionId,
  ]);
  const result = await db.query<UserRow>(
    `SELECT users.id, users.name, users.username, users.password_hash, users.created_at
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.id = $1 AND sessions.expires_at > now()`,
    [sessionId],
  );
  const row = result.rows[0];
  return row ? rowToUser(row) : undefined;
}

export async function userFromRequest(
  db: Queryable,
  req: Request,
): Promise<User | undefined> {
  if (req.headers.get("authorization")) {
    const bearerToken = bearerTokenFromRequest(req);
    return bearerToken ? userFromApiToken(db, bearerToken) : undefined;
  }
  return userFromSessionRequest(db, req);
}

function requireAuthenticatedUser(
  db: Queryable,
  authenticate: (db: Queryable, request: Request) => Promise<User | undefined>,
): OtterMiddleware {
  return async (context: OtterContext, next) => {
    const user = await authenticate(db, context.req.raw);
    if (!user) {
      return context.json({ error: "請先登入" }, 401);
    }

    context.set("user", user);
    await next();
  };
}

export function requireUser(db: Queryable): OtterMiddleware {
  return requireAuthenticatedUser(db, userFromRequest);
}

export function requireSessionUser(db: Queryable): OtterMiddleware {
  return requireAuthenticatedUser(db, userFromSessionRequest);
}

export async function loadTripForUser(
  db: Queryable,
  userId: string,
  tripId: string,
): Promise<LoadedTrip | undefined> {
  return loadTrip(db, tripId, userId);
}

export async function loadTripById(
  db: Queryable,
  tripId: string,
): Promise<LoadedTrip | undefined> {
  return loadTrip(db, tripId);
}

async function loadTrip(
  db: Queryable,
  tripId: string,
  userId?: string,
): Promise<LoadedTrip | undefined> {
  const tripResult = userId
    ? await db.query<TripRow>(
        `SELECT trips.id, trips.owner_id, trips.name, trips.base_currency, trips.archived_at, trips.created_at,
                trip_members.role AS current_user_role
         FROM trips
         JOIN trip_members ON trip_members.trip_id = trips.id
         WHERE trips.id = $1 AND trip_members.user_id = $2`,
        [tripId, userId],
      )
    : await db.query<TripRow>(
        `SELECT id, owner_id, name, base_currency, archived_at, created_at
         FROM trips
         WHERE id = $1`,
        [tripId],
      );
  const tripRow = tripResult.rows[0];
  if (!tripRow) {
    return undefined;
  }

  const readParticipants = () =>
    db.query<ParticipantRow>(
      `SELECT id, name
       FROM participants
       WHERE trip_id = $1
       ORDER BY created_at, id`,
      [tripId],
    );
  const readExpenses = () =>
    db.query<ExpenseRow>(
      `SELECT id, version, expense_revision_snapshot(expenses) AS snapshot
       FROM expenses
       WHERE trip_id = $1
       ORDER BY created_at, id`,
      [tripId],
    );
  const readPayments = () =>
    db.query<SettlementPaymentRow>(
      `SELECT id, from_id, to_id, amount_minor, currency, paid_at::text AS paid_at, note, created_at
       FROM settlement_payments
       WHERE trip_id = $1
       ORDER BY paid_at, created_at, id`,
      [tripId],
    );
  const readExchangeRates = () =>
    db.query<ExchangeRateRow>(
      `SELECT currency, rate_to_base
       FROM trip_exchange_rates
       WHERE trip_id = $1`,
      [tripId],
    );
  const readMembers = async () =>
    userId
      ? db.query<TripMemberRow>(
          `SELECT users.id AS user_id, users.name, users.username, trip_members.role, trip_members.created_at
           FROM trip_members
           JOIN users ON users.id = trip_members.user_id
           WHERE trip_members.trip_id = $1
           ORDER BY CASE trip_members.role WHEN 'owner' THEN 0 ELSE 1 END, trip_members.created_at`,
          [tripId],
        )
      : { rows: [] };
  const readShareLinks = async () =>
    tripRow.current_user_role === "owner"
      ? db.query<TripShareLinkRow>(
          `SELECT id, created_at, revoked_at, expires_at
           FROM trip_share_links
           WHERE trip_id = $1
           ORDER BY created_at DESC, id`,
          [tripId],
        )
      : { rows: [] };

  // Independent Pool queries can use separate connections. A transaction client
  // (or another single Queryable) must finish each query before starting another.
  const [
    participantsResult,
    expensesResult,
    settlementPaymentsResult,
    exchangeRatesResult,
    tripMembersResult,
    shareLinksResult,
  ] =
    db instanceof Pool
      ? await Promise.all([
          readParticipants(),
          readExpenses(),
          readPayments(),
          readExchangeRates(),
          readMembers(),
          readShareLinks(),
        ])
      : ([
          await readParticipants(),
          await readExpenses(),
          await readPayments(),
          await readExchangeRates(),
          await readMembers(),
          await readShareLinks(),
        ] as const);

  const exchangeRates: Partial<Record<Currency, number>> = Object.fromEntries(
    exchangeRatesResult.rows.map((row) => [
      currencyFromDb(row.currency),
      Number(row.rate_to_base),
    ]),
  );
  if (exchangeRatesResult.rows.length > 0) {
    exchangeRates[currencyFromDb(tripRow.base_currency)] = 1;
  }

  return {
    ...rowToTrip(tripRow),
    ...(tripRow.current_user_role
      ? { currentUserRole: tripRow.current_user_role }
      : {}),
    ...(exchangeRatesResult.rows.length > 0 ? { exchangeRates } : {}),
    collaborators: tripMembersResult.rows.map((row) => ({
      createdAt: iso(row.created_at),
      username: row.username,
      name: row.name,
      role: row.role,
      userId: row.user_id,
    })),
    expenses: expensesResult.rows.map((row) => {
      const receiptId = row.snapshot.receipt?.id;
      return {
        ...row.snapshot.expense,
        createdAt: iso(row.snapshot.expense.createdAt),
        version: row.version,
        ...(receiptId
          ? {
              receiptId,
              receiptUrl: `/api/trips/${encodeURIComponent(tripId)}/expenses/${encodeURIComponent(row.id)}/receipt`,
            }
          : {}),
      };
    }),
    participants: participantsResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
    })),
    settlementPayments: settlementPaymentsResult.rows.map((row) => ({
      amountMinor: Number(row.amount_minor),
      createdAt: iso(row.created_at),
      currency: currencyFromDb(row.currency),
      fromId: row.from_id,
      id: row.id,
      note: row.note,
      paidAt: dateOnly(row.paid_at),
      toId: row.to_id,
    })),
    shareLinks: shareLinksResult.rows.map((row) => ({
      createdAt: iso(row.created_at),
      expiresAt: row.expires_at ? iso(row.expires_at) : null,
      id: row.id,
      revokedAt: row.revoked_at ? iso(row.revoked_at) : null,
    })),
  };
}
