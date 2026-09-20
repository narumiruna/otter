// @vitest-environment jsdom

import {
  calculateBalances,
  calculateSettlements,
  type Trip,
} from "@narumitw/otter-core/settlement";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import type { TripPayload } from "../client-support.js";
import { I18nProvider } from "../i18n.js";
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

test("empty overview prioritizes the first expense without premature settlement results", async () => {
  const onAddExpense = vi.fn();
  const empty = { ...trip, expenses: [], settlementPayments: [] };
  render(
    <OverviewPage payload={payloadFor(empty)} onAddExpense={onAddExpense} />,
  );
  expect(screen.getByText("還沒有支出")).toBeVisible();
  expect(
    screen.getByRole("heading", { name: "記錄第一筆共同支出" }),
  ).toBeVisible();
  expect(
    screen.queryByRole("region", { name: "群組帳目摘要" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("region", { name: "每人餘額" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("region", { name: "最近支出" }),
  ).not.toBeInTheDocument();
  expect(screen.queryByText("目前已經打平")).not.toBeInTheDocument();
  expect(screen.queryByText("$0")).not.toBeInTheDocument();
  await userEvent.setup().click(screen.getByRole("button", { name: "記一筆" }));
  expect(onAddExpense).toHaveBeenCalledOnce();
});

test.each([0, 1])(
  "empty overview with %i people prioritizes adding companions",
  async (count) => {
    const onPeople = vi.fn();
    const empty = {
      ...trip,
      expenses: [],
      settlementPayments: [],
      participants: trip.participants.slice(0, count),
    };
    render(<OverviewPage payload={payloadFor(empty)} onPeople={onPeople} />);
    expect(
      screen.getByRole("heading", { name: "先新增同行成員" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "記一筆" }),
    ).not.toBeInTheDocument();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "新增成員" }));
    expect(onPeople).toHaveBeenCalledOnce();
  },
);

test("read-only empty overview explains missing data without actions or settled status", () => {
  render(
    <OverviewPage
      payload={payloadFor({ ...trip, expenses: [], settlementPayments: [] })}
      readonly
    />,
  );
  expect(screen.getByRole("heading", { name: "還沒有支出" })).toBeVisible();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.queryByText("目前已經打平")).not.toBeInTheDocument();
});

test("an expense history with no outstanding balance still shows settled results", () => {
  const settled = {
    ...trip,
    settlementPayments: trip.settlementPayments?.map((payment) => ({
      ...payment,
      amountMinor: 150,
    })),
  };
  render(<OverviewPage payload={payloadFor(settled)} readonly />);
  expect(screen.getByText("目前已經打平")).toBeVisible();
  expect(screen.getByRole("region", { name: "群組帳目摘要" })).toBeVisible();
  expect(screen.queryByText("還沒有支出")).not.toBeInTheDocument();
});

test("read-only shares preserve calculated payment results when payment details are omitted", () => {
  const paymentOnly = { ...trip, expenses: [] };
  const payload = payloadFor(paymentOnly);
  const { settlementPayments: _settlementPayments, ...publicTrip } =
    payload.trip;
  render(<OverviewPage payload={{ ...payload, trip: publicTrip }} readonly />);
  expect(screen.getByRole("region", { name: "待結清" })).toBeVisible();
  expect(screen.getByRole("region", { name: "每人餘額" })).toBeVisible();
  expect(screen.queryByText("目前已經打平")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "記錄第一筆共同支出" }),
  ).not.toBeInTheDocument();
});

test("overview localizes the spending analysis heading", async () => {
  render(
    <I18nProvider initialLocale="en">
      <OverviewPage payload={payloadFor(trip)} readonly />
    </I18nProvider>,
  );
  const heading = screen.getByText("Spending analysis");
  expect(heading).toBeVisible();
  await userEvent.setup().click(heading);
  expect(screen.getByText("Other")).toBeVisible();
  expect(screen.queryByText("花費分析")).not.toBeInTheDocument();
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
