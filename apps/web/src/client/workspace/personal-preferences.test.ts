import type { Trip } from "@narumitw/otter-contracts";
import { expect, test } from "vitest";
import { newExpenseDraft } from "./expense-draft.js";
import {
  clearPreferences,
  defaultsPreference,
  type PreferenceStorage,
  preferenceKey,
  readPreferences,
  reconcilePreferences,
  writePreferences,
} from "./personal-preferences.js";

const trip: Trip = {
  id: "t",
  name: "Trip",
  ownerId: "owner",
  baseCurrency: "TWD",
  createdAt: "2026-10-01",
  participants: [
    { id: "a", name: "Alice" },
    { id: "b", name: "Bob" },
  ],
  expenses: [],
};
function memory(): PreferenceStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}
test("preferences isolate accounts and groups, validate versions and clear only their key", () => {
  const store = memory();
  expect(writePreferences("owner", "t", { participantId: "b" }, store)).toBe(
    true,
  );
  expect(readPreferences("owner", "t", store).preferences.participantId).toBe(
    "b",
  );
  expect(readPreferences("other", "t", store).preferences).toEqual({});
  expect(readPreferences("owner", "other", store).preferences).toEqual({});
  expect(preferenceKey("a:b", "c")).not.toBe(preferenceKey("a", "b:c"));
  store.setItem("offline-queue", "keep");
  expect(clearPreferences("owner", "t", store)).toBe(true);
  expect(store.getItem("offline-queue")).toBe("keep");
  for (const raw of [
    "bad json",
    "null",
    '{"version":2}',
    '{"version":1,"participantId":123}',
    '{"version":1,"defaults":{"currency":"BAD"}}',
  ]) {
    store.setItem(preferenceKey("owner", "t"), raw);
    expect(readPreferences("owner", "t", store)).toEqual({
      preferences: {},
      failed: true,
    });
  }
});
test("storage denial does not throw or claim persistence", () => {
  const fail = () => {
    throw new Error("Quota or denied");
  };
  const store = { getItem: fail, setItem: fail, removeItem: fail };
  expect(readPreferences("u", "t", store).failed).toBe(true);
  expect(writePreferences("u", "t", {}, store)).toBe(false);
  expect(clearPreferences("u", "t", store)).toBe(false);
});
test("removed or merged people invalidate identity and split without guessing by name", () => {
  const preferences = {
    participantId: "removed",
    defaults: {
      currency: "USD" as const,
      participantIds: ["a", "removed"],
      splitMode: "equal" as const,
      splitValues: {},
    },
  };
  expect(reconcilePreferences(preferences, trip)).toEqual({
    preferences: { participantId: undefined, defaults: undefined },
    changed: true,
  });
  const draft = newExpenseDraft(
    trip,
    reconcilePreferences(preferences, trip).preferences,
  );
  expect(draft.paidById).toBe("a");
  expect(draft.participantIds).toEqual(["a", "b"]);
  expect(draft.splitMode).toBe("equal");
});
test("defaults retain ratio, shares and exact values without storing expense contents", () => {
  for (const splitMode of ["amount", "ratio", "shares"] as const) {
    const draft = {
      ...newExpenseDraft(trip, {}),
      currency: "USD" as const,
      description: "Private meal",
      amount: "100",
      splitMode,
      splitValues: { a: "30", b: "70", extra: "999" },
    };
    const defaults = defaultsPreference(draft);
    expect(Object.keys(defaults).sort()).toEqual([
      "currency",
      "participantIds",
      "splitMode",
      "splitValues",
    ]);
    expect(defaults.splitValues).toEqual({ a: "30", b: "70" });
    const store = memory();
    writePreferences("u", "t", { participantId: "b", defaults }, store);
    const next = newExpenseDraft(
      trip,
      readPreferences("u", "t", store).preferences,
    );
    expect(next).toMatchObject({
      paidById: "b",
      currency: "USD",
      amount: "",
      splitMode,
      splitValues: { a: "30", b: "70" },
    });
  }
});
test("copy is a new whitelisted draft dated today and takes precedence over preferences", () => {
  const expense = {
    id: "old",
    version: 9,
    description: "Dinner",
    amountMinor: 1234,
    currency: "USD" as const,
    expenseDate: "2020-01-01",
    createdAt: "old",
    paidById: "a",
    participantIds: ["a", "b"],
    participantShares: [
      { participantId: "a", shareMinor: 500 },
      { participantId: "b", shareMinor: 734 },
    ],
    receiptId: "r",
    receiptUrl: "/secret",
    exchangeRate: {
      baseCurrency: "TWD" as const,
      rateToBase: 30,
      source: "fixed" as const,
    },
    tags: ["food"],
  };
  const before = structuredClone(expense);
  const copy = newExpenseDraft(trip, { participantId: "b" }, expense);
  expect(copy).toMatchObject({
    description: "Dinner",
    amount: "12.34",
    currency: "USD",
    paidById: "a",
    splitMode: "amount",
    splitValues: { a: "5", b: "7.34" },
  });
  expect(copy.expenseDate).not.toBe(expense.expenseDate);
  for (const key of [
    "id",
    "version",
    "createdAt",
    "receiptId",
    "receiptUrl",
    "exchangeRate",
    "visaExchangeRate",
  ])
    expect(copy).not.toHaveProperty(key);
  expect(expense).toEqual(before);
});
