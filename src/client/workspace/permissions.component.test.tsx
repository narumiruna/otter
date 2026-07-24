import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { JSDOM } from "jsdom";
import type { TripPayload } from "../client-support.js";
import { MorePage } from "./more-page.js";
import { WorkspaceProvider } from "./workspace-context.js";

function installDom() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/?view=more",
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
  return dom;
}

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

test("editor More view omits every owner-only mutation surface", () => {
  const dom = installDom();
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
          onDeleted={() => undefined}
          onRestored={() => undefined}
          payload={editorPayload}
        />
      </WorkspaceProvider>
    </QueryClientProvider>,
  );

  assert.ok(view.getByText("資料與匯出"));
  assert.equal(view.queryByText("分享與權限"), null);
  assert.equal(view.queryByText("群組偏好"), null);
  assert.equal(view.queryByText("換算方式"), null);
  assert.equal(view.queryByText("群組生命週期"), null);

  view.unmount();
  client.clear();
  dom.window.close();
});
