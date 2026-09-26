// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { afterEach, expect, test, vi } from "vitest";
import {
  changeExpense,
  getExpense,
  listExpenses,
  queueExpense,
  reviseExpense,
} from "./expense-queue.js";

const draft = {
  amount: "100",
  currency: "TWD" as const,
  description: "Dinner",
  expenseDate: "2026-09-26",
  paidById: "a",
  participantIds: ["a"],
  category: "餐飲",
  tags: "",
  splitMode: "equal" as const,
  splitValues: {},
};

afterEach(() => {
  vi.restoreAllMocks();
});

test("durable drafts are scoped per user and group; revision rotates only safe keys", async () => {
  const item = await queueExpense("alice", "trip", draft);
  expect((await listExpenses("alice", "trip")).map((e) => e.id)).toContain(
    item.id,
  );
  expect(await listExpenses("bob", "trip")).toEqual([]);
  expect(await listExpenses("alice", "other")).toEqual([]);
  expect(await reviseExpense(item, { ...draft, amount: "200" })).toBe(true);
  expect(await getExpense(item.id)).toBeUndefined();
  const [revised] = await listExpenses("alice", "trip");
  expect(revised.id).not.toBe(item.id);
  expect(revised.draft.amount).toBe("200");
  await changeExpense(revised.id, "alice", "trip", (current) => ({
    ...current,
    status: "attempted",
  }));
  expect(await reviseExpense(revised, draft)).toBe(false);
  expect((await getExpense(revised.id))?.draft.amount).toBe("200");
  expect(await changeExpense(revised.id, "bob", "trip", () => null)).toBe(
    false,
  );
  expect(await changeExpense(revised.id, "alice", "trip", () => null)).toBe(
    true,
  );
});

test("storage failure does not pretend an expense was saved", async () => {
  const original = globalThis.indexedDB;
  Object.defineProperty(globalThis, "indexedDB", {
    configurable: true,
    value: {
      open: () => {
        throw new DOMException("quota", "QuotaExceededError");
      },
    },
  });
  try {
    await expect(queueExpense("alice", "trip", draft)).rejects.toThrow();
  } finally {
    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      value: original,
    });
  }
});
