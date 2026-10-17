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
import { OverviewPage } from "./overview-page.js";

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

test("public share uses supplied balances when payment details are omitted", async () => {
  const full = payload();
  const { settlementPayments: _payments, ...trip } = full.trip;
  const view = render(
    <I18nProvider initialLocale="en">
      <OverviewPage payload={{ ...full, trip }} readonly />
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
      <OverviewPage payload={payload(trip)} readonly />
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
  },
);
