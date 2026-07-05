import type express from "express";
import type { Pool as PgPool } from "pg";
import {
  type ParticipantShare,
  participantSharesFromBody,
  participantSharesFromExisting,
} from "./server-splits.js";
import {
  asyncHandler,
  currentUser,
  isDateOnly,
  loadTripForUser,
  makeId,
  nowIso,
  participantExists,
  rejectArchivedTrip,
  requestBody,
  sendError,
  stringField,
  todayDate,
  tripPayload,
  withTransaction,
} from "./server-support.js";
import {
  type ExpenseCategory,
  expenseCategories,
  isExpenseCategory,
  normalizeExpenseTags,
} from "./shared/expense-metadata.js";
import type { Currency } from "./shared/money.js";
import {
  currencyInfo,
  isCurrency,
  parseAmountToMinor,
  toMajor,
} from "./shared/money.js";

function expenseCategoryFromBody(value: unknown): ExpenseCategory {
  if (value == null || value === "") {
    return "其他";
  }
  if (!isExpenseCategory(value)) {
    throw new Error(`分類必須是：${expenseCategories.join("、")}`);
  }
  return value;
}

function expenseTagsFromBody(value: unknown): string[] {
  return normalizeExpenseTags(value);
}

export function registerExpenseRoutes(
  app: express.Express,
  pool: PgPool,
  mustBeSignedIn: express.RequestHandler,
) {
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
      if (rejectArchivedTrip(res, trip)) {
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

      let category: ExpenseCategory;
      let tags: string[];
      try {
        category = expenseCategoryFromBody(body.category);
        tags = expenseTagsFromBody(body.tags);
      } catch (error) {
        sendError(
          res,
          400,
          error instanceof Error ? error.message : "分類或標籤格式錯誤",
        );
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
             (id, trip_id, description, amount_minor, currency, category, tags, paid_by_id, expense_date, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            expenseId,
            trip.id,
            description,
            amountMinor,
            currencyValue,
            category,
            tags,
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
      if (rejectArchivedTrip(res, trip)) {
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
      const hasCategory = "category" in body;
      const hasTags = "tags" in body;
      if (
        !hasDescription &&
        !hasAmount &&
        !hasCurrency &&
        !hasPaidBy &&
        !hasExpenseDate &&
        !hasParticipantIds &&
        !hasSplitMode &&
        !hasCategory &&
        !hasTags
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

      let category: ExpenseCategory = expense.category ?? "其他";
      let tags = expense.tags ?? [];
      try {
        if (hasCategory) {
          category = expenseCategoryFromBody(body.category);
        }
        if (hasTags) {
          tags = expenseTagsFromBody(body.tags);
        }
      } catch (error) {
        sendError(
          res,
          400,
          error instanceof Error ? error.message : "分類或標籤格式錯誤",
        );
        return;
      }

      let currencyValue: Currency = expense.currency;
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
           SET description = $1, amount_minor = $2, currency = $3, category = $4, tags = $5, paid_by_id = $6, expense_date = $7
           WHERE trip_id = $8 AND id = $9`,
          [
            description,
            amountMinor,
            currencyValue,
            category,
            tags,
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
      if (rejectArchivedTrip(res, trip)) {
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
}
