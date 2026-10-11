import { type Currency, currencies } from "@narumitw/otter-core/money";
import { CardStackIcon } from "@radix-ui/react-icons";
import { Switch } from "@radix-ui/themes";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import type { TripPayload } from "../client-support.js";
import { useI18n, useLocaleError } from "../i18n.js";
import { ActionError, useWorkspace } from "./workspace-context.js";

export function VisaSettlementSettings({
  payload,
  expanded = false,
}: {
  payload: TripPayload;
  expanded?: boolean;
}) {
  const { messages } = useI18n();
  const { offline, requestPayload } = useWorkspace();
  const [error, setError] = useLocaleError();
  const [busy, setBusy] = useState(false);
  const id = useId();
  const enabled = payload.trip.visaSettlementEnabled === true;
  const currentCurrency =
    payload.trip.visaSettlementCurrency ?? payload.trip.baseCurrency;
  const [currency, setCurrency] = useState<Currency>(currentCurrency);
  useEffect(() => setCurrency(currentCurrency), [currentCurrency]);
  if (
    payload.currentUserRole === "editor" ||
    payload.readonly ||
    payload.trip.archivedAt
  )
    return null;

  async function save(next: boolean) {
    setBusy(true);
    setError("");
    try {
      await requestPayload(
        `/api/trips/${payload.trip.id}/visa-settlement`,
        {
          method: "PATCH",
          body: JSON.stringify({ enabled: next, currency }),
        },
        messages.visaSettlementSaved,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : messages.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <details
      className="surface disclosure"
      name={expanded ? undefined : "trip-settings"}
      open={expanded || undefined}
    >
      <summary>
        <CardStackIcon aria-hidden="true" />
        <span>{messages.visaSettlementTitle}</span>
        <span className="summary-meta">
          {enabled
            ? messages.visaSettlementOn({ currency: currentCurrency })
            : messages.visaSettlementOff}
        </span>
      </summary>
      <div className="grid gap-4 pt-5" aria-busy={busy}>
        <p id={`${id}-help`} className="text-sm text-muted-foreground">
          {messages.visaSettlementHelp}
        </p>
        <label className="grid gap-2" htmlFor={`${id}-currency`}>
          <span>{messages.visaSettlementCurrency}</span>
          <select
            id={`${id}-currency`}
            className="form-control"
            value={currency}
            disabled={offline || busy}
            onChange={(event) => {
              const value = event.target.value;
              const selected = currencies.find(
                (candidate) => candidate === value,
              );
              if (selected) setCurrency(selected);
            }}
          >
            {currencies.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-3">
          <Switch
            id={id}
            checked={enabled}
            disabled={offline || busy}
            aria-describedby={`${id}-help`}
            onCheckedChange={(next) => void save(next)}
          />
          <label htmlFor={id}>{messages.visaSettlementEnable}</label>
        </div>
        {currency !== currentCurrency ? (
          <Button disabled={offline || busy} onClick={() => void save(enabled)}>
            {messages.applyChanges}
          </Button>
        ) : null}
        <ActionError message={error} />
      </div>
    </details>
  );
}
