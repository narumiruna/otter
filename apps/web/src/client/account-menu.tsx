import {
  CheckIcon,
  ChevronDownIcon,
  ExitIcon,
  GearIcon,
  GlobeIcon,
} from "@radix-ui/react-icons";
import { DropdownMenu } from "@radix-ui/themes";
import { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import type { User } from "./client-support.js";
import { useI18n } from "./i18n.js";

type AccountMenuProps = {
  accountSettingsActive: boolean;
  onOpenAccountSettings: () => void;
  onSignOut: () => Promise<void> | void;
  signOutDisabled: boolean;
  signingOut: boolean;
  user: User;
};

export const AccountMenu = forwardRef<HTMLButtonElement, AccountMenuProps>(
  function AccountMenu(
    {
      accountSettingsActive,
      onOpenAccountSettings,
      onSignOut,
      signOutDisabled,
      signingOut,
      user,
    },
    forwardedRef,
  ) {
    const { locale, messages, setLocale } = useI18n();

    return (
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button
            ref={forwardedRef}
            aria-current={accountSettingsActive ? "page" : undefined}
            aria-label={messages.nameSAccountMenu({ name: user.name })}
            className="user-account-button"
            variant="outline"
          >
            <span className="user-avatar" aria-hidden="true">
              {user.name.trim().charAt(0).toLocaleUpperCase() || "O"}
            </span>
            <span className="account-menu-trigger-name">{user.name}</span>
            <ChevronDownIcon
              aria-hidden="true"
              className="account-menu-chevron"
            />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
          align="end"
          aria-label={messages.nameSAccountMenu({ name: user.name })}
          className="account-menu-content"
          sideOffset={8}
        >
          <DropdownMenu.Label className="account-menu-identity">
            <strong>{user.name}</strong>
            {user.username !== user.name ? (
              <small>@{user.username}</small>
            ) : null}
          </DropdownMenu.Label>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            aria-current={accountSettingsActive ? "page" : undefined}
            onSelect={onOpenAccountSettings}
          >
            <GearIcon aria-hidden="true" />
            {messages.accountSettings}
          </DropdownMenu.Item>
          <DropdownMenu.Label className="account-menu-language-label">
            <GlobeIcon aria-hidden="true" />
            {messages.language}
          </DropdownMenu.Label>
          <DropdownMenu.Item
            aria-current={locale === "zh-TW" ? "true" : undefined}
            onSelect={() => setLocale("zh-TW")}
          >
            <span className="account-menu-check" aria-hidden="true">
              {locale === "zh-TW" ? <CheckIcon /> : null}
            </span>
            {messages.traditionalChinese}
          </DropdownMenu.Item>
          <DropdownMenu.Item
            aria-current={locale === "en" ? "true" : undefined}
            onSelect={() => setLocale("en")}
          >
            <span className="account-menu-check" aria-hidden="true">
              {locale === "en" ? <CheckIcon /> : null}
            </span>
            {messages.english}
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            color="red"
            disabled={signOutDisabled}
            onSelect={() => void onSignOut()}
          >
            <ExitIcon aria-hidden="true" />
            {signingOut ? messages.signingOut : messages.signOut}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    );
  },
);
