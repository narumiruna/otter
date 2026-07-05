import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateBalances,
  calculateSettlements,
  type Trip,
} from "./settlement.js";

test("uses explicit participant shares when present", () => {
  const trip: Trip = {
    baseCurrency: "TWD",
    createdAt: "2026-06-25T00:00:00.000Z",
    expenses: [
      {
        amountMinor: 100,
        createdAt: "2026-06-25T00:00:00.000Z",
        currency: "TWD",
        description: "Dinner",
        expenseDate: "2026-06-24",
        id: "expense-1",
        paidById: "alice",
        participantIds: ["alice", "bob", "chen"],
        participantShares: [
          { participantId: "alice", shareMinor: 60 },
          { participantId: "bob", shareMinor: 30 },
          { participantId: "chen", shareMinor: 10 },
        ],
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
      { amountMinor: 40, participantId: "alice" },
      { amountMinor: -30, participantId: "bob" },
      { amountMinor: -10, participantId: "chen" },
    ],
  );

  assert.deepEqual(
    calculateSettlements(trip).map(({ amountMinor, fromId, toId }) => ({
      amountMinor,
      fromId,
      toId,
    })),
    [
      { amountMinor: 30, fromId: "bob", toId: "alice" },
      { amountMinor: 10, fromId: "chen", toId: "alice" },
    ],
  );
});

test("falls back when explicit participant shares do not match the amount", () => {
  const trip: Trip = {
    baseCurrency: "TWD",
    createdAt: "2026-06-25T00:00:00.000Z",
    expenses: [
      {
        amountMinor: 100,
        createdAt: "2026-06-25T00:00:00.000Z",
        currency: "TWD",
        description: "Dinner",
        expenseDate: "2026-06-24",
        id: "expense-1",
        paidById: "alice",
        participantIds: ["alice", "bob", "chen"],
        participantShares: [
          { participantId: "alice", shareMinor: 60 },
          { participantId: "bob", shareMinor: 30 },
          { participantId: "chen", shareMinor: 9 },
        ],
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
      { amountMinor: 66, participantId: "alice" },
      { amountMinor: -33, participantId: "bob" },
      { amountMinor: -33, participantId: "chen" },
    ],
  );
});

test("keeps explicit multi-currency shares balanced after rounding", () => {
  const trip: Trip = {
    baseCurrency: "TWD",
    createdAt: "2026-06-25T00:00:00.000Z",
    expenses: [
      {
        amountMinor: 100,
        createdAt: "2026-06-25T00:00:00.000Z",
        currency: "USD",
        description: "Dinner",
        expenseDate: "2026-06-24",
        id: "expense-1",
        paidById: "alice",
        participantIds: ["alice", "bob", "chen"],
        participantShares: [
          { participantId: "alice", shareMinor: 33 },
          { participantId: "bob", shareMinor: 33 },
          { participantId: "chen", shareMinor: 34 },
        ],
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
      { amountMinor: 22, participantId: "alice" },
      { amountMinor: -11, participantId: "bob" },
      { amountMinor: -11, participantId: "chen" },
    ],
  );

  assert.deepEqual(
    calculateSettlements(trip).map(({ amountMinor, fromId, toId }) => ({
      amountMinor,
      fromId,
      toId,
    })),
    [
      { amountMinor: 11, fromId: "bob", toId: "alice" },
      { amountMinor: 11, fromId: "chen", toId: "alice" },
    ],
  );
});

test("splits multi-currency expenses and suggests settlements", () => {
  const trip: Trip = {
    baseCurrency: "TWD",
    createdAt: "2026-06-25T00:00:00.000Z",
    expenses: [
      {
        amountMinor: 9600,
        createdAt: "2026-06-25T00:00:00.000Z",
        currency: "USD",
        expenseDate: "2026-06-24",
        description: "Hotel",
        id: "expense-1",
        paidById: "alice",
        participantIds: ["alice", "bob", "chen"],
      },
      {
        amountMinor: 3000,
        createdAt: "2026-06-25T00:00:00.000Z",
        currency: "JPY",
        expenseDate: "2026-06-24",
        description: "Ramen",
        id: "expense-2",
        paidById: "bob",
        participantIds: ["alice", "bob"],
      },
      {
        amountMinor: 70_00,
        createdAt: "2026-06-25T00:00:00.000Z",
        currency: "EUR",
        expenseDate: "2026-06-25",
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
