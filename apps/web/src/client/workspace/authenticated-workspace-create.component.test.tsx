// @vitest-environment jsdom
import "fake-indexeddb/auto";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import type { AppBootstrap } from "../app-bootstrap.js";
import type { TripPayload, TripSummary } from "../client-support.js";
import { TestI18nProvider } from "../test-providers.js";
import { readWorkspaceLocation } from "../url-state.js";
import { AuthenticatedWorkspace } from "./authenticated-workspace.js";

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
    name: "Current group",
    ownerId: "user_1",
    participants: [
      { id: "participant_1", name: "Alice" },
      { id: "participant_2", name: "Bob" },
    ],
  },
};
const created: TripPayload = {
  ...selected,
  trip: { ...selected.trip, id: "new_trip", name: "New group" },
};
const summary: TripSummary = {
  baseCurrency: "TWD",
  expenseCount: 0,
  id: selected.trip.id,
  name: selected.trip.name,
  participantCount: 2,
};

const bootstrap: AppBootstrap = {
  archivedTrips: [],
  readonlyShare: false,
  selected,
  trips: [summary],
  user: { id: "user_1", name: "Alice", username: "alice" },
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test.each([
  { entry: "empty-state", refreshFails: false },
  { entry: "sidebar", refreshFails: false },
  { entry: "header", refreshFails: false },
  { entry: "sidebar", refreshFails: true },
])(
  "$entry creation caches before refresh and waits before navigating (refresh failure: $refreshFails)",
  async ({ entry, refreshFails }) => {
    const empty = entry === "empty-state";
    window.history.replaceState(
      {},
      "",
      empty ? "/?mode=add-expense" : "/?trip=trip_1&mode=add-expense",
    );
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    const pushState = vi.spyOn(window.history, "pushState");
    const initialLocation = window.location.href;
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    let finishRefresh!: (response: Response) => void;
    const refresh = new Promise<Response>((resolve) => {
      finishRefresh = resolve;
    });
    let cachedAtRefresh: TripPayload | undefined;
    const fetcher = vi.fn(async (path: string, init?: RequestInit) => {
      if (path === "/api/trips" && init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({
          baseCurrency: "TWD",
          name: "New group",
        });
        return Response.json(created, { status: 201 });
      }
      if (path === "/api/trips") {
        cachedAtRefresh = client.getQueryData(["trip", created.trip.id]);
        return refresh;
      }
      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal("fetch", fetcher);
    const view = render(
      <TestI18nProvider initialLocale="en">
        <QueryClientProvider client={client}>
          <AuthenticatedWorkspace
            announce={() => undefined}
            bootstrap={
              empty ? { ...bootstrap, selected: null, trips: [] } : bootstrap
            }
            offline={false}
            webMcpEnabled={false}
          />
        </QueryClientProvider>
      </TestI18nProvider>,
    );
    try {
      const user = userEvent.setup();
      if (entry === "header") {
        await user.click(view.getByRole("button", { name: "Switch groups" }));
        await user.click(
          within(view.getByRole("dialog", { name: "Switch groups" })).getByRole(
            "button",
            { name: "Create group" },
          ),
        );
      } else if (entry === "sidebar") {
        await user.click(
          within(
            view.getByRole("complementary", { name: "Group switcher" }),
          ).getByRole("button", { name: "Create group" }),
        );
      } else {
        await user.click(view.getByRole("button", { name: "Create group" }));
      }
      const dialog = view.getByRole("dialog", { name: "Create group" });
      await user.type(within(dialog).getByLabelText("Group name"), "New group");
      await user.click(
        within(dialog).getByRole("button", { name: "Create group" }),
      );
      await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
      expect(cachedAtRefresh).toEqual(created);
      expect(client.getQueryData(["trip", created.trip.id])).toEqual(created);
      expect(window.location.href).toBe(initialLocation);
      expect(pushState).not.toHaveBeenCalled();
      expect(dialog).toBeVisible();
      expect(within(dialog).getByLabelText("Group name")).toHaveValue(
        "New group",
      );

      await act(async () => {
        finishRefresh(
          refreshFails
            ? Response.json({ error: "Refresh failed" }, { status: 503 })
            : Response.json({
                archivedTrips: [],
                trips: [
                  ...(empty ? [] : [summary]),
                  { ...summary, id: created.trip.id, name: created.trip.name },
                ],
              }),
        );
        await refresh;
      });
      await waitFor(() =>
        expect(view.queryByRole("dialog", { name: "Create group" })).toBeNull(),
      );
      const target = pushState.mock.calls[0]?.[2];
      expect(target).toBeDefined();
      expect(
        readWorkspaceLocation(new URL(String(target), initialLocation)),
      ).toEqual({
        expenseId: null,
        mode: null,
        tripId: created.trip.id,
        view: "people",
      });
      if (refreshFails) {
        // refetch returns an error result, so creation still closes and navigates.
        expect(client.getQueryState(["trips"])?.status).toBe("error");
        expect(view.queryByRole("alert")).toBeNull();
        expect(client.getQueryData(["trip", created.trip.id])).toEqual(created);
        // The unchanged collection then selects its existing fallback group.
        await waitFor(() =>
          expect(
            readWorkspaceLocation(new URL(window.location.href)),
          ).toMatchObject({
            mode: null,
            tripId: selected.trip.id,
            view: "overview",
          }),
        );
      } else {
        expect(readWorkspaceLocation(new URL(window.location.href))).toEqual({
          expenseId: null,
          mode: null,
          tripId: created.trip.id,
          view: "people",
        });
        expect(
          await view.findByRole("heading", { name: "New group" }),
        ).toBeVisible();
        expect(view.getByRole("button", { name: "Add person" })).toBeVisible();
      }
      // The created payload is used from cache, without a trip detail request.
      expect(fetcher).toHaveBeenCalledTimes(2);
    } finally {
      view.unmount();
      client.clear();
    }
  },
);
