import {
  type ExchangeRateSnapshot,
  parseExchangeRateSnapshot,
} from "@narumitw/otter-contracts";
import { type Currency, currencies } from "@narumitw/otter-core/money";
import {
  ArchiveIcon as Archive,
  TokensIcon as Calculator,
  LockClosedIcon as Lock,
  GearIcon as Settings2,
  TrashIcon as Trash2,
} from "@radix-ui/react-icons";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { api, type TripPayload } from "../client-support.js";
import { useI18n } from "../i18n.js";
import { ActionError, useWorkspace } from "./workspace-context.js";
import {
  BusyButton,
  ConfirmDialog,
  FormField,
  SectionHeading,
} from "./workspace-ui.js";

function customRateValues(payload: TripPayload): Record<Currency, string> {
  const customRates =
    payload.exchangeRateInfo?.source === "custom"
      ? payload.exchangeRateInfo.customRates
      : {};
  return Object.fromEntries(
    currencies.map((currency) => [
      currency,
      currency === payload.trip.baseCurrency
        ? "1"
        : String(customRates[currency] ?? ""),
    ]),
  ) as Record<Currency, string>;
}

function customRateInputsFromValues(
  values: Record<Currency, string>,
  baseCurrency: Currency,
): Partial<Record<Currency, number | string>> {
  const rates: Partial<Record<Currency, number | string>> = {};
  for (const currency of currencies) {
    const input = values[currency].trim();
    if (currency === baseCurrency || !input) {
      continue;
    }
    const rate = Number(input);
    rates[currency] = Number.isFinite(rate) ? rate : input;
  }
  return rates;
}

export function TripPreferences({
  payload,
  expanded = false,
}: {
  payload: TripPayload;
  expanded?: boolean;
}) {
  const { messages } = useI18n();
  const { offline, requestPayload } = useWorkspace();
  const [error, setError] = useState("");
  const form = useForm<{ baseCurrency: Currency; name: string }>({
    defaultValues: {
      baseCurrency: payload.trip.baseCurrency,
      name: payload.trip.name,
    },
  });
  const draft = form.watch();
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
        messages.groupPreferencesApplied,
        true,
      );
      form.reset(draft);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : messages.saveFailed);
    }
  }
  return (
    <details
      className="surface disclosure"
      name={expanded ? undefined : "trip-settings"}
      open={expanded || undefined}
    >
      <summary>
        <Settings2 aria-hidden="true" />
        <span>{messages.groupPreferences}</span>
        <span className="summary-meta">
          {payload.trip.name} · {payload.trip.baseCurrency}
        </span>
      </summary>
      <div className="grid gap-5 pt-5">
        <SectionHeading
          description={
            messages.changingTheBaseCurrencyRecalculatesDisplayedAmountsAndClearsCustomExchangeRates
          }
        >
          {messages.nameAndBaseCurrency}
        </SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={messages.groupName}>
            <input
              className="form-control"
              maxLength={100}
              {...form.register("name", { required: true })}
            />
          </FormField>
          <FormField label={messages.baseCurrency}>
            <select className="form-control" {...form.register("baseCurrency")}>
              {currencies.map((currency) => (
                <option key={currency}>{currency}</option>
              ))}
            </select>
          </FormField>
        </div>
        <ActionError message={error} />
        {changedCurrency ? (
          <div
            className="rounded-xl border bg-muted/40 p-4 text-sm"
            role="status"
          >
            {messages.visaBaseCurrencyChangeHelp}
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
            {messages.cancelChanges}
          </Button>
          <ConfirmDialog
            confirmLabel={messages.applyGroupPreferences}
            disabled={!form.formState.isDirty || !draft.name.trim() || offline}
            description={
              changedCurrency
                ? messages.changeTheBaseCurrencyToCurrencyRecalculateAllResultsAndClearCustomRates(
                    { currency: draft.baseCurrency },
                  )
                : messages.renameTheGroupToName({ name: draft.name })
            }
            onConfirm={save}
            title={messages.applyTheseChanges}
            trigger={<Button>{messages.applyChanges}</Button>}
          />
        </div>
      </div>
    </details>
  );
}

export function ApiWriteSettings({
  payload,
  expanded = false,
}: {
  payload: TripPayload;
  expanded?: boolean;
}) {
  const { messages } = useI18n();
  const { offline, requestPayload } = useWorkspace();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const allowed = payload.trip.allowApiWrites === true;

  async function setAllowed(next: boolean) {
    setBusy(true);
    setError("");
    try {
      await requestPayload(
        `/api/trips/${payload.trip.id}`,
        { method: "PATCH", body: JSON.stringify({ allowApiWrites: next }) },
        messages.apiWriteSettingSaved,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : messages.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <details
      className="surface disclosure"
      name={expanded ? undefined : "trip-settings"}
      open={expanded || undefined}
    >
      <summary>
        <Lock aria-hidden="true" />
        <span>{messages.apiWriteSettings}</span>
        <span className="summary-meta">
          {allowed ? messages.apiWritesAllowed : messages.apiWritesBlocked}
        </span>
      </summary>
      <div className="grid gap-4 pt-5">
        <p className="text-sm text-muted-foreground">
          {messages.apiWriteSettingsDescription}
        </p>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={allowed}
            disabled={offline || busy}
            onChange={(event) => void setAllowed(event.target.checked)}
          />
          {messages.allowApiWrites}
        </label>
        <ActionError message={error} />
      </div>
    </details>
  );
}

export function ExchangeRateSettings({
  payload,
  expanded = false,
}: {
  payload: TripPayload;
  expanded?: boolean;
}) {
  const { messages } = useI18n();
  const { offline, requestPayload } = useWorkspace();
  const initialValues = customRateValues(payload);
  const key = JSON.stringify([
    payload.trip.id,
    payload.trip.baseCurrency,
    initialValues,
  ]);
  const synced = useRef(key);
  const draftBase = useRef(payload.trip.baseCurrency);
  const draftTrip = useRef(payload.trip.id);
  const previewRequest = useRef<AbortController | null>(null);
  const [savedValues, setSavedValues] = useState(initialValues);
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<ExchangeRateSnapshot | null>(null);
  const [busy, setBusy] = useState<"apply" | "load" | null>(null);
  const changed = currencies.some(
    (currency) => values[currency] !== savedValues[currency],
  );
  useEffect(() => () => previewRequest.current?.abort(), []);
  useEffect(() => {
    const baseChanged =
      draftBase.current !== payload.trip.baseCurrency ||
      draftTrip.current !== payload.trip.id;
    if (synced.current === key || (!baseChanged && (changed || busy !== null)))
      return;
    synced.current = key;
    draftBase.current = payload.trip.baseCurrency;
    draftTrip.current = payload.trip.id;
    previewRequest.current?.abort();
    setSavedValues(initialValues);
    setValues(initialValues);
    setPreview(null);
    setBusy(null);
  }, [
    key,
    initialValues,
    payload.trip.baseCurrency,
    payload.trip.id,
    changed,
    busy,
  ]);
  async function apply() {
    setBusy("apply");
    setError("");
    try {
      const next = await requestPayload(
        `/api/trips/${payload.trip.id}`,
        {
          body: JSON.stringify({
            exchangeRates: customRateInputsFromValues(
              values,
              payload.trip.baseCurrency,
            ),
            rateBaseCurrency: payload.trip.baseCurrency,
          }),
          method: "PATCH",
        },
        messages.customExchangeRatesApplied,
      );
      const nextValues = customRateValues(next);
      synced.current = JSON.stringify([
        next.trip.id,
        next.trip.baseCurrency,
        nextValues,
      ]);
      draftBase.current = next.trip.baseCurrency;
      draftTrip.current = next.trip.id;
      setSavedValues(nextValues);
      setValues(nextValues);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : messages.unableToSaveExchangeRates,
      );
    } finally {
      setBusy(null);
    }
  }
  async function loadCurrentRates() {
    previewRequest.current?.abort();
    const controller = new AbortController();
    previewRequest.current = controller;
    const base = payload.trip.baseCurrency;
    setBusy("load");
    setError("");
    try {
      const snapshot = parseExchangeRateSnapshot(
        await api<unknown>(`/api/exchange-rates/${base}`, {
          signal: controller.signal,
        }),
      );
      if (snapshot.source !== "VISA" || snapshot.baseCurrency !== base)
        throw new Error(messages.visaRateLabel);
      if (!controller.signal.aborted) setPreview(snapshot);
    } catch (caught) {
      if (!controller.signal.aborted)
        setError(
          caught instanceof Error ? caught.message : messages.saveFailed,
        );
    } finally {
      if (!controller.signal.aborted) setBusy(null);
    }
  }
  return (
    <details
      className="surface disclosure"
      name={expanded ? undefined : "trip-settings"}
      open={expanded || undefined}
    >
      <summary>
        <Calculator aria-hidden="true" />
        <span>{messages.currencyConversion}</span>
        <span className="summary-meta">
          {payload.exchangeRateInfo?.source === "custom"
            ? messages.countCustomRates({
                count: Object.keys(payload.exchangeRateInfo.customRates).length,
              })
            : messages.automaticVisaRates}
        </span>
      </summary>
      <div className="grid gap-5 pt-5">
        <SectionHeading description={messages.automaticVisaRateHelp}>
          {messages.customExchangeRates}
        </SectionHeading>
        <div className="grid gap-3 sm:grid-cols-2">
          {currencies.map((currency) => (
            <FormField
              key={currency}
              label={`${currency} → ${payload.trip.baseCurrency}`}
            >
              <input
                className="form-control"
                disabled={busy !== null || offline}
                inputMode="decimal"
                readOnly={currency === payload.trip.baseCurrency}
                value={values[currency]}
                placeholder={messages.automaticVisaRates}
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
        <div className="grid gap-2 rounded-xl border bg-muted/40 p-4 text-sm">
          <p>{messages.visaRatesPreviewOnly}</p>
          <BusyButton
            busy={busy === "load"}
            busyLabel={messages.loading}
            disabled={offline || busy !== null}
            onClick={() => void loadCurrentRates()}
            variant="outline"
          >
            {messages.previewVisaRates}
          </BusyButton>
          {preview?.source === "VISA" ? (
            <div role="status">
              <p>
                {preview.date} · Visa · {preview.baseCurrency}
              </p>
              <ul>
                {currencies.map((currency) => (
                  <li key={currency}>
                    {currency} → {preview.baseCurrency}:{" "}
                    {preview.rates[currency] ??
                      messages.visaRateUnavailable({
                        date: preview.date,
                        currency,
                        target: preview.baseCurrency,
                      })}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <ActionError message={error} />
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            disabled={!changed || busy !== null}
            onClick={() => setValues(savedValues)}
          >
            {messages.cancelChanges}
          </Button>
          <ConfirmDialog
            confirmLabel={messages.applyRates}
            disabled={!changed || offline || busy !== null}
            description={messages.automaticVisaRateHelp}
            onConfirm={apply}
            title={messages.applyCustomExchangeRates}
            trigger={
              <BusyButton busy={busy === "apply"}>
                {messages.applyChanges}
              </BusyButton>
            }
          />
        </div>
      </div>
    </details>
  );
}

export function LifecycleSettings({
  onDeleted,
  expanded = false,
  payload,
}: {
  onDeleted: () => void;
  expanded?: boolean;
  payload: TripPayload;
}) {
  const { messages } = useI18n();
  const { announce, offline, refreshCollection, requestPayload } =
    useWorkspace();
  const [typedName, setTypedName] = useState("");
  const [error, setError] = useState("");
  const archived = !!payload.trip.archivedAt;
  async function remove() {
    setError("");
    try {
      await api<{ ok: true }>(
        `/api/trips/${encodeURIComponent(payload.trip.id)}`,
        { method: "DELETE" },
      );
      await refreshCollection();
      announce(messages.groupDeleted);
      onDeleted();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : messages.deleteFailed,
      );
    }
  }
  return (
    <details
      className="surface disclosure danger-surface"
      name={expanded ? undefined : "trip-settings"}
      open={expanded || undefined}
    >
      <summary>
        <Archive aria-hidden="true" />
        <span>{messages.groupLifecycle}</span>
        <span className="summary-meta">
          {archived ? messages.archivedReadOnly : messages.active2}
        </span>
      </summary>
      <div className="grid gap-6 pt-5">
        <section className="grid gap-3">
          <SectionHeading
            description={
              archived
                ? messages.afterRestoringDataCanBeAddedAndChangedAgain
                : messages.archivingPreservesAllDataButMakesTheGroupReadOnly
            }
          >
            {archived ? messages.restoreGroup : messages.archiveGroup}
          </SectionHeading>
          <ConfirmDialog
            confirmLabel={
              archived ? messages.restoreGroup : messages.archiveGroup
            }
            disabled={offline}
            description={
              archived
                ? messages.afterRestoringTheOwnerAndCollaboratorsCanEditDataAgain
                : messages.expensesPeopleAndPaymentRecordsArePreservedAndCannotBeChangedWhileArchived
            }
            onConfirm={() =>
              requestPayload(
                `/api/trips/${payload.trip.id}`,
                {
                  body: JSON.stringify({ archived: !archived }),
                  method: "PATCH",
                },
                archived ? messages.groupRestored : messages.groupArchived,
                true,
              )
            }
            title={
              archived ? messages.restoreThisGroup : messages.archiveThisGroup
            }
            trigger={
              <Button variant="outline">
                {archived ? messages.restoreGroup : messages.archiveGroup}
              </Button>
            }
          />
        </section>
        <section className="grid gap-3 border-t border-destructive/20 pt-5">
          <SectionHeading
            description={
              messages.thisPermanentlyDeletesAllPeopleExpensesReceiptsAndSettlementRecordsAndCannotBeUndone
            }
          >
            {messages.deleteGroup}
          </SectionHeading>
          <FormField
            label={messages.enterNameToConfirm({ name: payload.trip.name })}
          >
            <input
              className="form-control"
              value={typedName}
              onChange={(event) => setTypedName(event.target.value)}
            />
          </FormField>
          <ActionError message={error} />
          <ConfirmDialog
            confirmLabel={messages.permanentlyDeleteName({
              name: payload.trip.name,
            })}
            disabled={offline || typedName !== payload.trip.name}
            description={messages.thisCannotBeUndoneCancelingMakesNoChanges}
            destructive
            onConfirm={remove}
            title={messages.permanentlyDeleteThisGroup}
            trigger={
              <Button
                disabled={offline || typedName !== payload.trip.name}
                variant="destructive"
              >
                <Trash2 aria-hidden="true" />
                {messages.permanentlyDeleteGroup}
              </Button>
            }
          />
        </section>
      </div>
    </details>
  );
}
