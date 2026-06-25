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
};

export const isProduction = process.env.NODE_ENV === "production";
export const devAdmin = {
  email: "admin@otter.local",
  name: "Admin",
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
      return decodeURIComponent(rawValue.join("="));
    }
  }

  return undefined;
}

export function setSessionCookie(res: Response, sessionId: string) {
  const secure = process.env.COOKIE_SECURE === "true" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `otter_session=${encodeURIComponent(sessionId)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${sessionMaxAgeSeconds}${secure}`,
  );
}

export function clearSessionCookie(res: Response) {
  res.setHeader(
    "Set-Cookie",
    "otter_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0",
  );
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

function rowToTrip(row: TripRow): Omit<Trip, "expenses" | "participants"> {
  return {
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

  await db.query(
    `INSERT INTO users (id, name, email, password_hash, created_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO UPDATE
     SET name = EXCLUDED.name,
         password_hash = EXCLUDED.password_hash`,
    [
      makeId("user"),
      devAdmin.name,
      normalizeEmail(devAdmin.email),
      hashPassword(devAdmin.password),
      nowIso(),
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
    `SELECT id, owner_id, name, base_currency, created_at
     FROM trips
     WHERE id = $1 AND owner_id = $2`,
    [tripId, userId],
  );
  const tripRow = tripResult.rows[0];
  if (!tripRow) {
    return undefined;
  }

  const [participantsResult, expensesResult, splitsResult] = await Promise.all([
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
      `SELECT expense_id, participant_id
       FROM expense_participants
       WHERE trip_id = $1
       ORDER BY expense_id, position`,
      [tripId],
    ),
  ]);

  const splitsByExpense = new Map<string, string[]>();
  for (const split of splitsResult.rows) {
    const participantIds = splitsByExpense.get(split.expense_id) ?? [];
    participantIds.push(split.participant_id);
    splitsByExpense.set(split.expense_id, participantIds);
  }

  return {
    ...rowToTrip(tripRow),
    expenses: expensesResult.rows.map((row) => ({
      amountMinor: Number(row.amount_minor),
      createdAt: iso(row.created_at),
      currency: currencyFromDb(row.currency),
      description: row.description,
      expenseDate: dateOnly(row.expense_date),
      id: row.id,
      paidById: row.paid_by_id,
      participantIds: splitsByExpense.get(row.id) ?? [],
    })),
    participants: participantsResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
    })),
  };
}
