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
  ExchangeRateSettings,
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

const preview = {
  baseCurrency: "TWD",
  fetchedAt: "2026-10-25T00:00:00Z",
  date: "2026-10-25",
  source: "VISA",
  rateType: "visa",
  rates: { TWD: 1, USD: 32, JPY: 0.2 },
  unavailableCurrencies: ["EUR", "SGD", "GBP", "AUD", "CAD", "KRW"],
};

function settingsView(initial: TripPayload = payload) {
  const client = new QueryClient();
  const settings = (current: TripPayload) => (
    <I18nProvider initialLocale="zh-TW">
      <QueryClientProvider client={client}>
        <WorkspaceProvider
          announce={() => undefined}
          offline={false}
          payload={current}
          refreshCollection={async () => undefined}
        >
          <ExchangeRateSettings payload={current} expanded />
        </WorkspaceProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
  const view = render(settings(initial));
  return {
    view,
    rerender: (next: TripPayload) => view.rerender(settings(next)),
    close: () => {
      view.unmount();
      client.clear();
    },
  };
}

test("Visa preview is read-only and does not clear manual rates or invent missing quotes", async () => {
  const fetcher = vi.fn(async () => Response.json(preview));
  vi.stubGlobal("fetch", fetcher);
  const current: TripPayload = {
    ...payload,
    exchangeRateInfo: {
      source: "custom",
      defaults: { source: "visa" },
      customRates: { USD: 30 },
    },
    trip: { ...payload.trip, exchangeRates: { TWD: 1, USD: 30 } },
  };
  const s = settingsView(current);
  const user = userEvent.setup();
  await user.click(s.view.getByRole("button", { name: "查看今日 Visa 匯率" }));
  expect(await s.view.findByRole("status")).toHaveTextContent("2026-10-25");
  expect(s.view.getByRole("status")).toHaveTextContent("USD → TWD: 32");
  expect(s.view.getByRole("status")).toHaveTextContent(
    "無法取得 2026-10-25 KRW/TWD Visa 匯率",
  );
  expect(s.view.getByLabelText("USD → TWD")).toHaveValue("30");
  expect(s.view.getByLabelText("JPY → TWD")).toHaveValue("");
  expect(
    s.view.getByRole("button", { name: "預覽完成，套用變更" }),
  ).toBeDisabled();
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher).toHaveBeenCalledWith(
    "/api/exchange-rates/TWD",
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
  s.close();
});

test("Visa loading disables inputs and aborts its request when the settings unmount", async () => {
  let resolve: ((response: Response) => void) | undefined;
  let signal: AbortSignal | null | undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      signal = init.signal;
      return new Promise<Response>((finish) => {
        resolve = finish;
      });
    }),
  );
  const s = settingsView();
  const user = userEvent.setup();
  await user.click(s.view.getByRole("button", { name: "查看今日 Visa 匯率" }));
  expect(s.view.getByLabelText("USD → TWD")).toBeDisabled();
  expect(signal?.aborted).toBe(false);
  s.close();
  expect(signal?.aborted).toBe(true);
  resolve?.(Response.json(preview));
});

test("failed preview keeps manual drafts and shows the provider error", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json(
        { error: "目前無法取得 Visa 匯率，請稍後再試" },
        { status: 502 },
      ),
    ),
  );
  const s = settingsView();
  const user = userEvent.setup();
  await user.type(s.view.getByLabelText("USD → TWD"), "30");
  await user.click(s.view.getByRole("button", { name: "查看今日 Visa 匯率" }));
  expect(await s.view.findByRole("alert")).toHaveTextContent("Visa");
  expect(s.view.getByLabelText("USD → TWD")).toHaveValue("30");
  expect(s.view.getByLabelText("USD → TWD")).toBeEnabled();
  s.close();
});

test("manual changes save only the override and its expected base, not preview rates", async () => {
  const bodies: unknown[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      if (init.method !== "PATCH") return Response.json(preview);
      bodies.push(JSON.parse(String(init.body)));
      return Response.json({
        ...payload,
        exchangeRateInfo: {
          source: "custom",
          customRates: { USD: 30 },
          defaults: { source: "visa" },
        },
        trip: { ...payload.trip, exchangeRates: { TWD: 1, USD: 30 } },
      });
    }),
  );
  const s = settingsView();
  const user = userEvent.setup();
  await user.type(s.view.getByLabelText("USD → TWD"), "30");
  await user.click(s.view.getByRole("button", { name: "查看今日 Visa 匯率" }));
  await s.view.findByRole("status");
  expect(s.view.getByLabelText("USD → TWD")).toHaveValue("30");
  await user.click(s.view.getByRole("button", { name: "預覽完成，套用變更" }));
  expect(s.view.getByRole("dialog")).toHaveTextContent("已保存的匯率不變");
  await user.click(s.view.getByRole("button", { name: "套用匯率" }));
  await waitFor(() =>
    expect(bodies).toEqual([
      { exchangeRates: { USD: 30 }, rateBaseCurrency: "TWD" },
    ]),
  );
  s.close();
});

test("pristine drafts refresh, dirty drafts survive same-group reloads, and group changes reset them", async () => {
  const s = settingsView();
  const custom = (usd: number): TripPayload => ({
    ...payload,
    exchangeRateInfo: {
      source: "custom",
      customRates: { USD: usd },
      defaults: { source: "visa" },
    },
    trip: { ...payload.trip, exchangeRates: { TWD: 1, USD: usd } },
  });
  s.rerender(custom(30));
  expect(s.view.getByLabelText("USD → TWD")).toHaveValue("30");
  await userEvent.setup().type(s.view.getByLabelText("EUR → TWD"), "40");
  s.rerender(custom(29));
  expect(s.view.getByLabelText("USD → TWD")).toHaveValue("30");
  expect(s.view.getByLabelText("EUR → TWD")).toHaveValue("40");
  s.rerender({ ...payload, trip: { ...payload.trip, id: "other" } });
  expect(s.view.getByLabelText("EUR → TWD")).toHaveValue("");
  expect(s.view.getByLabelText("USD → TWD")).toHaveValue("");
  s.rerender({
    ...payload,
    trip: { ...payload.trip, id: "other", baseCurrency: "USD" },
  });
  expect(s.view.getByLabelText("USD → USD")).toHaveValue("1");
  expect(s.view.getByLabelText("TWD → USD")).toHaveValue("");
  s.close();
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
            createdAt: preview.fetchedAt,
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
          fetchedAt: preview.fetchedAt,
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
