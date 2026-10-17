// @vitest-environment jsdom
import "fake-indexeddb/auto";
import type { Expense, TripPayload } from "@narumitw/otter-contracts";
import {
  calculateBalances,
  calculateSettlements,
} from "@narumitw/otter-core/settlement";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, expect, test, vi } from "vitest";
import { defaultExpenseFilters } from "../client-support.js";
import { queueExpense } from "../expense-queue.js";
import { TestI18nProvider as I18nProvider } from "../test-providers.js";
import { BrowserExpenseDefaults } from "./browser-expense-defaults.js";
import { ExpenseComposer } from "./expense-composer.js";
import { ExpensesPage } from "./expenses-page.js";
import {
  preferenceKey,
  readPreferences,
  writePreferences,
} from "./personal-preferences.js";
import { WorkspaceProvider } from "./workspace-context.js";

function fixture(): TripPayload {
  const trip = {
    id: "personal-trip",
    ownerId: "personal-owner",
    name: "Trip",
    baseCurrency: "TWD" as const,
    createdAt: "now",
    participants: [
      { id: "a", name: "Alice" },
      { id: "b", name: "Bob" },
    ],
    expenses: [] as Expense[],
  };
  return {
    trip,
    balances: calculateBalances(trip),
    settlements: calculateSettlements(trip),
    currentUserRole: "editor",
  };
}
function root(
  payload: TripPayload,
  content: React.ReactNode,
  userId: string | undefined = "personal-owner",
) {
  return (
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <I18nProvider>
        <WorkspaceProvider
          announce={() => {}}
          offline={false}
          payload={payload}
          refreshCollection={async () => {}}
          userId={userId}
        >
          {content}
        </WorkspaceProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("otter.locale", "en");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("Unexpected fetch");
    }),
  );
});
test("local controls isolate accounts and groups", async () => {
  const payload = fixture();
  const defaults = {
    currency: "USD" as const,
    participantIds: ["b"],
    splitMode: "equal" as const,
    splitValues: {},
  };
  writePreferences("personal-owner", payload.trip.id, { defaults });
  writePreferences("other-account", payload.trip.id, { defaults });
  const view = render(root(payload, <BrowserExpenseDefaults />));
  await userEvent.setup().click(
    view.getByRole("button", {
      name: "Clear expense defaults for this group",
    }),
  );
  expect(view.getByRole("status")).toHaveTextContent(
    "Expense defaults cleared",
  );
  expect(
    readPreferences("personal-owner", payload.trip.id).preferences.defaults,
  ).toBeUndefined();
  expect(
    readPreferences("other-account", payload.trip.id).preferences.defaults,
  ).toEqual(defaults);
  view.rerender(root(payload, <BrowserExpenseDefaults />, "other-account"));
  expect(view.queryByRole("status")).not.toBeInTheDocument();
  view.rerender(
    root(
      { ...payload, trip: { ...payload.trip, id: "other-group" } },
      <BrowserExpenseDefaults />,
    ),
  );
  expect(view.queryByRole("status")).not.toBeInTheDocument();
  expect(globalThis.fetch).not.toHaveBeenCalled();
});
test("defaults apply to new expenses only, remember explicitly and do not replace dirty input", async () => {
  const payload = fixture();
  const user = userEvent.setup();
  localStorage.setItem(
    preferenceKey("personal-owner", payload.trip.id),
    JSON.stringify({ version: 1, participantId: "b" }),
  );
  function Editor() {
    const [open, setOpen] = useState(true);
    return open ? (
      <>
        <BrowserExpenseDefaults />
        <ExpenseComposer trip={payload.trip} onCancel={() => setOpen(false)} />
      </>
    ) : (
      <button type="button" onClick={() => setOpen(true)}>
        Reopen
      </button>
    );
  }
  const view = render(root(payload, <Editor />));
  expect(view.getByRole("combobox", { name: /^Paid by/ })).toHaveValue("a");
  await user.type(view.getByLabelText("Description"), "Unsaved");
  await user.type(view.getByLabelText("Amount"), "100");
  await user.selectOptions(view.getByLabelText("Currency"), "USD");
  await user.selectOptions(
    view.getByRole("combobox", { name: /^Paid by/ }),
    "b",
  );
  expect(view.getByLabelText("Description")).toHaveValue("Unsaved");
  expect(view.getByRole("combobox", { name: /^Paid by/ })).toHaveValue("b");
  expect(
    readPreferences("personal-owner", payload.trip.id).preferences.defaults,
  ).toBeUndefined();
  await user.click(
    view.getByRole("button", { name: "Remember currency and split settings" }),
  );
  expect(
    view.getByText("Currency and split settings saved for this group."),
  ).toBeVisible();
  expect(
    readPreferences("personal-owner", payload.trip.id).preferences.defaults
      ?.currency,
  ).toBe("USD");
  await user.click(view.getByRole("button", { name: "Cancel" }));
  await user.click(
    within(view.getByRole("dialog")).getByRole("button", {
      name: "Discard draft",
    }),
  );
  await user.click(view.getByRole("button", { name: "Reopen" }));
  expect(view.getByLabelText("Currency")).toHaveValue("USD");
  expect(view.getByRole("combobox", { name: /^Paid by/ })).toHaveValue("a");
  expect(view.getByLabelText("Description")).toHaveValue("");
  expect(globalThis.fetch).not.toHaveBeenCalled();
});
test("failed local clear reports failure and preserves other account and queue data", async () => {
  const payload = fixture();
  localStorage.setItem("queue", "keep");
  writePreferences("other", payload.trip.id, {});
  const view = render(root(payload, <BrowserExpenseDefaults />));
  const spy = vi
    .spyOn(Storage.prototype, "removeItem")
    .mockImplementation(() => {
      throw new Error("Denied");
    });
  await userEvent.setup().click(
    view.getByRole("button", {
      name: "Clear expense defaults for this group",
    }),
  );
  expect(view.getByRole("alert")).toHaveTextContent("could not be saved");
  expect(view.queryByRole("status")).not.toBeInTheDocument();
  expect(localStorage.getItem("queue")).toBe("keep");
  expect(
    localStorage.getItem(preferenceKey("other", payload.trip.id)),
  ).not.toBeNull();
  spy.mockRestore();
});
test("exact remembered amounts require a matching new total and editing keeps original values", async () => {
  const payload = fixture();
  writePreferences("personal-owner", payload.trip.id, {
    defaults: {
      currency: "TWD",
      participantIds: ["a", "b"],
      splitMode: "amount",
      splitValues: { a: "40", b: "60" },
    },
  });
  const view = render(
    root(payload, <ExpenseComposer trip={payload.trip} onCancel={() => {}} />),
  );
  await userEvent.setup().type(view.getByLabelText("Amount"), "101");
  expect(view.getByRole("button", { name: "Record expense" })).toBeDisabled();
  view.unmount();
  const expense: Expense = {
    id: "e",
    version: 1,
    description: "Original",
    amountMinor: 100,
    currency: "JPY",
    expenseDate: "2020-01-01",
    createdAt: "then",
    paidById: "a",
    participantIds: ["a"],
  };
  const editing = render(
    root(
      payload,
      <ExpenseComposer
        trip={payload.trip}
        expense={expense}
        onCancel={() => {}}
      />,
    ),
  );
  expect(editing.getByLabelText("Currency")).toHaveValue("JPY");
  expect(editing.getByRole("combobox", { name: /^Paid by/ })).toHaveValue("a");
  expect(
    editing.queryByRole("button", {
      name: "Remember currency and split settings",
    }),
  ).not.toBeInTheDocument();
});
test("copy opens a new form, cancels without mutation and is unavailable for readonly or archived groups", async () => {
  const payload = fixture();
  payload.trip.expenses.push({
    id: "original",
    version: 5,
    description: "Old meal",
    amountMinor: 1234,
    currency: "USD",
    expenseDate: "2020-01-01",
    createdAt: "then",
    paidById: "a",
    participantIds: ["a", "b"],
    receiptUrl: "/receipt",
    receiptId: "receipt",
  });
  const page = (readonly = false) => (
    <ExpensesPage
      trip={payload.trip}
      filters={defaultExpenseFilters}
      grouping="none"
      onAddExpense={() => {}}
      onFiltersChange={() => {}}
      onGroupingChange={() => {}}
      readonly={readonly}
    />
  );
  const user = userEvent.setup();
  const view = render(root(payload, page()));
  await user.click(
    view.getByRole("button", { name: "More actions for Old meal" }),
  );
  await user.click(
    screen.getByRole("menuitem", { name: "Copy as new expense" }),
  );
  expect(
    view.getByRole("heading", { name: "Copy as new expense" }),
  ).toBeVisible();
  expect(view.getByLabelText("Amount")).toHaveValue("12.34");
  expect(view.getByLabelText("Date")).not.toHaveValue("2020-01-01");
  expect(
    view.queryByRole("button", { name: "Delete" }),
  ).not.toBeInTheDocument();
  await user.click(view.getByRole("button", { name: "Cancel" }));
  expect(globalThis.fetch).not.toHaveBeenCalled();
  view.rerender(root(payload, page(true)));
  expect(
    view.queryByRole("button", { name: "Copy Old meal as new expense" }),
  ).not.toBeInTheDocument();
  payload.trip.archivedAt = "now";
  view.rerender(root(payload, page()));
  expect(
    view.queryByRole("button", { name: "Copy Old meal as new expense" }),
  ).not.toBeInTheDocument();
});

test("queued drafts keep their own payer and splits instead of personal defaults", async () => {
  const payload = fixture();
  writePreferences("personal-owner", payload.trip.id, {
    defaults: {
      currency: "USD",
      participantIds: ["b"],
      splitMode: "equal",
      splitValues: {},
    },
  });
  const queued = await queueExpense("personal-owner", payload.trip.id, {
    amount: "123",
    currency: "JPY",
    description: "Queued draft",
    expenseDate: "2026-10-01",
    paidById: "a",
    participantIds: ["a", "b"],
    category: "其他",
    tags: "",
    splitMode: "shares",
    splitValues: { a: "1", b: "2" },
  });
  const view = render(
    root(
      payload,
      <ExpenseComposer
        trip={payload.trip}
        queued={queued}
        onCancel={() => {}}
      />,
    ),
  );
  expect(view.getByLabelText("Currency")).toHaveValue("JPY");
  expect(view.getByRole("combobox", { name: /^Paid by/ })).toHaveValue("a");
  expect(view.getByLabelText("Amount")).toHaveValue("123");
  expect(view.getByLabelText("Split method")).toHaveValue("shares");
  expect(
    view.queryByRole("button", {
      name: "Remember currency and split settings",
    }),
  ).not.toBeInTheDocument();
});
