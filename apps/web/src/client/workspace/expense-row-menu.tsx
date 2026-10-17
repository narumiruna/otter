import type { Expense, Trip } from "@narumitw/otter-contracts";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { DropdownMenu } from "@radix-ui/themes";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "../i18n.js";
import { DeleteExpenseAction } from "./expense-actions.js";
import { ExpenseHistoryDialog } from "./expense-history-dialog.js";
import { useExpenseVersion } from "./expense-version.js";
import { useOptionalWorkspace } from "./workspace-context.js";

type Action = "edit" | "copy" | "history" | "delete";

export function ExpenseRowMenu({
  expense,
  onCopy,
  onEdit,
  readonly,
  trip,
}: {
  expense: Expense;
  onCopy?: (expense: Expense) => void;
  onEdit: (expense: Expense) => void;
  readonly: boolean;
  trip: Trip;
}) {
  const { messages } = useI18n();
  const workspace = useOptionalWorkspace();
  const version = useExpenseVersion(expense, trip.id);
  const trigger = useRef<HTMLButtonElement>(null);
  const region = useRef<Element | null>(null);
  const pending = useRef<Action | null>(null);
  const [dialog, setDialog] = useState<"history" | "delete" | null>(null);
  const canEdit = !readonly && !trip.archivedAt && !workspace?.payload.readonly;
  const canHistory = !!workspace && !workspace.payload.readonly;
  if (!canEdit && !canHistory) return null;

  const select = (action: Action) => {
    region.current = trigger.current?.closest(".expenses-page") ?? null;
    if (action === "delete") version.begin();
    pending.current = action;
  };
  const restoreFocus = (event: Event) => {
    event.preventDefault();
    const target = trigger.current?.isConnected
      ? trigger.current
      : (region.current?.querySelector<HTMLElement>(
          "[data-expense-row-menu]",
        ) ?? document.getElementById("expenses-heading"));
    target?.focus();
  };

  return (
    <>
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="expense-row-menu-trigger"
            data-expense-row-menu
            ref={trigger}
            aria-label={messages.moreActionsForName({
              name: expense.description,
            })}
          >
            <DotsHorizontalIcon aria-hidden="true" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
          className="expense-row-menu-content"
          align="end"
          highContrast
          collisionPadding={8}
          onCloseAutoFocus={(event) => {
            const action = pending.current;
            pending.current = null;
            if (!action) return;
            event.preventDefault();
            if (action === "edit") onEdit(expense);
            else if (action === "copy") onCopy?.(expense);
            else setDialog(action);
          }}
        >
          {canEdit ? (
            <>
              <DropdownMenu.Item onSelect={() => select("edit")}>
                {messages.editExpense}
              </DropdownMenu.Item>
              {onCopy ? (
                <DropdownMenu.Item onSelect={() => select("copy")}>
                  {messages.copyExpense}
                </DropdownMenu.Item>
              ) : null}
            </>
          ) : null}
          {canHistory ? (
            <DropdownMenu.Item onSelect={() => select("history")}>
              {messages.expenseHistory}
            </DropdownMenu.Item>
          ) : null}
          {canEdit && workspace ? (
            <>
              <DropdownMenu.Separator />
              <DropdownMenu.Item
                color="red"
                disabled={workspace.offline}
                onSelect={() => select("delete")}
              >
                {messages.deleteExpense}
              </DropdownMenu.Item>
            </>
          ) : null}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
      {canHistory ? (
        <ExpenseHistoryDialog
          expenseId={expense.id}
          name={expense.description}
          tripId={trip.id}
          open={dialog === "history"}
          onOpenChange={(open) => setDialog(open ? "history" : null)}
          onCloseAutoFocus={restoreFocus}
        />
      ) : null}
      {canEdit && workspace ? (
        <DeleteExpenseAction
          expense={expense}
          trip={trip}
          open={dialog === "delete"}
          onOpenChange={(open) => setDialog(open ? "delete" : null)}
          onCloseAutoFocus={restoreFocus}
          versionState={version}
        />
      ) : null}
    </>
  );
}
