import type express from "express";
import type { Pool as PgPool } from "pg";
import {
  asyncHandler,
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
  tripPayload,
} from "./server-support.js";
import { isCurrency, parseAmountToMinor } from "./shared/money.js";

export function registerSettlementPaymentRoutes(
  app: express.Express,
  pool: PgPool,
  mustBeSignedIn: express.RequestHandler,
) {
  app.post(
    "/api/trips/:tripId/settlement-payments",
    mustBeSignedIn,
    asyncHandler(async (req, res) => {
      const user = currentUser(res);
      const trip = await loadTripForUser(pool, user.id, req.params.tripId);
      if (!trip) {
        sendError(res, 404, "找不到旅行");
        return;
      }

      const body = requestBody(req);
      const fromId = stringField(body, "fromId");
      const toId = stringField(body, "toId");
      const currencyValue = body.currency ?? trip.baseCurrency;
      const paidAt = stringField(body, "paidAt") ?? todayDate();
      const note = stringField(body, "note") ?? "";
      if (!fromId || !participantExists(trip, fromId)) {
        sendError(res, 400, "付款人必須是參與者");
        return;
      }
      if (!toId || !participantExists(trip, toId)) {
        sendError(res, 400, "收款人必須是參與者");
        return;
      }
      if (fromId === toId) {
        sendError(res, 400, "付款人和收款人不能相同");
        return;
      }
      if (!isCurrency(currencyValue)) {
        sendError(res, 400, "不支援的貨幣");
        return;
      }
      if (!isDateOnly(paidAt)) {
        sendError(res, 400, "請輸入有效付款日期");
        return;
      }
      if (note.length > 160) {
        sendError(res, 400, "備註最多 160 字");
        return;
      }

      let amountMinor: number;
      try {
        amountMinor = parseAmountToMinor(
          String(body.amount ?? ""),
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

      await pool.query(
        `INSERT INTO settlement_payments
           (id, trip_id, from_id, to_id, amount_minor, currency, paid_at, note, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          makeId("payment"),
          trip.id,
          fromId,
          toId,
          amountMinor,
          currencyValue,
          paidAt,
          note,
          nowIso(),
        ],
      );

      const updated = await loadTripForUser(pool, user.id, trip.id);
      if (!updated) {
        throw new Error("Trip disappeared after settlement payment insert");
      }
      res.status(201).json(tripPayload(updated));
    }),
  );

  app.delete(
    "/api/trips/:tripId/settlement-payments/:paymentId",
    mustBeSignedIn,
    asyncHandler(async (req, res) => {
      const user = currentUser(res);
      const trip = await loadTripForUser(pool, user.id, req.params.tripId);
      if (!trip) {
        sendError(res, 404, "找不到旅行");
        return;
      }

      const result = await pool.query(
        "DELETE FROM settlement_payments WHERE trip_id = $1 AND id = $2",
        [trip.id, req.params.paymentId],
      );
      if (result.rowCount === 0) {
        sendError(res, 404, "找不到付款紀錄");
        return;
      }

      const updated = await loadTripForUser(pool, user.id, trip.id);
      if (!updated) {
        throw new Error("Trip disappeared after settlement payment delete");
      }
      res.json(tripPayload(updated));
    }),
  );
}
