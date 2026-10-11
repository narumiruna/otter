// @vitest-environment jsdom

import assert from "node:assert/strict";
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

test("disables custom-rate inputs while bank rates are loading", async () => {
  let resolveRequest: ((response: Response) => void) | undefined;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    });
  const user = userEvent.setup();
  const client = new QueryClient();
  const view = render(
    <QueryClientProvider client={client}>
      <WorkspaceProvider
        announce={() => undefined}
        offline={false}
        payload={payload}
        refreshCollection={async () => undefined}
      >
        <ExchangeRateSettings payload={payload} />
      </WorkspaceProvider>
    </QueryClientProvider>,
  );

  try {
    await user.click(view.getByText("換算方式"));
    await user.click(
      view.getByRole("button", { name: "載入台灣銀行預設匯率" }),
    );
    await waitFor(() =>
      expect(view.getByLabelText("USD → TWD")).toBeDisabled(),
    );

    assert.ok(resolveRequest);
    resolveRequest(
      new Response(
        JSON.stringify({
          baseCurrency: "TWD",
          fetchedAt: "2026-09-20T12:00:00.000Z",
          rates: bankRates,
          rateType: "spotMid",
          source: "BANK_OF_TAIWAN",
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      ),
    );
    await waitFor(() => expect(view.getByLabelText("USD → TWD")).toBeEnabled());
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
    await waitFor(() =>
      expect(view.queryByText("換算預覽")).not.toBeInTheDocument(),
    );
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

test("refreshes pristine rate defaults without replacing a dirty draft", async () => {
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
  const refreshedPayload: TripPayload = {
    ...automaticPayload,
    exchangeRateInfo: {
      ...bankRateInfo,
      fetchedAt: "2026-09-20T12:15:00.000Z",
    },
    trip: {
      ...automaticPayload.trip,
      exchangeRates: { ...bankRates, USD: 30.5 },
    },
  };
  const laterPayload: TripPayload = {
    ...refreshedPayload,
    exchangeRateInfo: {
      ...bankRateInfo,
      fetchedAt: "2026-09-20T12:30:00.000Z",
    },
    trip: {
      ...refreshedPayload.trip,
      exchangeRates: { ...bankRates, USD: 29 },
    },
  };
  const user = userEvent.setup();
  const client = new QueryClient();
  const settings = (current: TripPayload) => (
    <QueryClientProvider client={client}>
      <WorkspaceProvider
        announce={() => undefined}
        offline={false}
        payload={current}
        refreshCollection={async () => undefined}
      >
        <ExchangeRateSettings payload={current} />
      </WorkspaceProvider>
    </QueryClientProvider>
  );
  const view = render(settings(automaticPayload));

  await user.click(view.getByText("換算方式"));
  view.rerender(settings(refreshedPayload));
  await user.type(view.getByLabelText("EUR → TWD"), "40");
  expect(view.getByText(/總支出：.*3,050/)).toBeVisible();

  view.rerender(settings(laterPayload));
  expect(view.getByLabelText("EUR → TWD")).toHaveValue("40");
  expect(view.getByText(/總支出：.*3,050/)).toBeVisible();

  view.unmount();
  client.clear();
});

test("reinitializes rate drafts after the base currency changes", () => {
  const automaticPayload: TripPayload = {
    ...payload,
    exchangeRateInfo: bankRateInfo,
    trip: { ...payload.trip, exchangeRates: bankRates },
  };
  const rebasedPayload: TripPayload = {
    ...automaticPayload,
    trip: {
      ...automaticPayload.trip,
      baseCurrency: "USD",
      exchangeRates: {
        EUR: bankRates.EUR / bankRates.USD,
        JPY: bankRates.JPY / bankRates.USD,
        TWD: bankRates.TWD / bankRates.USD,
        USD: 1,
      },
    },
  };
  const client = new QueryClient();
  const settings = (current: TripPayload) => (
    <QueryClientProvider client={client}>
      <WorkspaceProvider
        announce={() => undefined}
        offline={false}
        payload={current}
        refreshCollection={async () => undefined}
      >
        <ExchangeRateSettings
          key={`${current.trip.id}:${current.trip.baseCurrency}`}
          payload={current}
        />
      </WorkspaceProvider>
    </QueryClientProvider>
  );
  const view = render(settings(automaticPayload));

  view.rerender(settings(rebasedPayload));

  expect(view.getByLabelText("USD → USD")).toHaveValue("1");
  expect(view.getByLabelText("TWD → USD")).toHaveValue("");
  expect(view.queryByLabelText("TWD → TWD")).not.toBeInTheDocument();
  view.unmount();
  client.clear();
});

test.each([
  {
    baseCurrency: "USD" as const,
    paymentCurrency: "KRW" as const,
    paymentMinor: 100000,
    amountMinor: 7500,
    display: "$75.00",
  },
  {
    baseCurrency: "KRW" as const,
    paymentCurrency: "USD" as const,
    paymentMinor: 10000,
    amountMinor: 133333,
    display: "₩133,333",
  },
])(
  "keeps missing-quote payment previews consistent with saved $baseCurrency balances",
  async ({
    baseCurrency,
    paymentCurrency,
    paymentMinor,
    amountMinor,
    display,
  }) => {
    const current: TripPayload = {
      ...payload,
      exchangeRateInfo: bankRateInfo,
      trip: {
        ...payload.trip,
        exchangeRates: bankRates,
        participants: [
          { id: "alice", name: "Alice" },
          { id: "bob", name: "Bob" },
        ],
        settlementPayments: [
          {
            id: "payment",
            fromId: "bob",
            toId: "alice",
            amountMinor: paymentMinor,
            currency: paymentCurrency,
            paidAt: "2026-09-20",
            note: "",
            createdAt: "2026-09-20T00:00:00.000Z",
          },
        ],
      },
    };
    const savedTrip = {
      ...current.trip,
      baseCurrency,
      exchangeRates:
        baseCurrency === "USD"
          ? {
              TWD: 1 / bankRates.USD,
              USD: 1,
              EUR: bankRates.EUR / bankRates.USD,
              JPY: bankRates.JPY / bankRates.USD,
            }
          : undefined,
    };
    const balances = calculateBalances(savedTrip);
    expect(balances.map((balance) => balance.amountMinor)).toEqual([
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
    try {
      const user = userEvent.setup();
      await user.selectOptions(
        view.getByLabelText("Base currency"),
        baseCurrency,
      );
      expect(view.getAllByText(display)).toHaveLength(2);
      await user.click(view.getByRole("button", { name: "Apply changes" }));
      await user.click(
        view.getByRole("button", { name: "Apply group preferences" }),
      );
      await waitFor(() =>
        expect(onPayload).toHaveBeenCalledWith(
          expect.objectContaining({ balances }),
        ),
      );
    } finally {
      view.unmount();
      client.clear();
    }
  },
);

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
