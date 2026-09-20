import {
  type Currency,
  currencies,
  type ExchangeRates,
} from "@narumitw/otter-core/money";
import {
  calculateBalances,
  calculateSettlements,
} from "@narumitw/otter-core/settlement";
import {
  ArchiveIcon as Archive,
  TokensIcon as Calculator,
  GearIcon as Settings2,
  TrashIcon as Trash2,
} from "@radix-ui/react-icons";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { spendingSummary, type TripPayload } from "../client-support.js";
import { localizeMessage, useI18n } from "../i18n.js";
import { ActionError, useWorkspace } from "./workspace-context.js";
import {
  BalanceList,
  BusyButton,
  ConfirmDialog,
  FormField,
  SectionHeading,
} from "./workspace-ui.js";

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

export function ExchangeRateSettings({ payload }: { payload: TripPayload }) {
  const { formatMoney, messages } = useI18n();
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
        messages.customExchangeRatesApplied,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : messages.unableToSaveExchangeRates,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="surface disclosure" name="trip-settings">
      <summary>
        <Calculator aria-hidden="true" />
        <span>{messages.currencyConversion}</span>
        <span className="summary-meta">
          {Object.keys(payload.trip.exchangeRates ?? {}).length
            ? messages.countCustomRates({
                count: Object.keys(payload.trip.exchangeRates ?? {}).length,
              })
            : messages.usingBuiltInFixedRates}
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
                inputMode="decimal"
                readOnly={currency === payload.trip.baseCurrency}
                value={values[currency]}
                placeholder={messages.usingBuiltInFixedRates}
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
            disabled={!changed}
            onClick={() => setValues(original)}
          >
            {messages.cancelChanges}
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
            {messages.resetToBuiltInRates}
          </Button>
          <ConfirmDialog
            confirmLabel={messages.applyRates}
            disabled={!changed || offline}
            description={
              messages.allTotalsBalancesAndSettlementSuggestionsWillBeRecalculatedWithTheseRates
            }
            onConfirm={apply}
            title={messages.applyCustomExchangeRates}
            trigger={
              <BusyButton busy={busy}>{messages.applyChanges}</BusyButton>
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
      const response = await fetch(`/api/trips/${payload.trip.id}`, {
        credentials: "same-origin",
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string; ok?: boolean };
      if (!response.ok) {
        throw new Error(
          data.error ? localizeMessage(data.error) : messages.deleteFailed,
        );
      }
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
