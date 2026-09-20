import assert from "node:assert/strict";
import { test } from "vitest";
import type { RouteRequest } from "./server-http.js";
import {
  clearSessionCookieHeader,
  getCookie,
  hashPassword,
  sessionCookieHeader,
  verifyPassword,
} from "./server-support.js";

function withCookieEnv(
  nodeEnv: string | undefined,
  cookieSecure: string | undefined,
  run: () => void,
) {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCookieSecure = process.env.COOKIE_SECURE;
  try {
    if (nodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = nodeEnv;
    }
    if (cookieSecure === undefined) {
      delete process.env.COOKIE_SECURE;
    } else {
      process.env.COOKIE_SECURE = cookieSecure;
    }
    run();
  } finally {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
    if (originalCookieSecure === undefined) {
      delete process.env.COOKIE_SECURE;
    } else {
      process.env.COOKIE_SECURE = originalCookieSecure;
    }
  }
}

function requestWithCookie(cookie: string): RouteRequest {
  return {
    body: {},
    get: () => undefined,
    headers: { cookie },
    params: {},
    protocol: "http",
  };
}

test("cookie parser decodes valid values and ignores malformed values", () => {
  assert.equal(
    getCookie(requestWithCookie("otter_session=session%201"), "otter_session"),
    "session 1",
  );
  assert.equal(
    getCookie(requestWithCookie("otter_session=%E0%A4%A"), "otter_session"),
    undefined,
  );
});

test("session cookie security defaults follow environment", () => {
  withCookieEnv("development", undefined, () => {
    assert.doesNotMatch(sessionCookieHeader("session 1"), /; Secure/);
    assert.doesNotMatch(clearSessionCookieHeader(), /; Secure/);
  });

  withCookieEnv("production", undefined, () => {
    assert.match(sessionCookieHeader("session 1"), /; Secure$/);
    assert.match(clearSessionCookieHeader(), /; Secure$/);
  });
});

test("COOKIE_SECURE overrides session cookie security", () => {
  withCookieEnv("development", "true", () => {
    assert.match(sessionCookieHeader("session 1"), /; Secure$/);
  });

  withCookieEnv("production", "false", () => {
    assert.doesNotMatch(sessionCookieHeader("session 1"), /; Secure/);
  });
});

test("password hashing and verification preserve the PBKDF2 format", async () => {
  const hash = await hashPassword("password123");

  assert.match(hash, /^pbkdf2:210000:[0-9a-f]{32}:[0-9a-f]{64}$/);
  assert.equal(await verifyPassword("password123", hash), true);
  assert.equal(await verifyPassword("wrong-password", hash), false);
  assert.equal(
    await verifyPassword(
      "otter-dummy-password-verification",
      "pbkdf2:210000:0123456789abcdef0123456789abcdef:d2cd8cc578b0a477ba3359db4388f614d386886df393c8aabb022b3e8e40ff14",
    ),
    true,
  );
});

test("password verification rejects malformed hashes without deriving", async () => {
  for (const hash of [
    "",
    "scrypt:210000:salt:hash",
    "pbkdf2:0:salt:hash",
    "pbkdf2:not-a-number:salt:hash",
    `pbkdf2:210000:salt:${"z".repeat(64)}`,
    `pbkdf2:210000:salt:${"a".repeat(62)}`,
  ]) {
    assert.equal(await verifyPassword("password123", hash), false);
  }
});
