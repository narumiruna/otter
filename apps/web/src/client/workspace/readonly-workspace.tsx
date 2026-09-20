import { EyeOpenIcon as Eye } from "@radix-ui/react-icons";
import { expenseSplitLabel, type TripPayload } from "../client-support.js";
import { useI18n } from "../i18n.js";
import { OverviewPage } from "./overview-page.js";

export function ReadonlyWorkspace({ payload }: { payload: TripPayload }) {
  const { formatMoney, messages } = useI18n();
  const names = new Map(
    payload.trip.participants.map((person) => [person.id, person.name]),
  );
  return (
    <section className="grid gap-5">
      <header className="surface grid gap-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Eye aria-hidden="true" />
          {messages.readOnlyShare}
        </div>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight break-anywhere">
            {payload.trip.name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {
              messages.youCanViewExpensesBalancesAndSettlementSuggestionsButCannotEditData
            }
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-2">
          <Stat
            label={messages.people}
            value={String(payload.trip.participants.length)}
          />
          <Stat
            label={messages.expenses}
            value={String(payload.trip.expenses.length)}
          />
          <Stat label={messages.base} value={payload.trip.baseCurrency} />
        </dl>
      </header>
      <OverviewPage payload={payload} readonly />
      <section
        className="surface grid gap-4"
        aria-labelledby="readonly-expenses"
      >
        <h3 className="text-lg font-semibold" id="readonly-expenses">
          {messages.completeExpenseHistory}
        </h3>
        {payload.trip.expenses.length ? (
          <ul className="divide-y rounded-xl border">
            {[...payload.trip.expenses]
              .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate))
              .map((expense) => (
                <li className="grid gap-1 p-3" key={expense.id}>
                  <div className="flex justify-between gap-3">
                    <strong className="break-anywhere">
                      {expense.description}
                    </strong>
                    <strong className="tabular-nums">
                      {formatMoney(expense.amountMinor, expense.currency)}
                    </strong>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {messages.datePaidByNameSplitWithSplit({
                      date: expense.expenseDate,
                      name: names.get(expense.paidById) ?? messages.unknown,
                      split: expenseSplitLabel(
                        payload.trip,
                        expense.participantIds,
                      ),
                    })}
                  </p>
                </li>
              ))}
          </ul>
        ) : (
          <p className="empty-copy">{messages.noExpensesYet}</p>
        )}
      </section>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/50 p-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}
