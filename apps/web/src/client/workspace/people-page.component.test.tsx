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

test("a family member can settle through another participant without merging", async () => {
  const trip = {
    ...payload.trip,
    participants: [
      { id: "parent", name: "Parent" },
      { id: "child", name: "Child" },
    ],
  };
  const fetchMock = vi.fn(async () => Response.json({ ...payload, trip }));
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  render(
    <I18nProvider initialLocale="en">
      <QueryClientProvider client={new QueryClient()}>
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
  const childRow = within(screen.getAllByRole("listitem")[1]);
  await user.selectOptions(
    childRow.getByLabelText("Settlement assigned to"),
    "parent",
  );
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/trips/trip_people/participants/child",
    expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ settledById: "parent" }),
    }),
  );
});

test("failed settlement assignment keeps the previous selection and shows an error", async () => {
  const trip: TripPayload["trip"] = {
    ...payload.trip,
    participants: [
      { id: "parent", name: "Parent" },
      { id: "child", name: "Child" },
    ],
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({ error: "無法更新結算歸屬" }, { status: 409 }),
    ),
  );
  const user = userEvent.setup();
  render(
    <I18nProvider initialLocale="zh-TW">
      <QueryClientProvider client={new QueryClient()}>
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

  const child = within(screen.getAllByRole("listitem")[1]);
  const select = child.getByRole("combobox", { name: "結算歸屬" });
  await user.selectOptions(select, "parent");
  expect(await child.findByRole("alert")).toHaveTextContent("無法更新結算歸屬");
  expect(select).toHaveValue("");
});

test.each([
  {
    locale: "zh-TW" as const,
    label: "結算歸屬",
    self: "本人（獨立結算）",
    reason: "已有成員歸屬此人，請先移除歸屬。",
  },
  {
    locale: "en" as const,
    label: "Settlement assigned to",
    self: "Self (settle separately)",
    reason:
      "Other members are assigned to this person. Remove those assignments first.",
  },
])("settlement assignments are clear and accessible in $locale", (locale) => {
  const trip: TripPayload["trip"] = {
    ...payload.trip,
    participants: [
      { id: "parent", name: "Parent" },
      { id: "child", name: "Child", settledById: "parent" },
      { id: "other", name: "Other" },
    ],
  };
  render(
    <I18nProvider initialLocale={locale.locale}>
      <QueryClientProvider client={new QueryClient()}>
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

  const [parent, child, other] = screen
    .getAllByRole("listitem")
    .map((row) => within(row));
  const parentSelect = parent.getByRole("combobox", { name: locale.label });
  expect(parentSelect).toBeDisabled();
  expect(parentSelect).toHaveValue("");
  expect(parentSelect).toHaveAccessibleDescription(locale.reason);
  expect(parent.getByText(locale.reason)).toBeVisible();
  expect(child.getByRole("combobox", { name: locale.label })).toHaveValue(
    "parent",
  );
  expect(child.getByRole("option", { name: locale.self })).toHaveValue("");
  expect(other.getByRole("combobox", { name: locale.label })).toBeEnabled();
  expect(other.queryByRole("option", { name: "Other" })).toBeNull();
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
