import assert from "node:assert/strict";
import test from "node:test";
import type { Trip } from "../shared/settlement.js";
import type { AppState } from "./client-support.js";
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

const state: AppState = {
  devAdmin: null,
  error: "",
  message: "",
  selected: { balances: [], settlements: [], trip },
  trips: [
    {
      baseCurrency: "TWD",
      expenseCount: 1,
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

test("dashboard view exposes stable accessibility markup", () => {
  const html = dashboardView(state);

  assert.match(html, /data-trip-id="trip_1" type="button" aria-pressed="true"/);
  assert.match(
    html,
    /data-trip-id="trip_2" type="button" aria-pressed="false"/,
  );
  assert.ok(html.includes('aria-label="重新命名 Alice"'));
  assert.ok(html.includes('aria-label="刪除 Charlie"'));
  assert.ok(
    html.includes(
      'aria-describedby="participant-delete-reason-participant_alice"',
    ),
  );
  assert.ok(
    html.includes(
      '<span id="participant-delete-reason-participant_alice" class="muted">已有支出</span>',
    ),
  );
  assert.ok(html.includes('aria-label="修改 Dinner &amp; Drinks 日期"'));
  assert.ok(html.includes('aria-label="刪除 Dinner &amp; Drinks"'));
});
