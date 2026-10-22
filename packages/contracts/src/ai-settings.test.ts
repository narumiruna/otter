import { describe, expect, test } from "vitest";
import { type AiSettings, isAiSettings } from "./index.js";

const settings: AiSettings = {
  provider: "openai",
  model: "gpt-4o-mini",
  thinkingLevel: "off",
};

describe("isAiSettings", () => {
  test.each(["off", "minimal", "low", "medium", "high", "xhigh", "max"])(
    "accepts the %s thinking level",
    (thinkingLevel) => {
      expect(isAiSettings({ ...settings, thinkingLevel })).toBe(true);
    },
  );

  test.each([
    null,
    undefined,
    [],
    "settings",
    {},
    { provider: "openai", model: "gpt-4o-mini" },
    { ...settings, provider: "" },
    { ...settings, provider: " " },
    { ...settings, provider: 1 },
    { ...settings, model: "" },
    { ...settings, model: " " },
    { ...settings, model: null },
    { ...settings, thinkingLevel: "auto" },
    { ...settings, thinkingLevel: null },
    { ...settings, thinkingLevel: 1 },
    { ...settings, apiKey: "not-accepted" },
    { ...settings, baseUrl: "https://example.com" },
    { ...settings, userId: "another-account" },
  ])("rejects malformed or additional fields: %j", (value) => {
    expect(isAiSettings(value)).toBe(false);
  });
});
