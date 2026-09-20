import { describe, expect, test } from "vitest";
import { parseTripPayload, type TripPayload } from "./index.js";

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
});
