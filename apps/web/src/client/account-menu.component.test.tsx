// @vitest-environment jsdom

import { Theme } from "@radix-ui/themes";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { AccountMenu } from "./account-menu.js";
import { I18nProvider } from "./i18n.js";

const account = { id: "user-1", name: "Alice", username: "alice" };

function renderMenu({
  accountSettingsActive = false,
  onOpenAccountSettings = vi.fn(),
  onSignOut = vi.fn(),
  signOutDisabled = false,
  signingOut = false,
}: {
  accountSettingsActive?: boolean;
  onOpenAccountSettings?: () => void;
  onSignOut?: () => Promise<void> | void;
  signOutDisabled?: boolean;
  signingOut?: boolean;
} = {}) {
  return render(
    <Theme>
      <I18nProvider initialLocale="zh-TW">
        <AccountMenu
          accountSettingsActive={accountSettingsActive}
          onOpenAccountSettings={onOpenAccountSettings}
          onSignOut={onSignOut}
          signOutDisabled={signOutDisabled}
          signingOut={signingOut}
          user={account}
        />
      </I18nProvider>
    </Theme>,
  );
}

test("opens one account menu trigger with identity and account actions", async () => {
  const user = userEvent.setup();
  const onOpenAccountSettings = vi.fn();
  renderMenu({ onOpenAccountSettings });

  const trigger = screen.getByRole("button", {
    name: "Alice 的帳號選單",
  });
  expect(trigger).toHaveTextContent("Alice");
  expect(trigger).not.toHaveAttribute("aria-current");
  expect(screen.queryByText("@alice")).not.toBeInTheDocument();

  await user.click(trigger);

  expect(
    await screen.findByRole("menu", { name: "Alice 的帳號選單" }),
  ).toBeVisible();
  expect(screen.getByText("@alice")).toBeVisible();
  expect(screen.getByText("語言")).toBeVisible();
  expect(screen.getByRole("menuitem", { name: "登出" })).toBeVisible();

  await user.click(screen.getByRole("menuitem", { name: "帳號設定" }));
  await waitFor(() => expect(onOpenAccountSettings).toHaveBeenCalledOnce());
});

test("marks account settings as the current page", async () => {
  const user = userEvent.setup();
  renderMenu({ accountSettingsActive: true });

  const trigger = screen.getByRole("button", {
    name: "Alice 的帳號選單",
  });
  expect(trigger).toHaveAttribute("aria-current", "page");

  await user.click(trigger);
  expect(screen.getByRole("menuitem", { name: "帳號設定" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("changes language and signs out from the account menu", async () => {
  const user = userEvent.setup();
  const onSignOut = vi.fn();
  renderMenu({ onSignOut });

  await user.click(screen.getByRole("button", { name: "Alice 的帳號選單" }));
  await user.click(screen.getByRole("menuitem", { name: "English" }));

  expect(
    screen.getByRole("button", { name: "Alice's account menu" }),
  ).toBeVisible();

  await user.click(
    screen.getByRole("button", { name: "Alice's account menu" }),
  );
  await user.click(screen.getByRole("menuitem", { name: "Sign out" }));
  expect(onSignOut).toHaveBeenCalledOnce();
});

test("disables sign out while it is unavailable", async () => {
  const user = userEvent.setup();
  const onSignOut = vi.fn();
  renderMenu({ onSignOut, signOutDisabled: true, signingOut: true });

  await user.click(screen.getByRole("button", { name: "Alice 的帳號選單" }));
  const signOut = screen.getByRole("menuitem", { name: "登出中…" });
  expect(signOut).toHaveAttribute("aria-disabled", "true");
  await user.click(signOut);
  expect(onSignOut).not.toHaveBeenCalled();
});
