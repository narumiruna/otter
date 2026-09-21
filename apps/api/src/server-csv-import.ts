import { parseExpenseImportCsv } from "@narumitw/otter-core/csv";
import {
  isExpenseCategory,
  normalizeExpenseTags,
} from "@narumitw/otter-core/expense-metadata";
import { isCurrency, parseAmountToMinor } from "@narumitw/otter-core/money";
import type { Pool as PgPool } from "pg";
import { recordExpenseChanges } from "./server-expense-history.js";
import { insertExpense } from "./server-expense-store.js";
import type { OtterApp, OtterMiddleware } from "./server-http.js";
import { parseRequestBody } from "./server-http.js";
import {
  archivedTripResponse,
  type BuildTripPayload,
  currentUser,
  loadTripForUser,
  makeId,
  nowIso,
  requestBody,
  sendError,
  stringField,
  withTransaction,
} from "./server-support.js";
import { tripMutation } from "./server-trip-mutation.js";

export function registerCsvImportRoutes(
  app: OtterApp,
  pool: PgPool,
  mustBeSignedIn: OtterMiddleware,
  buildTripPayload: BuildTripPayload,
) {
  app.post(
    "/api/trips/:tripId/expenses/import",
    mustBeSignedIn,
    parseRequestBody,
    tripMutation(pool, async (context, pool, before) => {
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

      const csv = stringField(requestBody(context), "csv");
      if (!csv) {
        return sendError(context, 400, "請選擇 CSV 檔案");
      }

      const participantByName = new Map(
        trip.participants.map((participant) => [
          participant.name.trim().toLocaleLowerCase(),
          participant.id,
        ]),
      );
      const parsed = parseExpenseImportCsv(
        csv,
        trip.participants.map((participant) => participant.name),
      );
      const errors = parsed.errors.map(
        (error) => `第 ${error.row} 列：${error.message}`,
      );
      if (errors.length > 0) {
        return context.json({ error: "CSV 匯入失敗", errors }, 400);
      }
      const expenses = parsed.rows.map((row) => {
        if (!isCurrency(row.currency)) {
          return null;
        }
        const currency = row.currency;
        const category = row.category || "其他";
        if (!isExpenseCategory(category)) {
          errors.push(`第 ${row.rowNumber} 列：分類不支援`);
        }
        let tags: string[] = [];
        try {
          tags = normalizeExpenseTags(row.tags.replaceAll("|", ","));
        } catch (error) {
          errors.push(
            `第 ${row.rowNumber} 列：${error instanceof Error ? error.message : "標籤格式錯誤"}`,
          );
        }
        const paidById = participantByName.get(
          row.paidBy.trim().toLocaleLowerCase(),
        );
        const participantIds = [
          ...new Set(
            row.splitParticipants
              .map((name) => participantByName.get(name.toLocaleLowerCase()))
              .filter((id): id is string => !!id),
          ),
        ];
        const participantShares = row.splitShares?.map((share) => ({
          participantId:
            participantByName.get(share.name.toLocaleLowerCase()) ?? "",
          shareMinor: parseAmountToMinor(share.amount, currency),
        }));
        return {
          amountMinor: parseAmountToMinor(row.amount, currency),
          category,
          currency,
          description: row.description,
          expenseDate: row.date,
          paidById,
          participantIds,
          participantShares,
          tags,
        };
      });
      if (errors.length > 0 || expenses.some((expense) => !expense?.paidById)) {
        return context.json({ error: "CSV 匯入失敗", errors }, 400);
      }

      await withTransaction(pool, async (client) => {
        for (const expense of expenses) {
          if (!expense?.paidById) {
            continue;
          }
          await insertExpense(client, trip.id, {
            ...expense,
            paidById: expense.paidById,
            id: makeId("expense"),
            createdAt: nowIso(),
          });
        }
      });

      await recordExpenseChanges(pool, trip.id, before, user, "csv_import");
      const updated = await loadTripForUser(pool, user.id, trip.id);
      if (!updated) {
        throw new Error("Trip disappeared after CSV import");
      }
      return async () => context.json(await buildTripPayload(updated), 201);
    }),
  );
}
