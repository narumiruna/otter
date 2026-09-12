// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import {
  calculateBalances,
  calculateSettlements,
  type Trip,
} from "../../shared/settlement.js";
import type { TripPayload } from "../client-support.js";
import { OverviewPage } from "./overview-page.js";
import { OverviewSummary } from "./overview-summary.js";
import { BalanceList } from "./workspace-ui.js";

const trip: Trip = {
  baseCurrency: "TWD",
  createdAt: "2026-09-12T00:00:00.000Z",
  exchangeRates: { JPY: 0.2, TWD: 1 },
  expenses: [
    {
      amountMinor: 1000,
      createdAt: "2026-09-12T00:00:00.000Z",
      currency: "JPY",
      description: "午餐",
      expenseDate: "2026-09-12",
      id: "lunch",
      paidById: "alice",
      participantIds: ["alice", "bob"],
    },
    {
      amountMinor: 100,
      createdAt: "2026-09-12T00:00:00.000Z",
      currency: "TWD",
      description: "車票",
      expenseDate: "2026-09-12",
      id: "tickets",
      paidById: "alice",
      participantIds: ["alice", "bob"],
    },
  ],
  id: "weekend",
  name: "週末旅行",
  ownerId: "owner",
  participants: [
    { id: "alice", name: "Alice" },
    { id: "bob", name: "Bob" },
  ],
  settlementPayments: [
    {
      amountMinor: 50,
      createdAt: "2026-09-12T00:00:00.000Z",
      currency: "TWD",
      fromId: "bob",
      id: "payment",
      note: "",
      paidAt: "2026-09-12",
      toId: "alice",
    },
  ],
};

function payloadFor(value: Trip): TripPayload {
  return {
    balances: calculateBalances(value),
    settlements: calculateSettlements(value),
    trip: value,
  };
}

test("summary converts expenses to base currency and accounts for recorded payments", () => {
  render(<OverviewSummary payload={payloadFor(trip)} />);
  const summary = screen.getByRole("region", { name: "群組帳目摘要" });
  expect(within(summary).getByText("$300")).toBeVisible();
  expect(within(summary).getByText("$100")).toBeVisible();
  expect(within(summary).getByText("TWD · 已換算為基準貨幣")).toBeVisible();
  expect(within(summary).getByText("1 筆建議付款，讓帳目歸零")).toBeVisible();
  expect(within(summary).getByText("2 位成員一起分帳")).toBeVisible();
});

test("empty overview shows zero summaries and a working first-expense action", async () => {
  const onAddExpense = vi.fn();
  const empty = { ...trip, expenses: [], settlementPayments: [] };
  render(
    <OverviewPage payload={payloadFor(empty)} onAddExpense={onAddExpense} />,
  );
  expect(screen.getAllByText("$0")).toHaveLength(4);
  expect(screen.getByText("記帳後自動計算結清建議")).toBeVisible();
  await userEvent.setup().click(screen.getByRole("button", { name: "記一筆" }));
  expect(onAddExpense).toHaveBeenCalledOnce();
});

test("read-only overview keeps results but omits payment controls", () => {
  render(<OverviewPage payload={payloadFor(trip)} readonly />);
  expect(screen.getByRole("region", { name: "待結清" })).toBeVisible();
  expect(screen.getByRole("region", { name: "最近支出" })).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "記錄付款" }),
  ).not.toBeInTheDocument();
});

test("balances distinguish settled, receivable, and payable values with text", () => {
  render(
    <BalanceList
      balances={[
        {
          amountMinor: 0,
          currency: "TWD",
          name: "Alice",
          participantId: "alice",
        },
        {
          amountMinor: 100,
          currency: "TWD",
          name: "Bob",
          participantId: "bob",
        },
        {
          amountMinor: -100,
          currency: "TWD",
          name: "Chris",
          participantId: "chris",
        },
      ]}
    />,
  );
  const rows = screen.getAllByRole("listitem");
  expect(rows[0]).toHaveTextContent("已打平$0");
  expect(rows[0]).not.toHaveTextContent("應收");
  expect(rows[1]).toHaveTextContent("應收$100");
  expect(rows[2]).toHaveTextContent("應付$100");
});
