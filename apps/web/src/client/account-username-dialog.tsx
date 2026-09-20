import { isValidUsername } from "@narumitw/otter-core/username";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

export function AccountUsernameDialog({
  offline,
  onUpdate,
  user,
}: {
  offline: boolean;
  onUpdate: (username: string) => Promise<void>;
  user: User;
}) {
  const { messages } = useI18n();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const form = useForm<UsernameForm>({
    defaultValues: { username: user.username },
  });

  async function update({ username }: UsernameForm) {
    setError("");
    try {
      await onUpdate(username);
      setOpen(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : messages.unableToUpdateUsername,
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (form.formState.isSubmitting) return;
        setOpen(nextOpen);
        if (nextOpen) {
          setError("");
          form.reset({ username: user.username });
        }
      }}
    >
      <DialogTrigger
        disabled={offline}
        render={
          <Button
            aria-label={messages.manageNameSAccount({ name: user.name })}
            className="user-account-button"
            variant="ghost"
          >
            <span className="user-avatar" aria-hidden="true">
              {user.name.trim().charAt(0).toLocaleUpperCase() || "O"}
            </span>
            <span className="user-identity">
              <strong>{user.name}</strong>
              {user.username !== user.name ? (
                <small>@{user.username}</small>
              ) : null}
            </span>
          </Button>
        }
      />
      <DialogContent>
        <form
          noValidate
          onSubmit={(event) => void form.handleSubmit(update)(event)}
        >
          <DialogHeader>
            <DialogTitle>{messages.accountSettings}</DialogTitle>
            <DialogDescription>
              {messages.manageYourUsernameAndPasskeys}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="my-5">
            {error ? <FieldError>{error}</FieldError> : null}
            <Field data-invalid={Boolean(form.formState.errors.username)}>
              <FieldLabel htmlFor="account-username">Username</FieldLabel>
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
          <Separator />
          <PasskeySettings offline={offline} />
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              {messages.cancel}
            </DialogClose>
            <Button
              disabled={offline || form.formState.isSubmitting}
              type="submit"
            >
              {form.formState.isSubmitting ? messages.saving : messages.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
