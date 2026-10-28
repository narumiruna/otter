import { expect, test } from "vitest";
import {
  calculateBalances,
  calculateMemberAccounts,
  calculatePersonalSummary,
  type Trip,
} from "./settlement.js";

function fixture(): Trip {
  return {
    id: "t",
    ownerId: "u",
    name: "Trip",
    createdAt: "now",
    baseCurrency: "TWD",
    participants: [
      { id: "a", name: "Alice" },
      { id: "b", name: "Bob" },
      { id: "z", name: "Zero" },
    ],
    expenses: [
      {
        id: "e",
        description: "Meal",
        expenseDate: "2026-10-01",
        createdAt: "now",
        currency: "TWD",
        amountMinor: 101,
        paidById: "a",
        participantIds: ["a", "b"],
      },
    ],
    settlementPayments: [],
  };
}
test.each([0, 20, 50, 51])(
  "payment %i changes only settlement results and all entries reconcile",
  (paid) => {
    const trip = fixture();
    trip.settlementPayments = [
      {
        id: "p",
        fromId: "b",
        toId: "a",
        currency: "TWD",
        amountMinor: paid,
        paidAt: "2026-10-02",
        createdAt: "now",
        note: "",
      },
    ];
    for (const account of calculateMemberAccounts(trip)) {
      expect(account.paidMinor).toBe(account.participantId === "a" ? 101 : 0);
      expect(account.sharedMinor).toBe(
        account.participantId === "a"
          ? 51
          : account.participantId === "b"
            ? 50
            : 0,
      );
      expect(
        account.paidMinor -
          account.sharedMinor +
          account.payments.reduce(
            (sum, p) =>
              sum + (p.direction === "paid" ? p.amountMinor : -p.amountMinor),
            0,
          ),
      ).toBe(account.balanceMinor);
      expect(account.balanceMinor).toBe(
        calculateBalances(trip).find(
          (b) => b.participantId === account.participantId,
        )?.amountMinor,
      );
    }
  },
);
test("foreign payment entries use the same rates as balances and skip unknown members", () => {
  const trip = fixture();
  trip.exchangeRates = { TWD: 1, USD: 32 };
  trip.settlementPayments = [
    {
      id: "p",
      fromId: "b",
      toId: "a",
      currency: "USD",
      amountMinor: 100,
      paidAt: "2026-10-02",
      createdAt: "now",
      note: "",
    },
    {
      id: "invalid",
      fromId: "missing",
      toId: "a",
      currency: "TWD",
      amountMinor: 999,
      paidAt: "2026-10-02",
      createdAt: "now",
      note: "",
    },
  ];
  expect(calculateMemberAccounts(trip)[0].payments).toEqual([
    { paymentId: "p", amountMinor: 32, direction: "received" },
  ]);
  expect(calculateMemberAccounts(trip)[0].balanceMinor).toBe(18);
});
test("mixed entries keep expense and payment order before representative transfers", () => {
  const trip = fixture();
  trip.exchangeRates = { TWD: 1, USD: 30 };
  trip.participants[0].settledById = "b";
  trip.participants[1].settledById = "z";
  trip.participants[2].settledById = "missing";
  trip.expenses[0].participantIds = ["b", "missing", "a"];
  trip.expenses.push(
    {
      ...trip.expenses[0],
      id: "explicit",
      paidById: "b",
      amountMinor: 100,
      currency: "USD",
      exchangeRate: { baseCurrency: "TWD", rateToBase: 32, source: "custom" },
      participantIds: ["z", "missing", "b", "a"],
      participantShares: [
        { participantId: "z", shareMinor: 34 },
        { participantId: "b", shareMinor: 33 },
        { participantId: "a", shareMinor: 33 },
      ],
    },
    {
      ...trip.expenses[0],
      id: "unknown-payer",
      paidById: "missing",
      currency: "EUR",
    },
    {
      ...trip.expenses[0],
      id: "unknown-split",
      participantIds: ["missing"],
      currency: "EUR",
    },
  );
  const payment = {
    id: "p1",
    fromId: "b",
    toId: "a",
    currency: "USD",
    amountMinor: 100,
    paidAt: "2026-10-02",
    createdAt: "now",
    note: "",
  } as const;
  trip.settlementPayments = [
    payment,
    { ...payment, id: "self", fromId: "a", currency: "TWD", amountMinor: 3 },
    { ...payment, id: "p2", fromId: "z", currency: "TWD", amountMinor: 2 },
    { ...payment, id: "unknown-from", fromId: "missing", currency: "EUR" },
    { ...payment, id: "unknown-to", toId: "missing", currency: "EUR" },
  ];
  const before = structuredClone(trip);
  const accounts = calculateMemberAccounts(trip);
  expect(accounts).toEqual([
    {
      participantId: "a",
      currency: "TWD",
      paidMinor: 101,
      sharedMinor: 61,
      balanceMinor: 0,
      paidExpenses: [{ expenseId: "e", amountMinor: 101 }],
      sharedExpenses: [
        { expenseId: "e", amountMinor: 51 },
        { expenseId: "explicit", amountMinor: 10 },
      ],
      payments: [
        { paymentId: "p1", amountMinor: 30, direction: "received" },
        { paymentId: "self", amountMinor: 3, direction: "paid" },
        { paymentId: "self", amountMinor: 3, direction: "received" },
        { paymentId: "p2", amountMinor: 2, direction: "received" },
      ],
      adjustments: [{ participantId: "b", amountMinor: -8 }],
    },
    {
      participantId: "b",
      currency: "TWD",
      paidMinor: 32,
      sharedMinor: 61,
      balanceMinor: 0,
      paidExpenses: [{ expenseId: "explicit", amountMinor: 32 }],
      sharedExpenses: [
        { expenseId: "e", amountMinor: 50 },
        { expenseId: "explicit", amountMinor: 11 },
      ],
      payments: [{ paymentId: "p1", amountMinor: 30, direction: "paid" }],
      adjustments: [
        { participantId: "a", amountMinor: 8 },
        { participantId: "z", amountMinor: -9 },
      ],
    },
    {
      participantId: "z",
      currency: "TWD",
      paidMinor: 0,
      sharedMinor: 11,
      balanceMinor: 0,
      paidExpenses: [],
      sharedExpenses: [{ expenseId: "explicit", amountMinor: 11 }],
      payments: [{ paymentId: "p2", amountMinor: 2, direction: "paid" }],
      adjustments: [{ participantId: "b", amountMinor: 9 }],
    },
  ]);
  for (const account of accounts) {
    expect(calculatePersonalSummary(trip, account.participantId)).toEqual({
      paidMinor: account.paidMinor,
      sharedMinor: account.sharedMinor,
      balanceMinor: account.balanceMinor,
      currency: account.currency,
    });
  }
  expect(calculateBalances(trip).map((b) => b.amountMinor)).toEqual([0, 0, 0]);
  expect(calculateMemberAccounts(trip)).toEqual(accounts);
  expect(trip).toEqual(before);
});

test("large group accounts preserve member order, input data and established totals", () => {
  const trip = fixture();
  trip.participants = Array.from({ length: 100 }, (_, i) => ({
    id: `p${i}`,
    name: `Member ${i}`,
  }));
  trip.expenses = Array.from({ length: 500 }, (_, i) => ({
    ...trip.expenses[0],
    id: `e${i}`,
    paidById: `p${i % 100}`,
    participantIds: trip.participants.map((p) => p.id),
  }));
  const before = structuredClone(trip);
  const accounts = calculateMemberAccounts(trip);
  expect(accounts.map((a) => a.participantId)).toEqual(
    trip.participants.map((p) => p.id),
  );
  expect(accounts.reduce((sum, a) => sum + a.paidMinor, 0)).toBe(50500);
  expect(accounts.reduce((sum, a) => sum + a.sharedMinor, 0)).toBe(50500);
  for (const id of ["p0", "p50", "p99"]) {
    const account = accounts.find((a) => a.participantId === id);
    expect(account).toMatchObject(calculatePersonalSummary(trip, id) ?? {});
  }
  expect(trip).toEqual(before);
});
