import path from "node:path";
import { fileURLToPath } from "node:url";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import type { Pool as PgPool } from "pg";
import { registerSettlementPaymentRoutes } from "./server-settlement-payments.js";
import {
  type ParticipantShare,
  participantSharesFromBody,
  participantSharesFromExisting,
} from "./server-splits.js";
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
  isDateOnly,
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
  requestBody,
  requireUser,
  type Session,
  sendError,
  setSessionCookie,
  stringField,
  todayDate,
  tripNameExistsForUser,
  tripPayload,
  type User,
  userFromRequest,
  verifyPassword,
  withTransaction,
} from "./server-support.js";
import {
  type Currency,
  currencies,
  currencyInfo,
  isCurrency,
  parseAmountToMinor,
  toMajor,
} from "./shared/money.js";
import type { Participant, Trip } from "./shared/settlement.js";

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
      if (!hasName && !hasBaseCurrency) {
        sendError(res, 400, "請提供要更新的旅行內容");
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

      await pool.query(
        "UPDATE trips SET name = $1, base_currency = $2 WHERE id = $3 AND owner_id = $4",
        [name, baseCurrencyValue, req.params.tripId, user.id],
      );

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

  app.post(
    "/api/trips/:tripId/participants/:participantId/merge",
    mustBeSignedIn,
    asyncHandler(async (req, res) => {
      const user = currentUser(res);
      const trip = await loadTripForUser(pool, user.id, req.params.tripId);
      if (!trip) {
        sendError(res, 404, "找不到旅行");
        return;
      }
      const sourceId = req.params.participantId;
      const targetId = stringField(requestBody(req), "targetParticipantId");
      if (!participantExists(trip, sourceId)) {
        sendError(res, 404, "找不到參與者");
        return;
      }
      if (!targetId || !participantExists(trip, targetId)) {
        sendError(res, 400, "目標參與者必須是旅行參與者");
        return;
      }
      if (sourceId === targetId) {
        sendError(res, 400, "不能合併同一位參與者");
        return;
      }

      await withTransaction(pool, async (client) => {
        await client.query(
          "UPDATE expenses SET paid_by_id = $3 WHERE trip_id = $1 AND paid_by_id = $2",
          [trip.id, sourceId, targetId],
        );
        await client.query(
          `UPDATE expense_participants target
           SET share_minor = CASE
             WHEN target.share_minor IS NULL OR source.share_minor IS NULL THEN NULL
             ELSE target.share_minor + source.share_minor
           END
           FROM expense_participants source
           WHERE target.trip_id = $1
             AND source.trip_id = $1
             AND source.participant_id = $2
             AND target.participant_id = $3
             AND target.expense_id = source.expense_id`,
          [trip.id, sourceId, targetId],
        );
        await client.query(
          `DELETE FROM expense_participants source
           USING expense_participants target
           WHERE source.trip_id = $1
             AND target.trip_id = $1
             AND source.participant_id = $2
             AND target.participant_id = $3
             AND source.expense_id = target.expense_id`,
          [trip.id, sourceId, targetId],
        );
        await client.query(
          `UPDATE expense_participants
           SET participant_id = $3
           WHERE trip_id = $1 AND participant_id = $2`,
          [trip.id, sourceId, targetId],
        );
        await client.query(
          `DELETE FROM settlement_payments
           WHERE trip_id = $1
             AND ((from_id = $2 AND to_id = $3) OR (from_id = $3 AND to_id = $2))`,
          [trip.id, sourceId, targetId],
        );
        await client.query(
          "UPDATE settlement_payments SET from_id = $3 WHERE trip_id = $1 AND from_id = $2",
          [trip.id, sourceId, targetId],
        );
        await client.query(
          "UPDATE settlement_payments SET to_id = $3 WHERE trip_id = $1 AND to_id = $2",
          [trip.id, sourceId, targetId],
        );
        await client.query(
          "DELETE FROM settlement_payments WHERE trip_id = $1 AND from_id = to_id",
          [trip.id],
        );
        await client.query(
          "DELETE FROM participants WHERE trip_id = $1 AND id = $2",
          [trip.id, sourceId],
        );
      });

      const updated = await loadTripForUser(pool, user.id, trip.id);
      if (!updated) {
        throw new Error("Trip disappeared after participant merge");
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
      const expenseDate = stringField(body, "expenseDate") ?? todayDate();
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
      if (!isDateOnly(expenseDate)) {
        sendError(res, 400, "請輸入有效支出日期");
        return;
      }

      const participantIds: string[] = [];
      for (const participantId of new Set(participantIdsInput)) {
        if (
          typeof participantId !== "string" ||
          !participantExists(trip, participantId)
        ) {
          sendError(res, 400, "分帳參與者必須是旅行參與者");
          return;
        }
        participantIds.push(participantId);
      }

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

      let participantShares: ParticipantShare[] | undefined;
      try {
        participantShares = participantSharesFromBody(
          body,
          participantIds,
          amountMinor,
          currencyValue,
        );
      } catch (error) {
        sendError(
          res,
          400,
          error instanceof Error ? error.message : "分帳格式錯誤",
        );
        return;
      }

      const shareByParticipant = new Map(
        participantShares?.map((share) => [
          share.participantId,
          share.shareMinor,
        ]),
      );
      const expenseId = makeId("expense");
      await withTransaction(pool, async (client) => {
        await client.query(
          `INSERT INTO expenses
             (id, trip_id, description, amount_minor, currency, paid_by_id, expense_date, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            expenseId,
            trip.id,
            description,
            amountMinor,
            currencyValue,
            paidById,
            expenseDate,
            nowIso(),
          ],
        );
        for (const [index, participantId] of participantIds.entries()) {
          await client.query(
            `INSERT INTO expense_participants
               (expense_id, trip_id, participant_id, position, share_minor)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              expenseId,
              trip.id,
              participantId,
              index,
              shareByParticipant.get(participantId) ?? null,
            ],
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
      const hasCurrency = "currency" in body;
      const hasPaidBy = "paidById" in body;
      const hasExpenseDate = "expenseDate" in body;
      const hasParticipantIds = "participantIds" in body;
      const hasSplitMode = "splitMode" in body;
      if (
        !hasDescription &&
        !hasAmount &&
        !hasCurrency &&
        !hasPaidBy &&
        !hasExpenseDate &&
        !hasParticipantIds &&
        !hasSplitMode
      ) {
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

      let currencyValue = expense.currency;
      if (hasCurrency) {
        if (!isCurrency(body.currency)) {
          sendError(res, 400, "不支援的貨幣");
          return;
        }
        currencyValue = body.currency;
      }

      let amountMinor = expense.amountMinor;
      if (hasAmount || currencyValue !== expense.currency) {
        try {
          amountMinor = parseAmountToMinor(
            hasAmount
              ? String(body.amount ?? "")
              : toMajor(expense.amountMinor, expense.currency).toFixed(
                  currencyInfo[expense.currency].minorUnits,
                ),
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
      }

      const paidById = hasPaidBy
        ? stringField(body, "paidById")
        : expense.paidById;
      if (!paidById || !participantExists(trip, paidById)) {
        sendError(res, 400, "付款人必須是參與者");
        return;
      }

      const expenseDate = hasExpenseDate
        ? stringField(body, "expenseDate")
        : expense.expenseDate;
      if (!expenseDate || !isDateOnly(expenseDate)) {
        sendError(res, 400, "請輸入有效支出日期");
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

      let participantShares: ParticipantShare[] | undefined;
      const hasExistingShares = (expense.participantShares?.length ?? 0) > 0;
      const shouldReplaceSplits =
        hasParticipantIds ||
        hasSplitMode ||
        ((hasAmount || hasCurrency) && hasExistingShares);
      if (shouldReplaceSplits) {
        try {
          participantShares =
            !hasSplitMode && hasExistingShares
              ? participantSharesFromExisting(
                  participantIds,
                  amountMinor,
                  expense.amountMinor,
                  expense.participantShares,
                )
              : participantSharesFromBody(
                  body,
                  participantIds,
                  amountMinor,
                  currencyValue,
                );
        } catch (error) {
          sendError(
            res,
            400,
            error instanceof Error ? error.message : "分帳格式錯誤",
          );
          return;
        }
      }
      const shareByParticipant = new Map(
        participantShares?.map((share) => [
          share.participantId,
          share.shareMinor,
        ]),
      );

      const updatedExpense = await withTransaction(pool, async (client) => {
        const result = await client.query(
          `UPDATE expenses
           SET description = $1, amount_minor = $2, currency = $3, paid_by_id = $4, expense_date = $5
           WHERE trip_id = $6 AND id = $7`,
          [
            description,
            amountMinor,
            currencyValue,
            paidById,
            expenseDate,
            trip.id,
            req.params.expenseId,
          ],
        );
        if (result.rowCount === 0 || !shouldReplaceSplits) {
          return result;
        }

        await client.query(
          "DELETE FROM expense_participants WHERE trip_id = $1 AND expense_id = $2",
          [trip.id, req.params.expenseId],
        );
        for (const [index, participantId] of participantIds.entries()) {
          await client.query(
            `INSERT INTO expense_participants
               (expense_id, trip_id, participant_id, position, share_minor)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              req.params.expenseId,
              trip.id,
              participantId,
              index,
              shareByParticipant.get(participantId) ?? null,
            ],
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

  registerSettlementPaymentRoutes(app, pool, mustBeSignedIn);

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
