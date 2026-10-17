// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, renderHook } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import type { TripPayload } from "../client-support.js";
import { TestI18nProvider } from "../test-providers.js";
import { MorePage } from "./more-page.js";
import { preferenceKey, writePreferences } from "./personal-preferences.js";
import { usePersonalPreferences } from "./use-personal-preferences.js";
import { WorkspaceProvider } from "./workspace-context.js";

const payload: TripPayload = {
  trip: {
    id: "local",
    ownerId: "u",
    name: "Trip",
    baseCurrency: "TWD",
    expenses: [],
    participants: [{ id: "a", name: "Alice" }],
    createdAt: "now",
  },
  balances: [],
  settlements: [],
  collaborators: [],
  shareLinks: [],
};
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("Unexpected request");
    }),
  );
});
test.each([
  ["owner", false, false],
  ["editor", false, false],
  ["owner", true, true],
  ["editor", true, true],
] as const)(
  "%s can clear local defaults with archived=%s offline=%s",
  async (role, archived, offline) => {
    const p = {
      ...payload,
      currentUserRole: role,
      trip: { ...payload.trip, archivedAt: archived ? "now" : null },
    };
    writePreferences("u", p.trip.id, {
      defaults: {
        currency: "TWD",
        participantIds: ["a"],
        splitMode: "equal",
        splitValues: {},
      },
    });
    const client = new QueryClient();
    const view = render(
      <QueryClientProvider client={client}>
        <TestI18nProvider initialLocale="en">
          <WorkspaceProvider
            announce={() => {}}
            offline={offline}
            payload={p}
            userId="u"
            refreshCollection={async () => {}}
          >
            <MorePage
              payload={p}
              onCopied={() => {}}
              onDeleted={() => {}}
              onRestored={() => {}}
            />
          </WorkspaceProvider>
        </TestI18nProvider>
      </QueryClientProvider>,
    );
    const button = view.getByRole("button", {
      name: "Clear expense defaults for this group",
    });
    expect(button).toBeEnabled();
    await userEvent.setup().click(button);
    expect(localStorage.getItem(preferenceKey("u", p.trip.id))).toBeNull();
    expect(view.getByRole("status")).toHaveTextContent(
      "Expense defaults cleared",
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();
    view.unmount();
    client.clear();
  },
);
test("guests have no local defaults section", () => {
  const client = new QueryClient();
  const p = { ...payload, currentUserRole: "editor" as const };
  const view = render(
    <QueryClientProvider client={client}>
      <TestI18nProvider initialLocale="en">
        <WorkspaceProvider
          announce={() => {}}
          offline
          payload={p}
          refreshCollection={async () => {}}
        >
          <MorePage
            guestShare
            payload={p}
            onCopied={() => {}}
            onDeleted={() => {}}
            onRestored={() => {}}
          />
        </WorkspaceProvider>
      </TestI18nProvider>
    </QueryClientProvider>,
  );
  expect(
    view.queryByText("Expense defaults in this browser"),
  ).not.toBeInTheDocument();
  expect(
    view.queryByRole("button", {
      name: "Clear expense defaults for this group",
    }),
  ).not.toBeInTheDocument();
  view.unmount();
  client.clear();
});
test("failed identity cleanup preserves defaults, reports failure and does not retry on rerender", () => {
  const defaults = {
    currency: "TWD",
    participantIds: ["a"],
    splitMode: "equal",
    splitValues: {},
  };
  localStorage.setItem(
    preferenceKey("u", "local"),
    JSON.stringify({ version: 1, participantId: "a", defaults }),
  );
  const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Quota");
  });
  const { result, rerender } = renderHook(() =>
    usePersonalPreferences("u", payload.trip),
  );
  expect(result.current.preferencesFailed).toBe(true);
  expect(result.current.preferences).toEqual({ defaults });
  rerender();
  rerender();
  expect(spy).toHaveBeenCalledTimes(1);
  spy.mockRestore();
});
test("account and group changes never expose another scope's defaults", () => {
  const defaults = {
    currency: "USD" as const,
    participantIds: ["a"],
    splitMode: "equal" as const,
    splitValues: {},
  };
  writePreferences("u", "local", { defaults });
  const { result, rerender } = renderHook(
    ({ userId, tripId }) =>
      usePersonalPreferences(userId, { ...payload.trip, id: tripId }),
    { initialProps: { userId: "u", tripId: "local" } },
  );
  expect(result.current.preferences.defaults).toEqual(defaults);
  rerender({ userId: "other", tripId: "local" });
  expect(result.current.preferences.defaults).toBeUndefined();
  rerender({ userId: "u", tripId: "other" });
  expect(result.current.preferences.defaults).toBeUndefined();
  act(() => {
    result.current.clearPreferences();
  });
  rerender({ userId: "u", tripId: "local" });
  expect(result.current.preferences.defaults).toEqual(defaults);
});
