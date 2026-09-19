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
import {
  isValidUsername,
  usernameValidationMessage,
} from "../shared/username.js";
import type { User } from "./client-support.js";

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
      setError(caught instanceof Error ? caught.message : "無法更新 Username");
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
            aria-label={`修改 ${user.name} 的 Username`}
            className="user-account-button"
            variant="ghost"
          >
            <span className="user-avatar" aria-hidden="true">
              {user.name.trim().charAt(0).toLocaleUpperCase() || "O"}
            </span>
            <span className="user-identity">
              <strong>{user.name}</strong>
              <small>{user.username}</small>
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
            <DialogTitle>修改 Username</DialogTitle>
            <DialogDescription>
              更新後請使用新的 Username 登入；目前的登入狀態不會中斷。
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
                  required: "請輸入 Username",
                  validate: (value) =>
                    isValidUsername(value) || usernameValidationMessage,
                })}
              />
              <FieldDescription id="account-username-help">
                {usernameValidationMessage}，不分大小寫。
              </FieldDescription>
              <FieldError errors={[form.formState.errors.username]} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              取消
            </DialogClose>
            <Button
              disabled={offline || form.formState.isSubmitting}
              type="submit"
            >
              {form.formState.isSubmitting ? "儲存中…" : "儲存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
