import { isDateOnly } from "./date.js";
import { type Currency, isCurrency, toMajor } from "./money.js";

export type VisaExpenseRate = Readonly<{
  sourceCurrency: Currency;
  date: string;
  rateToTwd: number;
  fetchedAt: string;
}>;

export function isVisaExpenseRate(
  value: unknown,
  currency: Currency,
  date: string,
): value is VisaExpenseRate {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const rate = value as Partial<VisaExpenseRate>;
  return (
    isCurrency(rate.sourceCurrency) &&
    rate.sourceCurrency === currency &&
    rate.date === date &&
    isDateOnly(rate.date) &&
    typeof rate.rateToTwd === "number" &&
    Number.isFinite(rate.rateToTwd) &&
    rate.rateToTwd > 0 &&
    (currency !== "TWD" || rate.rateToTwd === 1) &&
    typeof rate.fetchedAt === "string" &&
    Number.isFinite(Date.parse(rate.fetchedAt))
  );
}

export function convertVisaExpenseMinor(
  amountMinor: number,
  currency: Currency,
  date: string,
  rate: VisaExpenseRate | undefined,
): number {
  if (!isVisaExpenseRate(rate, currency, date))
    throw new Error("Expense is missing a matching Visa rate");
  const converted = Math.round(toMajor(amountMinor, currency) * rate.rateToTwd);
  if (!Number.isSafeInteger(converted) || converted < 0)
    throw new Error("Visa converted amount is out of range");
  return converted;
}
