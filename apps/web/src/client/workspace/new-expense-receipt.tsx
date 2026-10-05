import {
  type Expense,
  expenseIfMatch,
  type Trip,
  type TripPayload,
} from "@narumitw/otter-contracts";
import { CameraIcon, UploadIcon } from "@radix-ui/react-icons";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "../client-support.js";
import { useI18n } from "../i18n.js";
import { ExpenseConflictReview, useExpenseVersion } from "./expense-version.js";
import { ActionError, useWorkspace } from "./workspace-context.js";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 5 * 1024 * 1024;

export function receiptFileError(
  file: File,
  messages: ReturnType<typeof useI18n>["messages"],
): string {
  if (!imageTypes.has(file.type))
    return messages.receiptsMustBeJpegPngOrWebpImages;
  if (!file.size) return messages.chooseAReceiptImage;
  if (file.size > maxBytes) return messages.receiptFileTooLarge;
  return "";
}

export function NewExpenseReceiptPicker({
  disabled,
  busy = false,
  file,
  onlineOnly = false,
  onChange,
}: {
  disabled: boolean;
  busy?: boolean;
  file?: File;
  onlineOnly?: boolean;
  onChange: (file?: File) => void;
}) {
  const { messages } = useI18n();
  const id = useId();
  const input = (capture: boolean) => (
    <input
      id={`${id}-${capture ? "camera" : "upload"}`}
      className="sr-only"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      capture={capture ? "environment" : undefined}
      disabled={disabled}
      onChange={(event) => {
        onChange(event.currentTarget.files?.[0]);
        event.currentTarget.value = "";
      }}
    />
  );
  return (
    <section
      aria-label={messages.receipt}
      className="grid gap-3 rounded-xl border bg-muted/50 p-4"
    >
      <div>
        <h3 className="font-semibold">{messages.receipt}</h3>
        <p className="text-sm text-muted-foreground">
          {messages.receiptFileRequirements}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="button-outline button-sm" htmlFor={`${id}-upload`}>
          <UploadIcon aria-hidden="true" />
          <span>{messages.selectReceiptPhoto}</span>
          {input(false)}
        </label>
        <label className="button-outline button-sm" htmlFor={`${id}-camera`}>
          <CameraIcon aria-hidden="true" />
          <span>{messages.takeReceiptPhoto}</span>
          {input(true)}
        </label>
      </div>
      {onlineOnly ? (
        <p className="text-sm text-muted-foreground">
          {messages.receiptOnlineOnly}
        </p>
      ) : null}
      {file ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="break-anywhere">{file.name}</span>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onChange(undefined)}
          >
            {messages.removeReceiptPhoto}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

export async function uploadNewExpenseReceipt(
  tripId: string,
  expense: Expense,
  file: File,
  ifMatch = expenseIfMatch(expense.version),
): Promise<TripPayload> {
  return api<TripPayload>(
    `/api/trips/${encodeURIComponent(tripId)}/expenses/${encodeURIComponent(expense.id)}/receipt`,
    {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
        "If-Match": ifMatch,
      },
    },
  );
}

export function CreatedReceiptRecovery({
  expense,
  file,
  initialError,
  onDone,
  trip,
}: {
  expense: Expense;
  file: File;
  initialError: unknown;
  onDone: () => void;
  trip: Trip;
}) {
  const { messages } = useI18n();
  const { offline, replacePayload, refreshCollection, announce } =
    useWorkspace();
  const version = useExpenseVersion(expense, trip.id, initialError);
  const [error, setError] = useState(
    initialError instanceof Error
      ? initialError.message
      : messages.receiptUploadFailed,
  );
  const [busy, setBusy] = useState(false);

  const retry = async () => {
    setBusy(true);
    setError("");
    try {
      const payload = await uploadNewExpenseReceipt(
        trip.id,
        expense,
        file,
        version.headers()["If-Match"],
      );
      replacePayload(payload);
      announce(messages.receiptUploaded);
      await refreshCollection().catch(() => announce(messages.loadingFailed));
      onDone();
    } catch (caught) {
      version.handleError(caught);
      setError(
        caught instanceof Error ? caught.message : messages.receiptUploadFailed,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="surface grid gap-4" aria-label={messages.receipt}>
      <h2 className="font-semibold">{messages.expenseSavedReceiptFailed}</h2>
      <p>{file.name}</p>
      <ActionError message={error} />
      <ExpenseConflictReview state={version} />
      {version.latest?.expense.receiptId ? (
        <p role="status">{messages.receiptAlreadyAttached}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={
            busy ||
            offline ||
            version.conflict ||
            version.missing ||
            !!version.latest?.expense.receiptId
          }
          onClick={() => void retry()}
        >
          {busy ? messages.uploading : messages.retryReceiptUpload}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={onDone}
        >
          {messages.uploadReceiptLater}
        </Button>
      </div>
      {offline ? <p>{messages.receiptOnlineOnly}</p> : null}
    </section>
  );
}
