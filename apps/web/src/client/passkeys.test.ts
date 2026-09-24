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
});
