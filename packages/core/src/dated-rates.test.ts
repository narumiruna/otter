import { expect, test } from "vitest";
import {
  convertExpenseMinor,
  convertMinorWithRates,
  type ExpenseExchangeRate,
  isExpenseExchangeRate,
} from "./money.js";
import { calculateBalances, type Trip } from "./settlement.js";

const date = "2026-07-05";
const rate: ExpenseExchangeRate = {
  source: "visa",
  provider: "VISA",
  rateType: "visa",
  date,
  baseCurrency: "TWD",
  rateToBase: 0.2,
  fetchedAt: "2026-10-25T00:00:00.000Z",
};

test("Visa base snapshots require a matching date and retain their rate for amount changes", () => {
  expect(isExpenseExchangeRate(rate, "JPY", date)).toBe(true);
  expect(isExpenseExchangeRate(rate, "JPY", "2026-07-06")).toBe(false);
  expect(isExpenseExchangeRate({ ...rate, date: undefined }, "JPY")).toBe(
    false,
  );
  expect(
    isExpenseExchangeRate({ ...rate, provider: "BANK_OF_TAIWAN" }, "JPY"),
  ).toBe(false);
  expect(
    convertExpenseMinor(1000, "JPY", "TWD", rate, undefined, undefined, date),
  ).toBe(200);
  expect(
    convertExpenseMinor(2000, "JPY", "TWD", rate, undefined, undefined, date),
  ).toBe(400);
});

test("saved bridges retain both rounding steps", () => {
  const original: ExpenseExchangeRate = {
    baseCurrency: "TWD",
    rateToBase: 32,
    source: "bank",
    provider: "BANK_OF_TAIWAN",
    rateType: "spotMid",
    fetchedAt: rate.fetchedAt,
  };
  const bridge = {
    sourceCurrency: "TWD",
    baseCurrency: "JPY",
    rateToBase: 4,
    source: "legacy",
  } as const;
  expect(
    convertExpenseMinor(1, "USD", "JPY", original, undefined, bridge, date),
  ).toBe(0);
  expect(
    convertExpenseMinor(1, "USD", "JPY", {
      baseCurrency: "JPY",
      rateToBase: 128,
      source: "custom",
    }),
  ).toBe(1);
  expect(() =>
    convertExpenseMinor(1, "USD", "JPY", original, undefined, {
      ...bridge,
      sourceCurrency: "EUR",
    }),
  ).toThrow("bridge");
});

test("missing rates fail without a bank or fixed estimate", () => {
  expect(() => convertMinorWithRates(1000, "JPY", "TWD")).toThrow(
    "Missing saved",
  );
  expect(() => convertExpenseMinor(1000, "JPY", "TWD")).toThrow(
    "Missing saved",
  );
  expect(convertExpenseMinor(1000, "JPY", "JPY")).toBe(1000);
});

test("dated base rates and payment rates produce stable minor-unit balances", () => {
  const expense = {
    id: "e",
    description: "Lunch",
    currency: "JPY",
    amountMinor: 1000,
    expenseDate: date,
    createdAt: rate.fetchedAt ?? "",
    paidById: "a",
    participantIds: ["a", "b"],
    exchangeRate: rate,
  } as const;
  const trip: Trip = {
    id: "t",
    ownerId: "a",
    name: "Japan",
    baseCurrency: "TWD",
    createdAt: expense.createdAt,
    participants: [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
    ],
    expenses: [
      { ...expense, participantIds: ["a", "b"] },
      {
        ...expense,
        id: "e2",
        participantIds: ["a", "b"],
        expenseDate: "2026-07-06",
        exchangeRate: { ...rate, date: "2026-07-06", rateToBase: 0.22 },
      },
    ],
    settlementPayments: [
      {
        id: "p",
        fromId: "b",
        toId: "a",
        amountMinor: 100,
        currency: "JPY",
        paidAt: date,
        createdAt: expense.createdAt,
        note: "",
        exchangeRate: rate,
      },
    ],
  };
  expect(calculateBalances(trip).map((b) => b.amountMinor)).toEqual([
    190, -190,
  ]);
  expect(
    calculateBalances({ ...trip, exchangeRates: { JPY: 999, TWD: 1 } }),
  ).toEqual(calculateBalances(trip));
});
