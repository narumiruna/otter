// @vitest-environment jsdom

import assert from "node:assert/strict";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { test } from "vitest";
import type { TripPayload } from "../client-support.js";
import { ExpenseComposer } from "./expense-composer.js";
import { WorkspaceProvider } from "./workspace-context.js";

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
