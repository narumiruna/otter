import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateBalances,
  calculateSettlements,
  type Trip,
} from "./settlement.js";

test("splits multi-currency expenses and suggests settlements", () => {
  const trip: Trip = {
    baseCurrency: "TWD",
    createdAt: "2026-06-25T00:00:00.000Z",
    expenses: [
      {
        amountMinor: 9600,
        createdAt: "2026-06-25T00:00:00.000Z",
        currency: "USD",
        description: "Hotel",
        id: "expense-1",
        paidById: "alice",
        participantIds: ["alice", "bob", "chen"],
      },
      {
        amountMinor: 3000,
        createdAt: "2026-06-25T00:00:00.000Z",
        currency: "JPY",
        description: "Ramen",
        id: "expense-2",
        paidById: "bob",
        participantIds: ["alice", "bob"],
      },
      {
        amountMinor: 70_00,
        createdAt: "2026-06-25T00:00:00.000Z",
        currency: "EUR",
        description: "Museum",
        id: "expense-3",
        paidById: "chen",
        participantIds: ["alice", "chen"],
      },
    ],
    id: "trip-1",
    name: "Tokyo",
    ownerId: "user-1",
    participants: [
      { id: "alice", name: "Alice" },
      { id: "bob", name: "Bob" },
      { id: "chen", name: "Chen" },
    ],
  };

  assert.deepEqual(
    calculateBalances(trip).map(({ participantId, amountMinor }) => ({
      amountMinor,
      participantId,
    })),
    [
      { amountMinor: 493, participantId: "alice" },
      { amountMinor: -694, participantId: "bob" },
      { amountMinor: 201, participantId: "chen" },
    ],
  );

  assert.deepEqual(
    calculateSettlements(trip).map(({ amountMinor, fromId, toId }) => ({
      amountMinor,
      fromId,
      toId,
    })),
    [
      { amountMinor: 493, fromId: "bob", toId: "alice" },
      { amountMinor: 201, fromId: "bob", toId: "chen" },
    ],
  );
});
