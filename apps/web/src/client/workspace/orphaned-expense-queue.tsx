import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { TripSummary } from "../client-support.js";
import {
  changeExpense,
  listenToQueue,
  listUserExpenses,
  type QueuedExpense,
} from "../expense-queue.js";
import { useI18n } from "../i18n.js";
import { ActionError } from "./workspace-context.js";

export function OrphanedExpenseQueue({
  trips,
  userId,
}: {
  trips: TripSummary[];
  userId?: string;
}) {
  const { messages } = useI18n();
  const [stored, setStored] = useState<{
    userId: string;
    items: QueuedExpense[];
  } | null>(null);
  const [failure, setFailure] = useState<{
    userId: string;
    message: string;
  } | null>(null);
  useEffect(() => {
    if (!userId || typeof indexedDB === "undefined") return;
    let active = true;
    const reload = () => {
      void listUserExpenses(userId)
        .then((next) => {
          if (active) {
            setStored({ userId, items: next });
            setFailure(null);
          }
        })
        .catch((failure: unknown) => {
          if (active)
            setFailure({
              userId,
              message:
                failure instanceof Error
                  ? failure.message
                  : messages.loadingFailed,
            });
        });
    };
    reload();
    const unsubscribe = listenToQueue(reload);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [userId, messages.loadingFailed]);
  const orphans = (
    stored && stored.userId === userId ? stored.items : []
  ).filter((item) => !trips.some((trip) => trip.id === item.tripId));
  const error = failure && failure.userId === userId ? failure.message : "";
  if (!orphans.length && !error) return null;
  return (
    <section
      className="surface grid gap-3"
      aria-label={messages.queueOrphanTitle}
    >
      <h2 className="font-semibold">{messages.queueOrphanTitle}</h2>
      <p className="text-sm text-muted-foreground">
        {messages.queueOrphanNotice}
      </p>
      <ActionError message={error} />
      <ul className="grid gap-2">
        {orphans.map((item) => (
          <li key={item.id} className="rounded-xl border p-3">
            <strong>{item.draft.description}</strong> · {item.draft.amount}{" "}
            {item.draft.currency}
            <p className="text-sm">
              {messages.queueOrphanTrip({ id: item.tripId })}
            </p>
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
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!window.confirm(messages.queueDeleteConfirm)) return;
                void changeExpense(
                  item.id,
                  item.userId,
                  item.tripId,
                  () => null,
                )
                  .then((removed) => {
                    if (!removed)
                      setFailure({
                        userId: item.userId,
                        message: messages.loadingFailed,
                      });
                  })
                  .catch((failure: unknown) =>
                    setFailure({
                      userId: item.userId,
                      message:
                        failure instanceof Error
                          ? failure.message
                          : messages.loadingFailed,
                    }),
                  );
              }}
            >
              {messages.queueDelete}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
