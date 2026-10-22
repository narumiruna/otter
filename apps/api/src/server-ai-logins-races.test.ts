import { afterEach, expect, test, vi } from "vitest";
import { AiLoginBroker } from "./server-ai-logins.js";
import { aiProviders } from "./server-ai-providers.js";

function provider(id = "openai") {
  const result = aiProviders.find((provider) => provider.id === id);
  if (!result) throw new Error("Missing provider");
  return result;
}
afterEach(() => vi.useRealTimers());

test("cancel waits for a persistence operation that already started, without deleting an earlier credential", async () => {
  vi.useFakeTimers();
  let commit: (() => void) | undefined;
  let stored = "earlier-credential";
  let committed = false;
  const broker = new AiLoginBroker(
    Buffer.alloc(32, 7),
    async () => {
      // Model COMMIT already being sent to PostgreSQL when cancellation arrives.
      await new Promise<void>((resolve) => {
        commit = resolve;
      });
      stored = "new-credential";
      committed = true;
    },
    async () => ({ type: "api_key", key: "new-credential" }),
  );
  const state = broker.start("alice", "browser", provider(), "api_key");
  if (!state) throw new Error("Expected login");
  await vi.advanceTimersByTimeAsync(0);
  let returned = false;
  const cancellation = broker
    .cancel("alice", "browser", state.id)
    .then((result) => {
      returned = true;
      return result;
    });
  await vi.advanceTimersByTimeAsync(0);
  expect(returned).toBe(false);
  expect(stored).toBe("earlier-credential");
  commit?.();
  expect(await cancellation).toBe(true);
  expect(committed).toBe(true);
  expect(stored).toBe("new-credential");
  expect(broker.get("alice", "browser", state.id)).toBeUndefined();
});

test("Codex selects device_code without exposing a browser selector or accepting responses", async () => {
  vi.useFakeTimers();
  const broker = new AiLoginBroker(
    Buffer.alloc(32, 7),
    async () => {},
    async (_provider, _method, interaction) => {
      expect(
        await interaction.prompt({
          type: "select",
          message: "Method",
          options: [
            { id: "browser", label: "Browser" },
            { id: "device_code", label: "Device code" },
          ],
        }),
      ).toBe("device_code");
      return {
        type: "oauth",
        access: "access",
        refresh: "refresh",
        expires: 123,
      };
    },
  );
  const state = broker.start(
    "alice",
    "browser",
    provider("openai-codex"),
    "oauth",
  );
  if (!state) throw new Error("Expected login");
  await vi.advanceTimersByTimeAsync(0);
  expect(broker.get("alice", "browser", state.id)?.prompt).toBeUndefined();
  for (const value of ["browser", "device_code", "unknown", "x".repeat(16_385)])
    expect(
      broker.respond("alice", "browser", state.id, "not-exposed", value),
    ).toBe("invalid");
  expect(broker.get("alice", "browser", state.id)?.status).toBe("complete");
});

test("an unreviewed file-path prompt fails without exposing or accepting it", async () => {
  vi.useFakeTimers();
  const save = vi.fn(async () => {});
  const broker = new AiLoginBroker(
    Buffer.alloc(32, 7),
    save,
    async (_provider, _method, interaction) => {
      await interaction.prompt({
        type: "text",
        message: "Enter credentials file path",
      });
      return { type: "api_key", key: "unused" };
    },
  );
  const state = broker.start("alice", "browser", provider(), "api_key");
  if (!state) throw new Error("Expected login");
  await vi.advanceTimersByTimeAsync(0);
  expect(broker.get("alice", "browser", state.id)).toEqual({
    ...state,
    status: "error",
  });
  expect(save).not.toHaveBeenCalled();
});
