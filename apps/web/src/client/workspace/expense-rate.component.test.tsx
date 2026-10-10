// @vitest-environment jsdom

import type { Expense, Trip } from "@narumitw/otter-contracts";
import { Theme } from "@radix-ui/themes";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { translations } from "../i18n/messages.js";
import { I18nProvider } from "../i18n.js";
import { ExpenseRateDetails } from "./expense-rate.js";

const expense: Expense = {
  id: "e",
  description: "Dinner",
  amountMinor: 100,
  currency: "TWD",
  paidById: "a",
  participantIds: ["a"],
  expenseDate: "2026-07-17",
  createdAt: "2026-07-17T12:00:00Z",
};
const trip: Trip = {
  id: "t",
  ownerId: "u",
  name: "Trip",
  baseCurrency: "TWD",
  participants: [{ id: "a", name: "Alice" }],
  expenses: [expense],
  createdAt: expense.createdAt,
};

test.each(["ja", "ko"] as const)(
  "%s localizes exchange-rate sources, quote times, and missing rates",
  async (locale) => {
    const user = userEvent.setup();
    const messages = translations[locale];
    const renderDetails = (item: Expense) => (
      <Theme>
        <I18nProvider initialLocale={locale}>
          <ExpenseRateDetails expense={item} trip={trip} />
        </I18nProvider>
      </Theme>
    );
    const view = render(renderDetails(expense));
    await user.click(
      view.getByRole("button", {
        name: messages.expenseRateForName({ name: expense.description }),
      }),
    );
    expect(await view.findByText(messages.rateUnavailable)).toBeVisible();
    for (const [source, label] of [
      ["custom", messages.expenseHistoryRateCustom],
      ["fixed", messages.expenseHistoryRateFixed],
      ["legacy", messages.expenseHistoryRateLegacy],
    ] as const) {
      view.rerender(
        renderDetails({
          ...expense,
          exchangeRate: { baseCurrency: "TWD", rateToBase: 1, source },
        }),
      );
      expect(view.baseElement).toHaveTextContent(label);
      expect(view.baseElement).toHaveTextContent(
        messages.expenseHistoryRateTimeUnavailable,
      );
    }
    view.rerender(
      renderDetails({
        ...expense,
        exchangeRate: {
          baseCurrency: "TWD",
          rateToBase: 1,
          source: "bank",
          provider: "BANK_OF_TAIWAN",
          rateType: "spotMid",
          fetchedAt: expense.createdAt,
        },
      }),
    );
    expect(view.baseElement).toHaveTextContent(messages.expenseHistoryRateBank);
    expect(view.baseElement).toHaveTextContent(
      new Date(expense.createdAt).toLocaleString(locale),
    );
    expect(view.baseElement).not.toHaveTextContent(
      messages.expenseHistoryRateTimeUnavailable,
    );
  },
);
