// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const stateKey = "otterWorkspaceHistory";
const listUrl = "/?trip=interface-trip&view=expenses";
const editUrl = `${listUrl}&mode=edit-expense&expense=dinner`;
let stop: (() => void) | undefined;
let sequence = 0;
const randomValues = vi.fn((bytes: Uint8Array) => {
  expect(bytes).toBeInstanceOf(Uint8Array);
  expect(bytes).toHaveLength(16);
  return bytes.fill(++sequence);
});

beforeEach(() => {
  vi.resetModules();
  sequence = 0;
  randomValues.mockClear();
  // Model the Crypto API on ordinary HTTP, not a secure-context browser.
  vi.stubGlobal("crypto", { getRandomValues: randomValues });
  window.history.replaceState({ extension: { id: 7 } }, "", listUrl);
});

afterEach(() => {
  stop?.();
  stop = undefined;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("history without crypto.randomUUID", () => {
  it("bootstraps stable, distinct session and entry IDs with getRandomValues", async () => {
    const history = await import("./workspace-history.js");
    expect(crypto.randomUUID).toBeUndefined();
    const length = window.history.length;
    const first = history.getHistorySnapshot();
    expect(first.entry.session).toMatch(/^[0-9a-f]{32}$/);
    expect(first.entry.key).toMatch(/^[0-9a-f]{32}$/);
    expect(first.entry.session).not.toBe(first.entry.key);
    expect(first.entry.index).toBe(0);
    expect(first.state.extension).toEqual({ id: 7 });
    expect(randomValues).toHaveBeenCalledTimes(2);
    expect(history.getHistorySnapshot().entry).toEqual(first.entry);
    stop = history.subscribeHistory(() => undefined);
    expect(history.getHistorySnapshot().entry).toEqual(first.entry);
    expect(history.readHistoryEntry(window.history.state)).toEqual({
      ...first.entry,
      page: undefined,
    });
    expect(randomValues).toHaveBeenCalledTimes(2);
    expect(window.history.length).toBe(length);
  });

  it("pushes unique entry IDs in one session and replaces without changing identity or other state", async () => {
    const history = await import("./workspace-history.js");
    stop = history.subscribeHistory(() => undefined);
    const first = history.getHistorySnapshot();
    const keys = new Set([first.entry.session, first.entry.key]);
    for (let index = 1; index <= 4; index++) {
      history.writeHistoryLocation(`${editUrl}&step=${index}`, {
        state: { marker: index },
      });
      const pushed = history.getHistorySnapshot();
      expect(pushed.entry.session).toBe(first.entry.session);
      expect(pushed.entry.index).toBe(index);
      expect(pushed.entry.key).toMatch(/^[0-9a-f]{32}$/);
      expect(keys.has(pushed.entry.key)).toBe(false);
      keys.add(pushed.entry.key);
      expect(pushed.state.extension).toEqual({ id: 7 });
      const length = window.history.length;
      const calls = randomValues.mock.calls.length;
      history.writeHistoryLocation(`${listUrl}&step=${index}`, {
        replace: true,
        state: { replaced: true },
      });
      const replaced = history.getHistorySnapshot();
      expect(replaced.entry).toEqual(pushed.entry);
      expect(replaced.state).toMatchObject({
        extension: { id: 7 },
        marker: index,
        replaced: true,
      });
      expect(history.readHistoryEntry(window.history.state)).toEqual({
        ...replaced.entry,
        page: undefined,
      });
      expect(randomValues).toHaveBeenCalledTimes(calls);
      expect(window.history.length).toBe(length);
    }
    expect(randomValues).toHaveBeenCalledTimes(6);
    expect(keys.size).toBe(6);
  });

  it("reuses persisted IDs after a new module load without requesting random bytes", async () => {
    const history = await import("./workspace-history.js");
    const first = history.getHistorySnapshot();
    vi.resetModules();
    const reloaded = await import("./workspace-history.js");
    stop = reloaded.subscribeHistory(() => undefined);
    expect(reloaded.getHistorySnapshot().entry).toEqual({
      ...first.entry,
      page: undefined,
    });
    expect(window.history.state[stateKey].key).toBe(first.entry.key);
    expect(reloaded.getHistorySnapshot().state.extension).toEqual({ id: 7 });
    expect(randomValues).toHaveBeenCalledTimes(2);
  });
});
