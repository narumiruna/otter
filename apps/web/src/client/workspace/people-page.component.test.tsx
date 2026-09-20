// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import type { TripPayload } from "../client-support.js";
import { I18nProvider, useI18n } from "../i18n.js";
import { PeoplePage } from "./people-page.js";
import { WorkspaceProvider } from "./workspace-context.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

const payload: TripPayload = {
  balances: [],
  settlements: [],
  trip: {
    baseCurrency: "TWD",
    createdAt: "2026-09-19T00:00:00.000Z",
    expenses: [],
    id: "trip_people",
    name: "Weekend trip",
    ownerId: "owner",
    participants: [{ id: "participant_alice", name: "Alice" }],
  },
};

function LocaleSwitch() {
  const { setLocale } = useI18n();
  return (
    <button type="button" onClick={() => setLocale("en")}>
      Switch to English
    </button>
  );
}

test.each([
  {
    name: "unused",
    count: 2,
    payer: false,
    split: false,
    payment: null,
    reason: null,
  },
  {
    name: "last",
    count: 1,
    payer: false,
    split: false,
    payment: null,
    reason: "last",
  },
  {
    name: "payer",
    count: 2,
    payer: true,
    split: false,
    payment: null,
    reason: "expense",
  },
  {
    name: "split",
    count: 2,
    payer: false,
    split: true,
    payment: null,
    reason: "expense",
  },
  {
    name: "sender",
    count: 2,
    payer: false,
    split: false,
    payment: "from",
    reason: "payment",
  },
  {
    name: "recipient",
    count: 2,
    payer: false,
    split: false,
    payment: "to",
    reason: "payment",
  },
  {
    name: "expense before payment",
    count: 2,
    payer: true,
    split: false,
    payment: "from",
    reason: "expense",
  },
  {
    name: "last before expense",
    count: 1,
    payer: true,
    split: true,
    payment: null,
    reason: "last",
  },
] as const)("deletion affordance: $name", (scenario) => {
  const trip: TripPayload["trip"] = {
    ...payload.trip,
    participants: [
      { id: "target", name: "Target" },
      { id: "other", name: "Other" },
    ].slice(0, scenario.count),
    expenses:
      scenario.payer || scenario.split
        ? [
            {
              id: "expense",
              description: "Expense",
              amountMinor: 100,
              currency: "TWD",
              expenseDate: "2026-09-21",
              createdAt: "2026-09-21T00:00:00.000Z",
              paidById: scenario.payer ? "target" : "other",
              participantIds: [scenario.split ? "target" : "other"],
            },
          ]
        : [],
    settlementPayments: scenario.payment
      ? [
          {
            id: "payment",
            amountMinor: 10,
            currency: "TWD",
            note: "",
            paidAt: "2026-09-21",
            createdAt: "2026-09-21T00:00:00.000Z",
            fromId: scenario.payment === "from" ? "target" : "other",
            toId: scenario.payment === "to" ? "target" : "other",
          },
        ]
      : [],
  };
  const queryClient = new QueryClient();
  const reasons = {
    en: {
      last: "At least one participant is required",
      expense: "Used by an expense",
      payment: "Used by a payment",
    },
    "zh-TW": {
      last: "至少需要一位參與者",
      expense: "已有支出",
      payment: "已有付款紀錄",
    },
  };
  for (const locale of ["en", "zh-TW"] as const) {
    const view = render(
      <I18nProvider initialLocale={locale}>
        <QueryClientProvider client={queryClient}>
          <WorkspaceProvider
            announce={() => undefined}
            offline={false}
            payload={{ ...payload, trip }}
            refreshCollection={async () => undefined}
          >
            <PeoplePage trip={trip} />
          </WorkspaceProvider>
        </QueryClientProvider>
      </I18nProvider>,
    );
    const row = within(screen.getAllByRole("listitem")[0]);
    const deleteButton = row.queryByRole("button", {
      name: locale === "en" ? "Delete" : "刪除",
    });
    if (scenario.reason) {
      expect(deleteButton).toBeNull();
      expect(
        row.getByText(new RegExp(reasons[locale][scenario.reason])),
      ).toBeVisible();
    } else expect(deleteButton).toBeVisible();
    view.unmount();
  }
});

test("English participant management uses a page-specific heading", () => {
  const queryClient = new QueryClient();
  render(
    <I18nProvider initialLocale="en">
      <QueryClientProvider client={queryClient}>
        <WorkspaceProvider
          announce={() => undefined}
          offline={false}
          payload={payload}
          refreshCollection={async () => undefined}
        >
          <PeoplePage trip={payload.trip} />
        </WorkspaceProvider>
      </QueryClientProvider>
    </I18nProvider>,
  );

  expect(
    screen.getByRole("heading", { name: "Expense participants" }),
  ).toBeVisible();
  expect(screen.queryByRole("heading", { name: "Split with" })).toBeNull();
});

test("switching locale clears participant errors from the previous locale", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({ error: "參與者名稱已存在" }, { status: 409 }),
    ),
  );
  const user = userEvent.setup();
  const queryClient = new QueryClient();
  render(
    <I18nProvider initialLocale="zh-TW">
      <LocaleSwitch />
      <QueryClientProvider client={queryClient}>
        <WorkspaceProvider
          announce={() => undefined}
          offline={false}
          payload={payload}
          refreshCollection={async () => undefined}
        >
          <PeoplePage trip={payload.trip} />
        </WorkspaceProvider>
      </QueryClientProvider>
    </I18nProvider>,
  );

  await user.type(screen.getByLabelText("成員名稱"), "Alice");
  await user.click(screen.getByRole("button", { name: "新增成員" }));
  expect(await screen.findByText("參與者名稱已存在")).toBeVisible();

  await user.click(screen.getByRole("button", { name: "Switch to English" }));

  expect(screen.queryByText("參與者名稱已存在")).toBeNull();
  expect(
    screen.getByRole("heading", { name: "Expense participants" }),
  ).toBeVisible();
});
