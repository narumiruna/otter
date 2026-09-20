// @vitest-environment jsdom

import type { Trip } from "@narumitw/otter-core/settlement";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, test, vi } from "vitest";
import {
  defaultExpenseFilters,
  type ExpenseFilters,
} from "../client-support.js";
import { I18nProvider } from "../i18n.js";
import { ExpensesPage } from "./expenses-page.js";

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

function ExpensesHarness() {
  const [filters, setFilters] = useState<ExpenseFilters>({
    ...defaultExpenseFilters,
  });
  return (
    <ExpensesPage
      filters={filters}
      onAddExpense={vi.fn()}
      onFiltersChange={setFilters}
      readonly
      trip={trip}
    />
  );
}

test("empty expenses prioritize the first expense without unused filters", async () => {
  const onAddExpense = vi.fn();
  render(
    <I18nProvider initialLocale="en">
      <ExpensesPage
        filters={{ ...defaultExpenseFilters }}
        onAddExpense={onAddExpense}
        onFiltersChange={vi.fn()}
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
        onAddExpense={vi.fn()}
        onFiltersChange={vi.fn()}
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
      <ExpensesPage
        filters={{ ...defaultExpenseFilters }}
        onAddExpense={vi.fn()}
        onFiltersChange={vi.fn()}
        readonly
        trip={groupedTrip}
      />
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
  expect(
    within(screen.getByRole("list", { name: "2026-09-19" })).getByText(
      "Dinner",
    ),
  ).toBeVisible();
  expect(
    within(screen.getByRole("list", { name: "2026-09-19" })).getByText(
      "Coffee",
    ),
  ).toBeVisible();

  await user.selectOptions(grouping, "payer");

  expect(
    within(groupedExpenses)
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent),
  ).toEqual(["Alice", "Bob"]);
  expect(
    within(screen.getByRole("list", { name: "Alice" })).getByText("Coffee"),
  ).toBeVisible();
  expect(
    within(screen.getByRole("list", { name: "Bob" })).getByText("Lunch"),
  ).toBeVisible();
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
