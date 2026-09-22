// @vitest-environment jsdom

import type { Trip } from "@narumitw/otter-core/settlement";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, expect, test, vi } from "vitest";
import {
  defaultExpenseFilters,
  type ExpenseFilters,
} from "../client-support.js";
import { I18nProvider } from "../i18n.js";
import { type ExpenseGrouping, ExpensesPage } from "./expenses-page.js";

const trip: Trip = {
  baseCurrency: "TWD",
  createdAt: "2026-09-19T00:00:00.000Z",
  expenses: [
    {
      amountMinor: 300,
      category: "餐飲",
      createdAt: "2026-09-19T00:00:00.000Z",
      currency: "TWD",
      description: "Dinner",
      expenseDate: "2026-09-19",
      id: "dinner",
      paidById: "alice",
      participantIds: ["alice"],
    },
  ],
  id: "trip",
  name: "Trip",
  ownerId: "owner",
  participants: [{ id: "alice", name: "Alice" }],
  settlementPayments: [],
};

beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
});

function ExpensesHarness({
  currentTrip = trip,
  userId = "user-1",
}: {
  currentTrip?: Trip;
  userId?: string;
}) {
  const [filters, setFilters] = useState<ExpenseFilters>({
    ...defaultExpenseFilters,
  });
  const [grouping, setGrouping] = useState<ExpenseGrouping>("none");
  return (
    <ExpensesPage
      filters={filters}
      grouping={grouping}
      onAddExpense={vi.fn()}
      onFiltersChange={setFilters}
      onGroupingChange={setGrouping}
      readonly
      trip={currentTrip}
      userId={userId}
    />
  );
}

test("empty expenses prioritize the first expense without unused filters", async () => {
  const onAddExpense = vi.fn();
  render(
    <I18nProvider initialLocale="en">
      <ExpensesPage
        filters={{ ...defaultExpenseFilters }}
        grouping="none"
        onAddExpense={onAddExpense}
        onFiltersChange={vi.fn()}
        onGroupingChange={vi.fn()}
        trip={{ ...trip, expenses: [] }}
      />
    </I18nProvider>,
  );

  expect(
    screen.getByRole("heading", { name: "No expenses yet" }),
  ).toBeVisible();
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  expect(screen.queryByText("More filters")).not.toBeInTheDocument();
  const button = screen.getByRole("button");
  await userEvent.setup().click(button);
  expect(onAddExpense).toHaveBeenCalledOnce();
});

test("readonly empty expenses do not offer an add action", () => {
  render(
    <I18nProvider initialLocale="en">
      <ExpensesPage
        filters={{ ...defaultExpenseFilters }}
        grouping="none"
        onAddExpense={vi.fn()}
        onFiltersChange={vi.fn()}
        onGroupingChange={vi.fn()}
        readonly
        trip={{ ...trip, expenses: [] }}
      />
    </I18nProvider>,
  );

  expect(
    screen.getByRole("heading", { name: "No expenses yet" }),
  ).toBeVisible();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("expenses can be grouped by date or payer", async () => {
  const user = userEvent.setup();
  const groupedTrip: Trip = {
    ...trip,
    expenses: [
      ...trip.expenses,
      {
        amountMinor: 200,
        createdAt: "2026-09-20T10:00:00.000Z",
        currency: "TWD",
        description: "Lunch",
        expenseDate: "2026-09-20",
        id: "lunch",
        paidById: "bob",
        participantIds: ["alice", "bob"],
      },
      {
        amountMinor: 100,
        createdAt: "2026-09-19T10:00:00.000Z",
        currency: "TWD",
        description: "Coffee",
        expenseDate: "2026-09-19",
        id: "coffee",
        paidById: "alice",
        participantIds: ["alice", "bob"],
      },
    ],
    participants: [...trip.participants, { id: "bob", name: "Bob" }],
  };
  render(
    <I18nProvider initialLocale="en">
      <ExpensesHarness currentTrip={groupedTrip} />
    </I18nProvider>,
  );

  const grouping = screen.getByRole("combobox", { name: "Group by" });
  await user.selectOptions(grouping, "date");

  const groupedExpenses = screen.getByRole("region", { name: "All expenses" });
  expect(
    within(groupedExpenses)
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent),
  ).toEqual(["2026-09-20", "2026-09-19"]);
  const september19Group = screen
    .getByRole("heading", { level: 3, name: "2026-09-19" })
    .closest("tbody");
  expect(september19Group).not.toBeNull();
  expect(
    within(september19Group as HTMLElement).getByText("Dinner"),
  ).toBeVisible();
  expect(
    within(september19Group as HTMLElement).getByText("Coffee"),
  ).toBeVisible();
  expect(
    within(september19Group as HTMLElement).getByText("2 expenses · NT$400"),
  ).toBeVisible();

  await user.selectOptions(grouping, "payer");

  expect(
    within(groupedExpenses)
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent),
  ).toEqual(["Alice", "Bob"]);
  const aliceGroup = screen
    .getByRole("heading", { level: 3, name: "Alice" })
    .closest("tbody");
  const bobGroup = screen
    .getByRole("heading", { level: 3, name: "Bob" })
    .closest("tbody");
  expect(within(aliceGroup as HTMLElement).getByText("Coffee")).toBeVisible();
  expect(within(bobGroup as HTMLElement).getByText("Lunch")).toBeVisible();
});

test("expense columns can be customized, persisted per user, and reset", async () => {
  const user = userEvent.setup();
  const view = render(
    <I18nProvider initialLocale="en">
      <ExpensesHarness />
    </I18nProvider>,
  );

  expect(
    screen.getAllByRole("columnheader").map((header) => header.textContent),
  ).toEqual(["Expense", "Paid by", "Category", "Date", "Amount"]);

  await user.click(screen.getByRole("button", { name: "Columns" }));
  await user.click(screen.getByRole("checkbox", { name: "Paid by" }));
  await user.click(screen.getByRole("checkbox", { name: "Split" }));

  expect(
    screen.getAllByRole("columnheader").map((header) => header.textContent),
  ).toEqual(["Expense", "Category", "Date", "Split", "Amount"]);
  expect(window.localStorage.getItem("otter.expense-columns.user-1")).toBe(
    '["category","date","participants"]',
  );

  view.unmount();
  const otherUserView = render(
    <I18nProvider initialLocale="en">
      <ExpensesHarness userId="user-2" />
    </I18nProvider>,
  );
  expect(screen.getByRole("columnheader", { name: "Paid by" })).toBeVisible();
  expect(
    screen.queryByRole("columnheader", { name: "Split" }),
  ).not.toBeInTheDocument();

  otherUserView.unmount();
  render(
    <I18nProvider initialLocale="en">
      <ExpensesHarness />
    </I18nProvider>,
  );
  expect(screen.getByRole("columnheader", { name: "Split" })).toBeVisible();
  expect(
    screen.queryByRole("columnheader", { name: "Paid by" }),
  ).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Columns" }));
  await user.click(screen.getByRole("button", { name: "Restore defaults" }));
  expect(screen.getByRole("columnheader", { name: "Paid by" })).toBeVisible();
  expect(
    screen.queryByRole("columnheader", { name: "Split" }),
  ).not.toBeInTheDocument();
});

test("split column shows names and falls back to a count for a long list", async () => {
  const user = userEvent.setup();
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
    function (this: HTMLElement) {
      return this.classList.contains("expense-participant-label") ? 100 : 0;
    },
  );
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(
    function (this: HTMLElement) {
      if (!this.classList.contains("expense-participant-label-measure"))
        return 0;
      return this.textContent?.includes("Alexandria") ? 200 : 80;
    },
  );
  const namedTrip: Trip = {
    ...trip,
    expenses: [
      {
        ...trip.expenses[0],
        participantIds: ["alice", "bob"],
      },
    ],
    participants: [
      { id: "alice", name: "Alice" },
      { id: "bob", name: "Bob" },
    ],
  };
  const view = render(
    <I18nProvider initialLocale="en">
      <ExpensesHarness currentTrip={namedTrip} />
    </I18nProvider>,
  );

  await user.click(screen.getByRole("button", { name: "Columns" }));
  await user.click(screen.getByRole("checkbox", { name: "Split" }));

  expect(
    screen.getByText("Alice, Bob", {
      selector: ".expense-participant-label-value",
    }),
  ).toBeVisible();
  expect(screen.queryByText("Everyone")).not.toBeInTheDocument();

  view.rerender(
    <I18nProvider initialLocale="en">
      <ExpensesHarness
        currentTrip={{
          ...namedTrip,
          participants: [
            { id: "alice", name: "Alexandria" },
            { id: "bob", name: "Christopher" },
          ],
        }}
      />
    </I18nProvider>,
  );
  expect(screen.getByText("2 people")).toBeVisible();
});

test("category filter chips translate stored domain values", async () => {
  const user = userEvent.setup();
  render(
    <I18nProvider initialLocale="en">
      <ExpensesHarness />
    </I18nProvider>,
  );

  await user.click(screen.getByText("More filters"));
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Category" }),
    "餐飲",
  );

  expect(screen.getByRole("button", { name: /^Category: Food/ })).toBeVisible();
  expect(screen.queryByText("Category: 餐飲")).not.toBeInTheDocument();
});
