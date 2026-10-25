import { isCurrency, parseAmountToMinor } from "@narumitw/otter-core/money";
import { settlementCurrency } from "@narumitw/otter-core/settlement";
import type { Pool as PgPool } from "pg";
import type { OtterApp, OtterMiddleware } from "./server-http.js";
import { parseRequestBody } from "./server-http.js";
import { paymentSnapshot } from "./server-payment-rates.js";
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
import { tripMutation } from "./server-trip-mutation.js";
import type {
  VisaRates,
  VisaSettlementService,
} from "./server-visa-settlement.js";

export function registerSettlementPaymentRoutes(
  app: OtterApp,
  pool: PgPool,
  mustBeSignedIn: OtterMiddleware,
  buildTripPayload: BuildTripPayload,
  service: VisaSettlementService,
) {
  app.post(
    "/api/trips/:tripId/settlement-payments",
    mustBeSignedIn,
    parseRequestBody,
    async (context) => {
      const current = await loadTripForUser(
        pool,
        currentUser(context).id,
        context.req.param("tripId") ?? "",
      );
      const body = requestBody(context);
      const currency =
        body.currency ?? (current && settlementCurrency(current));
      const paidAt = stringField(body, "paidAt") ?? todayDate();
      let rates: VisaRates | null = null;
      if (
        current &&
        !(
          context.req.header("authorization") &&
          current.allowApiWrites === false
        ) &&
        !current.archivedAt &&
        !current.visaSettlementEnabled &&
        isCurrency(currency) &&
        isDateOnly(paidAt)
      ) {
        try {
          rates = await service.prepareGeneral(current, [
            { currency, expenseDate: paidAt },
          ]);
        } catch {
          return sendError(context, 502, "目前無法取得 Visa 匯率，請稍後再試");
        }
      }
      return tripMutation<"/api/trips/:tripId/settlement-payments">(
        pool,
        async (context, pool) => {
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
          const currencyValue = body.currency ?? settlementCurrency(trip);
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
          if (
            trip.visaSettlementEnabled &&
            currencyValue !== settlementCurrency(trip)
          ) {
            return sendError(context, 400, "Visa 結清付款必須使用所選貨幣");
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

          const snapshot = trip.visaSettlementEnabled
            ? undefined
            : paymentSnapshot(
                trip,
                { currency: currencyValue, amountMinor, paidAt },
                rates,
              );
          await pool.query(
            `INSERT INTO settlement_payments
           (id, trip_id, from_id, to_id, amount_minor, currency, paid_at, note, created_at, exchange_rate, exchange_rate_bridge)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
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
              snapshot?.exchangeRate ?? null,
              snapshot?.exchangeRateBridge ?? null,
            ],
          );

          const updated = await loadTripForUser(pool, user.id, trip.id);
          if (!updated) {
            throw new Error("Trip disappeared after settlement payment insert");
          }
          return async () => context.json(await buildTripPayload(updated), 201);
        },
      )(context);
    },
  );

  app.delete(
    "/api/trips/:tripId/settlement-payments/:paymentId",
    mustBeSignedIn,
    parseRequestBody,
    tripMutation(pool, async (context, pool) => {
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
      return async () => context.json(await buildTripPayload(updated));
    }),
  );
}
