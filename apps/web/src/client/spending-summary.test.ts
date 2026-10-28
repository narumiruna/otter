import type { Expense, Trip } from "@narumitw/otter-core/settlement";
import { expect, test } from "vitest";
import { spendingSummary } from "./client-support.js";

function expense(id: string, expenseDate: string, amountMinor = 100): Expense {
  return {
    id,
    expenseDate,
    amountMinor,
    currency: "TWD",
    description: id,
    paidById: "a",
    participantIds: ["a"],
    createdAt: "2026-01-01T00:00:00Z",
  };
}

function tripWith(expenses: Expense[]): Trip {
  return {
    id: "analysis",
    ownerId: "owner",
    name: "Travel",
    baseCurrency: "TWD",
    createdAt: "2026-01-01T00:00:00Z",
    participants: [
      { id: "a", name: "Alex" },
      { id: "b", name: "Morgan" },
    ],
    expenses,
  };
}

test.each([
  ["2026-03-07", "2026-03-09", 3],
  ["2024-02-28", "2024-03-01", 3],
  ["2026-10-01", "2026-10-01", 1],
  ["2026-12-31", "2027-01-01", 2],
])(
  "daily average includes every UTC calendar date from %s to %s",
  (start, end, days) => {
    const trip = tripWith([expense("last", end), expense("first", start)]);
    trip.settlementPayments = [
      {
        id: "payment",
        fromId: "b",
        toId: "a",
        amountMinor: 1000,
        currency: "TWD",
        paidAt: "2027-02-01",
        createdAt: trip.createdAt,
        note: "Partial settlement",
      },
    ];
    expect(spendingSummary(trip)).toMatchObject({
      totalMinor: 200,
      expenseCount: 2,
      calendarDays: days,
      firstDate: start,
      lastDate: end,
      averageExpenseMinor: 100,
      averageDayMinor: Math.round(200 / days),
    });
  },
);

test("rankings and averages use saved conversion rates and keep original currencies separate", () => {
  const trip = tripWith([
    {
      ...expense("dollars", "2026-10-01", 1000),
      currency: "USD",
      exchangeRate: { baseCurrency: "TWD", rateToBase: 30, source: "custom" },
    },
    {
      ...expense("yen", "2026-10-02", 1000),
      currency: "JPY",
      exchangeRate: { baseCurrency: "TWD", rateToBase: 0.2, source: "custom" },
    },
    expense("local", "2026-10-02", 101),
  ]);
  trip.exchangeRates = { USD: 100, JPY: 0.01, TWD: 1 };
  const before = structuredClone(trip);
  const summary = spendingSummary(trip);
  expect(summary).toMatchObject({
    totalMinor: 601,
    averageExpenseMinor: 200,
    averageDayMinor: 301,
    currencyTotals: [
      { currency: "JPY", amountMinor: 1000, expenseCount: 1 },
      { currency: "TWD", amountMinor: 101, expenseCount: 1 },
      { currency: "USD", amountMinor: 1000, expenseCount: 1 },
    ],
  });
  expect(summary.largestExpenses.map(({ expense: item }) => item.id)).toEqual([
    "dollars",
    "yen",
    "local",
  ]);
  expect(trip).toEqual(before);
});

test("largest expenses are limited to five with stable date and ID tie breaks", () => {
  const trip = tripWith([
    expense("older", "2026-10-01", 200),
    expense("b", "2026-10-02", 200),
    expense("a", "2026-10-02", 200),
    expense("largest", "2026-10-03", 300),
    expense("small", "2026-10-01", 100),
    expense("smallest", "2026-10-01", 50),
  ]);
  const before = structuredClone(trip);
  expect(
    spendingSummary(trip).largestExpenses.map(({ expense: item }) => item.id),
  ).toEqual(["largest", "a", "b", "older", "small"]);
  expect(trip).toEqual(before);
});

test("small converted expenses can round to zero without losing original spending", () => {
  const trip = tripWith([
    {
      ...expense("small", "2026-10-01", 1),
      currency: "USD",
      exchangeRate: { baseCurrency: "TWD", rateToBase: 0.01, source: "custom" },
    },
  ]);
  expect(spendingSummary(trip)).toMatchObject({
    totalMinor: 0,
    averageExpenseMinor: 0,
    averageDayMinor: 0,
    calendarDays: 1,
    largestExpenses: [{ amountMinor: 0 }],
    currencyTotals: [{ currency: "USD", amountMinor: 1, expenseCount: 1 }],
  });
});
