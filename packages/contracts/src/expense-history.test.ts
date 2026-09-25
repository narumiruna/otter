import { expect, test } from "vitest";
import {
  changedExpenseFields,
  type ExpenseHistoryPage,
  type ExpenseSnapshot,
  expenseIfMatch,
  isExpenseSnapshot,
  parseExpenseHistoryPage,
  parseExpenseIfMatch,
} from "./expense-history.js";
import { parseTripPayload, parseVersionedTripPayload } from "./index.js";

const snapshot: ExpenseSnapshot = {
  schemaVersion: 1,
  expense: {
    id: "e",
    description: "Dinner",
    amountMinor: 101,
    currency: "TWD",
    category: "餐飲",
    tags: [],
    paidById: "a",
    participantIds: ["a", "b"],
    expenseDate: "2026-09-21",
    createdAt: "2026-09-21T00:00:00Z",
  },
  participants: [
    { id: "a", name: "Alice" },
    { id: "b", name: "Bob" },
  ],
  receipt: null,
};
test("versions must be explicit positive safe integers and strong single If-Match values", () => {
  expect(expenseIfMatch(2)).toBe('"2"');
  expect(parseExpenseIfMatch('"2"')).toBe(2);
  expect(parseExpenseIfMatch(undefined)).toBeUndefined();
  for (const bad of [
    undefined,
    0,
    -1,
    1.2,
    Number.MAX_SAFE_INTEGER + 1,
    Number.NaN,
  ])
    expect(() => expenseIfMatch(bad)).toThrow();
  for (const bad of [
    "*",
    "2",
    '"0"',
    '"01"',
    'W/"1"',
    '"1", "2"',
    '"9007199254740992"',
  ])
    expect(() => parseExpenseIfMatch(bad)).toThrow();
});
test("snapshots validate money, ordered splits, people, schema and receipts", () => {
  expect(isExpenseSnapshot(snapshot)).toBe(true);
  for (const bad of [
    { ...snapshot, schemaVersion: 2 },
    { ...snapshot, receipt: { id: "r", mimeType: "text/html" } },
    { ...snapshot, participants: [] },
    { ...snapshot, expense: { ...snapshot.expense, amountMinor: 1.1 } },
    {
      ...snapshot,
      expense: { ...snapshot.expense, participantIds: ["a", "a"] },
    },
    {
      ...snapshot,
      expense: { ...snapshot.expense, expenseDate: "2026-02-30" },
    },
    {
      ...snapshot,
      expense: {
        ...snapshot.expense,
        participantShares: [{ participantId: "a", shareMinor: 100 }],
      },
    },
  ])
    expect(isExpenseSnapshot(bad)).toBe(false);
  expect(
    isExpenseSnapshot({
      ...snapshot,
      expense: {
        ...snapshot.expense,
        participantShares: [
          { participantId: "a", shareMinor: 60 },
          { participantId: "b", shareMinor: 41 },
        ],
      },
    }),
  ).toBe(true);
});
test("history diffs do not treat display name changes as expense edits", () => {
  expect(
    changedExpenseFields(snapshot, {
      ...snapshot,
      participants: [{ id: "a", name: "Renamed" }],
    }),
  ).toEqual([]);
  expect(
    changedExpenseFields(snapshot, {
      ...snapshot,
      expense: {
        ...snapshot.expense,
        amountMinor: 200,
        participantIds: ["b", "a"],
      },
    }),
  ).toEqual(["amountMinor", "participantIds"]);
});
test("history payload guards reject malformed versions and previous snapshots", () => {
  const page: ExpenseHistoryPage = {
    revisions: [
      {
        id: "r",
        expenseId: "e",
        version: 1,
        action: "created",
        source: "expense",
        actor: { id: "u", name: "User" },
        recordedAt: "2026-09-21T00:00:00Z",
        snapshot,
        previousSnapshot: null,
        changedFields: [],
      },
    ],
    nextCursor: null,
  };
  expect(parseExpenseHistoryPage(page)).toEqual(page);
  expect(
    parseExpenseHistoryPage({
      ...page,
      latestRevision: { version: 3, action: "deleted" },
    }).latestRevision,
  ).toEqual({ version: 3, action: "deleted" });
  for (const latestRevision of [
    { version: 0, action: "deleted" },
    { version: 3, action: "unknown" },
    {},
  ])
    expect(() =>
      parseExpenseHistoryPage({ ...page, latestRevision }),
    ).toThrow();
  expect(
    parseExpenseHistoryPage({
      ...page,
      revisions: [
        {
          ...page.revisions[0],
          version: 4,
          action: "restored",
          source: "version_restore",
        },
      ],
    }).revisions[0],
  ).toMatchObject({
    version: 4,
    action: "restored",
    source: "version_restore",
  });
  for (const patch of [
    { version: 0 },
    { version: 1.2 },
    { source: "unknown" },
    { previousSnapshot: {} },
    { actor: { id: "u" } },
    { changedFields: ["unknown"] },
  ])
    expect(() =>
      parseExpenseHistoryPage({
        ...page,
        revisions: [{ ...page.revisions[0], ...patch }],
      }),
    ).toThrow();
});
test("offline legacy payloads remain readable but never become versioned write payloads", () => {
  const payload = {
    trip: {
      id: "t",
      ownerId: "u",
      name: "Trip",
      baseCurrency: "TWD",
      createdAt: "2026-09-21T00:00:00Z",
      participants: snapshot.participants,
      expenses: [snapshot.expense],
    },
    balances: [],
    settlements: [],
  };
  expect(parseTripPayload(payload).trip.expenses[0].version).toBeUndefined();
  expect(() => parseVersionedTripPayload(payload)).toThrow();
  expect(
    parseVersionedTripPayload({
      ...payload,
      trip: {
        ...payload.trip,
        expenses: [{ ...snapshot.expense, version: 1 }],
      },
    }).trip.expenses[0].version,
  ).toBe(1);
});
