import type { Expense, Trip } from "@narumitw/otter-contracts";
import { convertExpenseMinor } from "@narumitw/otter-core/money";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Popover } from "@radix-ui/themes";
import { Button } from "@/components/ui/button";
import { useI18n } from "../i18n.js";

export function ExpenseRateDetails({
  expense,
  trip,
  showAmount = false,
}: {
  expense: Expense;
  trip: Trip;
  showAmount?: boolean;
}) {
  const { formatMoney, locale, messages } = useI18n();
  const rate = expense.exchangeRate;
  const converted = formatMoney(
    convertExpenseMinor(
      expense.amountMinor,
      expense.currency,
      trip.baseCurrency,
      rate,
      trip.exchangeRates,
    ),
    trip.baseCurrency,
  );
  const source = rate
    ? {
        bank: messages.expenseHistoryRateBank,
        custom: messages.expenseHistoryRateCustom,
        fixed: messages.expenseHistoryRateFixed,
        legacy: messages.expenseHistoryRateLegacy,
      }[rate.source]
    : "";
  return (
    <span className="expense-rate-summary">
      <Popover.Root>
        <Popover.Trigger>
          <Button
            className="expense-rate-trigger"
            variant="ghost"
            aria-label={messages.expenseRateForName({
              name: expense.description,
            })}
          >
            {showAmount ? (
              formatMoney(expense.amountMinor, expense.currency)
            ) : (
              <InfoCircledIcon aria-hidden="true" />
            )}
          </Button>
        </Popover.Trigger>
        <Popover.Content className="expense-rate-popover" align="end">
          <strong>{messages.expenseHistoryRate}</strong>
          {rate ? (
            <p>{`1 ${expense.currency} = ${rate.rateToBase} ${rate.baseCurrency} · ${source}${rate.provider ? ` (${rate.provider}, ${rate.rateType})` : ""} · ${rate.fetchedAt ? new Date(rate.fetchedAt).toLocaleString(locale) : messages.expenseHistoryRateTimeUnavailable} · ${converted}`}</p>
          ) : (
            <p>{messages.rateUnavailable}</p>
          )}
        </Popover.Content>
      </Popover.Root>
      {expense.currency !== trip.baseCurrency ? (
        <small>≈ {converted}</small>
      ) : null}
    </span>
  );
}
