import type { Credential } from "@earendil-works/pi-ai";
import { expect, test } from "vitest";
import {
  aiCredentialsKey,
  aiDeviceId,
  decryptAiCredential,
  encryptAiCredential,
} from "./server-ai-credentials.js";

const key = Buffer.alloc(32, 42);
const credential: Credential = {
  type: "api_key",
  key: "secret-value",
  env: { CLOUDFLARE_ACCOUNT_ID: "account" },
};

test("AI encryption key is optional but must be canonical base64 with exactly 32 bytes", () => {
  expect(aiCredentialsKey(key.toString("base64"))).toEqual(key);
  for (const value of [
    undefined,
    "",
    "secret",
    key.toString("hex"),
    key.toString("base64").slice(0, -1),
    Buffer.alloc(31).toString("base64"),
    Buffer.alloc(33).toString("base64"),
  ]) {
    expect(aiCredentialsKey(value)).toBeUndefined();
  }
});

test("AES-256-GCM round-trips credentials with fresh nonces and binds account and provider", () => {
  const encrypted = encryptAiCredential(key, "alice", "openai", credential);
  expect(encrypted.includes(Buffer.from("secret-value"))).toBe(false);
  expect(encryptAiCredential(key, "alice", "openai", credential)).not.toEqual(
    encrypted,
  );
  expect(decryptAiCredential(key, "alice", "openai", encrypted)).toEqual(
    credential,
  );
  expect(() => decryptAiCredential(key, "bob", "openai", encrypted)).toThrow();
  expect(() =>
    decryptAiCredential(key, "alice", "anthropic", encrypted),
  ).toThrow();
  expect(() =>
    decryptAiCredential(Buffer.alloc(32, 1), "alice", "openai", encrypted),
  ).toThrow();
  for (const index of [0, 1, 13, 29, encrypted.length - 1]) {
    const changed = Buffer.from(encrypted);
    changed[index] = (changed[index] ?? 0) ^ 1;
    expect(() =>
      decryptAiCredential(key, "alice", "openai", changed),
    ).toThrow();
  }
  expect(() =>
    decryptAiCredential(key, "alice", "openai", encrypted.subarray(0, 20)),
  ).toThrow();
});

test("installation device ID is a stable key-derived UUID, not an ephemeral ID", () => {
  const id = aiDeviceId(key);
  expect(id).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  expect(aiDeviceId(Buffer.from(key))).toBe(id);
  expect(aiDeviceId(Buffer.alloc(32, 1))).not.toBe(id);
});
