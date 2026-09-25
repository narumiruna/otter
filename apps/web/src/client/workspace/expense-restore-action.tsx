import {
  type ExpenseHistoryPage,
  type ExpenseRevision,
  type ExpenseSnapshot,
  expenseIfMatch,
  isExpenseVersion,
  parseExpenseHistoryPage,
  type TripPayload,
} from "@narumitw/otter-contracts";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiResponseError, api } from "../client-support.js";
import { useI18n } from "../i18n.js";
import { ExpenseSnapshotDetails } from "./expense-snapshot-details.js";
import { ActionError, useWorkspace } from "./workspace-context.js";
import { BusyButton } from "./workspace-ui.js";

type ReviewedState = {
  version: number;
  snapshot: ExpenseSnapshot | null;
};

export function ExpenseRestoreAction({
  tripId,
  revision,
}: {
  tripId: string;
  revision: ExpenseRevision;
}) {
  const workspace = useWorkspace();
  const { messages } = useI18n();
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState<ReviewedState | null>(null);
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const reviewRequest = useRef<AbortController | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => () => reviewRequest.current?.abort(), []);
  const missingPerson = [
    revision.snapshot.expense.paidById,
    ...revision.snapshot.expense.participantIds,
  ].some((id) => !workspace.payload.trip.participants.some((p) => p.id === id));
  const disabled =
    workspace.offline ||
    !!workspace.payload.trip.archivedAt ||
    workspace.payload.readonly ||
    missingPerson;

  async function loadReview() {
    reviewRequest.current?.abort();
    const controller = new AbortController();
    reviewRequest.current = controller;
    setLoading(true);
    setReview(null);
    setError("");
    try {
      const path = `/api/trips/${encodeURIComponent(tripId)}`;
      const [payload, historyValue] = await Promise.all([
        api<TripPayload>(path, { signal: controller.signal }),
        api<ExpenseHistoryPage>(
          `${path}/expense-history?expenseId=${encodeURIComponent(revision.expenseId)}&limit=1`,
          { signal: controller.signal },
        ),
      ]);
      if (controller.signal.aborted) return;
      if (payload.trip.archivedAt || payload.readonly)
        throw new Error(messages.expenseRestoreUnavailable);
      const people = new Set(payload.trip.participants.map((p) => p.id));
      if (
        !people.has(revision.snapshot.expense.paidById) ||
        revision.snapshot.expense.participantIds.some((id) => !people.has(id))
      )
        throw new Error(messages.expenseRestoreMissingPerson);
      const latest = parseExpenseHistoryPage(historyValue).latestRevision;
      const current = payload.trip.expenses.find(
        (expense) => expense.id === revision.expenseId,
      );
      const version = current?.version ?? latest?.version;
      if (
        !isExpenseVersion(version) ||
        (!current && latest?.action !== "deleted")
      )
        throw new Error(messages.expenseRestoreUnavailable);
      setReview({
        version,
        snapshot: current
          ? {
              schemaVersion: 1,
              expense: current,
              participants: payload.trip.participants,
              receipt: null,
            }
          : null,
      });
    } catch (caught) {
      if (!controller.signal.aborted)
        setError(
          caught instanceof Error ? caught.message : messages.loadingFailed,
        );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  function close() {
    reviewRequest.current?.abort();
    setOpen(false);
    setReview(null);
    setError("");
    setLoading(false);
    trigger.current?.focus();
  }

  async function restore() {
    if (!review || conflict || disabled) return;
    setBusy(true);
    setError("");
    try {
      await workspace.requestPayload(
        `/api/trips/${encodeURIComponent(tripId)}/expenses/${encodeURIComponent(revision.expenseId)}/restore`,
        {
          method: "POST",
          headers: { "If-Match": expenseIfMatch(review.version) },
          body: JSON.stringify({ revisionId: revision.id }),
        },
        messages.expenseRestored,
        true,
      );
      close();
    } catch (caught) {
      if (caught instanceof ApiResponseError && caught.status === 412) {
        setConflict(true);
        await loadReview();
      } else {
        setError(
          caught instanceof Error ? caught.message : messages.restoreFailed,
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Button
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          if (open) close();
          else {
            setOpen(true);
            setConflict(false);
            void loadReview();
          }
        }}
        ref={trigger}
        size="sm"
        type="button"
        variant="secondary"
      >
        {messages.expenseRestoreVersion({ version: revision.version })}
      </Button>
      {open ? (
        <section
          aria-label={messages.expenseRestoreTitle}
          className="grid gap-3 rounded-lg border bg-background p-3"
        >
          <h4 className="font-semibold">{messages.expenseRestoreTitle}</h4>
          <p className="text-sm">{messages.expenseRestoreDescription}</p>
          {loading ? <p role="status">{messages.loading}</p> : null}
          {review ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <h5 className="font-semibold">
                  {messages.expenseHistoryBefore}
                </h5>
                {review.snapshot ? (
                  <ExpenseSnapshotDetails snapshot={review.snapshot} />
                ) : (
                  <p>{messages.expenseHistoryDeleted}</p>
                )}
              </div>
              <div>
                <h5 className="font-semibold">
                  {messages.expenseHistoryAfter}
                </h5>
                <ExpenseSnapshotDetails snapshot={revision.snapshot} />
              </div>
            </div>
          ) : null}
          <p className="text-sm">
            {review?.snapshot
              ? messages.expenseRestoreKeepsReceipt
              : messages.expenseRestoreNoReceipt}
          </p>
          {conflict ? (
            <div className="grid gap-2">
              <p role="alert">{messages.expenseRestoreConflict}</p>
              <Button
                disabled={!review || loading}
                onClick={() => setConflict(false)}
                type="button"
                variant="secondary"
              >
                {messages.confirmLatestExpenseVersion}
              </Button>
            </div>
          ) : null}
          <ActionError message={error} />
          <div className="flex justify-end gap-2">
            <Button onClick={close} type="button" variant="secondary">
              {messages.cancel}
            </Button>
            <BusyButton
              busy={busy}
              disabled={!review || conflict || disabled || loading}
              onClick={() => void restore()}
              type="button"
            >
              {messages.expenseRestoreConfirm}
            </BusyButton>
          </div>
        </section>
      ) : null}
      {missingPerson ? (
        <p className="text-sm text-muted-foreground">
          {messages.expenseRestoreMissingPerson}
        </p>
      ) : null}
    </div>
  );
}
