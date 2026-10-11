import type { Expense } from "@narumitw/otter-core/settlement";
import type { VisaRateQuery } from "@narumitw/otter-visa-exchange-rates";
import { expect, test, vi } from "vitest";
import {
  createVisaSettlementService,
  visaExpenseSnapshot,
} from "./server-visa-settlement.js";

const expense: Expense = {
  id: "e",
  description: "Dinner",
  amountMinor: 1000,
  currency: "JPY",
  expenseDate: "2026-07-05",
  paidById: "a",
  participantIds: ["a"],
  createdAt: "2026-07-05T00:00:00Z",
};
const quote = (query: VisaRateQuery) => ({
  source: query.source,
  target: query.target,
  date: query.date ?? expense.expenseDate,
  amount: 1,
  bankFeePercent: 0,
  visaRate: 0.2,
  rate: 0.2,
  convertedAmount: 0.2,
  fetchedAt: expense.createdAt,
});

test("fetches each currency and date once and never fetches TWD", async () => {
  const fetchRate = vi.fn(async (query: VisaRateQuery) => quote(query));
  const rates = await createVisaSettlementService({ fetchRate }).prepare([
    expense,
    { ...expense, id: "duplicate" },
    { ...expense, expenseDate: "2026-07-06" },
    { ...expense, currency: "TWD" },
  ]);
  expect(fetchRate).toHaveBeenCalledTimes(2);
  expect(rates.size).toBe(3);
  expect(
    visaExpenseSnapshot({ visaSettlementEnabled: true }, expense, rates)
      ?.rateToTwd,
  ).toBe(0.2);
  expect(rates.get("TWD/2026-07-05")?.rateToTwd).toBe(1);
});

test("reuses a saved quote even when the provider is unavailable", async () => {
  const fetchRate = vi.fn(async (_query: VisaRateQuery) => {
    throw new Error("Unavailable");
  });
  const saved = {
    sourceCurrency: "JPY" as const,
    date: expense.expenseDate,
    rateToTwd: 0.21,
    fetchedAt: expense.createdAt,
  };
  const rated = { ...expense, visaExchangeRate: saved };
  const rates = await createVisaSettlementService({ fetchRate }).prepare([
    rated,
    expense,
  ]);
  expect(fetchRate).not.toHaveBeenCalled();
  expect(
    visaExpenseSnapshot({ visaSettlementEnabled: true }, rated, rates),
  ).toBe(saved);
});

test("off mode preserves matching snapshots but removes stale snapshots", () => {
  const saved = {
    sourceCurrency: "JPY" as const,
    date: expense.expenseDate,
    rateToTwd: 0.2,
    fetchedAt: expense.createdAt,
  };
  expect(
    visaExpenseSnapshot({}, { ...expense, visaExchangeRate: saved }, undefined),
  ).toBe(saved);
  expect(
    visaExpenseSnapshot(
      {},
      { ...expense, visaExchangeRate: saved, expenseDate: "2026-07-06" },
      undefined,
    ),
  ).toBeUndefined();
});

test("enabled mode does not fall back to a bank or fixed rate", () => {
  expect(() =>
    visaExpenseSnapshot({ visaSettlementEnabled: true }, expense, undefined),
  ).toThrow("Visa");
});

test.each([
  { source: "USD" },
  { target: "JPY" },
  { date: "2026-07-06" },
  { visaRate: 0 },
  { visaRate: Number.NaN },
  { fetchedAt: "invalid" },
])("rejects invalid provider quotes: %j", async (invalid) => {
  const fetchRate = async (query: VisaRateQuery) => ({
    ...quote(query),
    ...invalid,
  });
  await expect(
    createVisaSettlementService({ fetchRate }).prepare([expense]),
  ).rejects.toThrow("Invalid Visa quote");
});
