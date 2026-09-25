import assert from "node:assert/strict";
import { expect, test } from "vitest";
import {
  convertExpenseMinor,
  currencies,
  fixedExchangeRates,
  isExpenseExchangeRate,
} from "./money.js";

test("snapshots round once in minor units and reject incompatible quotes", () => {
  const snapshot = {
    baseCurrency: "TWD" as const,
    rateToBase: 32.5,
    source: "custom" as const,
  };
  expect(
    convertExpenseMinor(101, "USD", "TWD", snapshot, { USD: 99, TWD: 1 }),
  ).toBe(33);
  expect(isExpenseExchangeRate({ ...snapshot, rateToBase: 0 }, "USD")).toBe(
    false,
  );
  expect(
    isExpenseExchangeRate(
      { ...snapshot, rateToBase: Number.POSITIVE_INFINITY },
      "USD",
    ),
  ).toBe(false);
  expect(
    isExpenseExchangeRate({ ...snapshot, baseCurrency: "USD" }, "USD"),
  ).toBe(false);
  expect(isExpenseExchangeRate({ ...snapshot, source: "bank" }, "USD")).toBe(
    false,
  );
});

test.each(currencies)(
  "normalizes fixed exchange rates to %s",
  (baseCurrency) => {
    const rates = fixedExchangeRates(baseCurrency);

    assert.equal(rates[baseCurrency], 1);
    for (const rate of Object.values(rates)) {
      expect(rate).toBeGreaterThan(0);
    }
    expect(rates.USD / rates.EUR).toBeCloseTo(32 / 35);
  },
);
