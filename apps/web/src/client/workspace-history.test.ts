// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  blockHistory,
  getHistorySnapshot,
  type HistorySnapshot,
  readHistoryEntry,
  saveHistoryPage,
  subscribeHistory,
  tryWriteHistoryLocation,
  type WorkspaceHistoryEntry,
  type WorkspacePageState,
  writeHistoryLocation,
} from "./workspace-history.js";

const stateKey = "otterWorkspaceHistory";
const listUrl = "/?trip=trip_1&view=expenses";
const editUrl = `${listUrl}&mode=edit-expense&expense=expense_1`;
const page: WorkspacePageState = {
  pageKey: "trip_1:expenses",
  scrollY: 420,
  list: {
    tripId: "trip_1",
    grouping: "payer",
    focusExpenseId: "expense_1",
    filters: {
      query: "Dinner",
      dateFrom: "2026-10-01",
      dateTo: "2026-10-18",
      paidById: "person_1",
      participantId: "person_2",
      currency: "USD",
      category: "food",
      tag: "shared",
      sort: "amount-desc",
    },
  },
};
const entry: WorkspaceHistoryEntry = {
  version: 1,
  session: "session_1",
  key: "entry_1",
  index: 3,
};

const cleanups: (() => void)[] = [];

function subscribe(listener: () => void = () => undefined) {
  const cleanup = subscribeHistory(listener);
  cleanups.push(cleanup);
  return cleanup;
}

function block(blocker: (next: HistorySnapshot) => boolean) {
  cleanups.push(blockHistory(blocker));
}

function seed(metadata: unknown = entry, extra: Record<string, unknown> = {}) {
  window.history.replaceState({ ...extra, [stateKey]: metadata }, "", listUrl);
  subscribe();
  return getHistorySnapshot();
}

// JSDOM does not need to perform native traversal here. Move to its destination
// before popstate, as a browser does, and inspect the compensating go() call.
function arrive(destination: HistorySnapshot) {
  window.history.replaceState(destination.state, "", destination.url);
  window.dispatchEvent(
    new PopStateEvent("popstate", { state: destination.state }),
  );
}

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  // The module owns a singleton snapshot and one native listener. Always remove
  // both subscribers and blockers, including when an assertion fails.
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  vi.restoreAllMocks();
});

describe("guarded page navigation", () => {
  it("does not write or notify when a blocker refuses an account entry", () => {
    const listener = vi.fn();
    seed();
    subscribe(listener);
    const previous = getHistorySnapshot();
    block(() => false);
    const push = vi.spyOn(window.history, "pushState");
    expect(tryWriteHistoryLocation(`${listUrl}&account=settings`)).toBe(false);
    expect(push).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    expect(getHistorySnapshot()).toBe(previous);
  });
  it("writes one account entry with source metadata when guards accept", () => {
    const previous = seed();
    block(() => true);
    expect(
      tryWriteHistoryLocation(`${listUrl}&account=settings`, {
        state: { otterAccountSettingsSource: previous.entry.key },
      }),
    ).toBe(true);
    expect(getHistorySnapshot().entry.index).toBe(previous.entry.index + 1);
    expect(window.history.state.otterAccountSettingsSource).toBe(
      previous.entry.key,
    );
  });
});

describe("history metadata guards", () => {
  it.each([
    null,
    undefined,
    [],
    "legacy",
    {},
    { [stateKey]: null },
    { [stateKey]: [] },
    { [stateKey]: { ...entry, version: 0 } },
    { [stateKey]: { ...entry, version: 2 } },
    { [stateKey]: { ...entry, session: null } },
    { [stateKey]: { ...entry, key: 42 } },
    { [stateKey]: { ...entry, index: -1 } },
    { [stateKey]: { ...entry, index: 1.5 } },
    { [stateKey]: { ...entry, index: "3" } },
    { [stateKey]: { ...entry, index: Number.NaN } },
    { [stateKey]: { ...entry, index: Number.POSITIVE_INFINITY } },
    { [stateKey]: { ...entry, index: Number.MAX_SAFE_INTEGER + 1 } },
  ])("rejects malformed or unsupported metadata: %j", (state) => {
    expect(readHistoryEntry(state)).toBeNull();
  });

  it("replaces old metadata safely without adding an entry or losing other state", () => {
    const length = window.history.length;
    const replace = vi.spyOn(window.history, "replaceState");
    const push = vi.spyOn(window.history, "pushState");
    const result = seed(
      { ...entry, version: 0 },
      { account: "settings", other: { id: 7 } },
    );

    expect(result.entry).toMatchObject({ version: 1, index: 0 });
    expect(result.entry.key).not.toBe(entry.key);
    expect(result.entry.session).not.toBe(entry.session);
    expect(result.state).toMatchObject({
      account: "settings",
      other: { id: 7 },
    });
    expect(readHistoryEntry(window.history.state)).toEqual(result.entry);
    expect(replace).toHaveBeenCalledTimes(2);
    expect(push).not.toHaveBeenCalled();
    expect(window.history.length).toBe(length);
  });

  it.each([
    null,
    [],
    {},
    { pageKey: 7, scrollY: 0 },
    { pageKey: "list", scrollY: "0" },
    { pageKey: "list", scrollY: -1 },
    { pageKey: "list", scrollY: Number.NaN },
    { pageKey: "list", scrollY: Number.POSITIVE_INFINITY },
  ])("drops invalid page metadata but retains the entry: %j", (invalidPage) => {
    expect(
      readHistoryEntry({ [stateKey]: { ...entry, page: invalidPage } }),
    ).toEqual({ ...entry, page: undefined });
  });

  it.each(["date", "none", "payer"])("reads the %s grouping", (grouping) => {
    const value = { ...page, list: { ...page.list, grouping } };
    expect(
      readHistoryEntry({ [stateKey]: { ...entry, page: value } })?.page,
    ).toEqual(value);
  });

  it.each(["date-desc", "date-asc", "amount-desc", "amount-asc"])(
    "reads the %s sort",
    (sort) => {
      const value = {
        ...page,
        list: { ...page.list, filters: { ...page.list?.filters, sort } },
      };
      expect(
        readHistoryEntry({ [stateKey]: { ...entry, page: value } })?.page,
      ).toEqual(value);
    },
  );

  it.each([
    "query",
    "dateFrom",
    "dateTo",
    "paidById",
    "participantId",
    "currency",
    "category",
    "tag",
    "sort",
  ])("rejects a list snapshot with an invalid %s filter", (field) => {
    const invalid = {
      ...page,
      list: { ...page.list, filters: { ...page.list?.filters, [field]: 42 } },
    };
    expect(
      readHistoryEntry({ [stateKey]: { ...entry, page: invalid } })?.page,
    ).toEqual({ pageKey: page.pageKey, scrollY: page.scrollY });
  });

  it.each([
    null,
    [],
    {},
    { ...page.list, tripId: 7 },
    { ...page.list, grouping: "category" },
    { ...page.list, filters: [] },
    { ...page.list, filters: { ...page.list?.filters, sort: "description" } },
  ])(
    "drops invalid list metadata without losing valid scroll metadata: %j",
    (list) => {
      expect(
        readHistoryEntry({ [stateKey]: { ...entry, page: { ...page, list } } })
          ?.page,
      ).toEqual({ pageKey: page.pageKey, scrollY: page.scrollY });
    },
  );

  it("copies only UI metadata and excludes drafts and unknown nested fields", () => {
    const value = {
      ...page,
      draft: { description: "unsaved", amount: 123 },
      list: {
        ...page.list,
        draft: { description: "unsaved" },
        filters: { ...page.list?.filters, draft: "unsaved" },
      },
    };
    expect(
      readHistoryEntry({
        [stateKey]: { ...entry, page: value, draft: "unsaved" },
      }),
    ).toEqual({ ...entry, page });
  });

  it("omits a malformed optional focus ID", () => {
    const result = readHistoryEntry({
      [stateKey]: {
        ...entry,
        page: {
          ...page,
          list: { ...page.list, focusExpenseId: 7 },
        },
      },
    });
    expect(result?.page?.list).toEqual({
      tripId: "trip_1",
      grouping: "payer",
      filters: page.list?.filters,
    });
  });

  it.each([
    null,
    [],
    {},
    { key: 7, index: 2, url: listUrl },
    { key: "list", index: -1, url: listUrl },
    { key: "list", index: 1.5, url: listUrl },
    { key: "list", index: Number.MAX_SAFE_INTEGER + 1, url: listUrl },
    { key: "list", index: 2, url: null },
    { key: "", index: 2, url: listUrl },
    { key: "list", index: 0, url: listUrl },
    { key: "list", index: 1, url: listUrl },
    { key: "list", index: 3, url: listUrl },
    { key: "list", index: 4, url: listUrl },
    { key: "list", index: 2, url: "http://[" },
    { key: "list", index: 2, url: "https://other.test/" },
    { key: "list", index: 2, url: "//other.test/" },
    { key: "list", index: 2, url: "javascript:alert(1)" },
  ])("drops malformed or unverifiable return provenance: %j", (returnTo) => {
    expect(readHistoryEntry({ [stateKey]: { ...entry, returnTo } })).toEqual({
      ...entry,
      page: undefined,
    });
  });
});

describe("history writes", () => {
  it("retains adjacent same-origin return provenance when reading a saved entry", () => {
    const returnTo = {
      key: "source",
      index: 2,
      url: new URL(listUrl, window.location.href).href,
    };
    expect(readHistoryEntry({ [stateKey]: { ...entry, returnTo } })).toEqual({
      ...entry,
      page: undefined,
      returnTo,
    });
  });

  it("pushes a new key and next index, preserving state but not source page metadata", () => {
    const original = seed(
      { ...entry, page },
      { account: "settings", extension: { id: 7 } },
    );
    const listener = vi.fn();
    subscribe(listener);
    const push = vi.spyOn(window.history, "pushState");
    const replace = vi.spyOn(window.history, "replaceState");
    writeHistoryLocation(editUrl, { state: { account: null, extra: true } });
    const next = getHistorySnapshot();

    expect(next.entry).toMatchObject({
      session: original.entry.session,
      index: entry.index + 1,
    });
    expect(next.entry.key).not.toBe(original.entry.key);
    expect(next.entry.page).toBeUndefined();
    expect(next.state).toMatchObject({
      account: null,
      extension: { id: 7 },
      extra: true,
    });
    expect(readHistoryEntry(window.history.state)).toEqual({
      ...next.entry,
      page: undefined,
    });
    expect(window.location.href).toBe(next.url);
    expect(push).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("replaces with the same identity and clears stale page and return provenance", () => {
    const original = seed({
      ...entry,
      page,
      returnTo: { key: "previous", index: 2, url: listUrl },
    });
    const length = window.history.length;
    const push = vi.spyOn(window.history, "pushState");
    const replace = vi.spyOn(window.history, "replaceState");
    writeHistoryLocation(editUrl, { replace: true });

    expect(getHistorySnapshot().entry).toEqual(entry);
    expect(getHistorySnapshot().entry.key).toBe(original.entry.key);
    expect(window.history.length).toBe(length);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it("keeps explicit source provenance on the editor, not on subsequent entries", () => {
    const source = seed({ ...entry, page });
    const returnTo = {
      key: source.entry.key,
      index: source.entry.index,
      url: source.url,
    };
    writeHistoryLocation(editUrl, { returnTo });
    expect(getHistorySnapshot().entry.returnTo).toEqual(returnTo);
    expect(readHistoryEntry(window.history.state)?.returnTo).toEqual(returnTo);

    writeHistoryLocation("/?trip=trip_1&view=overview");
    expect(getHistorySnapshot().entry.returnTo).toBeUndefined();
  });

  it.each(["https://other.test/", "//other.test/", "javascript:alert(1)"])(
    "rejects cross-origin navigation to %s without changing history",
    (url) => {
      const original = seed();
      const push = vi.spyOn(window.history, "pushState");
      const replace = vi.spyOn(window.history, "replaceState");
      const listener = vi.fn();
      subscribe(listener);
      expect(() => writeHistoryLocation(url)).toThrow("current origin");
      expect(getHistorySnapshot()).toBe(original);
      expect(window.location.href).toBe(original.url);
      expect(push).not.toHaveBeenCalled();
      expect(replace).not.toHaveBeenCalled();
      expect(listener).not.toHaveBeenCalled();
    },
  );

  it("saves a UI snapshot with replace and without changing key, index, or unknown state", () => {
    seed(entry, { account: "settings", extension: { id: 7 } });
    const listener = vi.fn();
    subscribe(listener);
    const replace = vi.spyOn(window.history, "replaceState");
    const push = vi.spyOn(window.history, "pushState");
    saveHistoryPage(page);

    expect(getHistorySnapshot().entry).toEqual({ ...entry, page });
    expect(readHistoryEntry(window.history.state)).toEqual({ ...entry, page });
    expect(window.history.state).toMatchObject({
      account: "settings",
      extension: { id: 7 },
    });
    expect(replace).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("native traversal", () => {
  it("accepts traversal once and notifies only subscribed listeners", () => {
    const destination = seed({ ...entry, page });
    writeHistoryLocation(editUrl);
    const listener = vi.fn();
    const removed = vi.fn();
    subscribe(listener);
    subscribe(removed)();
    const blocker = vi.fn(() => true);
    block(blocker);
    const go = vi
      .spyOn(window.history, "go")
      .mockImplementation(() => undefined);
    arrive(destination);

    expect(getHistorySnapshot()).toEqual(destination);
    expect(blocker).toHaveBeenCalledTimes(1);
    expect(blocker).toHaveBeenCalledWith(destination);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(removed).not.toHaveBeenCalled();
    expect(go).not.toHaveBeenCalled();
  });

  it.each([-3, -1, 1, 3])(
    "compensates the actual traversal delta %i without duplicate entries or prompts",
    (delta) => {
      const accepted = seed({ ...entry, index: 5, page });
      const destinationEntry = {
        ...entry,
        index: 5 + delta,
        key: `destination_${delta}`,
      };
      const destination: HistorySnapshot = {
        url: new URL(editUrl, accepted.url).href,
        entry: destinationEntry,
        state: { [stateKey]: destinationEntry, extension: "destination" },
      };
      const listener = vi.fn();
      subscribe(listener);
      const blocker = vi.fn(() => false);
      block(blocker);
      const go = vi
        .spyOn(window.history, "go")
        .mockImplementation(() => undefined);
      const push = vi.spyOn(window.history, "pushState");
      const length = window.history.length;
      arrive(destination);

      expect(go).toHaveBeenCalledExactlyOnceWith(-delta);
      expect(getHistorySnapshot()).toBe(accepted);
      expect(window.history.state).toEqual(destination.state);
      expect(listener).not.toHaveBeenCalled();
      arrive(accepted);
      expect(blocker).toHaveBeenCalledTimes(1);
      expect(listener).not.toHaveBeenCalled();
      expect(go).toHaveBeenCalledTimes(1);
      expect(push).not.toHaveBeenCalled();
      expect(window.history.length).toBe(length);

      // Recovery is complete: a later traversal must be checked again.
      arrive(destination);
      expect(blocker).toHaveBeenCalledTimes(2);
      expect(go).toHaveBeenCalledTimes(2);
    },
  );

  it("compensates rapid traversal during recovery without prompting or pushing again", () => {
    const accepted = seed({ ...entry, index: 5, page });
    const blocker = vi.fn(() => false);
    block(blocker);
    const listener = vi.fn();
    subscribe(listener);
    const go = vi
      .spyOn(window.history, "go")
      .mockImplementation(() => undefined);
    const push = vi.spyOn(window.history, "pushState");
    const length = window.history.length;
    for (const index of [2, 7]) {
      const next = { ...entry, key: `rapid_${index}`, index };
      arrive({
        url: new URL(editUrl, accepted.url).href,
        entry: next,
        state: { [stateKey]: next },
      });
    }

    expect(go.mock.calls).toEqual([[3], [-2]]);
    expect(blocker).toHaveBeenCalledTimes(1);
    expect(getHistorySnapshot()).toBe(accepted);
    expect(listener).not.toHaveBeenCalled();

    // Even at the accepted URL/key, metadata cannot be saved until the
    // compensation popstate is processed.
    window.history.replaceState(accepted.state, "", accepted.url);
    saveHistoryPage({ ...page, scrollY: 999 });
    expect(window.history.state).toEqual(accepted.state);
    window.dispatchEvent(
      new PopStateEvent("popstate", { state: accepted.state }),
    );
    expect(blocker).toHaveBeenCalledTimes(1);
    expect(listener).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(window.history.length).toBe(length);
  });

  it.each(["different-url", "same-url"])(
    "does not save an outgoing page over a %s traversal destination",
    (kind) => {
      const accepted = seed({ ...entry, page });
      const destinationEntry = {
        ...entry,
        key: "destination",
        index: 2,
        page: { pageKey: "destination", scrollY: 12 },
      };
      const destination: HistorySnapshot = {
        url:
          kind === "same-url"
            ? accepted.url
            : new URL(editUrl, accepted.url).href,
        entry: destinationEntry,
        state: { [stateKey]: destinationEntry },
      };
      const go = vi
        .spyOn(window.history, "go")
        .mockImplementation(() => undefined);
      block(() => {
        saveHistoryPage({ ...page, scrollY: 999 });
        return false;
      });
      arrive(destination);
      expect(window.history.state).toEqual(destination.state);
      expect(getHistorySnapshot()).toBe(accepted);
      expect(go).toHaveBeenCalledExactlyOnceWith(1);
      saveHistoryPage({ ...page, scrollY: 1000 });
      expect(window.history.state).toEqual(destination.state);
      arrive(accepted);
      saveHistoryPage({ ...page, scrollY: 500 });
      expect(getHistorySnapshot().entry.page?.scrollY).toBe(500);
    },
  );

  it.each(["missing", "foreign-session", "same-index"])(
    "restores a %s same-document entry without pushing a duplicate",
    (kind) => {
      const accepted = seed({ ...entry, page }, { account: "settings" });
      const metadata =
        kind === "missing"
          ? undefined
          : {
              ...entry,
              key: "legacy",
              session: kind === "foreign-session" ? "foreign" : entry.session,
            };
      const blocker = vi.fn(() => false);
      block(blocker);
      const listener = vi.fn();
      subscribe(listener);
      const go = vi
        .spyOn(window.history, "go")
        .mockImplementation(() => undefined);
      const push = vi.spyOn(window.history, "pushState");
      const length = window.history.length;
      window.history.replaceState(
        { legacy: true, [stateKey]: metadata },
        "",
        editUrl,
      );
      window.dispatchEvent(
        new PopStateEvent("popstate", { state: window.history.state }),
      );

      expect(window.location.href).toBe(accepted.url);
      expect(window.history.state).toEqual(accepted.state);
      expect(getHistorySnapshot()).toBe(accepted);
      expect(blocker).toHaveBeenCalledTimes(1);
      expect(listener).not.toHaveBeenCalled();
      expect(go).not.toHaveBeenCalled();
      expect(push).not.toHaveBeenCalled();
      expect(window.history.length).toBe(length);
    },
  );

  it("removes blockers and resets the snapshot when the last subscriber leaves", () => {
    const accepted = seed();
    const stop = blockHistory(() => false);
    stop();
    const destinationEntry = { ...entry, key: "next", index: 2 };
    const destination: HistorySnapshot = {
      url: new URL(editUrl, accepted.url).href,
      entry: destinationEntry,
      state: { [stateKey]: destinationEntry },
    };
    arrive(destination);
    expect(getHistorySnapshot().entry.key).toBe("next");
    for (const cleanup of cleanups.splice(0).reverse()) cleanup();

    window.history.replaceState({ [stateKey]: entry }, "", listUrl);
    const listener = vi.fn();
    subscribe(listener);
    expect(getHistorySnapshot().entry).toEqual({ ...entry, page: undefined });
    expect(listener).not.toHaveBeenCalled();
  });
});
