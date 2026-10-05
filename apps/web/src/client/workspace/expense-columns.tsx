import { ColumnsIcon, ResetIcon } from "@radix-ui/react-icons";
import { Popover } from "@radix-ui/themes";
import { Button } from "@/components/ui/button";
import { type Messages, useI18n } from "../i18n.js";
export type ExpenseColumn =
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
export const defaultExpenseColumns: ExpenseColumn[] = [
  "payer",
  "category",
  "date",
];

function expenseColumnStorageKey(userId: string): string {
  return `otter.expense-columns.${userId}`;
}

export function readExpenseColumns(userId: string): ExpenseColumn[] {
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

export function writeExpenseColumns(
  userId: string,
  columns: ExpenseColumn[],
): void {
  try {
    window.localStorage.setItem(
      expenseColumnStorageKey(userId),
      JSON.stringify(columns),
    );
  } catch {
    // The current view still works when browser storage is unavailable.
  }
}

export function ExpenseColumnMenu({
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

export function expenseColumnLabel(
  column: ExpenseColumn,
  messages: Messages,
): string {
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
