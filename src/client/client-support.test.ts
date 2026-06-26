import assert from "node:assert/strict";
import test from "node:test";
import type { Trip } from "../shared/settlement.js";
import {
  expenseSplitLabel,
  participantDeleteBlockReason,
  splitShortcutChecked,
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

test("split shortcut values map to checked states", () => {
  assert.equal(splitShortcutChecked("all"), true);
  assert.equal(splitShortcutChecked("none"), false);
  assert.equal(splitShortcutChecked(undefined), null);
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
