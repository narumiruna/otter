import { expenseCategories } from "@narumitw/otter-core/expense-metadata";
import { currencies } from "@narumitw/otter-core/money";
import type { Expense, Trip } from "@narumitw/otter-core/settlement";
import {
  ImageIcon as FileImage,
  MixerHorizontalIcon,
  Pencil2Icon as Pencil,
  PlusIcon,
  FileTextIcon as Receipt,
  MagnifyingGlassIcon as Search,
  TrashIcon as Trash2,
  UploadIcon as Upload,
} from "@radix-ui/react-icons";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  defaultExpenseFilters,
  type ExpenseFilters,
  expenseSplitLabel,
  filterAndSortExpenses,
} from "../client-support.js";
import { localizeMessage, type Messages, useI18n } from "../i18n.js";
import { ExpenseCategoryIcon } from "./expense-category-icon.js";
import { ExpenseComposer } from "./expense-composer.js";
import { ActionError, useWorkspace } from "./workspace-context.js";
import { ConfirmDialog, SectionHeading } from "./workspace-ui.js";

type ExpenseGrouping = "date" | "none" | "payer";

export function ExpensesPage({
  filters,
  onAddExpense,
  onDirtyChange,
  onFiltersChange,
  readonly = false,
  trip,
}: {
  filters: ExpenseFilters;
  onAddExpense: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onFiltersChange: (filters: ExpenseFilters) => void;
  readonly?: boolean;
  trip: Trip;
}) {
  const { messages } = useI18n();
  const setFilters = (
    update: ExpenseFilters | ((filters: ExpenseFilters) => ExpenseFilters),
  ) => {
    onFiltersChange(typeof update === "function" ? update(filters) : update);
  };
  const [editing, setEditing] = useState<Expense | null>(null);
  const [grouping, setGrouping] = useState<ExpenseGrouping>("none");
  const expenses = useMemo(
    () => filterAndSortExpenses(trip, filters),
    [filters, trip],
  );
  const activeFilters = activeFilterEntries(filters, messages);
  if (editing)
    return (
      <ExpenseComposer
        expense={editing}
        onCancel={() => setEditing(null)}
        onDirtyChange={onDirtyChange}
        onSaved={() => setEditing(null)}
        trip={trip}
      />
    );
  return (
    <section
      className="surface expenses-page"
      aria-labelledby="expenses-heading"
    >
      <div className="expenses-page-heading">
        <SectionHeading
          description={messages.showingShownOfTotalExpenses({
            shown: expenses.length,
            total: trip.expenses.length,
          })}
        >
          <span id="expenses-heading">{messages.expenses}</span>
        </SectionHeading>
        <span className="expenses-heading-icon" aria-hidden="true">
          <Receipt />
        </span>
      </div>
      {trip.expenses.length > 0 ? (
        <div className="expense-tools">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_13rem_13rem]">
            <label className="relative md:col-span-2 lg:col-span-1">
              <span className="sr-only">{messages.searchDescriptions}</span>
              <Search
                className="pointer-events-none absolute top-3 left-3 size-5 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                className="form-control expense-search-input"
                placeholder={messages.searchExpenseDescriptions}
                value={filters.query}
                onChange={(event) =>
                  setFilters((value) => ({
                    ...value,
                    query: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              <span className="sr-only">{messages.sort}</span>
              <select
                className="form-control"
                value={filters.sort}
                onChange={(event) =>
                  setFilters((value) => ({
                    ...value,
                    sort: event.target.value as ExpenseFilters["sort"],
                  }))
                }
              >
                <option value="date-desc">{messages.dateNewestFirst}</option>
                <option value="date-asc">{messages.dateOldestFirst}</option>
                <option value="amount-desc">{messages.amountHighToLow}</option>
                <option value="amount-asc">{messages.amountLowToHigh}</option>
              </select>
            </label>
            <label>
              <span className="sr-only">{messages.groupBy}</span>
              <select
                className="form-control"
                value={grouping}
                onChange={(event) =>
                  setGrouping(event.target.value as ExpenseGrouping)
                }
              >
                <option value="none">{messages.noGrouping}</option>
                <option value="date">{messages.groupByDate}</option>
                <option value="payer">{messages.groupByPayer}</option>
              </select>
            </label>
          </div>
          <details className="disclosure expense-filters">
            <summary>
              <MixerHorizontalIcon aria-hidden="true" />
              {messages.moreFilters}{" "}
              <span className="summary-meta">
                {activeFilters.length
                  ? messages.countApplied({ count: activeFilters.length })
                  : messages.datePersonCurrencyCategoryAndTag}
              </span>
            </summary>
            <div className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-3">
              <Filter label={messages.from}>
                <input
                  className="form-control"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(event) =>
                    setFilters((value) => ({
                      ...value,
                      dateFrom: event.target.value,
                    }))
                  }
                />
              </Filter>
              <Filter label={messages.to}>
                <input
                  className="form-control"
                  type="date"
                  value={filters.dateTo}
                  onChange={(event) =>
                    setFilters((value) => ({
                      ...value,
                      dateTo: event.target.value,
                    }))
                  }
                />
              </Filter>
              <Filter label={messages.paidBy}>
                <ParticipantFilter
                  trip={trip}
                  value={filters.paidById}
                  onChange={(paidById) =>
                    setFilters((current) => ({ ...current, paidById }))
                  }
                />
              </Filter>
              <Filter label={messages.splitWith}>
                <ParticipantFilter
                  trip={trip}
                  value={filters.participantId}
                  onChange={(participantId) =>
                    setFilters((current) => ({ ...current, participantId }))
                  }
                />
              </Filter>
              <Filter label={messages.currency}>
                <select
                  className="form-control"
                  value={filters.currency}
                  onChange={(event) =>
                    setFilters((value) => ({
                      ...value,
                      currency: event.target.value,
                    }))
                  }
                >
                  <option value="">{messages.allCurrencies}</option>
                  {currencies.map((currency) => (
                    <option key={currency}>{currency}</option>
                  ))}
                </select>
              </Filter>
              <Filter label={messages.category}>
                <select
                  className="form-control"
                  value={filters.category}
                  onChange={(event) =>
                    setFilters((value) => ({
                      ...value,
                      category: event.target.value,
                    }))
                  }
                >
                  <option value="">{messages.allCategories}</option>
                  {expenseCategories.map((category) => (
                    <option key={category} value={category}>
                      {localizeMessage(category)}
                    </option>
                  ))}
                </select>
              </Filter>
              <Filter label={messages.tag}>
                <input
                  className="form-control"
                  placeholder={messages.exactTag}
                  value={filters.tag}
                  onChange={(event) =>
                    setFilters((value) => ({
                      ...value,
                      tag: event.target.value,
                    }))
                  }
                />
              </Filter>
            </div>
          </details>
          {activeFilters.length ? (
            <fieldset className="flex flex-wrap items-center gap-2">
              <legend className="text-sm text-muted-foreground">
                {messages.applied}
              </legend>
              {activeFilters.map(([key, label]) => (
                <Button
                  key={key}
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setFilters((value) => ({
                      ...value,
                      [key]: defaultExpenseFilters[key],
                    }))
                  }
                >
                  {label} ×
                </Button>
              ))}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setFilters({ ...defaultExpenseFilters })}
              >
                {messages.clearAll}
              </Button>
            </fieldset>
          ) : null}
        </div>
      ) : null}
      <ExpenseList
        expenses={expenses}
        grouping={grouping}
        onAddExpense={onAddExpense}
        onEdit={setEditing}
        readonly={readonly}
        sort={filters.sort}
        trip={trip}
        filtered={activeFilters.length > 0 || !!filters.query}
        clear={() => setFilters({ ...defaultExpenseFilters })}
      />
    </section>
  );
}

function Filter({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: The caller always supplies a nested form control.
    <label className="grid gap-1 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}
function ParticipantFilter({
  onChange,
  trip,
  value,
}: {
  onChange: (value: string) => void;
  trip: Trip;
  value: string;
}) {
  const { messages } = useI18n();
  return (
    <select
      className="form-control"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">{messages.allPeople}</option>
      {trip.participants.map((person) => (
        <option key={person.id} value={person.id}>
          {person.name}
        </option>
      ))}
    </select>
  );
}

function activeFilterEntries(
  filters: ExpenseFilters,
  messages: Messages,
): [Exclude<keyof ExpenseFilters, "query" | "sort">, string][] {
  const labels: Record<
    Exclude<keyof ExpenseFilters, "query" | "sort">,
    string
  > = {
    category: messages.categoryValue({
      value: localizeMessage(filters.category),
    }),
    currency: messages.currencyValue({ value: filters.currency }),
    dateFrom: messages.fromValue({ value: filters.dateFrom }),
    dateTo: messages.toValue({ value: filters.dateTo }),
    paidById: messages.paidBy,
    participantId: messages.splitWith,
    tag: messages.tagValue({ value: filters.tag }),
  };
  return (Object.keys(labels) as (keyof typeof labels)[])
    .filter((key) => !!filters[key])
    .map((key) => [key, labels[key]]);
}

function ExpenseList({
  clear,
  expenses,
  filtered,
  grouping,
  onAddExpense,
  onEdit,
  readonly,
  sort,
  trip,
}: {
  clear: () => void;
  expenses: Expense[];
  filtered: boolean;
  grouping: ExpenseGrouping;
  onAddExpense: () => void;
  onEdit: (expense: Expense) => void;
  readonly: boolean;
  sort: ExpenseFilters["sort"];
  trip: Trip;
}) {
  const { messages } = useI18n();
  if (!trip.expenses.length)
    return (
      <div className="empty-state expense-empty-state">
        <div className="expense-empty-art" aria-hidden="true">
          <span className="expense-empty-receipt">
            <Receipt />
          </span>
          <span className="expense-empty-plus">
            <PlusIcon />
          </span>
        </div>
        <h3>{messages.noExpensesYet}</h3>
        <p>
          {messages.aCompleteHistoryWillAppearHereAfterTheFirstSharedExpense}
        </p>
        {!readonly ? (
          <Button onClick={onAddExpense}>
            <PlusIcon aria-hidden="true" />
            {messages.recordFirstExpense}
          </Button>
        ) : null}
      </div>
    );
  if (!expenses.length)
    return (
      <div className="empty-state expense-empty-state">
        <span className="expenses-heading-icon" aria-hidden="true">
          <Search />
        </span>
        <h3>{messages.noMatchingExpenses}</h3>
        <p>{messages.adjustOrClearTheFiltersToSeeAllExpenses}</p>
        <Button onClick={clear} variant="outline">
          {messages.clearFilters}
        </Button>
      </div>
    );
  const names = new Map(
    trip.participants.map((person) => [person.id, person.name]),
  );
  const listLabel = filtered ? messages.filteredExpenses : messages.allExpenses;
  if (grouping === "none")
    return (
      <ul className="grid gap-3" aria-label={listLabel}>
        {expenses.map((expense) => (
          <ExpenseListItem
            expense={expense}
            key={expense.id}
            names={names}
            onEdit={onEdit}
            readonly={readonly}
            trip={trip}
          />
        ))}
      </ul>
    );
  const groups = groupExpenses(
    expenses,
    grouping,
    sort === "date-asc" ? "asc" : "desc",
  );
  if (grouping === "payer") {
    const participantOrder = new Map(
      trip.participants.map((person, index) => [person.id, index]),
    );
    groups.sort(
      (left, right) =>
        (participantOrder.get(left.key) ?? Number.MAX_SAFE_INTEGER) -
          (participantOrder.get(right.key) ?? Number.MAX_SAFE_INTEGER) ||
        left.key.localeCompare(right.key),
    );
  }
  return (
    <section className="grid gap-5" aria-label={listLabel}>
      {groups.map((group, index) => {
        const headingId = `expense-group-${index}`;
        return (
          <section className="expense-group" key={group.key}>
            <h3 className="expense-group-heading" id={headingId}>
              {grouping === "date"
                ? group.key
                : (names.get(group.key) ?? messages.unknown)}
            </h3>
            <ul className="grid gap-3" aria-labelledby={headingId}>
              {group.expenses.map((expense) => (
                <ExpenseListItem
                  expense={expense}
                  key={expense.id}
                  names={names}
                  onEdit={onEdit}
                  readonly={readonly}
                  trip={trip}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </section>
  );
}

function groupExpenses(
  expenses: Expense[],
  grouping: Exclude<ExpenseGrouping, "none">,
  dateDirection: "asc" | "desc",
): { expenses: Expense[]; key: string }[] {
  const grouped = new Map<string, Expense[]>();
  for (const expense of expenses) {
    const key = grouping === "date" ? expense.expenseDate : expense.paidById;
    const group = grouped.get(key) ?? [];
    group.push(expense);
    grouped.set(key, group);
  }
  const groups = [...grouped.entries()].map(([key, group]) => ({
    expenses: group,
    key,
  }));
  if (grouping === "date") {
    groups.sort((left, right) =>
      dateDirection === "asc"
        ? left.key.localeCompare(right.key)
        : right.key.localeCompare(left.key),
    );
  }
  return groups;
}

function ExpenseListItem({
  expense,
  names,
  onEdit,
  readonly,
  trip,
}: {
  expense: Expense;
  names: Map<string, string>;
  onEdit: (expense: Expense) => void;
  readonly: boolean;
  trip: Trip;
}) {
  const { formatMoney, messages } = useI18n();
  return (
    <li className="expense-list-item rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start gap-3">
        <ExpenseCategoryIcon category={expense.category} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap justify-between gap-2">
            <strong className="break-anywhere">{expense.description}</strong>
            <strong className="tabular-nums">
              {formatMoney(expense.amountMinor, expense.currency)}
            </strong>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {messages.datePaidByName({
              date: expense.expenseDate,
              name: names.get(expense.paidById) ?? messages.unknown,
            })}
          </p>
          <p className="text-sm text-muted-foreground">
            {localizeMessage(expense.category ?? "其他")}
            {expense.tags?.length ? ` · ${expense.tags.join(", ")}` : ""} ·{" "}
            {messages.splitWithSplit({
              split: expenseSplitLabel(trip, expense.participantIds),
            })}
          </p>
        </div>
      </div>
      {!readonly ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
          <Button size="sm" variant="outline" onClick={() => onEdit(expense)}>
            <Pencil aria-hidden="true" />
            {messages.edit}
          </Button>
          <ReceiptControls expense={expense} trip={trip} />
          <DeleteExpense expense={expense} trip={trip} />
        </div>
      ) : null}
    </li>
  );
}

function ReceiptControls({ expense, trip }: { expense: Expense; trip: Trip }) {
  const { messages } = useI18n();
  const { announce, offline, replacePayload } = useWorkspace();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/trips/${trip.id}/expenses/${expense.id}/receipt`,
        {
          body: file,
          credentials: "same-origin",
          headers: { "Content-Type": file.type },
          method: "PUT",
        },
      );
      const data = (await response.json()) as
        | import("../client-support.js").TripPayload
        | { error?: string };
      if (!response.ok) {
        const message =
          "error" in data && data.error
            ? localizeMessage(data.error)
            : messages.receiptUploadFailed;
        throw new Error(message);
      }
      replacePayload(data as import("../client-support.js").TripPayload);
      announce(messages.receiptUploaded);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : messages.receiptUploadFailed,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <label className="button-outline button-sm">
        <Upload aria-hidden="true" />
        <span>{busy ? messages.uploading : messages.uploadReceipt}</span>
        <input
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy || offline}
          onChange={(event) => void upload(event.target.files?.[0])}
        />
      </label>
      {expense.receiptUrl ? (
        <a
          className="button-outline button-sm"
          href={expense.receiptUrl}
          target="_blank"
          rel="noreferrer"
        >
          <FileImage aria-hidden="true" />
          {messages.viewReceipt}
        </a>
      ) : (
        <span className="self-center text-xs text-muted-foreground">
          {messages.noReceipt}
        </span>
      )}
      <ActionError message={error} />
      {expense.receiptUrl ? (
        <DeleteReceipt expense={expense} trip={trip} />
      ) : null}
    </>
  );
}
function DeleteReceipt({ expense, trip }: { expense: Expense; trip: Trip }) {
  const { messages } = useI18n();
  const { offline, requestPayload } = useWorkspace();
  return (
    <ConfirmDialog
      confirmLabel={messages.deleteReceipt}
      description={
        messages.youCanUploadAnotherReceiptLaterTheExpenseWillNotBeDeleted
      }
      destructive
      disabled={offline}
      onConfirm={() =>
        requestPayload(
          `/api/trips/${trip.id}/expenses/${expense.id}/receipt`,
          { method: "DELETE" },
          messages.receiptDeleted,
        )
      }
      title={messages.deleteThisReceipt}
      trigger={
        <Button size="sm" variant="ghost">
          {messages.deleteReceipt}
        </Button>
      }
    />
  );
}
function DeleteExpense({ expense, trip }: { expense: Expense; trip: Trip }) {
  const { messages } = useI18n();
  const { offline, requestPayload } = useWorkspace();
  return (
    <ConfirmDialog
      confirmLabel={messages.deleteName({ name: expense.description })}
      description={
        messages.thisCannotBeUndoneAllBalancesAndSettlementSuggestionsWillBeRecalculated
      }
      destructive
      disabled={offline}
      onConfirm={() =>
        requestPayload(
          `/api/trips/${trip.id}/expenses/${expense.id}`,
          { method: "DELETE" },
          messages.expenseDeleted,
          true,
        )
      }
      title={messages.deleteThisExpense}
      trigger={
        <Button className="ml-auto" size="sm" variant="ghost">
          <Trash2 aria-hidden="true" />
          {messages.delete}
        </Button>
      }
    />
  );
}
