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
