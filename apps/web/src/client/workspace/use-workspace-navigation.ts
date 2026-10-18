import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  isAccountSettingsLocation,
  isSameWorkspaceLocation,
  readWorkspaceLocation,
  type WorkspaceLocation,
  writeWorkspaceLocation,
} from "../url-state.js";
import {
  accountSettingsSourceKey,
  blockHistory,
  flushHistoryPage,
  getHistorySnapshot,
  type HistorySnapshot,
  subscribeHistory,
  writeHistoryLocation,
} from "../workspace-history.js";

function settingsSource(snapshot: HistorySnapshot): string | null {
  const source = snapshot.state[accountSettingsSourceKey];
  return isAccountSettingsLocation(new URL(snapshot.url)) &&
    snapshot.entry.index > 0 &&
    typeof source === "string" &&
    source.length > 0 &&
    source !== snapshot.entry.key
    ? source
    : null;
}

function workspaceKey(snapshot: HistorySnapshot): string {
  return settingsSource(snapshot) ?? snapshot.entry.key;
}

function pairedSettings(
  first: HistorySnapshot,
  second: HistorySnapshot,
): boolean {
  return (
    first.entry.session === second.entry.session &&
    ((settingsSource(second) === first.entry.key &&
      second.entry.index === first.entry.index + 1) ||
      (settingsSource(first) === second.entry.key &&
        first.entry.index === second.entry.index + 1))
  );
}

export function useWorkspaceNavigation({
  dirty,
  busy,
  capturePage,
  discardMessage,
}: {
  dirty: boolean;
  busy: boolean;
  capturePage: () => void;
  discardMessage: string;
}) {
  const snapshot = useSyncExternalStore(subscribeHistory, getHistorySnapshot);
  const location = readWorkspaceLocation(new URL(snapshot.url));
  const previousSnapshot = useRef(snapshot);
  // Settings reload must retain the identity of the workspace below it.
  const entryKey = useRef(workspaceKey(snapshot));
  const activation = useRef(0);
  const previous = previousSnapshot.current;
  const workspaceChanged = !isSameWorkspaceLocation(
    location,
    readWorkspaceLocation(new URL(previous.url)),
  );
  if (snapshot.entry.key !== previous.entry.key || workspaceChanged) {
    entryKey.current = workspaceKey(snapshot);
    if (!pairedSettings(previous, snapshot) || workspaceChanged)
      activation.current += 1;
  }
  previousSnapshot.current = snapshot;
  const workspaceEntryKey = entryKey.current;
  const latest = useRef({ dirty, busy, capturePage, discardMessage });
  latest.current = { dirty, busy, capturePage, discardMessage };
  const allowedEntry = useRef<string | null>(null);
  const [pending, setPending] = useState<(() => void) | null>(null);
  useEffect(
    () =>
      blockHistory((next) => {
        const source = getHistorySnapshot();
        const current = readWorkspaceLocation(new URL(source.url));
        const target = readWorkspaceLocation(new URL(next.url));
        if (allowedEntry.current === next.entry.key) {
          allowedEntry.current = null;
          return true;
        }
        if (latest.current.busy) return false;
        if (
          isSameWorkspaceLocation(current, target) &&
          (source.entry.key === next.entry.key || pairedSettings(source, next))
        )
          return true;
        return (
          !latest.current.dirty || window.confirm(latest.current.discardMessage)
        );
      }),
    [],
  );

  const request = useCallback(
    (action: () => void, confirmed = false, completed = false) => {
      if (latest.current.busy && !completed) return;
      if (latest.current.dirty && !confirmed) setPending(() => action);
      else action();
    },
    [],
  );

  const navigate = useCallback(
    (next: Partial<WorkspaceLocation>, replace = false, confirmed = false) => {
      request(() => {
        latest.current.capturePage();
        const source = getHistorySnapshot();
        const current = readWorkspaceLocation(new URL(source.url));
        const merged = { ...current, ...next };
        if (
          next.mode === undefined &&
          ((next.tripId !== undefined && next.tripId !== current.tripId) ||
            next.view !== undefined)
        )
          merged.mode = null;
        if (merged.mode !== "edit-expense") merged.expenseId = null;
        if (merged.mode === "edit-expense") merged.view = "expenses";
        const target = writeWorkspaceLocation(new URL(source.url), merged);
        if (!replace && isSameWorkspaceLocation(current, merged)) return;
        writeHistoryLocation(target, {
          replace,
          ...(merged.mode === "edit-expense" &&
          !current.mode &&
          current.view === "expenses" &&
          current.tripId === merged.tripId
            ? {
                returnTo: {
                  key: source.entry.key,
                  index: source.entry.index,
                  url: source.url,
                },
              }
            : {}),
        });
      }, confirmed);
    },
    [request],
  );

  // Composer callbacks already confirmed a discard, or completed a mutation.
  const exitEditor = useCallback(
    (completed = false) => {
      request(
        () => {
          latest.current.capturePage();
          const source = getHistorySnapshot();
          // A late DELETE/restore completion must not redirect another entry.
          if (completed && source.entry.key !== workspaceEntryKey) return;
          const current = readWorkspaceLocation(new URL(source.url));
          const origin = source.entry.returnTo;
          const target = origin
            ? readWorkspaceLocation(new URL(origin.url, source.url))
            : null;
          if (
            origin &&
            target &&
            source.entry.index === origin.index + 1 &&
            target.tripId === current.tripId &&
            target.view === "expenses" &&
            !target.mode
          ) {
            allowedEntry.current = origin.key;
            flushHistoryPage();
            window.history.back();
          } else {
            writeHistoryLocation(
              writeWorkspaceLocation(new URL(source.url), {
                tripId: current.tripId,
                view: "expenses",
                mode: null,
                expenseId: null,
              }),
              { replace: true },
            );
          }
        },
        true,
        completed,
      );
    },
    [request, workspaceEntryKey],
  );

  useEffect(() => {
    if (getHistorySnapshot().entry.key === workspaceEntryKey) setPending(null);
  }, [workspaceEntryKey]);

  return {
    snapshot,
    workspaceEntryKey,
    workspaceActivation: activation.current,
    location,
    navigate,
    exitEditor,
    pending: !!pending,
    cancelPending: () => setPending(null),
    confirmPending: () => {
      if (latest.current.busy) return;
      const action = pending;
      setPending(null);
      action?.();
    },
  };
}
