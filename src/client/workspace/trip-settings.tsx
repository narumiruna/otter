import {
  ArchiveIcon as Archive,
  TokensIcon as Calculator,
  GearIcon as Settings2,
  TrashIcon as Trash2,
} from "@radix-ui/react-icons";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  type Currency,
  currencies,
  type ExchangeRates,
  formatMinor,
} from "../../shared/money.js";
import {
  calculateBalances,
  calculateSettlements,
} from "../../shared/settlement.js";
import { spendingSummary, type TripPayload } from "../client-support.js";
import { ActionError, useWorkspace } from "./workspace-context.js";
import {
  BalanceList,
  BusyButton,
  ConfirmDialog,
  FormField,
  SectionHeading,
} from "./workspace-ui.js";

export function TripPreferences({ payload }: { payload: TripPayload }) {
  const { offline, requestPayload } = useWorkspace();
  const [error, setError] = useState("");
  const form = useForm<{ baseCurrency: Currency; name: string }>({
    defaultValues: {
      baseCurrency: payload.trip.baseCurrency,
      name: payload.trip.name,
    },
  });
  const draft = form.watch();
  const previewTrip = useMemo(
    () => ({
      ...payload.trip,
      baseCurrency: draft.baseCurrency,
      exchangeRates:
        draft.baseCurrency === payload.trip.baseCurrency
          ? payload.trip.exchangeRates
          : undefined,
    }),
    [draft.baseCurrency, payload.trip],
  );
  const changedCurrency = draft.baseCurrency !== payload.trip.baseCurrency;
  async function save() {
    setError("");
    try {
      await requestPayload(
        `/api/trips/${payload.trip.id}`,
        {
          body: JSON.stringify({
            ...(draft.name !== payload.trip.name ? { name: draft.name } : {}),
            ...(changedCurrency ? { baseCurrency: draft.baseCurrency } : {}),
          }),
          method: "PATCH",
        },
        "已套用群組偏好",
        true,
      );
      form.reset(draft);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "儲存失敗");
    }
  }
  return (
    <details className="surface disclosure" name="trip-settings">
      <summary>
        <Settings2 aria-hidden="true" />
        <span>群組偏好</span>
        <span className="summary-meta">
          {payload.trip.name} · {payload.trip.baseCurrency}
        </span>
      </summary>
      <div className="grid gap-5 pt-5">
        <SectionHeading description="變更基準貨幣會重算顯示金額，並清除目前自訂匯率。">
          名稱與基準貨幣
        </SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="群組名稱">
            <input
              className="form-control"
              maxLength={100}
              {...form.register("name", { required: true })}
            />
          </FormField>
          <FormField label="基準貨幣">
            <select className="form-control" {...form.register("baseCurrency")}>
              {currencies.map((currency) => (
                <option key={currency}>{currency}</option>
              ))}
            </select>
          </FormField>
        </div>
        <ActionError message={error} />
        {changedCurrency ? (
          <div className="grid gap-3 rounded-xl border bg-muted/40 p-4">
            <strong>變更預覽</strong>
            <p className="text-sm">
              總支出將顯示為{" "}
              {formatMinor(
                spendingSummary(previewTrip).totalMinor,
                draft.baseCurrency,
              )}
              ；以下餘額與結清會重新換算。
            </p>
            <BalanceList balances={calculateBalances(previewTrip)} />
            <p className="text-sm text-muted-foreground">
              預計 {calculateSettlements(previewTrip).length}{" "}
              筆結清建議；自訂匯率將重設為內建固定值。
            </p>
          </div>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            disabled={!form.formState.isDirty}
            onClick={() =>
              form.reset({
                baseCurrency: payload.trip.baseCurrency,
                name: payload.trip.name,
              })
            }
          >
            取消變更
          </Button>
          <ConfirmDialog
            confirmLabel="套用群組偏好"
            disabled={!form.formState.isDirty || !draft.name.trim() || offline}
            description={
              changedCurrency
                ? `將基準貨幣改為 ${draft.baseCurrency}，重新計算全部結果並清除自訂匯率。`
                : `將群組名稱改為「${draft.name}」。`
            }
            onConfirm={save}
            title="套用這些變更？"
            trigger={<Button>預覽完成，套用變更</Button>}
          />
        </div>
      </div>
    </details>
  );
}

export function ExchangeRateSettings({ payload }: { payload: TripPayload }) {
  const { offline, requestPayload } = useWorkspace();
  const original = Object.fromEntries(
    currencies.map((currency) => [
      currency,
      currency === payload.trip.baseCurrency
        ? "1"
        : String(payload.trip.exchangeRates?.[currency] ?? ""),
    ]),
  ) as Record<Currency, string>;
  const [values, setValues] = useState(original);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const rates = useMemo(() => {
    const next: ExchangeRates = {};
    for (const currency of currencies) {
      if (currency === payload.trip.baseCurrency) continue;
      const value = Number(values[currency]);
      if (values[currency].trim() && Number.isFinite(value) && value > 0)
        next[currency] = value;
    }
    return next;
  }, [payload.trip.baseCurrency, values]);
  const previewTrip = { ...payload.trip, exchangeRates: rates };
  const changed = currencies.some(
    (currency) => values[currency] !== original[currency],
  );
  async function apply() {
    setBusy(true);
    setError("");
    try {
      await requestPayload(
        `/api/trips/${payload.trip.id}`,
        { body: JSON.stringify({ exchangeRates: values }), method: "PATCH" },
        "已套用自訂匯率",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "匯率儲存失敗");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="surface disclosure" name="trip-settings">
      <summary>
        <Calculator aria-hidden="true" />
        <span>換算方式</span>
        <span className="summary-meta">
          {Object.keys(payload.trip.exchangeRates ?? {}).length
            ? `${Object.keys(payload.trip.exchangeRates ?? {}).length} 個自訂匯率`
            : "使用內建固定匯率"}
        </span>
      </summary>
      <div className="grid gap-5 pt-5">
        <SectionHeading
          description={`設定 1 單位外幣等於多少 ${payload.trip.baseCurrency}；留空會使用內建固定匯率。`}
        >
          自訂匯率
        </SectionHeading>
        <div className="grid gap-3 sm:grid-cols-2">
          {currencies.map((currency) => (
            <FormField
              key={currency}
              label={`${currency} → ${payload.trip.baseCurrency}`}
            >
              <input
                className="form-control"
                inputMode="decimal"
                readOnly={currency === payload.trip.baseCurrency}
                value={values[currency]}
                placeholder="使用內建固定匯率"
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [currency]: event.target.value,
                  }))
                }
              />
            </FormField>
          ))}
        </div>
        <ActionError message={error} />
        {changed ? (
          <div className="rounded-xl border bg-muted/40 p-4 text-sm">
            <strong>換算預覽</strong>
            <p className="mt-1">
              總支出：
              {formatMinor(
                spendingSummary(previewTrip).totalMinor,
                payload.trip.baseCurrency,
              )}{" "}
              · {calculateSettlements(previewTrip).length} 筆結清建議。
            </p>
          </div>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            disabled={!changed}
            onClick={() => setValues(original)}
          >
            取消變更
          </Button>
          <Button
            variant="outline"
            disabled={offline || busy}
            onClick={() =>
              setValues(
                Object.fromEntries(
                  currencies.map((currency) => [
                    currency,
                    currency === payload.trip.baseCurrency ? "1" : "",
                  ]),
                ) as Record<Currency, string>,
              )
            }
          >
            重設為內建匯率
          </Button>
          <ConfirmDialog
            confirmLabel="套用匯率"
            disabled={!changed || offline}
            description="所有總額、餘額與結清建議會使用這組匯率重新計算。"
            onConfirm={apply}
            title="套用自訂匯率？"
            trigger={<BusyButton busy={busy}>預覽完成，套用變更</BusyButton>}
          />
        </div>
      </div>
    </details>
  );
}

export function LifecycleSettings({
  onDeleted,
  payload,
}: {
  onDeleted: () => void;
  payload: TripPayload;
}) {
  const { announce, offline, refreshCollection, requestPayload } =
    useWorkspace();
  const [typedName, setTypedName] = useState("");
  const [error, setError] = useState("");
  const archived = !!payload.trip.archivedAt;
  async function remove() {
    setError("");
    try {
      const response = await fetch(`/api/trips/${payload.trip.id}`, {
        credentials: "same-origin",
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string; ok?: boolean };
      if (!response.ok) throw new Error(data.error ?? "刪除失敗");
      await refreshCollection();
      announce("已刪除群組");
      onDeleted();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "刪除失敗");
    }
  }
  return (
    <details className="surface disclosure danger-surface" name="trip-settings">
      <summary>
        <Archive aria-hidden="true" />
        <span>群組生命週期</span>
        <span className="summary-meta">
          {archived ? "已封存・唯讀" : "使用中"}
        </span>
      </summary>
      <div className="grid gap-6 pt-5">
        <section className="grid gap-3">
          <SectionHeading
            description={
              archived
                ? "還原後可以繼續新增與修改資料。"
                : "封存會保留所有資料，但群組將變為唯讀。"
            }
          >
            {archived ? "還原群組" : "封存群組"}
          </SectionHeading>
          <ConfirmDialog
            confirmLabel={archived ? "還原群組" : "封存群組"}
            disabled={offline}
            description={
              archived
                ? "還原後擁有者與協作者可繼續修改資料。"
                : "支出、成員與付款紀錄都會保留；封存期間不能修改。"
            }
            onConfirm={() =>
              requestPayload(
                `/api/trips/${payload.trip.id}`,
                {
                  body: JSON.stringify({ archived: !archived }),
                  method: "PATCH",
                },
                archived ? "已還原群組" : "已封存群組",
                true,
              )
            }
            title={archived ? "還原這個群組？" : "封存這個群組？"}
            trigger={
              <Button variant="outline">
                {archived ? "還原群組" : "封存群組"}
              </Button>
            }
          />
        </section>
        <section className="grid gap-3 border-t border-destructive/20 pt-5">
          <SectionHeading description="這會永久刪除所有成員、支出、收據與結清紀錄，且無法復原。">
            刪除群組
          </SectionHeading>
          <FormField label={`輸入「${payload.trip.name}」確認`}>
            <input
              className="form-control"
              value={typedName}
              onChange={(event) => setTypedName(event.target.value)}
            />
          </FormField>
          <ActionError message={error} />
          <ConfirmDialog
            confirmLabel={`永久刪除「${payload.trip.name}」`}
            disabled={offline || typedName !== payload.trip.name}
            description="此動作無法復原。取消不會產生任何變更。"
            destructive
            onConfirm={remove}
            title="永久刪除群組？"
            trigger={
              <Button
                disabled={offline || typedName !== payload.trip.name}
                variant="destructive"
              >
                <Trash2 aria-hidden="true" />
                永久刪除群組
              </Button>
            }
          />
        </section>
      </div>
    </details>
  );
}
