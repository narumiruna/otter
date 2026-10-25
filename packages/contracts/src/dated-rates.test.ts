import {
  currencies,
  type ExpenseExchangeRate,
} from "@narumitw/otter-core/money";
import { expect, test } from "vitest";
import {
  parseExchangeRateSnapshot,
  parseTripPayload,
  type TripPayload,
} from "./index.js";

const date = "2026-07-05";
const rate: ExpenseExchangeRate = {
  source: "visa" as const,
  provider: "VISA",
  rateType: "visa",
  date,
  rateToBase: 0.2,
  baseCurrency: "TWD" as const,
  fetchedAt: "2026-07-05T00:00:00Z",
};
const payload: TripPayload = {
  balances: [],
  settlements: [],
  exchangeRateInfo: { source: "visa" },
  trip: {
    id: "t",
    name: "Japan",
    ownerId: "a",
    baseCurrency: "TWD",
    createdAt: rate.fetchedAt,
    participants: [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
    ],
    expenses: [
      {
        id: "e",
        description: "Lunch",
        amountMinor: 1000,
        currency: "JPY",
        exchangeRate: rate,
        expenseDate: date,
        paidById: "a",
        participantIds: ["a", "b"],
        createdAt: rate.fetchedAt,
      },
    ],
    settlementPayments: [
      {
        id: "p",
        fromId: "b",
        toId: "a",
        amountMinor: 100,
        currency: "JPY",
        exchangeRate: rate,
        paidAt: date,
        note: "",
        createdAt: rate.fetchedAt,
      },
    ],
  },
};
test("base and payment Visa snapshots need the correct record date", () => {
  expect(parseTripPayload(payload)).toBe(payload);
  for (const property of ["expenses", "settlementPayments"] as const) {
    const items = payload.trip[property];
    if (!items) throw new Error("Missing fixture");
    const invalid = {
      ...payload,
      trip: {
        ...payload.trip,
        [property]: items.map((item) => ({
          ...item,
          exchangeRate: { ...rate, date: "2026-07-06" },
        })),
      },
    };
    expect(() => parseTripPayload(invalid)).toThrow();
  }
});
test("bridges must match both the saved base and the current target", () => {
  const expense = payload.trip.expenses[0];
  const base = { ...rate, baseCurrency: "USD" as const };
  const bridge = { ...rate, rateToBase: 32, sourceCurrency: "USD" as const };
  const valid = {
    ...payload,
    trip: {
      ...payload.trip,
      expenses: [
        { ...expense, exchangeRate: base, exchangeRateBridge: bridge },
      ],
    },
  };
  expect(parseTripPayload(valid)).toBe(valid);
  for (const invalid of [
    { ...bridge, sourceCurrency: "EUR" },
    { ...bridge, baseCurrency: "EUR" },
    { ...bridge, date: "2026-07-06" },
  ])
    expect(() =>
      parseTripPayload({
        ...valid,
        trip: {
          ...valid.trip,
          expenses: [
            { ...expense, exchangeRate: base, exchangeRateBridge: invalid },
          ],
        },
      }),
    ).toThrow();
});
test("Visa preview reports every missing quote and rejects false availability", () => {
  const unavailableCurrencies = currencies.filter((c) => c !== "TWD");
  const preview = {
    source: "VISA",
    rateType: "visa",
    date,
    fetchedAt: rate.fetchedAt,
    baseCurrency: "TWD",
    rates: { TWD: 1 },
    unavailableCurrencies,
  };
  expect(parseExchangeRateSnapshot(preview)).toEqual(preview);
  for (const invalid of [
    { ...preview, date: "2026-02-29" },
    { ...preview, unavailableCurrencies: [] },
    { ...preview, unavailableCurrencies: [...unavailableCurrencies, "USD"] },
    { ...preview, rates: { TWD: 1, USD: 30 } },
  ])
    expect(() => parseExchangeRateSnapshot(invalid)).toThrow();
});
