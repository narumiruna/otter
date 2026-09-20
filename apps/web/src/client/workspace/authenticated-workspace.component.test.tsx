// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import type { AppBootstrap } from "../app-bootstrap.js";
import type { TripPayload, TripSummary } from "../client-support.js";
import { I18nProvider, useI18n } from "../i18n.js";
import { AuthenticatedWorkspace } from "./authenticated-workspace.js";

function SwitchToEnglish() {
  const { setLocale } = useI18n();
  return (
    <button type="button" onClick={() => setLocale("en")}>
      Switch to English
    </button>
  );
}

const trips: TripSummary[] = [
  {
    baseCurrency: "TWD",
    expenseCount: 0,
    id: "trip_1",
    name: "目前群組",
    participantCount: 1,
  },
  {
    baseCurrency: "TWD",
    expenseCount: 0,
    id: "trip_2",
    name: "第二個群組",
    participantCount: 1,
  },
];

const selected: TripPayload = {
  balances: [],
  collaborators: [],
  currentUserRole: "owner",
  settlements: [],
  shareLinks: [],
  trip: {
    baseCurrency: "TWD",
    createdAt: "2026-09-19T00:00:00.000Z",
    expenses: [],
    id: "trip_1",
    name: "目前群組",
    ownerId: "user_1",
    participants: [{ id: "participant_1", name: "Alice" }],
  },
};

const bootstrap: AppBootstrap = {
  archivedTrips: [],
  readonlyShare: false,
  selected,
  trips,
  user: { id: "user_1", name: "Alice", username: "alice" },
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("preserves expense grouping across workspace navigation", async () => {
  window.history.replaceState({}, "", "/?trip=trip_1&view=expenses");
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      throw new Error(`Unexpected request: ${String(input)}`);
    }),
  );
  const selectedWithExpenses: TripPayload = {
    ...selected,
    trip: {
      ...selected.trip,
      expenses: [
        {
          amountMinor: 300,
          createdAt: "2026-09-19T00:00:00.000Z",
          currency: "TWD",
          description: "Dinner",
          expenseDate: "2026-09-19",
          id: "dinner",
          paidById: "participant_1",
          participantIds: ["participant_1", "participant_2"],
        },
        {
          amountMinor: 200,
          createdAt: "2026-09-20T00:00:00.000Z",
          currency: "TWD",
          description: "Lunch",
          expenseDate: "2026-09-20",
          id: "lunch",
          paidById: "participant_2",
          participantIds: ["participant_1", "participant_2"],
        },
      ],
      participants: [
        ...selected.trip.participants,
        { id: "participant_2", name: "Bob" },
      ],
    },
  };
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  });
  const user = userEvent.setup();
  const view = render(
    <I18nProvider initialLocale="en">
      <QueryClientProvider client={client}>
        <AuthenticatedWorkspace
          announce={() => undefined}
          bootstrap={{ ...bootstrap, selected: selectedWithExpenses }}
          offline={false}
        />
      </QueryClientProvider>
    </I18nProvider>,
  );

  await user.selectOptions(
    await view.findByRole("combobox", { name: "Group by" }),
    "date",
  );
  expect(
    view.getByRole("heading", { level: 3, name: "2026-09-20" }),
  ).toBeVisible();

  await user.click(view.getByRole("button", { name: "Overview" }));
  await user.click(view.getByRole("button", { name: "Expenses" }));

  expect(await view.findByRole("combobox", { name: "Group by" })).toHaveValue(
    "date",
  );
  expect(
    view.getByRole("heading", { level: 3, name: "2026-09-20" }),
  ).toBeVisible();
  view.unmount();
  client.clear();
});

test("switching locale clears a group-switch error from the previous locale", async () => {
  window.history.replaceState({}, "", "/?trip=trip_1");
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      if (String(input).endsWith("/api/trips/trip_2")) {
        return Response.json({ error: "找不到旅行" }, { status: 404 });
      }
      throw new Error(`Unexpected request: ${String(input)}`);
    }),
  );
  const user = userEvent.setup();
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  });
  const view = render(
    <I18nProvider initialLocale="zh-TW">
      <SwitchToEnglish />
      <QueryClientProvider client={client}>
        <AuthenticatedWorkspace
          announce={() => undefined}
          bootstrap={bootstrap}
          offline={false}
        />
      </QueryClientProvider>
    </I18nProvider>,
  );

  await user.click(view.getByRole("button", { name: /第二個群組/ }));
  expect(await view.findByRole("alert")).toHaveTextContent("找不到旅行");

  await user.click(view.getByRole("button", { name: "Switch to English" }));

  expect(view.queryByRole("alert")).toBeNull();
  view.unmount();
  client.clear();
});
