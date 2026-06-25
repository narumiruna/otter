import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
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
  parseAmountToMinor,
} from "./shared/money.js";
import {
  calculateBalances,
  calculateSettlements,
  type Participant,
  type Trip,
} from "./shared/settlement.js";

const { Pool } = pg;

type User = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

type Session = {
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
  created_at: Date | string;
};

type ExpenseParticipantRow = {
  expense_id: string;
  participant_id: string;
};

type TripSummaryRow = {
  id: string;
  name: string;
  base_currency: string;
  created_at: Date | string;
  participant_count: string | number;
  expense_count: string | number;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === "production";
const devAdmin = {
  email: "admin@otter.local",
  name: "Admin",
  password: "password",
};
const sessionDays = 7;
const sessionMaxAgeSeconds = sessionDays * 24 * 60 * 60;
const passwordIterations = 210_000;

function publicUser(user: User) {
  return {
    email: user.email,
    id: user.id,
    name: user.name,
  };
}

function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, passwordIterations, 32, "sha256")
    .toString("hex");
  return `pbkdf2:${passwordIterations}:${salt}:${hash}`;
}

function verifyPassword(password: string, passwordHash: string): boolean {
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

function requestBody(req: Request): Record<string, unknown> {
  return req.body && typeof req.body === "object"
    ? (req.body as Record<string, unknown>)
    : {};
}

function stringField(
  body: Record<string, unknown>,
  field: string,
): string | undefined {
  const value = body[field];
  return typeof value === "string" ? value.trim() : undefined;
}

function sendError(res: Response, status: number, error: string) {
  res.status(status).json({ error });
}

function getCookie(req: Request, name: string): string | undefined {
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

function setSessionCookie(res: Response, sessionId: string) {
  const secure = process.env.COOKIE_SECURE === "true" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `otter_session=${encodeURIComponent(sessionId)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${sessionMaxAgeSeconds}${secure}`,
  );
}

function clearSessionCookie(res: Response) {
  res.setHeader(
    "Set-Cookie",
    "otter_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0",
  );
}

function tripPayload(trip: Trip) {
  return {
    balances: calculateBalances(trip),
    currencies,
    currencyInfo,
    settlements: calculateSettlements(trip),
    trip,
  };
}

function participantExists(trip: Trip, participantId: string): boolean {
  return trip.participants.some(
    (participant) => participant.id === participantId,
  );
}

function asyncHandler(handler: Handler): Handler {
  return (req, res, next) => {
    void Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function iso(value: Date | string): string {
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

function currencyFromDb(value: string): Currency {
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

function isPgCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

function currentUser(res: Response): User {
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

async function withTransaction<T>(
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

async function findUserByEmail(
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

async function ensureDevAdmin(db: Queryable) {
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

async function createSession(db: Queryable, userId: string): Promise<Session> {
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

async function userFromRequest(
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

function requireUser(db: Queryable): Handler {
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

async function loadTripForUser(
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
      `SELECT id, description, amount_minor, currency, paid_by_id, created_at
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

export function createApp(pool: PgPool): express.Express {
  const app = express();
  const mustBeSignedIn = requireUser(pool);

  app.use(express.json({ limit: "1mb" }));

  app.get(
    "/api/me",
    asyncHandler(async (req, res) => {
      const user = await userFromRequest(pool, req);
      res.json({
        currencies,
        currencyInfo,
        devAdmin: isProduction
          ? null
          : { email: devAdmin.email, password: devAdmin.password },
        user: user ? publicUser(user) : null,
      });
    }),
  );

  app.post(
    "/api/auth/register",
    asyncHandler(async (req, res) => {
      const body = requestBody(req);
      const name = stringField(body, "name");
      const email = stringField(body, "email");
      const password = stringField(body, "password");

      if (!name || name.length > 80) {
        sendError(res, 400, "請輸入 1-80 字的名稱");
        return;
      }
      if (!email?.includes("@")) {
        sendError(res, 400, "請輸入有效 email");
        return;
      }
      if (!password || password.length < 8) {
        sendError(res, 400, "密碼至少需要 8 個字");
        return;
      }

      const normalizedEmail = normalizeEmail(email);
      if (await findUserByEmail(pool, normalizedEmail)) {
        sendError(res, 409, "這個 email 已經註冊");
        return;
      }

      const user: User = {
        createdAt: nowIso(),
        email: normalizedEmail,
        id: makeId("user"),
        name,
        passwordHash: hashPassword(password),
      };

      let session: Session;
      try {
        session = await withTransaction(pool, async (client) => {
          await client.query(
            `INSERT INTO users (id, name, email, password_hash, created_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [user.id, user.name, user.email, user.passwordHash, user.createdAt],
          );
          return createSession(client, user.id);
        });
      } catch (error) {
        if (isPgCode(error, "23505")) {
          sendError(res, 409, "這個 email 已經註冊");
          return;
        }
        throw error;
      }

      setSessionCookie(res, session.id);
      res.status(201).json({ user: publicUser(user) });
    }),
  );

  app.post(
    "/api/auth/login",
    asyncHandler(async (req, res) => {
      const body = requestBody(req);
      const email = stringField(body, "email");
      const password = stringField(body, "password");

      if (!email || !password) {
        sendError(res, 400, "請輸入 email 和密碼");
        return;
      }

      const user = await findUserByEmail(pool, normalizeEmail(email));
      if (!user || !verifyPassword(password, user.passwordHash)) {
        sendError(res, 401, "email 或密碼錯誤");
        return;
      }

      const session = await createSession(pool, user.id);
      setSessionCookie(res, session.id);
      res.json({ user: publicUser(user) });
    }),
  );

  app.post(
    "/api/auth/logout",
    asyncHandler(async (req, res) => {
      const sessionId = getCookie(req, "otter_session");
      if (sessionId) {
        await pool.query("DELETE FROM sessions WHERE id = $1", [sessionId]);
      }
      clearSessionCookie(res);
      res.json({ ok: true });
    }),
  );

  app.get(
    "/api/trips",
    mustBeSignedIn,
    asyncHandler(async (_req, res) => {
      const user = currentUser(res);
      const result = await pool.query<TripSummaryRow>(
        `SELECT trips.id,
                trips.name,
                trips.base_currency,
                trips.created_at,
                count(DISTINCT participants.id) AS participant_count,
                count(DISTINCT expenses.id) AS expense_count
         FROM trips
         LEFT JOIN participants ON participants.trip_id = trips.id
         LEFT JOIN expenses ON expenses.trip_id = trips.id
         WHERE trips.owner_id = $1
         GROUP BY trips.id
         ORDER BY trips.created_at, trips.id`,
        [user.id],
      );

      res.json({
        trips: result.rows.map((row) => ({
          baseCurrency: currencyFromDb(row.base_currency),
          createdAt: iso(row.created_at),
          expenseCount: Number(row.expense_count),
          id: row.id,
          name: row.name,
          participantCount: Number(row.participant_count),
        })),
      });
    }),
  );

  app.post(
    "/api/trips",
    mustBeSignedIn,
    asyncHandler(async (req, res) => {
      const user = currentUser(res);
      const body = requestBody(req);
      const name = stringField(body, "name");
      const baseCurrencyValue = body.baseCurrency;
      const baseCurrency: Currency = isCurrency(baseCurrencyValue)
        ? baseCurrencyValue
        : "TWD";

      if (!name || name.length > 100) {
        sendError(res, 400, "請輸入 1-100 字的旅行名稱");
        return;
      }

      const createdAt = nowIso();
      const ownerParticipant: Participant = {
        id: makeId("participant"),
        name: user.name,
      };
      const trip: Trip = {
        baseCurrency,
        createdAt,
        expenses: [],
        id: makeId("trip"),
        name,
        ownerId: user.id,
        participants: [ownerParticipant],
      };

      await withTransaction(pool, async (client) => {
        await client.query(
          `INSERT INTO trips (id, owner_id, name, base_currency, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [trip.id, trip.ownerId, trip.name, trip.baseCurrency, trip.createdAt],
        );
        await client.query(
          `INSERT INTO participants (id, trip_id, name, created_at)
           VALUES ($1, $2, $3, $4)`,
          [ownerParticipant.id, trip.id, ownerParticipant.name, createdAt],
        );
      });

      res.status(201).json(tripPayload(trip));
    }),
  );

  app.get(
    "/api/trips/:tripId",
    mustBeSignedIn,
    asyncHandler(async (req, res) => {
      const trip = await loadTripForUser(
        pool,
        currentUser(res).id,
        req.params.tripId,
      );
      if (!trip) {
        sendError(res, 404, "找不到旅行");
        return;
      }

      res.json(tripPayload(trip));
    }),
  );

  app.patch(
    "/api/trips/:tripId",
    mustBeSignedIn,
    asyncHandler(async (req, res) => {
      const user = currentUser(res);
      const name = stringField(requestBody(req), "name");
      if (!name || name.length > 100) {
        sendError(res, 400, "請輸入 1-100 字的旅行名稱");
        return;
      }

      const renamed = await pool.query(
        "UPDATE trips SET name = $1 WHERE id = $2 AND owner_id = $3",
        [name, req.params.tripId, user.id],
      );
      if (renamed.rowCount === 0) {
        sendError(res, 404, "找不到旅行");
        return;
      }

      const trip = await loadTripForUser(pool, user.id, req.params.tripId);
      if (!trip) {
        throw new Error("Trip disappeared after rename");
      }
      res.json(tripPayload(trip));
    }),
  );

  app.delete(
    "/api/trips/:tripId",
    mustBeSignedIn,
    asyncHandler(async (req, res) => {
      const user = currentUser(res);
      const deleted = await pool.query(
        "DELETE FROM trips WHERE id = $1 AND owner_id = $2",
        [req.params.tripId, user.id],
      );
      if (deleted.rowCount === 0) {
        sendError(res, 404, "找不到旅行");
        return;
      }

      res.json({ ok: true });
    }),
  );

  app.post(
    "/api/trips/:tripId/participants",
    mustBeSignedIn,
    asyncHandler(async (req, res) => {
      const user = currentUser(res);
      const trip = await loadTripForUser(pool, user.id, req.params.tripId);
      if (!trip) {
        sendError(res, 404, "找不到旅行");
        return;
      }

      const name = stringField(requestBody(req), "name");
      if (!name || name.length > 80) {
        sendError(res, 400, "請輸入 1-80 字的參與者名稱");
        return;
      }

      await pool.query(
        `INSERT INTO participants (id, trip_id, name, created_at)
         VALUES ($1, $2, $3, $4)`,
        [makeId("participant"), trip.id, name, nowIso()],
      );
      const updated = await loadTripForUser(pool, user.id, trip.id);
      if (!updated) {
        throw new Error("Trip disappeared after participant insert");
      }
      res.status(201).json(tripPayload(updated));
    }),
  );

  app.patch(
    "/api/trips/:tripId/participants/:participantId",
    mustBeSignedIn,
    asyncHandler(async (req, res) => {
      const user = currentUser(res);
      const trip = await loadTripForUser(pool, user.id, req.params.tripId);
      if (!trip) {
        sendError(res, 404, "找不到旅行");
        return;
      }

      const name = stringField(requestBody(req), "name");
      if (!name || name.length > 80) {
        sendError(res, 400, "請輸入 1-80 字的參與者名稱");
        return;
      }

      const renamed = await pool.query(
        "UPDATE participants SET name = $1 WHERE trip_id = $2 AND id = $3",
        [name, trip.id, req.params.participantId],
      );
      if (renamed.rowCount === 0) {
        sendError(res, 404, "找不到參與者");
        return;
      }

      const updated = await loadTripForUser(pool, user.id, trip.id);
      if (!updated) {
        throw new Error("Trip disappeared after participant rename");
      }
      res.json(tripPayload(updated));
    }),
  );

  app.delete(
    "/api/trips/:tripId/participants/:participantId",
    mustBeSignedIn,
    asyncHandler(async (req, res) => {
      const user = currentUser(res);
      const trip = await loadTripForUser(pool, user.id, req.params.tripId);
      if (!trip) {
        sendError(res, 404, "找不到旅行");
        return;
      }

      const participantId = req.params.participantId;
      if (!participantExists(trip, participantId)) {
        sendError(res, 404, "找不到參與者");
        return;
      }
      if (trip.participants.length <= 1) {
        sendError(res, 400, "至少需要一位參與者");
        return;
      }
      if (
        trip.expenses.some(
          (expense) =>
            expense.paidById === participantId ||
            expense.participantIds.includes(participantId),
        )
      ) {
        sendError(res, 409, "參與者已有支出，不能刪除");
        return;
      }

      await pool.query(
        "DELETE FROM participants WHERE trip_id = $1 AND id = $2",
        [trip.id, participantId],
      );
      const updated = await loadTripForUser(pool, user.id, trip.id);
      if (!updated) {
        throw new Error("Trip disappeared after participant delete");
      }
      res.json(tripPayload(updated));
    }),
  );

  app.post(
    "/api/trips/:tripId/expenses",
    mustBeSignedIn,
    asyncHandler(async (req, res) => {
      const user = currentUser(res);
      const trip = await loadTripForUser(pool, user.id, req.params.tripId);
      if (!trip) {
        sendError(res, 404, "找不到旅行");
        return;
      }

      const body = requestBody(req);
      const description = stringField(body, "description");
      const amountInput = body.amount;
      const currencyValue = body.currency;
      const paidById = stringField(body, "paidById");
      const participantIdsInput = body.participantIds;

      if (!description || description.length > 120) {
        sendError(res, 400, "請輸入 1-120 字的支出描述");
        return;
      }
      if (!isCurrency(currencyValue)) {
        sendError(res, 400, "不支援的貨幣");
        return;
      }
      if (!paidById || !participantExists(trip, paidById)) {
        sendError(res, 400, "付款人必須是參與者");
        return;
      }
      if (!Array.isArray(participantIdsInput)) {
        sendError(res, 400, "請選擇分帳參與者");
        return;
      }

      const participantIds = [...new Set(participantIdsInput)]
        .filter((id): id is string => typeof id === "string")
        .filter((id) => participantExists(trip, id));

      if (participantIds.length === 0) {
        sendError(res, 400, "請至少選擇一位分帳參與者");
        return;
      }

      let amountMinor: number;
      try {
        amountMinor = parseAmountToMinor(
          String(amountInput ?? ""),
          currencyValue,
        );
      } catch (error) {
        sendError(
          res,
          400,
          error instanceof Error ? error.message : "金額格式錯誤",
        );
        return;
      }

      const expenseId = makeId("expense");
      await withTransaction(pool, async (client) => {
        await client.query(
          `INSERT INTO expenses
             (id, trip_id, description, amount_minor, currency, paid_by_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            expenseId,
            trip.id,
            description,
            amountMinor,
            currencyValue,
            paidById,
            nowIso(),
          ],
        );
        for (const [index, participantId] of participantIds.entries()) {
          await client.query(
            `INSERT INTO expense_participants
               (expense_id, trip_id, participant_id, position)
             VALUES ($1, $2, $3, $4)`,
            [expenseId, trip.id, participantId, index],
          );
        }
      });

      const updated = await loadTripForUser(pool, user.id, trip.id);
      if (!updated) {
        throw new Error("Trip disappeared after expense insert");
      }
      res.status(201).json(tripPayload(updated));
    }),
  );

  app.patch(
    "/api/trips/:tripId/expenses/:expenseId",
    mustBeSignedIn,
    asyncHandler(async (req, res) => {
      const user = currentUser(res);
      const trip = await loadTripForUser(pool, user.id, req.params.tripId);
      if (!trip) {
        sendError(res, 404, "找不到旅行");
        return;
      }

      const expense = trip.expenses.find(
        (item) => item.id === req.params.expenseId,
      );
      if (!expense) {
        sendError(res, 404, "找不到支出");
        return;
      }

      const body = requestBody(req);
      const hasDescription = "description" in body;
      const hasAmount = "amount" in body;
      const hasPaidBy = "paidById" in body;
      const hasParticipantIds = "participantIds" in body;
      if (!hasDescription && !hasAmount && !hasPaidBy && !hasParticipantIds) {
        sendError(res, 400, "請提供要更新的支出內容");
        return;
      }

      const description = hasDescription
        ? stringField(body, "description")
        : expense.description;
      if (!description || description.length > 120) {
        sendError(res, 400, "請輸入 1-120 字的支出描述");
        return;
      }

      let amountMinor = expense.amountMinor;
      if (hasAmount) {
        try {
          amountMinor = parseAmountToMinor(
            String(body.amount ?? ""),
            expense.currency,
          );
        } catch (error) {
          sendError(
            res,
            400,
            error instanceof Error ? error.message : "金額格式錯誤",
          );
          return;
        }
      }

      const paidById = hasPaidBy
        ? stringField(body, "paidById")
        : expense.paidById;
      if (!paidById || !participantExists(trip, paidById)) {
        sendError(res, 400, "付款人必須是參與者");
        return;
      }

      let participantIds = expense.participantIds;
      if (hasParticipantIds) {
        const participantIdsInput = body.participantIds;
        if (!Array.isArray(participantIdsInput)) {
          sendError(res, 400, "請選擇分帳參與者");
          return;
        }

        const nextParticipantIds: string[] = [];
        for (const participantId of new Set(participantIdsInput)) {
          if (
            typeof participantId !== "string" ||
            !participantExists(trip, participantId)
          ) {
            sendError(res, 400, "分帳參與者必須是旅行參與者");
            return;
          }
          nextParticipantIds.push(participantId);
        }
        if (nextParticipantIds.length === 0) {
          sendError(res, 400, "請至少選擇一位分帳參與者");
          return;
        }
        participantIds = nextParticipantIds;
      }

      const updatedExpense = await withTransaction(pool, async (client) => {
        const result = await client.query(
          `UPDATE expenses
           SET description = $1, amount_minor = $2, paid_by_id = $3
           WHERE trip_id = $4 AND id = $5`,
          [description, amountMinor, paidById, trip.id, req.params.expenseId],
        );
        if (result.rowCount === 0 || !hasParticipantIds) {
          return result;
        }

        await client.query(
          "DELETE FROM expense_participants WHERE trip_id = $1 AND expense_id = $2",
          [trip.id, req.params.expenseId],
        );
        for (const [index, participantId] of participantIds.entries()) {
          await client.query(
            `INSERT INTO expense_participants
               (expense_id, trip_id, participant_id, position)
             VALUES ($1, $2, $3, $4)`,
            [req.params.expenseId, trip.id, participantId, index],
          );
        }
        return result;
      });
      if (updatedExpense.rowCount === 0) {
        sendError(res, 404, "找不到支出");
        return;
      }

      const updated = await loadTripForUser(pool, user.id, trip.id);
      if (!updated) {
        throw new Error("Trip disappeared after expense update");
      }
      res.json(tripPayload(updated));
    }),
  );

  app.delete(
    "/api/trips/:tripId/expenses/:expenseId",
    mustBeSignedIn,
    asyncHandler(async (req, res) => {
      const user = currentUser(res);
      const trip = await loadTripForUser(pool, user.id, req.params.tripId);
      if (!trip) {
        sendError(res, 404, "找不到旅行");
        return;
      }

      const deleted = await pool.query(
        "DELETE FROM expenses WHERE trip_id = $1 AND id = $2",
        [trip.id, req.params.expenseId],
      );
      if (deleted.rowCount === 0) {
        sendError(res, 404, "找不到支出");
        return;
      }

      const updated = await loadTripForUser(pool, user.id, trip.id);
      if (!updated) {
        throw new Error("Trip disappeared after expense delete");
      }
      res.json(tripPayload(updated));
    }),
  );

  app.use("/api", (_req, res) => {
    sendError(res, 404, "找不到 API");
  });

  app.use(
    (error: unknown, _req: Request, res: Response, next: NextFunction) => {
      if (res.headersSent) {
        next(error);
        return;
      }
      console.error(error);
      sendError(res, 500, "伺服器錯誤");
    },
  );

  return app;
}

async function start() {
  const pool = createPool();
  const app = createApp(pool);

  await ensureDevAdmin(pool);

  if (isProduction) {
    const clientDir = path.resolve(__dirname, "../client");
    app.use(express.static(clientDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(clientDir, "index.html"));
    });
  } else {
    const { createServer } = await import("vite");
    const vite = await createServer({
      appType: "spa",
      server: { middlewareMode: true },
    });
    app.use(vite.middlewares);
  }

  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, "0.0.0.0", () => {
    console.log(`otter listening on http://0.0.0.0:${port}`);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  void start();
}
