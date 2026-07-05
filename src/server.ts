import path from "node:path";
import { fileURLToPath } from "node:url";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import type { Pool as PgPool } from "pg";
import { registerExpenseRoutes } from "./server-expenses.js";
import { registerParticipantMergeRoute } from "./server-participant-merge.js";
import { registerSettlementPaymentRoutes } from "./server-settlement-payments.js";
import {
  asyncHandler,
  clearSessionCookie,
  createPool,
  createSession,
  currencyFromDb,
  currentUser,
  devAdmin,
  ensureDevAdmin,
  findUserByEmail,
  getCookie,
  hashPassword,
  iso,
  isPgCode,
  isProduction,
  loadTripForUser,
  makeId,
  normalizeEmail,
  nowIso,
  participantExists,
  participantNameExists,
  publicUser,
  rejectArchivedTrip,
  requestBody,
  requireUser,
  type Session,
  sendError,
  setSessionCookie,
  stringField,
  tripNameExistsForUser,
  tripPayload,
  type User,
  userFromRequest,
  verifyPassword,
  withTransaction,
} from "./server-support.js";
import { type Currency, isCurrency } from "./shared/money.js";
import type { Participant, Trip } from "./shared/settlement.js";

type TripSummaryRow = {
  id: string;
  name: string;
  base_currency: string;
  archived_at: Date | string | null;
  created_at: Date | string;
  participant_count: string | number;
  expense_count: string | number;
};

function tripExchangeRatesFromBody(
  value: unknown,
  baseCurrency: Currency,
): [Currency, number][] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("匯率格式錯誤");
  }
  const rows: [Currency, number][] = [];
  for (const [currency, rawRate] of Object.entries(value)) {
    if (!isCurrency(currency)) {
      throw new Error("不支援的匯率貨幣");
    }
    if (currency === baseCurrency || String(rawRate ?? "").trim() === "") {
      continue;
    }
    const rate = Number(rawRate);
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error("匯率必須大於 0");
    }
    rows.push([currency, rate]);
  }
  return rows;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(pool: PgPool): express.Express {
  const app = express();
  const mustBeSignedIn = requireUser(pool);

  app.use(express.json({ limit: "1mb" }));

  app.get(
    "/api/me",
    asyncHandler(async (req, res) => {
      const user = await userFromRequest(pool, req);
      res.json({
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
                trips.archived_at,
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

      const trips = result.rows.map((row) => ({
        archivedAt: row.archived_at ? iso(row.archived_at) : null,
        baseCurrency: currencyFromDb(row.base_currency),
        createdAt: iso(row.created_at),
        expenseCount: Number(row.expense_count),
        id: row.id,
        name: row.name,
        participantCount: Number(row.participant_count),
      }));
      res.json({
        archivedTrips: trips.filter((trip) => trip.archivedAt),
        trips: trips.filter((trip) => !trip.archivedAt),
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
      if (baseCurrencyValue !== undefined && !isCurrency(baseCurrencyValue)) {
        sendError(res, 400, "不支援的基準貨幣");
        return;
      }
      const baseCurrency: Currency = baseCurrencyValue ?? "TWD";

      if (!name || name.length > 100) {
        sendError(res, 400, "請輸入 1-100 字的旅行名稱");
        return;
      }
      if (await tripNameExistsForUser(pool, user.id, name)) {
        sendError(res, 409, "旅行名稱已存在");
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
      const trip = await loadTripForUser(pool, user.id, req.params.tripId);
      if (!trip) {
        sendError(res, 404, "找不到旅行");
        return;
      }

      const body = requestBody(req);
      const hasName = "name" in body;
      const hasBaseCurrency = "baseCurrency" in body;
      const hasArchived = "archived" in body;
      const hasExchangeRates = "exchangeRates" in body;
      if (!hasName && !hasBaseCurrency && !hasArchived && !hasExchangeRates) {
        sendError(res, 400, "請提供要更新的旅行內容");
        return;
      }
      if (trip.archivedAt && (hasName || hasBaseCurrency || hasExchangeRates)) {
        rejectArchivedTrip(res, trip);
        return;
      }

      const name = hasName ? stringField(body, "name") : trip.name;
      if (!name || name.length > 100) {
        sendError(res, 400, "請輸入 1-100 字的旅行名稱");
        return;
      }
      if (await tripNameExistsForUser(pool, user.id, name, trip.id)) {
        sendError(res, 409, "旅行名稱已存在");
        return;
      }

      const baseCurrencyValue = hasBaseCurrency
        ? body.baseCurrency
        : trip.baseCurrency;
      if (!isCurrency(baseCurrencyValue)) {
        sendError(res, 400, "不支援的基準貨幣");
        return;
      }

      let archivedAt: string | null | undefined;
      if (hasArchived) {
        if (typeof body.archived !== "boolean") {
          sendError(res, 400, "封存狀態格式錯誤");
          return;
        }
        archivedAt = body.archived === true ? nowIso() : null;
      }

      let exchangeRates: [Currency, number][] = [];
      if (hasExchangeRates) {
        try {
          exchangeRates = tripExchangeRatesFromBody(
            body.exchangeRates,
            baseCurrencyValue,
          );
        } catch (error) {
          sendError(
            res,
            400,
            error instanceof Error ? error.message : "匯率格式錯誤",
          );
          return;
        }
      }

      const baseCurrencyChanged =
        hasBaseCurrency && baseCurrencyValue !== trip.baseCurrency;

      await withTransaction(pool, async (client) => {
        if (hasArchived) {
          await client.query(
            "UPDATE trips SET name = $1, base_currency = $2, archived_at = $3 WHERE id = $4 AND owner_id = $5",
            [name, baseCurrencyValue, archivedAt, req.params.tripId, user.id],
          );
        } else {
          await client.query(
            "UPDATE trips SET name = $1, base_currency = $2 WHERE id = $3 AND owner_id = $4",
            [name, baseCurrencyValue, req.params.tripId, user.id],
          );
        }

        if (!hasExchangeRates && !baseCurrencyChanged) {
          return;
        }
        await client.query(
          "DELETE FROM trip_exchange_rates WHERE trip_id = $1",
          [req.params.tripId],
        );
        for (const [currency, rate] of exchangeRates) {
          await client.query(
            `INSERT INTO trip_exchange_rates (trip_id, currency, rate_to_base)
             VALUES ($1, $2, $3)`,
            [req.params.tripId, currency, rate],
          );
        }
      });

      const updated = await loadTripForUser(pool, user.id, req.params.tripId);
      if (!updated) {
        throw new Error("Trip disappeared after rename");
      }
      res.json(tripPayload(updated));
    }),
  );

  app.delete(
    "/api/trips/:tripId",
    mustBeSignedIn,
    asyncHandler(async (req, res) => {
      const user = currentUser(res);
      const deleted = await withTransaction(pool, async (client) => {
        const lockedTrip = await client.query(
          "SELECT id FROM trips WHERE id = $1 AND owner_id = $2 FOR UPDATE",
          [req.params.tripId, user.id],
        );
        if (lockedTrip.rowCount === 0) {
          return lockedTrip;
        }

        await client.query(
          "DELETE FROM settlement_payments WHERE trip_id = $1",
          [req.params.tripId],
        );
        await client.query(
          "DELETE FROM expense_participants WHERE trip_id = $1",
          [req.params.tripId],
        );
        await client.query("DELETE FROM expenses WHERE trip_id = $1", [
          req.params.tripId,
        ]);
        await client.query("DELETE FROM participants WHERE trip_id = $1", [
          req.params.tripId,
        ]);
        return client.query("DELETE FROM trips WHERE id = $1", [
          req.params.tripId,
        ]);
      });
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
      if (rejectArchivedTrip(res, trip)) {
        return;
      }

      const name = stringField(requestBody(req), "name");
      if (!name || name.length > 80) {
        sendError(res, 400, "請輸入 1-80 字的參與者名稱");
        return;
      }
      if (participantNameExists(trip, name)) {
        sendError(res, 409, "參與者名稱已存在");
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
      if (rejectArchivedTrip(res, trip)) {
        return;
      }

      const name = stringField(requestBody(req), "name");
      if (!name || name.length > 80) {
        sendError(res, 400, "請輸入 1-80 字的參與者名稱");
        return;
      }
      if (!participantExists(trip, req.params.participantId)) {
        sendError(res, 404, "找不到參與者");
        return;
      }
      if (participantNameExists(trip, name, req.params.participantId)) {
        sendError(res, 409, "參與者名稱已存在");
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

  registerParticipantMergeRoute(app, pool, mustBeSignedIn);

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
      if (rejectArchivedTrip(res, trip)) {
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
      if (
        (trip.settlementPayments ?? []).some(
          (payment) =>
            payment.fromId === participantId || payment.toId === participantId,
        )
      ) {
        sendError(res, 409, "參與者已有付款紀錄，不能刪除");
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

  registerExpenseRoutes(app, pool, mustBeSignedIn);
  registerSettlementPaymentRoutes(app, pool, mustBeSignedIn);

  app.use("/api", (_req, res) => {
    sendError(res, 404, "找不到 API");
  });

  app.use(
    (error: unknown, _req: Request, res: Response, next: NextFunction) => {
      if (res.headersSent) {
        next(error);
        return;
      }
      if (error && typeof error === "object") {
        const parseError = error as { status?: unknown; type?: unknown };
        if (
          parseError.status === 400 &&
          parseError.type === "entity.parse.failed"
        ) {
          sendError(res, 400, "JSON 格式錯誤");
          return;
        }
        if (
          parseError.status === 413 &&
          parseError.type === "entity.too.large"
        ) {
          sendError(res, 413, "請求內容太大");
          return;
        }
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

  const port = Number(process.env.PORT ?? 3420);
  app.listen(port, "0.0.0.0", () => {
    console.log(`otter listening on http://0.0.0.0:${port}`);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  void start();
}
