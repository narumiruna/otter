// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { AppShell } from "./app-shell.js";
import type { TripPayload, TripSummary, User } from "./client-support.js";
import { I18nProvider } from "./i18n.js";

const userAccount: User = {
  id: "user_1",
  name: "Alice",
  username: "alice",
};

const trip: TripSummary = {
  baseCurrency: "TWD",
  expenseCount: 0,
  id: "trip_1",
  name: "目前群組",
  participantCount: 1,
};

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
    id: trip.id,
    name: trip.name,
    ownerId: userAccount.id,
    participants: [{ id: "participant_1", name: userAccount.name }],
  },
};

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <I18nProvider initialLocale="zh-TW">
      <QueryClientProvider client={queryClient}>
        <AppShell />
      </QueryClientProvider>
    </I18nProvider>,
  );
}

beforeEach(() => {
  window.history.replaceState({}, "", "/?trip=trip_1");
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      const pathname = new URL(String(input), window.location.origin).pathname;
      if (pathname === "/api/config") {
        return Response.json({ devLoginCredentials: null });
      }
      if (pathname === "/api/me") return Response.json({ user: userAccount });
      if (pathname === "/api/trips") {
        return Response.json({ archivedTrips: [], trips: [trip] });
      }
      if (pathname === `/api/trips/${trip.id}`) {
        return Response.json(selected);
      }
      if (pathname === "/api/passkeys") {
        return Response.json({ passkeys: [] });
      }
      throw new Error(`Unexpected request: ${pathname}`);
    }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("account settings uses browser history and manages page focus", async () => {
  const user = userEvent.setup();
  const view = renderApp();
  const accountButton = await view.findByRole("button", {
    name: "管理 Alice 的帳號",
  });

  await user.click(accountButton);

  const settingsUrl = window.location.href;
  expect(settingsUrl).toContain("account=settings");
  const heading = await view.findByRole("heading", {
    level: 2,
    name: "帳號設定",
  });
  await waitFor(() => expect(heading).toHaveFocus());

  const back = vi
    .spyOn(window.history, "back")
    .mockImplementation(() => undefined);
  await user.click(view.getByRole("button", { name: "取消" }));
  expect(back).toHaveBeenCalledOnce();
  back.mockRestore();

  act(() => {
    window.history.replaceState({}, "", "/?trip=trip_1");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await waitFor(() =>
    expect(view.queryByRole("region", { name: "帳號設定" })).toBeNull(),
  );
  await waitFor(() => expect(accountButton).toHaveFocus());

  act(() => {
    window.history.replaceState(
      { otterAccountSettings: true },
      "",
      settingsUrl,
    );
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  const reopenedHeading = await view.findByRole("heading", {
    level: 2,
    name: "帳號設定",
  });
  await waitFor(() => expect(reopenedHeading).toHaveFocus());
});
