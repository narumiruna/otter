import type { Expense, Trip, TripPayload } from "@narumitw/otter-contracts";
import { TrashIcon, UploadIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "../client-support.js";
import { useI18n } from "../i18n.js";
import { ExpenseConflictReview, useExpenseVersion } from "./expense-version.js";
import { ActionError, useWorkspace } from "./workspace-context.js";
import { ConfirmDialog } from "./workspace-ui.js";

export function ReceiptControls({
  expense,
  trip,
}: {
  expense: Expense;
  trip: Trip;
}) {
  const { messages } = useI18n();
  const { announce, offline, replacePayload } = useWorkspace();
  const version = useExpenseVersion(expense, trip.id);
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
    <>
      <label className="button-outline button-sm">
        <UploadIcon aria-hidden="true" />
        <span>{busy ? messages.uploading : messages.uploadReceipt}</span>
        <input
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy || offline}
          onClick={version.begin}
          onChange={(event) => void upload(event.target.files?.[0])}
        />
      </label>
      {expense.receiptUrl ? (
        <a
          className="button-outline button-sm"
          href={expense.receiptUrl}
          target="_blank"
          rel="noreferrer"
        >
          {messages.viewReceipt}
        </a>
      ) : null}
      <ActionError message={error} />
      <ExpenseConflictReview state={version} />
      {file && !version.conflict && !version.missing ? (
        <Button disabled={busy || offline} onClick={() => void upload(file)}>
          {messages.uploadReceipt}
        </Button>
      ) : null}
      {expense.receiptUrl ? (
        <DeleteExpenseAction expense={expense} trip={trip} receipt />
      ) : null}
    </>
  );
}
export function DeleteExpenseAction({
  expense,
  trip,
  receipt = false,
}: {
  expense: Expense;
  trip: Trip;
  receipt?: boolean;
}) {
  const { messages } = useI18n();
  const { offline, requestPayload } = useWorkspace();
  const version = useExpenseVersion(expense, trip.id);
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
          <ExpenseConflictReview state={version} />
        </>
      }
      destructive
      disabled={offline}
      onOpenChange={(open) => {
        if (open) version.begin();
      }}
      onConfirm={async () => {
        try {
          await requestPayload(
            `/api/trips/${trip.id}/expenses/${expense.id}${receipt ? "/receipt" : ""}`,
            { method: "DELETE", headers: version.headers() },
            receipt ? messages.receiptDeleted : messages.expenseDeleted,
            !receipt,
          );
        } catch (error) {
          version.handleError(error);
          throw error;
        }
      }}
      title={receipt ? messages.deleteThisReceipt : messages.deleteThisExpense}
      trigger={
        <Button size="sm" variant="ghost">
          <TrashIcon aria-hidden="true" />
          {receipt ? messages.deleteReceipt : messages.delete}
        </Button>
      }
    />
  );
}
