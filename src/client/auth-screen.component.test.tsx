// @vitest-environment jsdom

import assert from "node:assert/strict";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { test } from "vitest";
import { AuthScreen } from "./auth-screen.js";

test("auth screen progressively discloses registration and returns to login", async () => {
  const user = userEvent.setup();
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
});
