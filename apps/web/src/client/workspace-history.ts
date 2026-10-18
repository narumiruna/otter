import type { ExpenseFilters } from "./client-support.js";

const stateKey = "otterWorkspaceHistory";
export const accountSettingsSourceKey = "otterAccountSettingsSource";

type ListState = {
  tripId: string;
  filters: ExpenseFilters;
  grouping: "date" | "none" | "payer";
  focusExpenseId?: string;
};
export type WorkspacePageState = {
  pageKey: string;
  scrollY: number;
  list?: ListState;
};
type HistoryOrigin = { key: string; index: number; url: string };
export type WorkspaceHistoryEntry = {
  version: 1;
  session: string;
  key: string;
  index: number;
  page?: WorkspacePageState;
  returnTo?: HistoryOrigin;
};
export type HistorySnapshot = {
  url: string;
  entry: WorkspaceHistoryEntry;
  state: Record<string, unknown>;
};
type Blocker = (next: HistorySnapshot) => boolean;

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : undefined;
}

function readPage(value: unknown): WorkspacePageState | undefined {
  const page = record(value);
  if (
    !page ||
    typeof page.pageKey !== "string" ||
    typeof page.scrollY !== "number" ||
    !Number.isFinite(page.scrollY) ||
    page.scrollY < 0
  )
    return;
  const result: WorkspacePageState = {
    pageKey: page.pageKey,
    scrollY: page.scrollY,
  };
  const list = record(page.list);
  const filters = record(list?.filters);
  if (
    list &&
    typeof list.tripId === "string" &&
    (list.grouping === "date" ||
      list.grouping === "none" ||
      list.grouping === "payer") &&
    filters &&
    typeof filters.query === "string" &&
    typeof filters.dateFrom === "string" &&
    typeof filters.dateTo === "string" &&
    typeof filters.paidById === "string" &&
    typeof filters.participantId === "string" &&
    typeof filters.currency === "string" &&
    typeof filters.category === "string" &&
    typeof filters.tag === "string" &&
    (filters.sort === "date-desc" ||
      filters.sort === "date-asc" ||
      filters.sort === "amount-desc" ||
      filters.sort === "amount-asc")
  ) {
    result.list = {
      tripId: list.tripId,
      grouping: list.grouping,
      filters: {
        query: filters.query,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        paidById: filters.paidById,
        participantId: filters.participantId,
        currency: filters.currency,
        category: filters.category,
        tag: filters.tag,
        sort: filters.sort,
      },
      ...(typeof list.focusExpenseId === "string"
        ? { focusExpenseId: list.focusExpenseId }
        : {}),
    };
  }
  return result;
}

function isSameOriginUrl(url: string): boolean {
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

export function readHistoryEntry(state: unknown): WorkspaceHistoryEntry | null {
  const value = record(record(state)?.[stateKey]);
  if (
    value?.version !== 1 ||
    typeof value.session !== "string" ||
    !value.session ||
    typeof value.key !== "string" ||
    !value.key ||
    !Number.isSafeInteger(value.index) ||
    typeof value.index !== "number" ||
    value.index < 0
  )
    return null;
  const origin = record(value.returnTo);
  return {
    version: 1,
    session: value.session,
    key: value.key,
    index: value.index,
    page: readPage(value.page),
    ...(origin &&
    typeof origin.key === "string" &&
    origin.key &&
    typeof origin.index === "number" &&
    Number.isSafeInteger(origin.index) &&
    origin.index === value.index - 1 &&
    typeof origin.url === "string" &&
    isSameOriginUrl(origin.url)
      ? { returnTo: { key: origin.key, index: origin.index, url: origin.url } }
      : {}),
  };
}

let current: HistorySnapshot | undefined;
let recovering = false;
const listeners = new Set<() => void>();
const blockers = new Set<Blocker>();
const pageCache = new Map<string, WorkspacePageState>();
let pendingPage: HistorySnapshot | undefined;
let pageWriteTimer: number | undefined;

function historyId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function pageCacheKey(entry: WorkspaceHistoryEntry): string {
  return JSON.stringify([entry.session, entry.key]);
}

function cancelPageWrite(): void {
  if (pageWriteTimer !== undefined) window.clearTimeout(pageWriteTimer);
  pageWriteTimer = undefined;
  pendingPage = undefined;
}

function queuePageWrite(value: HistorySnapshot): void {
  pendingPage = value;
  // One metadata write per second leaves capacity for explicit navigation.
  pageWriteTimer ??= window.setTimeout(flushHistoryPage, 1000);
}

export function flushHistoryPage(): void {
  const pending = pendingPage;
  cancelPageWrite();
  if (
    !pending ||
    recovering ||
    window.location.href !== pending.url ||
    readHistoryEntry(window.history.state)?.key !== pending.entry.key
  )
    return;
  try {
    window.history.replaceState(pending.state, "");
    pageCache.delete(pageCacheKey(pending.entry));
  } catch (error) {
    if (
      !(error instanceof DOMException) ||
      (error.name !== "SecurityError" && error.name !== "QuotaExceededError")
    )
      throw error;
    // Page metadata is optional. Keep it in memory and retry after the limit resets.
    queuePageWrite(pending);
  }
}

function snapshot(): HistorySnapshot {
  const state = record(window.history.state) ?? {};
  let entry = readHistoryEntry(state);
  if (!entry) {
    entry = {
      version: 1,
      session: historyId(),
      key: historyId(),
      index: 0,
    };
    state[stateKey] = entry;
    window.history.replaceState(state, "");
  }
  const cachedPage = pageCache.get(pageCacheKey(entry));
  if (cachedPage) {
    entry = { ...entry, page: cachedPage };
    state[stateKey] = entry;
  }
  return { url: window.location.href, entry, state };
}

export function getHistorySnapshot(): HistorySnapshot {
  if (
    !current ||
    (!listeners.size &&
      (current.url !== window.location.href ||
        readHistoryEntry(window.history.state)?.key !== current.entry.key))
  )
    current = snapshot();
  return current;
}

function emit() {
  for (const listener of listeners) listener();
}

function recover(next: HistorySnapshot) {
  const previous = getHistorySnapshot();
  const delta = previous.entry.index - next.entry.index;
  if (previous.entry.session === next.entry.session && delta !== 0) {
    recovering = true;
    window.history.go(delta);
  } else {
    // Legacy or foreign same-document entries have no usable traversal index.
    // Restore the accepted location without adding a new history entry.
    window.history.replaceState(previous.state, "", previous.url);
  }
}

function pop() {
  // The browser already moved. Do not persist the outgoing page over its destination.
  cancelPageWrite();
  const next = snapshot();
  if (recovering) {
    if (next.entry.key === getHistorySnapshot().entry.key) {
      recovering = false;
      if (pageCache.has(pageCacheKey(next.entry)))
        queuePageWrite(getHistorySnapshot());
    } else recover(next);
    return;
  }
  for (const blocker of blockers) {
    if (!blocker(next)) {
      recover(next);
      return;
    }
  }
  current = next;
  if (pageCache.has(pageCacheKey(next.entry))) queuePageWrite(next);
  emit();
}

export function subscribeHistory(listener: () => void): () => void {
  if (!listeners.size) {
    current = snapshot();
    recovering = false;
    window.addEventListener("popstate", pop);
    window.addEventListener("pagehide", flushHistoryPage);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      window.removeEventListener("popstate", pop);
      window.removeEventListener("pagehide", flushHistoryPage);
      flushHistoryPage();
      cancelPageWrite();
      pageCache.clear();
      current = undefined;
      recovering = false;
    }
  };
}

export function blockHistory(blocker: Blocker): () => void {
  blockers.add(blocker);
  return () => {
    blockers.delete(blocker);
  };
}

export function writeHistoryLocation(
  url: string,
  options: {
    replace?: boolean;
    state?: Record<string, unknown>;
    returnTo?: HistoryOrigin;
  } = {},
): void {
  const previous = getHistorySnapshot();
  const target = new URL(url, window.location.href);
  if (target.origin !== window.location.origin)
    throw new Error("History navigation must use the current origin");
  flushHistoryPage();
  const entry: WorkspaceHistoryEntry = options.replace
    ? { ...previous.entry }
    : {
        version: 1,
        session: previous.entry.session,
        key: historyId(),
        index: previous.entry.index + 1,
      };
  if (options.returnTo) entry.returnTo = options.returnTo;
  if (options.replace) {
    delete entry.page;
    delete entry.returnTo;
  }
  const state = { ...previous.state, ...options.state, [stateKey]: entry };
  window.history[options.replace ? "replaceState" : "pushState"](
    state,
    "",
    target,
  );
  cancelPageWrite();
  current = { entry, state, url: target.href };
  emit();
}

export function tryWriteHistoryLocation(
  url: string,
  options: Parameters<typeof writeHistoryLocation>[1] = {},
): boolean {
  const previous = getHistorySnapshot();
  const next = { ...previous, url: new URL(url, previous.url).href };
  for (const blocker of blockers) {
    if (!blocker(next)) return false;
  }
  writeHistoryLocation(url, options);
  return true;
}

export function saveHistoryPage(page: WorkspacePageState): void {
  const previous = getHistorySnapshot();
  // A popstate blocker runs after the browser has moved to the destination.
  // Never write the old page metadata over that destination entry.
  if (
    window.location.href !== previous.url ||
    readHistoryEntry(window.history.state)?.key !== previous.entry.key ||
    recovering
  )
    return;
  const entry = { ...previous.entry, page };
  const state = { ...previous.state, [stateKey]: entry };
  current = { ...previous, entry, state };
  pageCache.set(pageCacheKey(entry), page);
  queuePageWrite(current);
}
