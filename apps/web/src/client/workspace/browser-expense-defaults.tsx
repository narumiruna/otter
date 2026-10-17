import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "../i18n.js";
import { useWorkspace } from "./workspace-context.js";

export function BrowserExpenseDefaults() {
  const { messages } = useI18n();
  const { userId, payload, clearPreferences, preferencesFailed } =
    useWorkspace();
  const scope = JSON.stringify([userId, payload.trip.id]);
  const [clearedScope, setClearedScope] = useState<string>();
  if (!userId) return null;
  return (
    <section
      className="settings-panel grid gap-3"
      aria-label={messages.browserExpenseDefaults}
    >
      <h3>{messages.browserExpenseDefaults}</h3>
      <p>{messages.browserExpenseDefaultsHelp}</p>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setClearedScope(clearPreferences() ? scope : undefined);
        }}
      >
        {messages.clearPersonalPreferences}
      </Button>
      {preferencesFailed ? (
        <p role="alert">{messages.personalStorageFailed}</p>
      ) : clearedScope === scope ? (
        <p role="status">{messages.expenseDefaultsCleared}</p>
      ) : null}
    </section>
  );
}
