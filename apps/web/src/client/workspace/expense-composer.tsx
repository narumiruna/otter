import {
  type CreateExpenseResponse,
  type Expense,
  isExpenseVersion,
  type Trip,
} from "@narumitw/otter-contracts";
import { isDateOnly } from "@narumitw/otter-core/date";
import {
  expenseCategories,
  isExpenseCategory,
  normalizeExpenseTags,
} from "@narumitw/otter-core/expense-metadata";
import {
  parseSplitMode,
  previewParticipantShares,
} from "@narumitw/otter-core/expense-splits";
import {
  currencies,
  currencyInfo,
  isCurrency,
  parseAmountToMinor,
} from "@narumitw/otter-core/money";
import {
  ChevronLeftIcon as ChevronLeft,
  ReaderIcon as ReceiptText,
} from "@radix-ui/react-icons";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ApiResponseError, api, todayDate } from "../client-support.js";
import type { QueuedExpense, QueuedExpenseDraft } from "../expense-queue.js";
import { localizeMessage, useI18n } from "../i18n.js";
import { DeleteExpenseAction, ReceiptControls } from "./expense-actions.js";
import { ExpenseHistoryDialog } from "./expense-history-dialog.js";
import { ExpenseConflictReview, useExpenseVersion } from "./expense-version.js";
import {
  CreatedReceiptRecovery,
  NewExpenseReceiptPicker,
  receiptFileError,
  uploadNewExpenseReceipt,
} from "./new-expense-receipt.js";
import { ActionError, useWorkspace } from "./workspace-context.js";
import {
  BusyButton,
  ConfirmDialog,
  FormField,
  SectionHeading,
} from "./workspace-ui.js";

type ExpenseDraft = QueuedExpenseDraft;

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
  queued,
  onCancel,
  onDirtyChange,
  onSaved,
  trip: originalTrip,
}: {
  expense?: Expense;
  queued?: QueuedExpense;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onSaved?: () => void;
  trip: Trip;
}) {
  const { formatMoney, locale, messages } = useI18n();
  const {
    offline,
    canQueue,
    requestPayload,
    queueDraft,
    announce,
    replacePayload,
    refreshCollection,
  } = useWorkspace();
  const versionState = useExpenseVersion(expense, originalTrip.id);
  const trip = versionState.latest?.trip ?? originalTrip;
  const [serverError, setServerError] = useState("");
  const [file, setFile] = useState<File>();
  const [fileError, setFileError] = useState("");
  const [creationUncertain, setCreationUncertain] = useState(false);
  const [savedReceipt, setSavedReceipt] = useState<{
    expense: Expense;
    error: unknown;
  }>();
  const form = useForm<ExpenseDraft>({
    defaultValues: queued?.draft ?? defaults(trip, expense),
  });
  const previousLocale = useRef(locale);
  const values = form.watch();
  const isDirty = form.formState.isDirty || !!file;

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

  const reviewed = versionState.latest;
  const availablePeople = new Set(reviewed?.trip.participants.map((p) => p.id));
  const replacePayer = !!reviewed && !availablePeople.has(values.paidById);
  const replaceSplit =
    !!reviewed && values.participantIds.some((id) => !availablePeople.has(id));
  const confirmReviewedVersion = () => {
    if (!reviewed || versionState.missing) return;
    if (replacePayer || replaceSplit) {
      const draft = form.getValues();
      const latest = defaults(reviewed.trip, reviewed.expense);
      form.reset(
        {
          ...draft,
          paidById: replacePayer ? latest.paidById : draft.paidById,
          ...(replaceSplit
            ? {
                participantIds: latest.participantIds,
                splitMode: latest.splitMode,
                splitValues: latest.splitValues,
              }
            : {}),
        },
        { keepDefaultValues: true },
      );
    }
    setServerError("");
    versionState.confirm();
  };

  // React Hook Form can mutate nested splitValues without changing its identity.
  // Recompute so correcting shares after reconciliation updates save validity.
  const preview = (() => {
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
  })();

  const submit = form.handleSubmit(async (draft) => {
    setServerError("");
    if (!draft.participantIds.length) {
      form.setError("participantIds", {
        message: messages.selectAtLeastOnePersonToSplitWith,
      });
      return;
    }
    if (
      preview?.error ||
      !preview ||
      !isDateOnly(draft.expenseDate) ||
      !trip.participants.some((person) => person.id === draft.paidById) ||
      draft.participantIds.some(
        (id) => !trip.participants.some((person) => person.id === id),
      ) ||
      !isExpenseCategory(draft.category)
    ) {
      setServerError(preview?.error || messages.unableToSaveExpense);
      return;
    }
    try {
      normalizeExpenseTags(draft.tags);
      if (file) {
        const invalid = receiptFileError(file, messages);
        if (invalid) {
          setFileError(invalid);
          return;
        }
        if (queued || offline) {
          setServerError(messages.receiptOnlineOnly);
          return;
        }
      }
      if (!expense && (queued || offline)) {
        await queueDraft(draft, queued);
        announce(messages.queueSaved);
        form.reset(defaults(trip));
        onSaved?.();
        return;
      }
      if (!expense && file) {
        let created: CreateExpenseResponse;
        try {
          created = await api<CreateExpenseResponse>(
            `/api/trips/${trip.id}/expenses`,
            { body: JSON.stringify(draft), method: "POST" },
          );
        } catch (error) {
          if (!(error instanceof ApiResponseError) || error.status >= 500)
            setCreationUncertain(true);
          throw error;
        }
        replacePayload(created);
        const collectionRefresh = refreshCollection().catch(() =>
          announce(messages.loadingFailed),
        );
        const newExpense = created.trip.expenses.find(
          (item) => item.id === created.createdExpenseId,
        );
        if (!newExpense || !isExpenseVersion(newExpense.version)) {
          setCreationUncertain(true);
          setServerError(messages.expenseCreationUncertain);
          return;
        }
        try {
          const uploaded = await uploadNewExpenseReceipt(
            trip.id,
            newExpense,
            file,
          );
          replacePayload(uploaded);
          await collectionRefresh;
          await refreshCollection().catch(() =>
            announce(messages.loadingFailed),
          );
          announce(messages.expenseRecorded);
          setFile(undefined);
          form.reset(defaults(trip));
          onSaved?.();
        } catch (error) {
          setSavedReceipt({ expense: newExpense, error });
        }
        return;
      }
      await requestPayload(
        expense
          ? `/api/trips/${trip.id}/expenses/${expense.id}`
          : `/api/trips/${trip.id}/expenses`,
        {
          body: JSON.stringify(draft),
          method: expense ? "PATCH" : "POST",
          ...(expense ? { headers: versionState.headers() } : {}),
        },
        expense ? messages.expenseChangesSaved : messages.expenseRecorded,
        true,
      );
      form.reset(defaults(trip));
      onSaved?.();
    } catch (error) {
      versionState.handleError(error);
      setServerError(
        !expense &&
          (queued || offline) &&
          (error instanceof DOMException || typeof indexedDB === "undefined")
          ? messages.queueStorageError
          : error instanceof Error
            ? error.message
            : messages.unableToSaveExpense,
      );
    }
  });

  if (savedReceipt && file) {
    return (
      <CreatedReceiptRecovery
        expense={savedReceipt.expense}
        file={file}
        initialError={savedReceipt.error}
        trip={trip}
        onDone={() => {
          setFile(undefined);
          if (onSaved) onSaved();
          else onCancel();
        }}
      />
    );
  }

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
      className="expense-composer grid gap-5"
      aria-labelledby="expense-composer-heading"
    >
      <div className="expense-composer-header flex flex-wrap items-start justify-between gap-4">
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
        <div className="flex flex-wrap items-center gap-2">
          {expense ? (
            <ExpenseHistoryDialog
              tripId={originalTrip.id}
              expenseId={expense.id}
              name={expense.description}
              discardDraft={isDirty}
              onRestored={onCancel}
            />
          ) : null}
        </div>
      </div>

      <form className="grid gap-5" noValidate onSubmit={submit}>
        <ActionError message={serverError} />
        {creationUncertain ? (
          <p role="alert">{messages.expenseCreationUncertain}</p>
        ) : null}
        {!expense && (offline || queued) && canQueue ? (
          <p className="text-sm text-muted-foreground">
            {messages.queueSyncPricing}
          </p>
        ) : null}
        <ExpenseConflictReview
          state={versionState}
          onConfirm={confirmReviewedVersion}
          confirmationNotice={
            replacePayer || replaceSplit
              ? messages.expenseConflictParticipantsChanged
              : undefined
          }
        />
        <section
          className="expense-step"
          aria-labelledby="expense-basic-heading"
        >
          <h3 className="expense-step-heading" id="expense-basic-heading">
            <span className="expense-step-number" aria-hidden="true">
              1
            </span>
            {messages.expenseBasicInformation}
          </h3>
          <div className="expense-step-body">
            <div className="expense-basic-fields">
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
                      {currency} ·{" "}
                      {localizeMessage(currencyInfo[currency].label)}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          </div>
        </section>
        <section
          className="expense-step"
          aria-labelledby="expense-split-heading"
        >
          <div className="expense-step-title">
            <h3 className="expense-step-heading" id="expense-split-heading">
              <span className="expense-step-number" aria-hidden="true">
                2
              </span>
              {messages.expenseSplitSection}
            </h3>
            <span className="text-sm text-muted-foreground">
              {messages.selectedSelectedOfTotal({
                selected: values.participantIds.length,
                total: trip.participants.length,
              })}
            </span>
          </div>
          <div className="expense-step-body grid gap-4">
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
                  <span className="expense-person-avatar" aria-hidden="true">
                    {person.name.slice(0, 1).toLocaleUpperCase(locale)}
                  </span>
                  <span>{person.name}</span>
                </label>
              ))}
            </fieldset>
            <fieldset className="expense-split-method">
              <legend>{messages.splitMethod}</legend>
              <div className="expense-method-options">
                {(
                  [
                    ["equal", messages.splitEqually],
                    ["amount", messages.exactAmounts],
                    ["ratio", messages.percentages],
                    ["shares", messages.shares],
                  ] as const
                ).map(([mode, label]) => (
                  <label key={mode}>
                    <input
                      type="radio"
                      value={mode}
                      {...form.register("splitMode")}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
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
            <div className="expense-split-preview" aria-live="polite">
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
                  <ul className="expense-share-grid">
                    {preview.shares.map((share) => (
                      <li className="expense-share" key={share.participantId}>
                        <span
                          className="expense-person-avatar"
                          aria-hidden="true"
                        >
                          {trip.participants
                            .find((person) => person.id === share.participantId)
                            ?.name.slice(0, 1)
                            .toLocaleUpperCase(locale)}
                        </span>
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
          </div>
        </section>
        <section
          className="expense-step"
          aria-labelledby="expense-details-heading"
        >
          <h3 className="expense-step-heading" id="expense-details-heading">
            <span className="expense-step-number" aria-hidden="true">
              3
            </span>
            {messages.moreDetails}
          </h3>
          <div className="expense-step-body grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
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

            {!expense ? (
              <>
                <NewExpenseReceiptPicker
                  busy={form.formState.isSubmitting}
                  disabled={
                    offline ||
                    !!queued ||
                    creationUncertain ||
                    form.formState.isSubmitting
                  }
                  file={file}
                  onlineOnly={offline || !!queued}
                  onChange={(next) => {
                    setFile(next);
                    setFileError(next ? receiptFileError(next, messages) : "");
                  }}
                />
                <ActionError message={fileError} />
              </>
            ) : null}

            {expense ? (
              <section
                aria-labelledby="expense-receipt-heading"
                className="grid gap-3 rounded-xl border bg-muted/50 p-4"
              >
                <div className="grid gap-1">
                  <h3 className="font-semibold" id="expense-receipt-heading">
                    {messages.receipt}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {messages.receiptFileRequirements}
                  </p>
                </div>
                <ReceiptControls
                  expense={expense}
                  onVersionConfirm={confirmReviewedVersion}
                  trip={trip}
                  versionState={versionState}
                />
              </section>
            ) : null}
          </div>
        </section>

        {expense ? (
          <div className="flex justify-start">
            <DeleteExpenseAction
              expense={expense}
              onDeleted={onSaved ?? onCancel}
              onVersionConfirm={confirmReviewedVersion}
              trip={trip}
              versionState={versionState}
            />
          </div>
        ) : null}

        <div className="sticky-submit expense-composer-footer">
          <div className="expense-total" aria-live="polite">
            <span>{messages.expenseTotalLabel}</span>
            <strong>
              {formatMoney(preview?.amountMinor ?? 0, values.currency)}
            </strong>
            <small>
              {messages.selectedSelectedOfTotal({
                selected: values.participantIds.length,
                total: trip.participants.length,
              })}
            </small>
          </div>
          {isDirty ? (
            <ConfirmDialog
              confirmLabel={messages.discardDraft}
              description={
                creationUncertain
                  ? messages.expenseCreationUncertain
                  : messages.unsavedChangesWillBeLost
              }
              destructive
              onConfirm={onCancel}
              title={messages.discardThisDraft}
              trigger={cancelButton}
            />
          ) : (
            cancelButton
          )}
          <BusyButton
            busy={form.formState.isSubmitting}
            busyLabel={messages.saving}
            disabled={
              (offline && (!!expense || !canQueue)) ||
              !!preview?.error ||
              versionState.conflict ||
              versionState.missing ||
              creationUncertain
            }
            type="submit"
          >
            {queued
              ? messages.queueSave
              : expense
                ? messages.saveChanges
                : offline && canQueue
                  ? messages.queueSave
                  : messages.recordExpense}
          </BusyButton>
        </div>
      </form>
    </section>
  );
}
