import { type ComponentProps, useEffect, useState } from "react";
import { ExpenseComposer } from "./expense-composer.js";
import { ExpensesPage } from "./expenses-page.js";

// Unit tests own a controlled editor. Browser tests cover the URL/history owner.
export function ExpensesPageTestHarness(
  props: ComponentProps<typeof ExpensesPage>,
) {
  const [expenseId, setExpenseId] = useState<string | null>(null);
  const canEdit = !props.readonly && !props.trip.archivedAt;
  const expense = canEdit
    ? props.trip.expenses.find((item) => item.id === expenseId)
    : undefined;
  const { onEditingChange } = props;
  useEffect(() => {
    if (!canEdit) setExpenseId(null);
  }, [canEdit]);
  useEffect(() => {
    if (!expense) return;
    onEditingChange?.(true);
    return () => onEditingChange?.(false);
  }, [expense, onEditingChange]);
  if (expense)
    return (
      <ExpenseComposer
        expense={expense}
        trip={props.trip}
        onDirtyChange={props.onDirtyChange}
        onCancel={() => setExpenseId(null)}
        onSaved={() => setExpenseId(null)}
      />
    );
  return (
    <ExpensesPage
      {...props}
      onEditExpense={(item) => {
        props.onEditExpense?.(item);
        setExpenseId(item.id);
      }}
    />
  );
}
