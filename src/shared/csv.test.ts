import assert from "node:assert/strict";
import test from "node:test";
import {
  parseExpenseImportCsv,
  tripExpensesCsv,
  tripResultsCsv,
} from "./csv.js";
import type { Trip } from "./settlement.js";

test("exports trip expenses as escaped CSV", () => {
  const trip: Trip = {
    baseCurrency: "TWD",
    createdAt: "2026-06-25T00:00:00.000Z",
    expenses: [
      {
        amountMinor: 12345,
        category: "餐飲",
        createdAt: "2026-06-25T00:00:00.000Z",
        currency: "USD",
        description: 'Dinner, "sushi"',
        expenseDate: "2026-06-24",
        id: "expense-1",
        paidById: "alice",
        participantIds: ["alice", "bob"],
        tags: ["food", "night"],
      },
    ],
    id: "trip-1",
    name: "Tokyo",
    ownerId: "user-1",
    participants: [
      { id: "alice", name: "Alice" },
      { id: "bob", name: "Bob, Jr" },
    ],
  };

  assert.equal(
    tripExpensesCsv(trip),
    [
      "date,description,amount,currency,paid_by,category,tags,split_participants",
      '2026-06-24,"Dinner, ""sushi""",123.45,USD,Alice,餐飲,food|night,"Alice; Bob, Jr"',
    ].join("\n"),
  );
});

test("exports explicit split shares in expense CSV", () => {
  const trip: Trip = {
    baseCurrency: "TWD",
    createdAt: "2026-06-25T00:00:00.000Z",
    expenses: [
      {
        amountMinor: 1000,
        createdAt: "2026-06-25T00:00:00.000Z",
        currency: "TWD",
        description: "Taxi",
        expenseDate: "2026-06-24",
        id: "expense-1",
        paidById: "alice",
        participantIds: ["alice", "bob"],
        participantShares: [
          { participantId: "alice", shareMinor: 700 },
          { participantId: "bob", shareMinor: 300 },
        ],
      },
    ],
    id: "trip-1",
    name: "Tokyo",
    ownerId: "user-1",
    participants: [
      { id: "alice", name: "Alice" },
      { id: "bob", name: "Bob" },
    ],
  };

  assert.equal(
    tripExpensesCsv(trip),
    [
      "date,description,amount,currency,paid_by,category,tags,split_participants",
      "2026-06-24,Taxi,1000,TWD,Alice,其他,,Alice=700; Bob=300",
    ].join("\n"),
  );
});

test("parses expense import CSV with quotes and newlines", () => {
  const csv = [
    "date,description,amount,currency,paid_by,category,tags,split_participants",
    '2026-06-24,"Dinner\nSushi",123.45,USD,Alice,餐飲,"food,night","Alice; Bob"',
  ].join("\n");

  assert.deepEqual(parseExpenseImportCsv(csv, ["Alice", "Bob"]), {
    errors: [],
    rows: [
      {
        amount: "123.45",
        category: "餐飲",
        currency: "USD",
        date: "2026-06-24",
        description: "Dinner\nSushi",
        paidBy: "Alice",
        rowNumber: 2,
        splitParticipants: ["Alice", "Bob"],
        tags: "food,night",
      },
    ],
  });
});

test("expense import CSV reports missing fields and unknown participants", () => {
  assert.deepEqual(parseExpenseImportCsv("date,amount\n2026-06-24,10").errors, [
    {
      message: "缺少欄位：description, currency, paid_by, split_participants",
      row: 1,
    },
  ]);
  assert.deepEqual(
    parseExpenseImportCsv(
      [
        "date,description,amount,currency,paid_by,split_participants",
        "bad,Dinner,abc,BTC,Alice,Alice; Missing",
      ].join("\n"),
      ["Alice"],
    ).errors.map(({ message, row }) => ({ message, row })),
    [
      { message: "日期格式必須是 YYYY-MM-DD", row: 2 },
      { message: "不支援的貨幣", row: 2 },
      { message: "找不到參與者：Missing", row: 2 },
    ],
  );
});

test("expense import CSV parses explicit unequal split cells", () => {
  assert.deepEqual(
    parseExpenseImportCsv(
      [
        "date,description,amount,currency,paid_by,split_participants",
        "2026-06-24,Taxi,100,TWD,Alice,Alice=70; Bob=30",
      ].join("\n"),
      ["Alice", "Bob"],
    ),
    {
      errors: [],
      rows: [
        {
          amount: "100",
          category: "",
          currency: "TWD",
          date: "2026-06-24",
          description: "Taxi",
          paidBy: "Alice",
          rowNumber: 2,
          splitParticipants: ["Alice", "Bob"],
          splitShares: [
            { amount: "70", name: "Alice" },
            { amount: "30", name: "Bob" },
          ],
          tags: "",
        },
      ],
    },
  );
});

test("expense import CSV rejects partial or mismatched explicit split cells", () => {
  assert.deepEqual(
    parseExpenseImportCsv(
      [
        "date,description,amount,currency,paid_by,split_participants",
        "2026-06-24,Taxi,100,TWD,Alice,Alice=70; Bob",
      ].join("\n"),
      ["Alice", "Bob"],
    ).errors.map(({ message, row }) => ({ message, row })),
    [
      { message: "不平均分帳需每位成員都有金額", row: 2 },
      { message: "分帳金額加總必須等於支出金額", row: 2 },
    ],
  );
});

test("exports balances and settlements as escaped CSV", () => {
  assert.equal(
    tripResultsCsv(
      [
        {
          amountMinor: 100,
          currency: "TWD",
          name: "Alice, A",
          participantId: "alice",
        },
        {
          amountMinor: -100,
          currency: "TWD",
          name: 'Bob "B"',
          participantId: "bob",
        },
      ],
      [
        {
          amountMinor: 100,
          currency: "TWD",
          fromId: "bob",
          fromName: 'Bob "B"',
          toId: "alice",
          toName: "Alice, A",
        },
      ],
      [
        {
          amountMinor: 100,
          createdAt: "2026-06-25T00:00:00.000Z",
          currency: "TWD",
          fromId: "bob",
          id: "payment-1",
          note: "paid cash",
          paidAt: "2026-06-25",
          toId: "alice",
        },
      ],
      [
        { id: "alice", name: "Alice, A" },
        { id: "bob", name: 'Bob "B"' },
      ],
    ),
    [
      "type,participant,from,to,amount,currency,note",
      'balance,"Alice, A",,,100,TWD,',
      'balance,"Bob ""B""",,,-100,TWD,',
      'settlement,,"Bob ""B""","Alice, A",100,TWD,',
      'payment,,"Bob ""B""","Alice, A",100,TWD,paid cash',
    ].join("\n"),
  );
});
