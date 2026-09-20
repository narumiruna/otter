import { Readable } from "node:stream";
import type { TripPayload } from "@narumitw/otter-contracts";
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

  test("rejects oversized stdin before parsing it", async () => {
    await expect(
      executeSettlementPreview("-", Readable.from(["123"]), 2),
    ).rejects.toMatchObject({
      code: "INPUT_ERROR",
      message: "Trip payload exceeds the 10 MiB limit",
    });
  });
});
