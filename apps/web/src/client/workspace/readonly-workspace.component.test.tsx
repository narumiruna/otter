// @vitest-environment jsdom

import {
  calculateBalances,
  calculateSettlements,
  type Trip,
} from "@narumitw/otter-core/settlement";
import { render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import type { TripPayload } from "../client-support.js";
import { I18nProvider } from "../i18n.js";
import { ReadonlyWorkspace } from "./readonly-workspace.js";

function fixture(): Trip {
  return {
    id: "public",
    ownerId: "owner",
    name: "Travel",
    baseCurrency: "TWD",
    createdAt: "2026-10-01T00:00:00.000Z",
    participants: [
      { id: "a", name: "Alice" },
      { id: "b", name: "Bob" },
    ],
    expenses: [
      {
        id: "meal",
        description: "Dinner",
        expenseDate: "2026-10-01",
        createdAt: "2026-10-01T00:00:00.000Z",
        amountMinor: 100,
        currency: "TWD",
        paidById: "a",
        participantIds: ["a", "b"],
      },
    ],
    settlementPayments: [
      {
        id: "partial",
        fromId: "b",
        toId: "a",
        amountMinor: 20,
        currency: "TWD",
        paidAt: "2026-10-02",
        createdAt: "2026-10-02T00:00:00.000Z",
        note: "Private note",
      },
    ],
  };
}

function payloadFor(trip: Trip): TripPayload {
  return {
    trip,
    balances: calculateBalances(trip),
    settlements: calculateSettlements(trip),
  };
}

function renderShare(payload: TripPayload) {
  return render(
    <I18nProvider initialLocale="en">
      <ReadonlyWorkspace payload={payload} />
    </I18nProvider>,
  );
}

test.each([false, true])(
  "public analysis remains collapsed and read-only (archived=%s)",
  async (archived) => {
    const trip = {
      ...fixture(),
      ...(archived ? { archivedAt: "2026-10-03" } : {}),
    };
    const view = renderShare(payloadFor(trip));
    const heading = view.getByText("Spending analysis");
    const disclosure = heading.closest("details");
    expect(heading).toBeVisible();
    expect(disclosure).not.toHaveAttribute("open");
    expect(
      view.getByRole("region", { name: "Member accounts" }),
    ).not.toBeVisible();
    await userEvent.setup().click(heading);
    expect(disclosure).toHaveAttribute("open");
    expect(view.getByRole("region", { name: "Member accounts" })).toBeVisible();
    expect(view.getByText("Total NT$100")).toBeVisible();
    for (const title of ["Daily spending", "Paid by person", "By category"]) {
      const chart = view.getByRole("heading", { name: title }).parentElement;
      if (!chart) throw new Error(`Missing chart: ${title}`);
      expect(within(chart).getByText("NT$100", { exact: true })).toBeVisible();
    }
    expect(view.queryByRole("button")).not.toBeInTheDocument();
    expect(
      view.getByRole("region", { name: "Complete expense history" }),
    ).toBeVisible();
  },
);

test("empty public groups omit analysis even when supplied zero balances exist", () => {
  const view = renderShare(
    payloadFor({ ...fixture(), expenses: [], settlementPayments: [] }),
  );
  expect(view.getByRole("heading", { name: "No expenses yet" })).toBeVisible();
  expect(view.queryByText("Spending analysis")).not.toBeInTheDocument();
  expect(
    view.queryByRole("region", { name: "Member accounts", hidden: true }),
  ).not.toBeInTheDocument();
});

test.each([false, true])(
  "public supplied balances remain authoritative with payment details withheld (paymentOnly=%s)",
  async (paymentOnly) => {
    const full = payloadFor({
      ...fixture(),
      ...(paymentOnly ? { expenses: [] } : {}),
    });
    const { settlementPayments: _payments, ...trip } = full.trip;
    // The payment-only case also checks the nonzero-balance visibility guard.
    const payload = {
      ...full,
      trip,
      settlements: paymentOnly ? [] : full.settlements,
    };
    const before = structuredClone(payload);
    const view = renderShare(payload);
    const balances = within(view.getByRole("region", { name: "Balances" }));
    expect(
      balances.getAllByText(paymentOnly ? "NT$20" : "NT$30", { exact: true }),
    ).toHaveLength(2);
    expect(view.queryByText("Private note")).not.toBeInTheDocument();
    await userEvent.setup().click(view.getByText("Spending analysis"));
    const accounts = within(
      view.getByRole("region", { name: "Member accounts" }),
    );
    expect(accounts.getByRole("row", { name: /^Alice / })).toHaveTextContent(
      paymentOnly
        ? "Paid0Share0To payNT$20"
        : "PaidNT$100ShareNT$50To receiveNT$30",
    );
    await userEvent.setup().click(
      accounts.getAllByText("View details", {
        selector: "summary",
        exact: false,
      })[0],
    );
    expect(
      accounts.getAllByText(/Payment details are not included/)[0],
    ).toBeVisible();
    expect(accounts.queryByText(/Received 2026-10-02/)).not.toBeInTheDocument();
    expect(
      view.queryByRole("button", { name: "Record payment" }),
    ).not.toBeInTheDocument();
    expect(payload).toEqual(before);
  },
);

test("public payment-only history still shows analysis when every balance is zero", async () => {
  const source = fixture();
  const payment = source.settlementPayments?.[0];
  if (!payment) throw new Error("Missing payment fixture");
  const trip: Trip = {
    ...source,
    expenses: [],
    settlementPayments: [
      payment,
      { ...payment, id: "reverse", fromId: "a", toId: "b" },
    ],
  };
  const payload = payloadFor(trip);
  expect(payload.balances.every(({ amountMinor }) => amountMinor === 0)).toBe(
    true,
  );
  const view = renderShare(payload);
  await userEvent.setup().click(view.getByText("Spending analysis"));
  expect(view.getByRole("region", { name: "Member accounts" })).toBeVisible();
  expect(view.getByText("Total NT$0")).toBeVisible();
});

test("public analysis preserves the supplied-settlements visibility guard", () => {
  const full = payloadFor(fixture());
  const view = renderShare({
    ...full,
    trip: { ...full.trip, expenses: [], settlementPayments: undefined },
    balances: [],
  });
  expect(view.getByText("Spending analysis")).toBeVisible();
});
