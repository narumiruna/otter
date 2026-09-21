import {
  changedExpenseFields,
  type ExpenseRevision,
  type ExpenseSnapshot,
} from "@narumitw/otter-contracts";
import type { Pool } from "pg";
import type { OtterApp, OtterMiddleware } from "./server-http.js";
import { currentUser, sendError } from "./server-support.js";

type RevisionRow = {
  id: string;
  expense_id: string;
  version: number;
  action: ExpenseRevision["action"];
  source: ExpenseRevision["source"];
  actor: ExpenseRevision["actor"];
  recorded_at: Date;
  snapshot: ExpenseSnapshot;
  previous_snapshot: ExpenseSnapshot | null;
};
export function registerExpenseHistoryRoutes(
  app: OtterApp,
  pool: Pool,
  mustBeSignedIn: OtterMiddleware,
) {
  app.get(
    "/api/trips/:tripId/expense-history",
    mustBeSignedIn,
    async (context) => {
      const tripId = context.req.param("tripId");
      const userId = currentUser(context).id;
      const access = await pool.query(
        "SELECT 1 FROM trip_members WHERE trip_id = $1 AND user_id = $2",
        [tripId, userId],
      );
      if (!access.rowCount) return sendError(context, 404, "找不到旅行");
      const limitInput = context.req.query("limit") ?? "20";
      const cursor = context.req.query("cursor");
      const expenseId = context.req.query("expenseId");
      if (
        !/^[1-9]\d*$/.test(limitInput) ||
        Number(limitInput) > 100 ||
        (expenseId !== undefined &&
          (!expenseId.length || expenseId.length > 160))
      )
        return sendError(context, 400, "歷史查詢格式錯誤");
      const limit = Number(limitInput);
      if (cursor !== undefined) {
        if (!/^[\w-]{1,160}$/.test(cursor))
          return sendError(context, 400, "歷史游標格式錯誤");
        const found = await pool.query(
          "SELECT 1 FROM expense_revisions WHERE trip_id = $1 AND id = $2 AND ($3::text IS NULL OR expense_id = $3)",
          [tripId, cursor, expenseId ?? null],
        );
        if (!found.rowCount) return sendError(context, 400, "歷史游標格式錯誤");
      }
      const result = await pool.query<RevisionRow>(
        `SELECT r.*, previous.snapshot AS previous_snapshot
       FROM expense_revisions r
       LEFT JOIN expense_revisions previous ON previous.trip_id = r.trip_id AND previous.expense_id = r.expense_id AND previous.version = r.version - 1
       WHERE r.trip_id = $1 AND EXISTS (SELECT 1 FROM trip_members m WHERE m.trip_id = r.trip_id AND m.user_id = $2)
         AND ($3::text IS NULL OR r.expense_id = $3)
         AND ($4::text IS NULL OR (r.recorded_at, r.id) < (SELECT recorded_at, id FROM expense_revisions WHERE trip_id = $1 AND id = $4))
       ORDER BY r.recorded_at DESC, r.id DESC LIMIT $5`,
        [tripId, userId, expenseId ?? null, cursor ?? null, limit + 1],
      );
      const rows = result.rows.slice(0, limit);
      const revisions: ExpenseRevision[] = rows.map((row) => ({
        id: row.id,
        expenseId: row.expense_id,
        version: row.version,
        action: row.action,
        source: row.source,
        actor: row.actor,
        recordedAt: row.recorded_at.toISOString(),
        snapshot: row.snapshot,
        previousSnapshot: row.previous_snapshot,
        changedFields: row.previous_snapshot
          ? changedExpenseFields(row.previous_snapshot, row.snapshot)
          : [],
      }));
      context.header("Cache-Control", "private, no-store");
      return context.json({
        revisions,
        nextCursor:
          result.rows.length > limit ? (rows.at(-1)?.id ?? null) : null,
      });
    },
  );
}
