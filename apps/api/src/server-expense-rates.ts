import {
  type Currency,
  convertExpenseMinor,
  type ExchangeRateBridge,
  type ExpenseExchangeRate,
  isExchangeRateBridge,
  isExpenseExchangeRate,
} from "@narumitw/otter-core/money";
import type { VisaExpenseRate } from "@narumitw/otter-core/visa-settlement";
import { rateKey } from "./server-exchange-rates.js";
import type { LoadedTrip } from "./server-support.js";

export class ExpenseRateError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 502 = 400,
  ) {
    super(message);
  }
}
export type PreparedRates = Map<string, VisaExpenseRate>;

export function expenseExchangeRate(
  trip: Pick<LoadedTrip, "baseCurrency" | "exchangeRates">,
  currency: Currency,
  candidate: PreparedRates | null,
  amountMinor: number | undefined,
  date: string,
): ExpenseExchangeRate {
  let snapshot: ExpenseExchangeRate;
  if (currency === trip.baseCurrency)
    snapshot = {
      baseCurrency: trip.baseCurrency,
      rateToBase: 1,
      source: "fixed",
    };
  else if (trip.exchangeRates?.[currency] !== undefined)
    snapshot = {
      baseCurrency: trip.baseCurrency,
      rateToBase: trip.exchangeRates[currency],
      source: "custom",
    };
  else snapshot = preparedRate(currency, trip.baseCurrency, date, candidate);
  if (!isExpenseExchangeRate(snapshot, currency, date))
    throw new ExpenseRateError("匯率格式錯誤");
  if (amountMinor !== undefined) {
    try {
      convertExpenseMinor(
        amountMinor,
        currency,
        trip.baseCurrency,
        snapshot,
        undefined,
        undefined,
        date,
      );
    } catch {
      throw new ExpenseRateError("支出換算金額超出範圍");
    }
  }
  return snapshot;
}

export function preparedRate(
  source: Currency,
  target: Currency,
  date: string,
  candidate: PreparedRates | null,
): ExpenseExchangeRate {
  if (source === target)
    return { baseCurrency: target, rateToBase: 1, source: "fixed" };
  const quote = candidate?.get(rateKey(source, target, date));
  if (!quote)
    throw new ExpenseRateError(
      `無法取得 ${date} ${source}/${target} Visa 匯率，請稍後再試`,
      502,
    );
  const rate: ExpenseExchangeRate = {
    baseCurrency: target,
    rateToBase: quote.rate,
    source: "visa",
    provider: "VISA",
    rateType: "visa",
    date,
    fetchedAt: quote.fetchedAt,
  };
  if (
    quote.sourceCurrency !== source ||
    quote.targetCurrency !== target ||
    quote.date !== date ||
    !isExpenseExchangeRate(rate, source, date)
  )
    throw new ExpenseRateError("Visa 匯率格式錯誤", 502);
  return rate;
}

export function rateBridge(
  rate: ExpenseExchangeRate,
  target: Currency,
  date: string,
  candidate: PreparedRates | null,
  saved?: ExchangeRateBridge,
): ExchangeRateBridge | undefined {
  if (rate.baseCurrency === target) return undefined;
  if (isExchangeRateBridge(saved, rate.baseCurrency, target, date))
    return saved;
  return {
    ...preparedRate(rate.baseCurrency, target, date, candidate),
    sourceCurrency: rate.baseCurrency,
  };
}
