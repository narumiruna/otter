import { expect, test } from "vitest";
import {
  calculateBalances,
  calculateMemberAccounts,
  calculatePersonalSummary,
  type Trip,
} from "./settlement.js";

function trip(): Trip {
  return {
    id: "t",
    name: "Travel",
    ownerId: "u",
    baseCurrency: "TWD",
    createdAt: "now",
    participants: [
      { id: "a", name: "Alice" },
      { id: "b", name: "Bob" },
      { id: "c", name: "Child" },
    ],
    expenses: [
      {
        id: "e",
        description: "Meal",
        amountMinor: 101,
        currency: "TWD",
        paidById: "a",
        participantIds: ["c", "b", "a"],
        expenseDate: "2026-10-01",
        createdAt: "now",
      },
    ],
  };
}
test("personal totals match equal split ordering and remainder", () => {
  const t = trip();
  expect(calculatePersonalSummary(t, "missing")).toBeUndefined();
  expect(calculatePersonalSummary(t, "a")).toEqual({
    paidMinor: 101,
    sharedMinor: 34,
    balanceMinor: 67,
    currency: "TWD",
  });
  expect(calculatePersonalSummary(t, "b")?.sharedMinor).toBe(34);
  expect(calculatePersonalSummary(t, "c")?.sharedMinor).toBe(33);
  expect(calculatePersonalSummary({ ...t, expenses: [] }, "a")).toMatchObject({
    paidMinor: 0,
    sharedMinor: 0,
    balanceMinor: 0,
  });
});
test("explicit foreign shares use the saved snapshot and the same rounding as balances", () => {
  const t = trip();
  t.exchangeRates = { USD: 999 };
  t.expenses[0] = {
    ...t.expenses[0],
    amountMinor: 100,
    currency: "USD",
    exchangeRate: { baseCurrency: "TWD", rateToBase: 32, source: "custom" },
    participantShares: [
      { participantId: "a", shareMinor: 33 },
      { participantId: "b", shareMinor: 33 },
      { participantId: "c", shareMinor: 34 },
    ],
  };
  expect(calculatePersonalSummary(t, "a")?.paidMinor).toBe(32);
  let shared = 0;
  for (const person of t.participants) {
    const s = calculatePersonalSummary(t, person.id);
    expect(s).toBeDefined();
    if (!s) throw new Error("Missing summary");
    shared += s.sharedMinor;
    expect(s.paidMinor - s.sharedMinor).toBe(
      calculateBalances(t).find((b) => b.participantId === person.id)
        ?.amountMinor,
    );
  }
  expect(shared).toBe(32);
  expect(calculateMemberAccounts(t).map((a) => a.sharedExpenses)).toEqual([
    [{ expenseId: "e", amountMinor: 10 }],
    [{ expenseId: "e", amountMinor: 11 }],
    [{ expenseId: "e", amountMinor: 11 }],
  ]);
});
test("explicit foreign shares distribute a positive conversion remainder in participant order", () => {
  const t = trip();
  t.expenses[0] = {
    ...t.expenses[0],
    amountMinor: 100,
    currency: "USD",
    exchangeRate: { baseCurrency: "TWD", rateToBase: 1, source: "custom" },
    participantShares: [
      { participantId: "c", shareMinor: 34 },
      { participantId: "b", shareMinor: 33 },
      { participantId: "a", shareMinor: 33 },
    ],
  };
  const before = structuredClone(t);
  expect(calculateMemberAccounts(t).map((a) => a.sharedExpenses)).toEqual([
    [{ expenseId: "e", amountMinor: 1 }],
    [{ expenseId: "e", amountMinor: 0 }],
    [{ expenseId: "e", amountMinor: 0 }],
  ]);
  expect(calculatePersonalSummary(t, "a")).toEqual({
    paidMinor: 1,
    sharedMinor: 1,
    balanceMinor: 0,
    currency: "TWD",
  });
  expect(t).toEqual(before);
});

test.each(["expense", "payment"])(
  "summaries and accounts reject a %s without a required saved rate",
  (kind) => {
    const t = trip();
    if (kind === "expense") {
      t.expenses[0].currency = "USD";
    } else {
      t.settlementPayments = [
        {
          id: "p",
          fromId: "b",
          toId: "a",
          amountMinor: 100,
          currency: "USD",
          paidAt: "2026-10-02",
          note: "",
          createdAt: "now",
        },
      ];
    }
    const before = structuredClone(t);
    expect(() => calculatePersonalSummary(t, "a")).toThrow(
      "Missing saved USD/TWD exchange rate",
    );
    expect(() => calculateMemberAccounts(t)).toThrow(
      "Missing saved USD/TWD exchange rate",
    );
    expect(calculatePersonalSummary(t, "missing")).toBeUndefined();
    expect(t).toEqual(before);
  },
);

test("payments and representatives affect balances but not personal expense totals", () => {
  const t = trip();
  t.participants[2].settledById = "b";
  t.settlementPayments = [
    {
      id: "p",
      fromId: "b",
      toId: "a",
      amountMinor: 20,
      currency: "TWD",
      paidAt: "2026-10-02",
      note: "",
      createdAt: "now",
    },
  ];
  expect(calculatePersonalSummary(t, "a")).toMatchObject({
    paidMinor: 101,
    sharedMinor: 34,
    balanceMinor: 47,
  });
  expect(calculatePersonalSummary(t, "b")).toMatchObject({
    paidMinor: 0,
    sharedMinor: 34,
    balanceMinor: -47,
  });
  expect(calculatePersonalSummary(t, "c")).toMatchObject({
    paidMinor: 0,
    sharedMinor: 33,
    balanceMinor: 0,
  });
  const accounts = calculateMemberAccounts(t);
  expect(accounts[0].payments).toEqual([
    { paymentId: "p", amountMinor: 20, direction: "received" },
  ]);
  expect(accounts[1].payments).toEqual([
    { paymentId: "p", amountMinor: 20, direction: "paid" },
  ]);
  expect(accounts[1].adjustments).toEqual([
    { participantId: "c", amountMinor: -33 },
  ]);
  expect(accounts[2].adjustments).toEqual([
    { participantId: "b", amountMinor: 33 },
  ]);
  for (const account of accounts) {
    const paymentNet = account.payments.reduce(
      (total, p) =>
        total + (p.direction === "paid" ? p.amountMinor : -p.amountMinor),
      0,
    );
    expect(
      account.paidExpenses.reduce((sum, e) => sum + e.amountMinor, 0),
    ).toBe(account.paidMinor);
    expect(
      account.sharedExpenses.reduce((sum, e) => sum + e.amountMinor, 0),
    ).toBe(account.sharedMinor);
    expect(
      account.paidMinor -
        account.sharedMinor +
        paymentNet +
        account.adjustments.reduce((sum, a) => sum + a.amountMinor, 0),
    ).toBe(account.balanceMinor);
  }
});
test("Visa summaries use the selected currency and saved dated rate", () => {
  const t = trip();
  t.visaSettlementEnabled = true;
  t.visaSettlementCurrency = "USD";
  t.expenses[0].visaExchangeRate = {
    sourceCurrency: "TWD",
    targetCurrency: "USD",
    date: "2026-10-01",
    rate: 0.03,
    fetchedAt: "2026-10-01T00:00:00Z",
  };
  expect(calculatePersonalSummary(t, "a")).toEqual({
    paidMinor: 303,
    sharedMinor: 101,
    balanceMinor: 202,
    currency: "USD",
  });
  t.expenses[0].participantShares = [
    { participantId: "a", shareMinor: 34 },
    { participantId: "b", shareMinor: 34 },
    { participantId: "c", shareMinor: 33 },
  ];
  expect(calculatePersonalSummary(t, "a")?.sharedMinor).toBe(102);
  const before = structuredClone(t);
  for (const account of calculateMemberAccounts(t)) {
    const { paidMinor, sharedMinor, balanceMinor, currency } = account;
    expect({ paidMinor, sharedMinor, balanceMinor, currency }).toEqual(
      calculatePersonalSummary(t, account.participantId),
    );
    expect(
      account.sharedExpenses.reduce((sum, e) => sum + e.amountMinor, 0),
    ).toBe(sharedMinor);
  }
  expect(t).toEqual(before);
});
