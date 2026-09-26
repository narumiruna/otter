import type { Expense, Trip } from "@narumitw/otter-contracts";
import { convertExpenseMinor } from "@narumitw/otter-core/money";
import { useI18n } from "../i18n.js";

export function ExpenseRateDetails({
  expense,
  trip,
}: {
  expense: Expense;
  trip: Trip;
}) {
  const { formatMoney, locale } = useI18n();
  const rate = expense.exchangeRate;
  if (!rate)
    return (
      <small className="block max-w-full whitespace-normal break-anywhere">
        {locale === "en"
          ? "Rate unavailable (older payload)"
          : "舊版資料：匯率未提供"}
      </small>
    );
  const source = {
    bank: "Bank of Taiwan",
    custom: locale === "en" ? "Group custom" : "群組自訂",
    fixed: locale === "en" ? "Built-in fixed" : "內建固定",
    legacy: locale === "en" ? "Legacy estimate" : "舊帳估算",
  }[rate.source];
  const when = rate.fetchedAt
    ? new Date(rate.fetchedAt).toLocaleString(
        locale === "en" ? "en-US" : "zh-TW",
      )
    : locale === "en"
      ? "Quote time unavailable"
      : "無報價時間";
  return (
    <small className="block max-w-full whitespace-normal break-anywhere">
      {`1 ${expense.currency} = ${rate.rateToBase} ${rate.baseCurrency} · ${source}${rate.provider ? ` (${rate.provider}, ${rate.rateType})` : ""} · ${when}`}
      {` · ${formatMoney(convertExpenseMinor(expense.amountMinor, expense.currency, trip.baseCurrency, rate, trip.exchangeRates), trip.baseCurrency)}`}
    </small>
  );
}
