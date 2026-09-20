import assert from "node:assert/strict";
import { expect, test } from "vitest";
import { currencies, fixedExchangeRates } from "./money.js";

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
