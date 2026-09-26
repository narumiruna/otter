import type { ExchangeRateSnapshot } from "@narumitw/otter-contracts";
import { expect, test } from "vitest";
import { expenseExchangeRate } from "./server-expense-rates.js";

const candidate: ExchangeRateSnapshot = {
  baseCurrency: "TWD",
  rates: { TWD: 1, USD: 32, EUR: 35, JPY: 0.22 },
  fetchedAt: "2026-01-01T00:00:00.000Z",
  rateType: "spotMid",
  source: "BANK_OF_TAIWAN",
};

test("locked custom rates override bank; missing quotes use fixed; base quote is unity", () => {
  expect(
    expenseExchangeRate(
      { baseCurrency: "TWD", exchangeRates: { USD: 40 } },
      "USD",
      candidate,
    ),
  ).toEqual({ baseCurrency: "TWD", rateToBase: 40, source: "custom" });
  expect(
    expenseExchangeRate({ baseCurrency: "TWD" }, "USD", candidate),
  ).toEqual({
    baseCurrency: "TWD",
    rateToBase: 32,
    source: "bank",
    provider: "BANK_OF_TAIWAN",
    rateType: "spotMid",
    fetchedAt: candidate.fetchedAt,
  });
  expect(expenseExchangeRate({ baseCurrency: "TWD" }, "USD", null)).toEqual({
    baseCurrency: "TWD",
    rateToBase: 32,
    source: "fixed",
  });
  expect(
    expenseExchangeRate({ baseCurrency: "EUR" }, "USD", candidate).rateToBase,
  ).toBeCloseTo(32 / 35);
  expect(
    expenseExchangeRate(
      { baseCurrency: "TWD", exchangeRates: { TWD: 5 } },
      "TWD",
      candidate,
    ),
  ).toEqual({ baseCurrency: "TWD", rateToBase: 1, source: "fixed" });
});
