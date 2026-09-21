import {
  type Expense,
  expenseIfMatch,
  isExpenseVersion,
  type TripPayload,
} from "@narumitw/otter-contracts";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiResponseError, api } from "../client-support.js";
import { useI18n } from "../i18n.js";
import { ExpenseSnapshotDetails } from "./expense-history-dialog.js";
import { ActionError } from "./workspace-context.js";

export function useExpenseVersion(
  expense: Expense | undefined,
  tripId: string,
) {
  const { messages } = useI18n();
  const [version, setVersion] = useState(expense?.version);
  const [conflict, setConflict] = useState(false);
  const [missing, setMissing] = useState(false);
  const [latest, setLatest] = useState<{
    expense: Expense;
    trip: TripPayload["trip"];
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const begin = () => {
    setVersion(expense?.version);
    setConflict(false);
    setMissing(false);
    setLatest(null);
    setError("");
  };
  const handleError = (caught: unknown) => {
    if (
      caught instanceof ApiResponseError &&
      (caught.status === 412 || caught.status === 404 || caught.status === 428)
    ) {
      setConflict(true);
      setLatest(null);
      if (caught.status === 404) setMissing(true);
    }
  };
  const review = async () => {
    if (!expense) return;
    setBusy(true);
    setError("");
    try {
      const payload = await api<TripPayload>(
        `/api/trips/${encodeURIComponent(tripId)}`,
      );
      const current = payload.trip.expenses.find((e) => e.id === expense.id);
      if (!current) {
        setMissing(true);
        setLatest(null);
        return;
      }
      if (!isExpenseVersion(current.version))
        throw new Error(messages.expenseVersionMissing);
      setLatest({ expense: current, trip: payload.trip });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : messages.loadingFailed,
      );
    } finally {
      setBusy(false);
    }
  };
  const headers = () => {
    if (conflict || missing) throw new Error(messages.expenseVersionConflict);
    if (!isExpenseVersion(version))
      throw new Error(messages.expenseVersionMissing);
    return { "If-Match": expenseIfMatch(version) };
  };
  return {
    begin,
    headers,
    handleError,
    conflict,
    missing,
    latest,
    error,
    busy,
    review,
    confirm: () => {
      if (latest && !missing) {
        setVersion(latest.expense.version);
        setConflict(false);
      }
    },
  };
}
export function ExpenseConflictReview({
  state,
}: {
  state: ReturnType<typeof useExpenseVersion>;
}) {
  const { messages } = useI18n();
  if (!state.conflict && !state.missing) return null;
  return (
    <section
      className="grid gap-3 rounded-lg border p-3"
      aria-label={messages.reviewLatestExpense}
    >
      <p role="alert">
        {state.missing
          ? messages.latestExpenseMissing
          : messages.expenseVersionConflict}
      </p>
      {!state.missing ? (
        <Button
          type="button"
          variant="outline"
          disabled={state.busy}
          onClick={() => void state.review()}
        >
          {messages.reviewLatestExpense}
        </Button>
      ) : null}
      <ActionError message={state.error} />
      {state.latest ? (
        <>
          <p>v{state.latest.expense.version}</p>
          <ExpenseSnapshotDetails
            snapshot={{
              schemaVersion: 1,
              expense: state.latest.expense,
              participants: state.latest.trip.participants,
              receipt: null,
            }}
          />
          <p className="break-anywhere">
            {messages.receipt}: {state.latest.expense.receiptId ?? "—"}
          </p>
          <Button type="button" onClick={state.confirm}>
            {messages.confirmLatestExpenseVersion}
          </Button>
        </>
      ) : null}
    </section>
  );
}
