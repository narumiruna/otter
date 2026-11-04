// @vitest-environment jsdom

import { calculateBalances } from "@narumitw/otter-core/settlement";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import type { TripPayload } from "../client-support.js";
import { I18nProvider } from "../i18n.js";
import {
  ApiWriteSettings,
  LifecycleSettings,
  TripPreferences,
} from "./trip-settings.js";
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

test("API write setting starts off and can be enabled by the owner", async () => {
  const requests: unknown[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_input, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      requests.push(body);
      return Response.json({ ...payload, trip: { ...payload.trip, ...body } });
    }),
  );
  const user = userEvent.setup();
  const client = new QueryClient();
  const view = render(
    <I18nProvider initialLocale="zh-TW">
      <QueryClientProvider client={client}>
        <WorkspaceProvider
          announce={() => undefined}
          offline={false}
          payload={payload}
          refreshCollection={async () => undefined}
        >
          <ApiWriteSettings payload={payload} />
        </WorkspaceProvider>
      </QueryClientProvider>
    </I18nProvider>,
  );
  await user.click(view.getByText("API 修改權限"));
  expect(
    view.getByRole("checkbox", { name: "允許透過 API Token 修改群組" }),
  ).not.toBeChecked();
  await user.click(
    view.getByRole("checkbox", { name: "允許透過 API Token 修改群組" }),
  );
  await waitFor(() => expect(requests).toEqual([{ allowApiWrites: true }]));
  expect(globalThis.fetch).toHaveBeenCalledWith(
    "/api/trips/trip_1",
    expect.objectContaining({ method: "PATCH" }),
  );
  view.unmount();
  client.clear();
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

test("changing the base currency does not invent a current-rate monetary preview", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const client = new QueryClient();
  const view = render(
    <I18nProvider initialLocale="en">
      <QueryClientProvider client={client}>
        <WorkspaceProvider
          announce={() => undefined}
          offline={false}
          payload={payload}
          refreshCollection={async () => undefined}
        >
          <TripPreferences payload={payload} expanded />
        </WorkspaceProvider>
      </QueryClientProvider>
    </I18nProvider>,
  );
  await userEvent
    .setup()
    .selectOptions(view.getByLabelText("Base currency"), "USD");
  expect(view.getByRole("status")).toHaveTextContent("each record's date");
  expect(fetcher).not.toHaveBeenCalled();
  view.unmount();
  client.clear();
});

test.each([
  {
    baseCurrency: "USD" as const,
    paymentCurrency: "KRW" as const,
    paymentMinor: 100000,
    rate: 0.00075,
    amountMinor: 7500,
  },
  {
    baseCurrency: "KRW" as const,
    paymentCurrency: "USD" as const,
    paymentMinor: 10000,
    rate: 32 / 0.024,
    amountMinor: 133333,
  },
])(
  "base changes use the server's saved $baseCurrency payment rate",
  async ({
    baseCurrency,
    paymentCurrency,
    paymentMinor,
    rate,
    amountMinor,
  }) => {
    const current: TripPayload = {
      ...payload,
      trip: {
        ...payload.trip,
        participants: [
          { id: "alice", name: "Alice" },
          { id: "bob", name: "Bob" },
        ],
        settlementPayments: [
          {
            id: "p",
            fromId: "bob",
            toId: "alice",
            amountMinor: paymentMinor,
            currency: paymentCurrency,
            paidAt: "2026-09-20",
            note: "",
            createdAt: "2026-10-25T00:00:00Z",
          },
        ],
      },
    };
    const savedTrip = {
      ...current.trip,
      baseCurrency,
      settlementPayments: current.trip.settlementPayments?.map((p) => ({
        ...p,
        exchangeRate: {
          baseCurrency,
          rateToBase: rate,
          source: "visa" as const,
          provider: "VISA" as const,
          rateType: "visa" as const,
          date: p.paidAt,
          fetchedAt: "2026-10-25T00:00:00Z",
        },
      })),
    };
    const balances = calculateBalances(savedTrip);
    expect(balances.map((b) => b.amountMinor)).toEqual([
      -amountMinor,
      amountMinor,
    ]);
    const fetcher = vi.fn(async (_url: string, init: RequestInit) => {
      expect(JSON.parse(String(init.body))).toEqual({ baseCurrency });
      return Response.json({
        ...current,
        trip: savedTrip,
        balances,
        settlements: [],
      });
    });
    vi.stubGlobal("fetch", fetcher);
    const client = new QueryClient();
    const onPayload = vi.fn();
    const view = render(
      <I18nProvider initialLocale="en">
        <QueryClientProvider client={client}>
          <WorkspaceProvider
            announce={() => undefined}
            offline={false}
            payload={current}
            onPayload={onPayload}
            refreshCollection={async () => undefined}
          >
            <TripPreferences payload={current} expanded />
          </WorkspaceProvider>
        </QueryClientProvider>
      </I18nProvider>,
    );
    const user = userEvent.setup();
    await user.selectOptions(
      view.getByLabelText("Base currency"),
      baseCurrency,
    );
    expect(fetcher).not.toHaveBeenCalled();
    await user.click(view.getByRole("button", { name: "Apply changes" }));
    await user.click(
      view.getByRole("button", { name: "Apply group preferences" }),
    );
    await waitFor(() =>
      expect(onPayload).toHaveBeenCalledWith(
        expect.objectContaining({ balances }),
      ),
    );
    view.unmount();
    client.clear();
  },
);
