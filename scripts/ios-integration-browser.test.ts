import { describe, expect, test } from "vitest";
import {
  crossClientOrigin,
  crossClientToolEnvironment,
  decodeCrossClientResult,
} from "./ios-integration-browser.js";

// Source only until the parent clears the native UI run. These are pure protocol
// checks. They do not call runCrossClientBrowser or start any child/server/browser.
const created = {
  same: {
    userID: "user-1",
    tripID: "trip-1",
    ownerID: "owner-1",
    friendID: "friend-1",
    expenseID: "expense-1",
    originalVersion: 1,
  },
  checks: { nativeCreate: true, unequalShares: true, sameAccount: true },
  version: 1,
  expenseCount: 1,
  groupCount: 1,
  remainingMinor: 70,
};

describe("cross-client local origin guard", () => {
  test("accepts only a canonical explicit localhost dynamic port", () => {
    expect(crossClientOrigin("http://localhost:49152").port).toBe("49152");
    for (const origin of [
      "https://localhost:49152",
      "http://127.0.0.1:49152",
      "http://localhost",
      "http://localhost:80",
      "http://localhost:65536",
      "http://localhost:04915",
      "http://localhost:49152/",
      "http://localhost:49152/api",
      "http://localhost:49152?trip=1",
      "http://localhost:49152#fragment",
      "http://name:password@localhost:49152",
      "http://localhost.example:49152",
      "http://localhost:49152@other.example",
    ])
      expect(() => crossClientOrigin(origin)).toThrow();
  });
});

describe("cross-client child environment", () => {
  test("contains only the tool allowlist", () => {
    const allowed = new Set([
      "PATH",
      "HOME",
      "USER",
      "LOGNAME",
      "TMPDIR",
      "LANG",
      "LC_ALL",
      "DEVELOPER_DIR",
      "SDKROOT",
    ]);
    expect(
      Object.keys(crossClientToolEnvironment()).every((key) =>
        allowed.has(key),
      ),
    ).toBe(true);
  });
});

describe("cross-client non-secret phase protocol", () => {
  test("decodes verified original data without credentials", () => {
    const result = decodeCrossClientResult(JSON.stringify(created), "create");
    expect(result.same).toEqual(created.same);
    expect(result.remainingMinor).toBe(70);
    expect(result.checks).toEqual(created.checks);
  });

  test("rejects missing, false, extra, or wrong-phase assertions", () => {
    for (const checks of [
      { nativeCreate: true },
      { ...created.checks, nativeCreate: false },
      { ...created.checks, notExecuted: true },
    ]) {
      expect(() =>
        decodeCrossClientResult(
          JSON.stringify({ ...created, checks }),
          "create",
        ),
      ).toThrow();
    }
    expect(() =>
      decodeCrossClientResult(JSON.stringify(created), "review"),
    ).toThrow();
  });

  test("rejects private or unexpected fields, including nested fields", () => {
    for (const field of [
      "password",
      "username",
      "cookie",
      "token",
      "shareURL",
    ]) {
      expect(() =>
        decodeCrossClientResult(
          JSON.stringify({ ...created, [field]: "synthetic-private" }),
          "create",
        ),
      ).toThrow();
      expect(() =>
        decodeCrossClientResult(
          JSON.stringify({
            ...created,
            same: { ...created.same, [field]: "synthetic-private" },
          }),
          "create",
        ),
      ).toThrow();
    }
  });

  test("rejects unsafe IDs, an invented original version, and invalid amounts", () => {
    for (const same of [
      { ...created.same, expenseID: "https://example.invalid/share/private" },
      { ...created.same, originalVersion: 2 },
      { ...created.same, friendID: created.same.ownerID },
    ])
      expect(() =>
        decodeCrossClientResult(JSON.stringify({ ...created, same }), "create"),
      ).toThrow();
    for (const remainingMinor of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() =>
        decodeCrossClientResult(
          JSON.stringify({ ...created, remainingMinor }),
          "create",
        ),
      ).toThrow();
    }
  });
});
