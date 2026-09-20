import { isCurrency, parseAmountToMinor } from "@narumitw/otter-core/money";
import type { Pool as PgPool } from "pg";
import type { OtterApp, OtterMiddleware } from "./server-http.js";
import { parseRequestBody } from "./server-http.js";
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
} from "./server-support.js";

export function registerSettlementPaymentRoutes(
  app: OtterApp,
  pool: PgPool,
  mustBeSignedIn: OtterMiddleware,
  buildTripPayload: BuildTripPayload,
) {
  app.post(
    "/api/trips/:tripId/settlement-payments",
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
      const fromId = stringField(body, "fromId");
      const toId = stringField(body, "toId");
      const currencyValue = body.currency ?? trip.baseCurrency;
      const paidAt = stringField(body, "paidAt") ?? todayDate();
      const note = stringField(body, "note") ?? "";
      if (!fromId || !participantExists(trip, fromId)) {
        return sendError(context, 400, "付款人必須是參與者");
      }
      if (!toId || !participantExists(trip, toId)) {
        return sendError(context, 400, "收款人必須是參與者");
      }
      if (fromId === toId) {
        return sendError(context, 400, "付款人和收款人不能相同");
      }
      if (!isCurrency(currencyValue)) {
        return sendError(context, 400, "不支援的貨幣");
      }
      if (!isDateOnly(paidAt)) {
        return sendError(context, 400, "請輸入有效付款日期");
      }
      if (note.length > 160) {
        return sendError(context, 400, "備註最多 160 字");
      }

      let amountMinor: number;
      try {
        amountMinor = parseAmountToMinor(
          String(body.amount ?? ""),
          currencyValue,
        );
      } catch (error) {
        return sendError(
          context,
          400,
          error instanceof Error ? error.message : "金額格式錯誤",
        );
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
      return context.json(await buildTripPayload(updated), 201);
    },
  );

  app.delete(
    "/api/trips/:tripId/settlement-payments/:paymentId",
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

      const result = await pool.query(
        "DELETE FROM settlement_payments WHERE trip_id = $1 AND id = $2",
        [trip.id, context.req.param("paymentId")],
      );
      if (result.rowCount === 0) {
        return sendError(context, 404, "找不到付款紀錄");
      }

      const updated = await loadTripForUser(pool, user.id, trip.id);
      if (!updated) {
        throw new Error("Trip disappeared after settlement payment delete");
      }
      return context.json(await buildTripPayload(updated));
    },
  );
}
