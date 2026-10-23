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

test("AI encryption key accepts exactly 32 bytes encoded as case-insensitive hex", () => {
  const hex = key.toString("hex");
  for (const value of [hex, hex.toUpperCase(), "2a2A".repeat(16)]) {
    expect(aiCredentialsKey(value)).toEqual(key);
  }
  for (const value of [
    undefined,
    "",
    "secret",
    key.toString("base64"),
    hex.slice(0, -1),
    Buffer.alloc(31).toString("hex"),
    Buffer.alloc(33).toString("hex"),
    "g".repeat(64),
    `${hex.slice(0, -1)}g`,
    `0x${hex}`,
    ` ${hex}`,
    `${hex} `,
    `${hex}\n`,
    `${hex}\r\n`,
    `${hex.slice(0, -1)}\n`,
    `${hex.slice(0, -2)}\r\n`,
    `${hex.slice(0, 32)} ${hex.slice(33)}`,
    `${hex.slice(0, -1)}\0`,
  ]) {
    expect(aiCredentialsKey(value), JSON.stringify(value)).toBeUndefined();
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

test("converting an existing Base64 key to hex preserves credentials and the installation device ID", () => {
  const previousKey = Buffer.from(key.toString("base64"), "base64");
  const hexKey = aiCredentialsKey(previousKey.toString("hex"));
  if (!hexKey) throw new Error("Expected a valid hex key");
  const encrypted = encryptAiCredential(
    previousKey,
    "alice",
    "openai",
    credential,
  );
  expect(decryptAiCredential(hexKey, "alice", "openai", encrypted)).toEqual(
    credential,
  );
  expect(aiDeviceId(hexKey)).toBe(aiDeviceId(previousKey));
});

test("installation device ID is a stable key-derived UUID, not an ephemeral ID", () => {
  const id = aiDeviceId(key);
  expect(id).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  expect(aiDeviceId(Buffer.from(key))).toBe(id);
  expect(aiDeviceId(Buffer.alloc(32, 1))).not.toBe(id);
});
