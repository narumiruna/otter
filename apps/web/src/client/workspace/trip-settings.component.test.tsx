// @vitest-environment jsdom

import assert from "node:assert/strict";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import type { TripPayload } from "../client-support.js";
import { I18nProvider } from "../i18n.js";
import {
  ExchangeRateSettings,
  LifecycleSettings,
  TripPreferences,
} from "./trip-settings.js";
import { WorkspaceProvider } from "./workspace-context.js";

const bankRates = { EUR: 36.5, JPY: 0.2, TWD: 1, USD: 31.8 };
const bankRateInfo = {
  fetchedAt: "2026-09-20T12:00:00.000Z",
  provider: "BANK_OF_TAIWAN" as const,
  rateType: "spotMid" as const,
  source: "bank" as const,
};

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

test("loads a bank snapshot into the preview without saving it", async () => {
  const ratedPayload: TripPayload = {
    ...payload,
    exchangeRateInfo: bankRateInfo,
    trip: {
      ...payload.trip,
      exchangeRates: { EUR: 35, JPY: 0.22, TWD: 1, USD: 32 },
      expenses: [
        {
          amountMinor: 10_000,
          createdAt: "2026-09-20T00:00:00.000Z",
          currency: "USD",
          description: "Dinner",
          expenseDate: "2026-09-20",
          id: "expense_1",
          paidById: "participant_1",
          participantIds: ["participant_1"],
        },
      ],
    },
  };
  const originalFetch = globalThis.fetch;
  const requests: { method: string; url: string }[] = [];
  globalThis.fetch = async (input, init) => {
    requests.push({ method: init?.method ?? "GET", url: String(input) });
    return new Response(
      JSON.stringify({
        baseCurrency: "TWD",
        fetchedAt: "2026-09-20T12:00:00.000Z",
        rates: bankRates,
        rateType: "spotMid",
        source: "BANK_OF_TAIWAN",
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 },
    );
  };
  const user = userEvent.setup();
  const client = new QueryClient();
  const view = render(
    <QueryClientProvider client={client}>
      <WorkspaceProvider
        announce={() => undefined}
        offline={false}
        payload={ratedPayload}
        refreshCollection={async () => undefined}
      >
        <ExchangeRateSettings payload={ratedPayload} />
      </WorkspaceProvider>
    </QueryClientProvider>,
  );

  try {
    await user.click(view.getByText("換算方式"));
    await user.click(
      view.getByRole("button", { name: "載入台灣銀行預設匯率" }),
    );

    expect(view.getByLabelText("JPY → TWD")).toHaveValue("");
    expect(view.getByLabelText("USD → TWD")).toHaveValue("");
    expect(view.getByLabelText("EUR → TWD")).toHaveValue("");
    expect(view.getByText(/已載入台灣銀行即期中價/)).toBeVisible();
    expect(view.getByText(/總支出：.*3,180/)).toBeVisible();
    assert.deepEqual(requests, [
      { method: "GET", url: "/api/exchange-rates/TWD" },
    ]);
  } finally {
    view.unmount();
    client.clear();
    globalThis.fetch = originalFetch;
  }
});

test("applying the bank default clears persisted custom rates", async () => {
  const originalFetch = globalThis.fetch;
  const bodies: unknown[] = [];
  const customPayload: TripPayload = {
    ...payload,
    exchangeRateInfo: {
      customRates: { EUR: 36, JPY: 0.21, USD: 31 },
      defaults: { ...bankRateInfo, rates: bankRates },
      source: "custom",
    },
    trip: {
      ...payload.trip,
      exchangeRates: { EUR: 36, JPY: 0.21, TWD: 1, USD: 31 },
    },
  };
  globalThis.fetch = async (input, init) => {
    const snapshot = {
      baseCurrency: "TWD",
      fetchedAt: "2026-09-20T12:00:00.000Z",
      rates: bankRates,
      rateType: "spotMid",
      source: "BANK_OF_TAIWAN",
    };
    if ((init?.method ?? "GET") === "PATCH") {
      bodies.push(JSON.parse(String(init?.body)));
      return new Response(
        JSON.stringify({
          ...customPayload,
          exchangeRateInfo: {
            fetchedAt: snapshot.fetchedAt,
            provider: "BANK_OF_TAIWAN",
            rateType: "spotMid",
            source: "bank",
          },
          trip: { ...customPayload.trip, exchangeRates: snapshot.rates },
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      );
    }
    assert.equal(String(input), "/api/exchange-rates/TWD");
    return new Response(JSON.stringify(snapshot), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  };
  const user = userEvent.setup();
  const client = new QueryClient();
  const view = render(
    <QueryClientProvider client={client}>
      <WorkspaceProvider
        announce={() => undefined}
        offline={false}
        payload={customPayload}
        refreshCollection={async () => undefined}
      >
        <ExchangeRateSettings payload={customPayload} />
      </WorkspaceProvider>
    </QueryClientProvider>,
  );

  try {
    await user.click(view.getByText("換算方式"));
    await user.click(
      view.getByRole("button", { name: "載入台灣銀行預設匯率" }),
    );
    await user.click(view.getByRole("button", { name: "預覽完成，套用變更" }));
    await user.click(view.getByRole("button", { name: "套用匯率" }));

    await waitFor(() => expect(bodies).toEqual([{ exchangeRates: {} }]));
  } finally {
    view.unmount();
    client.clear();
    globalThis.fetch = originalFetch;
  }
});

test("saves only edited custom overrides for an automatic-rate trip", async () => {
  const automaticPayload: TripPayload = {
    ...payload,
    exchangeRateInfo: bankRateInfo,
    trip: { ...payload.trip, exchangeRates: bankRates },
  };
  const bodies: unknown[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    bodies.push(JSON.parse(String(init?.body)));
    return new Response(
      JSON.stringify({
        ...automaticPayload,
        exchangeRateInfo: {
          customRates: { USD: 30 },
          defaults: { ...bankRateInfo, rates: bankRates },
          source: "custom",
        },
        trip: {
          ...automaticPayload.trip,
          exchangeRates: { ...bankRates, USD: 30 },
        },
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 },
    );
  };
  const user = userEvent.setup();
  const client = new QueryClient();
  const view = render(
    <QueryClientProvider client={client}>
      <WorkspaceProvider
        announce={() => undefined}
        offline={false}
        payload={automaticPayload}
        refreshCollection={async () => undefined}
      >
        <ExchangeRateSettings payload={automaticPayload} />
      </WorkspaceProvider>
    </QueryClientProvider>,
  );

  try {
    await user.click(view.getByText("換算方式"));
    await user.type(view.getByLabelText("USD → TWD"), "30");
    await user.click(view.getByRole("button", { name: "預覽完成，套用變更" }));
    await user.click(view.getByRole("button", { name: "套用匯率" }));

    await waitFor(() =>
      expect(bodies).toEqual([{ exchangeRates: { USD: 30 } }]),
    );
  } finally {
    view.unmount();
    client.clear();
    globalThis.fetch = originalFetch;
  }
});

test("previews a new base currency with automatic bank rates", async () => {
  const automaticPayload: TripPayload = {
    ...payload,
    exchangeRateInfo: bankRateInfo,
    trip: {
      ...payload.trip,
      exchangeRates: bankRates,
      expenses: [
        {
          amountMinor: 10_000,
          createdAt: "2026-09-20T00:00:00.000Z",
          currency: "EUR",
          description: "Hotel",
          expenseDate: "2026-09-20",
          id: "expense_1",
          paidById: "participant_1",
          participantIds: ["participant_1"],
        },
      ],
    },
  };
  const user = userEvent.setup();
  const client = new QueryClient();
  const view = render(
    <QueryClientProvider client={client}>
      <WorkspaceProvider
        announce={() => undefined}
        offline={false}
        payload={automaticPayload}
        refreshCollection={async () => undefined}
      >
        <TripPreferences payload={automaticPayload} />
      </WorkspaceProvider>
    </QueryClientProvider>,
  );

  await user.click(view.getByText("群組偏好"));
  await user.selectOptions(view.getByLabelText("基準貨幣"), "USD");

  expect(view.getByText(/總支出將顯示為.*114\.78/)).toBeVisible();
  view.unmount();
  client.clear();
});
