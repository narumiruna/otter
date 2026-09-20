import {
  type TripBackupV1,
  validateTripBackupV1,
} from "@narumitw/otter-core/backup";
import {
  parseExpenseImportCsv,
  tripExpensesCsv,
  tripResultsCsv,
} from "@narumitw/otter-core/csv";
import {
  DownloadIcon as Download,
  FileTextIcon as FileInput,
  UploadIcon as FileUp,
  ReaderIcon as Printer,
} from "@radix-ui/react-icons";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  api,
  downloadText,
  safeFilename,
  type TripPayload,
} from "../client-support.js";
import { localizeMessage, useI18n } from "../i18n.js";
import {
  ActionError,
  useOptionalWorkspace,
  useWorkspace,
} from "./workspace-context.js";
import { BusyButton, ConfirmDialog, SectionHeading } from "./workspace-ui.js";

export function DataSettings({
  onRestored,
  payload,
}: {
  onRestored: (payload: TripPayload) => void;
  payload: TripPayload;
}) {
  const { messages } = useI18n();
  const { announce } = useWorkspace();
  const { trip } = payload;
  return (
    <details className="surface disclosure" name="trip-settings">
      <summary>
        <Download aria-hidden="true" />
        <span>{messages.dataAndExport}</span>
        <span className="summary-meta">
          {messages.csvPrintBackupAndRestore}
        </span>
      </summary>
      <div className="grid gap-6 pt-5">
        <section className="grid gap-3">
          <SectionHeading
            description={messages.exportingDoesNotChangeGroupData}
          >
            {messages.exportAndPrint}
          </SectionHeading>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                downloadText(
                  `${safeFilename(trip.name)}-expenses.csv`,
                  tripExpensesCsv(trip),
                );
                announce(messages.expenseCsvExported);
              }}
            >
              {messages.exportExpenseCsv}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                downloadText(
                  `${safeFilename(trip.name)}-results.csv`,
                  tripResultsCsv(
                    payload.balances,
                    payload.settlements,
                    trip.settlementPayments,
                    trip.participants,
                  ),
                );
                announce(messages.settlementCsvExported);
              }}
            >
              {messages.exportSettlementCsv}
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer aria-hidden="true" />
              {messages.print}
            </Button>
            <BackupDownload tripId={trip.id} name={trip.name} />
          </div>
        </section>
        {!trip.archivedAt ? <CsvImport payload={payload} /> : null}
        <RestoreBackup onRestored={onRestored} />
      </div>
    </details>
  );
}

function BackupDownload({ name, tripId }: { name: string; tripId: string }) {
  const { messages } = useI18n();
  const { announce, offline } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    setBusy(true);
    setError("");
    try {
      const backup = await api<unknown>(`/api/trips/${tripId}/backup`);
      downloadText(
        `${safeFilename(name)}-backup.json`,
        JSON.stringify(backup, null, 2),
        "application/json;charset=utf-8",
      );
      announce(messages.completeBackupDownloaded);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : messages.downloadFailed,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <BusyButton
        busy={busy}
        disabled={offline}
        onClick={() => void download()}
        variant="outline"
      >
        <Download aria-hidden="true" />
        {messages.downloadCompleteBackup}
      </BusyButton>
      <ActionError message={error} />
    </>
  );
}

function CsvImport({ payload }: { payload: TripPayload }) {
  const { messages } = useI18n();
  const { offline, requestPayload } = useWorkspace();
  const [text, setText] = useState("");
  const [filename, setFilename] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const preview = text
    ? parseExpenseImportCsv(
        text,
        payload.trip.participants.map((person) => person.name),
      )
    : null;
  async function apply() {
    setBusy(true);
    setError("");
    try {
      await requestPayload(
        `/api/trips/${payload.trip.id}/expenses/import`,
        { body: JSON.stringify({ csv: text }), method: "POST" },
        messages.expenseCsvImported,
        true,
      );
      setText("");
      setFilename("");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : messages.importFailed,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="grid gap-3 border-t pt-5">
      <SectionHeading
        description={
          messages.allRowsAreCheckedFirstNoDataIsWrittenIfAnyRowHasAnError
        }
      >
        {messages.importExpenseCsv}
      </SectionHeading>
      <label className="button-outline w-fit">
        <FileUp aria-hidden="true" />
        {messages.chooseCsv}
        <input
          className="sr-only"
          type="file"
          accept=".csv,text/csv"
          disabled={offline}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setFilename(file.name);
            void file.text().then(setText);
          }}
        />
      </label>
      {filename ? <p className="text-sm">{filename}</p> : null}
      <ActionError message={error} />
      {preview ? (
        <div
          className="rounded-xl border bg-muted/40 p-4 text-sm"
          aria-live="polite"
        >
          <strong>{messages.importPreview}</strong>
          <p className="mt-1">
            {messages.rowsRowsCanBeImportedErrorsErrors({
              rows: preview.rows.length,
              errors: preview.errors.length,
            })}
          </p>
          {preview.errors.length ? (
            <ul className="mt-2 list-disc pl-5 text-destructive">
              {preview.errors.map((item) => (
                <li key={`${item.row}:${item.message}`}>
                  {messages.rowRowMessage({
                    row: item.row,
                    message: localizeMessage(item.message),
                  })}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {preview && !preview.errors.length && preview.rows.length ? (
        <ConfirmDialog
          confirmLabel={messages.importCountExpenses({
            count: preview.rows.length,
          })}
          disabled={offline}
          description={messages.thisWillAddCountExpensesAtOnceAndRecalculateBalances(
            {
              count: preview.rows.length,
            },
          )}
          onConfirm={apply}
          title={messages.applyCsvImport}
          trigger={<BusyButton busy={busy}>{messages.applyImport}</BusyButton>}
        />
      ) : null}
    </section>
  );
}

export function RestoreBackup({
  onRestored,
}: {
  onRestored: (payload: TripPayload) => void;
}) {
  const { messages } = useI18n();
  const workspace = useOptionalWorkspace();
  const offline = workspace?.offline ?? !navigator.onLine;
  const [backup, setBackup] = useState<TripBackupV1 | null>(null);
  const [filename, setFilename] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function choose(file: File | undefined) {
    if (!file) return;
    setFilename(file.name);
    setBackup(null);
    setError("");
    try {
      setBackup(validateTripBackupV1(JSON.parse(await file.text())));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? localizeMessage(caught.message)
          : messages.invalidBackupFormat,
      );
    }
  }
  async function restore() {
    if (!backup) return;
    setBusy(true);
    setError("");
    try {
      const restored = await api<TripPayload>("/api/trips/restore", {
        body: JSON.stringify(backup),
        method: "POST",
      });
      workspace?.replacePayload(restored);
      await workspace?.refreshCollection();
      workspace?.announce(messages.backupRestoredAsANewGroup);
      onRestored(restored);
      setBackup(null);
      setFilename("");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : messages.restoreFailed,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="grid gap-3 border-t pt-5">
      <SectionHeading
        description={
          messages.restoringCreatesANewGroupAndDoesNotOverwriteCurrentData
        }
      >
        {messages.restoreJsonBackup}
      </SectionHeading>
      <label className="button-outline w-fit">
        <FileInput aria-hidden="true" />
        {messages.chooseJsonBackup}
        <input
          className="sr-only"
          type="file"
          accept="application/json,.json"
          disabled={offline}
          onChange={(event) => void choose(event.target.files?.[0])}
        />
      </label>
      {filename ? <p className="text-sm">{filename}</p> : null}
      <ActionError message={error} />
      {backup ? (
        <div className="rounded-xl border bg-muted/40 p-4 text-sm">
          <strong>
            {messages.restorePreviewName({ name: backup.trip.name })}
          </strong>
          <p className="mt-1">
            {messages.peoplePeopleExpensesExpensesPaymentsPaymentsBaseCurrency({
              people: backup.trip.participants.length,
              expenses: backup.trip.expenses.length,
              payments: backup.trip.settlementPayments?.length ?? 0,
              currency: backup.trip.baseCurrency,
            })}
          </p>
        </div>
      ) : null}
      {backup ? (
        <ConfirmDialog
          confirmLabel={messages.createNewGroup}
          disabled={offline}
          description={messages.aNewGroupNamedNameWillBeCreatedWithoutChangingExistingGroups(
            {
              name: backup.trip.name,
            },
          )}
          onConfirm={restore}
          title={messages.restoreThisBackup}
          trigger={
            <BusyButton busy={busy}>{messages.createNewGroup2}</BusyButton>
          }
        />
      ) : null}
    </section>
  );
}
