// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import type { TripPayload } from "../client-support.js";
import { I18nProvider } from "../i18n.js";
import { LifecycleSettings } from "./trip-settings.js";
import { WorkspaceProvider } from "./workspace-context.js";

const payload: TripPayload = {
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

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("reports a stable error when group deletion returns HTML", async () => {
  const fetch = vi.fn(
    async () =>
      new Response("<!DOCTYPE html><html></html>", {
        headers: { "Content-Type": "text/html" },
        status: 200,
      }),
  );
  vi.stubGlobal("fetch", fetch);
  const user = userEvent.setup();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const view = render(
    <I18nProvider initialLocale="zh-TW">
      <QueryClientProvider client={client}>
        <WorkspaceProvider
          announce={() => undefined}
          offline={false}
          payload={payload}
          refreshCollection={async () => undefined}
        >
          <LifecycleSettings onDeleted={() => undefined} payload={payload} />
        </WorkspaceProvider>
      </QueryClientProvider>
    </I18nProvider>,
  );

  await user.type(view.getByLabelText("輸入「目前群組」確認"), "目前群組");
  await user.click(view.getByRole("button", { name: "永久刪除群組" }));
  await user.click(view.getByRole("button", { name: "永久刪除「目前群組」" }));

  expect(await view.findByRole("alert")).toHaveTextContent(
    "伺服器回應格式錯誤",
  );
  expect(fetch).toHaveBeenCalledWith(
    "/api/trips/trip_1",
    expect.objectContaining({ method: "DELETE" }),
  );

  view.unmount();
  client.clear();
});
