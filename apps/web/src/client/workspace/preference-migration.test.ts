import { expect, test, vi } from "vitest";
import { newExpenseDraft } from "./expense-draft.js";
import {
  preferenceKey,
  readPreferences,
  writePreferences,
} from "./personal-preferences.js";

const defaults = {
  currency: "USD",
  participantIds: ["b"],
  splitMode: "shares",
  splitValues: { b: "1" },
};
function storage(fail = false) {
  const raw = JSON.stringify({ version: 1, participantId: "b", defaults });
  const values = new Map([
    [preferenceKey("u", "t"), raw],
    [preferenceKey("other", "t"), raw],
    [preferenceKey("u", "other"), raw],
    ["queue", "keep"],
  ]);
  return {
    values,
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      if (fail) throw new Error("Quota");
      values.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
  };
}
test("loading removes only the current scope's identity and preserves split member IDs", () => {
  const store = storage();
  const before = new Map(store.values);
  expect(readPreferences("u", "t", store)).toEqual({
    preferences: { defaults },
    failed: false,
  });
  expect(JSON.parse(store.values.get(preferenceKey("u", "t")) ?? "")).toEqual({
    version: 1,
    defaults,
  });
  expect(store.getItem).toHaveBeenCalledExactlyOnceWith(
    preferenceKey("u", "t"),
  );
  expect(store.setItem).toHaveBeenCalledTimes(1);
  for (const key of [
    preferenceKey("other", "t"),
    preferenceKey("u", "other"),
    "queue",
  ])
    expect(store.values.get(key)).toBe(before.get(key));
  store.setItem.mockClear();
  readPreferences("u", "t", store);
  expect(store.setItem).not.toHaveBeenCalled();
});
test("failed migration retains valid defaults, ignores identity and does not throw", () => {
  const store = storage(true);
  const result = readPreferences("u", "t", store);
  expect(result).toEqual({ preferences: { defaults }, failed: true });
  const draft = newExpenseDraft(
    {
      id: "t",
      ownerId: "u",
      name: "Trip",
      baseCurrency: "TWD",
      createdAt: "now",
      expenses: [],
      participants: [
        { id: "a", name: "Alice" },
        { id: "b", name: "Bob" },
      ],
    },
    result.preferences,
  );
  expect(draft.paidById).toBe("a");
  expect(draft.currency).toBe("USD");
  expect(draft.participantIds).toEqual(["b"]);
  expect(store.setItem).toHaveBeenCalledTimes(1);
});
test("writes whitelist defaults and never persist legacy identity", () => {
  const store = storage();
  const legacy = {
    participantId: "b",
    defaults: {
      currency: "USD" as const,
      participantIds: ["b"],
      splitMode: "equal" as const,
      splitValues: {},
    },
  };
  writePreferences("u", "t", legacy, store);
  expect(JSON.parse(store.values.get(preferenceKey("u", "t")) ?? "")).toEqual({
    version: 1,
    defaults: legacy.defaults,
  });
});
