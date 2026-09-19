import { describe, expect, test } from "vitest";
import { isValidUsername, normalizeUsername } from "./username.js";

describe("usernames", () => {
  test("normalizes case and surrounding whitespace", () => {
    expect(normalizeUsername("  Alice_123-Test  ")).toBe("alice_123-test");
  });

  test.each(["abc", "Alice_123-Test", "  Alice  ", "a".repeat(32)])(
    "accepts %s",
    (username) => expect(isValidUsername(username)).toBe(true),
  );

  test.each([
    "",
    "  ",
    "ab",
    "a".repeat(33),
    "alice bob",
    "alice@example.com",
    "alice!",
    "使用者",
    "Kelvin",
  ])("rejects %s", (username) => expect(isValidUsername(username)).toBe(false));
});
