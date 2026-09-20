// @vitest-environment jsdom

import { usernameValidationMessage } from "@narumitw/otter-core/username";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { AccountUsernameDialog } from "./account-username-dialog.js";

const account = { id: "user-1", name: "Alice", username: "alice" };

test("validates and submits a username change", async () => {
  const user = userEvent.setup();
  const onUpdate = vi.fn(async () => undefined);
  render(
    <AccountUsernameDialog
      offline={false}
      onUpdate={onUpdate}
      user={account}
    />,
  );

  await user.click(screen.getByRole("button", { name: "管理 Alice 的帳號" }));
  const input = screen.getByLabelText("Username");
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
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("shows an identical display name and username only once", () => {
  render(
    <AccountUsernameDialog
      offline={false}
      onUpdate={vi.fn()}
      user={{ ...account, name: "alice" }}
    />,
  );
  expect(screen.getAllByText("alice")).toHaveLength(1);
  expect(screen.queryByText("@alice")).not.toBeInTheDocument();
});

test("marks a distinct username with @", () => {
  render(
    <AccountUsernameDialog offline={false} onUpdate={vi.fn()} user={account} />,
  );
  expect(screen.getByText("Alice")).toBeVisible();
  expect(screen.getByText("@alice")).toBeVisible();
});

test("disables username changes while offline", () => {
  render(
    <AccountUsernameDialog
      offline
      onUpdate={vi.fn(async () => undefined)}
      user={account}
    />,
  );

  expect(
    screen.getByRole("button", { name: "管理 Alice 的帳號" }),
  ).toBeDisabled();
});
