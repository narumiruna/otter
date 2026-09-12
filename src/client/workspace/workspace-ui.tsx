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
import { currencies, currencyInfo, formatMinor } from "../../shared/money.js";
import type { Balance } from "../../shared/settlement.js";
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
          {currency} · {currencyInfo[currency].label}
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
  busyLabel = "處理中…",
  children,
  ...props
}: React.ComponentProps<typeof Button> & {
  busy?: boolean;
  busyLabel?: string;
}) {
  return (
    <Button {...props} disabled={busy || props.disabled}>
      {busy ? (
        <LoaderCircle className="animate-spin" aria-hidden="true" />
      ) : null}
      {busy ? busyLabel : children}
    </Button>
  );
}

export function ConfirmDialog({
  cancelLabel = "取消",
  confirmLabel,
  description,
  destructive = false,
  disabled,
  onConfirm,
  title,
  trigger,
}: {
  cancelLabel?: string;
  confirmLabel: string;
  description: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  onConfirm: () => unknown | Promise<unknown>;
  title: string;
  trigger: ReactElement<{ disabled?: boolean }>;
}) {
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
      setError(caught instanceof Error ? caught.message : "無法套用變更");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!busy) setOpen(nextOpen);
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
            {cancelLabel}
          </DialogClose>
          <BusyButton
            busy={busy}
            busyLabel="套用中…"
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
  if (balances.length === 0) return <p className="empty-copy">還沒有餘額。</p>;
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
              <span>{settled ? "已打平" : positive ? "應收" : "應付"}</span>
              <strong>
                {formatMinor(Math.abs(balance.amountMinor), balance.currency)}
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
