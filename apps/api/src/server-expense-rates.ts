import type { ExchangeRateSnapshot } from "@narumitw/otter-contracts";
import {
  type Currency,
  convertExpenseMinor,
  type ExpenseExchangeRate,
  fixedExchangeRates,
} from "@narumitw/otter-core/money";
import type { LoadedTrip } from "./server-support.js";

export class ExpenseRateError extends Error {}

// The bank candidate is fetched before the trip lock. Only the locked trip's
// latest base currency and custom rates decide which quote is persisted.
export function expenseExchangeRate(
  trip: Pick<LoadedTrip, "baseCurrency" | "exchangeRates">,
  currency: Currency,
  candidate: ExchangeRateSnapshot | null,
  amountMinor?: number,
): ExpenseExchangeRate {
  let snapshot: ExpenseExchangeRate;
  if (currency === trip.baseCurrency) {
    snapshot = {
      baseCurrency: trip.baseCurrency,
      rateToBase: 1,
      source: "fixed",
    };
  } else if (trip.exchangeRates?.[currency] !== undefined) {
    snapshot = {
      baseCurrency: trip.baseCurrency,
      rateToBase: trip.exchangeRates[currency],
      source: "custom",
    };
  } else {
    snapshot = bankOrFixedRate(trip.baseCurrency, currency, candidate);
  }
  if (amountMinor !== undefined) {
    try {
      convertExpenseMinor(amountMinor, currency, trip.baseCurrency, snapshot);
    } catch {
      throw new ExpenseRateError("支出換算金額超出範圍");
    }
  }
  return snapshot;
}

function bankOrFixedRate(
  baseCurrency: Currency,
  currency: Currency,
  candidate: ExchangeRateSnapshot | null,
): ExpenseExchangeRate {
  const base = candidate?.rates[baseCurrency];
  if (base && candidate?.rates[currency]) {
    return {
      baseCurrency,
      rateToBase: Number((candidate.rates[currency] / base).toPrecision(12)),
      source: "bank",
      provider: candidate.source,
      rateType: candidate.rateType,
      fetchedAt: candidate.fetchedAt,
    };
  }
  return {
    baseCurrency,
    rateToBase: Number(
      fixedExchangeRates(baseCurrency)[currency].toPrecision(12),
    ),
    source: "fixed",
  };
}
