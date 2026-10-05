import type { Trip } from "@narumitw/otter-contracts";
import { tripExpensesCsv } from "@narumitw/otter-core/csv";
import { DownloadIcon } from "@radix-ui/react-icons";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  defaultExpenseFilters,
  downloadText,
  type ExpenseFilters,
  filterAndSortExpenses,
  safeFilename,
} from "../client-support.js";
import { useI18n } from "../i18n.js";
import {
  type ExpenseColumn,
  readExpenseColumns,
  writeExpenseColumns,
} from "./expense-columns.js";
import { ExpenseComposer } from "./expense-composer.js";
import { ExpenseHistoryDialog } from "./expense-history-dialog.js";
import { ExpenseList } from "./expense-list.js";
import { activeFilterEntries, ExpenseToolbar } from "./expense-toolbar.js";
import { SectionHeading } from "./workspace-ui.js";
export type ExpenseGrouping = "date" | "none" | "payer";

export function ExpensesPage({
  filters,
  grouping,
  initialEditingExpenseId = null,
  onAddExpense,
  onDirtyChange,
  onEditingChange,
  onFiltersChange,
  onGroupingChange,
  readonly = false,
  trip,
  userId = "current",
}: {
  filters: ExpenseFilters;
  grouping: ExpenseGrouping;
  initialEditingExpenseId?: string | null;
  onAddExpense: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onEditingChange?: (editing: boolean) => void;
  onFiltersChange: (filters: ExpenseFilters) => void;
  onGroupingChange: (grouping: ExpenseGrouping) => void;
  readonly?: boolean;
  trip: Trip;
  userId?: string;
}) {
  const { messages } = useI18n();
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(
    initialEditingExpenseId,
  );
  useEffect(() => {
    onEditingChange?.(!!editingExpenseId);
    return () => onEditingChange?.(false);
  }, [editingExpenseId, onEditingChange]);
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
  const editing = trip.expenses.find(
    (expense) => expense.id === editingExpenseId,
  );
  if (editing)
    return (
      <ExpenseComposer
        expense={editing}
        onCancel={() => setEditingExpenseId(null)}
        onDirtyChange={onDirtyChange}
        onSaved={() => setEditingExpenseId(null)}
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
        <div className="expenses-heading-actions">
          <ExpenseHistoryDialog tripId={trip.id} />
          {trip.expenses.length ? (
            <Button
              variant="outline"
              size="icon"
              aria-label={messages.exportExpenseCsv}
              onClick={() =>
                downloadText(
                  `${safeFilename(trip.name)}-expenses.csv`,
                  tripExpensesCsv(trip),
                )
              }
            >
              <DownloadIcon aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </div>
      {trip.expenses.length > 0 ? (
        <ExpenseToolbar
          filters={filters}
          grouping={grouping}
          onFiltersChange={onFiltersChange}
          onGroupingChange={onGroupingChange}
          columns={columns}
          onColumnsChange={updateColumns}
          trip={trip}
        />
      ) : null}
      <ExpenseList
        columns={columns}
        expenses={expenses}
        grouping={grouping}
        onAddExpense={onAddExpense}
        onEdit={(expense) => setEditingExpenseId(expense.id)}
        readonly={readonly}
        sort={filters.sort}
        trip={trip}
        filtered={activeFilters.length > 0 || !!filters.query}
        clear={() => onFiltersChange({ ...defaultExpenseFilters })}
      />
    </section>
  );
}
