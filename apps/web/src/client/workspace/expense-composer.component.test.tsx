// @vitest-environment jsdom

import assert from "node:assert/strict";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import type { TripPayload } from "../client-support.js";
import { I18nProvider, useI18n } from "../i18n.js";
import { ExpenseComposer } from "./expense-composer.js";
import { WorkspaceProvider } from "./workspace-context.js";

function SwitchToEnglish() {
  const { setLocale } = useI18n();
  return (
    <button type="button" onClick={() => setLocale("en")}>
      Switch to English
    </button>
  );
}

const payload: TripPayload = {
  balances: [],
  settlements: [],
  trip: {
    baseCurrency: "TWD",
    createdAt: "2026-07-25T00:00:00.000Z",
    expenses: [],
    id: "trip_1",
    name: "測試旅行",
    ownerId: "user_1",
    participants: [
      { id: "a", name: "Alice" },
      { id: "b", name: "Bob" },
    ],
  },
};

test("expense composer previews the default equal split without a mutation", async () => {
  window.history.replaceState({}, "", "/?trip=trip_1&mode=add-expense");
  let fetchCount = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetchCount += 1;
    throw new Error("preview must not fetch");
  };
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
        <ExpenseComposer onCancel={() => undefined} trip={payload.trip} />
      </WorkspaceProvider>
    </QueryClientProvider>,
  );

  await user.type(view.getByLabelText("金額"), "1000");
  assert.match(
    view.getByText("Alice", { selector: "li span" }).parentElement
      ?.textContent ?? "",
    /\$500/,
  );
  assert.match(
    view.getByText("Bob", { selector: "li span" }).parentElement?.textContent ??
      "",
    /\$500/,
  );
  assert.equal(fetchCount, 0);

  view.unmount();
  client.clear();
  globalThis.fetch = originalFetch;
});

test("more details toggles category and tags without changing its summary", async () => {
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
        <ExpenseComposer onCancel={() => undefined} trip={payload.trip} />
      </WorkspaceProvider>
    </QueryClientProvider>,
  );

  const summary = view.getByText("更多資料").closest("summary");
  const details = summary?.closest("details");
  assert.ok(summary);
  assert.ok(details);
  expect(summary).toHaveTextContent("更多資料分類、標籤");
  expect(details.open).toBe(false);

  await user.click(summary);
  expect(details.open).toBe(true);
  expect(view.getByLabelText("分類")).toBeVisible();
  expect(view.getByLabelText(/標籤/)).toBeVisible();

  await user.click(summary);
  expect(details.open).toBe(false);

  view.unmount();
  client.clear();
});

test("switching locale clears expense validation from the previous locale", async () => {
  const user = userEvent.setup();
  const client = new QueryClient();
  const view = render(
    <I18nProvider initialLocale="zh-TW">
      <SwitchToEnglish />
      <QueryClientProvider client={client}>
        <WorkspaceProvider
          announce={() => undefined}
          offline={false}
          payload={payload}
          refreshCollection={async () => undefined}
        >
          <ExpenseComposer onCancel={() => undefined} trip={payload.trip} />
        </WorkspaceProvider>
      </QueryClientProvider>
    </I18nProvider>,
  );

  await user.click(view.getByRole("button", { name: "記錄支出" }));
  expect(await view.findByText("請輸入支出描述")).toBeVisible();
  expect(view.getByText("請輸入支出金額")).toBeVisible();

  await user.click(view.getByRole("button", { name: "Switch to English" }));

  expect(view.queryByText("請輸入支出描述")).toBeNull();
  expect(view.queryByText("請輸入支出金額")).toBeNull();
  await user.click(view.getByRole("button", { name: "Record expense" }));
  expect(await view.findByText("Enter an expense description")).toBeVisible();
  expect(view.getByText("Enter an expense amount")).toBeVisible();

  view.unmount();
  client.clear();
});
