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
import { ExpenseComposer } from "./expense-composer.js";
import { ExpensesPage } from "./expenses-page.js";
import {
  preferenceKey,
  readPreferences,
  writePreferences,
} from "./personal-preferences.js";
import { PersonalSummary } from "./personal-summary.js";
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
test("identity selects a payer without mutation, isolates accounts and reconciles removed people", async () => {
  const user = userEvent.setup();
  const payload = fixture();
  const view = render(root(payload, <PersonalSummary />));
  await user.selectOptions(view.getByLabelText("Who am I"), "b");
  expect(
    readPreferences("personal-owner", payload.trip.id).preferences
      .participantId,
  ).toBe("b");
  expect(globalThis.fetch).not.toHaveBeenCalled();
  view.rerender(root(payload, <PersonalSummary />, "other-account"));
  expect(view.getByLabelText("Who am I")).toHaveValue("");
  view.rerender(
    root(
      { ...payload, trip: { ...payload.trip, id: "other-group" } },
      <PersonalSummary />,
    ),
  );
  expect(view.getByLabelText("Who am I")).toHaveValue("");
  view.rerender(root(payload, <PersonalSummary />));
  expect(view.getByLabelText("Who am I")).toHaveValue("b");
  view.rerender(
    root(
      {
        ...payload,
        trip: { ...payload.trip, participants: [payload.trip.participants[0]] },
      },
      <PersonalSummary />,
    ),
  );
  expect(view.getByLabelText("Who am I")).toHaveValue("");
  expect(view.getByRole("status")).toHaveTextContent("no longer available");
  expect(
    readPreferences("personal-owner", payload.trip.id).preferences
      .participantId,
  ).toBeUndefined();
});
test("identity is local for owner, editor and archived groups; guests have no persistence controls", async () => {
  const payload = fixture();
  for (const role of ["owner", "editor"] as const) {
    const view = render(
      root(
        {
          ...payload,
          currentUserRole: role,
          trip: { ...payload.trip, archivedAt: "now" },
        },
        <PersonalSummary />,
      ),
    );
    await userEvent.setup().selectOptions(view.getByLabelText("Who am I"), "a");
    expect(globalThis.fetch).not.toHaveBeenCalled();
    view.unmount();
  }
  // No shared guest key is permitted.
  const client = new QueryClient();
  const view = render(
    <QueryClientProvider client={client}>
      <WorkspaceProvider
        announce={() => {}}
        offline={false}
        payload={payload}
        refreshCollection={async () => {}}
      >
        <PersonalSummary />
      </WorkspaceProvider>
    </QueryClientProvider>,
  );
  expect(view.queryByLabelText("我是誰")).not.toBeInTheDocument();
});
test("defaults apply to new expenses only, remember explicitly and do not replace dirty input", async () => {
  const payload = fixture();
  const user = userEvent.setup();
  writePreferences("personal-owner", payload.trip.id, { participantId: "b" });
  function Editor() {
    const [open, setOpen] = useState(true);
    return open ? (
      <>
        <PersonalSummary />
        <ExpenseComposer trip={payload.trip} onCancel={() => setOpen(false)} />
      </>
    ) : (
      <button type="button" onClick={() => setOpen(true)}>
        Reopen
      </button>
    );
  }
  const view = render(root(payload, <Editor />));
  expect(view.getByRole("combobox", { name: /^Paid by/ })).toHaveValue("b");
  await user.type(view.getByLabelText("Description"), "Unsaved");
  await user.type(view.getByLabelText("Amount"), "100");
  await user.selectOptions(view.getByLabelText("Currency"), "USD");
  await user.selectOptions(view.getByLabelText("Who am I"), "a");
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
test("storage failures retain the selected person and clear affects neither account nor queue", async () => {
  const payload = fixture();
  const view = render(root(payload, <PersonalSummary />));
  const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Quota");
  });
  await userEvent.setup().selectOptions(view.getByLabelText("Who am I"), "b");
  expect(view.getByLabelText("Who am I")).toHaveValue("b");
  expect(view.getByRole("alert")).toHaveTextContent("could not be saved");
  spy.mockRestore();
  localStorage.setItem("queue", "keep");
  writePreferences("other", payload.trip.id, { participantId: "a" });
  await userEvent.setup().click(
    view.getByRole("button", {
      name: "Clear personal preferences for this group",
    }),
  );
  expect(view.getByLabelText("Who am I")).toHaveValue("");
  expect(localStorage.getItem("queue")).toBe("keep");
  expect(
    localStorage.getItem(preferenceKey("other", payload.trip.id)),
  ).not.toBeNull();
});
test("exact remembered amounts require a matching new total and editing keeps original values", async () => {
  const payload = fixture();
  writePreferences("personal-owner", payload.trip.id, {
    participantId: "b",
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
    participantId: "b",
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
