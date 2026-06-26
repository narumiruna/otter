import assert from "node:assert/strict";
import test from "node:test";
import {
  clearSessionCookieHeader,
  sessionCookieHeader,
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
