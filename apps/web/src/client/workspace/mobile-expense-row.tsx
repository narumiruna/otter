import type { Expense, Trip } from "@narumitw/otter-contracts";
import { Button } from "@/components/ui/button";
import { localizeMessage, useI18n } from "../i18n.js";
import { ExpenseCategoryIcon } from "./expense-category-icon.js";
import { ExpenseHistoryDialog } from "./expense-history-dialog.js";
import { ExpenseRateDetails } from "./expense-rate.js";
import { ReceiptPreview } from "./receipt-preview.js";
import { useOptionalWorkspace } from "./workspace-context.js";

export function MobileExpenseRow({
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
  const { messages, locale } = useI18n();
  const workspace = useOptionalWorkspace();
  const payer = names.get(expense.paidById) ?? messages.unknown;
  const namesLabel = expense.participantIds
    .map((id) => names.get(id) ?? messages.unknown)
    .join(locale === "zh-TW" || locale === "ja" ? "、" : ", ");
  const split =
    expense.participantIds.length > 2 || namesLabel.length > 36
      ? messages.countPeople({ count: expense.participantIds.length })
      : namesLabel;
  return (
    <li className="expense-mobile-row">
      <div className="expense-mobile-primary">
        {readonly ? (
          trip.archivedAt && workspace && !workspace.payload.readonly ? (
            <span className="expense-mobile-history">
              <ExpenseHistoryDialog
                tripId={trip.id}
                expenseId={expense.id}
                name={expense.description}
                descriptionTrigger
              />
            </span>
          ) : (
            <strong>{expense.description}</strong>
          )
        ) : (
          <Button
            variant="ghost"
            className="expense-mobile-name"
            onClick={() => onEdit(expense)}
          >
            {expense.description}
          </Button>
        )}
        <span className="expense-mobile-amount">
          <ExpenseRateDetails expense={expense} trip={trip} showAmount />
        </span>
      </div>
      <div className="expense-mobile-secondary">
        <span className="person-avatar" aria-hidden="true">
          {payer.charAt(0).toLocaleUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="break-anywhere">
            {payer} · <span title={namesLabel}>{split}</span>
          </p>
          <span
            className="expense-category-label"
            data-category={expense.category ?? "其他"}
          >
            <ExpenseCategoryIcon category={expense.category} />
            {localizeMessage(expense.category ?? "其他")}
          </span>
          {expense.tags?.length ? (
            <span className="expense-mobile-tags">
              {expense.tags.join(", ")}
            </span>
          ) : null}
        </div>
        {expense.receiptUrl ? (
          <ReceiptPreview
            compact
            name={expense.description}
            url={expense.receiptUrl}
          />
        ) : null}
      </div>
    </li>
  );
}
