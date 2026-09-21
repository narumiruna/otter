import { currencies, currencyInfo } from "@narumitw/otter-core/money";
import type { Balance } from "@narumitw/otter-core/settlement";
import {
  ExclamationTriangleIcon as AlertTriangle,
  ReloadIcon as LoaderCircle,
} from "@radix-ui/react-icons";
import {
  cloneElement,
  type ReactElement,
  type ReactNode,
  useState,
} from "react";
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
import { cn } from "@/lib/utils";
import { localizeMessage, useI18n } from "../i18n.js";
import { ActionError } from "./workspace-context.js";

export function CurrencySelect({
  disabled,
  name = "currency",
  value,
  onChange,
}: {
  disabled?: boolean;
  name?: string;
  value: string;
  onChange?: (value: string) => void;
}) {
  return (
    <select
      className="form-control"
      disabled={disabled}
      name={name}
      onChange={(event) => onChange?.(event.target.value)}
      value={value}
    >
      {currencies.map((currency) => (
        <option key={currency} value={currency}>
          {currency} · {localizeMessage(currencyInfo[currency].label)}
        </option>
      ))}
    </select>
  );
}

export function FormField({
  children,
  hint,
  label,
}: {
  children: ReactNode;
  hint?: string;
  label: string;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: FormField always wraps its nested control.
    <label className="grid gap-1.5 text-sm font-medium">
      <span>{label}</span>
      {children}
      {hint ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  );
}

export function BusyButton({
  busy,
  busyLabel,
  children,
  ...props
}: React.ComponentProps<typeof Button> & {
  busy?: boolean;
  busyLabel?: string;
}) {
  const { messages } = useI18n();
  return (
    <Button {...props} disabled={busy || props.disabled}>
      {busy ? (
        <LoaderCircle className="animate-spin" aria-hidden="true" />
      ) : null}
      {busy ? (busyLabel ?? messages.working) : children}
    </Button>
  );
}

export function ConfirmDialog({
  cancelLabel,
  confirmLabel,
  description,
  destructive = false,
  disabled,
  onConfirm,
  onOpenChange,
  title,
  trigger,
}: {
  cancelLabel?: string;
  confirmLabel: string;
  description: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  onConfirm: () => unknown | Promise<unknown>;
  onOpenChange?: (open: boolean) => void;
  title: string;
  trigger: ReactElement<{ disabled?: boolean }>;
}) {
  const { messages } = useI18n();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function confirm() {
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      setOpen(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : messages.unableToApplyChanges,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!busy) {
          setOpen(nextOpen);
          onOpenChange?.(nextOpen);
        }
        if (nextOpen) setError("");
      }}
    >
      <DialogTrigger
        disabled={disabled}
        render={cloneElement(trigger, {
          disabled: disabled || trigger.props.disabled,
        })}
      />
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            {destructive ? (
              <AlertTriangle className="text-destructive" aria-hidden="true" />
            ) : null}
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription render={<div />}>{description}</DialogDescription>
        </DialogHeader>
        <ActionError message={error} />
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            {cancelLabel ?? messages.cancel}
          </DialogClose>
          <BusyButton
            busy={busy}
            busyLabel={messages.applying}
            onClick={() => void confirm()}
            variant={destructive ? "destructive" : "default"}
          >
            {confirmLabel}
          </BusyButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BalanceList({ balances }: { balances: Balance[] }) {
  const { formatMoney, messages } = useI18n();
  if (balances.length === 0)
    return <p className="empty-copy">{messages.noBalancesYet}</p>;
  return (
    <ul className="balance-list">
      {balances.map((balance) => {
        const positive = balance.amountMinor > 0;
        const settled = balance.amountMinor === 0;
        return (
          <li className="balance-row" key={balance.participantId}>
            <span className="balance-person">
              <span className="person-avatar" aria-hidden="true">
                {balance.name.trim().charAt(0).toLocaleUpperCase() || "?"}
              </span>
              <span className="font-medium break-anywhere">{balance.name}</span>
            </span>
            <span
              className={cn(
                "balance-amount tabular-nums",
                settled
                  ? "text-muted-foreground"
                  : positive
                    ? "text-primary"
                    : "text-destructive",
              )}
            >
              <span>
                {settled
                  ? messages.settled
                  : positive
                    ? messages.getsBack
                    : messages.owes}
              </span>
              <strong>
                {formatMoney(Math.abs(balance.amountMinor), balance.currency)}
              </strong>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function SectionHeading({
  children,
  description,
}: {
  children: ReactNode;
  description?: string;
}) {
  return (
    <header className="section-heading">
      <h3>{children}</h3>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
    </header>
  );
}
