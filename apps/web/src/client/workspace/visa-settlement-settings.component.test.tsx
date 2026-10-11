// @vitest-environment jsdom

import { Theme } from "@radix-ui/themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import type { TripPayload } from "../client-support.js";
import { I18nProvider } from "../i18n.js";
import { VisaSettlementSettings } from "./visa-settlement-settings.js";
import { WorkspaceProvider } from "./workspace-context.js";

const initial: TripPayload = {
  trip: {
    id: "trip",
    ownerId: "user",
    name: "Tokyo",
    baseCurrency: "JPY",
    createdAt: "2026-07-05T00:00:00Z",
    participants: [{ id: "alice", name: "Alice" }],
    expenses: [],
  },
  balances: [],
  settlements: [],
  currentUserRole: "owner",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function mount(payload = initial, offline = false) {
  const client = new QueryClient();
  function Harness() {
    const [current, setCurrent] = useState(payload);
    return (
      <WorkspaceProvider
        announce={() => undefined}
        offline={offline}
        payload={current}
        onPayload={setCurrent}
        refreshCollection={async () => undefined}
      >
        <VisaSettlementSettings payload={current} expanded />
      </WorkspaceProvider>
    );
  }
  const view = render(
    <Theme>
      <I18nProvider initialLocale="en">
        <QueryClientProvider client={client}>
          <Harness />
        </QueryClientProvider>
      </I18nProvider>
    </Theme>,
  );
  return {
    ...view,
    close: () => {
      view.unmount();
      client.clear();
    },
  };
}

test("starts off, enables all expenses, and can return to the original mode", async () => {
  const requests: unknown[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      const body: {
        enabled: boolean;
        currency: "TWD" | "JPY" | "USD" | "EUR";
      } = JSON.parse(String(init.body));
      requests.push(body);
      return Response.json({
        ...initial,
        trip: {
          ...initial.trip,
          visaSettlementEnabled: body.enabled,
          visaSettlementCurrency: body.currency,
        },
      });
    }),
  );
  const user = userEvent.setup();
  const view = mount();
  const control = view.getByRole("switch", {
    name: "Convert all expenses with dated Visa rates and settle in the selected currency",
  });
  expect(control).not.toBeChecked();
  expect(view.getByText(/Off by default/)).toHaveTextContent("including cash");
  expect(
    view.getByRole("combobox", { name: "Settlement currency" }),
  ).toHaveValue("JPY");
  await user.selectOptions(view.getByRole("combobox"), "USD");
  await user.click(control);
  await waitFor(() => expect(control).toBeChecked());
  expect(globalThis.fetch).toHaveBeenCalledWith(
    "/api/trips/trip/visa-settlement",
    expect.objectContaining({ method: "PATCH" }),
  );
  await user.selectOptions(view.getByRole("combobox"), "EUR");
  await user.click(view.getByRole("button", { name: "Apply changes" }));
  await waitFor(() => expect(view.getByText("On · EUR")).toBeVisible());
  await user.click(control);
  await waitFor(() => expect(control).not.toBeChecked());
  expect(requests).toEqual([
    { enabled: true, currency: "USD" },
    { enabled: true, currency: "EUR" },
    { enabled: false, currency: "EUR" },
  ]);
  view.close();
});

test("keeps the setting off and shows an error when Visa is unavailable", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json(
        { error: "目前無法取得 Visa 匯率，設定未變更，請稍後再試" },
        { status: 502 },
      ),
    ),
  );
  const view = mount();
  await userEvent.setup().click(view.getByRole("switch"));
  expect(await view.findByRole("alert")).toHaveTextContent(
    "Visa rates are unavailable. The setting was not changed. Try again later.",
  );
  expect(view.getByRole("switch")).not.toBeChecked();
  view.close();
});

test("disables the control while offline", () => {
  const view = mount(initial, true);
  expect(view.getByRole("switch")).toBeDisabled();
  view.close();
});

test.each([
  { ...initial, currentUserRole: "editor" as const },
  { ...initial, readonly: true },
  { ...initial, trip: { ...initial.trip, archivedAt: initial.trip.createdAt } },
])("does not expose the control to read-only groups or editors", (payload) => {
  const view = mount(payload);
  expect(view.queryByRole("switch")).toBeNull();
  view.close();
});
