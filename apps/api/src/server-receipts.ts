import type { Pool as PgPool } from "pg";
import {
  recordExpenseChanges,
  requireExpenseVersion,
} from "./server-expense-history.js";
import type { OtterApp, OtterMiddleware } from "./server-http.js";
import { parseRequestBody } from "./server-http.js";
import {
  archivedTripResponse,
  type BuildTripPayload,
  currentUser,
  loadTripForUser,
  makeId,
  nowIso,
  sendError,
} from "./server-support.js";
import { tripMutation } from "./server-trip-mutation.js";

const receiptMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function registerReceiptRoutes(
  app: OtterApp,
  pool: PgPool,
  mustBeSignedIn: OtterMiddleware,
  buildTripPayload: BuildTripPayload,
) {
  app.put(
    "/api/trips/:tripId/expenses/:expenseId/receipt",
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
      const expense = trip.expenses.find(
        (e) => e.id === context.req.param("expenseId"),
      );
      if (!expense) return sendError(context, 404, "找不到支出");
      requireExpenseVersion(context.req.header("If-Match"), expense.version);

      const mimeType = contentType(context.req.header("content-type"));
      if (!mimeType || !receiptMimeTypes.has(mimeType)) {
        return sendError(context, 415, "收據只支援 JPEG、PNG 或 WebP 圖片");
      }
      const body = context.get("requestBody");
      if (!Buffer.isBuffer(body) || body.length === 0) {
        return sendError(context, 400, "請選擇收據圖片");
      }

      await pool.query(
        `INSERT INTO receipt_attachments (id, trip_id, expense_id, mime_type, data, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (expense_id) DO UPDATE
         SET id = EXCLUDED.id,
             mime_type = EXCLUDED.mime_type,
             data = EXCLUDED.data,
             created_at = EXCLUDED.created_at`,
        [
          makeId("receipt"),
          trip.id,
          context.req.param("expenseId"),
          mimeType,
          body,
          nowIso(),
        ],
      );

      await recordExpenseChanges(pool, trip.id, before, user, "receipt");
      const updated = await loadTripForUser(pool, user.id, trip.id);
      if (!updated) {
        throw new Error("Trip disappeared after receipt upload");
      }
      return async () => context.json(await buildTripPayload(updated), 201);
    }),
  );

  app.get(
    "/api/trips/:tripId/expenses/:expenseId/receipt",
    mustBeSignedIn,
    parseRequestBody,
    async (context) => {
      const trip = await loadTripForUser(
        pool,
        currentUser(context).id,
        context.req.param("tripId"),
      );
      if (!trip) {
        return sendError(context, 404, "找不到旅行");
      }
      const result = await pool.query<{ mime_type: string; data: Buffer }>(
        `SELECT mime_type, data
         FROM receipt_attachments
         WHERE trip_id = $1 AND expense_id = $2`,
        [trip.id, context.req.param("expenseId")],
      );
      const receipt = result.rows[0];
      if (!receipt) {
        return sendError(context, 404, "找不到收據");
      }
      context.header("Content-Type", receipt.mime_type);
      return context.body(new Uint8Array(receipt.data));
    },
  );

  app.delete(
    "/api/trips/:tripId/expenses/:expenseId/receipt",
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
      const expense = trip.expenses.find(
        (e) => e.id === context.req.param("expenseId"),
      );
      if (!expense) return sendError(context, 404, "找不到支出");
      requireExpenseVersion(context.req.header("If-Match"), expense.version);
      const deleted = await pool.query(
        "DELETE FROM receipt_attachments WHERE trip_id = $1 AND expense_id = $2",
        [trip.id, context.req.param("expenseId")],
      );
      if (deleted.rowCount === 0) {
        return sendError(context, 404, "找不到收據");
      }
      await recordExpenseChanges(pool, trip.id, before, user, "receipt");
      const updated = await loadTripForUser(pool, user.id, trip.id);
      if (!updated) {
        throw new Error("Trip disappeared after receipt delete");
      }
      return async () => context.json(await buildTripPayload(updated));
    }),
  );
}

function contentType(value: string | undefined): string {
  return (value ?? "").split(";")[0].trim().toLowerCase();
}
