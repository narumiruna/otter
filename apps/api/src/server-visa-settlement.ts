import type { ExchangeRateSnapshot } from "@narumitw/otter-contracts";
import { parseExpenseImportCsv } from "@narumitw/otter-core/csv";
import { isDateOnly } from "@narumitw/otter-core/date";
import { type Currency, isCurrency } from "@narumitw/otter-core/money";
import {
  type Expense,
  settlementCurrency,
  type Trip,
} from "@narumitw/otter-core/settlement";
import {
  convertVisaExpenseMinor,
  isVisaExpenseRate,
  type VisaExpenseRate,
} from "@narumitw/otter-core/visa-settlement";
import { fetchVisaRate } from "@narumitw/otter-visa-exchange-rates";
import type { Context } from "hono";
import type { Pool } from "pg";
import {
  captureExpenses,
  recordExpenseChanges,
} from "./server-expense-history.js";
import { ExpenseRateError } from "./server-expense-rates.js";
import type { OtterApp, OtterEnv, OtterMiddleware } from "./server-http.js";
import { parseRequestBody } from "./server-http.js";
import {
  archivedTripResponse,
  type BuildTripPayload,
  currentUser,
  loadTripForUser,
  requestBody,
  sendError,
  todayDate,
} from "./server-support.js";
import { tripMutation } from "./server-trip-mutation.js";

export type VisaSettlementOptions = { fetchRate?: typeof fetchVisaRate };
export type VisaRates = Map<string, VisaExpenseRate>;
type DatedExpense = Pick<
  Expense,
  "currency" | "expenseDate" | "visaExchangeRate"
>;
export type ExpenseRateCandidate = {
  bank: ExchangeRateSnapshot | null;
  visa: VisaRates;
};
const key = (expense: DatedExpense, target: Currency) =>
  `${expense.currency}/${target}/${expense.expenseDate}`;

export function visaExpenseSnapshot(
  trip: Pick<Trip, "visaSettlementEnabled" | "visaSettlementCurrency">,
  expense: DatedExpense & Pick<Expense, "amountMinor">,
  rates: VisaRates | undefined,
): VisaExpenseRate | undefined {
  const target = trip.visaSettlementEnabled
    ? trip.visaSettlementCurrency
    : undefined;
  const existing = isVisaExpenseRate(
    expense.visaExchangeRate,
    expense.currency,
    expense.expenseDate,
    target,
  )
    ? expense.visaExchangeRate
    : undefined;
  if (!trip.visaSettlementEnabled) return existing;
  if (!target) throw new ExpenseRateError("請選擇 Visa 結清貨幣");
  const snapshot = existing ?? rates?.get(key(expense, target));
  try {
    convertVisaExpenseMinor(
      expense.amountMinor,
      expense.currency,
      expense.expenseDate,
      snapshot,
      target,
    );
  } catch {
    throw new ExpenseRateError(
      `無法取得 ${expense.expenseDate} ${expense.currency}/${target} Visa 匯率，請稍後再試`,
    );
  }
  return snapshot;
}

export function createVisaSettlementService(
  options: VisaSettlementOptions = {},
) {
  const fetchRate = options.fetchRate ?? fetchVisaRate;
  async function prepare(
    expenses: readonly DatedExpense[],
    target: Currency,
  ): Promise<VisaRates> {
    const rates: VisaRates = new Map();
    for (const expense of expenses) {
      if (
        isVisaExpenseRate(
          expense.visaExchangeRate,
          expense.currency,
          expense.expenseDate,
          target,
        )
      )
        rates.set(key(expense, target), expense.visaExchangeRate);
    }
    // Sequential requests avoid a request burst for a large imported trip.
    for (const expense of expenses) {
      if (rates.has(key(expense, target))) continue;
      if (expense.currency === target) {
        rates.set(key(expense, target), {
          sourceCurrency: expense.currency,
          targetCurrency: target,
          date: expense.expenseDate,
          rate: 1,
          fetchedAt: new Date().toISOString(),
        });
        continue;
      }
      const quote = await fetchRate({
        source: expense.currency,
        target,
        date: expense.expenseDate,
      });
      const snapshot = {
        sourceCurrency: expense.currency,
        targetCurrency: target,
        date: expense.expenseDate,
        rate: quote.visaRate,
        fetchedAt: quote.fetchedAt,
      };
      if (
        quote.source !== expense.currency ||
        quote.target !== target ||
        quote.date !== expense.expenseDate ||
        !isVisaExpenseRate(
          snapshot,
          expense.currency,
          expense.expenseDate,
          target,
        )
      )
        throw new Error("Invalid Visa quote");
      rates.set(key(expense, target), snapshot);
    }
    return rates;
  }

  async function prepareRequest(
    pool: Pool,
    context: Context<OtterEnv>,
  ): Promise<VisaRates> {
    const trip = await loadTripForUser(
      pool,
      currentUser(context).id,
      context.req.param("tripId") ?? "",
    );
    if (!trip?.visaSettlementEnabled || trip.archivedAt) return new Map();
    const body = requestBody(context);
    const expenses: DatedExpense[] = [...trip.expenses];
    if (context.req.path.endsWith("/import") && typeof body.csv === "string") {
      const parsed = parseExpenseImportCsv(
        body.csv,
        trip.participants.map((p) => p.name),
      );
      if (parsed.errors.length) return new Map();
      for (const row of parsed.rows) {
        if (isCurrency(row.currency))
          expenses.push({ currency: row.currency, expenseDate: row.date });
      }
    } else if (
      context.req.path.endsWith("/restore") &&
      typeof body.revisionId === "string"
    ) {
      const result = await pool.query<{ snapshot: { expense: Expense } }>(
        "SELECT snapshot FROM expense_revisions WHERE trip_id = $1 AND expense_id = $2 AND id = $3",
        [trip.id, context.req.param("expenseId"), body.revisionId],
      );
      const restored = result.rows[0]?.snapshot.expense;
      if (restored) expenses.push(restored);
    } else {
      const existing = trip.expenses.find(
        (e) => e.id === context.req.param("expenseId"),
      );
      const currency = body.currency ?? existing?.currency;
      const expenseDate =
        body.expenseDate ?? existing?.expenseDate ?? todayDate();
      if (
        isCurrency(currency) &&
        typeof expenseDate === "string" &&
        isDateOnly(expenseDate)
      )
        expenses.push({ currency, expenseDate });
    }
    return prepare(expenses, settlementCurrency(trip));
  }
  return { prepare, prepareRequest };
}

export type VisaSettlementService = ReturnType<
  typeof createVisaSettlementService
>;

export function registerVisaSettlementRoute(
  app: OtterApp,
  pool: Pool,
  mustBeSignedIn: OtterMiddleware,
  buildTripPayload: BuildTripPayload,
  service: VisaSettlementService,
) {
  app.patch(
    "/api/trips/:tripId/visa-settlement",
    mustBeSignedIn,
    parseRequestBody,
    async (context) => {
      const body = requestBody(context);
      const enabled = body.enabled;
      if (
        typeof enabled !== "boolean" ||
        ("currency" in body && !isCurrency(body.currency))
      )
        return sendError(context, 400, "Visa 結清設定格式錯誤");
      const trip = await loadTripForUser(
        pool,
        currentUser(context).id,
        context.req.param("tripId"),
      );
      if (!trip) return sendError(context, 404, "找不到旅行");
      if (trip.currentUserRole !== "owner")
        return sendError(context, 403, "只有擁有者可管理旅行設定");
      if (trip.archivedAt) return archivedTripResponse(context);
      const target = isCurrency(body.currency)
        ? body.currency
        : (trip.visaSettlementCurrency ?? trip.baseCurrency);
      if (
        enabled &&
        trip.settlementPayments?.some((p) => p.currency !== target)
      )
        return sendError(context, 400, "既有付款紀錄必須使用所選結清貨幣");
      let rates: VisaRates = new Map();
      if (enabled) {
        try {
          rates = await service.prepare(trip.expenses, target);
        } catch {
          return sendError(
            context,
            502,
            "目前無法取得 Visa 匯率，設定未變更，請稍後再試",
          );
        }
      }
      return tripMutation<"/api/trips/:tripId/visa-settlement">(
        pool,
        async (context, client) => {
          const user = currentUser(context);
          const locked = await loadTripForUser(client, user.id, trip.id);
          if (!locked) return sendError(context, 404, "找不到旅行");
          if (locked.currentUserRole !== "owner")
            return sendError(context, 403, "只有擁有者可管理旅行設定");
          if (locked.archivedAt) return archivedTripResponse(context);
          if (
            enabled &&
            locked.settlementPayments?.some((p) => p.currency !== target)
          )
            return sendError(context, 400, "既有付款紀錄必須使用所選結清貨幣");
          const before = await captureExpenses(client, trip.id);
          if (enabled) {
            for (const expense of locked.expenses) {
              const snapshot = visaExpenseSnapshot(
                { visaSettlementEnabled: true, visaSettlementCurrency: target },
                expense,
                rates,
              );
              await client.query(
                "UPDATE expenses SET visa_exchange_rate = $3 WHERE trip_id = $1 AND id = $2",
                [trip.id, expense.id, snapshot],
              );
            }
          }
          await client.query(
            "UPDATE trips SET visa_settlement_enabled = $2, visa_settlement_currency = $3 WHERE id = $1",
            [trip.id, enabled, target],
          );
          await recordExpenseChanges(
            client,
            trip.id,
            before,
            user,
            "visa_settlement",
          );
          const updated = await loadTripForUser(client, user.id, trip.id);
          if (!updated)
            throw new Error("Trip disappeared after Visa setting update");
          return async () => context.json(await buildTripPayload(updated));
        },
      )(context);
    },
  );
}
