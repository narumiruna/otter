import { isDateOnly } from "./date.js";
import { type Currency, currencyInfo, isCurrency, toMajor } from "./money.js";

export type VisaExpenseRate = Readonly<{
  sourceCurrency: Currency;
  targetCurrency: Currency;
  date: string;
  rate: number;
  fetchedAt: string;
}>;

export function isVisaExpenseRate(
  value: unknown,
  currency: Currency,
  date: string,
  targetCurrency?: Currency,
): value is VisaExpenseRate {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const rate = value as Partial<VisaExpenseRate>;
  return (
    rate.sourceCurrency === currency &&
    isCurrency(rate.targetCurrency) &&
    (targetCurrency === undefined || rate.targetCurrency === targetCurrency) &&
    rate.date === date &&
    isDateOnly(rate.date) &&
    typeof rate.rate === "number" &&
    Number.isFinite(rate.rate) &&
    rate.rate > 0 &&
    (currency !== rate.targetCurrency || rate.rate === 1) &&
    typeof rate.fetchedAt === "string" &&
    Number.isFinite(Date.parse(rate.fetchedAt))
  );
}

export function convertVisaExpenseMinor(
  amountMinor: number,
  currency: Currency,
  date: string,
  rate: VisaExpenseRate | undefined,
  targetCurrency?: Currency,
): number {
  if (!isVisaExpenseRate(rate, currency, date, targetCurrency))
    throw new Error("Expense is missing a matching Visa rate");
  const converted = Math.round(
    toMajor(amountMinor, currency) *
      rate.rate *
      10 ** currencyInfo[rate.targetCurrency].minorUnits,
  );
  if (!Number.isSafeInteger(converted) || converted < 0)
    throw new Error("Visa converted amount is out of range");
  return converted;
}
