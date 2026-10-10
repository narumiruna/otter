import { expect, test } from "vitest";
import { isLocale, matchBrowserLocale } from "./locales.js";
import { translations } from "./messages.js";

function parameters(message: string): string[] {
  return [...message.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

test.each(["ja", "ko"] as const)(
  "%s has a complete catalog with matching types and interpolation parameters",
  (locale) => {
    const source = translations["zh-TW"];
    const catalog = translations[locale];
    expect(Object.keys(catalog).sort()).toEqual(Object.keys(source).sort());
    for (const key of Object.keys(source) as (keyof typeof source)[]) {
      const original = source[key];
      const translated = catalog[key];
      expect(typeof translated, key).toBe(typeof original);
      const template = typeof original === "function" ? original({}) : original;
      const text =
        typeof translated === "function" ? translated({}) : translated;
      expect(text.trim(), key).not.toBe("");
      expect(parameters(text), key).toEqual(parameters(template));
    }
  },
);

test.each([
  { languages: ["ja-JP", "en-US"], expected: "ja" },
  { languages: ["KO-kr", "ja"], expected: "ko" },
  { languages: ["fr-FR", "ja"], expected: "ja" },
  { languages: ["en-GB", "ko-KR"], expected: "en" },
  { languages: ["zh-Hant", "ja"], expected: "zh-TW" },
  { languages: ["fr", "de"], expected: "en" },
  { languages: ["enochian", "jargon", "korean"], expected: "en" },
  { languages: [], expected: "en" },
])(
  "matches browser language preferences: $languages",
  ({ languages, expected }) => {
    expect(matchBrowserLocale(languages)).toBe(expected);
  },
);

test("only stored catalog locale identifiers are valid", () => {
  for (const locale of ["zh-TW", "en", "ja", "ko"])
    expect(isLocale(locale)).toBe(true);
  for (const value of [null, undefined, "ja-JP", "ko-KR", "fr", "", {}]) {
    expect(isLocale(value)).toBe(false);
  }
});

test.each([0, 1, 2])(
  "Japanese and Korean counts need no English plural rules: %s",
  (count) => {
    expect(translations.ja.countActiveGroups({ count })).toBe(
      `使用中のグループ ${count} 件`,
    );
    expect(translations.ko.countActiveGroups({ count })).toBe(
      `사용 중인 그룹 ${count}개`,
    );
  },
);
