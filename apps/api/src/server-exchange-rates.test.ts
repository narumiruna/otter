import assert from "node:assert/strict";
import type { Currency } from "@narumitw/otter-core/money";
import type { Rate } from "@narumitw/otter-exchange-rates";
import { Hono } from "hono";
import { expect, test } from "vitest";
import {
  buildExchangeRateSnapshot,
  createExchangeRateService,
  registerExchangeRateRoutes,
} from "./server-exchange-rates.js";
import type { OtterEnv, OtterMiddleware } from "./server-http.js";
import type { LoadedTrip } from "./server-support.js";

const fetchedAt = "2026-09-20T12:00:00.000Z";
const rates: Rate[] = [rate("JPY", 0.2), rate("USD", 31.8), rate("EUR", 36.5)];

test.each<Currency>(["TWD", "JPY", "USD", "EUR"])(
  "normalizes Bank of Taiwan spot mid-rates to %s",
  (baseCurrency) => {
    const snapshot = buildExchangeRateSnapshot(rates, baseCurrency);
    const rateToTwd = { EUR: 36.5, JPY: 0.2, TWD: 1, USD: 31.8 };

    assert.equal(snapshot.baseCurrency, baseCurrency);
    assert.equal(snapshot.fetchedAt, fetchedAt);
    assert.equal(snapshot.rateType, "spotMid");
    assert.equal(snapshot.source, "BANK_OF_TAIWAN");
    assert.equal(snapshot.rates[baseCurrency], 1);
    for (const [currency, value] of Object.entries(snapshot.rates)) {
      expect(value).toBeCloseTo(
        rateToTwd[currency as Currency] / rateToTwd[baseCurrency],
        10,
      );
    }
  },
);

test("rejects an incomplete supported-currency snapshot", () => {
  expect(() => buildExchangeRateSnapshot(rates.slice(0, 2), "TWD")).toThrow(
    "Missing EUR/TWD spot rate",
  );
});

test("payload builder applies bank defaults, preserves custom rates, and falls back", async () => {
  const trip = emptyTrip();
  const service = createExchangeRateService({ fetchRates: async () => rates });
  const bankPayload = await service.buildTripPayload(trip);
  assert.equal(bankPayload.exchangeRateInfo?.source, "bank");
  assert.equal(bankPayload.trip.exchangeRates?.USD, 31.8);

  const customPayload = await service.buildTripPayload({
    ...trip,
    exchangeRates: { TWD: 1, USD: 30 },
  });
  assert.equal(customPayload.exchangeRateInfo?.source, "custom");
  assert.equal(customPayload.trip.exchangeRates?.USD, 30);

  const fallbackService = createExchangeRateService({
    fetchRates: async () => {
      throw new Error("upstream unavailable");
    },
  });
  const fallbackPayload = await fallbackService.buildTripPayload(trip);
  assert.equal(fallbackPayload.exchangeRateInfo?.source, "fixed");
  assert.equal(fallbackPayload.trip.exchangeRates, undefined);
});

test("exchange-rate endpoint returns injected rates and handles failures", async () => {
  const allowed: OtterMiddleware = async (_context, next) => next();
  const app = new Hono<OtterEnv>();
  registerExchangeRateRoutes(
    app,
    allowed,
    createExchangeRateService({ fetchRates: async () => rates }),
  );

  const response = await app.request("/api/exchange-rates/USD");
  assert.equal(response.status, 200);
  const payload = (await response.json()) as { rates: Record<string, number> };
  assert.equal(payload.rates.USD, 1);

  const invalid = await app.request("/api/exchange-rates/BTC");
  assert.equal(invalid.status, 400);

  const failingApp = new Hono<OtterEnv>();
  registerExchangeRateRoutes(
    failingApp,
    allowed,
    createExchangeRateService({
      fetchRates: async () => {
        throw new Error("upstream unavailable");
      },
    }),
  );
  const unavailable = await failingApp.request("/api/exchange-rates/TWD");
  assert.equal(unavailable.status, 502);
  assert.deepEqual(await unavailable.json(), {
    error: "目前無法取得銀行匯率，請稍後再試",
  });
});

function emptyTrip(): LoadedTrip {
  return {
    baseCurrency: "TWD",
    createdAt: "2026-09-20T00:00:00.000Z",
    expenses: [],
    id: "trip_1",
    name: "Tokyo",
    ownerId: "user_1",
    participants: [],
  };
}

function rate(source: string, mid: number): Rate {
  return {
    exchange: "BANK_OF_TAIWAN",
    fetchedAt,
    source,
    spotBuy: mid - 0.01,
    spotSell: mid + 0.01,
    target: "TWD",
  };
}
