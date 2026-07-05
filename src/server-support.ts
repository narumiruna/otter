import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type {
  Pool as PgPool,
  PoolClient,
  QueryResult,
  QueryResultRow,
} from "pg";
import pg from "pg";
import {
  type Currency,
  currencies,
  currencyInfo,
  isCurrency,
} from "./shared/money.js";
import {
  calculateBalances,
  calculateSettlements,
  type Trip,
} from "./shared/settlement.js";

const { Pool } = pg;

export type User = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

export type Session = {
  id: string;
  userId: string;
  expiresAt: string;
};

type Queryable = {
  query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<Row>>;
};

type Handler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void> | void;

type UserRow = {
  id: string;
  name: string;
  email: string;
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
};

type ParticipantRow = {
  id: string;
  name: string;
};

type ExpenseRow = {
  id: string;
  description: string;
  amount_minor: string | number;
  currency: string;
  paid_by_id: string;
  expense_date: Date | string;
  created_at: Date | string;
};

type ExpenseParticipantRow = {
  expense_id: string;
  participant_id: string;
  share_minor: string | number | null;
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

export const isProduction = process.env.NODE_ENV === "production";
export const devAdmin = {
  email: "admin@otter.local",
  name: "Alice",
  password: "password",
};
const sessionDays = 7;
const sessionMaxAgeSeconds = sessionDays * 24 * 60 * 60;
const passwordIterations = 210_000;

export function publicUser(user: User) {
  return {
    email: user.email,
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

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, passwordIterations, 32, "sha256")
    .toString("hex");
  return `pbkdf2:${passwordIterations}:${salt}:${hash}`;
}

export function verifyPassword(
  password: string,
  passwordHash: string,
): boolean {
  const [algorithm, iterationsText, salt, hash] = passwordHash.split(":");
  const iterations = Number(iterationsText);

  if (
    algorithm !== "pbkdf2" ||
    !Number.isSafeInteger(iterations) ||
    !salt ||
    !hash
  ) {
    return false;
  }

  const candidate = crypto
    .pbkdf2Sync(password, salt, iterations, 32, "sha256")
    .toString("hex");
  const hashBuffer = Buffer.from(hash, "hex");
  const candidateBuffer = Buffer.from(candidate, "hex");

  return (
    hashBuffer.length === candidateBuffer.length &&
    crypto.timingSafeEqual(hashBuffer, candidateBuffer)
  );
}

export function requestBody(req: Request): Record<string, unknown> {
  return req.body && typeof req.body === "object"
    ? (req.body as Record<string, unknown>)
    : {};
}

export function stringField(
  body: Record<string, unknown>,
  field: string,
): string | undefined {
  const value = body[field];
  return typeof value === "string" ? value.trim() : undefined;
}

export function sendError(res: Response, status: number, error: string) {
  res.status(status).json({ error });
}

export function getCookie(req: Request, name: string): string | undefined {
  const cookieHeader = req.headers.cookie;
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

export function setSessionCookie(res: Response, sessionId: string) {
  res.setHeader("Set-Cookie", sessionCookieHeader(sessionId));
}

export function clearSessionCookie(res: Response) {
  res.setHeader("Set-Cookie", clearSessionCookieHeader());
}

export function tripPayload(trip: Trip) {
  return {
    balances: calculateBalances(trip),
    currencies,
    currencyInfo,
    settlements: calculateSettlements(trip),
    trip,
  };
}

export function participantExists(trip: Trip, participantId: string): boolean {
  return trip.participants.some(
    (participant) => participant.id === participantId,
  );
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

export function asyncHandler(handler: Handler): Handler {
  return (req, res, next) => {
    void Promise.resolve(handler(req, res, next)).catch(next);
  };
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

export function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
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
    email: row.email,
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

export function currentUser(res: Response): User {
  return res.locals.user as User;
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
  pool: PgPool,
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
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

export async function findUserByEmail(
  db: Queryable,
  email: string,
): Promise<User | undefined> {
  const result = await db.query<UserRow>(
    `SELECT id, name, email, password_hash, created_at
     FROM users
     WHERE email = $1`,
    [email],
  );
  const row = result.rows[0];
  return row ? rowToUser(row) : undefined;
}

export async function ensureDevAdmin(db: Queryable) {
  if (isProduction) {
    return;
  }

  const result = await db.query<{ id: string }>(
    `INSERT INTO users (id, name, email, password_hash, created_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO UPDATE
     SET name = EXCLUDED.name,
         password_hash = EXCLUDED.password_hash
     RETURNING id`,
    [
      makeId("user"),
      devAdmin.name,
      normalizeEmail(devAdmin.email),
      hashPassword(devAdmin.password),
      nowIso(),
    ],
  );
  const userId = result.rows[0]?.id;
  if (!userId) {
    return;
  }

  await ensureDevTokyoTrip(db, userId);
  await ensureDevOsakaTrip(db, userId);
}

async function hasDevSampleTrip(
  db: Queryable,
  ownerId: string,
  tripId: string,
  name: string,
): Promise<boolean> {
  const result = await db.query(
    `SELECT 1
     FROM trips
     WHERE owner_id = $1
       AND (id = $2 OR name = $3)
     LIMIT 1`,
    [ownerId, tripId, name],
  );
  return result.rows.length > 0;
}

async function ensureDevTokyoTrip(db: Queryable, ownerId: string) {
  const tripId = "trip_dev_tokyo";
  if (await hasDevSampleTrip(db, ownerId, tripId, "東京五日遊")) {
    return;
  }

  await db.query(
    `INSERT INTO trips (id, owner_id, name, base_currency, created_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [tripId, ownerId, "東京五日遊", "TWD", "2026-06-25T00:00:00.000Z"],
  );

  await db.query(
    `INSERT INTO participants (id, trip_id, name, created_at)
     VALUES ($1, $2, $3, $4),
            ($5, $2, $6, $7),
            ($8, $2, $9, $10)`,
    [
      "participant_dev_alice",
      tripId,
      "Alice",
      "2026-06-25T00:00:00.000Z",
      "participant_dev_bob",
      "Bob",
      "2026-06-25T00:01:00.000Z",
      "participant_dev_chris",
      "Chris",
      "2026-06-25T00:02:00.000Z",
    ],
  );

  await db.query(
    `INSERT INTO expenses (id, trip_id, description, amount_minor, currency, paid_by_id, expense_date, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8),
            ($9, $2, $10, $11, $12, $13, $14, $15)`,
    [
      "expense_dev_hotel",
      tripId,
      "飯店住宿",
      128000,
      "TWD",
      "participant_dev_alice",
      "2026-06-25",
      "2026-06-25T00:00:00.000Z",
      "expense_dev_breakfast",
      "早餐",
      4200,
      "TWD",
      "participant_dev_bob",
      "2026-06-26",
      "2026-06-26T00:00:00.000Z",
    ],
  );

  await db.query(
    `INSERT INTO expense_participants (expense_id, trip_id, participant_id, position)
     VALUES ($1, $2, $3, $4),
            ($1, $2, $5, $6),
            ($1, $2, $7, $8),
            ($9, $2, $3, $4),
            ($9, $2, $5, $6)`,
    [
      "expense_dev_hotel",
      tripId,
      "participant_dev_alice",
      0,
      "participant_dev_bob",
      1,
      "participant_dev_chris",
      2,
      "expense_dev_breakfast",
    ],
  );
}

async function ensureDevOsakaTrip(db: Queryable, ownerId: string) {
  const tripId = "trip_dev_osaka";
  if (await hasDevSampleTrip(db, ownerId, tripId, "大阪週末")) {
    return;
  }

  await db.query(
    `INSERT INTO trips (id, owner_id, name, base_currency, created_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [tripId, ownerId, "大阪週末", "JPY", "2026-06-26T00:00:00.000Z"],
  );

  await db.query(
    `INSERT INTO participants (id, trip_id, name, created_at)
     VALUES ($1, $2, $3, $4)`,
    [
      "participant_dev_osaka_alice",
      tripId,
      "Alice",
      "2026-06-26T00:00:00.000Z",
    ],
  );
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

export async function userFromRequest(
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
    `SELECT users.id, users.name, users.email, users.password_hash, users.created_at
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.id = $1 AND sessions.expires_at > now()`,
    [sessionId],
  );
  const row = result.rows[0];
  return row ? rowToUser(row) : undefined;
}

export function requireUser(db: Queryable): Handler {
  return asyncHandler(async (req, res, next) => {
    const user = await userFromRequest(db, req);
    if (!user) {
      sendError(res, 401, "請先登入");
      return;
    }

    res.locals.user = user;
    next();
  });
}

export async function loadTripForUser(
  db: Queryable,
  userId: string,
  tripId: string,
): Promise<Trip | undefined> {
  const tripResult = await db.query<TripRow>(
    `SELECT id, owner_id, name, base_currency, archived_at, created_at
     FROM trips
     WHERE id = $1 AND owner_id = $2`,
    [tripId, userId],
  );
  const tripRow = tripResult.rows[0];
  if (!tripRow) {
    return undefined;
  }

  const [
    participantsResult,
    expensesResult,
    splitsResult,
    settlementPaymentsResult,
  ] = await Promise.all([
    db.query<ParticipantRow>(
      `SELECT id, name
       FROM participants
       WHERE trip_id = $1
       ORDER BY created_at, id`,
      [tripId],
    ),
    db.query<ExpenseRow>(
      `SELECT id, description, amount_minor, currency, paid_by_id, expense_date::text AS expense_date, created_at
       FROM expenses
       WHERE trip_id = $1
       ORDER BY created_at, id`,
      [tripId],
    ),
    db.query<ExpenseParticipantRow>(
      `SELECT expense_id, participant_id, share_minor
       FROM expense_participants
       WHERE trip_id = $1
       ORDER BY expense_id, position`,
      [tripId],
    ),
    db.query<SettlementPaymentRow>(
      `SELECT id, from_id, to_id, amount_minor, currency, paid_at::text AS paid_at, note, created_at
       FROM settlement_payments
       WHERE trip_id = $1
       ORDER BY paid_at, created_at, id`,
      [tripId],
    ),
  ]);

  const splitsByExpense = new Map<
    string,
    { participantId: string; shareMinor: number | null }[]
  >();
  for (const split of splitsResult.rows) {
    const splits = splitsByExpense.get(split.expense_id) ?? [];
    splits.push({
      participantId: split.participant_id,
      shareMinor:
        split.share_minor === null || split.share_minor === undefined
          ? null
          : Number(split.share_minor),
    });
    splitsByExpense.set(split.expense_id, splits);
  }

  return {
    ...rowToTrip(tripRow),
    expenses: expensesResult.rows.map((row) => {
      const splits = splitsByExpense.get(row.id) ?? [];
      const participantShares = splits
        .filter((split) => split.shareMinor !== null)
        .map((split) => ({
          participantId: split.participantId,
          shareMinor: split.shareMinor ?? 0,
        }));
      return {
        amountMinor: Number(row.amount_minor),
        createdAt: iso(row.created_at),
        currency: currencyFromDb(row.currency),
        description: row.description,
        expenseDate: dateOnly(row.expense_date),
        id: row.id,
        paidById: row.paid_by_id,
        participantIds: splits.map((split) => split.participantId),
        ...(participantShares.length > 0 ? { participantShares } : {}),
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
  };
}
