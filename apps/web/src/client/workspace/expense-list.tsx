import type { Expense, Trip } from "@narumitw/otter-contracts";
import {
  PlusIcon,
  FileTextIcon as Receipt,
  MagnifyingGlassIcon as Search,
} from "@radix-ui/react-icons";
import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ExpenseFilters } from "../client-support.js";
import {
  type Locale,
  localizeMessage,
  type Messages,
  useI18n,
} from "../i18n.js";
import { useMediaQuery } from "../use-media-query.js";
import { ExpenseCategoryIcon } from "./expense-category-icon.js";
import { type ExpenseColumn, expenseColumnLabel } from "./expense-columns.js";
import { ExpenseHistoryDialog } from "./expense-history-dialog.js";
import { ExpenseRateDetails } from "./expense-rate.js";
import type { ExpenseGrouping } from "./expenses-page.js";
import { MobileExpenseRow } from "./mobile-expense-row.js";
import { ReceiptPreview } from "./receipt-preview.js";
import { useOptionalWorkspace } from "./workspace-context.js";
export function ExpenseList({
  clear,
  columns,
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
  columns: ExpenseColumn[];
  expenses: Expense[];
  filtered: boolean;
  grouping: ExpenseGrouping;
  onAddExpense: () => void;
  onEdit: (expense: Expense) => void;
  readonly: boolean;
  sort: ExpenseFilters["sort"];
  trip: Trip;
}) {
  const { formatMoney, messages } = useI18n();
  const mobile = useMediaQuery("(max-width: 680px)");
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
  const columnCount = visibleColumns.length + 2;
  if (mobile)
    return (
      <section className="expense-mobile-list" aria-label={listLabel}>
        {groups.map((group) => (
          <section key={group.key}>
            {grouping !== "none" ? (
              <header className="expense-mobile-group">
                <h3>
                  {grouping === "date"
                    ? group.key
                    : (names.get(group.key) ?? messages.unknown)}
                </h3>
                <span>
                  {messages.expenseGroupSummary({
                    count: group.expenses.length,
                    total: groupTotalLabel(group.expenses, formatMoney),
                  })}
                </span>
              </header>
            ) : null}
            <ul>
              {group.expenses.map((expense) => (
                <MobileExpenseRow
                  key={expense.id}
                  expense={expense}
                  names={names}
                  onEdit={onEdit}
                  readonly={readonly}
                  trip={trip}
                />
              ))}
            </ul>
          </section>
        ))}
      </section>
    );

  return (
    <section className="expense-table-region" aria-label={listLabel}>
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

function SplitParticipantLabel({
  expense,
  locale,
  messages,
  names,
}: {
  expense: Expense;
  locale: Locale;
  messages: Messages;
  names: Map<string, string>;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [showCount, setShowCount] = useState(false);
  const namesLabel = expense.participantIds
    .map((participantId) => names.get(participantId) ?? messages.unknown)
    .join(locale === "zh-TW" || locale === "ja" ? "、" : ", ");
  const countLabel = messages.countPeople({
    count: expense.participantIds.length,
  });

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure || measure.textContent !== namesLabel) return;
    const update = () =>
      setShowCount(measure.scrollWidth > container.clientWidth);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(container);
    observer.observe(measure);
    return () => observer.disconnect();
  }, [namesLabel]);

  return (
    <span
      className="expense-participant-label"
      ref={containerRef}
      title={showCount ? namesLabel : undefined}
    >
      <span
        aria-hidden="true"
        className="expense-participant-label-measure"
        ref={measureRef}
      >
        {namesLabel}
      </span>
      <span className="expense-participant-label-value">
        {showCount ? countLabel : namesLabel}
      </span>
    </span>
  );
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
  const { locale, messages } = useI18n();
  const workspace = useOptionalWorkspace();
  return (
    <tr
      className="expense-table-row"
      data-editable={!readonly || undefined}
      onClick={
        readonly
          ? undefined
          : (event) => {
              if (
                !(event.target instanceof Element) ||
                !event.currentTarget.contains(event.target) ||
                event.target.closest("button, a, input, select, textarea")
              )
                return;
              onEdit(expense);
            }
      }
    >
      <th className="expense-description-cell" scope="row">
        {readonly ? (
          trip.archivedAt && workspace && !workspace.payload.readonly ? (
            <ExpenseHistoryDialog
              tripId={trip.id}
              expenseId={expense.id}
              name={expense.description}
              descriptionTrigger
            />
          ) : (
            <span>{expense.description}</span>
          )
        ) : (
          <button type="button" onClick={() => onEdit(expense)}>
            {expense.description}
          </button>
        )}
      </th>
      {columns.map((column) => (
        <td className={`expense-${column}-cell`} key={column}>
          {column === "payer" ? (
            <span className="expense-payer">
              <span className="person-avatar" aria-hidden="true">
                {(names.get(expense.paidById) ?? "?")
                  .charAt(0)
                  .toLocaleUpperCase()}
              </span>
              <span>{names.get(expense.paidById) ?? messages.unknown}</span>
            </span>
          ) : column === "category" ? (
            <span
              className="expense-category-label"
              data-category={expense.category ?? "其他"}
            >
              <ExpenseCategoryIcon category={expense.category} />
              {localizeMessage(expense.category ?? "其他")}
            </span>
          ) : column === "date" ? (
            expense.expenseDate
          ) : column === "participants" ? (
            <SplitParticipantLabel
              expense={expense}
              locale={locale}
              messages={messages}
              names={names}
            />
          ) : column === "tags" ? (
            expense.tags?.join(", ")
          ) : expense.receiptUrl ? (
            <ReceiptPreview
              compact
              name={expense.description}
              url={expense.receiptUrl}
            />
          ) : null}
        </td>
      ))}
      <td className="expense-amount-cell">
        <ExpenseRateDetails expense={expense} trip={trip} showAmount />
      </td>
    </tr>
  );
}
