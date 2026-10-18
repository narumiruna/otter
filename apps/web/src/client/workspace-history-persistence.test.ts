// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  blockHistory,
  getHistorySnapshot,
  saveHistoryPage,
  subscribeHistory,
  type WorkspacePageState,
  writeHistoryLocation,
} from "./workspace-history.js";

const listUrl = "/?trip=t&view=expenses";
const editUrl = `${listUrl}&mode=edit-expense&expense=e`;
const page: WorkspacePageState = { pageKey: "t:expenses:", scrollY: 0 };
let unsubscribe: () => void;
let unblock: (() => void) | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  window.history.replaceState({}, "", listUrl);
  unsubscribe = subscribeHistory(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  unblock?.();
  unblock = undefined;
  unsubscribe();
  vi.useRealTimers();
});

test("many scroll snapshots update memory without one history write per event", () => {
  const replace = vi.spyOn(window.history, "replaceState");
  for (let scrollY = 0; scrollY < 1000; scrollY++)
    saveHistoryPage({ ...page, scrollY });
  expect(getHistorySnapshot().entry.page?.scrollY).toBe(999);
  expect(replace).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1000);
  expect(replace).toHaveBeenCalledTimes(1);
  expect(window.history.state.otterWorkspaceHistory.page.scrollY).toBe(999);
});

test("continuous capture leaves quota for explicit navigation", () => {
  const replace = vi.spyOn(window.history, "replaceState");
  for (let tick = 0; tick < 600; tick++) {
    saveHistoryPage({ ...page, scrollY: tick });
    vi.advanceTimersByTime(50);
  }
  expect(replace.mock.calls.length).toBeLessThanOrEqual(30);
  expect(getHistorySnapshot().entry.page?.scrollY).toBe(599);
  const push = vi.spyOn(window.history, "pushState");
  writeHistoryLocation(editUrl);
  expect(push).toHaveBeenCalledTimes(1);
  expect(window.location.search).toContain("mode=edit-expense");
});

test("explicit navigation persists the exact source page before pushing", () => {
  const replace = vi.spyOn(window.history, "replaceState");
  const push = vi.spyOn(window.history, "pushState");
  saveHistoryPage({ ...page, scrollY: 845 });
  writeHistoryLocation(editUrl);
  expect(replace).toHaveBeenCalledTimes(1);
  expect(replace.mock.calls[0][0].otterWorkspaceHistory.page.scrollY).toBe(845);
  expect(replace.mock.invocationCallOrder[0]).toBeLessThan(
    push.mock.invocationCallOrder[0],
  );
  vi.advanceTimersByTime(1000);
  expect(replace).toHaveBeenCalledTimes(1);
  expect(getHistorySnapshot().entry.page).toBeUndefined();
});

test("native traversal restores a page that was still waiting for persistence", () => {
  const source = getHistorySnapshot();
  writeHistoryLocation(editUrl);
  const rawEditorState = window.history.state;
  saveHistoryPage({ ...page, pageKey: "t:edit-expense:e", scrollY: 732 });
  window.history.replaceState(source.state, "", source.url);
  window.dispatchEvent(new PopStateEvent("popstate"));
  expect(getHistorySnapshot().entry.key).toBe(source.entry.key);
  window.history.replaceState(rawEditorState, "", editUrl);
  window.dispatchEvent(new PopStateEvent("popstate"));
  expect(getHistorySnapshot().entry.page?.scrollY).toBe(732);
  vi.advanceTimersByTime(1000);
  expect(window.history.state.otterWorkspaceHistory.page.scrollY).toBe(732);
});

test("a delayed source write cannot overwrite a native traversal destination", () => {
  const source = getHistorySnapshot();
  writeHistoryLocation(editUrl);
  saveHistoryPage({ ...page, scrollY: 900 });
  window.history.replaceState(source.state, "", source.url);
  window.dispatchEvent(new PopStateEvent("popstate"));
  const replace = vi.spyOn(window.history, "replaceState");
  vi.advanceTimersByTime(1000);
  expect(replace).not.toHaveBeenCalled();
  expect(getHistorySnapshot().entry.key).toBe(source.entry.key);
  expect(window.history.state.otterWorkspaceHistory.page).toBeUndefined();
});

test("rejected traversal keeps the latest memory page and does not write the destination", () => {
  const source = getHistorySnapshot();
  writeHistoryLocation(editUrl);
  const accepted = getHistorySnapshot();
  saveHistoryPage({ ...page, scrollY: 401 });
  unblock = blockHistory(() => false);
  const go = vi.spyOn(window.history, "go").mockImplementation(() => {});
  window.history.replaceState(source.state, "", source.url);
  const replace = vi.spyOn(window.history, "replaceState");
  window.dispatchEvent(new PopStateEvent("popstate"));
  vi.advanceTimersByTime(1000);
  expect(go).toHaveBeenCalledWith(1);
  expect(replace).not.toHaveBeenCalled();
  expect(getHistorySnapshot().entry.page?.scrollY).toBe(401);
  replace.mockRestore();
  window.history.replaceState(accepted.state, "", accepted.url);
  window.dispatchEvent(new PopStateEvent("popstate"));
});

test.each(["SecurityError", "QuotaExceededError"])(
  "metadata %s does not block navigation",
  (name) => {
    vi.spyOn(window.history, "replaceState").mockImplementation(() => {
      throw new DOMException("History metadata quota", name);
    });
    expect(() => saveHistoryPage({ ...page, scrollY: 563 })).not.toThrow();
    expect(() => vi.advanceTimersByTime(1000)).not.toThrow();
    expect(getHistorySnapshot().entry.page?.scrollY).toBe(563);
    expect(() => writeHistoryLocation(editUrl)).not.toThrow();
    expect(window.location.search).toContain("mode=edit-expense");
  },
);

test("pagehide persists the latest page before a document reload", () => {
  saveHistoryPage({ ...page, scrollY: 317 });
  window.dispatchEvent(new Event("pagehide"));
  expect(window.history.state.otterWorkspaceHistory.page.scrollY).toBe(317);
});

test("the last subscriber flushes its page and cancels delayed writes", () => {
  saveHistoryPage({ ...page, scrollY: 223 });
  unsubscribe();
  unsubscribe = () => {};
  expect(window.history.state.otterWorkspaceHistory.page.scrollY).toBe(223);
  const replace = vi.spyOn(window.history, "replaceState");
  vi.advanceTimersByTime(5000);
  expect(replace).not.toHaveBeenCalled();
});
