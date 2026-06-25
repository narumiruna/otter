import assert from "node:assert/strict";
import test from "node:test";
import { tripExpensesCsv } from "./csv.js";
import type { Trip } from "./settlement.js";

test("exports trip expenses as escaped CSV", () => {
  const trip: Trip = {
    baseCurrency: "TWD",
    createdAt: "2026-06-25T00:00:00.000Z",
    expenses: [
      {
        amountMinor: 12345,
        createdAt: "2026-06-25T00:00:00.000Z",
        currency: "USD",
        description: 'Dinner, "sushi"',
        expenseDate: "2026-06-24",
        id: "expense-1",
        paidById: "alice",
        participantIds: ["alice", "bob"],
      },
    ],
    id: "trip-1",
    name: "Tokyo",
    ownerId: "user-1",
    participants: [
      { id: "alice", name: "Alice" },
      { id: "bob", name: "Bob, Jr" },
    ],
  };

  assert.equal(
    tripExpensesCsv(trip),
    [
      "date,description,amount,currency,paid_by,split_participants",
      '2026-06-24,"Dinner, ""sushi""",123.45,USD,Alice,"Alice; Bob, Jr"',
    ].join("\n"),
  );
});
