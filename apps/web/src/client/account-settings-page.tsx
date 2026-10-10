import { isValidUsername } from "@narumitw/otter-core/username";
import {
  ArrowLeftIcon,
  CodeIcon,
  GearIcon,
  LockClosedIcon,
  PersonIcon,
} from "@radix-ui/react-icons";
import { useEffect, useRef, useState } from "react";
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
import { ApiTokenSettings } from "./api-token-settings.js";
import { AppearanceSettings } from "./appearance-settings.js";
import type { User } from "./client-support.js";
import { isLocale, languageOptions } from "./i18n/locales.js";
import { useI18n } from "./i18n.js";
import { PasskeySettings } from "./passkey-settings.js";
import { SettingsNavigation } from "./settings-navigation.js";

type UsernameForm = { username: string };

export function AccountSettingsPage({
  offline,
  onClose,
  onMutationChange,
  onUpdate,
  user,
}: {
  offline: boolean;
  onClose: () => void;
  onMutationChange?: (active: boolean) => void;
  onUpdate: (username: string) => Promise<void>;
  user: User;
}) {
  const { locale, messages, setLocale } = useI18n();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [error, setError] = useState("");
  const [tokenMutationActive, setTokenMutationActive] = useState(false);
  const form = useForm<UsernameForm>({
    defaultValues: { username: user.username },
  });

  useEffect(() => {
    const frame = requestAnimationFrame(() => headingRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  function changeTokenMutation(active: boolean) {
    setTokenMutationActive(active);
    onMutationChange?.(active);
  }

  async function update({ username }: UsernameForm) {
    if (tokenMutationActive) return;
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
        <Button
          type="button"
          variant="ghost"
          disabled={tokenMutationActive || form.formState.isSubmitting}
          onClick={onClose}
        >
          <ArrowLeftIcon aria-hidden="true" />
          {messages.backToGroups}
        </Button>
        <h2 id="account-settings-heading" ref={headingRef} tabIndex={-1}>
          {messages.accountSettings}
        </h2>
        <p>{messages.manageYourUsernameAndPasskeys}</p>
      </header>
      <div className="settings-sections">
        <SettingsNavigation
          label={messages.accountSettings}
          sections={[
            {
              id: "account-preferences",
              label: messages.preferencesLabel,
              icon: <GearIcon aria-hidden="true" />,
            },
            {
              id: "account-profile",
              label: messages.profileLabel,
              icon: <PersonIcon aria-hidden="true" />,
            },
            {
              id: "account-security",
              label: messages.securityLabel,
              icon: <LockClosedIcon aria-hidden="true" />,
            },
            {
              id: "account-tokens",
              label: messages.apiTokens,
              icon: <CodeIcon aria-hidden="true" />,
            },
          ]}
        />
        <form
          className="account-settings-form"
          noValidate
          onSubmit={(event) => void form.handleSubmit(update)(event)}
        >
          <section
            id="account-preferences"
            className="surface account-preferences-panel"
          >
            <h3 className="account-section-title">
              {messages.preferencesLabel}
            </h3>
            <section
              className="account-settings-section account-language-row"
              aria-labelledby="language-settings-heading"
            >
              <div className="account-settings-section-heading">
                <h3 id="language-settings-heading">{messages.language}</h3>
              </div>
              <select
                aria-labelledby="language-settings-heading"
                className="form-control account-language-select"
                value={locale}
                onChange={(event) => {
                  if (isLocale(event.target.value))
                    setLocale(event.target.value);
                }}
              >
                {languageOptions.map((option) => (
                  <option
                    key={option.locale}
                    value={option.locale}
                    lang={option.locale}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </section>
            <AppearanceSettings />
          </section>
          <section
            id="account-profile"
            className="surface account-settings-section"
            aria-labelledby="username-settings-heading"
          >
            <div className="account-settings-section-heading">
              <h3 id="username-settings-heading">{messages.profileLabel}</h3>
              <p>
                {
                  messages.useTheNewUsernameTheNextTimeYouSignInYourCurrentSessionWillContinue
                }
              </p>
            </div>
            <FieldGroup>
              {error ? <FieldError>{error}</FieldError> : null}
              <Field data-invalid={Boolean(form.formState.errors.username)}>
                <FieldLabel htmlFor="account-username">
                  {messages.username}
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
            <footer className="account-settings-actions">
              <Button
                disabled={tokenMutationActive || form.formState.isSubmitting}
                onClick={onClose}
                type="button"
                variant="outline"
              >
                {messages.cancel}
              </Button>
              <Button
                disabled={
                  offline || tokenMutationActive || form.formState.isSubmitting
                }
                type="submit"
              >
                {form.formState.isSubmitting ? messages.saving : messages.save}
              </Button>
            </footer>
          </section>
          <section id="account-security" className="surface">
            <h3 className="account-section-title">{messages.securityLabel}</h3>
            <PasskeySettings offline={offline} />
          </section>
          <section id="account-tokens" className="surface">
            <ApiTokenSettings
              offline={offline}
              onMutationChange={changeTokenMutation}
            />
          </section>
        </form>
      </div>
    </section>
  );
}
