import {
  changedExpenseFields,
  type ExpenseRevision,
  isExpenseSnapshot,
} from "@narumitw/otter-contracts";
import type { Pool } from "pg";
import {
  recordExpenseChanges,
  requireExpenseVersion,
} from "./server-expense-history.js";
import {
  insertExpense,
  insertExpenseParticipants,
} from "./server-expense-store.js";
import {
  type OtterApp,
  type OtterMiddleware,
  parseRequestBody,
} from "./server-http.js";
import {
  archivedTripResponse,
  type BuildTripPayload,
  currentUser,
  loadTripForUser,
  participantExists,
  requestBody,
  sendError,
  stringField,
} from "./server-support.js";
import { expenseMutation } from "./server-trip-mutation.js";

type RevisionRow = {
  action: ExpenseRevision["action"];
  snapshot: unknown;
  version: number;
};

export function registerExpenseRestoreRoute(
  app: OtterApp,
  pool: Pool,
  mustBeSignedIn: OtterMiddleware,
  buildTripPayload: BuildTripPayload,
) {
  app.post(
    "/api/trips/:tripId/expenses/:expenseId/restore",
    mustBeSignedIn,
    parseRequestBody,
    expenseMutation(pool, async (context, client, before) => {
      const user = currentUser(context);
      const tripId = context.req.param("tripId");
      const expenseId = context.req.param("expenseId");
      const trip = await loadTripForUser(client, user.id, tripId);
      if (!trip) return sendError(context, 404, "找不到旅行");
      if (trip.archivedAt) return archivedTripResponse(context);

      const revisionId = stringField(requestBody(context), "revisionId");
      if (!revisionId || revisionId.length > 160)
        return sendError(context, 400, "請選擇有效的支出版本");
      const selected = (
        await client.query<RevisionRow>(
          `SELECT action, snapshot, version FROM expense_revisions
           WHERE trip_id = $1 AND expense_id = $2 AND id = $3`,
          [tripId, expenseId, revisionId],
        )
      ).rows[0];
      if (!selected) return sendError(context, 404, "找不到支出版本");
      const snapshot = selected.snapshot;
      if (!isExpenseSnapshot(snapshot) || snapshot.expense.id !== expenseId)
        return sendError(context, 400, "支出版本內容無效");

      const current = trip.expenses.find((expense) => expense.id === expenseId);
      const last = !current
        ? (
            await client.query<RevisionRow>(
              `SELECT action, version FROM expense_revisions
               WHERE trip_id = $1 AND expense_id = $2 ORDER BY version DESC LIMIT 1`,
              [tripId, expenseId],
            )
          ).rows[0]
        : undefined;
      if (!current && last?.action !== "deleted")
        return sendError(context, 404, "找不到支出");
      requireExpenseVersion(
        context.req.header("If-Match"),
        current?.version ?? last?.version,
      );

      const restored = snapshot.expense;
      if (
        !participantExists(trip, restored.paidById) ||
        restored.participantIds.some((id) => !participantExists(trip, id))
      )
        return sendError(
          context,
          409,
          "原版本的付款人或分帳參與者已不在群組中",
        );

      const previous = before.find((expense) => expense.id === expenseId);
      if (
        previous &&
        changedExpenseFields(previous.snapshot, {
          ...snapshot,
          receipt: previous.snapshot.receipt,
        }).length === 0
      ) {
        return async () => context.json(await buildTripPayload(trip));
      }

      if (current) {
        await client.query(
          `UPDATE expenses SET description = $3, amount_minor = $4, currency = $5,
            category = $6, tags = $7, paid_by_id = $8, expense_date = $9
           WHERE trip_id = $1 AND id = $2`,
          [
            tripId,
            expenseId,
            restored.description,
            restored.amountMinor,
            restored.currency,
            restored.category ?? "其他",
            restored.tags ?? [],
            restored.paidById,
            restored.expenseDate,
          ],
        );
        await client.query(
          "DELETE FROM expense_participants WHERE trip_id = $1 AND expense_id = $2",
          [tripId, expenseId],
        );
        await insertExpenseParticipants(client, tripId, restored);
      } else {
        await insertExpense(client, tripId, {
          ...restored,
          category: restored.category ?? "其他",
          tags: restored.tags ?? [],
        });
      }
      await recordExpenseChanges(
        client,
        tripId,
        before,
        user,
        "version_restore",
      );
      const updated = await loadTripForUser(client, user.id, tripId);
      if (!updated) throw new Error("Trip disappeared after expense restore");
      return async () => context.json(await buildTripPayload(updated));
    }),
  );
}
