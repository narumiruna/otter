import { expect, test } from "vitest";
import {
  expenseExchangeRate,
  type PreparedRates,
  rateBridge,
} from "./server-expense-rates.js";

const date = "2026-07-05";
const candidate: PreparedRates = new Map([
  [
    "USD/TWD/2026-07-05",
    {
      sourceCurrency: "USD",
      targetCurrency: "TWD",
      date,
      rate: 32,
      fetchedAt: "2026-07-05T00:00:00Z",
    },
  ],
]);
test("locked custom rates override Visa and identity is 1", () => {
  expect(
    expenseExchangeRate(
      { baseCurrency: "TWD", exchangeRates: { USD: 40 } },
      "USD",
      candidate,
      100,
      date,
    ),
  ).toEqual({ baseCurrency: "TWD", rateToBase: 40, source: "custom" });
  expect(
    expenseExchangeRate({ baseCurrency: "TWD" }, "USD", candidate, 100, date),
  ).toMatchObject({
    source: "visa",
    provider: "VISA",
    rateType: "visa",
    date,
    rateToBase: 32,
  });
  expect(
    expenseExchangeRate(
      { baseCurrency: "TWD", exchangeRates: { TWD: 5 } },
      "TWD",
      null,
      100,
      date,
    ),
  ).toEqual({ baseCurrency: "TWD", rateToBase: 1, source: "fixed" });
});
test("missing, stale, or wrong-target candidates never become fixed estimates", () => {
  for (const rates of [null, candidate]) {
    expect(() =>
      expenseExchangeRate({ baseCurrency: "JPY" }, "USD", rates, 100, date),
    ).toThrow("Visa");
  }
  expect(() =>
    expenseExchangeRate(
      { baseCurrency: "TWD" },
      "USD",
      candidate,
      100,
      "2026-07-06",
    ),
  ).toThrow("Visa");
});
test("preserves valid saved bridges and requires a matching candidate otherwise", () => {
  const rate = { baseCurrency: "USD", rateToBase: 1, source: "fixed" } as const;
  const saved = {
    sourceCurrency: "USD",
    baseCurrency: "TWD",
    rateToBase: 30,
    source: "legacy",
  } as const;
  expect(rateBridge(rate, "TWD", date, null, saved)).toBe(saved);
  expect(rateBridge(rate, "TWD", date, candidate)?.rateToBase).toBe(32);
  expect(() => rateBridge(rate, "JPY", date, candidate)).toThrow("Visa");
});
