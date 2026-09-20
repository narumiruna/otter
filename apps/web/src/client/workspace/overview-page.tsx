import { currencyInfo, toMajor } from "@narumitw/otter-core/money";
import type { Settlement, Trip } from "@narumitw/otter-core/settlement";
import {
  ArrowRightIcon as ArrowRight,
  CheckCircledIcon as CheckCircle2,
  ChevronDownIcon as ChevronDown,
  TokensIcon as HandCoins,
  PersonIcon,
  PlusIcon,
  TrashIcon as Trash2,
} from "@radix-ui/react-icons";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  expenseSplitLabel,
  spendingSummary,
  type TripPayload,
  todayDate,
} from "../client-support.js";
import { localizeMessage, useI18n } from "../i18n.js";
import { ExpenseCategoryIcon } from "./expense-category-icon.js";
import { OverviewSummary } from "./overview-summary.js";
import { ActionError, useWorkspace } from "./workspace-context.js";
import {
  BalanceList,
  BusyButton,
  ConfirmDialog,
  FormField,
  SectionHeading,
} from "./workspace-ui.js";

export function OverviewPage({
  onAddExpense,
  onPeople,
  payload,
  readonly = false,
}: {
  onAddExpense?: () => void;
  onPeople?: () => void;
  payload: TripPayload;
  readonly?: boolean;
}) {
  const { messages } = useI18n();
  const { trip } = payload;
  if (trip.expenses.length === 0 && !trip.settlementPayments?.length) {
    return (
      <EmptyOverview
        trip={trip}
        onAddExpense={onAddExpense}
        onPeople={onPeople}
        readonly={readonly}
      />
    );
  }
  return (
    <div className="overview-grid">
      <OverviewSummary payload={payload} />
      <section
        className="surface overview-settlements grid gap-4"
        aria-labelledby="settlement-heading"
      >
        <SectionHeading
          description={
            messages.calculatedFromCurrentExpensesAndRecordedPayments
          }
        >
          <span id="settlement-heading">{messages.settleUp}</span>
          <span className="count-pill">
            {messages.countEntries({ count: payload.settlements.length })}
          </span>
        </SectionHeading>
        <SettlementList payload={payload} readonly={readonly} />
      </section>
      <section
        className="surface overview-balances grid gap-4"
        aria-labelledby="balances-heading"
      >
        <SectionHeading description={messages.seePaymentsAndSharesAtAGlance}>
          <span id="balances-heading">{messages.balances}</span>
        </SectionHeading>
        <BalanceList balances={payload.balances} />
      </section>
      <section
        className="surface overview-recent grid gap-4"
        aria-labelledby="recent-heading"
      >
        <SectionHeading>
          <span id="recent-heading">{messages.recentExpenses}</span>
        </SectionHeading>
        <RecentExpenses trip={trip} />
      </section>
      {trip.expenses.length ? <SpendingAnalysis trip={trip} /> : null}
    </div>
  );
}

function EmptyOverview({
  onAddExpense,
  onPeople,
  readonly,
  trip,
}: {
  onAddExpense?: () => void;
  onPeople?: () => void;
  readonly: boolean;
  trip: Trip;
}) {
  const { messages } = useI18n();
  if (readonly)
    return (
      <section
        className="surface overview-empty"
        aria-labelledby="overview-empty-heading"
      >
        <h3 id="overview-empty-heading">{messages.noExpensesYet}</h3>
        <p>{messages.thisGroupHasNotRecordedAnySharedExpenses}</p>
        <p>
          {
            messages.balancesAndSettlementSuggestionsWillAppearHereAfterYouAddExpenses
          }
        </p>
      </section>
    );
  const needsPeople = trip.participants.length < 2;
  return (
    <section
      className="surface overview-empty"
      aria-labelledby="overview-empty-heading"
    >
      <p className="overview-empty-status">{messages.noExpensesYet}</p>
      <h3 id="overview-empty-heading">
        {needsPeople
          ? messages.addTravelCompanionsFirst
          : messages.recordTheFirstSharedExpense}
      </h3>
      <p>
        {needsPeople
          ? messages.addThePeopleSplittingExpensesToCalculateEachBalance
          : messages.balancesAndSettlementSuggestionsWillAppearHereAfterYouAddExpenses}
      </p>
      <div className="flex flex-wrap gap-2">
        {needsPeople ? (
          <Button onClick={onPeople}>
            <PersonIcon aria-hidden="true" />
            {messages.addPerson}
          </Button>
        ) : (
          <Button onClick={onAddExpense}>
            <PlusIcon aria-hidden="true" />
            {messages.addExpense}
          </Button>
        )}
        {!needsPeople ? (
          <Button onClick={onPeople} variant="outline">
            {messages.managePeople}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function SettlementList({
  payload,
  readonly,
}: {
  payload: TripPayload;
  readonly: boolean;
}) {
  const { formatMoney, messages } = useI18n();
  if (payload.settlements.length === 0) {
    return (
      <div className="settled-state">
        <CheckCircle2 className="text-primary" aria-hidden="true" />
        <div>
          <strong>{messages.everythingIsSettled}</strong>
          <p className="text-sm text-muted-foreground">
            {messages.thereAreNoOutstandingPayments}
          </p>
        </div>
      </div>
    );
  }
  return (
    <ul className="settlement-list">
      {payload.settlements.map((settlement) => (
        <li
          className="settlement-item"
          key={`${settlement.fromId}:${settlement.toId}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <strong>{settlement.fromName}</strong>
            <ArrowRight
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <strong>{settlement.toName}</strong>
            <span className="ml-auto font-semibold tabular-nums">
              {formatMoney(settlement.amountMinor, settlement.currency)}
            </span>
          </div>
          {!readonly ? (
            <PaymentDialog settlement={settlement} tripId={payload.trip.id} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function PaymentDialog({
  settlement,
  tripId,
}: {
  settlement: Settlement;
  tripId: string;
}) {
  const { formatMoney, messages } = useI18n();
  const { offline, requestPayload } = useWorkspace();
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const form = useForm({
    defaultValues: {
      amount: String(toMajor(settlement.amountMinor, settlement.currency)),
      note: "",
      paidAt: todayDate(),
    },
  });
  const amount = Number(form.watch("amount"));
  const paymentMinor = Number.isFinite(amount)
    ? Math.round(amount * 10 ** currencyInfo[settlement.currency].minorUnits)
    : 0;
  const remaining = Math.max(0, settlement.amountMinor - paymentMinor);
  const submit = form.handleSubmit(async (values) => {
    setError("");
    try {
      await requestPayload(
        `/api/trips/${tripId}/settlement-payments`,
        {
          body: JSON.stringify({
            ...values,
            currency: settlement.currency,
            fromId: settlement.fromId,
            toId: settlement.toId,
          }),
          method: "POST",
        },
        messages.paymentRecorded,
      );
      setOpen(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : messages.unableToRecordPayment,
      );
    }
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="mt-3"
        disabled={offline}
        render={<Button disabled={offline} size="sm" variant="outline" />}
      >
        <HandCoins aria-hidden="true" />
        {messages.recordPayment}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{messages.recordSettlementPayment}</DialogTitle>
          <DialogDescription>
            {messages.fromPaysToTheFullSuggestedAmountIsPrefilled({
              from: settlement.fromName,
              to: settlement.toName,
            })}
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <ActionError message={error} />
          <FormField
            label={messages.paymentAmountCurrency({
              currency: settlement.currency,
            })}
          >
            <input
              className="form-control"
              inputMode="decimal"
              max={toMajor(settlement.amountMinor, settlement.currency)}
              min={1 / 10 ** currencyInfo[settlement.currency].minorUnits}
              {...form.register("amount", {
                required: messages.enterAPaymentAmount,
                validate: (value) => {
                  const minor = Math.round(
                    Number(value) *
                      10 ** currencyInfo[settlement.currency].minorUnits,
                  );
                  return (
                    (Number.isFinite(minor) &&
                      minor > 0 &&
                      minor <= settlement.amountMinor) ||
                    messages.thePaymentMustBeGreaterThan0AndNoMoreThanTheSuggestedAmount
                  );
                },
              })}
            />
            {form.formState.errors.amount ? (
              <span className="field-error">
                {form.formState.errors.amount.message}
              </span>
            ) : null}
          </FormField>
          <p className="rounded-lg bg-muted p-3 text-sm" aria-live="polite">
            {messages.expectedRemainder}
            <strong>{formatMoney(remaining, settlement.currency)}</strong>
          </p>
          <FormField label={messages.paymentDate}>
            <input
              className="form-control"
              type="date"
              {...form.register("paidAt", { required: true })}
            />
          </FormField>
          <FormField label={messages.noteOptional}>
            <input
              className="form-control"
              maxLength={160}
              {...form.register("note")}
            />
          </FormField>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              {messages.cancel}
            </DialogClose>
            <BusyButton
              busy={form.formState.isSubmitting}
              disabled={offline}
              type="submit"
            >
              {messages.recordPayment2}
            </BusyButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SettlementHistory({
  trip,
  readonly = false,
}: {
  trip: Trip;
  readonly?: boolean;
}) {
  const { formatMoney, messages } = useI18n();
  const { offline, requestPayload } = useWorkspace();
  const [error, setError] = useState("");
  const participantById = useMemo(
    () => new Map(trip.participants.map((person) => [person.id, person.name])),
    [trip.participants],
  );
  if (!trip.settlementPayments?.length) return null;
  return (
    <details className="disclosure">
      <summary>
        {messages.paymentHistory}{" "}
        <span className="summary-meta">
          {messages.countEntries({ count: trip.settlementPayments.length })}
        </span>
      </summary>
      <ActionError message={error} />
      <ul className="grid gap-2 pt-3">
        {trip.settlementPayments.map((payment) => (
          <li
            className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm"
            key={payment.id}
          >
            <span>
              {messages.dateFromPaidTo({
                date: payment.paidAt,
                from: participantById.get(payment.fromId) ?? "",
                to: participantById.get(payment.toId) ?? "",
              })}
            </span>
            <strong>
              {formatMoney(payment.amountMinor, payment.currency)}
            </strong>
            {payment.note ? (
              <span className="text-muted-foreground">{payment.note}</span>
            ) : null}
            {!readonly ? (
              <ConfirmDialog
                confirmLabel={messages.deletePayment}
                description={
                  messages.remainingSettlementSuggestionsWillBeRecalculated
                }
                destructive
                disabled={offline}
                onConfirm={async () => {
                  try {
                    setError("");
                    await requestPayload(
                      `/api/trips/${trip.id}/settlement-payments/${payment.id}`,
                      { method: "DELETE" },
                      messages.paymentDeleted,
                    );
                  } catch (caught) {
                    setError(
                      caught instanceof Error
                        ? caught.message
                        : messages.deleteFailed,
                    );
                  }
                }}
                title={messages.deleteThisPayment}
                trigger={
                  <Button className="ml-auto" size="sm" variant="ghost">
                    <Trash2 aria-hidden="true" />
                    {messages.delete}
                  </Button>
                }
              />
            ) : null}
          </li>
        ))}
      </ul>
    </details>
  );
}

function RecentExpenses({ trip }: { trip: Trip }) {
  const { formatMoney, messages } = useI18n();
  if (!trip.expenses.length)
    return <p className="empty-copy">{messages.noExpensesYet}</p>;
  const names = new Map(
    trip.participants.map((person) => [person.id, person.name]),
  );
  const recent = [...trip.expenses]
    .sort(
      (a, b) =>
        b.expenseDate.localeCompare(a.expenseDate) ||
        b.createdAt.localeCompare(a.createdAt),
    )
    .slice(0, 3);
  return (
    <ul>
      {recent.map((expense) => (
        <li className="recent-expense-row" key={expense.id}>
          <ExpenseCategoryIcon category={expense.category} />
          <div className="recent-expense-info">
            <strong>{expense.description}</strong>
            <span>
              {messages.datePaidByNameSplitWithSplit({
                date: expense.expenseDate,
                name: names.get(expense.paidById) ?? messages.unknown,
                split: expenseSplitLabel(trip, expense.participantIds),
              })}
            </span>
          </div>
          <strong className="recent-expense-amount">
            {formatMoney(expense.amountMinor, expense.currency)}
          </strong>
        </li>
      ))}
    </ul>
  );
}

function SpendingAnalysis({ trip }: { trip: Trip }) {
  const { formatMoney, messages } = useI18n();
  const summary = spendingSummary(trip);
  const charts = [
    {
      title: messages.dailySpending,
      rows: summary.dailyTotals.map((row) => ({
        label: row.date,
        value: row.amountMinor,
      })),
    },
    {
      title: messages.paidByPerson,
      rows: summary.payerTotals.map((row) => ({
        label: row.name,
        value: row.amountMinor,
      })),
    },
    {
      title: messages.byCategory,
      rows: summary.categoryTotals.map((row) => ({
        label: localizeMessage(row.category),
        value: row.amountMinor,
      })),
    },
  ];
  return (
    <details className="surface disclosure">
      <summary className="text-lg">
        <ChevronDown aria-hidden="true" />
        {messages.spendingAnalysis}{" "}
        <span className="summary-meta">
          {messages.totalAmount({
            amount: formatMoney(summary.totalMinor, trip.baseCurrency),
          })}
        </span>
      </summary>
      <div className="grid gap-4 pt-4 lg:grid-cols-3">
        {charts.map((chart) => (
          <div className="rounded-xl border p-4" key={chart.title}>
            <h4 className="mb-3 font-semibold">{chart.title}</h4>
            {chart.rows.length ? (
              <ul className="grid gap-3">
                {chart.rows.map((row) => (
                  <li className="grid gap-1 text-sm" key={row.label}>
                    <div className="flex justify-between gap-2">
                      <span>{row.label}</span>
                      <span className="tabular-nums">
                        {formatMoney(row.value, trip.baseCurrency)}
                      </span>
                    </div>
                    <span className="h-2 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.max(2, Math.round((row.value / Math.max(...chart.rows.map((item) => item.value), 1)) * 100))}%`,
                        }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-copy">{messages.noDataYet}</p>
            )}
          </div>
        ))}
      </div>
    </details>
  );
}
