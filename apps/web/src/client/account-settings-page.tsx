import { isValidUsername } from "@narumitw/otter-core/username";
import { forwardRef, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { User } from "./client-support.js";
import { useI18n } from "./i18n.js";
import { PasskeySettings } from "./passkey-settings.js";

type UsernameForm = { username: string };

type AccountSettingsButtonProps = {
  active: boolean;
  offline: boolean;
  onOpen: () => void;
  user: User;
};

export const AccountSettingsButton = forwardRef<
  HTMLButtonElement,
  AccountSettingsButtonProps
>(function AccountSettingsButton(
  { active, offline, onOpen, user },
  forwardedRef,
) {
  const { messages } = useI18n();

  return (
    <Button
      ref={forwardedRef}
      aria-current={active ? "page" : undefined}
      aria-label={messages.manageNameSAccount({ name: user.name })}
      className="user-account-button"
      disabled={offline}
      onClick={onOpen}
      variant="ghost"
    >
      <span className="user-avatar" aria-hidden="true">
        {user.name.trim().charAt(0).toLocaleUpperCase() || "O"}
      </span>
      <span className="user-identity">
        <strong>{user.name}</strong>
        {user.username !== user.name ? <small>@{user.username}</small> : null}
      </span>
    </Button>
  );
});

export function AccountSettingsPage({
  offline,
  onClose,
  onUpdate,
  user,
}: {
  offline: boolean;
  onClose: () => void;
  onUpdate: (username: string) => Promise<void>;
  user: User;
}) {
  const { messages } = useI18n();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [error, setError] = useState("");
  const form = useForm<UsernameForm>({
    defaultValues: { username: user.username },
  });

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  async function update({ username }: UsernameForm) {
    setError("");
    try {
      await onUpdate(username);
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : messages.unableToUpdateUsername,
      );
    }
  }

  return (
    <section
      className="account-settings-page"
      aria-labelledby="account-settings-heading"
    >
      <header className="account-settings-header">
        <h2 id="account-settings-heading" ref={headingRef} tabIndex={-1}>
          {messages.accountSettings}
        </h2>
        <p>{messages.manageYourUsernameAndPasskeys}</p>
      </header>
      <form
        className="surface account-settings-form"
        noValidate
        onSubmit={(event) => void form.handleSubmit(update)(event)}
      >
        <section
          className="account-settings-section"
          aria-labelledby="username-settings-heading"
        >
          <div className="account-settings-section-heading">
            <h3 id="username-settings-heading">Username</h3>
            <p>
              {
                messages.useTheNewUsernameTheNextTimeYouSignInYourCurrentSessionWillContinue
              }
            </p>
          </div>
          <FieldGroup>
            {error ? <FieldError>{error}</FieldError> : null}
            <Field data-invalid={Boolean(form.formState.errors.username)}>
              <FieldLabel className="sr-only" htmlFor="account-username">
                Username
              </FieldLabel>
              <Input
                id="account-username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                aria-describedby="account-username-help"
                aria-invalid={Boolean(form.formState.errors.username)}
                {...form.register("username", {
                  required: messages.enterAUsername,
                  validate: (value) =>
                    isValidUsername(value) ||
                    messages.usernameMustBe332LettersNumbersUnderscoresOrHyphens,
                })}
              />
              <FieldDescription id="account-username-help">
                {messages.usernameMustBe332LettersNumbersUnderscoresOrHyphens}{" "}
                {messages.usernameIsNotCaseSensitive}
              </FieldDescription>
              <FieldError errors={[form.formState.errors.username]} />
            </Field>
          </FieldGroup>
        </section>
        <Separator />
        <PasskeySettings offline={offline} />
        <footer className="account-settings-actions">
          <Button
            disabled={form.formState.isSubmitting}
            onClick={onClose}
            type="button"
            variant="outline"
          >
            {messages.cancel}
          </Button>
          <Button
            disabled={offline || form.formState.isSubmitting}
            type="submit"
          >
            {form.formState.isSubmitting ? messages.saving : messages.save}
          </Button>
        </footer>
      </form>
    </section>
  );
}
