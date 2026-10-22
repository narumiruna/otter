import type { ProviderAuthInteraction } from "@earendil-works/pi-ai";
import { afterEach, expect, test, vi } from "vitest";
import {
  callbackPortSentinel,
  clearOAuthOverrides,
  type DeviceOutcome,
  mockCodexHttp,
} from "./server-ai-device.test-utils.js";
import { AiLoginBroker } from "./server-ai-logins.js";
import {
  aiProviders,
  automaticAiChoice,
  loginAiProvider,
} from "./server-ai-providers.js";

function provider() {
  const result = aiProviders.find(({ id }) => id === "openai-codex");
  if (!result) throw new Error("Expected Codex provider");
  return result;
}
afterEach(() => vi.useRealTimers());

for (const occupied of [false, true]) {
  test(`real SDK device authorization succeeds without a callback listener (occupied=${occupied})`, async () => {
    const noCallback = await callbackPortSentinel(occupied);
    clearOAuthOverrides();
    const http = mockCodexHttp();
    http.outcome = "complete";
    vi.useFakeTimers();
    const save = vi.fn(async () => {});
    const broker = new AiLoginBroker(Buffer.alloc(32, 9), save);
    const initial = broker.start("alice", "browser", provider(), "oauth");
    if (!initial) throw new Error("Expected login");
    await vi.waitFor(() =>
      expect(broker.get("alice", "browser", initial.id)?.status).toBe(
        "complete",
      ),
    );
    expect(broker.get("alice", "browser", initial.id)).toEqual({
      ...initial,
      status: "complete",
    });
    expect(save).toHaveBeenCalledWith(
      "alice",
      "openai-codex",
      expect.objectContaining({
        type: "oauth",
        accountId: "account-dummy-device-1",
        refresh: "refresh-dummy-device-1",
      }),
      expect.any(AbortSignal),
    );
    expect(http.exchanges).toEqual(["dummy-device-1"]);
    expect(http.devices[0]?.signal.aborted).toBe(true);
    noCallback();
  });

  const failures: DeviceOutcome[] = [
    "start-error",
    "poll-error",
    "exchange-error",
    "invalid-jwt",
    "invalid-device",
    "invalid-poll",
  ];
  test.each(failures)(
    `real SDK %s fails without browser fallback (occupied=${occupied})`,
    async (outcome) => {
      const noCallback = await callbackPortSentinel(occupied);
      clearOAuthOverrides();
      const http = mockCodexHttp();
      http.outcome = outcome;
      vi.useFakeTimers();
      const save = vi.fn(async () => {});
      const broker = new AiLoginBroker(Buffer.alloc(32, 9), save);
      const state = broker.start("alice", "browser", provider(), "oauth");
      if (!state) throw new Error("Expected login");
      await vi.waitFor(() =>
        expect(broker.get("alice", "browser", state.id)?.status).toBe("error"),
      );
      expect(broker.get("alice", "browser", state.id)).toEqual({
        ...state,
        status: "error",
      });
      expect(http.devices).toHaveLength(1);
      expect(http.devices[0]?.signal.aborted).toBe(true);
      expect(http.exchanges).toHaveLength(
        outcome === "exchange-error" || outcome === "invalid-jwt" ? 1 : 0,
      );
      expect(save).not.toHaveBeenCalled();
      noCallback();
    },
  );

  test.each(["cancel", "broker-timeout"])(
    `real SDK pending flow stops on %s (occupied=${occupied})`,
    async (end) => {
      const noCallback = await callbackPortSentinel(occupied);
      clearOAuthOverrides();
      const http = mockCodexHttp();
      vi.useFakeTimers();
      const save = vi.fn(async () => {});
      const broker = new AiLoginBroker(Buffer.alloc(32, 9), save);
      const state = broker.start("alice", "browser", provider(), "oauth");
      if (!state) throw new Error("Expected login");
      await vi.waitFor(() => expect(http.devices[0]?.polls).toBe(1));
      expect(broker.get("alice", "browser", state.id)).toEqual({
        ...state,
        events: [
          {
            type: "device_code",
            userCode: "DUMMY-1",
            verificationUri: "https://auth.openai.com/codex/device",
            intervalSeconds: 0,
            expiresInSeconds: 900,
          },
        ],
      });
      expect(http.devices[0]?.polls).toBe(1);
      if (end === "cancel") {
        expect(await broker.cancel("alice", "browser", state.id)).toBe(true);
        expect(broker.get("alice", "browser", state.id)).toBeUndefined();
      } else {
        await vi.advanceTimersByTimeAsync(10 * 60_000);
        expect(broker.get("alice", "browser", state.id)).toEqual({
          ...state,
          status: "error",
        });
      }
      expect(http.devices[0]?.signal.aborted).toBe(true);
      const polls = http.devices[0]?.polls;
      await vi.advanceTimersByTimeAsync(20_000);
      expect(http.devices[0]?.polls).toBe(polls);
      expect(http.exchanges).toEqual([]);
      expect(save).not.toHaveBeenCalled();
      noCallback();
    },
  );
}

test("the actual SDK device deadline rejects without opening a callback listener", async () => {
  const noCallback = await callbackPortSentinel(true);
  clearOAuthOverrides();
  const http = mockCodexHttp();
  vi.useFakeTimers();
  const controller = new AbortController();
  const interaction: ProviderAuthInteraction = {
    signal: controller.signal,
    prompt: async (prompt) => {
      const choice = automaticAiChoice("openai-codex", "oauth", prompt);
      if (!choice) throw new Error("Unexpected SDK prompt");
      return choice;
    },
    notify: vi.fn(),
  };
  const result = expect(
    loginAiProvider(provider(), "oauth", interaction, {}),
  ).rejects.toThrow("Device flow timed out");
  await vi.waitFor(() => expect(http.devices[0]?.polls).toBe(1));
  await vi.advanceTimersByTimeAsync(15 * 60_000);
  await result;
  expect(http.exchanges).toEqual([]);
  expect(interaction.notify).toHaveBeenCalledTimes(1);
  noCallback();
});
