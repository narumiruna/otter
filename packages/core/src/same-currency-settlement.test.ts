import { expect, test } from "vitest";
import { type TripBackupV3, validateTripBackupV1 } from "./backup.js";
import {
  calculateBalances,
  calculateMemberAccounts,
  calculatePersonalSummary,
  calculateSettlements,
  type Trip,
  usesVisaSettlementRates,
} from "./settlement.js";

const trip: Trip = {
  id: "trip",
  ownerId: "owner",
  name: "Japan",
  baseCurrency: "TWD",
  visaSettlementEnabled: true,
  visaSettlementCurrency: "TWD",
  createdAt: "2026-07-05T00:00:00Z",
  participants: [
    { id: "a", name: "Alice" },
    { id: "b", name: "Bob" },
    { id: "c", name: "Chris" },
  ],
  expenses: [
    {
      id: "expense",
      description: "Dinner",
      currency: "JPY",
      amountMinor: 1101,
      expenseDate: "2026-07-05",
      paidById: "a",
      participantIds: ["a", "b", "c"],
      exchangeRate: {
        source: "custom",
        baseCurrency: "USD",
        rateToBase: 0.00651,
      },
      exchangeRateBridge: {
        source: "legacy",
        sourceCurrency: "USD",
        baseCurrency: "TWD",
        rateToBase: 32.5,
      },
      createdAt: "2026-07-05T00:00:00Z",
    },
  ],
};

for (const baseCurrency of ["TWD", "USD"] as const) {
  test.each([false, true])(
    `same ${baseCurrency} settlement reuses saved conversions with explicit shares=%s`,
    (explicit) => {
      const enabled: Trip = {
        ...trip,
        baseCurrency,
        visaSettlementCurrency: baseCurrency,
        expenses: trip.expenses.map((expense) => ({
          ...expense,
          exchangeRateBridge:
            baseCurrency === "TWD" ? expense.exchangeRateBridge : undefined,
          participantShares: explicit
            ? trip.participants.map((p) => ({
                participantId: p.id,
                shareMinor: 367,
              }))
            : undefined,
        })),
      };
      const legacy = { ...enabled, visaSettlementEnabled: false };
      expect(usesVisaSettlementRates(enabled)).toBe(false);
      expect(calculateBalances(enabled)).toEqual(calculateBalances(legacy));
      expect(calculateSettlements(enabled)).toEqual(
        calculateSettlements(legacy),
      );
      expect(calculateMemberAccounts(enabled)).toEqual(
        calculateMemberAccounts(legacy),
      );
      expect(calculatePersonalSummary(enabled, "a")).toEqual(
        calculatePersonalSummary(legacy, "a"),
      );
      expect(
        calculateBalances(enabled).reduce((sum, b) => sum + b.amountMinor, 0),
      ).toBe(0);
      expect(calculatePersonalSummary(enabled, "a")?.paidMinor).toBe(
        baseCurrency === "TWD" ? 233 : 717,
      );
    },
  );
}

test("matching saved Visa conversions preserve historical same-target results", () => {
  const historical: Trip = {
    ...trip,
    expenses: trip.expenses.map((expense) => ({
      ...expense,
      visaExchangeRate: {
        sourceCurrency: expense.currency,
        targetCurrency: "TWD",
        date: expense.expenseDate,
        rate: 0.3,
        fetchedAt: trip.createdAt,
      },
    })),
  };
  expect(calculatePersonalSummary(historical, "a")?.paidMinor).toBe(330);
  expect(calculatePersonalSummary(trip, "a")?.paidMinor).toBe(233);
  const inactive: Trip = {
    ...historical,
    expenses: historical.expenses.map((expense) => ({
      ...expense,
      visaExchangeRate: expense.visaExchangeRate
        ? { ...expense.visaExchangeRate, targetCurrency: "EUR" }
        : undefined,
    })),
  };
  expect(calculateBalances(inactive)).toEqual(calculateBalances(trip));
});

test("same-target v3 backups accept absent or inactive Visa snapshots but validate supplied snapshots", () => {
  const backup: TripBackupV3 = {
    version: 3,
    exportedAt: trip.createdAt,
    trip: {
      ...trip,
      expenses: trip.expenses.map((expense) => {
        if (!expense.exchangeRate) throw new Error("Missing fixture rate");
        return { ...expense, exchangeRate: expense.exchangeRate };
      }),
    },
  };
  expect(validateTripBackupV1(backup)).toBe(backup);
  const expense = backup.trip.expenses[0];
  const saved = {
    sourceCurrency: expense.currency,
    targetCurrency: "EUR" as const,
    date: expense.expenseDate,
    rate: 0.006,
    fetchedAt: trip.createdAt,
  };
  const inactive = {
    ...backup,
    trip: {
      ...backup.trip,
      expenses: [{ ...expense, visaExchangeRate: saved }],
    },
  };
  expect(validateTripBackupV1(inactive)).toBe(inactive);
  expect(() =>
    validateTripBackupV1({
      ...inactive,
      trip: {
        ...inactive.trip,
        expenses: [
          { ...expense, visaExchangeRate: { ...saved, date: "2026-07-06" } },
        ],
      },
    }),
  ).toThrow("Visa");
  expect(() =>
    validateTripBackupV1({
      ...backup,
      trip: { ...backup.trip, visaSettlementCurrency: "EUR" },
    }),
  ).toThrow("Visa");
});

test("enabled same-target payments still require the selected currency", () => {
  const payment = {
    id: "payment",
    fromId: "b",
    toId: "a",
    amountMinor: 10,
    currency: "TWD" as const,
    paidAt: "2026-07-05",
    note: "",
    createdAt: trip.createdAt,
  };
  expect(
    calculateBalances({ ...trip, settlementPayments: [payment] })[1]
      .amountMinor,
  ).toBe(-68);
  expect(() =>
    calculateBalances({
      ...trip,
      settlementPayments: [{ ...payment, currency: "JPY" }],
    }),
  ).toThrow("selected currency");
});
