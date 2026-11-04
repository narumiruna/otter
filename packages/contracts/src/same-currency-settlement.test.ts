import { expect, test } from "vitest";
import { parseTripPayload, type TripPayload } from "./index.js";

const payload: TripPayload = {
  balances: [],
  settlements: [],
  trip: {
    id: "trip",
    ownerId: "owner",
    name: "Japan",
    baseCurrency: "TWD",
    visaSettlementEnabled: true,
    visaSettlementCurrency: "TWD",
    createdAt: "2026-07-05T00:00:00Z",
    participants: [{ id: "alice", name: "Alice" }],
    expenses: [
      {
        id: "expense",
        description: "Dinner",
        amountMinor: 1000,
        currency: "JPY",
        paidById: "alice",
        participantIds: ["alice"],
        expenseDate: "2026-07-05",
        exchangeRate: {
          baseCurrency: "TWD",
          rateToBase: 0.2,
          source: "custom",
        },
        createdAt: "2026-07-05T00:00:00Z",
      },
    ],
  },
};

test("same-target payloads do not require a separate Visa snapshot", () => {
  expect(parseTripPayload(payload)).toBe(payload);
  expect(() =>
    parseTripPayload({
      ...payload,
      trip: { ...payload.trip, visaSettlementCurrency: "USD" },
    }),
  ).toThrow();
});

test("same-target payloads validate optional inactive snapshots independently", () => {
  const expense = payload.trip.expenses[0];
  const saved = {
    sourceCurrency: "JPY",
    targetCurrency: "EUR",
    date: expense.expenseDate,
    rate: 0.006,
    fetchedAt: expense.createdAt,
  };
  const inactive = {
    ...payload,
    trip: {
      ...payload.trip,
      expenses: [{ ...expense, visaExchangeRate: saved }],
    },
  };
  expect(parseTripPayload(inactive)).toBe(inactive);
  for (const invalid of [
    { ...saved, date: "2026-07-06" },
    { ...saved, rate: 0 },
  ]) {
    expect(() =>
      parseTripPayload({
        ...inactive,
        trip: {
          ...inactive.trip,
          expenses: [{ ...expense, visaExchangeRate: invalid }],
        },
      }),
    ).toThrow();
  }
});
