// @vitest-environment jsdom

import { startRegistration } from "@simplewebauthn/browser";
import { beforeEach, expect, test, vi } from "vitest";
import { api } from "./client-support.js";
import {
  clearPendingPasskeySignup,
  createAccountWithPasskey,
  pendingPasskeySignupChallengeId,
} from "./passkeys.js";

vi.mock("@simplewebauthn/browser", () => ({
  browserSupportsWebAuthn: vi.fn(),
  startAuthentication: vi.fn(),
  startRegistration: vi.fn(),
}));
vi.mock("./client-support.js", () => ({ api: vi.fn() }));

beforeEach(() => {
  sessionStorage.clear();
  clearPendingPasskeySignup("alice_123");
  vi.mocked(api).mockReset();
  vi.mocked(startRegistration).mockReset();
});

test("a cancelled passkey ceremony retries with its reservation token across equivalent usernames", async () => {
  const ceremony = {
    challengeId: "pending-123",
    options: { challenge: "challenge" },
  };
  vi.mocked(api).mockResolvedValue(ceremony);
  vi.mocked(startRegistration).mockRejectedValue(new Error("cancelled"));

  await expect(createAccountWithPasskey("Alice_123")).rejects.toThrow(
    "cancelled",
  );
  expect(pendingPasskeySignupChallengeId(" alice_123 ")).toBe("pending-123");
  await expect(createAccountWithPasskey(" alice_123 ")).rejects.toThrow(
    "cancelled",
  );

  expect(vi.mocked(api).mock.calls).toEqual([
    [
      "/api/auth/passkey/register/options",
      { method: "POST", body: JSON.stringify({ username: "Alice_123" }) },
    ],
    [
      "/api/auth/passkey/register/options",
      {
        method: "POST",
        body: JSON.stringify({
          username: " alice_123 ",
          challengeId: "pending-123",
        }),
      },
    ],
  ]);
  expect(startRegistration).toHaveBeenCalledTimes(2);
  clearPendingPasskeySignup("ALICE_123");
  expect(pendingPasskeySignupChallengeId("alice_123")).toBeUndefined();
  expect(sessionStorage.getItem("otter.passkeySignup")).toBeNull();
});

test("a cancelled signup can retry or fall back after a page reload", async () => {
  const ceremony = {
    challengeId: "pending-123",
    options: { challenge: "challenge" },
  };
  vi.mocked(api).mockResolvedValue(ceremony);
  vi.mocked(startRegistration).mockRejectedValue(new Error("cancelled"));
  await expect(createAccountWithPasskey("Alice_123")).rejects.toThrow(
    "cancelled",
  );

  vi.resetModules();
  const reloaded = await import("./passkeys.js");
  const { api: reloadedApi } = await import("./client-support.js");
  expect(reloaded.pendingPasskeySignupChallengeId(" alice_123 ")).toBe(
    "pending-123",
  );
  vi.mocked(reloadedApi).mockResolvedValue(ceremony);
  await expect(reloaded.createAccountWithPasskey("alice_123")).rejects.toThrow(
    "cancelled",
  );
  expect(reloadedApi).toHaveBeenCalledWith(
    "/api/auth/passkey/register/options",
    {
      body: JSON.stringify({
        username: "alice_123",
        challengeId: "pending-123",
      }),
      method: "POST",
    },
  );
  reloaded.clearPendingPasskeySignup("alice_123");
  expect(sessionStorage.getItem("otter.passkeySignup")).toBeNull();
});

test("expired signup tokens are removed and not used by the password fallback", () => {
  sessionStorage.setItem(
    "otter.passkeySignup",
    JSON.stringify({
      username: "alice_123",
      challengeId: "pending-123",
      expiresAt: Date.now() - 1,
    }),
  );
  expect(pendingPasskeySignupChallengeId("alice_123")).toBeUndefined();
  expect(sessionStorage.getItem("otter.passkeySignup")).toBeNull();
});

test("successful signup removes the persisted reservation token", async () => {
  vi.mocked(api).mockResolvedValue({
    challengeId: "pending-123",
    options: { challenge: "challenge" },
  });
  vi.mocked(startRegistration).mockResolvedValue({
    id: "credential-id",
    rawId: "credential-id",
    response: {
      attestationObject: "attestation",
      clientDataJSON: "client-data",
    },
    type: "public-key",
    clientExtensionResults: {},
  });
  await createAccountWithPasskey("Alice_123");
  expect(pendingPasskeySignupChallengeId("alice_123")).toBeUndefined();
  expect(sessionStorage.getItem("otter.passkeySignup")).toBeNull();
});
