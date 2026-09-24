// @vitest-environment jsdom

import { Theme } from "@radix-ui/themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import type { TripPayload } from "../client-support.js";
import { I18nProvider } from "../i18n.js";
import { AccessSettings } from "./access-settings.js";
import { WorkspaceProvider } from "./workspace-context.js";

const payload: TripPayload = {
  balances: [],
  settlements: [],
  shareLinks: [],
  currentUserRole: "owner",
  trip: {
    id: "trip_1",
    name: "Trip",
    ownerId: "user_1",
    baseCurrency: "TWD",
    createdAt: "2026-09-20T00:00:00.000Z",
    expenses: [],
    participants: [],
  },
};

afterEach(() => vi.unstubAllGlobals());

test("owner can choose either editable share link mode", async () => {
  const sent: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: string, init: RequestInit) => {
      sent.push(JSON.parse(String(init.body)).mode);
      expect(path).toBe("/api/trips/trip_1/share-links");
      return Response.json(payload);
    }),
  );
  const client = new QueryClient();
  const view = render(
    <Theme>
      <I18nProvider initialLocale="zh-TW">
        <QueryClientProvider client={client}>
          <WorkspaceProvider
            announce={() => undefined}
            offline={false}
            payload={payload}
            refreshCollection={async () => undefined}
          >
            <AccessSettings payload={payload} />
          </WorkspaceProvider>
        </QueryClientProvider>
      </I18nProvider>
    </Theme>,
  );
  fireEvent.click(view.getByText("分享與權限"));
  fireEvent.change(view.getByLabelText("連結權限"), {
    target: { value: "signed-in-edit" },
  });
  const user = userEvent.setup();
  await user.click(view.getByRole("button", { name: "建立分享連結" }));
  await user.click(view.getByRole("button", { name: "建立分享連結" }));
  await waitFor(() => expect(sent).toEqual(["signed-in-edit"]));
  fireEvent.change(view.getByLabelText("連結權限"), {
    target: { value: "anyone-edit" },
  });
  await user.click(view.getByRole("button", { name: "建立分享連結" }));
  await user.click(view.getByRole("button", { name: "建立分享連結" }));
  await waitFor(() => expect(sent).toEqual(["signed-in-edit", "anyone-edit"]));
  view.unmount();
  client.clear();
});
