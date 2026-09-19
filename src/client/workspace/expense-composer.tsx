import {
  ChevronLeftIcon as ChevronLeft,
  ReaderIcon as ReceiptText,
  GroupIcon as Users,
} from "@radix-ui/react-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { expenseCategories } from "../../shared/expense-metadata.js";
import {
  parseSplitMode,
  previewParticipantShares,
  type SplitMode,
} from "../../shared/expense-splits.js";
import {
  type Currency,
  currencies,
  currencyInfo,
  isCurrency,
  parseAmountToMinor,
} from "../../shared/money.js";
import type { Expense, Trip } from "../../shared/settlement.js";
import { todayDate } from "../client-support.js";
import { localizeMessage, useI18n } from "../i18n.js";
import { ActionError, useWorkspace } from "./workspace-context.js";
import {
  BusyButton,
  ConfirmDialog,
  FormField,
  SectionHeading,
} from "./workspace-ui.js";

type ExpenseDraft = {
  amount: string;
  category: string;
  currency: Currency;
  description: string;
  expenseDate: string;
  paidById: string;
  participantIds: string[];
  splitMode: SplitMode;
  splitValues: Record<string, string>;
  tags: string;
};

function defaults(trip: Trip, expense?: Expense): ExpenseDraft {
  const explicit = new Map(
    expense?.participantShares?.map((share) => [
      share.participantId,
      share.shareMinor,
    ]) ?? [],
  );
  return {
    amount: expense
      ? String(
          expense.amountMinor / 10 ** currencyInfo[expense.currency].minorUnits,
        )
      : "",
    category: expense?.category ?? "其他",
    currency: expense?.currency ?? trip.baseCurrency,
    description: expense?.description ?? "",
    expenseDate: expense?.expenseDate ?? todayDate(),
    paidById: expense?.paidById ?? trip.participants[0]?.id ?? "",
    participantIds:
      expense?.participantIds ?? trip.participants.map((person) => person.id),
    splitMode: explicit.size ? "amount" : "equal",
    splitValues: Object.fromEntries(
      trip.participants.map((person) => [
        person.id,
        explicit.has(person.id) && expense
          ? String(
              (explicit.get(person.id) ?? 0) /
                10 ** currencyInfo[expense.currency].minorUnits,
            )
          : "",
      ]),
    ),
    tags: (expense?.tags ?? []).join(", "),
  };
}

export function ExpenseComposer({
  expense,
  onCancel,
  onDirtyChange,
  onSaved,
  trip,
}: {
  expense?: Expense;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onSaved?: () => void;
  trip: Trip;
}) {
  const { formatMoney, locale, messages } = useI18n();
  const { offline, requestPayload } = useWorkspace();
  const [serverError, setServerError] = useState("");
  const form = useForm<ExpenseDraft>({
    defaultValues: defaults(trip, expense),
  });
  const previousLocale = useRef(locale);
  const values = form.watch();
  const isDirty = form.formState.isDirty;

  useEffect(() => {
    if (previousLocale.current === locale) return;
    previousLocale.current = locale;
    form.clearErrors();
    setServerError("");
  }, [form.clearErrors, locale]);

  useEffect(() => {
    const protectDraft = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protectDraft);
    return () => window.removeEventListener("beforeunload", protectDraft);
  }, [isDirty]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
    return () => onDirtyChange?.(false);
  }, [isDirty, onDirtyChange]);

  const preview = useMemo(() => {
    if (!values.amount.trim() || !isCurrency(values.currency)) return null;
    try {
      const amountMinor = parseAmountToMinor(values.amount, values.currency);
      const shares = previewParticipantShares(
        parseSplitMode(values.splitMode),
        values.participantIds,
        amountMinor,
        values.splitValues,
        values.currency,
      );
      return { amountMinor, error: "", shares };
    } catch (error) {
      return {
        amountMinor: 0,
        error:
          error instanceof Error
            ? localizeMessage(error.message)
            : messages.invalidSplitFormat,
        shares: [],
      };
    }
  }, [
    messages.invalidSplitFormat,
    values.amount,
    values.currency,
    values.participantIds,
    values.splitMode,
    values.splitValues,
  ]);

  const submit = form.handleSubmit(async (draft) => {
    setServerError("");
    if (!draft.participantIds.length) {
      form.setError("participantIds", {
        message: messages.selectAtLeastOnePersonToSplitWith,
      });
      return;
    }
    if (preview?.error) {
      setServerError(preview.error);
      return;
    }
    try {
      await requestPayload(
        expense
          ? `/api/trips/${trip.id}/expenses/${expense.id}`
          : `/api/trips/${trip.id}/expenses`,
        {
          body: JSON.stringify(draft),
          method: expense ? "PATCH" : "POST",
        },
        expense ? messages.expenseChangesSaved : messages.expenseRecorded,
        true,
      );
      form.reset(defaults(trip));
      onSaved?.();
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : messages.unableToSaveExpense,
      );
    }
  });

  const cancelButton = (
    <Button
      type="button"
      variant="outline"
      onClick={isDirty ? undefined : onCancel}
    >
      <ChevronLeft aria-hidden="true" />
      {messages.cancel}
    </Button>
  );

  return (
    <section
      className="surface grid gap-5"
      aria-labelledby="expense-composer-heading"
    >
      <div className="flex items-start justify-between gap-4">
        <SectionHeading
          description={
            expense
              ? messages.reviewTheSplitPreviewBeforeSavingChanges
              : messages.enterTheRequiredDetailsFirstCustomSplitsAndTagsAreAvailableBelow
          }
        >
          <span id="expense-composer-heading">
            {expense ? messages.editExpense : messages.addExpense2}
          </span>
        </SectionHeading>
        {isDirty ? (
          <ConfirmDialog
            confirmLabel={messages.discardDraft}
            description={
              messages.unsavedChangesWillBeLostExistingDataWillNotChange
            }
            destructive
            onConfirm={onCancel}
            title={messages.discardThisDraft}
            trigger={cancelButton}
          />
        ) : (
          cancelButton
        )}
      </div>

      <form className="grid gap-5" noValidate onSubmit={submit}>
        <ActionError message={serverError} />
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label={messages.description}>
            <input
              className="form-control"
              maxLength={120}
              placeholder={messages.dinnerHotelTrainTickets}
              {...form.register("description", {
                required: messages.enterAnExpenseDescription,
              })}
            />
            {form.formState.errors.description ? (
              <span className="field-error">
                {form.formState.errors.description.message}
              </span>
            ) : null}
          </FormField>
          <FormField label={messages.amount}>
            <input
              className="form-control"
              inputMode="decimal"
              placeholder="1000"
              {...form.register("amount", {
                required: messages.enterAnExpenseAmount,
              })}
            />
            {form.formState.errors.amount ? (
              <span className="field-error">
                {form.formState.errors.amount.message}
              </span>
            ) : null}
          </FormField>
          <FormField label={messages.date}>
            <input
              className="form-control"
              type="date"
              {...form.register("expenseDate", { required: true })}
            />
          </FormField>
          <FormField label={messages.paidBy}>
            <select
              className="form-control"
              {...form.register("paidById", { required: true })}
            >
              {trip.participants.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={messages.currency2}>
            <select className="form-control" {...form.register("currency")}>
              {currencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency} · {localizeMessage(currencyInfo[currency].label)}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="rounded-xl border bg-muted/50 p-4" aria-live="polite">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <ReceiptText aria-hidden="true" />
            {messages.splitPreview}
          </div>
          {!preview ? (
            <p className="text-sm text-muted-foreground">
              {messages.enterAnAmountToPreviewEachPersonsShare}
            </p>
          ) : preview.error ? (
            <p className="field-error">{preview.error}</p>
          ) : (
            <>
              <p className="mb-3 text-sm">
                {messages.namePaidAmount({
                  name:
                    trip.participants.find(
                      (person) => person.id === values.paidById,
                    )?.name ?? messages.paidBy,
                  amount: formatMoney(preview.amountMinor, values.currency),
                })}
              </p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {preview.shares.map((share) => (
                  <li
                    className="flex justify-between rounded-lg bg-card px-3 py-2 text-sm"
                    key={share.participantId}
                  >
                    <span>
                      {
                        trip.participants.find(
                          (person) => person.id === share.participantId,
                        )?.name
                      }
                    </span>
                    <strong className="tabular-nums">
                      {formatMoney(share.shareMinor, values.currency)}
                    </strong>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <details className="disclosure">
          <summary>
            <Users aria-hidden="true" />
            {messages.changePeopleAndSplitMethod}{" "}
            <span className="summary-meta">
              {messages.selectedSelectedOfTotal({
                selected: values.participantIds.length,
                total: trip.participants.length,
              })}
            </span>
          </summary>
          <div className="grid gap-4 pt-4">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() =>
                  form.setValue(
                    "participantIds",
                    trip.participants.map((person) => person.id),
                    { shouldDirty: true },
                  )
                }
              >
                {messages.selectAll}
              </Button>
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() =>
                  form.setValue("participantIds", [], { shouldDirty: true })
                }
              >
                {messages.clear}
              </Button>
            </div>
            <fieldset className="choice-grid">
              <legend className="sr-only">{messages.splitWith}</legend>
              {trip.participants.map((person) => (
                <label className="choice" key={person.id}>
                  <input
                    type="checkbox"
                    value={person.id}
                    {...form.register("participantIds")}
                  />{" "}
                  <span>{person.name}</span>
                </label>
              ))}
            </fieldset>
            <FormField label={messages.splitMethod}>
              <select className="form-control" {...form.register("splitMode")}>
                <option value="equal">{messages.splitEqually}</option>
                <option value="amount">{messages.exactAmounts}</option>
                <option value="ratio">{messages.percentages}</option>
                <option value="shares">{messages.shares}</option>
              </select>
            </FormField>
            {values.splitMode !== "equal" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {trip.participants
                  .filter((person) => values.participantIds.includes(person.id))
                  .map((person) => (
                    <FormField
                      key={person.id}
                      label={messages.nameSKind({
                        name: person.name,
                        kind:
                          values.splitMode === "amount"
                            ? messages.amount
                            : values.splitMode === "ratio"
                              ? messages.percentages
                              : messages.shares,
                      })}
                    >
                      <input
                        className="form-control"
                        inputMode="decimal"
                        {...form.register(`splitValues.${person.id}`)}
                      />
                    </FormField>
                  ))}
              </div>
            ) : null}
          </div>
        </details>

        <details className="disclosure">
          <summary>
            {messages.moreDetails}{" "}
            <span className="summary-meta">{messages.categoryAndTags}</span>
          </summary>
          <div className="grid gap-4 pt-4 sm:grid-cols-2">
            <FormField label={messages.category}>
              <select className="form-control" {...form.register("category")}>
                {expenseCategories.map((category) => (
                  <option key={category} value={category}>
                    {localizeMessage(category)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField
              label={messages.tag}
              hint={messages.separateWithCommasForExampleBreakfastTransport}
            >
              <input
                className="form-control"
                maxLength={249}
                {...form.register("tags")}
              />
            </FormField>
          </div>
        </details>

        <div className="sticky-submit flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {isDirty ? (
            <ConfirmDialog
              confirmLabel={messages.discardDraft}
              description={messages.unsavedChangesWillBeLost}
              destructive
              onConfirm={onCancel}
              title={messages.cancelEditing}
              trigger={cancelButton}
            />
          ) : (
            cancelButton
          )}
          <BusyButton
            busy={form.formState.isSubmitting}
            busyLabel={messages.saving}
            disabled={offline || !!preview?.error}
            type="submit"
          >
            {expense ? messages.saveChanges : messages.recordExpense}
          </BusyButton>
        </div>
      </form>
    </section>
  );
}
