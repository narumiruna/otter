import { expect, test } from "vitest";
import { participantDeletionBlock } from "./participant-deletion.js";
import type { Trip } from "./settlement.js";

const trip: Trip = {
  id: "trip",
  name: "Trip",
  ownerId: "owner",
  baseCurrency: "TWD",
  createdAt: "2026-09-21T00:00:00.000Z",
  participants: [
    { id: "alice", name: "Alice" },
    { id: "bob", name: "Bob" },
  ],
  expenses: [],
};
const expense = {
  id: "expense",
  description: "Dinner",
  amountMinor: 100,
  currency: "TWD" as const,
  createdAt: trip.createdAt,
  expenseDate: "2026-09-21",
  paidById: "alice",
  participantIds: ["bob"],
};
const payment = {
  id: "payment",
  amountMinor: 50,
  currency: "TWD" as const,
  createdAt: trip.createdAt,
  paidAt: "2026-09-21",
  note: "",
  fromId: "alice",
  toId: "bob",
};

test("allows unused participants without mutating the trip", () => {
  const before = structuredClone(trip);
  expect(participantDeletionBlock(trip, "alice")).toBeNull();
  expect(trip).toEqual(before);
});
test.each(["alice", "bob"])(
  "blocks expense payer or split participant %s",
  (id) => {
    expect(participantDeletionBlock({ ...trip, expenses: [expense] }, id)).toBe(
      "expense",
    );
  },
);
test.each(["alice", "bob"])("blocks payment sender or recipient %s", (id) => {
  expect(
    participantDeletionBlock({ ...trip, settlementPayments: [payment] }, id),
  ).toBe("payment");
});
test("preserves blocker precedence", () => {
  const used = { ...trip, expenses: [expense], settlementPayments: [payment] };
  expect(participantDeletionBlock(used, "alice")).toBe("expense");
  expect(
    participantDeletionBlock(
      { ...used, participants: [trip.participants[0]] },
      "alice",
    ),
  ).toBe("last-participant");
});
