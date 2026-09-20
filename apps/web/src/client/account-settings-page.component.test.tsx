// @vitest-environment jsdom

import { usernameValidationMessage } from "@narumitw/otter-core/username";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import {
  AccountSettingsButton,
  AccountSettingsPage,
} from "./account-settings-page.js";
import { I18nProvider } from "./i18n.js";

vi.mock("./api-token-settings.js", () => ({
  ApiTokenSettings: ({
    onMutationChange,
  }: {
    onMutationChange?: (active: boolean) => void;
  }) => (
    <div>
      <button onClick={() => onMutationChange?.(true)} type="button">
        Start token mutation
      </button>
      <button onClick={() => onMutationChange?.(false)} type="button">
        Finish token mutation
      </button>
    </div>
  ),
}));

const account = { id: "user-1", name: "Alice", username: "alice" };

test("renders account settings as a page and submits a username change", async () => {
  const user = userEvent.setup();
  const onClose = vi.fn();
  const onUpdate = vi.fn(async () => undefined);
  render(
    <AccountSettingsPage
      offline={false}
      onClose={onClose}
      onUpdate={onUpdate}
      user={account}
    />,
  );

  expect(screen.getByRole("region", { name: "帳號設定" })).toBeVisible();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { level: 2, name: "帳號設定" }),
    ).toHaveFocus(),
  );
  const input = screen.getByRole("textbox", { name: "Username" });
  expect(input).toHaveValue("alice");

  await user.clear(input);
  await user.type(input, "invalid username");
  await user.click(screen.getByRole("button", { name: "儲存" }));
  expect(await screen.findByText(usernameValidationMessage)).toBeVisible();
  expect(onUpdate).not.toHaveBeenCalled();

  await user.clear(input);
  await user.type(input, "New_Alice");
  await user.click(screen.getByRole("button", { name: "儲存" }));
  expect(onUpdate).toHaveBeenCalledWith("New_Alice");
  expect(onClose).toHaveBeenCalledOnce();
});

test("closes the settings page without saving", async () => {
  const user = userEvent.setup();
  const onClose = vi.fn();
  const onUpdate = vi.fn();
  render(
    <AccountSettingsPage
      offline={false}
      onClose={onClose}
      onUpdate={onUpdate}
      user={account}
    />,
  );

  await user.click(screen.getByRole("button", { name: "取消" }));
  expect(onClose).toHaveBeenCalledOnce();
  expect(onUpdate).not.toHaveBeenCalled();
});

test("blocks closing and username submission during a token mutation", async () => {
  const user = userEvent.setup();
  const onClose = vi.fn();
  const onUpdate = vi.fn();
  render(
    <AccountSettingsPage
      offline={false}
      onClose={onClose}
      onUpdate={onUpdate}
      user={account}
    />,
  );

  await user.click(
    screen.getByRole("button", { name: "Start token mutation" }),
  );
  const cancel = screen.getByRole("button", { name: "取消" });
  const save = screen.getByRole("button", { name: "儲存" });
  expect(cancel).toBeDisabled();
  expect(save).toBeDisabled();

  const form = save.closest("form");
  if (!form) throw new Error("Account settings form not found");
  fireEvent.submit(form);
  expect(onUpdate).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();

  await user.click(
    screen.getByRole("button", { name: "Finish token mutation" }),
  );
  expect(cancel).toBeEnabled();
  expect(save).toBeEnabled();
});

test("shows an identical display name and username only once", () => {
  render(
    <AccountSettingsButton
      active={false}
      onOpen={vi.fn()}
      user={{ ...account, name: "alice" }}
    />,
  );
  expect(screen.getAllByText("alice")).toHaveLength(1);
  expect(screen.queryByText("@alice")).not.toBeInTheDocument();
});

test("marks a distinct username with @ and opens account settings", async () => {
  const user = userEvent.setup();
  const onOpen = vi.fn();
  render(
    <AccountSettingsButton active={false} onOpen={onOpen} user={account} />,
  );

  expect(screen.getByText("Alice")).toBeVisible();
  expect(screen.getByText("@alice")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "管理 Alice 的帳號" }));
  expect(onOpen).toHaveBeenCalledOnce();
});

test("changes the language from account settings", async () => {
  const user = userEvent.setup();
  render(
    <I18nProvider initialLocale="zh-TW">
      <AccountSettingsPage
        offline
        onClose={vi.fn()}
        onUpdate={vi.fn()}
        user={account}
      />
    </I18nProvider>,
  );

  await user.selectOptions(
    screen.getByRole("combobox", { name: "語言" }),
    "en",
  );

  expect(
    screen.getByRole("heading", { level: 2, name: "Account settings" }),
  ).toBeVisible();
});
