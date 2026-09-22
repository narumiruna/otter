import type { Expense, Trip, TripPayload } from "@narumitw/otter-contracts";
import { TrashIcon, UploadIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "../client-support.js";
import { useI18n } from "../i18n.js";
import {
  ExpenseConflictReview,
  type ExpenseVersionState,
  useExpenseVersion,
} from "./expense-version.js";
import { ReceiptPreview } from "./receipt-preview.js";
import { ActionError, useWorkspace } from "./workspace-context.js";
import { ConfirmDialog } from "./workspace-ui.js";

export function ReceiptControls({
  expense,
  onVersionConfirm,
  trip,
  versionState,
}: {
  expense: Expense;
  onVersionConfirm?: () => void;
  trip: Trip;
  versionState?: ExpenseVersionState;
}) {
  const { messages } = useI18n();
  const { announce, offline, replacePayload } = useWorkspace();
  const ownVersionState = useExpenseVersion(expense, trip.id);
  const version = versionState ?? ownVersionState;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File>();
  async function upload(nextFile: File | undefined) {
    if (!nextFile || offline) return;
    setFile(nextFile);
    setBusy(true);
    setError("");
    try {
      const payload = await api<TripPayload>(
        `/api/trips/${trip.id}/expenses/${expense.id}/receipt`,
        {
          body: nextFile,
          method: "PUT",
          headers: { "Content-Type": nextFile.type, ...version.headers() },
        },
      );
      replacePayload(payload);
      const updatedExpense = payload.trip.expenses.find(
        (candidate) => candidate.id === expense.id,
      );
      if (updatedExpense) version.accept(updatedExpense);
      announce(messages.receiptUploaded);
      setFile(undefined);
    } catch (caught) {
      version.handleError(caught);
      setError(
        caught instanceof Error ? caught.message : messages.receiptUploadFailed,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="button-outline button-sm">
          <UploadIcon aria-hidden="true" />
          <span>{busy ? messages.uploading : messages.uploadReceipt}</span>
          <input
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy || offline}
            onClick={versionState ? undefined : version.begin}
            onChange={(event) => void upload(event.target.files?.[0])}
          />
        </label>
        {expense.receiptUrl ? (
          <ReceiptPreview name={expense.description} url={expense.receiptUrl} />
        ) : null}
        {expense.receiptUrl ? (
          <DeleteExpenseAction
            expense={expense}
            onVersionConfirm={onVersionConfirm}
            trip={trip}
            receipt
            versionState={version}
          />
        ) : null}
      </div>
      <ActionError message={error} />
      {versionState ? null : <ExpenseConflictReview state={version} />}
      {file && !version.conflict && !version.missing ? (
        <Button
          disabled={busy || offline}
          onClick={() => void upload(file)}
          type="button"
        >
          {messages.uploadReceipt}
        </Button>
      ) : null}
    </div>
  );
}
export function DeleteExpenseAction({
  expense,
  onDeleted,
  onVersionConfirm,
  trip,
  receipt = false,
  versionState,
}: {
  expense: Expense;
  onDeleted?: () => void;
  onVersionConfirm?: () => void;
  trip: Trip;
  receipt?: boolean;
  versionState?: ExpenseVersionState;
}) {
  const { messages } = useI18n();
  const { offline, requestPayload } = useWorkspace();
  const ownVersionState = useExpenseVersion(expense, trip.id);
  const version = versionState ?? ownVersionState;
  return (
    <ConfirmDialog
      confirmLabel={
        receipt
          ? messages.deleteReceipt
          : messages.deleteName({ name: expense.description })
      }
      description={
        <>
          <p>
            {receipt
              ? messages.youCanUploadAnotherReceiptLaterTheExpenseWillNotBeDeleted
              : messages.deleteExpenseHistoryRetained}
          </p>
          <ExpenseConflictReview state={version} onConfirm={onVersionConfirm} />
        </>
      }
      destructive
      disabled={offline}
      onOpenChange={(open) => {
        if (open && !versionState) version.begin();
      }}
      onConfirm={async () => {
        try {
          const payload = await requestPayload(
            `/api/trips/${trip.id}/expenses/${expense.id}${receipt ? "/receipt" : ""}`,
            { method: "DELETE", headers: version.headers() },
            receipt ? messages.receiptDeleted : messages.expenseDeleted,
            !receipt,
          );
          if (receipt) {
            const updatedExpense = payload.trip.expenses.find(
              (candidate) => candidate.id === expense.id,
            );
            if (updatedExpense) version.accept(updatedExpense);
          } else {
            onDeleted?.();
          }
        } catch (error) {
          version.handleError(error);
          throw error;
        }
      }}
      title={receipt ? messages.deleteThisReceipt : messages.deleteThisExpense}
      trigger={
        <Button
          size="sm"
          type="button"
          variant={receipt ? "ghost" : "destructive"}
        >
          <TrashIcon aria-hidden="true" />
          {receipt ? messages.deleteReceipt : messages.delete}
        </Button>
      }
    />
  );
}
