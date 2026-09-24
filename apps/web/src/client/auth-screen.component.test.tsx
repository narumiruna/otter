// @vitest-environment jsdom

import assert from "node:assert/strict";
import { usernameValidationMessage } from "@narumitw/otter-core/username";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
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
  assert.equal(view.queryByLabelText("名稱"), null);
  assert.equal(
    view.getByText("START A NEW JOURNEY").getAttribute("lang"),
    "en",
  );
  await user.click(view.getByRole("button", { name: "返回登入" }));
  assert.ok(view.getByRole("heading", { name: "登入" }));

  view.unmount();
});

test("registration only validates and submits username and password", async () => {
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
  expect(view.queryByLabelText("名稱")).toBeNull();
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
    password: "password123",
  });
  view.unmount();
});

test("passkey signup needs only a valid username when supported", async () => {
  const user = userEvent.setup();
  const onPasskeyRegister = vi.fn();
  const view = render(
    <AuthScreen
      onLogin={() => undefined}
      onRegister={() => undefined}
      onPasskeyRegister={onPasskeyRegister}
      passkeySupported
    />,
  );
  await user.click(view.getByRole("button", { name: "建立帳號" }));
  const passkeyButton = view.getByRole("button", {
    name: "使用 Passkey 建立帳號",
  });
  await user.click(passkeyButton);
  expect(onPasskeyRegister).not.toHaveBeenCalled();
  await user.type(view.getByLabelText("Username"), "invalid name");
  await user.click(passkeyButton);
  expect(onPasskeyRegister).not.toHaveBeenCalled();
  await user.clear(view.getByLabelText("Username"));
  await user.type(view.getByLabelText("Username"), "Alice_123");
  await user.click(passkeyButton);
  await waitFor(() =>
    expect(onPasskeyRegister).toHaveBeenCalledWith("Alice_123"),
  );
  expect(view.getByLabelText("密碼")).toHaveValue("");
  view.rerender(
    <AuthScreen
      busyAction="passkey-register"
      onLogin={() => undefined}
      onRegister={() => undefined}
      onPasskeyRegister={onPasskeyRegister}
      passkeySupported
    />,
  );
  expect(
    view.getByRole("button", { name: "正在使用 Passkey 建立帳號…" }),
  ).toBeDisabled();
  view.rerender(
    <AuthScreen
      onLogin={() => undefined}
      onRegister={() => undefined}
      passkeySupported={false}
    />,
  );
  expect(
    view.queryByRole("button", { name: "使用 Passkey 建立帳號" }),
  ).toBeNull();
  view.unmount();
});

test("passkey login is offered only when supported and invokes its callback", async () => {
  const user = userEvent.setup();
  const onPasskeyLogin = vi.fn();
  const view = render(
    <AuthScreen
      onLogin={() => undefined}
      onPasskeyLogin={onPasskeyLogin}
      onRegister={() => undefined}
      passkeySupported
    />,
  );

  await user.click(view.getByRole("button", { name: "使用 Passkey 登入" }));
  expect(onPasskeyLogin).toHaveBeenCalledOnce();

  for (const busyAction of ["login", "passkey"]) {
    view.rerender(
      <AuthScreen
        busyAction={busyAction}
        onLogin={() => undefined}
        onPasskeyLogin={onPasskeyLogin}
        onRegister={() => undefined}
        passkeySupported
      />,
    );
    expect(
      view.getByRole("button", {
        name:
          busyAction === "passkey"
            ? "正在使用 Passkey 登入…"
            : "使用 Passkey 登入",
      }),
    ).toBeDisabled();
    expect(
      view.getByRole("button", {
        name: busyAction === "login" ? "登入中…" : "登入",
      }),
    ).toBeDisabled();
  }

  view.rerender(
    <AuthScreen
      onLogin={() => undefined}
      onPasskeyLogin={onPasskeyLogin}
      onRegister={() => undefined}
      passkeySupported={false}
    />,
  );
  expect(view.queryByRole("button", { name: "使用 Passkey 登入" })).toBeNull();
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
