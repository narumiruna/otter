import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "../i18n.js";
import { ExpenseComposer } from "./expense-composer.js";
import { ActionError, useWorkspace } from "./workspace-context.js";

export function ExpenseQueuePanel({
  onDirtyChange,
}: {
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { messages } = useI18n();
  const { queued, queueError, payload, removeQueued, retryQueued } =
    useWorkspace();
  const [editing, setEditing] = useState("");
  const [editingDirty, setEditingDirty] = useState(false);
  const [error, setError] = useState("");
  const reportDirty = useCallback(
    (dirty: boolean) => {
      setEditingDirty(dirty);
      onDirtyChange?.(dirty);
    },
    [onDirtyChange],
  );
  if (!queued.length && (!queueError || typeof indexedDB === "undefined"))
    return null;
  const selected = queued.find((item) => item.id === editing);
  return (
    <section className="surface grid gap-3" aria-label={messages.queueTitle}>
      <h2 className="font-semibold">{messages.queueTitle}</h2>
      <p role="status">{messages.queueCount({ count: queued.length })}</p>
      <p className="text-sm text-muted-foreground">{messages.queueNotice}</p>
      <ActionError message={queueError || error} />
      <ul className="grid gap-2">
        {queued.map((item) => (
          <li key={item.id} className="rounded-xl border p-3">
            <strong>{item.draft.description}</strong> · {item.draft.amount}{" "}
            {item.draft.currency}
            <p className="text-sm">
              {item.error ||
                (item.status === "pending"
                  ? messages.queuePending
                  : item.status === "attempted"
                    ? messages.queueAttempted
                    : item.status === "invalid"
                      ? messages.queueInvalid
                      : messages.queueConflict)}
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {(item.status === "pending" || item.status === "invalid") &&
              !payload.trip.archivedAt ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={editingDirty && editing !== item.id}
                  onClick={() => setEditing(item.id)}
                >
                  {messages.queueEdit}
                </Button>
              ) : null}
              {item.status === "conflict" ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void retryQueued(item)
                      .then(() => window.dispatchEvent(new Event("focus")))
                      .catch((failure: unknown) => setError(String(failure)));
                  }}
                >
                  {messages.queueRetry}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!window.confirm(messages.queueDeleteConfirm)) return;
                  void removeQueued(item)
                    .then(() => {
                      if (editing === item.id) setEditing("");
                    })
                    .catch((failure: unknown) => setError(String(failure)));
                }}
              >
                {messages.queueDelete}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {selected &&
      (selected.status === "pending" || selected.status === "invalid") ? (
        <ExpenseComposer
          key={selected.id}
          queued={selected}
          trip={payload.trip}
          onDirtyChange={reportDirty}
          onCancel={() => setEditing("")}
          onSaved={() => setEditing("")}
        />
      ) : null}
    </section>
  );
}
