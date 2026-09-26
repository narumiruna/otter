import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { getExpense } from "../expense-queue.js";
import { acquireExpenseQueueLock } from "../expense-queue-lock.js";
import { useI18n } from "../i18n.js";
import { ExpenseComposer } from "./expense-composer.js";
import { ActionError, useWorkspace } from "./workspace-context.js";

export function ExpenseQueuePanel({
  onDirtyChange,
  onEditingChange,
  otherEditorActive = false,
}: {
  onDirtyChange?: (dirty: boolean) => void;
  onEditingChange?: (editing: boolean) => void;
  otherEditorActive?: boolean;
}) {
  const { messages } = useI18n();
  const { queued, queueError, payload, removeQueued, retryQueued, userId } =
    useWorkspace();
  const [editing, setEditing] = useState("");
  const [editingDirty, setEditingDirty] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const releaseEditLock = useRef<(() => void) | null>(null);
  const editorController = useRef(new AbortController());
  const blockedByOtherEditor = useRef(otherEditorActive);
  blockedByOtherEditor.current = otherEditorActive;
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    editorController.current = controller;
    setOpening(false);
    setEditing("");
    setEditingDirty(false);
    return () => {
      controller.abort();
      releaseEditLock.current?.();
      releaseEditLock.current = null;
      onEditingChange?.(false);
    };
  }, [onEditingChange, userId]);
  useEffect(() => onEditingChange?.(!!editing), [editing, onEditingChange]);

  const closeEditor = () => {
    setEditing("");
    releaseEditLock.current?.();
    releaseEditLock.current = null;
  };
  useEffect(() => {
    if (
      editing &&
      !queued.some(
        (item) =>
          item.id === editing &&
          (item.status === "pending" || item.status === "invalid"),
      )
    ) {
      setEditing("");
      releaseEditLock.current?.();
      releaseEditLock.current = null;
    }
  }, [editing, queued]);
  const openEditor = async (id: string) => {
    if (
      !userId ||
      opening ||
      editingDirty ||
      blockedByOtherEditor.current ||
      editing === id
    )
      return;
    setOpening(true);
    const signal = editorController.current?.signal;
    let release: (() => void) | undefined;
    try {
      // The lock excludes sync in this and other tabs. Acquire it before
      // reading status, so a request already in flight finishes first.
      if (!releaseEditLock.current)
        release = await acquireExpenseQueueLock(
          userId,
          payload.trip.id,
          signal,
        );
      const item = await getExpense(id);
      if (
        signal?.aborted ||
        blockedByOtherEditor.current ||
        item?.userId !== userId ||
        item.tripId !== payload.trip.id ||
        (item.status !== "pending" && item.status !== "invalid")
      ) {
        release?.();
        if (!signal?.aborted)
          setError("Queued expense changed; reload and try again");
        return;
      }
      if (release) releaseEditLock.current = release;
      setEditing(id);
      setError("");
    } catch (caught) {
      release?.();
      if (!signal?.aborted)
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to open queued expense",
        );
    } finally {
      if (!signal?.aborted) setOpening(false);
    }
  };
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
                  disabled={
                    opening ||
                    otherEditorActive ||
                    (editingDirty && editing !== item.id)
                  }
                  onClick={() => void openEditor(item.id)}
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
                      if (editing === item.id) closeEditor();
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
          onCancel={closeEditor}
          onSaved={closeEditor}
        />
      ) : null}
    </section>
  );
}
