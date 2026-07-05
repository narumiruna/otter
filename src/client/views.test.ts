import assert from "node:assert/strict";
import test from "node:test";
import type { Trip } from "../shared/settlement.js";
import {
  type AppState,
  defaultExpenseFilters,
  type WorkspaceTab,
  workspaceTabs,
} from "./client-support.js";
import { authView, dashboardView, readonlyShareView } from "./views.js";

const trip: Trip = {
  baseCurrency: "TWD",
  createdAt: "2026-06-25T00:00:00.000Z",
  expenses: [
    {
      amountMinor: 1200,
      category: "餐飲",
      createdAt: "2026-06-25T00:00:00.000Z",
      currency: "TWD",
      description: "Dinner & Drinks",
      expenseDate: "2026-06-25",
      id: "expense_1",
      paidById: "participant_alice",
      participantIds: ["participant_alice", "participant_bob"],
      tags: ["dinner", "team"],
    },
    {
      amountMinor: 500,
      category: "餐飲",
      createdAt: "2026-06-26T00:00:00.000Z",
      currency: "TWD",
      description: "Breakfast",
      expenseDate: "2026-06-24",
      id: "expense_2",
      paidById: "participant_bob",
      participantIds: ["participant_alice", "participant_bob"],
      tags: ["breakfast"],
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
  settlementPayments: [
    {
      amountMinor: 100,
      createdAt: "2026-06-26T00:00:00.000Z",
      currency: "TWD",
      fromId: "participant_bob",
      id: "payment_1",
      note: "cash",
      paidAt: "2026-06-26",
      toId: "participant_alice",
    },
  ],
};

const baseState: AppState = {
  activeTab: "overview",
  busy: false,
  csvImportErrors: [],
  error: "",
  expenseFilters: { ...defaultExpenseFilters },
  focusTarget: "",
  message: "",
  offline: false,
  pendingAction: "",
  readonlyShare: false,
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
  archivedTrips: [
    {
      archivedAt: "2026-06-27T00:00:00.000Z",
      baseCurrency: "EUR",
      expenseCount: 3,
      id: "trip_archived",
      name: "Archived Trip",
      participantCount: 2,
    },
  ],
  trips: [
    {
      archivedAt: null,
      baseCurrency: "TWD",
      expenseCount: 2,
      id: "trip_1",
      name: "Tokyo",
      participantCount: 3,
    },
    {
      archivedAt: null,
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
    archivedTrips: [],
    trips: [
      {
        archivedAt: null,
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

test("auth view shows helper text and nearby errors", () => {
  const html = authView({
    ...baseState,
    formError: "密碼至少需要 8 個字",
    formErrorTarget: "register-form",
    selected: null,
    user: null,
  });

  assert.ok(html.includes("密碼至少 8 個字"));
  assert.ok(html.includes('aria-describedby="register-password-help"'));
  assert.ok(html.includes('id="register-form-error"'));
  assert.ok(html.includes('data-busy-action="login"'));
  assert.ok(html.includes('data-busy-action="register"'));
});

test("dashboard view exposes workspace tabs and overview panel", () => {
  const html = view("overview");

  assert.ok(html.includes('class="grid dashboard-grid"'));
  assert.ok(html.includes("<h2>支出群組</h2>"));
  assert.match(html, /data-trip-id="trip_1"[^>]+aria-pressed="true"/);
  assert.match(html, /data-trip-id="trip_2"[^>]+aria-pressed="false"/);
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
  assert.ok(html.includes("已封存支出群組"));
  assert.ok(html.includes("Archived Trip"));
  assert.match(
    html,
    /data-workspace-tab="overview"[^>]+aria-selected="true"[^>]+tabindex="0"/,
  );
  assert.match(html, /data-workspace-tab="expenses"[^>]+tabindex="-1"/);
  assert.ok(html.includes('data-workspace-panel="overview"'));
  assert.ok(html.includes("花費圖表"));
  assert.ok(html.includes("總支出"));
  assert.ok(html.includes("每日花費"));
  assert.ok(html.includes("每人實付"));
  assert.ok(html.includes("分類占比"));
  assert.ok(html.includes('<span class="chart-label">餐飲</span>'));
  assert.ok(html.includes("最近支出"));
  assert.ok(html.includes("標記已付款"));
  assert.ok(html.includes('class="settlement-summary"'));
  assert.ok(html.includes('name="paidAt" type="date"'));
  assert.ok(html.includes("付款紀錄"));
  assert.ok(html.includes('data-delete-settlement-payment-form="payment_1"'));
  assert.ok(html.indexOf("Dinner &amp; Drinks") < html.indexOf("Breakfast"));
});

test("spending charts render zero amounts without a visible bar", () => {
  const zeroTrip: Trip = {
    ...trip,
    baseCurrency: "TWD",
    expenses: [
      {
        amountMinor: 1,
        category: "交通",
        createdAt: "2026-06-25T00:00:00.000Z",
        currency: "JPY",
        description: "Tiny fare",
        expenseDate: "2026-06-25",
        id: "expense_zero",
        paidById: "participant_alice",
        participantIds: ["participant_alice"],
        tags: [],
      },
    ],
  };
  const selected = baseState.selected;
  assert.ok(selected);
  const html = dashboardView({
    ...baseState,
    activeTab: "overview",
    selected: { ...selected, trip: zeroTrip },
  });

  assert.ok(html.includes('style="width: 0%"'));
  assert.ok(!html.includes('style="width: 4%"'));
});

test("workspace tabs render task-focused panels", () => {
  const addExpenseHtml = view("add-expense");
  assert.ok(addExpenseHtml.includes('data-workspace-panel="add-expense"'));
  assert.ok(addExpenseHtml.includes('id="expense-form"'));
  assert.ok(addExpenseHtml.includes('data-form-error-target="expense-form"'));
  assert.ok(addExpenseHtml.includes("novalidate"));

  const expensesHtml = view("expenses");
  assert.ok(expensesHtml.includes('data-workspace-panel="expenses"'));
  assert.ok(expensesHtml.includes('id="expense-filters"'));
  assert.ok(expensesHtml.includes('name="query"'));
  assert.ok(expensesHtml.includes('name="paidById"'));
  assert.ok(expensesHtml.includes('name="category"'));
  assert.ok(expensesHtml.includes('name="tag"'));
  assert.ok(expensesHtml.includes("data-clear-expense-filters"));
  assert.ok(expensesHtml.includes("顯示 2 / 2 筆支出"));
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
  assert.ok(expensesHtml.includes('name="tags"'));
  assert.ok(expensesHtml.includes("餐飲 · dinner、team"));
  assert.ok(expensesHtml.includes('value="amount"'));
  assert.ok(expensesHtml.includes('value="ratio"'));
  assert.ok(expensesHtml.includes('value="shares"'));
  assert.ok(expensesHtml.includes('name="splitValue:participant_alice"'));
  assert.ok(expensesHtml.includes('aria-label="Alice 分帳值"'));
  assert.ok(expensesHtml.includes("取消"));
  assert.ok(!expensesHtml.includes("data-edit-expense-date-id="));
  assert.ok(expensesHtml.includes('aria-label="確認刪除 Dinner &amp; Drinks"'));
  assert.ok(
    expensesHtml.includes('data-receipt-upload-expense-id="expense_1"'),
  );
  assert.ok(expensesHtml.includes('accept="image/jpeg,image/png,image/webp"'));
  assert.ok(expensesHtml.includes("尚未上傳收據"));

  const membersHtml = view("members");
  assert.ok(membersHtml.includes('data-workspace-panel="members"'));
  assert.ok(membersHtml.includes('id="participant-form"'));
  assert.ok(membersHtml.includes('id="participant-merge-form"'));
  assert.ok(membersHtml.includes('name="sourceParticipantId"'));
  assert.ok(membersHtml.includes('name="targetParticipantId"'));
  assert.ok(
    membersHtml.includes('data-rename-participant-form="participant_alice"'),
  );
  assert.ok(membersHtml.includes('aria-label="確認刪除 Charlie"'));
  assert.ok(membersHtml.includes('name="confirmMerge"'));
  assert.ok(
    membersHtml.includes(
      'aria-describedby="participant-delete-reason-participant_alice"',
    ),
  );

  const settingsHtml = view("settings");
  assert.ok(settingsHtml.includes('data-workspace-panel="settings"'));
  assert.ok(settingsHtml.includes('id="export-expenses"'));
  assert.ok(settingsHtml.includes('id="download-backup"'));
  assert.ok(settingsHtml.includes('id="restore-backup-form"'));
  assert.ok(settingsHtml.includes('id="csv-import-form"'));
  assert.ok(settingsHtml.includes('id="create-share-link"'));
  assert.ok(settingsHtml.includes('id="collaborator-form"'));
  assert.ok(settingsHtml.includes('id="archive-trip"'));
  assert.ok(settingsHtml.includes('id="trip-rename-form"'));
  assert.ok(settingsHtml.includes('id="trip-base-currency-form"'));
  assert.ok(settingsHtml.includes("封存支出群組"));
  assert.ok(settingsHtml.includes('id="exchange-rates-form"'));
  assert.ok(settingsHtml.includes('name="rate:USD"'));
  assert.ok(settingsHtml.includes("套用於整趟旅行目前計算"));
  assert.ok(settingsHtml.includes('id="delete-trip"'));
});

test("restore backup form is reachable without a selected trip", () => {
  const html = dashboardView({
    ...baseState,
    selected: null,
    trips: [],
    archivedTrips: [],
  });

  assert.ok(html.includes('id="restore-backup-form"'));
  assert.ok(html.includes('id="restore-backup-file"'));
});

test("exchange-rates form is hidden for archived trips", () => {
  const archivedTrip: Trip = {
    ...trip,
    archivedAt: "2026-06-27T00:00:00.000Z",
  };
  const archivedState: AppState = {
    ...baseState,
    selected: {
      // biome-ignore lint/style/noNonNullAssertion: baseState.selected is always set in test data
      ...baseState.selected!,
      trip: archivedTrip,
    },
  };
  const settingsHtml = dashboardView({
    ...archivedState,
    activeTab: "settings",
  });
  assert.ok(!settingsHtml.includes('id="exchange-rates-form"'));
});

test("expense metadata escapes tags", () => {
  const expense = trip.expenses[0];
  assert.ok(expense);
  const selected = baseState.selected;
  assert.ok(selected);
  const unsafeTrip: Trip = {
    ...trip,
    expenses: [
      {
        ...expense,
        tags: ["<svg/onload=alert(1)>"],
      },
    ],
  };
  const html = dashboardView({
    ...baseState,
    activeTab: "expenses",
    selected: { ...selected, trip: unsafeTrip },
  });

  assert.ok(html.includes("&lt;svg/onload=alert(1)&gt;"));
  assert.ok(!html.includes("<svg/onload=alert(1)>"));
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

  const membersHtml = emptyOnePersonView("members");
  assert.ok(!membersHtml.includes('id="participant-merge-form"'));

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

test("expense filters show empty result state", () => {
  const html = dashboardView({
    ...baseState,
    activeTab: "expenses",
    expenseFilters: { ...defaultExpenseFilters, query: "missing" },
  });

  assert.ok(html.includes("沒有符合條件的支出"));
  assert.ok(html.includes("data-clear-expense-filters"));
});

test("readonly share view hides mutation controls", () => {
  const selected = baseState.selected;
  assert.ok(selected);
  const html = readonlyShareView(selected);

  assert.ok(html.includes("唯讀分享"));
  assert.ok(html.includes("支出紀錄"));
  assert.ok(html.includes("Dinner &amp; Drinks"));
  assert.ok(!html.includes("data-delete-expense-form"));
  assert.ok(!html.includes("data-receipt-upload-expense-id"));
  assert.ok(!html.includes("標記已付款"));
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
    /<p id="expense-form-error" class="form-error" role="alert" tabindex="-1">請輸入支出金額<\/p>/,
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
    /<p id="expense-edit-expense_1-error" class="form-error" role="alert" tabindex="-1">金額格式錯誤<\/p>/,
  );
});
