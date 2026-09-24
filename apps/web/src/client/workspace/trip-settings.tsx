import { parseExchangeRateSnapshot } from "@narumitw/otter-contracts";
import {
  type Currency,
  currencies,
  type ExchangeRates,
  fixedExchangeRates,
} from "@narumitw/otter-core/money";
import {
  calculateBalances,
  calculateSettlements,
} from "@narumitw/otter-core/settlement";
import {
  ArchiveIcon as Archive,
  TokensIcon as Calculator,
  LockClosedIcon as Lock,
  GearIcon as Settings2,
  TrashIcon as Trash2,
} from "@radix-ui/react-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { api, spendingSummary, type TripPayload } from "../client-support.js";
import { useI18n } from "../i18n.js";
import { ActionError, useWorkspace } from "./workspace-context.js";
import {
  BalanceList,
  BusyButton,
  ConfirmDialog,
  FormField,
  SectionHeading,
} from "./workspace-ui.js";

function automaticExchangeRates(
  payload: TripPayload,
): Record<Currency, number> {
  if (payload.exchangeRateInfo?.source === "custom") {
    return payload.exchangeRateInfo.defaults.rates;
  }
  if (
    payload.exchangeRateInfo?.source === "bank" &&
    hasCompleteExchangeRates(payload.trip.exchangeRates)
  ) {
    return payload.trip.exchangeRates;
  }
  return fixedExchangeRates(payload.trip.baseCurrency);
}

function hasCompleteExchangeRates(
  rates: ExchangeRates | undefined,
): rates is Record<Currency, number> {
  return currencies.every((currency) => {
    const rate = rates?.[currency];
    return typeof rate === "number" && Number.isFinite(rate) && rate > 0;
  });
}

function rebaseExchangeRates(
  rates: Record<Currency, number>,
  baseCurrency: Currency,
): Record<Currency, number> {
  const baseRate = rates[baseCurrency];
  return Object.fromEntries(
    currencies.map((currency) => [currency, rates[currency] / baseRate]),
  ) as Record<Currency, number>;
}

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

function customRatesFromValues(
  values: Record<Currency, string>,
  baseCurrency: Currency,
): ExchangeRates {
  const rates: ExchangeRates = {};
  for (const currency of currencies) {
    if (currency === baseCurrency || !values[currency].trim()) {
      continue;
    }
    const rate = Number(values[currency]);
    if (Number.isFinite(rate) && rate > 0) {
      rates[currency] = rate;
    }
  }
  return rates;
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

export function TripPreferences({ payload }: { payload: TripPayload }) {
  const { formatMoney, messages } = useI18n();
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
          : rebaseExchangeRates(
              automaticExchangeRates(payload),
              draft.baseCurrency,
            ),
    }),
    [draft.baseCurrency, payload],
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
        messages.groupPreferencesApplied,
        true,
      );
      form.reset(draft);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : messages.saveFailed);
    }
  }
  return (
    <details className="surface disclosure" name="trip-settings">
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
          <div className="grid gap-3 rounded-xl border bg-muted/40 p-4">
            <strong>{messages.changePreview}</strong>
            <p className="text-sm">
              {messages.totalSpendingWillDisplayAsAmountBalancesAndSettlementsBelowWillBeConverted(
                {
                  amount: formatMoney(
                    spendingSummary(previewTrip).totalMinor,
                    draft.baseCurrency,
                  ),
                },
              )}
            </p>
            <BalanceList balances={calculateBalances(previewTrip)} />
            <p className="text-sm text-muted-foreground">
              {messages.expectCountSettlementSuggestionsCustomRatesWillResetToBuiltInValues(
                {
                  count: calculateSettlements(previewTrip).length,
                },
              )}
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

export function ApiWriteSettings({ payload }: { payload: TripPayload }) {
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
    <details className="surface disclosure" name="trip-settings">
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

export function ExchangeRateSettings({ payload }: { payload: TripPayload }) {
  const { formatMoney, locale, messages } = useI18n();
  const { offline, requestPayload } = useWorkspace();
  const initialValues = customRateValues(payload);
  const initialDefaultRates = automaticExchangeRates(payload);
  const payloadRateKey = [
    payload.trip.baseCurrency,
    ...currencies.flatMap((currency) => [
      initialValues[currency],
      initialDefaultRates[currency],
    ]),
  ].join("|");
  const lastSyncedPayloadRateKey = useRef(payloadRateKey);
  const [savedValues, setSavedValues] = useState(initialValues);
  const [values, setValues] = useState(initialValues);
  const [savedDefaultRates, setSavedDefaultRates] =
    useState(initialDefaultRates);
  const [defaultRates, setDefaultRates] = useState(initialDefaultRates);
  const [error, setError] = useState("");
  const [loadedSnapshot, setLoadedSnapshot] = useState("");
  const [useBankDefault, setUseBankDefault] = useState(false);
  const [busy, setBusy] = useState<"apply" | "load" | null>(null);
  const customRates = useMemo(
    () => customRatesFromValues(values, payload.trip.baseCurrency),
    [payload.trip.baseCurrency, values],
  );
  const rates = useMemo(
    () => ({
      ...defaultRates,
      ...customRates,
      [payload.trip.baseCurrency]: 1,
    }),
    [customRates, defaultRates, payload.trip.baseCurrency],
  );
  const previewTrip = { ...payload.trip, exchangeRates: rates };
  const changed =
    useBankDefault ||
    currencies.some((currency) => values[currency] !== savedValues[currency]);
  useEffect(() => {
    if (
      payloadRateKey === lastSyncedPayloadRateKey.current ||
      changed ||
      busy !== null
    ) {
      return;
    }

    const nextValues = customRateValues(payload);
    const nextDefaultRates = automaticExchangeRates(payload);
    lastSyncedPayloadRateKey.current = payloadRateKey;
    setSavedValues(nextValues);
    setValues(nextValues);
    setSavedDefaultRates(nextDefaultRates);
    setDefaultRates(nextDefaultRates);
    setLoadedSnapshot("");
  }, [busy, changed, payload, payloadRateKey]);
  async function apply() {
    setBusy("apply");
    setError("");
    try {
      const next = await requestPayload(
        `/api/trips/${payload.trip.id}`,
        {
          body: JSON.stringify({
            exchangeRates: useBankDefault
              ? {}
              : customRateInputsFromValues(values, payload.trip.baseCurrency),
          }),
          method: "PATCH",
        },
        useBankDefault
          ? messages.bankOfTaiwanDefaultRatesApplied
          : messages.customExchangeRatesApplied,
      );
      const nextValues = customRateValues(next);
      const nextDefaultRates = automaticExchangeRates(next);
      lastSyncedPayloadRateKey.current = payloadRateKey;
      setDefaultRates(nextDefaultRates);
      setSavedDefaultRates(nextDefaultRates);
      setSavedValues(nextValues);
      setValues(nextValues);
      setLoadedSnapshot("");
      setUseBankDefault(false);
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
    setBusy("load");
    setError("");
    try {
      const snapshot = parseExchangeRateSnapshot(
        await api<unknown>(`/api/exchange-rates/${payload.trip.baseCurrency}`),
      );
      setDefaultRates(snapshot.rates);
      setValues(
        Object.fromEntries(
          currencies.map((currency) => [
            currency,
            currency === payload.trip.baseCurrency ? "1" : "",
          ]),
        ) as Record<Currency, string>,
      );
      const time = new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(snapshot.fetchedAt));
      setUseBankDefault(true);
      setLoadedSnapshot(
        messages.bankOfTaiwanSpotMidRatesLoadedAtTime({ time }),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : messages.unableToLoadBankExchangeRates,
      );
    } finally {
      setBusy(null);
    }
  }
  return (
    <details className="surface disclosure" name="trip-settings">
      <summary>
        <Calculator aria-hidden="true" />
        <span>{messages.currencyConversion}</span>
        <span className="summary-meta">
          {payload.exchangeRateInfo?.source === "custom"
            ? messages.countCustomRates({
                count: Object.keys(payload.exchangeRateInfo.customRates).length,
              })
            : payload.exchangeRateInfo?.source === "bank"
              ? messages.usingBankOfTaiwanExchangeRates
              : messages.usingFixedFallbackRates}
        </span>
      </summary>
      <div className="grid gap-5 pt-5">
        <SectionHeading
          description={messages.setHowMuch1UnitOfEachCurrencyEqualsInCurrencyLeaveBlankToUseTheBuiltInFixedRate(
            { currency: payload.trip.baseCurrency },
          )}
        >
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
                disabled={busy !== null}
                inputMode="decimal"
                readOnly={currency === payload.trip.baseCurrency}
                value={values[currency]}
                placeholder={messages.usingBankOfTaiwanExchangeRates}
                onChange={(event) => {
                  setLoadedSnapshot("");
                  setUseBankDefault(false);
                  setValues((current) => ({
                    ...current,
                    [currency]: event.target.value,
                  }));
                }}
              />
            </FormField>
          ))}
        </div>
        <div className="grid gap-2 rounded-xl border bg-muted/40 p-4 text-sm">
          <p className="text-muted-foreground">
            {messages.bankOfTaiwanSpotMidRateDescription}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <BusyButton
              busy={busy === "load"}
              busyLabel={messages.loadingBankExchangeRates}
              disabled={offline || busy !== null}
              onClick={() => void loadCurrentRates()}
              variant="outline"
            >
              {messages.loadBankOfTaiwanSpotMidRates}
            </BusyButton>
            {loadedSnapshot ? (
              <span role="status">{loadedSnapshot}</span>
            ) : null}
          </div>
        </div>
        <ActionError message={error} />
        {changed ? (
          <div className="rounded-xl border bg-muted/40 p-4 text-sm">
            <strong>{messages.conversionPreview}</strong>
            <p className="mt-1">
              {messages.totalSpendingAmountCountSettlementSuggestions({
                amount: formatMoney(
                  spendingSummary(previewTrip).totalMinor,
                  payload.trip.baseCurrency,
                ),
                count: calculateSettlements(previewTrip).length,
              })}
            </p>
          </div>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            disabled={!changed || busy !== null}
            onClick={() => {
              setDefaultRates(savedDefaultRates);
              setLoadedSnapshot("");
              setUseBankDefault(false);
              setValues(savedValues);
            }}
          >
            {messages.cancelChanges}
          </Button>
          <ConfirmDialog
            confirmLabel={messages.applyRates}
            disabled={!changed || offline || busy !== null}
            description={
              messages.allTotalsBalancesAndSettlementSuggestionsWillBeRecalculatedWithTheseRates
            }
            onConfirm={apply}
            title={
              useBankDefault
                ? messages.restoreBankOfTaiwanDefaultRates
                : messages.applyCustomExchangeRates
            }
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
  payload,
}: {
  onDeleted: () => void;
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
    <details className="surface disclosure danger-surface" name="trip-settings">
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
