import assert from "node:assert/strict";
import test from "node:test";
import type { Trip } from "../shared/settlement.js";
import {
  api,
  defaultExpenseFilters,
  defaultExpenseFormValues,
  expenseFormError,
  expenseSplitLabel,
  filterAndSortExpenses,
  participantDeleteBlockReason,
  splitCountLabel,
  splitSelectionError,
  splitShortcutChecked,
  todayDate,
  workspaceTabForKey,
} from "./client-support.js";

const baseTrip: Trip = {
  baseCurrency: "TWD",
  createdAt: "2026-06-25T00:00:00.000Z",
  expenses: [],
  id: "trip-1",
  name: "Tokyo",
  ownerId: "user-1",
  participants: [
    { id: "alice", name: "Alice" },
    { id: "bob", name: "Bob" },
  ],
};

test("api keeps server JSON error messages", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: "伺服器錯誤" }), { status: 500 });

  try {
    await assert.rejects(api("/api/fail"), /伺服器錯誤/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("api falls back when failed response is not JSON", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("bad gateway", { status: 502 });

  try {
    await assert.rejects(api("/api/fail"), /Request failed/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("api reports connection failures with a stable message", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new TypeError("fetch failed");
  };

  try {
    await assert.rejects(api("/api/fail"), /連線失敗，請稍後再試/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("api rejects successful non-JSON responses", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("ok", { status: 200 });

  try {
    await assert.rejects(api("/api/weird"), /伺服器回應格式錯誤/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("split count label formats selected and total counts", () => {
  assert.equal(splitCountLabel(2, 5), "已選 2 / 5");
});

test("split selection validation catches empty choices", () => {
  assert.equal(splitSelectionError([]), "請至少選擇一位分帳參與者");
  assert.equal(splitSelectionError(["alice"]), null);
});

test("expense form defaults use the trip context", () => {
  assert.deepEqual(defaultExpenseFormValues(baseTrip), {
    currency: "TWD",
    expenseDate: todayDate(),
    paidById: "alice",
    participantIds: ["alice", "bob"],
  });
  assert.deepEqual(
    defaultExpenseFormValues({ ...baseTrip, participants: [] }),
    {
      currency: "TWD",
      expenseDate: todayDate(),
      paidById: "",
      participantIds: [],
    },
  );
});

test("expense form validation returns field-level messages", () => {
  assert.equal(
    expenseFormError({ amount: "", participantIds: ["alice"] }),
    "請輸入支出金額",
  );
  assert.equal(
    expenseFormError({ amount: "100", participantIds: [] }),
    "請至少選擇一位分帳參與者",
  );
  assert.equal(
    expenseFormError({ amount: "100", participantIds: ["alice"] }),
    null,
  );
});

test("split shortcut values map to checked states", () => {
  assert.equal(splitShortcutChecked("all"), true);
  assert.equal(splitShortcutChecked("none"), false);
  assert.equal(splitShortcutChecked(undefined), null);
});

test("workspace tab keyboard navigation follows ARIA tab keys", () => {
  assert.equal(workspaceTabForKey("overview", "ArrowRight"), "expenses");
  assert.equal(workspaceTabForKey("overview", "ArrowLeft"), "add-expense");
  assert.equal(workspaceTabForKey("settings", "ArrowRight"), "add-expense");
  assert.equal(workspaceTabForKey("add-expense", "ArrowLeft"), "settings");
  assert.equal(workspaceTabForKey("expenses", "Home"), "add-expense");
  assert.equal(workspaceTabForKey("expenses", "End"), "settings");
  assert.equal(workspaceTabForKey("expenses", "Enter"), null);
});

test("filters and sorts expenses", () => {
  const trip: Trip = {
    ...baseTrip,
    expenses: [
      {
        amountMinor: 100,
        createdAt: "2026-06-25T00:00:00.000Z",
        currency: "TWD",
        description: "Dinner",
        expenseDate: "2026-06-25",
        id: "expense-1",
        paidById: "alice",
        participantIds: ["alice", "bob"],
      },
      {
        amountMinor: 500,
        createdAt: "2026-06-24T00:00:00.000Z",
        currency: "JPY",
        description: "Train",
        expenseDate: "2026-06-24",
        id: "expense-2",
        paidById: "bob",
        participantIds: ["bob"],
      },
    ],
  };

  assert.deepEqual(
    filterAndSortExpenses(trip, {
      ...defaultExpenseFilters,
      participantId: "bob",
      query: "tr",
    }).map(({ id }) => id),
    ["expense-2"],
  );
  assert.deepEqual(
    filterAndSortExpenses(trip, {
      ...defaultExpenseFilters,
      currency: "TWD",
      dateFrom: "2026-06-25",
      paidById: "alice",
    }).map(({ id }) => id),
    ["expense-1"],
  );
  assert.deepEqual(
    filterAndSortExpenses(trip, {
      ...defaultExpenseFilters,
      sort: "date-asc",
    }).map(({ id }) => id),
    ["expense-2", "expense-1"],
  );
});

test("expense split labels summarize all-person splits", () => {
  assert.equal(expenseSplitLabel(baseTrip, ["alice", "bob"]), "所有人");
  assert.equal(expenseSplitLabel(baseTrip, ["bob"]), "Bob");
  assert.equal(
    expenseSplitLabel(baseTrip, ["alice", "missing"]),
    "Alice、未知",
  );
});

test("participant delete affordance explains blocked deletes", () => {
  assert.equal(participantDeleteBlockReason(baseTrip, "bob"), null);

  assert.equal(
    participantDeleteBlockReason(
      { ...baseTrip, participants: [{ id: "alice", name: "Alice" }] },
      "alice",
    ),
    "至少需要一位參與者",
  );

  assert.equal(
    participantDeleteBlockReason(
      {
        ...baseTrip,
        expenses: [
          {
            amountMinor: 100,
            createdAt: "2026-06-25T00:00:00.000Z",
            currency: "TWD",
            description: "Dinner",
            expenseDate: "2026-06-25",
            id: "expense-1",
            paidById: "alice",
            participantIds: ["alice", "bob"],
          },
        ],
      },
      "bob",
    ),
    "已有支出",
  );
});
