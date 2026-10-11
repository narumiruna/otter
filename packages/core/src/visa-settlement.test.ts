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
const expense = (id: string, expenseDate: string, rate: number): Expense => ({
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
    targetCurrency: "TWD" as const,
    date: expenseDate,
    rate,
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
  it("uses selected targets and their minor units without changing JPY amounts", () => {
    for (const [targetCurrency, rate, amountMinor] of [
      ["USD", 0.0065, 325],
      ["EUR", 0.006, 300],
      ["JPY", 1, 500],
    ] as const) {
      const enabled: Trip = {
        ...trip,
        visaSettlementEnabled: true,
        visaSettlementCurrency: targetCurrency,
        expenses: [
          {
            ...trip.expenses[0],
            visaExchangeRate: {
              sourceCurrency: "JPY",
              targetCurrency,
              date,
              rate,
              fetchedAt: trip.createdAt,
            },
          },
        ],
      };
      expect(calculateSettlements(enabled)[0]).toMatchObject({
        currency: targetCurrency,
        amountMinor,
      });
      expect(enabled.expenses[0].amountMinor).toBe(1000);
      expect(enabled.baseCurrency).toBe("JPY");
    }
    expect(
      convertVisaExpenseMinor(1234, "USD", date, {
        sourceCurrency: "USD",
        targetCurrency: "JPY",
        date,
        rate: 155.123,
        fetchedAt: trip.createdAt,
      }),
    ).toBe(1914);
    expect(
      convertVisaExpenseMinor(1234, "EUR", date, {
        sourceCurrency: "EUR",
        targetCurrency: "USD",
        date,
        rate: 1.091234,
        fetchedAt: trip.createdAt,
      }),
    ).toBe(1347);
  });

  it("conserves explicit shares in a decimal settlement currency", () => {
    const enabled: Trip = {
      ...trip,
      visaSettlementEnabled: true,
      visaSettlementCurrency: "USD",
      participants: [...trip.participants, { id: "c", name: "Chris" }],
      expenses: [
        {
          ...trip.expenses[0],
          participantIds: ["a", "b", "c"],
          participantShares: [
            { participantId: "a", shareMinor: 333 },
            { participantId: "b", shareMinor: 333 },
            { participantId: "c", shareMinor: 334 },
          ],
          visaExchangeRate: {
            sourceCurrency: "JPY",
            targetCurrency: "USD",
            date,
            rate: 0.006515,
            fetchedAt: trip.createdAt,
          },
        },
      ],
    };
    const balances = calculateBalances(enabled);
    expect(balances.map((b) => b.amountMinor)).toEqual([435, -217, -218]);
    expect(balances.reduce((sum, b) => sum + b.amountMinor, 0)).toBe(0);
  });

  it("rejects a snapshot for a different settlement target", () => {
    expect(() =>
      calculateBalances({
        ...trip,
        visaSettlementEnabled: true,
        visaSettlementCurrency: "USD",
      }),
    ).toThrow("matching Visa rate");
  });

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
    const enabled = {
      ...trip,
      visaSettlementEnabled: true,
      visaSettlementCurrency: "TWD" as const,
    };
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
      visaSettlementCurrency: "TWD" as const,
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
    expect(() => calculateBalances(enabled)).toThrow("selected currency");
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
        visaSettlementCurrency: "TWD" as const,
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
        targetCurrency: "TWD",
        date,
        rate: 32.5,
        fetchedAt: trip.createdAt,
      }),
    ).toBe(401);
    expect(
      convertVisaExpenseMinor(99, "TWD", date, {
        sourceCurrency: "TWD",
        targetCurrency: "TWD",
        date,
        rate: 1,
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
      { ...e.visaExchangeRate, rate: 0 },
      { ...e.visaExchangeRate, rate: Number.POSITIVE_INFINITY },
    ]) {
      expect(
        isVisaExpenseRate(visaExchangeRate, e.currency, e.expenseDate),
      ).toBe(false);
    }
    expect(() =>
      calculateBalances({
        ...trip,
        visaSettlementEnabled: true,
        visaSettlementCurrency: "TWD" as const,
        expenses: [{ ...e, visaExchangeRate: undefined }],
      }),
    ).toThrow("matching Visa rate");
    expect(() =>
      convertVisaExpenseMinor(Number.MAX_SAFE_INTEGER, "JPY", date, {
        sourceCurrency: "JPY",
        targetCurrency: "TWD",
        date,
        rate: 2,
        fetchedAt: trip.createdAt,
      }),
    ).toThrow("out of range");
  });

  it("keeps representative accounting in TWD", () => {
    const enabled = {
      ...trip,
      visaSettlementEnabled: true,
      visaSettlementCurrency: "TWD" as const,
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
        visaSettlementCurrency: "TWD" as const,
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
