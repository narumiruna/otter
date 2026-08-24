import {
  DownloadIcon as Download,
  FileTextIcon as FileInput,
  UploadIcon as FileUp,
  ReaderIcon as Printer,
} from "@radix-ui/react-icons";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  type TripBackupV1,
  validateTripBackupV1,
} from "../../shared/backup.js";
import {
  parseExpenseImportCsv,
  tripExpensesCsv,
  tripResultsCsv,
} from "../../shared/csv.js";
import {
  api,
  downloadText,
  safeFilename,
  type TripPayload,
} from "../client-support.js";
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
  const { announce } = useWorkspace();
  const { trip } = payload;
  return (
    <details className="surface disclosure">
      <summary>
        <Download aria-hidden="true" />
        <span>資料與匯出</span>
        <span className="summary-meta">CSV、列印、備份與還原</span>
      </summary>
      <div className="grid gap-6 pt-5">
        <section className="grid gap-3">
          <SectionHeading description="匯出不會修改群組資料。">
            匯出與列印
          </SectionHeading>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                downloadText(
                  `${safeFilename(trip.name)}-expenses.csv`,
                  tripExpensesCsv(trip),
                );
                announce("已匯出支出 CSV");
              }}
            >
              匯出支出 CSV
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
                announce("已匯出結算 CSV");
              }}
            >
              匯出結算 CSV
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer aria-hidden="true" />
              列印
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
      announce("已下載完整備份");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "下載失敗");
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
        下載完整備份
      </BusyButton>
      <ActionError message={error} />
    </>
  );
}

function CsvImport({ payload }: { payload: TripPayload }) {
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
        "已匯入支出 CSV",
        true,
      );
      setText("");
      setFilename("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "匯入失敗");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="grid gap-3 border-t pt-5">
      <SectionHeading description="先檢查所有列；有任何錯誤時不會寫入資料。">
        匯入支出 CSV
      </SectionHeading>
      <label className="button-outline w-fit">
        <FileUp aria-hidden="true" />
        選擇 CSV
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
          <strong>匯入預覽</strong>
          <p className="mt-1">
            可匯入 {preview.rows.length} 列；{preview.errors.length} 個錯誤。
          </p>
          {preview.errors.length ? (
            <ul className="mt-2 list-disc pl-5 text-destructive">
              {preview.errors.map((item) => (
                <li key={`${item.row}:${item.message}`}>
                  第 {item.row} 列：{item.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {preview && !preview.errors.length && preview.rows.length ? (
        <ConfirmDialog
          confirmLabel={`匯入 ${preview.rows.length} 筆支出`}
          disabled={offline}
          description={`確認後會一次新增 ${preview.rows.length} 筆支出並重新計算餘額。`}
          onConfirm={apply}
          title="套用 CSV 匯入？"
          trigger={<BusyButton busy={busy}>預覽完成，套用匯入</BusyButton>}
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
      setError(caught instanceof Error ? caught.message : "備份格式錯誤");
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
      workspace?.announce("已還原備份為新群組");
      onRestored(restored);
      setBackup(null);
      setFilename("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "還原失敗");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="grid gap-3 border-t pt-5">
      <SectionHeading description="還原會建立新群組，不會覆蓋目前資料。">
        還原 JSON 備份
      </SectionHeading>
      <label className="button-outline w-fit">
        <FileInput aria-hidden="true" />
        選擇 JSON 備份
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
          <strong>還原預覽：{backup.trip.name}</strong>
          <p className="mt-1">
            {backup.trip.participants.length} 位成員 ·{" "}
            {backup.trip.expenses.length} 筆支出 ·{" "}
            {backup.trip.settlementPayments?.length ?? 0} 筆付款紀錄 · 基準{" "}
            {backup.trip.baseCurrency}
          </p>
        </div>
      ) : null}
      {backup ? (
        <ConfirmDialog
          confirmLabel="建立新群組"
          disabled={offline}
          description={`將從備份建立「${backup.trip.name}」，不會更動任何現有群組。`}
          onConfirm={restore}
          title="套用備份還原？"
          trigger={<BusyButton busy={busy}>預覽完成，建立新群組</BusyButton>}
        />
      ) : null}
    </section>
  );
}
