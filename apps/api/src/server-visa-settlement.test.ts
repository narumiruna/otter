import { currencies } from "@narumitw/otter-core/money";
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
  const rates = await createVisaSettlementService({ fetchRate }).prepare(
    [
      expense,
      { ...expense, id: "duplicate" },
      { ...expense, expenseDate: "2026-07-06" },
      { ...expense, currency: "TWD" },
    ],
    "TWD",
  );
  expect(fetchRate).toHaveBeenCalledTimes(2);
  expect(rates.size).toBe(3);
  expect(
    visaExpenseSnapshot(
      { visaSettlementEnabled: true, visaSettlementCurrency: "TWD" as const },
      expense,
      rates,
    )?.rate,
  ).toBe(0.2);
  expect(rates.get("TWD/TWD/2026-07-05")?.rate).toBe(1);
});

test("reuses a saved quote even when the provider is unavailable", async () => {
  const fetchRate = vi.fn(async (_query: VisaRateQuery) => {
    throw new Error("Unavailable");
  });
  const saved = {
    sourceCurrency: "JPY" as const,
    targetCurrency: "TWD" as const,
    date: expense.expenseDate,
    rate: 0.21,
    fetchedAt: expense.createdAt,
  };
  const rated = { ...expense, visaExchangeRate: saved };
  const rates = await createVisaSettlementService({ fetchRate }).prepare(
    [rated, expense],
    "TWD",
  );
  expect(fetchRate).not.toHaveBeenCalled();
  expect(
    visaExpenseSnapshot(
      { visaSettlementEnabled: true, visaSettlementCurrency: "TWD" as const },
      rated,
      rates,
    ),
  ).toBe(saved);
});

test("off mode preserves matching snapshots but removes stale snapshots", () => {
  const saved = {
    sourceCurrency: "JPY" as const,
    targetCurrency: "TWD" as const,
    date: expense.expenseDate,
    rate: 0.2,
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
    visaExpenseSnapshot(
      { visaSettlementEnabled: true, visaSettlementCurrency: "TWD" as const },
      expense,
      undefined,
    ),
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
    createVisaSettlementService({ fetchRate }).prepare([expense], "TWD"),
  ).rejects.toThrow("Invalid Visa quote");
});

test("does not reuse a snapshot from another target and keys rates by the full pair", async () => {
  const fetchRate = vi.fn(async (query: VisaRateQuery) => ({
    ...quote(query),
    visaRate: 0.0065,
  }));
  const saved = {
    sourceCurrency: "JPY" as const,
    targetCurrency: "TWD" as const,
    date: expense.expenseDate,
    rate: 0.2,
    fetchedAt: expense.createdAt,
  };
  const rated = { ...expense, visaExchangeRate: saved };
  const rates = await createVisaSettlementService({ fetchRate }).prepare(
    [rated],
    "USD",
  );
  expect(fetchRate).toHaveBeenCalledWith({
    source: "JPY",
    target: "USD",
    date: expense.expenseDate,
  });
  expect(rates.has("JPY/TWD/2026-07-05")).toBe(false);
  const snapshot = visaExpenseSnapshot(
    { visaSettlementEnabled: true, visaSettlementCurrency: "USD" },
    rated,
    rates,
  );
  expect(snapshot).toMatchObject({ targetCurrency: "USD", rate: 0.0065 });
});

test.each(currencies)(
  "uses identity rates without requesting Visa for %s",
  async (currency) => {
    const fetchRate = vi.fn(async (query: VisaRateQuery) => quote(query));
    const rates = await createVisaSettlementService({ fetchRate }).prepare(
      [{ ...expense, currency }],
      currency,
    );
    expect(fetchRate).not.toHaveBeenCalled();
    expect(
      rates.get(`${currency}/${currency}/${expense.expenseDate}`),
    ).toMatchObject({
      sourceCurrency: currency,
      targetCurrency: currency,
      rate: 1,
    });
  },
);

test("a fresh service reuses saved dated base and bridge Visa quotes, but never old bank quotes", async () => {
  const fetchRate = vi.fn(async (_query: VisaRateQuery) => {
    throw new Error("Provider unavailable");
  });
  const service = createVisaSettlementService({ fetchRate });
  const rated: Expense = {
    ...expense,
    exchangeRate: {
      baseCurrency: "TWD",
      source: "visa",
      provider: "VISA",
      rateType: "visa",
      date: expense.expenseDate,
      rateToBase: 0.2,
      fetchedAt: expense.createdAt,
    },
  };
  const rates = await service.prepareGeneral({ baseCurrency: "TWD" }, [
    rated,
    expense,
  ]);
  expect(rates.get("JPY/TWD/2026-07-05")?.rate).toBe(0.2);
  expect(fetchRate).not.toHaveBeenCalled();
  const bridged: Expense = {
    ...expense,
    exchangeRate: { baseCurrency: "USD", rateToBase: 0.01, source: "custom" },
    exchangeRateBridge: {
      sourceCurrency: "USD",
      baseCurrency: "TWD",
      source: "visa",
      provider: "VISA",
      rateType: "visa",
      date: expense.expenseDate,
      rateToBase: 32,
      fetchedAt: expense.createdAt,
    },
  };
  const bridgeRates = await service.prepareGeneral({ baseCurrency: "TWD" }, [
    bridged,
    { ...expense, currency: "USD" },
  ]);
  expect(bridgeRates.get("USD/TWD/2026-07-05")?.rate).toBe(32);
  expect(fetchRate).not.toHaveBeenCalled();
  const old: Expense = {
    ...expense,
    exchangeRate: {
      baseCurrency: "TWD",
      source: "bank",
      provider: "BANK_OF_TAIWAN",
      rateType: "spotMid",
      rateToBase: 0.2,
      fetchedAt: expense.createdAt,
    },
  };
  await expect(
    service.prepareGeneral({ baseCurrency: "TWD" }, [old, expense]),
  ).rejects.toThrow("Provider unavailable");
  expect(fetchRate).toHaveBeenCalledTimes(1);
});
