import {
  convertExpenseMinor,
  isExpenseExchangeRate,
} from "@narumitw/otter-core/money";
import type { SettlementPayment, Trip } from "@narumitw/otter-core/settlement";
import type { PoolClient } from "pg";
import {
  ExpenseRateError,
  expenseExchangeRate,
  type PreparedRates,
  rateBridge,
} from "./server-expense-rates.js";

export function paymentSnapshot(
  trip: Pick<Trip, "baseCurrency" | "exchangeRates">,
  payment: Pick<
    SettlementPayment,
    | "amountMinor"
    | "currency"
    | "paidAt"
    | "exchangeRate"
    | "exchangeRateBridge"
  >,
  rates: PreparedRates | null,
) {
  const exchangeRate = isExpenseExchangeRate(
    payment.exchangeRate,
    payment.currency,
    payment.paidAt,
  )
    ? payment.exchangeRate
    : expenseExchangeRate(
        trip,
        payment.currency,
        rates,
        undefined,
        payment.paidAt,
      );
  const exchangeRateBridge = rateBridge(
    exchangeRate,
    trip.baseCurrency,
    payment.paidAt,
    rates,
    payment.exchangeRateBridge,
  );
  try {
    convertExpenseMinor(
      payment.amountMinor,
      payment.currency,
      trip.baseCurrency,
      exchangeRate,
      undefined,
      exchangeRateBridge,
      payment.paidAt,
    );
  } catch {
    throw new ExpenseRateError("金額格式錯誤");
  }
  return { exchangeRate, exchangeRateBridge };
}

export async function savePaymentRates(
  client: PoolClient,
  trip: Trip,
  rates: PreparedRates | null,
) {
  for (const payment of trip.settlementPayments ?? []) {
    const snapshot = paymentSnapshot(trip, payment, rates);
    await client.query(
      "UPDATE settlement_payments SET exchange_rate = $3, exchange_rate_bridge = $4 WHERE trip_id = $1 AND id = $2",
      [
        trip.id,
        payment.id,
        snapshot.exchangeRate,
        snapshot.exchangeRateBridge ?? null,
      ],
    );
  }
}
