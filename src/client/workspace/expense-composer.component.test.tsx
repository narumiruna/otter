import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JSDOM } from "jsdom";
import type { TripPayload } from "../client-support.js";
import { ExpenseComposer } from "./expense-composer.js";
import { WorkspaceProvider } from "./workspace-context.js";

function installDom() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/?trip=trip_1&mode=add-expense",
  });
  Object.assign(globalThis, {
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    window: dom.window,
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: dom.window.navigator,
  });
  Object.defineProperty(dom.window.HTMLElement.prototype, "attachEvent", {
    configurable: true,
    value: () => undefined,
  });
  Object.defineProperty(dom.window.HTMLElement.prototype, "detachEvent", {
    configurable: true,
    value: () => undefined,
  });
  return dom;
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
  const dom = installDom();
  let fetchCount = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetchCount += 1;
    throw new Error("preview must not fetch");
  };
  const user = userEvent.setup({ document: dom.window.document });
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
  dom.window.close();
});
