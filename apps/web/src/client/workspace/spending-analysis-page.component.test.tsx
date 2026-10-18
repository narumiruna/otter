// @vitest-environment jsdom

import {
  calculateBalances,
  calculateSettlements,
  type Trip,
} from "@narumitw/otter-core/settlement";
import { render, within } from "@testing-library/react";
import { expect, test } from "vitest";
import type { TripPayload } from "../client-support.js";
import { languageOptions } from "../i18n/locales.js";
import { translations } from "../i18n/messages.js";
import { I18nProvider } from "../i18n.js";
import { SpendingAnalysisPage } from "./spending-analysis-page.js";

function fixture(): Trip {
  return {
    id: "analysis",
    ownerId: "owner",
    name: "Travel",
    baseCurrency: "TWD",
    createdAt: "2026-10-01T00:00:00.000Z",
    // These current rates differ from the saved expense rates.
    exchangeRates: { TWD: 1, JPY: 0.1, USD: 35 },
    participants: [
      { id: "a", name: "Alice" },
      { id: "b", name: "Bob" },
    ],
    expenses: [
      {
        id: "lunch",
        description: "Lunch",
        expenseDate: "2026-10-01",
        createdAt: "2026-10-01T00:00:00.000Z",
        amountMinor: 1000,
        currency: "JPY",
        exchangeRate: {
          baseCurrency: "TWD",
          rateToBase: 0.25,
          source: "custom",
        },
        paidById: "a",
        participantIds: ["a", "b"],
        category: "餐飲",
      },
      {
        id: "bus",
        description: "Bus",
        expenseDate: "2026-10-01",
        createdAt: "2026-10-01T00:00:00.000Z",
        amountMinor: 100,
        currency: "TWD",
        paidById: "b",
        participantIds: ["a", "b"],
        category: "交通",
      },
      {
        id: "dinner",
        description: "Dinner",
        expenseDate: "2026-10-02",
        createdAt: "2026-10-02T00:00:00.000Z",
        amountMinor: 10000,
        currency: "USD",
        exchangeRate: { baseCurrency: "TWD", rateToBase: 30, source: "custom" },
        paidById: "a",
        participantIds: ["a", "b"],
        category: "餐飲",
      },
    ],
    settlementPayments: [
      {
        id: "partial",
        fromId: "b",
        toId: "a",
        amountMinor: 20,
        currency: "TWD",
        paidAt: "2026-10-03",
        createdAt: "2026-10-03T00:00:00.000Z",
        note: "Partial",
      },
    ],
  };
}

function payloadFor(trip: Trip): TripPayload {
  return {
    trip,
    balances: calculateBalances(trip),
    settlements: calculateSettlements(trip),
  };
}

test("analysis shows unchanged snapshot-based chart totals and payment-adjusted accounts without an outer disclosure", () => {
  const payload = payloadFor(fixture());
  const before = structuredClone(payload);
  const view = render(
    <I18nProvider initialLocale="en">
      <SpendingAnalysisPage payload={payload} />
    </I18nProvider>,
  );
  const region = view.getByRole("region", { name: "Spending analysis" });
  expect(region).toBeVisible();
  expect(region.closest("details")).toBeNull();
  expect(within(region).getByText("Total NT$3,350")).toBeVisible();
  for (const [title, expected] of [
    ["Daily spending", ["2026-10-01NT$350", "2026-10-02NT$3,000"]],
    ["Paid by person", ["AliceNT$3,250", "BobNT$100"]],
    ["By category", ["FoodNT$3,250", "TransportNT$100"]],
  ] as const) {
    const chart = within(region).getByRole("heading", {
      name: title,
    }).parentElement;
    if (!chart) throw new Error(`Missing chart: ${title}`);
    expect(chart).toBeVisible();
    expect(
      within(chart)
        .getAllByRole("listitem")
        .map((row) => row.textContent),
    ).toEqual(expected);
    expect(chart).not.toHaveTextContent("¥");
    expect(chart).not.toHaveTextContent("US$");
  }
  const accounts = within(view.getByRole("table", { name: "Member accounts" }));
  expect(accounts.getByRole("row", { name: /^Alice / })).toHaveTextContent(
    "PaidNT$3,250ShareNT$1,675To receiveNT$1,555",
  );
  expect(accounts.getByRole("row", { name: /^Bob / })).toHaveTextContent(
    "PaidNT$100ShareNT$1,675To payNT$1,555",
  );
  expect(
    view.queryByRole("button", { name: "Record payment" }),
  ).not.toBeInTheDocument();
  expect(payload).toEqual(before);
});

test("Visa keeps charts in base currency and member accounts in settlement currency", () => {
  const source = fixture();
  const trip: Trip = {
    ...source,
    baseCurrency: "JPY",
    expenses: [
      {
        ...source.expenses[0],
        exchangeRate: undefined,
        visaExchangeRate: {
          sourceCurrency: "JPY",
          targetCurrency: "TWD",
          date: "2026-10-01",
          rate: 0.2,
          fetchedAt: source.createdAt,
        },
      },
    ],
    settlementPayments: [],
    visaSettlementEnabled: true,
    visaSettlementCurrency: "TWD",
  };
  const view = render(
    <I18nProvider initialLocale="en">
      <SpendingAnalysisPage payload={payloadFor(trip)} />
    </I18nProvider>,
  );
  expect(view.getByText("Total ¥1,000")).toBeVisible();
  for (const title of ["Daily spending", "Paid by person", "By category"]) {
    const chart = view.getByRole("heading", { name: title }).parentElement;
    if (!chart) throw new Error(`Missing chart: ${title}`);
    expect(within(chart).getByText("¥1,000")).toBeVisible();
    expect(chart).not.toHaveTextContent("NT$");
  }
  const accounts = view.getByRole("region", { name: "Member accounts" });
  expect(within(accounts).getByText("TWD", { exact: true })).toBeVisible();
  expect(
    within(accounts).getByRole("row", { name: /^Alice / }),
  ).toHaveTextContent("PaidNT$200ShareNT$100To receiveNT$100");
});

test.each(languageOptions)(
  "$locale analysis has a localized region, heading, and category",
  ({ locale }) => {
    const messages = translations[locale];
    const view = render(
      <I18nProvider initialLocale={locale}>
        <SpendingAnalysisPage payload={payloadFor(fixture())} />
      </I18nProvider>,
    );
    expect(
      view.getByRole("region", { name: messages.spendingAnalysis }),
    ).toBeVisible();
    expect(
      view.getByRole("heading", { name: messages.spendingAnalysis, level: 3 }),
    ).toBeVisible();
    expect(
      view.getByRole("heading", { name: messages.dailySpending, level: 4 }),
    ).toBeVisible();
    expect(view.getByText(messages.food, { exact: true })).toBeVisible();
  },
);

test.each([false, true])(
  "analysis remains visible without expenses (paymentOnly=%s)",
  (paymentOnly) => {
    const trip = {
      ...fixture(),
      expenses: [],
      ...(!paymentOnly ? { settlementPayments: [] } : {}),
    };
    const view = render(
      <I18nProvider initialLocale="en">
        <SpendingAnalysisPage payload={payloadFor(trip)} />
      </I18nProvider>,
    );
    expect(
      view.getByRole("region", { name: "Spending analysis" }),
    ).toBeVisible();
    expect(view.getByText("Total NT$0")).toBeVisible();
    for (const title of ["Daily spending", "Paid by person", "By category"]) {
      const chart = view.getByRole("heading", { name: title }).parentElement;
      if (!chart) throw new Error(`Missing chart: ${title}`);
      expect(within(chart).getByText("No data yet.")).toBeVisible();
    }
    const accounts = within(
      view.getByRole("table", { name: "Member accounts" }),
    );
    expect(accounts.getByRole("row", { name: /^Alice / })).toHaveTextContent(
      paymentOnly ? "Paid0Share0To payNT$20" : "Paid0Share0Settled",
    );
  },
);
