import { CardStackIcon } from "@radix-ui/react-icons";
import { Switch } from "@radix-ui/themes";
import { useId, useState } from "react";
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
          body: JSON.stringify({ enabled: next }),
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
          {enabled ? messages.visaSettlementOn : messages.visaSettlementOff}
        </span>
      </summary>
      <div className="grid gap-4 pt-5" aria-busy={busy}>
        <p id={`${id}-help`} className="text-sm text-muted-foreground">
          {messages.visaSettlementHelp}
        </p>
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
        <ActionError message={error} />
      </div>
    </details>
  );
}
