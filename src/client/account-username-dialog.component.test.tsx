// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { usernameValidationMessage } from "../shared/username.js";
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

  await user.click(
    screen.getByRole("button", { name: "修改 Alice 的 Username" }),
  );
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

test("disables username changes while offline", () => {
  render(
    <AccountUsernameDialog
      offline
      onUpdate={vi.fn(async () => undefined)}
      user={account}
    />,
  );

  expect(
    screen.getByRole("button", { name: "修改 Alice 的 Username" }),
  ).toBeDisabled();
});
