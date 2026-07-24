import assert from "node:assert/strict";
import test from "node:test";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JSDOM } from "jsdom";
import { AuthScreen } from "./auth-screen.js";

function installDom() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
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

test("auth screen progressively discloses registration and returns to login", async () => {
  const dom = installDom();
  const user = userEvent.setup({ document: dom.window.document });
  const view = render(
    <AuthScreen onLogin={() => undefined} onRegister={() => undefined} />,
  );

  assert.ok(view.getByRole("heading", { name: "登入" }));
  assert.equal(view.queryByLabelText("名稱"), null);
  await user.click(view.getByRole("button", { name: "建立帳號" }));
  assert.ok(view.getByRole("heading", { name: "建立帳號" }));
  assert.ok(view.getByLabelText("名稱"));
  await user.click(view.getByRole("button", { name: "返回登入" }));
  assert.ok(view.getByRole("heading", { name: "登入" }));

  view.unmount();
  dom.window.close();
});
