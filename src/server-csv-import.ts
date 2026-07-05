import type express from "express";
import type { Pool as PgPool } from "pg";
import {
  asyncHandler,
  currentUser,
  loadTripForUser,
  makeId,
  nowIso,
  rejectArchivedTrip,
  requestBody,
  sendError,
  stringField,
  tripPayload,
  withTransaction,
} from "./server-support.js";
import { parseExpenseImportCsv } from "./shared/csv.js";
import {
  isExpenseCategory,
  normalizeExpenseTags,
} from "./shared/expense-metadata.js";
import { isCurrency, parseAmountToMinor } from "./shared/money.js";

export function registerCsvImportRoutes(
  app: express.Express,
  pool: PgPool,
  mustBeSignedIn: express.RequestHandler,
) {
  app.post(
    "/api/trips/:tripId/expenses/import",
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

      const csv = stringField(requestBody(req), "csv");
      if (!csv) {
        sendError(res, 400, "請選擇 CSV 檔案");
        return;
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
        res.status(400).json({ error: "CSV 匯入失敗", errors });
        return;
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
        res.status(400).json({ error: "CSV 匯入失敗", errors });
        return;
      }

      await withTransaction(pool, async (client) => {
        for (const expense of expenses) {
          if (!expense?.paidById) {
            continue;
          }
          const expenseId = makeId("expense");
          await client.query(
            `INSERT INTO expenses
               (id, trip_id, description, amount_minor, currency, category, tags, paid_by_id, expense_date, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              expenseId,
              trip.id,
              expense.description,
              expense.amountMinor,
              expense.currency,
              expense.category,
              expense.tags,
              expense.paidById,
              expense.expenseDate,
              nowIso(),
            ],
          );
          const shareByParticipant = new Map(
            expense.participantShares?.map((share) => [
              share.participantId,
              share.shareMinor,
            ]),
          );
          for (const [
            index,
            participantId,
          ] of expense.participantIds.entries()) {
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
        }
      });

      const updated = await loadTripForUser(pool, user.id, trip.id);
      if (!updated) {
        throw new Error("Trip disappeared after CSV import");
      }
      res.status(201).json(tripPayload(updated));
    }),
  );
}
