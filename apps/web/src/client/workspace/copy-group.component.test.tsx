// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import type { TripPayload } from "../client-support.js";
import { I18nProvider } from "../i18n.js";
import { CopyGroup } from "./copy-group.js";
import { WorkspaceProvider } from "./workspace-context.js";

const source: TripPayload = {
  balances: [],
  currentUserRole: "owner",
  settlements: [],
  trip: {
    id: "trip_1",
    name: "Tokyo",
    ownerId: "user_1",
    baseCurrency: "TWD",
    createdAt: "2026-09-19T00:00:00.000Z",
    expenses: [],
    participants: [{ id: "p_1", name: "Alice" }],
  },
};

function setup(offline = false) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onCopied = vi.fn();
  const refreshCollection = vi.fn(async () => undefined);
  const announce = vi.fn();
  const view = render(
    <I18nProvider initialLocale="zh-TW">
      <QueryClientProvider client={client}>
        <WorkspaceProvider
          announce={announce}
          offline={offline}
          payload={source}
          refreshCollection={refreshCollection}
        >
          <CopyGroup onCopied={onCopied} payload={source} />
        </WorkspaceProvider>
      </QueryClientProvider>
    </I18nProvider>,
  );
  return { announce, client, onCopied, refreshCollection, view };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("confirms scope, copies once and selects the new group", async () => {
  const copied = {
    ...source,
    trip: { ...source.trip, id: "trip_2", name: "Tokyo (copy)" },
  };
  const fetch = vi.fn(async () => Response.json(copied, { status: 201 }));
  vi.stubGlobal("fetch", fetch);
  const user = userEvent.setup();
  const { view, client, onCopied, refreshCollection, announce } = setup();
  await user.click(view.getByRole("button", { name: "複製群組" }));
  expect(
    within(view.getByRole("dialog")).getByText(
      /支出、結清紀錄、協作者與分享連結不會複製/,
    ),
  ).toBeVisible();
  expect(fetch).not.toHaveBeenCalled();
  await user.click(
    within(view.getByRole("dialog")).getByRole("button", { name: "複製群組" }),
  );
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  expect(fetch).toHaveBeenCalledWith(
    "/api/trips/trip_1/copy",
    expect.objectContaining({ method: "POST" }),
  );
  await waitFor(() => expect(onCopied).toHaveBeenCalledWith(copied));
  expect(refreshCollection).not.toHaveBeenCalled();
  expect(announce).toHaveBeenCalledWith("已複製群組");
  view.unmount();
  client.clear();
});

test("shows a request failure without changing groups and disables offline copying", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ error: "無法複製" }, { status: 500 })),
  );
  const user = userEvent.setup();
  const online = setup();
  await user.click(online.view.getByRole("button", { name: "複製群組" }));
  await user.click(
    within(online.view.getByRole("dialog")).getByRole("button", {
      name: "複製群組",
    }),
  );
  expect(await online.view.findByRole("alert")).toHaveTextContent("無法複製");
  expect(online.onCopied).not.toHaveBeenCalled();
  online.view.unmount();
  online.client.clear();

  const offline = setup(true);
  expect(offline.view.getByRole("button", { name: "複製群組" })).toBeDisabled();
  offline.view.unmount();
  offline.client.clear();
});
