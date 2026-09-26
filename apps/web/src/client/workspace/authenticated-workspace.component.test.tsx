// @vitest-environment jsdom
import "fake-indexeddb/auto";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import type { AppBootstrap } from "../app-bootstrap.js";
import type { TripPayload, TripSummary } from "../client-support.js";
import { queueExpense } from "../expense-queue.js";
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

test("recorded and queued expense editors cannot overlap or reset dirty navigation protection", async () => {
  const trip = {
    ...selected.trip,
    id: "trip_queue_recorded",
    participants: [
      ...selected.trip.participants,
      { id: "participant_2", name: "Bob" },
    ],
    expenses: [
      {
        id: "recorded",
        version: 1,
        amountMinor: 100,
        currency: "TWD" as const,
        description: "Dinner",
        expenseDate: "2026-09-26",
        createdAt: "2026-09-26T00:00:00Z",
        paidById: "participant_1",
        participantIds: ["participant_1", "participant_2"],
      },
    ],
  };
  await queueExpense("user_1", trip.id, {
    amount: "200",
    currency: "TWD",
    description: "Queued lunch",
    expenseDate: "2026-09-26",
    paidById: "participant_1",
    participantIds: ["participant_1", "participant_2"],
    category: "其他",
    tags: "",
    splitMode: "equal",
    splitValues: {},
  });
  window.history.replaceState({}, "", `/?trip=${trip.id}&view=expenses`);
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  const user = userEvent.setup();
  const view = render(
    <I18nProvider initialLocale="en">
      <QueryClientProvider client={client}>
        <AuthenticatedWorkspace
          announce={() => undefined}
          offline
          webMcpEnabled={false}
          bootstrap={{
            ...bootstrap,
            trips: [{ ...trips[0], id: trip.id }],
            selected: { ...selected, trip },
          }}
        />
      </QueryClientProvider>
    </I18nProvider>,
  );
  try {
    const queuedEdit = await view.findByRole("button", { name: "Edit draft" });
    await user.click(view.getByRole("button", { name: "Dinner" }));
    expect(queuedEdit).toBeDisabled();
    await user.type(view.getByLabelText("Description"), " changed");
    expect(view.queryByRole("button", { name: "Overview" })).toBeNull();
    expect(queuedEdit).toBeDisabled();
    await user.click(view.getAllByRole("button", { name: "Cancel" })[0]);
    await user.click(view.getByRole("button", { name: "Discard draft" }));
    await waitFor(() => expect(queuedEdit).toBeEnabled());
    await user.click(queuedEdit);
    const queuedDescription = await view.findByLabelText("Description");
    expect(queuedDescription).toHaveValue("Queued lunch");
    expect(view.queryByRole("button", { name: "Dinner" })).toBeNull();
    await user.type(queuedDescription, " updated");
    expect(view.queryByRole("button", { name: "Overview" })).toBeNull();
  } finally {
    view.unmount();
    client.clear();
  }
});

test("sidebar trip switching confirms queued edits made while the destination loads", async () => {
  const trip = {
    ...selected.trip,
    id: "trip_queued_switch",
    participants: [
      ...selected.trip.participants,
      { id: "participant_2", name: "Bob" },
    ],
  };
  await queueExpense("user_1", trip.id, {
    amount: "100",
    currency: "TWD",
    description: "Pending draft",
    expenseDate: "2026-09-26",
    paidById: "participant_1",
    participantIds: ["participant_1", "participant_2"],
    category: "其他",
    tags: "",
    splitMode: "equal",
    splitValues: {},
  });
  window.history.replaceState({}, "", `/?trip=${trip.id}&view=expenses`);
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  let finish: ((response: Response) => void) | undefined;
  const pending = new Promise<Response>((resolve) => {
    finish = resolve;
  });
  const fetcher = vi.fn(async (path: string) => {
    if (path === "/api/trips/trip_2") return pending;
    throw new Error(`Unexpected request: ${path}`);
  });
  vi.stubGlobal("fetch", fetcher);
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  const user = userEvent.setup();
  const view = render(
    <I18nProvider initialLocale="en">
      <QueryClientProvider client={client}>
        <AuthenticatedWorkspace
          announce={() => undefined}
          offline
          webMcpEnabled={false}
          bootstrap={{
            ...bootstrap,
            trips: [{ ...trips[0], id: trip.id }, trips[1]],
            selected: { ...selected, trip },
          }}
        />
      </QueryClientProvider>
    </I18nProvider>,
  );
  try {
    await user.click(await view.findByRole("button", { name: "Edit draft" }));
    const description = await view.findByLabelText("Description");
    const destination = view.getByRole("button", { name: /第二個群組/ });
    await user.click(destination);
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    await user.type(description, " changed");
    finish?.(
      Response.json({
        ...selected,
        trip: { ...selected.trip, id: "trip_2", name: "第二個群組" },
      }),
    );
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(description).toHaveValue("Pending draft changed");
    expect(window.location.search).toContain(`trip=${trip.id}`);
    confirm.mockReturnValue(true);
    await user.click(destination);
    await waitFor(() =>
      expect(window.location.search).toContain("trip=trip_2"),
    );
  } finally {
    view.unmount();
    client.clear();
  }
});

test("a signed-in account can find retained drafts even with no accessible groups", async () => {
  await queueExpense("user_1", "removed-group", {
    amount: "100",
    currency: "TWD",
    description: "Unreachable draft",
    expenseDate: "2026-09-26",
    paidById: "participant_1",
    participantIds: ["participant_1"],
    category: "其他",
    tags: "",
    splitMode: "equal",
    splitValues: {},
  });
  window.history.replaceState({}, "", "/");
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  const view = render(
    <I18nProvider initialLocale="en">
      <QueryClientProvider client={client}>
        <AuthenticatedWorkspace
          announce={() => undefined}
          offline
          webMcpEnabled={false}
          bootstrap={{ ...bootstrap, selected: null, trips: [] }}
        />
      </QueryClientProvider>
    </I18nProvider>,
  );
  try {
    expect(
      await view.findByRole("region", {
        name: "Drafts from unavailable groups",
      }),
    ).toHaveTextContent("Unreachable draft");
  } finally {
    view.unmount();
    client.clear();
  }
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

test("guest mutations update the trip summary without loading the account collection", async () => {
  window.history.replaceState({}, "", `/share/${"x".repeat(43)}?view=people`);
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  const fetcher = vi.fn(async (path: string) => {
    if (path === "/api/trips/trip_1/participants")
      return Response.json({
        ...selected,
        currentUserRole: "editor",
        trip: {
          ...selected.trip,
          participants: [
            ...selected.trip.participants,
            { id: "participant_2", name: "Bob" },
          ],
          expenses: [
            {
              id: "expense_1",
              description: "Lunch",
              amountMinor: 100,
              currency: "TWD",
              expenseDate: "2026-09-20",
              createdAt: "2026-09-20T00:00:00.000Z",
              paidById: "participant_1",
              participantIds: ["participant_1", "participant_2"],
            },
          ],
        },
      });
    throw new Error(`Unexpected request: ${path}`);
  });
  vi.stubGlobal("fetch", fetcher);
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  });
  const view = render(
    <I18nProvider initialLocale="en">
      <QueryClientProvider client={client}>
        <AuthenticatedWorkspace
          announce={() => undefined}
          bootstrap={{
            ...bootstrap,
            guestShare: true,
            selected: { ...selected, currentUserRole: "editor" },
            trips: [trips[0]],
            user: null,
          }}
          guestShare
          offline={false}
        />
      </QueryClientProvider>
    </I18nProvider>,
  );
  const user = userEvent.setup();
  await user.type(await view.findByLabelText("Person's name"), "Bob");
  await user.click(view.getByRole("button", { name: "Add person" }));
  await waitFor(() =>
    expect(
      client.getQueryData<{ trips: TripSummary[] }>([
        "trips",
        "share",
        "trip_1",
      ])?.trips[0],
    ).toMatchObject({ participantCount: 2, expenseCount: 1 }),
  );
  expect(fetcher).toHaveBeenCalledTimes(1);
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
