// @vitest-environment jsdom

import assert from "node:assert/strict";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { usernameValidationMessage } from "../shared/username.js";
import { AuthScreen } from "./auth-screen.js";

test("auth screen progressively discloses registration and returns to login", async () => {
  const user = userEvent.setup();
  const view = render(
    <AuthScreen onLogin={() => undefined} onRegister={() => undefined} />,
  );

  assert.ok(view.getByRole("heading", { name: "登入" }));
  assert.equal(view.queryByLabelText("名稱"), null);
  assert.equal(view.getByText("WELCOME BACK").getAttribute("lang"), "en");
  await user.click(view.getByRole("button", { name: "建立帳號" }));
  assert.ok(view.getByRole("heading", { name: "建立帳號" }));
  assert.ok(view.getByLabelText("名稱"));
  assert.equal(
    view.getByText("START A NEW JOURNEY").getAttribute("lang"),
    "en",
  );
  await user.click(view.getByRole("button", { name: "返回登入" }));
  assert.ok(view.getByRole("heading", { name: "登入" }));

  view.unmount();
});

test("registration validates and submits username instead of email", async () => {
  const user = userEvent.setup();
  const onRegister = vi.fn();
  const view = render(
    <AuthScreen onLogin={() => undefined} onRegister={onRegister} />,
  );
  await user.click(view.getByRole("button", { name: "建立帳號" }));
  const username = view.getByLabelText("Username");
  expect(username).toHaveAttribute("type", "text");
  expect(username).toHaveAttribute("autocomplete", "username");
  expect(view.queryByLabelText(/email/i)).toBeNull();
  await user.type(view.getByLabelText("名稱"), "Alice");
  await user.type(view.getByLabelText("密碼"), "password123");
  await user.type(username, "alice@example.com");
  await user.click(view.getByRole("button", { name: "建立帳號" }));
  expect(
    await view.findByText(usernameValidationMessage, { exact: true }),
  ).toBeVisible();
  expect(onRegister).not.toHaveBeenCalled();
  await user.clear(username);
  await user.type(username, "Alice_123");
  await user.click(view.getByRole("button", { name: "建立帳號" }));
  await waitFor(() => expect(onRegister).toHaveBeenCalled());
  expect(onRegister.mock.calls[0]?.[0]).toEqual({
    username: "Alice_123",
    name: "Alice",
    password: "password123",
  });
  view.unmount();
});

test.each(["alice_123", "legacy@example.com"])(
  "login submits username %s",
  async (username) => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    const view = render(
      <AuthScreen onLogin={onLogin} onRegister={() => undefined} />,
    );
    await user.type(view.getByLabelText("Username"), username);
    await user.type(view.getByLabelText("密碼"), "password123");
    await user.click(view.getByRole("button", { name: "登入" }));
    await waitFor(() => expect(onLogin).toHaveBeenCalled());
    expect(onLogin.mock.calls[0]?.[0]).toEqual({
      username,
      password: "password123",
    });
    view.unmount();
  },
);
