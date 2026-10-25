// @vitest-environment jsdom
import {
  calculateBalances,
  calculateSettlements,
  type Trip,
} from "@narumitw/otter-core/settlement";
import { render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { translations } from "../i18n/messages.js";
import { I18nProvider } from "../i18n.js";
import { MemberAccounts } from "./member-accounts.js";
import { ReadonlyWorkspace } from "./readonly-workspace.js";

function fixture(): Trip {
  return {
    id: "accounts",
    ownerId: "owner",
    name: "Travel",
    baseCurrency: "TWD",
    createdAt: "now",
    participants: [
      { id: "a", name: "Narumi" },
      { id: "b", name: "Dogiko" },
      { id: "c", name: "Charissa" },
    ],
    expenses: [
      {
        id: "meal",
        description: "Dinner",
        expenseDate: "2026-10-01",
        createdAt: "now",
        amountMinor: 101,
        currency: "TWD",
        paidById: "a",
        participantIds: ["b", "a"],
        participantShares: [
          { participantId: "a", shareMinor: 40 },
          { participantId: "b", shareMinor: 61 },
        ],
      },
    ],
    settlementPayments: [
      {
        id: "p",
        fromId: "b",
        toId: "a",
        amountMinor: 20,
        currency: "TWD",
        paidAt: "2026-10-02",
        createdAt: "now",
        note: "Partial",
      },
    ],
  };
}
function payload(trip = fixture()) {
  return {
    trip,
    balances: calculateBalances(trip),
    settlements: calculateSettlements(trip),
  };
}

test("older other-currency payments without a rate remain explicitly unavailable", () => {
  const previous = payload();
  const missing = {
    ...previous,
    trip: {
      ...previous.trip,
      settlementPayments: previous.trip.settlementPayments?.map((payment) => ({
        ...payment,
        currency: "USD" as const,
      })),
    },
  };
  const view = render(
    <I18nProvider initialLocale="en">
      <MemberAccounts payload={missing} />
    </I18nProvider>,
  );
  expect(view.getByRole("status")).toHaveTextContent("Rate unavailable");
  expect(view.queryByRole("table")).toBeNull();
});

test("all members have expense-only paid/share totals and payment-adjusted balances", async () => {
  const view = render(
    <I18nProvider initialLocale="en">
      <MemberAccounts payload={payload()} />
    </I18nProvider>,
  );
  const table = within(view.getByRole("table", { name: "Member accounts" }));
  expect(table.getByRole("row", { name: /^Narumi / })).toHaveTextContent(
    "PaidNT$101ShareNT$40To receiveNT$41",
  );
  expect(table.getByRole("row", { name: /^Dogiko / })).toHaveTextContent(
    "Paid0ShareNT$61To payNT$41",
  );
  expect(table.getByRole("row", { name: /^Charissa / })).toHaveTextContent(
    "Paid0Share0Settled",
  );
  const toggle = view.getAllByText("View details", {
    selector: "summary",
    exact: false,
  })[0];
  // There is one independent disclosure for each member.
  expect(
    view.getAllByText("View details", { exact: false, selector: "summary" }),
  ).toHaveLength(3);
  expect(toggle.closest("details")).not.toHaveAttribute("open");
  // Native summary keyboard activation is covered in Chromium, not JSDOM.
  await userEvent.setup().click(toggle);
  expect(toggle.closest("details")).toHaveAttribute("open");
  expect(view.getByText(/Received 2026-10-02 Dogiko → Narumi/)).toBeVisible();
  expect(
    view.queryByRole("button", { name: "Record payment" }),
  ).not.toBeInTheDocument();
});

test.each([
  { mode: "equal", shares: undefined, memberShare: "NT$1,600" },
  {
    mode: "unequal",
    shares: [
      { participantId: "a", shareMinor: 2500 },
      { participantId: "b", shareMinor: 7500 },
    ],
    memberShare: "NT$800",
  },
])(
  "$mode foreign shares label the full bill separately",
  async ({ shares, memberShare }) => {
    const trip = fixture();
    trip.expenses[0] = {
      ...trip.expenses[0],
      currency: "USD",
      amountMinor: 10000,
      exchangeRate: { baseCurrency: "TWD", rateToBase: 32, source: "custom" },
      participantShares: shares,
    };
    trip.settlementPayments = [];
    const before = structuredClone(trip);
    const view = render(
      <I18nProvider initialLocale="en">
        <MemberAccounts payload={payload(trip)} />
      </I18nProvider>,
    );
    const toggle = view.getAllByText("View details", {
      selector: "summary",
      exact: false,
    })[0];
    await userEvent.setup().click(toggle);
    const details = toggle.closest("details");
    if (!details) throw new Error("Missing member details");
    const section = within(details)
      .getByRole("heading", { name: "Shared expenses (TWD)" })
      .closest("section");
    if (!section) throw new Error("Missing shared expense section");
    expect(
      within(section).getByText(memberShare, { exact: true }),
    ).toBeVisible();
    expect(
      within(section).getByText("Full expense total: USD $100.00", {
        exact: true,
      }),
    ).toBeVisible();
    expect(
      within(section).queryByText("USD $100.00", { exact: true }),
    ).not.toBeInTheDocument();
    expect(trip).toEqual(before);
  },
);

test("public share uses supplied balances when payment details are omitted", async () => {
  const full = payload();
  const { settlementPayments: _payments, ...trip } = full.trip;
  const view = render(
    <I18nProvider initialLocale="en">
      <ReadonlyWorkspace payload={{ ...full, trip }} />
    </I18nProvider>,
  );
  await userEvent.setup().click(view.getByText("Spending analysis"));
  const accounts = within(
    view.getByRole("region", { name: "Member accounts" }),
  );
  expect(accounts.getByRole("row", { name: /^Narumi / })).toHaveTextContent(
    "To receiveNT$41",
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
  expect(
    view.queryByRole("button", { name: "Record payment" }),
  ).not.toBeInTheDocument();
});

test("payment-only groups keep both balances and member analysis", async () => {
  const trip = { ...fixture(), expenses: [] };
  const view = render(
    <I18nProvider initialLocale="en">
      <ReadonlyWorkspace payload={payload(trip)} />
    </I18nProvider>,
  );
  expect(view.getByRole("region", { name: "Balances" })).toBeVisible();
  await userEvent.setup().click(view.getByText("Spending analysis"));
  expect(
    within(view.getByRole("region", { name: "Member accounts" })).getByRole(
      "row",
      { name: /^Narumi / },
    ),
  ).toHaveTextContent("To payNT$20");
});

test.each(["zh-TW", "en", "ja", "ko"] as const)(
  "%s member analysis has complete localized labels and details",
  async (locale) => {
    const messages = translations[locale];
    const view = render(
      <I18nProvider initialLocale={locale}>
        <MemberAccounts payload={payload()} />
      </I18nProvider>,
    );
    expect(
      view.getByRole("table", { name: messages.memberAccounts }),
    ).toBeVisible();
    expect(
      view.getByRole("columnheader", { name: messages.accountPaid }),
    ).toBeVisible();
    expect(view.getByText(messages.accountPaidHelp)).toBeVisible();
    await userEvent.setup().click(
      view.getAllByText(messages.accountDetails, {
        selector: "summary",
        exact: false,
      })[0],
    );
    expect(
      view.getAllByText(`${messages.accountPayments} (TWD)`)[0],
    ).toBeVisible();
    expect(
      view.getAllByText(`${messages.accountExpenseTotal}:`, {
        exact: false,
      })[0],
    ).toBeVisible();
  },
);
