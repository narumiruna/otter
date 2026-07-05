import assert from "node:assert/strict";
import test from "node:test";
import type { Request } from "express";
import type { QueryResult, QueryResultRow } from "pg";
import {
  clearSessionCookieHeader,
  ensureDevAdmin,
  getCookie,
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

function requestWithCookie(cookie: string): Request {
  return { headers: { cookie } } as Request;
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

test("dev admin includes visible sample trips", async () => {
  const queries: { text: string; values: unknown[] }[] = [];
  const db = {
    async query<Row extends QueryResultRow = QueryResultRow>(
      text: string,
      values?: unknown[],
    ): Promise<QueryResult<Row>> {
      queries.push({ text, values: values ?? [] });
      const rows = text.includes("RETURNING id")
        ? ([{ id: "user_dev" }] as Row[])
        : [];
      return { rows } as QueryResult<Row>;
    },
  };

  await ensureDevAdmin(db);

  assert.equal(queries[0]?.values[1], "Alice");
  assert.deepEqual(
    queries
      .filter((query) => query.text.includes("INSERT INTO trips"))
      .map((query) => query.values[2]),
    ["東京五日遊", "大阪週末"],
  );
  assert.ok(
    queries.some(
      (query) =>
        query.text.includes("INSERT INTO participants") &&
        query.values.includes("Bob") &&
        query.values.includes("Chris"),
    ),
  );
  assert.ok(
    queries.some(
      (query) =>
        query.text.includes("INSERT INTO expenses") &&
        query.values.includes("飯店住宿") &&
        query.values.includes("早餐") &&
        query.values.includes(128000) &&
        query.values.includes(4200),
    ),
  );
});
