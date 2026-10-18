// @vitest-environment jsdom

import { Theme } from "@radix-ui/themes";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { AccountMenu } from "./account-menu.js";
import { languageOptions } from "./i18n/locales.js";
import { translations } from "./i18n/messages.js";
import { I18nProvider } from "./i18n.js";

const account = { id: "user-1", name: "Alice", username: "alice" };

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

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
  expect(
    screen.getByRole("menuitem", { name: "語言 正體中文" }),
  ).toHaveAttribute("aria-haspopup", "dialog");
  expect(screen.getAllByRole("menuitem")).toHaveLength(3);
  expect(screen.queryByRole("menuitem", { name: "English" })).toBeNull();
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
  await user.click(screen.getByRole("menuitem", { name: "語言 正體中文" }));
  const dialog = await screen.findByRole("dialog", { name: "語言" });
  expect(screen.queryByRole("menu")).toBeNull();
  await user.click(within(dialog).getByRole("button", { name: "English" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

  expect(
    screen.getByRole("button", { name: "Alice's account menu" }),
  ).toBeVisible();

  await user.click(
    screen.getByRole("button", { name: "Alice's account menu" }),
  );
  await user.click(screen.getByRole("menuitem", { name: "Sign out" }));
  expect(onSignOut).toHaveBeenCalledOnce();
});

test.each(languageOptions)(
  "selects $locale in the language dialog and marks the current language",
  async ({ locale, label }) => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole("button", { name: "Alice 的帳號選單" }));
    await user.click(screen.getByRole("menuitem", { name: "語言 正體中文" }));
    const dialog = await screen.findByRole("dialog", { name: "語言" });
    for (const option of languageOptions) {
      expect(
        within(dialog).getByRole("button", { name: option.label }),
      ).toHaveAttribute("lang", option.locale);
    }
    const selected = within(dialog).getByRole("button", { name: "正體中文" });
    expect(selected).toHaveFocus();
    expect(selected.scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
    await user.click(within(dialog).getByRole("button", { name: label }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.documentElement.lang).toBe(locale);
    const trigger = screen.getByRole("button", {
      name: translations[locale].nameSAccountMenu({ name: "Alice" }),
    });
    expect(trigger).toHaveFocus();
    await user.click(trigger);
    expect(screen.getAllByRole("menuitem")).toHaveLength(3);
    expect(
      screen.getByRole("menuitem", { name: translations[locale].signOut }),
    ).toBeVisible();
    await user.click(
      screen.getByRole("menuitem", {
        name: `${translations[locale].language} ${label}`,
      }),
    );
    const reopened = await screen.findByRole("dialog", {
      name: translations[locale].language,
    });
    for (const option of languageOptions) {
      expect(
        within(reopened).getByRole("button", { name: option.label }),
      ).toHaveAttribute("aria-pressed", String(option.locale === locale));
    }
    expect(within(reopened).getByRole("button", { name: label })).toHaveFocus();
  },
);

test.each(["Escape", "取消", "關閉"])(
  "%s dismisses the language dialog without changing the language",
  async (action) => {
    const user = userEvent.setup();
    renderMenu();
    const trigger = screen.getByRole("button", { name: "Alice 的帳號選單" });
    await user.click(trigger);
    await user.click(screen.getByRole("menuitem", { name: "語言 正體中文" }));
    const dialog = await screen.findByRole("dialog", { name: "語言" });
    if (action === "Escape") await user.keyboard("{Escape}");
    else await user.click(within(dialog).getByRole("button", { name: action }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.documentElement.lang).toBe("zh-TW");
    expect(trigger).toHaveFocus();
    await user.click(trigger);
    expect(screen.getByRole("menuitem", { name: "登出" })).toBeVisible();
  },
);

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
