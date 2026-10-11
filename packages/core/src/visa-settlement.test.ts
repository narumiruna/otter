import { describe, expect, it } from "vitest";
import { type TripBackupV2, validateTripBackupV1 } from "./backup.js";
import {
  calculateBalances,
  calculateSettlements,
  type Expense,
  type Trip,
} from "./settlement.js";
import {
  convertVisaExpenseMinor,
  isVisaExpenseRate,
} from "./visa-settlement.js";

const date = "2026-07-05";
const expense = (
  id: string,
  expenseDate: string,
  rateToTwd: number,
): Expense => ({
  id,
  description: id,
  amountMinor: 1000,
  currency: "JPY",
  paidById: "a",
  participantIds: ["a", "b"],
  expenseDate,
  createdAt: `${date}T00:00:00Z`,
  exchangeRate: { baseCurrency: "JPY", rateToBase: 1, source: "fixed" },
  visaExchangeRate: {
    sourceCurrency: "JPY",
    date: expenseDate,
    rateToTwd,
    fetchedAt: `${date}T00:00:00Z`,
  },
});
const trip: Trip = {
  id: "t",
  name: "Tokyo",
  ownerId: "u",
  baseCurrency: "JPY",
  createdAt: `${date}T00:00:00Z`,
  participants: [
    { id: "a", name: "Alice" },
    { id: "b", name: "Bob" },
  ],
  expenses: [expense("one", date, 0.2), expense("two", "2026-07-06", 0.22)],
};

describe("Visa settlements", () => {
  it("stays off by default and preserves original JPY calculations", () => {
    expect(calculateSettlements(trip)[0]).toMatchObject({
      amountMinor: 1000,
      currency: "JPY",
    });
    expect(
      calculateSettlements({ ...trip, visaSettlementEnabled: false }),
    ).toEqual(calculateSettlements(trip));
  });

  it("converts each expense separately before computing TWD balances", () => {
    const enabled = { ...trip, visaSettlementEnabled: true };
    expect(
      calculateBalances(enabled).map((b) => [b.amountMinor, b.currency]),
    ).toEqual([
      [210, "TWD"],
      [-210, "TWD"],
    ]);
    expect(calculateSettlements(enabled)[0]).toMatchObject({
      amountMinor: 210,
      currency: "TWD",
      fromId: "b",
      toId: "a",
    });
    expect(trip.baseCurrency).toBe("JPY");
    expect(trip.expenses[0].amountMinor).toBe(1000);
  });

  it("subtracts TWD payments directly without applying another exchange rate", () => {
    const enabled: Trip = {
      ...trip,
      visaSettlementEnabled: true,
      settlementPayments: [
        {
          id: "p",
          fromId: "b",
          toId: "a",
          amountMinor: 100,
          currency: "TWD",
          paidAt: date,
          note: "",
          createdAt: trip.createdAt,
        },
      ],
    };
    expect(calculateSettlements(enabled)[0].amountMinor).toBe(110);
    enabled.settlementPayments = [
      {
        ...enabled.settlementPayments?.[0],
        id: "p",
        fromId: "b",
        toId: "a",
        amountMinor: 1,
        currency: "JPY",
        paidAt: date,
        note: "",
        createdAt: trip.createdAt,
      },
    ];
    expect(() => calculateBalances(enabled)).toThrow("must use TWD");
  });

  it("preserves the rounded total for equal and explicit shares", () => {
    const participants = [
      { id: "a", name: "Alice" },
      { id: "b", name: "Bob" },
      { id: "c", name: "Chris" },
    ];
    for (const participantShares of [
      undefined,
      [
        { participantId: "a", shareMinor: 333 },
        { participantId: "b", shareMinor: 333 },
        { participantId: "c", shareMinor: 334 },
      ],
    ]) {
      const e = {
        ...expense("rounding", date, 0.2006),
        participantIds: ["a", "b", "c"],
        participantShares,
      };
      const balances = calculateBalances({
        ...trip,
        visaSettlementEnabled: true,
        participants,
        expenses: [e],
      });
      expect(balances.reduce((sum, b) => sum + b.amountMinor, 0)).toBe(0);
      expect(balances.map((b) => b.amountMinor)).toEqual([134, -67, -67]);
    }
  });

  it("supports fractional source currencies and TWD identity rates", () => {
    expect(
      convertVisaExpenseMinor(1234, "USD", date, {
        sourceCurrency: "USD",
        date,
        rateToTwd: 32.5,
        fetchedAt: trip.createdAt,
      }),
    ).toBe(401);
    expect(
      convertVisaExpenseMinor(99, "TWD", date, {
        sourceCurrency: "TWD",
        date,
        rateToTwd: 1,
        fetchedAt: trip.createdAt,
      }),
    ).toBe(99);
  });

  it("fails closed for absent, stale, or invalid rates", () => {
    const e = trip.expenses[0];
    for (const visaExchangeRate of [
      undefined,
      { ...e.visaExchangeRate, date: "2026-07-06" },
      { ...e.visaExchangeRate, sourceCurrency: "USD" },
      { ...e.visaExchangeRate, rateToTwd: 0 },
      { ...e.visaExchangeRate, rateToTwd: Number.POSITIVE_INFINITY },
    ]) {
      expect(
        isVisaExpenseRate(visaExchangeRate, e.currency, e.expenseDate),
      ).toBe(false);
    }
    expect(() =>
      calculateBalances({
        ...trip,
        visaSettlementEnabled: true,
        expenses: [{ ...e, visaExchangeRate: undefined }],
      }),
    ).toThrow("matching Visa rate");
    expect(() =>
      convertVisaExpenseMinor(Number.MAX_SAFE_INTEGER, "JPY", date, {
        sourceCurrency: "JPY",
        date,
        rateToTwd: 2,
        fetchedAt: trip.createdAt,
      }),
    ).toThrow("out of range");
  });

  it("keeps representative accounting in TWD", () => {
    const enabled = {
      ...trip,
      visaSettlementEnabled: true,
      participants: [
        { ...trip.participants[0] },
        { ...trip.participants[1], settledById: "a" },
      ],
    };
    expect(calculateSettlements(enabled)).toEqual([]);
  });

  it("validates snapshots and settings in backups without requiring Visa network access", () => {
    const backup: TripBackupV2 = {
      version: 2,
      exportedAt: trip.createdAt,
      trip: {
        name: trip.name,
        baseCurrency: "JPY",
        visaSettlementEnabled: true,
        participants: trip.participants,
        expenses: trip.expenses.map((e) => ({
          ...e,
          exchangeRate: { baseCurrency: "JPY", rateToBase: 1, source: "fixed" },
        })),
      },
    };
    expect(validateTripBackupV1(backup)).toEqual(backup);
    expect(() =>
      validateTripBackupV1({
        ...backup,
        trip: { ...backup.trip, visaSettlementEnabled: "yes" },
      }),
    ).toThrow("設定");
    expect(() =>
      validateTripBackupV1({
        ...backup,
        trip: {
          ...backup.trip,
          expenses: [
            { ...backup.trip.expenses[0], visaExchangeRate: undefined },
          ],
        },
      }),
    ).toThrow("Visa");
    expect(() =>
      validateTripBackupV1({
        ...backup,
        trip: {
          ...backup.trip,
          expenses: [{ ...backup.trip.expenses[0], expenseDate: "2026-07-06" }],
        },
      }),
    ).toThrow("Visa");
  });
});
