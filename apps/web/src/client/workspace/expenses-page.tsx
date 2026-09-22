import type { Expense, Trip } from "@narumitw/otter-contracts";
import { expenseCategories } from "@narumitw/otter-core/expense-metadata";
import { currencies } from "@narumitw/otter-core/money";
import {
  ColumnsIcon,
  DotsHorizontalIcon,
  ImageIcon as FileImage,
  MixerHorizontalIcon,
  Pencil2Icon as Pencil,
  PlusIcon,
  FileTextIcon as Receipt,
  ResetIcon,
  MagnifyingGlassIcon as Search,
} from "@radix-ui/react-icons";
import { Popover } from "@radix-ui/themes";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  defaultExpenseFilters,
  type ExpenseFilters,
  filterAndSortExpenses,
} from "../client-support.js";
import {
  type Locale,
  localizeMessage,
  type Messages,
  useI18n,
} from "../i18n.js";
import { DeleteExpenseAction, ReceiptControls } from "./expense-actions.js";
import { ExpenseCategoryIcon } from "./expense-category-icon.js";
import { ExpenseComposer } from "./expense-composer.js";
import { ExpenseHistoryDialog } from "./expense-history-dialog.js";
import { SectionHeading } from "./workspace-ui.js";

export type ExpenseGrouping = "date" | "none" | "payer";

type ExpenseColumn =
  | "category"
  | "date"
  | "participants"
  | "payer"
  | "receipt"
  | "tags";

const expenseColumns: ExpenseColumn[] = [
  "payer",
  "category",
  "date",
  "participants",
  "receipt",
  "tags",
];
const defaultExpenseColumns: ExpenseColumn[] = ["payer", "category", "date"];

export function ExpensesPage({
  filters,
  grouping,
  onAddExpense,
  onDirtyChange,
  onFiltersChange,
  onGroupingChange,
  readonly = false,
  trip,
  userId = "current",
}: {
  filters: ExpenseFilters;
  grouping: ExpenseGrouping;
  onAddExpense: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onFiltersChange: (filters: ExpenseFilters) => void;
  onGroupingChange: (grouping: ExpenseGrouping) => void;
  readonly?: boolean;
  trip: Trip;
  userId?: string;
}) {
  const { messages } = useI18n();
  const setFilters = (
    update: ExpenseFilters | ((filters: ExpenseFilters) => ExpenseFilters),
  ) => {
    onFiltersChange(typeof update === "function" ? update(filters) : update);
  };
  const [editing, setEditing] = useState<Expense | null>(null);
  const [columns, setColumns] = useState<ExpenseColumn[]>(() =>
    readExpenseColumns(userId),
  );
  useEffect(() => setColumns(readExpenseColumns(userId)), [userId]);
  const updateColumns = (next: ExpenseColumn[]) => {
    setColumns(next);
    writeExpenseColumns(userId, next);
  };
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
        <ExpenseHistoryDialog tripId={trip.id} />
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
                  onGroupingChange(event.target.value as ExpenseGrouping)
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
        columns={columns}
        expenses={expenses}
        grouping={grouping}
        onAddExpense={onAddExpense}
        onEdit={setEditing}
        readonly={readonly}
        sort={filters.sort}
        trip={trip}
        filtered={activeFilters.length > 0 || !!filters.query}
        clear={() => setFilters({ ...defaultExpenseFilters })}
        onColumnsChange={updateColumns}
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

function expenseColumnStorageKey(userId: string): string {
  return `otter.expense-columns.${userId}`;
}

function readExpenseColumns(userId: string): ExpenseColumn[] {
  try {
    const stored = window.localStorage.getItem(expenseColumnStorageKey(userId));
    if (stored === null) return [...defaultExpenseColumns];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [...defaultExpenseColumns];
    return expenseColumns.filter((column) => parsed.includes(column));
  } catch {
    return [...defaultExpenseColumns];
  }
}

function writeExpenseColumns(userId: string, columns: ExpenseColumn[]): void {
  try {
    window.localStorage.setItem(
      expenseColumnStorageKey(userId),
      JSON.stringify(columns),
    );
  } catch {
    // The current view still works when browser storage is unavailable.
  }
}

function ExpenseList({
  clear,
  columns,
  expenses,
  filtered,
  grouping,
  onAddExpense,
  onColumnsChange,
  onEdit,
  readonly,
  sort,
  trip,
}: {
  clear: () => void;
  columns: ExpenseColumn[];
  expenses: Expense[];
  filtered: boolean;
  grouping: ExpenseGrouping;
  onAddExpense: () => void;
  onColumnsChange: (columns: ExpenseColumn[]) => void;
  onEdit: (expense: Expense) => void;
  readonly: boolean;
  sort: ExpenseFilters["sort"];
  trip: Trip;
}) {
  const { formatMoney, messages } = useI18n();
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
  const visibleColumns = columns.filter(
    (column) =>
      !(column === "date" && grouping === "date") &&
      !(column === "payer" && grouping === "payer"),
  );
  const groups =
    grouping === "none"
      ? [{ expenses, key: "all" }]
      : groupExpenses(expenses, grouping, sort === "date-asc" ? "asc" : "desc");
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
  const columnCount = visibleColumns.length + (readonly ? 2 : 3);

  return (
    <section className="expense-table-region" aria-label={listLabel}>
      <div className="expense-table-toolbar">
        <ExpenseColumnMenu columns={columns} onChange={onColumnsChange} />
      </div>
      <div className="expense-table-scroll">
        <table className="expense-table">
          <caption className="sr-only">{listLabel}</caption>
          <thead>
            <tr>
              <th className="expense-description-column" scope="col">
                {messages.expenseName}
              </th>
              {visibleColumns.map((column) => (
                <th
                  className={`expense-${column}-column`}
                  key={column}
                  scope="col"
                >
                  {expenseColumnLabel(column, messages)}
                </th>
              ))}
              <th className="expense-amount-column" scope="col">
                {messages.amount}
              </th>
              {!readonly ? (
                <th className="expense-actions-column" scope="col">
                  <span className="sr-only">{messages.actions}</span>
                </th>
              ) : null}
            </tr>
          </thead>
          {groups.map((group, index) => {
            const headingId = `expense-group-${index}`;
            const total = groupTotalLabel(group.expenses, formatMoney);
            return (
              <tbody key={group.key}>
                {grouping !== "none" ? (
                  <tr className="expense-group-row">
                    <th colSpan={columnCount} scope="rowgroup">
                      <div>
                        <h3 id={headingId}>
                          {grouping === "date"
                            ? group.key
                            : (names.get(group.key) ?? messages.unknown)}
                        </h3>
                        <span>
                          {messages.expenseGroupSummary({
                            count: group.expenses.length,
                            total,
                          })}
                        </span>
                      </div>
                    </th>
                  </tr>
                ) : null}
                {group.expenses.map((expense) => (
                  <ExpenseTableRow
                    columns={visibleColumns}
                    expense={expense}
                    key={expense.id}
                    names={names}
                    onEdit={onEdit}
                    readonly={readonly}
                    trip={trip}
                  />
                ))}
              </tbody>
            );
          })}
        </table>
      </div>
    </section>
  );
}

function ExpenseColumnMenu({
  columns,
  onChange,
}: {
  columns: ExpenseColumn[];
  onChange: (columns: ExpenseColumn[]) => void;
}) {
  const { messages } = useI18n();
  const labels: [ExpenseColumn, string][] = expenseColumns.map((column) => [
    column,
    expenseColumnLabel(column, messages),
  ]);
  return (
    <Popover.Root>
      <Popover.Trigger>
        <Button size="sm" variant="outline">
          <ColumnsIcon aria-hidden="true" />
          {messages.columns}
        </Button>
      </Popover.Trigger>
      <Popover.Content
        align="end"
        className="expense-column-popover"
        sideOffset={6}
      >
        <fieldset>
          <legend className="sr-only">{messages.chooseExpenseColumns}</legend>
          <label>
            <input checked disabled type="checkbox" />
            {messages.expenseName}
          </label>
          <label>
            <input checked disabled type="checkbox" />
            {messages.amount}
          </label>
          {labels.map(([column, label]) => (
            <label key={column}>
              <input
                checked={columns.includes(column)}
                type="checkbox"
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? expenseColumns.filter(
                          (candidate) =>
                            candidate === column || columns.includes(candidate),
                        )
                      : columns.filter((candidate) => candidate !== column),
                  )
                }
              />
              {label}
            </label>
          ))}
        </fieldset>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onChange([...defaultExpenseColumns])}
        >
          <ResetIcon aria-hidden="true" />
          {messages.restoreDefaults}
        </Button>
      </Popover.Content>
    </Popover.Root>
  );
}

function expenseColumnLabel(column: ExpenseColumn, messages: Messages): string {
  const labels: Record<ExpenseColumn, string> = {
    category: messages.category,
    date: messages.date,
    participants: messages.splitParticipants,
    payer: messages.paidBy,
    receipt: messages.receipt,
    tags: messages.tags,
  };
  return labels[column];
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

function groupTotalLabel(
  expenses: Expense[],
  formatMoney: (amountMinor: number, currency: Expense["currency"]) => string,
): string {
  const totals = new Map<Expense["currency"], number>();
  for (const expense of expenses) {
    totals.set(
      expense.currency,
      (totals.get(expense.currency) ?? 0) + expense.amountMinor,
    );
  }
  return [...totals]
    .map(([currency, total]) => formatMoney(total, currency))
    .join(" + ");
}

const splitNamesWidthLimit = 10;

function splitParticipantLabel(
  expense: Expense,
  locale: Locale,
  messages: Messages,
  names: Map<string, string>,
): string {
  const participantNames = expense.participantIds.map(
    (participantId) => names.get(participantId) ?? messages.unknown,
  );
  const label = participantNames.join(locale === "zh-TW" ? "、" : ", ");
  const estimatedWidth = [...label].reduce(
    (width, character) =>
      width + ((character.codePointAt(0) ?? 0) <= 0xff ? 0.5 : 1),
    0,
  );
  return estimatedWidth <= splitNamesWidthLimit
    ? label
    : messages.countPeople({ count: expense.participantIds.length });
}

function ExpenseTableRow({
  columns,
  expense,
  names,
  onEdit,
  readonly,
  trip,
}: {
  columns: ExpenseColumn[];
  expense: Expense;
  names: Map<string, string>;
  onEdit: (expense: Expense) => void;
  readonly: boolean;
  trip: Trip;
}) {
  const { formatMoney, locale, messages } = useI18n();
  return (
    <tr className="expense-table-row">
      <th className="expense-description-cell" scope="row">
        <span aria-hidden="true" className="expense-table-category-icon">
          <ExpenseCategoryIcon category={expense.category} />
        </span>
        {readonly ? (
          <span>{expense.description}</span>
        ) : (
          <button type="button" onClick={() => onEdit(expense)}>
            {expense.description}
          </button>
        )}
        <ExpenseHistoryDialog
          tripId={trip.id}
          expenseId={expense.id}
          name={expense.description}
        />
      </th>
      {columns.map((column) => (
        <td className={`expense-${column}-cell`} key={column}>
          {column === "payer" ? (
            (names.get(expense.paidById) ?? messages.unknown)
          ) : column === "category" ? (
            localizeMessage(expense.category ?? "其他")
          ) : column === "date" ? (
            expense.expenseDate
          ) : column === "participants" ? (
            splitParticipantLabel(expense, locale, messages, names)
          ) : column === "tags" ? (
            expense.tags?.join(", ")
          ) : expense.receiptUrl ? (
            <a
              aria-label={messages.viewReceiptForName({
                name: expense.description,
              })}
              href={expense.receiptUrl}
              rel="noreferrer"
              target="_blank"
            >
              <FileImage aria-hidden="true" />
            </a>
          ) : null}
        </td>
      ))}
      <td className="expense-amount-cell">
        {formatMoney(expense.amountMinor, expense.currency)}
      </td>
      {!readonly ? (
        <td className="expense-actions-cell">
          <Popover.Root>
            <Popover.Trigger>
              <Button
                aria-label={messages.moreActionsForName({
                  name: expense.description,
                })}
                size="icon-sm"
                variant="ghost"
              >
                <DotsHorizontalIcon aria-hidden="true" />
              </Button>
            </Popover.Trigger>
            <Popover.Content
              align="end"
              className="expense-row-popover"
              sideOffset={4}
            >
              <Button size="sm" variant="ghost" onClick={() => onEdit(expense)}>
                <Pencil aria-hidden="true" />
                {messages.edit}
              </Button>
              <ReceiptControls expense={expense} trip={trip} />
              <DeleteExpenseAction expense={expense} trip={trip} />
            </Popover.Content>
          </Popover.Root>
        </td>
      ) : null}
    </tr>
  );
}
