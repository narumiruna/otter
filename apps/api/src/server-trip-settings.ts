import {
  type Currency,
  convertExpenseMinor,
  isCurrency,
} from "@narumitw/otter-core/money";
import type { Pool } from "pg";
import {
  captureExpenses,
  recordExpenseChanges,
} from "./server-expense-history.js";
import { ExpenseRateError, rateBridge } from "./server-expense-rates.js";
import type { OtterApp, OtterMiddleware } from "./server-http.js";
import { parseRequestBody } from "./server-http.js";
import { savePaymentRates } from "./server-payment-rates.js";
import {
  archivedTripResponse,
  type BuildTripPayload,
  currentUser,
  loadTripForUser,
  lockTripNamesForUser,
  nowIso,
  requestBody,
  sendError,
  stringField,
  tripNameExistsForUser,
} from "./server-support.js";
import { tripMutation } from "./server-trip-mutation.js";
import type {
  VisaRates,
  VisaSettlementService,
} from "./server-visa-settlement.js";

function tripExchangeRatesFromBody(
  value: unknown,
  baseCurrency: Currency,
): [Currency, number][] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("匯率格式錯誤");
  }
  const rows: [Currency, number][] = [];
  for (const [currency, rawRate] of Object.entries(value)) {
    if (!isCurrency(currency)) {
      throw new Error("不支援的匯率貨幣");
    }
    if (currency === baseCurrency || String(rawRate ?? "").trim() === "") {
      continue;
    }
    const rate = Number(rawRate);
    if (!Number.isFinite(rate) || rate < 0.00000001 || rate >= 10000000000) {
      throw new Error(
        "匯率須在資料庫可保存的範圍內 (0.00000001–9999999999.99999999)",
      );
    }
    rows.push([currency, rate]);
  }
  return rows;
}

export function registerTripSettingsRoute(
  app: OtterApp,
  pool: Pool,
  mustBeSignedIn: OtterMiddleware,
  buildTripPayload: BuildTripPayload,
  service: VisaSettlementService,
) {
  app.patch(
    "/api/trips/:tripId",
    mustBeSignedIn,
    parseRequestBody,
    async (context) => {
      const body = requestBody(context);
      // Finish network I/O before taking the trip lock, as with expense writes.
      let candidate: VisaRates | null = null;
      if (isCurrency(body.baseCurrency)) {
        const trip = await loadTripForUser(
          pool,
          currentUser(context).id,
          context.req.param("tripId"),
        );
        if (
          trip?.currentUserRole === "owner" &&
          !(
            context.req.header("authorization") && trip.allowApiWrites === false
          ) &&
          !trip.archivedAt &&
          trip.baseCurrency !== body.baseCurrency
        ) {
          const proposed = {
            ...trip,
            baseCurrency: body.baseCurrency,
            exchangeRates: undefined,
          };
          try {
            candidate = await service.prepareGeneral(proposed, [
              ...trip.expenses,
              ...(trip.settlementPayments ?? []).map((payment) => ({
                ...payment,
                expenseDate: payment.paidAt,
              })),
            ]);
          } catch {
            return sendError(
              context,
              502,
              "目前無法取得 Visa 匯率，設定未變更，請稍後再試",
            );
          }
        }
      }
      return tripMutation<"/api/trips/:tripId">(pool, async (context, pool) => {
        const user = currentUser(context);
        const trip = await loadTripForUser(
          pool,
          user.id,
          context.req.param("tripId"),
        );
        if (!trip) {
          return sendError(context, 404, "找不到旅行");
        }
        if (trip.currentUserRole !== "owner") {
          return sendError(context, 403, "只有擁有者可管理旅行設定");
        }

        const body = requestBody(context);
        const hasName = "name" in body;
        const hasBaseCurrency = "baseCurrency" in body;
        const hasArchived = "archived" in body;
        const hasExchangeRates = "exchangeRates" in body;
        if (
          hasExchangeRates &&
          body.rateBaseCurrency !== undefined &&
          body.rateBaseCurrency !== trip.baseCurrency
        )
          return sendError(context, 409, "旅行設定已變更，請重新載入");
        const hasAllowApiWrites = "allowApiWrites" in body;
        if (
          !hasName &&
          !hasBaseCurrency &&
          !hasArchived &&
          !hasExchangeRates &&
          !hasAllowApiWrites
        ) {
          return sendError(context, 400, "請提供要更新的旅行內容");
        }
        if (
          trip.archivedAt &&
          (hasName || hasBaseCurrency || hasExchangeRates)
        ) {
          return archivedTripResponse(context);
        }
        if (hasAllowApiWrites) {
          if (context.req.header("authorization")) {
            return sendError(context, 403, "只有瀏覽器登入可管理 API 修改權限");
          }
          if (typeof body.allowApiWrites !== "boolean") {
            return sendError(context, 400, "API 修改權限格式錯誤");
          }
        }

        const name = hasName ? stringField(body, "name") : trip.name;
        if (!name || name.length > 100) {
          return sendError(context, 400, "請輸入 1-100 字的旅行名稱");
        }
        if (hasName) await lockTripNamesForUser(pool, user.id);
        if (await tripNameExistsForUser(pool, user.id, name, trip.id)) {
          return sendError(context, 409, "旅行名稱已存在");
        }

        const baseCurrencyValue = hasBaseCurrency
          ? body.baseCurrency
          : trip.baseCurrency;
        if (!isCurrency(baseCurrencyValue)) {
          return sendError(context, 400, "不支援的基準貨幣");
        }

        let archivedAt: string | null | undefined;
        if (hasArchived) {
          if (typeof body.archived !== "boolean") {
            return sendError(context, 400, "封存狀態格式錯誤");
          }
          archivedAt = body.archived === true ? nowIso() : null;
        }

        let exchangeRates: [Currency, number][] = [];
        if (hasExchangeRates) {
          try {
            exchangeRates = tripExchangeRatesFromBody(
              body.exchangeRates,
              baseCurrencyValue,
            );
          } catch (error) {
            return sendError(
              context,
              400,
              error instanceof Error ? error.message : "匯率格式錯誤",
            );
          }
        }

        const baseCurrencyChanged =
          hasBaseCurrency && baseCurrencyValue !== trip.baseCurrency;

        if (baseCurrencyChanged) {
          const before = await captureExpenses(pool, trip.id);
          for (const expense of trip.expenses) {
            if (!expense.exchangeRate)
              throw new ExpenseRateError("支出缺少匯率快照");
            const bridge = rateBridge(
              expense.exchangeRate,
              baseCurrencyValue,
              expense.expenseDate,
              candidate,
              expense.exchangeRateBridge,
            );
            try {
              convertExpenseMinor(
                expense.amountMinor,
                expense.currency,
                baseCurrencyValue,
                expense.exchangeRate,
                undefined,
                bridge,
                expense.expenseDate,
              );
            } catch {
              throw new ExpenseRateError("匯率會使既有支出換算金額超出範圍");
            }
            await pool.query(
              "UPDATE expenses SET exchange_rate_bridge = $3 WHERE trip_id = $1 AND id = $2",
              [trip.id, expense.id, bridge ?? null],
            );
          }
          await savePaymentRates(
            pool,
            {
              ...trip,
              baseCurrency: baseCurrencyValue,
              exchangeRates: undefined,
            },
            candidate,
          );
          await recordExpenseChanges(pool, trip.id, before, user, "expense");
        }

        if (hasArchived) {
          await pool.query(
            "UPDATE trips SET name = $1, base_currency = $2, archived_at = $3, allow_api_writes = $4 WHERE id = $5 AND owner_id = $6",
            [
              name,
              baseCurrencyValue,
              archivedAt,
              hasAllowApiWrites ? body.allowApiWrites : trip.allowApiWrites,
              context.req.param("tripId"),
              user.id,
            ],
          );
        } else {
          await pool.query(
            "UPDATE trips SET name = $1, base_currency = $2, allow_api_writes = $3 WHERE id = $4 AND owner_id = $5",
            [
              name,
              baseCurrencyValue,
              hasAllowApiWrites ? body.allowApiWrites : trip.allowApiWrites,
              context.req.param("tripId"),
              user.id,
            ],
          );
        }

        if (hasExchangeRates || baseCurrencyChanged) {
          await pool.query(
            "DELETE FROM trip_exchange_rates WHERE trip_id = $1",
            [context.req.param("tripId")],
          );
          for (const [currency, rate] of exchangeRates) {
            await pool.query(
              `INSERT INTO trip_exchange_rates (trip_id, currency, rate_to_base)
             VALUES ($1, $2, $3)`,
              [context.req.param("tripId"), currency, rate],
            );
          }
        }

        const updated = await loadTripForUser(
          pool,
          user.id,
          context.req.param("tripId"),
        );
        if (!updated) {
          throw new Error("Trip disappeared after rename");
        }
        return async () => context.json(await buildTripPayload(updated));
      })(context);
    },
  );
}
