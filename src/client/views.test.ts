import assert from "node:assert/strict";
import test from "node:test";
import type { Trip } from "../shared/settlement.js";
import {
  type AppState,
  type WorkspaceTab,
  workspaceTabs,
} from "./client-support.js";
import { dashboardView } from "./views.js";

const trip: Trip = {
  baseCurrency: "TWD",
  createdAt: "2026-06-25T00:00:00.000Z",
  expenses: [
    {
      amountMinor: 1200,
      createdAt: "2026-06-25T00:00:00.000Z",
      currency: "TWD",
      description: "Dinner & Drinks",
      expenseDate: "2026-06-25",
      id: "expense_1",
      paidById: "participant_alice",
      participantIds: ["participant_alice", "participant_bob"],
    },
    {
      amountMinor: 500,
      createdAt: "2026-06-26T00:00:00.000Z",
      currency: "TWD",
      description: "Breakfast",
      expenseDate: "2026-06-24",
      id: "expense_2",
      paidById: "participant_bob",
      participantIds: ["participant_alice", "participant_bob"],
    },
  ],
  id: "trip_1",
  name: "Tokyo",
  ownerId: "user_1",
  participants: [
    { id: "participant_alice", name: "Alice" },
    { id: "participant_bob", name: "Bob" },
    { id: "participant_charlie", name: "Charlie" },
  ],
};

const baseState: AppState = {
  activeTab: "overview",
  busy: false,
  devAdmin: null,
  error: "",
  message: "",
  selected: {
    balances: [
      {
        amountMinor: 600,
        currency: "TWD",
        name: "Alice",
        participantId: "participant_alice",
      },
    ],
    settlements: [
      {
        amountMinor: 600,
        currency: "TWD",
        fromId: "participant_bob",
        fromName: "Bob",
        toId: "participant_alice",
        toName: "Alice",
      },
    ],
    trip,
  },
  trips: [
    {
      baseCurrency: "TWD",
      expenseCount: 2,
      id: "trip_1",
      name: "Tokyo",
      participantCount: 3,
    },
    {
      baseCurrency: "USD",
      expenseCount: 0,
      id: "trip_2",
      name: "Seoul",
      participantCount: 1,
    },
  ],
  user: { email: "alice@example.com", id: "user_1", name: "Alice" },
};

function view(activeTab: WorkspaceTab): string {
  return dashboardView({ ...baseState, activeTab });
}

const emptyOnePersonTrip: Trip = {
  ...trip,
  expenses: [],
  participants: [{ id: "participant_alice", name: "Alice" }],
};

const emptyMultiPersonTrip: Trip = {
  ...trip,
  expenses: [],
};

function emptyTripView(activeTab: WorkspaceTab, selectedTrip: Trip): string {
  return dashboardView({
    ...baseState,
    activeTab,
    selected: {
      balances: [
        {
          amountMinor: 0,
          currency: "TWD",
          name: "Alice",
          participantId: "participant_alice",
        },
      ],
      settlements: [],
      trip: selectedTrip,
    },
    trips: [
      {
        baseCurrency: "TWD",
        expenseCount: 0,
        id: "trip_1",
        name: "Tokyo",
        participantCount: selectedTrip.participants.length,
      },
    ],
  });
}

function emptyOnePersonView(activeTab: WorkspaceTab): string {
  return emptyTripView(activeTab, emptyOnePersonTrip);
}

test("dashboard view exposes workspace tabs and overview panel", () => {
  const html = view("overview");

  assert.ok(html.includes('class="grid dashboard-grid"'));
  assert.ok(html.includes("<h2>支出群組</h2>"));
  assert.match(html, /data-trip-id="trip_1" type="button" aria-pressed="true"/);
  assert.match(
    html,
    /data-trip-id="trip_2" type="button" aria-pressed="false"/,
  );
  assert.ok(
    html.indexOf("Tokyo") < html.indexOf("<summary>新增支出群組</summary>"),
  );
  assert.deepEqual(
    [...workspaceTabs],
    ["add-expense", "overview", "expenses", "members", "settings"],
  );
  assert.ok(html.includes('data-workspace-tab="overview"'));
  assert.ok(html.includes('data-workspace-tab="add-expense"'));
  assert.ok(html.includes('data-workspace-tab="expenses"'));
  assert.ok(html.includes('data-workspace-tab="members"'));
  assert.ok(html.includes('data-workspace-tab="settings"'));
  assert.match(
    html,
    /data-workspace-tab="overview"[^>]+aria-selected="true"[^>]+tabindex="0"/,
  );
  assert.match(html, /data-workspace-tab="expenses"[^>]+tabindex="-1"/);
  assert.ok(html.includes('data-workspace-panel="overview"'));
  assert.ok(html.includes("最近支出"));
  assert.ok(html.indexOf("Dinner &amp; Drinks") < html.indexOf("Breakfast"));
});

test("workspace tabs render task-focused panels", () => {
  const addExpenseHtml = view("add-expense");
  assert.ok(addExpenseHtml.includes('data-workspace-panel="add-expense"'));
  assert.ok(addExpenseHtml.includes('id="expense-form"'));
  assert.ok(addExpenseHtml.includes('data-form-error-target="expense-form"'));
  assert.ok(addExpenseHtml.includes("novalidate"));

  const expensesHtml = view("expenses");
  assert.ok(expensesHtml.includes('data-workspace-panel="expenses"'));
  assert.ok(expensesHtml.includes('<details class="expense-actions">'));
  assert.ok(expensesHtml.includes("<summary>編輯</summary>"));
  assert.ok(
    expensesHtml.includes(
      'data-edit-expense-form="expense_1" data-form-error-target="expense-edit-expense_1" novalidate',
    ),
  );
  assert.ok(expensesHtml.includes('value="Dinner &amp; Drinks"'));
  assert.ok(expensesHtml.includes('name="participantIds"'));
  assert.ok(expensesHtml.includes('name="splitMode"'));
  assert.ok(expensesHtml.includes('value="amount"'));
  assert.ok(expensesHtml.includes('value="ratio"'));
  assert.ok(expensesHtml.includes('value="shares"'));
  assert.ok(expensesHtml.includes('name="splitValue:participant_alice"'));
  assert.ok(expensesHtml.includes('aria-label="Alice 分帳值"'));
  assert.ok(expensesHtml.includes("取消"));
  assert.ok(!expensesHtml.includes("data-edit-expense-date-id="));
  assert.ok(expensesHtml.includes('aria-label="刪除 Dinner &amp; Drinks"'));

  const membersHtml = view("members");
  assert.ok(membersHtml.includes('data-workspace-panel="members"'));
  assert.ok(membersHtml.includes('id="participant-form"'));
  assert.ok(membersHtml.includes('aria-label="重新命名 Alice"'));
  assert.ok(membersHtml.includes('aria-label="刪除 Charlie"'));
  assert.ok(
    membersHtml.includes(
      'aria-describedby="participant-delete-reason-participant_alice"',
    ),
  );

  const settingsHtml = view("settings");
  assert.ok(settingsHtml.includes('data-workspace-panel="settings"'));
  assert.ok(settingsHtml.includes('id="export-expenses"'));
  assert.ok(settingsHtml.includes('id="delete-trip"'));
});

test("empty one-person groups guide users to add members", () => {
  const addExpenseHtml = emptyOnePersonView("add-expense");
  assert.ok(addExpenseHtml.includes("先新增同行成員"));
  assert.match(
    addExpenseHtml,
    /<button[^>]*data-workspace-tab="members"[^>]*>去新增成員<\/button>/,
  );
  assert.ok(!addExpenseHtml.includes('id="expense-form"'));

  const overviewHtml = emptyOnePersonView("overview");
  assert.match(
    overviewHtml,
    /<button[^>]*data-workspace-tab="members"[^>]*>新增成員<\/button>/,
  );
  assert.doesNotMatch(
    overviewHtml,
    /<button[^>]*data-workspace-tab="add-expense"[^>]*>新增第一筆支出<\/button>/,
  );

  const expensesHtml = emptyOnePersonView("expenses");
  assert.ok(expensesHtml.includes("還沒有支出"));
  assert.match(
    expensesHtml,
    /<button[^>]*data-workspace-tab="members"[^>]*>新增成員<\/button>/,
  );
  assert.doesNotMatch(
    expensesHtml,
    /<button[^>]*data-workspace-tab="add-expense"[^>]*>新增第一筆支出<\/button>/,
  );
});

test("empty groups with multiple members can start first expense", () => {
  const overviewHtml = emptyTripView("overview", emptyMultiPersonTrip);
  assert.match(
    overviewHtml,
    /<button[^>]*data-workspace-tab="add-expense"[^>]*>新增第一筆支出<\/button>/,
  );
  assert.match(
    overviewHtml,
    /<button[^>]*data-workspace-tab="members"[^>]*>新增成員<\/button>/,
  );

  const addExpenseHtml = emptyTripView("add-expense", emptyMultiPersonTrip);
  assert.ok(addExpenseHtml.includes('name="expenseDate" type="date"'));
  assert.ok(addExpenseHtml.includes('name="splitMode"'));
  assert.ok(addExpenseHtml.includes('name="splitValue:participant_alice"'));
  assert.ok(addExpenseHtml.includes('value="participant_alice" checked'));
  assert.ok(addExpenseHtml.includes('value="participant_bob" checked'));

  const expensesHtml = emptyTripView("expenses", emptyMultiPersonTrip);
  assert.ok(expensesHtml.includes("還沒有支出"));
  assert.match(
    expensesHtml,
    /<button[^>]*data-workspace-tab="add-expense"[^>]*>新增第一筆支出<\/button>/,
  );
});

test("expense forms render nearby errors", () => {
  const createHtml = dashboardView({
    ...baseState,
    activeTab: "add-expense",
    formError: "請輸入支出金額",
    formErrorTarget: "expense-form",
  });
  assert.match(
    createHtml,
    /<p id="expense-form-error" class="form-error" role="alert">請輸入支出金額<\/p>/,
  );

  const editHtml = dashboardView({
    ...baseState,
    activeTab: "expenses",
    formError: "金額格式錯誤",
    formErrorTarget: "expense-edit-expense_1",
  });
  assert.match(editHtml, /<details class="expense-actions" open>/);
  assert.match(
    editHtml,
    /<p id="expense-edit-expense_1-error" class="form-error" role="alert">金額格式錯誤<\/p>/,
  );
});
