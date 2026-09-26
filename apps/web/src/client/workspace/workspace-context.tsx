import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, type TripPayload } from "../client-support.js";
import {
  changeExpense,
  listExpenses,
  listenToQueue,
  type QueuedExpense,
  type QueuedExpenseDraft,
  queueExpense,
  reviseExpense,
} from "../expense-queue.js";
import { syncExpenses } from "../expense-sync.js";
import { useI18n } from "../i18n.js";

export type WorkspaceContextValue = {
  announce: (message: string) => void;
  offline: boolean;
  canQueue: boolean;
  payload: TripPayload;
  queued: QueuedExpense[];
  queueError: string;
  queueDraft: (
    draft: QueuedExpenseDraft,
    previous?: QueuedExpense,
  ) => Promise<void>;
  removeQueued: (item: QueuedExpense) => Promise<void>;
  retryQueued: (item: QueuedExpense) => Promise<void>;
  refreshCollection: () => Promise<void>;
  replacePayload: (payload: TripPayload) => void;
  requestPayload: (
    url: string,
    init: RequestInit,
    successMessage: string,
    refreshCollection?: boolean,
  ) => Promise<TripPayload>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  announce,
  children,
  offline,
  payload,
  refreshCollection,
  onPayload,
  tripQueryKey,
  userId,
}: {
  announce: (message: string) => void;
  children: ReactNode;
  offline: boolean;
  payload: TripPayload;
  refreshCollection: () => Promise<void>;
  onPayload?: (payload: TripPayload) => void;
  tripQueryKey?: readonly string[];
  userId?: string;
}) {
  const queryClient = useQueryClient();
  const { messages } = useI18n();
  const tripId = payload.trip.id;
  const [queued, setQueued] = useState<QueuedExpense[]>([]);
  const [queueError, setQueueError] = useState("");
  const reload = useCallback(async () => {
    if (!userId) {
      setQueued([]);
      return;
    }
    try {
      setQueued(await listExpenses(userId, tripId));
      setQueueError("");
    } catch (error) {
      setQueued([]);
      setQueueError(
        error instanceof Error ? error.message : messages.loadingFailed,
      );
    }
  }, [userId, tripId, messages.loadingFailed]);

  useEffect(() => {
    void reload();
    return listenToQueue(() => void reload());
  }, [reload]);

  useEffect(() => {
    if (!userId || offline) return;
    const controller = new AbortController();
    const synced = (next: TripPayload) => {
      if (controller.signal.aborted) return;
      queryClient.setQueryData(tripQueryKey ?? ["trip", tripId], next);
      void queryClient.invalidateQueries({
        queryKey: ["expense-history", tripId],
      });
      onPayload?.(next);
      void refreshCollection();
    };
    const run = () => {
      if (!document.hidden && navigator.onLine)
        void syncExpenses(userId, tripId, controller.signal, synced).catch(
          (error: unknown) =>
            setQueueError(
              error instanceof Error ? error.message : messages.loadingFailed,
            ),
        );
    };
    run();
    window.addEventListener("online", run);
    window.addEventListener("focus", run);
    document.addEventListener("visibilitychange", run);
    const timer = window.setInterval(run, 12_000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("online", run);
      window.removeEventListener("focus", run);
      document.removeEventListener("visibilitychange", run);
    };
  }, [
    userId,
    tripId,
    offline,
    onPayload,
    refreshCollection,
    tripQueryKey,
    queryClient,
    messages.loadingFailed,
  ]);

  const value = useMemo<WorkspaceContextValue>(() => {
    const replacePayload = (next: TripPayload) => {
      queryClient.setQueryData(tripQueryKey ?? ["trip", next.trip.id], next);
      onPayload?.(next);
      void queryClient.invalidateQueries({
        queryKey: ["expense-history", next.trip.id],
      });
    };
    return {
      announce,
      offline,
      canQueue: !!userId,
      payload,
      queued,
      queueError,
      queueDraft: async (draft, previous) => {
        if (!userId || payload.trip.archivedAt)
          throw new Error(messages.youAreOfflineReconnectAndTryAgain);
        if (previous) {
          if (!(await reviseExpense(previous, draft)))
            throw new Error("Queued expense changed; reload and try again");
        } else {
          await queueExpense(userId, tripId, draft);
        }
      },
      removeQueued: async (item) => {
        if (
          !userId ||
          !(await changeExpense(item.id, userId, tripId, () => null))
        )
          throw new Error("Queued expense is no longer available");
      },
      retryQueued: async (item) => {
        if (
          !userId ||
          !(await changeExpense(item.id, userId, tripId, (current) =>
            current.status === "conflict"
              ? { ...current, status: "attempted", error: undefined }
              : current,
          ))
        )
          throw new Error("Queued expense is no longer available");
      },
      refreshCollection,
      replacePayload,
      requestPayload: async (url, init, successMessage, refresh = false) => {
        if (offline)
          throw new Error(messages.youAreOfflineReconnectAndTryAgain);
        const next = await api<TripPayload>(url, init);
        replacePayload(next);
        if (refresh) await refreshCollection();
        announce(successMessage);
        return next;
      },
    };
  }, [
    announce,
    messages,
    offline,
    onPayload,
    payload,
    queued,
    queueError,
    userId,
    tripId,
    queryClient,
    refreshCollection,
    tripQueryKey,
  ]);
  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useOptionalWorkspace() {
  return useContext(WorkspaceContext);
}

export function useWorkspace() {
  const value = useOptionalWorkspace();
  if (!value) throw new Error("Workspace context is unavailable");
  return value;
}

export function ActionError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p
      className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm font-medium text-destructive"
      role="alert"
    >
      {message}
    </p>
  );
}
