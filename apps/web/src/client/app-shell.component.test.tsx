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

let tokenCreateResponse: Promise<Response> | undefined;

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
    participants: [
      { id: "participant_1", name: userAccount.name },
      { id: "participant_2", name: "Bob" },
    ],
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
  tokenCreateResponse = undefined;
  window.history.replaceState({}, "", "/?trip=trip_1");
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    value: 0,
  });
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const pathname = new URL(String(input), window.location.origin).pathname;
      const method = input instanceof Request ? input.method : init?.method;
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
      if (pathname === "/api/auth/tokens") {
        if (method === "POST") {
          return (
            tokenCreateResponse ??
            Response.json(
              { error: "Unexpected token creation" },
              { status: 500 },
            )
          );
        }
        return Response.json({ tokens: [] });
      }
      throw new Error(`Unexpected request: ${pathname}`);
    }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("account settings preserves expense drafts across history navigation", async () => {
  const user = userEvent.setup();
  const view = renderApp();
  const accountButton = await view.findByRole("button", {
    name: "管理 Alice 的帳號",
  });

  await user.click(view.getByRole("button", { name: "記一筆" }));
  const description = await view.findByLabelText("描述");
  await user.type(description, "保留這份草稿");
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);

  await user.click(accountButton);

  const settingsUrl = window.location.href;
  expect(await view.findByRole("region", { name: "帳號設定" })).toBeVisible();
  expect(description).not.toBeVisible();
  expect(description).toHaveValue("保留這份草稿");
  expect(confirm).not.toHaveBeenCalled();

  const workspaceUrl = new URL(settingsUrl);
  workspaceUrl.searchParams.delete("account");
  act(() => {
    window.history.replaceState(
      {},
      "",
      `${workspaceUrl.pathname}${workspaceUrl.search}`,
    );
    window.dispatchEvent(new PopStateEvent("popstate"));
  });

  await waitFor(() => expect(description).toBeVisible());
  expect(description).toHaveValue("保留這份草稿");
  expect(confirm).not.toHaveBeenCalled();

  act(() => {
    window.history.replaceState(
      { otterAccountSettings: true },
      "",
      settingsUrl,
    );
    window.dispatchEvent(new PopStateEvent("popstate"));
  });

  expect(await view.findByRole("region", { name: "帳號設定" })).toBeVisible();
  expect(description).not.toBeVisible();
  expect(description).toHaveValue("保留這份草稿");
  expect(confirm).not.toHaveBeenCalled();
});

test("account settings blocks browser history during token creation", async () => {
  let resolveCreate: (response: Response) => void = () => undefined;
  tokenCreateResponse = new Promise<Response>((resolve) => {
    resolveCreate = resolve;
  });
  const user = userEvent.setup();
  const view = renderApp();
  await user.click(
    await view.findByRole("button", { name: "管理 Alice 的帳號" }),
  );
  const tokenName = await view.findByRole("textbox", { name: "Token 名稱" });
  await waitFor(() => expect(tokenName).toBeEnabled());
  await user.type(tokenName, "Travel agent");
  await user.click(view.getByRole("button", { name: "建立 API token" }));
  await waitFor(() =>
    expect(view.getByRole("button", { name: "取消" })).toBeDisabled(),
  );

  const workspaceUrl = new URL(window.location.href);
  workspaceUrl.searchParams.delete("account");
  act(() => {
    window.history.replaceState(
      {},
      "",
      `${workspaceUrl.pathname}${workspaceUrl.search}`,
    );
    window.dispatchEvent(new PopStateEvent("popstate"));
  });

  expect(window.location.search).toContain("account=settings");
  expect(view.getByRole("region", { name: "帳號設定" })).toBeVisible();

  await act(async () =>
    resolveCreate(
      Response.json(
        {
          accessToken: "otter_api_secret",
          token: {
            createdAt: "2026-09-20T00:00:00.000Z",
            expiresAt: "2026-12-19T00:00:00.000Z",
            id: "token-1",
            name: "Travel agent",
          },
        },
        { status: 201 },
      ),
    ),
  );
  expect(
    await view.findByRole("region", { name: "新的 API token" }),
  ).toHaveTextContent("otter_api_secret");
});

test("account settings preserves non-expense form drafts", async () => {
  const user = userEvent.setup();
  const view = renderApp();
  const accountButton = await view.findByRole("button", {
    name: "管理 Alice 的帳號",
  });

  await user.click(view.getByRole("button", { name: "成員" }));
  const name = await view.findByLabelText("成員名稱");
  await user.type(name, "尚未新增的朋友");
  await user.click(accountButton);

  const settingsUrl = window.location.href;
  expect(await view.findByRole("region", { name: "帳號設定" })).toBeVisible();
  expect(name).not.toBeVisible();
  expect(name).toHaveValue("尚未新增的朋友");

  const workspaceUrl = new URL(settingsUrl);
  workspaceUrl.searchParams.delete("account");
  act(() => {
    window.history.replaceState(
      {},
      "",
      `${workspaceUrl.pathname}${workspaceUrl.search}`,
    );
    window.dispatchEvent(new PopStateEvent("popstate"));
  });

  await waitFor(() => expect(name).toBeVisible());
  expect(name).toHaveValue("尚未新增的朋友");
});

test("account settings uses browser history and manages page focus", async () => {
  const user = userEvent.setup();
  const view = renderApp();
  const accountButton = await view.findByRole("button", {
    name: "管理 Alice 的帳號",
  });
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    value: 640,
  });

  await user.click(accountButton);

  const settingsUrl = window.location.href;
  expect(settingsUrl).toContain("account=settings");
  const heading = await view.findByRole("heading", {
    level: 2,
    name: "帳號設定",
  });
  await waitFor(() => expect(heading).toHaveFocus());
  const scrollTo = vi.mocked(window.scrollTo);
  scrollTo.mockClear();

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
  expect(scrollTo).toHaveBeenCalledWith({ behavior: "instant", top: 640 });

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
