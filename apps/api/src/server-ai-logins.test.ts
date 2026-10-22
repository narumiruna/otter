import type { Credential } from "@earendil-works/pi-ai";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { AiLoginBroker } from "./server-ai-logins.js";
import { type AiProviderLogin, aiProviders } from "./server-ai-providers.js";

const key = Buffer.alloc(32, 7);
const apiCredential: Credential = { type: "api_key", key: "never-return-this" };
const oauthCredential: Credential = {
  type: "oauth",
  access: "access-secret",
  refresh: "refresh-secret",
  expires: 9999999999999,
};
function provider(id = "openai") {
  const result = aiProviders.find((provider) => provider.id === id);
  if (!result) throw new Error("Missing provider");
  return result;
}
const flush = () => vi.advanceTimersByTimeAsync(0);
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test("API-key login waits for the SDK credential before saving; input never appears in state", async () => {
  let finish: (() => void) | undefined;
  const save = vi.fn(async () => {});
  const sdk: AiProviderLogin = async (
    _provider,
    _method,
    interaction,
    options,
  ) => {
    expect(options.agentName).toBe("otter");
    expect(options.getDeviceId?.()).toMatch(/^[0-9a-f-]{36}$/);
    const value = await interaction.prompt({
      type: "secret",
      message: "Enter API key",
    });
    expect(value).toBe(apiCredential.key);
    await new Promise<void>((resolve) => {
      finish = resolve;
    });
    return apiCredential;
  };
  const broker = new AiLoginBroker(key, save, sdk);
  const initial = broker.start("alice", "browser", provider(), "api_key");
  if (!initial) throw new Error("Expected login");
  expect(initial).toMatchObject({ status: "pending", events: [] });
  expect(initial.prompt).toBeUndefined();
  await flush();
  const prompt = broker.get("alice", "browser", initial.id)?.prompt;
  if (!prompt) throw new Error("Expected prompt");
  expect(save).not.toHaveBeenCalled();
  expect(broker.get("bob", "browser", initial.id)).toBeUndefined();
  expect(broker.get("alice", "other-browser", initial.id)).toBeUndefined();
  expect(
    broker.respond("alice", "browser", initial.id, "stale", "secret"),
  ).toBe("invalid");
  expect(broker.respond("alice", "browser", initial.id, prompt.id, "")).toBe(
    "invalid",
  );
  const response = broker.respond(
    "alice",
    "browser",
    initial.id,
    prompt.id,
    apiCredential.key ?? "",
  );
  expect(JSON.stringify(response)).not.toContain(apiCredential.key);
  expect(
    broker.respond("alice", "browser", initial.id, prompt.id, "replay"),
  ).toBe("invalid");
  await flush();
  expect(save).not.toHaveBeenCalled();
  finish?.();
  await flush();
  expect(save).toHaveBeenCalledWith(
    "alice",
    "openai",
    apiCredential,
    expect.any(AbortSignal),
  );
  expect(broker.get("alice", "browser", initial.id)).toMatchObject({
    status: "complete",
    events: [],
  });
  await vi.advanceTimersByTimeAsync(60_000);
  expect(broker.get("alice", "browser", initial.id)).toBeUndefined();
});

test("OAuth auth URL/manual-code and device events are serializable, with per-prompt abort cleanup", async () => {
  const promptAbort = new AbortController();
  const save = vi.fn(async () => {});
  const sdk: AiProviderLogin = async (_provider, _method, interaction) => {
    interaction.notify({
      type: "auth_url",
      url: "https://auth.example/authorize?state=random",
      instructions: "Paste final redirect",
    });
    try {
      await interaction.prompt({
        type: "manual_code",
        message: "Paste URL",
        signal: promptAbort.signal,
      });
    } catch {
      /* Simulate callback winning this SDK step. */
    }
    interaction.notify({
      type: "device_code",
      userCode: "AB-CD",
      verificationUri: "https://auth.example/device",
      intervalSeconds: 5,
      expiresInSeconds: 300,
    });
    const code = await interaction.prompt({
      type: "manual_code",
      message: "Second prompt",
    });
    expect(code).toBe("manual-secret");
    return oauthCredential;
  };
  const broker = new AiLoginBroker(key, save, sdk);
  const initial = broker.start("alice", "browser", provider(), "oauth");
  if (!initial) throw new Error("Expected login");
  await flush();
  const old = broker.get("alice", "browser", initial.id)?.prompt;
  expect(old).not.toHaveProperty("signal");
  expect(broker.get("alice", "browser", initial.id)?.events[0]?.type).toBe(
    "auth_url",
  );
  promptAbort.abort();
  await flush();
  const next = broker.get("alice", "browser", initial.id)?.prompt;
  if (!old || !next) throw new Error("Expected prompts");
  expect(next.id).not.toBe(old.id);
  expect(broker.respond("alice", "browser", initial.id, old.id, "stale")).toBe(
    "invalid",
  );
  expect(broker.get("alice", "browser", initial.id)?.events[1]).toMatchObject({
    type: "device_code",
    userCode: "AB-CD",
  });
  broker.respond("alice", "browser", initial.id, next.id, "manual-secret");
  await flush();
  const result = broker.get("alice", "browser", initial.id);
  expect(result).toMatchObject({ status: "complete", events: [] });
  expect(JSON.stringify(result)).not.toContain("secret");
  expect(save).toHaveBeenCalledOnce();
});

test("cancel and ten-minute expiry abort pending prompts and never save later credentials", async () => {
  const save = vi.fn(async () => {});
  const signals: AbortSignal[] = [];
  const sdk: AiProviderLogin = async (_provider, _method, interaction) => {
    signals.push(interaction.signal);
    interaction.notify({ type: "info", message: "Start" });
    await interaction.prompt({ type: "secret", message: "Key" });
    return apiCredential;
  };
  const broker = new AiLoginBroker(key, save, sdk);
  const first = broker.start("alice", "browser", provider(), "api_key");
  const second = broker.start("bob", "browser", provider(), "api_key");
  if (!first || !second) throw new Error("Expected logins");
  await flush();
  expect(await broker.cancel("alice", "other-browser", first.id)).toBe(false);
  expect(await broker.cancel("alice", "browser", first.id)).toBe(true);
  expect(broker.get("alice", "browser", first.id)).toBeUndefined();
  await vi.advanceTimersByTimeAsync(10 * 60_000);
  expect(signals.every((signal) => signal.aborted)).toBe(true);
  expect(broker.get("bob", "browser", second.id)).toMatchObject({
    status: "error",
    events: [],
  });
  expect(broker.get("bob", "browser", second.id)?.prompt).toBeUndefined();
  expect(save).not.toHaveBeenCalled();
});

test("late SDK success after cancellation and raw provider errors remain private", async () => {
  let resolve: ((value: Credential) => void) | undefined;
  const save = vi.fn(async () => {});
  const broker = new AiLoginBroker(
    key,
    save,
    async () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const initial = broker.start("alice", "browser", provider(), "oauth");
  if (!initial) throw new Error("Expected login");
  await flush();
  const cancellation = broker.cancelProvider("alice", "openai");
  resolve?.(oauthCredential);
  await cancellation;
  await flush();
  expect(save).not.toHaveBeenCalled();
  const failed = new AiLoginBroker(key, save, async () => {
    throw new Error("raw-token-secret");
  });
  const state = failed.start("alice", "browser", provider(), "oauth");
  if (!state) throw new Error("Expected login");
  await flush();
  expect(failed.get("alice", "browser", state.id)).toEqual({
    ...state,
    status: "error",
  });
});

test("login states have per-user/global caps and bounded event history", async () => {
  const broker = new AiLoginBroker(
    key,
    async () => {},
    async (_p, _m, interaction) => {
      for (let i = 0; i < 100; i++)
        interaction.notify({ type: "progress", message: `Step ${i}` });
      await interaction.prompt({ type: "secret", message: "Key" });
      return apiCredential;
    },
  );
  const first = broker.start("alice", "browser", provider(), "api_key");
  broker.start("alice", "browser", provider(), "api_key");
  broker.start("alice", "browser", provider(), "api_key");
  expect(
    broker.start("alice", "browser", provider(), "api_key"),
  ).toBeUndefined();
  for (let i = 0; i < 97; i++)
    expect(
      broker.start(`user-${i}`, "browser", provider(), "api_key"),
    ).toBeDefined();
  expect(
    broker.start("extra", "browser", provider(), "api_key"),
  ).toBeUndefined();
  await flush();
  if (!first) throw new Error("Expected login");
  expect(broker.get("alice", "browser", first.id)?.events).toHaveLength(32);
  await vi.advanceTimersByTimeAsync(11 * 60_000);
  expect(broker.start("alice", "browser", provider(), "api_key")).toBeDefined();
});

test("server-side choices prevent callback-only/file/ambient login paths and reject Copilot SSRF", async () => {
  const save = vi.fn(async () => {});
  const sdk: AiProviderLogin = async (provider, method, interaction) => {
    const choice =
      provider.id === "anthropic"
        ? "copy_code"
        : provider.id === "amazon-bedrock"
          ? "bearer-token"
          : "api-key";
    expect(
      await interaction.prompt({
        type: "select",
        message: "Method",
        options: [
          { id: choice, label: choice },
          { id: "unsafe", label: "Unsafe" },
        ],
      }),
    ).toBe(choice);
    return method === "oauth" ? oauthCredential : apiCredential;
  };
  for (const id of ["anthropic", "amazon-bedrock", "google-vertex"]) {
    const broker = new AiLoginBroker(key, save, sdk);
    const login = broker.start(
      "alice",
      "browser",
      provider(id),
      id === "anthropic" ? "oauth" : "api_key",
    );
    await flush();
    expect(login && broker.get("alice", "browser", login.id)?.status).toBe(
      "complete",
    );
  }
  const copilot = new AiLoginBroker(key, save, async (_p, _m, interaction) => {
    expect(
      await interaction.prompt({ type: "text", message: "GitHub domain" }),
    ).toBe("github.com");
    return oauthCredential;
  });
  const login = copilot.start(
    "alice",
    "browser",
    provider("github-copilot"),
    "oauth",
  );
  await flush();
  const prompt = login && copilot.get("alice", "browser", login.id)?.prompt;
  if (!prompt || !login) throw new Error("Expected prompt");
  for (const value of [
    "localhost",
    "127.0.0.1",
    "https://github.com",
    "example.ghe.com",
    "github.com@localhost",
    "github.com/path",
  ]) {
    expect(
      copilot.respond("alice", "browser", login.id, prompt.id, value),
    ).toBe("invalid");
  }
  copilot.respond("alice", "browser", login.id, prompt.id, "github.com");
  await flush();
  expect(copilot.get("alice", "browser", login.id)?.status).toBe("complete");
});
