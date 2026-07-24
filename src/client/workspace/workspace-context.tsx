import { useQueryClient } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import { api, type TripPayload } from "../client-support.js";

export type WorkspaceContextValue = {
  announce: (message: string) => void;
  offline: boolean;
  payload: TripPayload;
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
}: {
  announce: (message: string) => void;
  children: ReactNode;
  offline: boolean;
  payload: TripPayload;
  refreshCollection: () => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const value = useMemo<WorkspaceContextValue>(() => {
    const replacePayload = (next: TripPayload) => {
      queryClient.setQueryData(["trip", next.trip.id], next);
    };
    return {
      announce,
      offline,
      payload,
      refreshCollection,
      replacePayload,
      requestPayload: async (url, init, successMessage, refresh = false) => {
        if (offline) throw new Error("目前離線，請恢復連線後再試");
        const next = await api<TripPayload>(url, init);
        replacePayload(next);
        if (refresh) await refreshCollection();
        announce(successMessage);
        return next;
      },
    };
  }, [announce, offline, payload, queryClient, refreshCollection]);
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
