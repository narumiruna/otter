import { isValidUsername } from "@narumitw/otter-core/username";
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
import { Separator } from "@/components/ui/separator";
import { ApiTokenSettings } from "./api-token-settings.js";
import { AppearanceSettings } from "./appearance-settings.js";
import type { User } from "./client-support.js";
import { useI18n } from "./i18n.js";
import { PasskeySettings } from "./passkey-settings.js";

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
          aria-labelledby="language-settings-heading"
        >
          <div className="account-settings-section-heading">
            <h3 id="language-settings-heading">{messages.language}</h3>
          </div>
          <select
            aria-labelledby="language-settings-heading"
            className="form-control account-language-select"
            value={locale}
            onChange={(event) =>
              setLocale(event.target.value as "en" | "zh-TW")
            }
          >
            <option value="en">{messages.english}</option>
            <option value="zh-TW">{messages.traditionalChinese}</option>
          </select>
        </section>
        <Separator />
        <AppearanceSettings />
        <Separator />
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
        <Separator />
        <ApiTokenSettings
          offline={offline}
          onMutationChange={changeTokenMutation}
        />
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
      </form>
    </section>
  );
}
