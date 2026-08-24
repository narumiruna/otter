import {
  ArrowRightIcon as ArrowRight,
  CheckCircledIcon as CheckCircle2,
  ChevronDownIcon as ChevronDown,
  TokensIcon as HandCoins,
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
import { currencyInfo, formatMinor, toMajor } from "../../shared/money.js";
import type { Settlement, Trip } from "../../shared/settlement.js";
import {
  expenseSplitLabel,
  spendingSummary,
  type TripPayload,
  todayDate,
} from "../client-support.js";
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
  const { trip } = payload;
  return (
    <div className="grid gap-5">
      {trip.expenses.length === 0 ? (
        <EmptyOverview
          trip={trip}
          onAddExpense={onAddExpense}
          onPeople={onPeople}
          readonly={readonly}
        />
      ) : null}
      <section
        className="surface grid gap-4"
        aria-labelledby="settlement-heading"
      >
        <SectionHeading description="依目前支出與已記錄付款計算。">
          <span id="settlement-heading">待結清</span>
        </SectionHeading>
        <SettlementList payload={payload} readonly={readonly} />
      </section>
      <section
        className="surface grid gap-4"
        aria-labelledby="balances-heading"
      >
        <SectionHeading>
          <span id="balances-heading">每人餘額</span>
        </SectionHeading>
        <BalanceList balances={payload.balances} />
      </section>
      <section className="surface grid gap-4" aria-labelledby="recent-heading">
        <SectionHeading>
          <span id="recent-heading">最近支出</span>
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
  if (readonly)
    return (
      <section className="surface empty-state">
        <h3>還沒有支出</h3>
        <p>這個群組尚未記錄共同支出。</p>
      </section>
    );
  const needsPeople = trip.participants.length < 2;
  return (
    <section className="surface empty-state">
      <h3>{needsPeople ? "先新增同行成員" : "記錄第一筆共同支出"}</h3>
      <p>
        {needsPeople
          ? "加入要一起分帳的人，才能清楚算出每人餘額。"
          : "開始記帳後，總覽會自動顯示餘額與結清建議。"}
      </p>
      <div className="flex flex-wrap gap-2">
        {needsPeople ? (
          <Button onClick={onPeople}>新增成員</Button>
        ) : (
          <Button onClick={onAddExpense}>記一筆</Button>
        )}
        {!needsPeople ? (
          <Button onClick={onPeople} variant="outline">
            管理成員
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
  if (payload.settlements.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <CheckCircle2 className="text-primary" aria-hidden="true" />
        <div>
          <strong>目前已經打平</strong>
          <p className="text-sm text-muted-foreground">
            沒有尚待完成的結清款項。
          </p>
        </div>
      </div>
    );
  }
  return (
    <ul className="grid gap-3">
      {payload.settlements.map((settlement) => (
        <li
          className="rounded-xl border bg-card p-4"
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
              {formatMinor(settlement.amountMinor, settlement.currency)}
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
        "已記錄付款",
      );
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "無法記錄付款");
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
        記錄付款
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>記錄結清付款</DialogTitle>
          <DialogDescription>
            {settlement.fromName} 付給 {settlement.toName}；預設為完整建議金額。
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <ActionError message={error} />
          <FormField label={`付款金額（${settlement.currency}）`}>
            <input
              className="form-control"
              inputMode="decimal"
              max={toMajor(settlement.amountMinor, settlement.currency)}
              min={1 / 10 ** currencyInfo[settlement.currency].minorUnits}
              {...form.register("amount", {
                required: "請輸入付款金額",
                validate: (value) => {
                  const minor = Math.round(
                    Number(value) *
                      10 ** currencyInfo[settlement.currency].minorUnits,
                  );
                  return (
                    (Number.isFinite(minor) &&
                      minor > 0 &&
                      minor <= settlement.amountMinor) ||
                    "付款金額必須大於 0，且不能超過建議金額"
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
            套用後預計剩餘：
            <strong>{formatMinor(remaining, settlement.currency)}</strong>
          </p>
          <FormField label="付款日期">
            <input
              className="form-control"
              type="date"
              {...form.register("paidAt", { required: true })}
            />
          </FormField>
          <FormField label="備註（選填）">
            <input
              className="form-control"
              maxLength={160}
              {...form.register("note")}
            />
          </FormField>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              取消
            </DialogClose>
            <BusyButton
              busy={form.formState.isSubmitting}
              disabled={offline}
              type="submit"
            >
              確認記錄付款
            </BusyButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SettlementHistory({ trip }: { trip: Trip }) {
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
        付款紀錄{" "}
        <span className="summary-meta">
          {trip.settlementPayments.length} 筆
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
              {payment.paidAt} · {participantById.get(payment.fromId)} 付給{" "}
              {participantById.get(payment.toId)}
            </span>
            <strong>
              {formatMinor(payment.amountMinor, payment.currency)}
            </strong>
            {payment.note ? (
              <span className="text-muted-foreground">{payment.note}</span>
            ) : null}
            <ConfirmDialog
              confirmLabel="刪除付款紀錄"
              description="刪除後會重新計算剩餘結清建議。"
              destructive
              disabled={offline}
              onConfirm={async () => {
                try {
                  setError("");
                  await requestPayload(
                    `/api/trips/${trip.id}/settlement-payments/${payment.id}`,
                    { method: "DELETE" },
                    "已刪除付款紀錄",
                  );
                } catch (caught) {
                  setError(
                    caught instanceof Error ? caught.message : "刪除失敗",
                  );
                }
              }}
              title="刪除這筆付款紀錄？"
              trigger={
                <Button className="ml-auto" size="sm" variant="ghost">
                  <Trash2 aria-hidden="true" />
                  刪除
                </Button>
              }
            />
          </li>
        ))}
      </ul>
    </details>
  );
}

function RecentExpenses({ trip }: { trip: Trip }) {
  if (!trip.expenses.length) return <p className="empty-copy">還沒有支出。</p>;
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
    <ul className="divide-y rounded-xl border">
      {recent.map((expense) => (
        <li className="grid gap-1 p-3" key={expense.id}>
          <div className="flex justify-between gap-4">
            <strong className="break-anywhere">{expense.description}</strong>
            <span className="font-semibold tabular-nums">
              {formatMinor(expense.amountMinor, expense.currency)}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {expense.expenseDate} · {names.get(expense.paidById)} 付款 · 分給{" "}
            {expenseSplitLabel(trip, expense.participantIds)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function SpendingAnalysis({ trip }: { trip: Trip }) {
  const summary = spendingSummary(trip);
  const charts = [
    {
      title: "每日花費",
      rows: summary.dailyTotals.map((row) => ({
        label: row.date,
        value: row.amountMinor,
      })),
    },
    {
      title: "每人實付",
      rows: summary.payerTotals.map((row) => ({
        label: row.name,
        value: row.amountMinor,
      })),
    },
    {
      title: "分類占比",
      rows: summary.categoryTotals.map((row) => ({
        label: row.category,
        value: row.amountMinor,
      })),
    },
  ];
  return (
    <details className="surface disclosure">
      <summary className="text-lg">
        <ChevronDown aria-hidden="true" />
        花費分析{" "}
        <span className="summary-meta">
          總支出 {formatMinor(summary.totalMinor, trip.baseCurrency)}
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
                        {formatMinor(row.value, trip.baseCurrency)}
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
              <p className="empty-copy">尚無資料。</p>
            )}
          </div>
        ))}
      </div>
    </details>
  );
}
