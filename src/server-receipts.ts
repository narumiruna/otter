import express from "express";
import type { Pool as PgPool } from "pg";
import {
  asyncHandler,
  currentUser,
  loadTripForUser,
  makeId,
  nowIso,
  rejectArchivedTrip,
  sendError,
  tripPayload,
} from "./server-support.js";

const receiptMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const receiptUpload = express.raw({
  limit: "5mb",
  type: [...receiptMimeTypes],
});

export function registerReceiptRoutes(
  app: express.Express,
  pool: PgPool,
  mustBeSignedIn: express.RequestHandler,
) {
  app.put(
    "/api/trips/:tripId/expenses/:expenseId/receipt",
    mustBeSignedIn,
    receiptUpload,
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
      if (
        !trip.expenses.some((expense) => expense.id === req.params.expenseId)
      ) {
        sendError(res, 404, "找不到支出");
        return;
      }

      const mimeType = contentType(req.headers["content-type"]);
      if (!mimeType || !receiptMimeTypes.has(mimeType)) {
        sendError(res, 415, "收據只支援 JPEG、PNG 或 WebP 圖片");
        return;
      }
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        sendError(res, 400, "請選擇收據圖片");
        return;
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
          req.params.expenseId,
          mimeType,
          req.body,
          nowIso(),
        ],
      );

      const updated = await loadTripForUser(pool, user.id, trip.id);
      if (!updated) {
        throw new Error("Trip disappeared after receipt upload");
      }
      res.status(201).json(tripPayload(updated));
    }),
  );

  app.get(
    "/api/trips/:tripId/expenses/:expenseId/receipt",
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
      const result = await pool.query<{ mime_type: string; data: Buffer }>(
        `SELECT mime_type, data
         FROM receipt_attachments
         WHERE trip_id = $1 AND expense_id = $2`,
        [trip.id, req.params.expenseId],
      );
      const receipt = result.rows[0];
      if (!receipt) {
        sendError(res, 404, "找不到收據");
        return;
      }
      res.type(receipt.mime_type).send(receipt.data);
    }),
  );

  app.delete(
    "/api/trips/:tripId/expenses/:expenseId/receipt",
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
        "DELETE FROM receipt_attachments WHERE trip_id = $1 AND expense_id = $2",
        [trip.id, req.params.expenseId],
      );
      if (deleted.rowCount === 0) {
        sendError(res, 404, "找不到收據");
        return;
      }
      const updated = await loadTripForUser(pool, user.id, trip.id);
      if (!updated) {
        throw new Error("Trip disappeared after receipt delete");
      }
      res.json(tripPayload(updated));
    }),
  );
}

function contentType(value: string | string[] | undefined): string {
  return String(Array.isArray(value) ? value[0] : (value ?? ""))
    .split(";")[0]
    .trim()
    .toLowerCase();
}
