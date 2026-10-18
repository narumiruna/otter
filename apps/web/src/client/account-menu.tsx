import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ExitIcon,
  GearIcon,
  GlobeIcon,
} from "@radix-ui/react-icons";
import { DropdownMenu } from "@radix-ui/themes";
import { forwardRef, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { User } from "./client-support.js";
import { languageOptions } from "./i18n/locales.js";
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
    const pendingAction = useRef<"settings" | "language" | null>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const selectedLanguage = useRef<HTMLButtonElement>(null);
    const [languageOpen, setLanguageOpen] = useState(false);
    const currentLanguage = languageOptions.find(
      (option) => option.locale === locale,
    );

    return (
      <>
        <DropdownMenu.Root modal={false}>
          <DropdownMenu.Trigger>
            <Button
              ref={(node) => {
                trigger.current = node;
                if (typeof forwardedRef === "function") forwardedRef(node);
                else if (forwardedRef) forwardedRef.current = node;
              }}
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
            onCloseAutoFocus={(event) => {
              const action = pendingAction.current;
              pendingAction.current = null;
              if (!action) return;
              event.preventDefault();
              if (action === "settings") onOpenAccountSettings();
              else setLanguageOpen(true);
            }}
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
              onSelect={() => {
                pendingAction.current = "settings";
              }}
            >
              <GearIcon aria-hidden="true" />
              {messages.accountSettings}
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="account-menu-language"
              aria-haspopup="dialog"
              onSelect={() => {
                pendingAction.current = "language";
              }}
            >
              <GlobeIcon aria-hidden="true" />
              <span className="account-menu-language-label">
                {messages.language}
              </span>{" "}
              <span className="account-menu-language-current" lang={locale}>
                {currentLanguage?.label}
              </span>
              <ChevronRightIcon aria-hidden="true" />
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
        <Dialog open={languageOpen} onOpenChange={setLanguageOpen}>
          <DialogContent
            aria-describedby={undefined}
            className="account-language-dialog"
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              selectedLanguage.current?.focus({ preventScroll: true });
              selectedLanguage.current?.scrollIntoView({ block: "nearest" });
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              trigger.current?.focus();
            }}
          >
            <DialogHeader>
              <DialogTitle>{messages.language}</DialogTitle>
            </DialogHeader>
            <div className="account-language-list">
              {languageOptions.map((option) => (
                <Button
                  key={option.locale}
                  ref={locale === option.locale ? selectedLanguage : undefined}
                  type="button"
                  variant="ghost"
                  className="account-language-option"
                  lang={option.locale}
                  aria-pressed={locale === option.locale}
                  onClick={() => {
                    setLocale(option.locale);
                    setLanguageOpen(false);
                  }}
                >
                  <span className="account-menu-check" aria-hidden="true">
                    {locale === option.locale ? <CheckIcon /> : null}
                  </span>
                  {option.label}
                </Button>
              ))}
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                {messages.cancel}
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  },
);
