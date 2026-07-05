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
  assert.ok(view("add-expense").includes('data-workspace-panel="add-expense"'));
  assert.ok(view("add-expense").includes('id="expense-form"'));

  const expensesHtml = view("expenses");
  assert.ok(expensesHtml.includes('data-workspace-panel="expenses"'));
  assert.ok(expensesHtml.includes('<details class="expense-actions">'));
  assert.ok(expensesHtml.includes("<summary>更多操作</summary>"));
  assert.ok(
    expensesHtml.includes('aria-label="修改 Dinner &amp; Drinks 日期"'),
  );
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

  const expensesHtml = emptyTripView("expenses", emptyMultiPersonTrip);
  assert.ok(expensesHtml.includes("還沒有支出"));
  assert.match(
    expensesHtml,
    /<button[^>]*data-workspace-tab="add-expense"[^>]*>新增第一筆支出<\/button>/,
  );
});
