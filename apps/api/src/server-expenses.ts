import {
  type ExpenseCategory,
  expenseCategories,
  isExpenseCategory,
  normalizeExpenseTags,
} from "@narumitw/otter-core/expense-metadata";
import type { Currency } from "@narumitw/otter-core/money";
import {
  currencyInfo,
  isCurrency,
  parseAmountToMinor,
  toMajor,
} from "@narumitw/otter-core/money";
import type { Pool as PgPool } from "pg";
import {
  insertExpense,
  insertExpenseParticipants,
} from "./server-expense-store.js";
import type { OtterApp, OtterMiddleware } from "./server-http.js";
import { parseRequestBody } from "./server-http.js";
import {
  type ParticipantShare,
  participantSharesFromBody,
  participantSharesFromExisting,
} from "./server-splits.js";
import {
  archivedTripResponse,
  type BuildTripPayload,
  currentUser,
  isDateOnly,
  loadTripForUser,
  makeId,
  nowIso,
  participantExists,
  requestBody,
  sendError,
  stringField,
  todayDate,
  withTransaction,
} from "./server-support.js";

function expenseCategoryFromBody(value: unknown): ExpenseCategory {
  if (value == null || value === "") {
    return "其他";
  }
  if (!isExpenseCategory(value)) {
    throw new Error(`分類必須是：${expenseCategories.join("、")}`);
  }
  return value;
}

export function registerExpenseRoutes(
  app: OtterApp,
  pool: PgPool,
  mustBeSignedIn: OtterMiddleware,
  buildTripPayload: BuildTripPayload,
) {
  app.post(
    "/api/trips/:tripId/expenses",
    mustBeSignedIn,
    parseRequestBody,
    async (context) => {
      const user = currentUser(context);
      const trip = await loadTripForUser(
        pool,
        user.id,
        context.req.param("tripId"),
      );
      if (!trip) {
        return sendError(context, 404, "找不到旅行");
      }
      if (trip.archivedAt) {
        return archivedTripResponse(context);
      }

      const body = requestBody(context);
      const description = stringField(body, "description");
      const amountInput = body.amount;
      const currencyValue = body.currency;
      const paidById = stringField(body, "paidById");
      const expenseDate = stringField(body, "expenseDate") ?? todayDate();
      const participantIdsInput = body.participantIds;

      if (!description || description.length > 120) {
        return sendError(context, 400, "請輸入 1-120 字的支出描述");
      }
      if (!isCurrency(currencyValue)) {
        return sendError(context, 400, "不支援的貨幣");
      }
      if (!paidById || !participantExists(trip, paidById)) {
        return sendError(context, 400, "付款人必須是參與者");
      }
      if (!Array.isArray(participantIdsInput)) {
        return sendError(context, 400, "請選擇分帳參與者");
      }
      if (!isDateOnly(expenseDate)) {
        return sendError(context, 400, "請輸入有效支出日期");
      }

      let category: ExpenseCategory;
      let tags: string[];
      try {
        category = expenseCategoryFromBody(body.category);
        tags = normalizeExpenseTags(body.tags);
      } catch (error) {
        return sendError(
          context,
          400,
          error instanceof Error ? error.message : "分類或標籤格式錯誤",
        );
      }

      const participantIds: string[] = [];
      for (const participantId of new Set(participantIdsInput)) {
        if (
          typeof participantId !== "string" ||
          !participantExists(trip, participantId)
        ) {
          return sendError(context, 400, "分帳參與者必須是旅行參與者");
        }
        participantIds.push(participantId);
      }

      if (participantIds.length === 0) {
        return sendError(context, 400, "請至少選擇一位分帳參與者");
      }

      let amountMinor: number;
      try {
        amountMinor = parseAmountToMinor(
          String(amountInput ?? ""),
          currencyValue,
        );
      } catch (error) {
        return sendError(
          context,
          400,
          error instanceof Error ? error.message : "金額格式錯誤",
        );
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
        return sendError(
          context,
          400,
          error instanceof Error ? error.message : "分帳格式錯誤",
        );
      }

      const expenseId = makeId("expense");
      await withTransaction(pool, (client) =>
        insertExpense(client, trip.id, {
          id: expenseId,
          description,
          amountMinor,
          currency: currencyValue,
          category,
          tags,
          paidById,
          expenseDate,
          createdAt: nowIso(),
          participantIds,
          participantShares,
        }),
      );

      const updated = await loadTripForUser(pool, user.id, trip.id);
      if (!updated) {
        throw new Error("Trip disappeared after expense insert");
      }
      return context.json(await buildTripPayload(updated), 201);
    },
  );

  app.patch(
    "/api/trips/:tripId/expenses/:expenseId",
    mustBeSignedIn,
    parseRequestBody,
    async (context) => {
      const user = currentUser(context);
      const trip = await loadTripForUser(
        pool,
        user.id,
        context.req.param("tripId"),
      );
      if (!trip) {
        return sendError(context, 404, "找不到旅行");
      }
      if (trip.archivedAt) {
        return archivedTripResponse(context);
      }

      const expense = trip.expenses.find(
        (item) => item.id === context.req.param("expenseId"),
      );
      if (!expense) {
        return sendError(context, 404, "找不到支出");
      }

      const body = requestBody(context);
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
        return sendError(context, 400, "請提供要更新的支出內容");
      }

      const description = hasDescription
        ? stringField(body, "description")
        : expense.description;
      if (!description || description.length > 120) {
        return sendError(context, 400, "請輸入 1-120 字的支出描述");
      }

      let category: ExpenseCategory = expense.category ?? "其他";
      let tags = expense.tags ?? [];
      try {
        if (hasCategory) {
          category = expenseCategoryFromBody(body.category);
        }
        if (hasTags) {
          tags = normalizeExpenseTags(body.tags);
        }
      } catch (error) {
        return sendError(
          context,
          400,
          error instanceof Error ? error.message : "分類或標籤格式錯誤",
        );
      }

      let currencyValue: Currency = expense.currency;
      if (hasCurrency) {
        if (!isCurrency(body.currency)) {
          return sendError(context, 400, "不支援的貨幣");
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
          return sendError(
            context,
            400,
            error instanceof Error ? error.message : "金額格式錯誤",
          );
        }
      }

      const paidById = hasPaidBy
        ? stringField(body, "paidById")
        : expense.paidById;
      if (!paidById || !participantExists(trip, paidById)) {
        return sendError(context, 400, "付款人必須是參與者");
      }

      const expenseDate = hasExpenseDate
        ? stringField(body, "expenseDate")
        : expense.expenseDate;
      if (!expenseDate || !isDateOnly(expenseDate)) {
        return sendError(context, 400, "請輸入有效支出日期");
      }

      let participantIds = expense.participantIds;
      if (hasParticipantIds) {
        const participantIdsInput = body.participantIds;
        if (!Array.isArray(participantIdsInput)) {
          return sendError(context, 400, "請選擇分帳參與者");
        }

        const nextParticipantIds: string[] = [];
        for (const participantId of new Set(participantIdsInput)) {
          if (
            typeof participantId !== "string" ||
            !participantExists(trip, participantId)
          ) {
            return sendError(context, 400, "分帳參與者必須是旅行參與者");
          }
          nextParticipantIds.push(participantId);
        }
        if (nextParticipantIds.length === 0) {
          return sendError(context, 400, "請至少選擇一位分帳參與者");
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
          return sendError(
            context,
            400,
            error instanceof Error ? error.message : "分帳格式錯誤",
          );
        }
      }
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
            context.req.param("expenseId"),
          ],
        );
        if (result.rowCount === 0 || !shouldReplaceSplits) {
          return result;
        }

        await client.query(
          "DELETE FROM expense_participants WHERE trip_id = $1 AND expense_id = $2",
          [trip.id, context.req.param("expenseId")],
        );
        await insertExpenseParticipants(client, trip.id, {
          id: context.req.param("expenseId"),
          participantIds,
          participantShares,
        });
        return result;
      });
      if (updatedExpense.rowCount === 0) {
        return sendError(context, 404, "找不到支出");
      }

      const updated = await loadTripForUser(pool, user.id, trip.id);
      if (!updated) {
        throw new Error("Trip disappeared after expense update");
      }
      return context.json(await buildTripPayload(updated));
    },
  );

  app.delete(
    "/api/trips/:tripId/expenses/:expenseId",
    mustBeSignedIn,
    parseRequestBody,
    async (context) => {
      const user = currentUser(context);
      const trip = await loadTripForUser(
        pool,
        user.id,
        context.req.param("tripId"),
      );
      if (!trip) {
        return sendError(context, 404, "找不到旅行");
      }
      if (trip.archivedAt) {
        return archivedTripResponse(context);
      }

      const deleted = await pool.query(
        "DELETE FROM expenses WHERE trip_id = $1 AND id = $2",
        [trip.id, context.req.param("expenseId")],
      );
      if (deleted.rowCount === 0) {
        return sendError(context, 404, "找不到支出");
      }

      const updated = await loadTripForUser(pool, user.id, trip.id);
      if (!updated) {
        throw new Error("Trip disappeared after expense delete");
      }
      return context.json(await buildTripPayload(updated));
    },
  );
}
