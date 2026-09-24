import type { TripPayload } from "@narumitw/otter-contracts";
import { expect, test } from "vitest";
import { balanceToolResult, settlementToolResult } from "./webmcp-tools.js";

const payload: TripPayload = {
  balances: [],
  settlements: [],
  shareLinks: [
    {
      id: "secret",
      mode: "readonly",
      createdAt: "now",
      revokedAt: null,
      expiresAt: null,
    },
  ],
  trip: {
    id: "trip_1",
    name: "Trip",
    ownerId: "user_1",
    baseCurrency: "TWD",
    participants: [],
    expenses: [
      {
        id: "secret-expense",
        description: "Never expose this expense",
        amountMinor: 100,
        currency: "TWD",
        expenseDate: "2026-09-23",
        paidById: "person_1",
        participantIds: ["person_1"],
        createdAt: "2026-09-23T00:00:00.000Z",
      },
    ],
    createdAt: "2026-09-23T00:00:00.000Z",
  },
};

test("only returns bounded balances with explicit currency and minor units", () => {
  const result = balanceToolResult({
    ...payload,
    balances: Array.from({ length: 12 }, (_, index) => ({
      name: `Person ${index} ${"x".repeat(100)}`,
      participantId: `person_${index}`,
      amountMinor: -123,
      currency: "TWD",
    })),
  });
  const data = JSON.parse(result);
  expect(data).toMatchObject({
    currency: "TWD",
    total: 12,
    truncated: true,
    unit: "minor",
  });
  expect(data.balances).toHaveLength(8);
  expect(data.balances[0]).toEqual({
    name: `Person 0 ${"x".repeat(39)}`,
    amountMinor: -123,
    currency: "TWD",
  });
  expect(result.length).toBeLessThan(1500);
  expect(result).not.toContain("secret");
  expect(result).not.toContain("expenses");
});

test("returns bounded settlements and empty results without full trip data", () => {
  const empty = JSON.parse(settlementToolResult(payload));
  expect(empty).toMatchObject({ settlements: [], total: 0, truncated: false });
  const result = settlementToolResult({
    ...payload,
    settlements: Array.from({ length: 10 }, (_, index) => ({
      fromId: `person_${index}`,
      fromName: `Debtor ${"x".repeat(100)}`,
      toId: "recipient",
      toName: `Creditor ${"y".repeat(100)}`,
      amountMinor: 100,
      currency: "TWD",
    })),
  });
  const data = JSON.parse(result);
  expect(data).toMatchObject({
    currency: "TWD",
    total: 10,
    truncated: true,
    unit: "minor",
  });
  expect(data.settlements).toHaveLength(8);
  expect(result.length).toBeLessThan(1500);
  expect(result).not.toContain("secret");
  expect(result).not.toContain("shareLinks");
});
