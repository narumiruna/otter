// @vitest-environment jsdom

import assert from "node:assert/strict";
import { Theme } from "@radix-ui/themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { test } from "vitest";
import type { TripPayload } from "../client-support.js";
import { translations } from "../i18n/messages.js";
import { I18nProvider } from "../i18n.js";
import { MorePage } from "./more-page.js";
import { WorkspaceProvider } from "./workspace-context.js";

const editorPayload: TripPayload = {
  balances: [],
  collaborators: [],
  currentUserRole: "editor",
  settlements: [],
  shareLinks: [],
  trip: {
    baseCurrency: "TWD",
    createdAt: "2026-07-25T00:00:00.000Z",
    expenses: [],
    id: "trip_editor",
    name: "協作者群組",
    ownerId: "owner",
    participants: [{ id: "person", name: "Editor" }],
  },
};

test("guest More view retains trip data tools but hides account and owner backup actions", () => {
  window.history.replaceState({}, "", "/?view=more");
  const client = new QueryClient();
  const view = render(
    <QueryClientProvider client={client}>
      <WorkspaceProvider
        announce={() => undefined}
        offline={false}
        payload={editorPayload}
        refreshCollection={async () => undefined}
      >
        <MorePage
          guestShare
          onCopied={() => undefined}
          onDeleted={() => undefined}
          onRestored={() => undefined}
          payload={editorPayload}
        />
      </WorkspaceProvider>
    </QueryClientProvider>,
  );
  view.container.querySelector("details")?.setAttribute("open", "");
  assert.ok(view.getByText("匯出支出 CSV"));
  assert.equal(view.queryByText("下載完整備份"), null);
  assert.equal(view.queryByText("還原 JSON 備份"), null);
  assert.equal(view.queryByText("複製群組"), null);
  view.unmount();
  client.clear();
});

test("editor More view omits every owner-only mutation surface", () => {
  window.history.replaceState({}, "", "/?view=more");
  const client = new QueryClient();
  const view = render(
    <QueryClientProvider client={client}>
      <WorkspaceProvider
        announce={() => undefined}
        offline={false}
        payload={editorPayload}
        refreshCollection={async () => undefined}
      >
        <MorePage
          onCopied={() => undefined}
          onDeleted={() => undefined}
          onRestored={() => undefined}
          payload={editorPayload}
        />
      </WorkspaceProvider>
    </QueryClientProvider>,
  );

  assert.ok(view.getAllByText("資料與匯出").length);
  assert.equal(view.queryByText("分享與權限"), null);
  assert.equal(view.queryByText("群組偏好"), null);
  assert.equal(view.queryByText("換算方式"), null);
  assert.equal(view.queryByText("群組生命週期"), null);
  assert.equal(view.queryByText("複製群組"), null);

  view.unmount();
  client.clear();
});

test("owner More view keeps Visa settlement currency settings without manual rates or today's preview", () => {
  const client = new QueryClient();
  const payload: TripPayload = {
    ...editorPayload,
    currentUserRole: "owner",
    exchangeRateInfo: {
      source: "custom",
      customRates: { USD: 30 },
      defaults: { source: "visa" },
    },
    trip: {
      ...editorPayload.trip,
      exchangeRates: { TWD: 1, USD: 30 },
      visaSettlementEnabled: true,
      visaSettlementCurrency: "TWD",
    },
  };
  const view = render(
    <Theme>
      <I18nProvider initialLocale="en">
        <QueryClientProvider client={client}>
          <WorkspaceProvider
            announce={() => undefined}
            offline={false}
            payload={payload}
            refreshCollection={async () => undefined}
          >
            <MorePage
              onCopied={() => undefined}
              onDeleted={() => undefined}
              onRestored={() => undefined}
              payload={payload}
            />
          </WorkspaceProvider>
        </QueryClientProvider>
      </I18nProvider>
    </Theme>,
  );
  for (const details of view.container.querySelectorAll("details")) {
    details.setAttribute("open", "");
  }
  assert.ok(view.getAllByText("Group preferences").length);
  assert.ok(view.getByText("Visa-based settlements"));
  assert.equal(view.getByRole("switch").getAttribute("aria-checked"), "true");
  assert.equal(
    (
      view.getByRole("combobox", {
        name: "Settlement currency",
      }) as HTMLSelectElement
    ).value,
    "TWD",
  );
  assert.equal(view.queryByText(translations.en.currencyConversion), null);
  assert.equal(view.queryByText(translations.en.customExchangeRates), null);
  assert.equal(view.queryByLabelText("USD → TWD"), null);
  assert.equal(
    view.container.querySelector('input[inputmode="decimal"]'),
    null,
  );
  assert.equal(
    view.queryByRole("button", { name: translations.en.previewVisaRates }),
    null,
  );
  assert.equal(view.queryByText(translations.en.visaRatesPreviewOnly), null);
  view.unmount();
  client.clear();
});

test("owner can duplicate an archived group from More view", () => {
  const client = new QueryClient();
  const payload: TripPayload = {
    ...editorPayload,
    currentUserRole: "owner",
    trip: { ...editorPayload.trip, archivedAt: "2026-07-26T00:00:00.000Z" },
  };
  const view = render(
    <QueryClientProvider client={client}>
      <WorkspaceProvider
        announce={() => undefined}
        offline={false}
        payload={payload}
        refreshCollection={async () => undefined}
      >
        <MorePage
          onCopied={() => undefined}
          onDeleted={() => undefined}
          onRestored={() => undefined}
          payload={payload}
        />
      </WorkspaceProvider>
    </QueryClientProvider>,
  );
  assert.ok(view.getByRole("button", { name: "複製群組" }));
  view.unmount();
  client.clear();
});
