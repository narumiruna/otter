import { describe, expect, test } from "vitest";
import {
  parseExchangeRateSnapshot,
  parseTripPayload,
  type TripPayload,
} from "./index.js";

const validPayload: TripPayload = {
  balances: [
    {
      amountMinor: 100,
      currency: "TWD",
      name: "Alice",
      participantId: "alice",
    },
    {
      amountMinor: -100,
      currency: "TWD",
      name: "Bob",
      participantId: "bob",
    },
  ],
  settlements: [
    {
      amountMinor: 100,
      currency: "TWD",
      fromId: "bob",
      fromName: "Bob",
      toId: "alice",
      toName: "Alice",
    },
  ],
  trip: {
    baseCurrency: "TWD",
    createdAt: "2026-09-20T00:00:00.000Z",
    expenses: [
      {
        amountMinor: 200,
        createdAt: "2026-09-20T00:00:00.000Z",
        currency: "TWD",
        description: "Dinner",
        expenseDate: "2026-09-20",
        id: "expense-1",
        paidById: "alice",
        participantIds: ["alice", "bob"],
      },
    ],
    id: "trip-1",
    name: "Taipei",
    ownerId: "user-1",
    participants: [
      { id: "alice", name: "Alice" },
      { id: "bob", name: "Bob" },
    ],
  },
};

const completeRates = { EUR: 36.5, JPY: 0.2, TWD: 1, USD: 31.8 };
test.each([
  { name: "absent", rates: undefined, trip: true, snapshot: false },
  { name: "empty", rates: {}, trip: true, snapshot: false },
  { name: "partial", rates: { USD: 31.8 }, trip: true, snapshot: false },
  { name: "complete", rates: completeRates, trip: true, snapshot: true },
  { name: "array", rates: [], trip: false, snapshot: false },
  { name: "null", rates: null, trip: false, snapshot: false },
  {
    name: "unsupported key",
    rates: { ...completeRates, BTC: 1 },
    trip: false,
    snapshot: false,
  },
  {
    name: "numeric string",
    rates: { ...completeRates, USD: "31.8" },
    trip: false,
    snapshot: false,
  },
  {
    name: "zero",
    rates: { ...completeRates, USD: 0 },
    trip: false,
    snapshot: false,
  },
  {
    name: "negative",
    rates: { ...completeRates, USD: -1 },
    trip: false,
    snapshot: false,
  },
  {
    name: "NaN",
    rates: { ...completeRates, USD: Number.NaN },
    trip: false,
    snapshot: false,
  },
  {
    name: "infinity",
    rates: { ...completeRates, USD: Number.POSITIVE_INFINITY },
    trip: false,
    snapshot: false,
  },
  {
    name: "undefined rate",
    rates: { ...completeRates, USD: undefined },
    trip: false,
    snapshot: false,
  },
])("rate-map validation: $name", (scenario) => {
  const payload = {
    ...validPayload,
    trip: { ...validPayload.trip, exchangeRates: scenario.rates },
  };
  const snapshot = {
    baseCurrency: "TWD",
    fetchedAt: "2026-09-20T12:00:00.000Z",
    rateType: "spotMid",
    source: "BANK_OF_TAIWAN",
    rates: scenario.rates,
  };
  if (scenario.trip) expect(parseTripPayload(payload)).toBe(payload);
  else
    expect(() => parseTripPayload(payload)).toThrow(
      "Otter returned an unexpected trip payload",
    );
  if (scenario.snapshot)
    expect(parseExchangeRateSnapshot(snapshot)).toBe(snapshot);
  else
    expect(() => parseExchangeRateSnapshot(snapshot)).toThrow(
      "Invalid exchange-rate snapshot",
    );
});

describe("parseTripPayload", () => {
  test("returns a valid payload", () => {
    expect(parseTripPayload(validPayload)).toEqual(validPayload);
  });

  test("rejects malformed domain values", () => {
    expect(() =>
      parseTripPayload({
        ...validPayload,
        trip: { ...validPayload.trip, baseCurrency: "BTC" },
      }),
    ).toThrow("Otter returned an unexpected trip payload");
  });

  test("rejects malformed calculated results", () => {
    expect(() =>
      parseTripPayload({
        ...validPayload,
        settlements: [{ ...validPayload.settlements[0], amountMinor: 0 }],
      }),
    ).toThrow("Otter returned an unexpected trip payload");
  });

  test("validates bank and custom exchange-rate metadata", () => {
    expect(
      parseTripPayload({
        ...validPayload,
        exchangeRateInfo: {
          fetchedAt: "2026-09-20T12:00:00.000Z",
          provider: "BANK_OF_TAIWAN",
          rateType: "spotMid",
          source: "bank",
        },
      }).exchangeRateInfo?.source,
    ).toBe("bank");
    expect(
      parseTripPayload({
        ...validPayload,
        exchangeRateInfo: {
          customRates: { USD: 30 },
          defaults: {
            fetchedAt: "2026-09-20T12:00:00.000Z",
            provider: "BANK_OF_TAIWAN",
            rates: { EUR: 36.5, JPY: 0.2, TWD: 1, USD: 31.8 },
            rateType: "spotMid",
            source: "bank",
          },
          source: "custom",
        },
      }).exchangeRateInfo?.source,
    ).toBe("custom");
    expect(() =>
      parseTripPayload({
        ...validPayload,
        exchangeRateInfo: {
          fetchedAt: "2026-09-20T12:00:00.000Z",
          provider: "BANK_SINOPAC",
          rateType: "spotMid",
          source: "bank",
        },
      }),
    ).toThrow("Otter returned an unexpected trip payload");
    expect(() =>
      parseTripPayload({
        ...validPayload,
        exchangeRateInfo: {
          customRates: { USD: 30 },
          defaults: {
            rates: { JPY: 0.22, TWD: 1, USD: 32 },
            source: "fixed",
          },
          source: "custom",
        },
      }),
    ).toThrow("Otter returned an unexpected trip payload");
  });
});

describe("parseExchangeRateSnapshot", () => {
  const snapshot = {
    baseCurrency: "TWD",
    fetchedAt: "2026-09-20T12:00:00.000Z",
    rates: { EUR: 36.5, JPY: 0.2, TWD: 1, USD: 31.8 },
    rateType: "spotMid",
    source: "BANK_OF_TAIWAN",
  };

  test("returns a complete supported-currency snapshot", () => {
    expect(parseExchangeRateSnapshot(snapshot)).toEqual(snapshot);
  });

  test("rejects missing, non-positive, and unsupported rates", () => {
    expect(() =>
      parseExchangeRateSnapshot({
        ...snapshot,
        rates: { JPY: 0.2, TWD: 1, USD: 31.8 },
      }),
    ).toThrow("Invalid exchange-rate snapshot");
    expect(() =>
      parseExchangeRateSnapshot({
        ...snapshot,
        rates: { ...snapshot.rates, EUR: 0 },
      }),
    ).toThrow("Invalid exchange-rate snapshot");
    expect(() =>
      parseExchangeRateSnapshot({
        ...snapshot,
        rates: { ...snapshot.rates, BTC: 100_000 },
      }),
    ).toThrow("Invalid exchange-rate snapshot");
  });
});
