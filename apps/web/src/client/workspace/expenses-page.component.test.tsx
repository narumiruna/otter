// @vitest-environment jsdom

import type { Trip } from "@narumitw/otter-core/settlement";
import { render, screen } from "@testing-library/react";
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
