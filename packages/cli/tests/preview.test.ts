import { Readable } from "node:stream";
import type { TripPayload } from "@narumitw/otter-contracts";
import type { ExpenseExchangeRate } from "@narumitw/otter-core/money";
import { describe, expect, test } from "vitest";
import {
  executeSettlementPreview,
  parseSettlementPreviewArguments,
  settlementPreview,
} from "../src/preview.js";

const payload: TripPayload = {
  balances: [
    {
      amountMinor: 50,
      currency: "TWD",
      name: "Alice",
      participantId: "alice",
    },
    {
      amountMinor: -50,
      currency: "TWD",
      name: "Bob",
      participantId: "bob",
    },
  ],
  settlements: [
    {
      amountMinor: 50,
      currency: "TWD",
      fromId: "bob",
      fromName: "Bob",
      toId: "alice",
      toName: "Alice",
    },
  ],
  trip: {
    baseCurrency: "TWD",
    createdAt: "2026-09-20T00:00:00.000Z",
    expenses: [
      {
        amountMinor: 100,
        createdAt: "2026-09-20T00:00:00.000Z",
        currency: "TWD",
        description: "Lunch",
        expenseDate: "2026-09-20",
        id: "expense-1",
        paidById: "alice",
        participantIds: ["alice", "bob"],
      },
    ],
    id: "trip-1",
    name: "Taipei",
    ownerId: "user-1",
    participants: [
      { id: "alice", name: "Alice" },
      { id: "bob", name: "Bob" },
    ],
  },
};

describe("settlement preview", () => {
  test("parses the required input option", () => {
    expect(parseSettlementPreviewArguments(["--input", "trip.json"])).toBe(
      "trip.json",
    );
    expect(() => parseSettlementPreviewArguments([])).toThrow(
      "requires --input",
    );
  });

  test("calculates the same result as the payload", () => {
    expect(settlementPreview(payload)).toEqual({
      balances: payload.balances,
      settlements: payload.settlements,
    });
  });

  test("previews dated Visa base and payment snapshots without network access", async () => {
    const date = "2026-09-20";
    const rate: ExpenseExchangeRate = {
      source: "visa" as const,
      provider: "VISA",
      rateType: "visa",
      date,
      fetchedAt: "2026-09-20T00:00:00Z",
      baseCurrency: "TWD" as const,
      rateToBase: 32,
    };
    const dated: TripPayload = {
      ...payload,
      exchangeRateInfo: { source: "visa" },
      trip: {
        ...payload.trip,
        expenses: [
          { ...payload.trip.expenses[0], currency: "USD", exchangeRate: rate },
        ],
        settlementPayments: [
          {
            id: "p",
            fromId: "bob",
            toId: "alice",
            currency: "JPY",
            amountMinor: 10,
            paidAt: date,
            note: "",
            createdAt: rate.fetchedAt,
            exchangeRate: { ...rate, rateToBase: 0.2 },
          },
        ],
      },
    };
    const preview = await executeSettlementPreview(
      "-",
      Readable.from([JSON.stringify(dated)]),
    );
    expect(preview.balances.map((b) => [b.amountMinor, b.currency])).toEqual([
      [14, "TWD"],
      [-14, "TWD"],
    ]);
    expect(preview.settlements[0]).toMatchObject({
      amountMinor: 14,
      currency: "TWD",
    });
    const missing = {
      ...dated,
      trip: {
        ...dated.trip,
        expenses: dated.trip.expenses.map(
          ({ exchangeRate: _rate, ...expense }) => expense,
        ),
      },
    };
    await expect(
      executeSettlementPreview("-", Readable.from([JSON.stringify(missing)])),
    ).rejects.toMatchObject({
      code: "INPUT_ERROR",
      message: expect.stringContaining("Missing saved"),
    });
  });

  test("reads a payload from stdin without credentials or network", async () => {
    await expect(
      executeSettlementPreview("-", Readable.from([JSON.stringify(payload)])),
    ).resolves.toEqual({
      balances: payload.balances,
      settlements: payload.settlements,
    });
  });

  test("returns a structured input error for malformed payloads", async () => {
    await expect(
      executeSettlementPreview("-", Readable.from(["{}"])),
    ).rejects.toMatchObject({ code: "INPUT_ERROR" });
  });

  test("rejects unknown settlement representatives as structured input errors", async () => {
    const invalid = {
      ...payload,
      trip: {
        ...payload.trip,
        participants: [
          payload.trip.participants[0],
          { ...payload.trip.participants[1], settledById: "missing" },
        ],
      },
    };
    await expect(
      executeSettlementPreview("-", Readable.from([JSON.stringify(invalid)])),
    ).rejects.toMatchObject({ code: "INPUT_ERROR" });
  });

  test("rejects oversized stdin before parsing it", async () => {
    await expect(
      executeSettlementPreview("-", Readable.from(["123"]), 2),
    ).rejects.toMatchObject({
      code: "INPUT_ERROR",
      message: "Trip payload exceeds the 10 MiB limit",
    });
  });
});
