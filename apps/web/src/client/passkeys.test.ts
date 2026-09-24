import { startRegistration } from "@simplewebauthn/browser";
import { beforeEach, expect, test, vi } from "vitest";
import { api } from "./client-support.js";
import { createAccountWithPasskey } from "./passkeys.js";

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

test("a cancelled passkey ceremony retries with its reservation token", async () => {
  const ceremony = {
    challengeId: "pending-123",
    options: { challenge: "challenge" },
  };
  vi.mocked(api).mockResolvedValue(ceremony);
  vi.mocked(startRegistration).mockRejectedValue(new Error("cancelled"));

  await expect(createAccountWithPasskey("alice")).rejects.toThrow("cancelled");
  await expect(createAccountWithPasskey("alice")).rejects.toThrow("cancelled");

  expect(vi.mocked(api).mock.calls).toEqual([
    [
      "/api/auth/passkey/register/options",
      { method: "POST", body: JSON.stringify({ username: "alice" }) },
    ],
    [
      "/api/auth/passkey/register/options",
      {
        method: "POST",
        body: JSON.stringify({ username: "alice", challengeId: "pending-123" }),
      },
    ],
  ]);
  expect(startRegistration).toHaveBeenCalledTimes(2);
});
