import { type Currency, currencies } from "@narumitw/otter-core/money";
import {
  ArchiveIcon as Archive,
  LockClosedIcon as Lock,
  GearIcon as Settings2,
  TrashIcon as Trash2,
} from "@radix-ui/react-icons";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { api, type TripPayload } from "../client-support.js";
import { useI18n } from "../i18n.js";
import { ActionError, useWorkspace } from "./workspace-context.js";
import { ConfirmDialog, FormField, SectionHeading } from "./workspace-ui.js";

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
