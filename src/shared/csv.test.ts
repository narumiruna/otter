import assert from "node:assert/strict";
import test from "node:test";
import { tripExpensesCsv, tripResultsCsv } from "./csv.js";
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

test("exports explicit split shares in expense CSV", () => {
  const trip: Trip = {
    baseCurrency: "TWD",
    createdAt: "2026-06-25T00:00:00.000Z",
    expenses: [
      {
        amountMinor: 1000,
        createdAt: "2026-06-25T00:00:00.000Z",
        currency: "TWD",
        description: "Taxi",
        expenseDate: "2026-06-24",
        id: "expense-1",
        paidById: "alice",
        participantIds: ["alice", "bob"],
        participantShares: [
          { participantId: "alice", shareMinor: 700 },
          { participantId: "bob", shareMinor: 300 },
        ],
      },
    ],
    id: "trip-1",
    name: "Tokyo",
    ownerId: "user-1",
    participants: [
      { id: "alice", name: "Alice" },
      { id: "bob", name: "Bob" },
    ],
  };

  assert.equal(
    tripExpensesCsv(trip),
    [
      "date,description,amount,currency,paid_by,split_participants",
      "2026-06-24,Taxi,1000,TWD,Alice,Alice=700; Bob=300",
    ].join("\n"),
  );
});

test("exports balances and settlements as escaped CSV", () => {
  assert.equal(
    tripResultsCsv(
      [
        {
          amountMinor: 100,
          currency: "TWD",
          name: "Alice, A",
          participantId: "alice",
        },
        {
          amountMinor: -100,
          currency: "TWD",
          name: 'Bob "B"',
          participantId: "bob",
        },
      ],
      [
        {
          amountMinor: 100,
          currency: "TWD",
          fromId: "bob",
          fromName: 'Bob "B"',
          toId: "alice",
          toName: "Alice, A",
        },
      ],
      [
        {
          amountMinor: 100,
          createdAt: "2026-06-25T00:00:00.000Z",
          currency: "TWD",
          fromId: "bob",
          id: "payment-1",
          note: "paid cash",
          paidAt: "2026-06-25",
          toId: "alice",
        },
      ],
      [
        { id: "alice", name: "Alice, A" },
        { id: "bob", name: 'Bob "B"' },
      ],
    ),
    [
      "type,participant,from,to,amount,currency,note",
      'balance,"Alice, A",,,100,TWD,',
      'balance,"Bob ""B""",,,-100,TWD,',
      'settlement,,"Bob ""B""","Alice, A",100,TWD,',
      'payment,,"Bob ""B""","Alice, A",100,TWD,paid cash',
    ].join("\n"),
  );
});
