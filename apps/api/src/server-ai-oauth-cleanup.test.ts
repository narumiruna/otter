import { createServer, type Server } from "node:net";
import { afterEach, expect, test, vi } from "vitest";
import { AiLoginBroker } from "./server-ai-logins.js";
import { aiProviders, loginAiProvider } from "./server-ai-providers.js";

async function bindCallbackPort(): Promise<Server | undefined> {
  const server = createServer();
  return new Promise((resolve, reject) => {
    server.once("error", (error) => {
      if ("code" in error && error.code === "EADDRINUSE") resolve(undefined);
      else reject(error);
    });
    server.listen(1455, "127.0.0.1", () => resolve(server));
  });
}
async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}
function provider() {
  const result = aiProviders.find(({ id }) => id === "openai");
  if (!result) throw new Error("Expected OpenAI provider");
  return result;
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

test("real OpenAI SDK closes its loopback listener when cancelled during initialization before notify", async (context) => {
  const probe = await bindCallbackPort();
  if (!probe) return context.skip(); // Do not interfere with a developer's local OAuth listener.
  await close(probe);
  vi.stubEnv("PI_OAUTH_CALLBACK_HOST", "");
  vi.stubEnv("KIMI_CODE_OAUTH_HOST", "");
  vi.stubEnv("KIMI_OAUTH_HOST", "");
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockRejectedValue(new Error("No provider network allowed"));
  const save = vi.fn(async () => {});
  let cancellation: Promise<boolean> | undefined;
  const broker: AiLoginBroker = new AiLoginBroker(
    Buffer.alloc(32, 9),
    save,
    async (provider, method, interaction, options) =>
      loginAiProvider(
        provider,
        method,
        {
          ...interaction,
          notify: (event) => {
            // The actual SDK has allocated port 1455, but has not entered its
            // prompt/race cleanup scope yet. An aborted broker notify must not throw.
            cancellation = broker.cancel("alice", "browser", state?.id ?? "");
            interaction.notify(event);
          },
        },
        options,
      ),
  );
  const state = broker.start("alice", "browser", provider(), "oauth");
  if (!state) throw new Error("Expected login");
  await vi.waitFor(() => expect(cancellation).toBeDefined());
  expect(await cancellation).toBe(true);
  expect(save).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
  expect(broker.get("alice", "browser", state.id)).toBeUndefined();
  const rebound = await bindCallbackPort();
  expect(rebound).toBeDefined();
  if (rebound) await close(rebound);
});

test("real OpenAI loopback port collision fails with only generic error state", async (context) => {
  const occupied = await bindCallbackPort();
  if (!occupied) return context.skip();
  try {
    vi.stubEnv("PI_OAUTH_CALLBACK_HOST", "");
    vi.stubEnv("KIMI_CODE_OAUTH_HOST", "");
    vi.stubEnv("KIMI_OAUTH_HOST", "");
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
    expect(save).not.toHaveBeenCalled();
  } finally {
    await close(occupied);
  }
});
