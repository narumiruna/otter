import { expect, test } from "vitest";
import { isLocale, languageOptions, matchBrowserLocale } from "./locales.js";
import { type MessageValues, pluralForm } from "./message-types.js";
import { translations } from "./messages.js";

function parameters(message: string): string[] {
  return [...message.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

const counts = [0, 1, 2, 4, 5, 6, 9, 12, 21, 22, 1.4, 1.5, 1000000];
const numericParameters = new Set([
  "count",
  "participants",
  "expenses",
  "payments",
  "links",
  "collaborators",
  "rows",
  "errors",
  "people",
  "shown",
  "total",
  "number",
  "version",
]);

function checkCatalog(catalog: Record<string, unknown>) {
  const source = translations["zh-TW"];
  expect(Object.keys(catalog).sort()).toEqual(Object.keys(source).sort());
  for (const key of Object.keys(source) as (keyof typeof source)[]) {
    const original = source[key];
    const translated = catalog[key];
    expect(typeof translated, key).toBe(typeof original);
    const template = typeof original === "function" ? original({}) : original;
    const text = typeof translated === "function" ? translated({}) : translated;
    expect(typeof text, key).toBe("string");
    if (typeof text !== "string") throw new Error(`Invalid message: ${key}`);
    expect(text.trim(), key).not.toBe("");
    const tokens = parameters(template);
    expect(parameters(text), key).toEqual(tokens);
    if (typeof translated !== "function") continue;
    for (const count of counts) {
      const values: MessageValues = Object.fromEntries(
        tokens.map((name) => [
          name,
          numericParameters.has(name) ? count : `value_${name}_end`,
        ]),
      );
      const output = translated(values);
      expect(output.trim(), key).not.toBe("");
      expect(parameters(output), key).toEqual([]);
      expect(output, key).not.toMatch(/undefined|NaN/);
      for (const value of Object.values(values))
        expect(output, key).toContain(String(value));
    }
  }
}

test.each(languageOptions)(
  "$locale has a complete catalog with matching types and interpolation parameters",
  ({ locale }) => checkCatalog(translations[locale]),
);

test("catalog checks reject missing keys, wrong types, and lost parameters", () => {
  const missing: Record<string, unknown> = { ...translations.en };
  delete missing.reload;
  expect(() => checkCatalog(missing)).toThrow();
  expect(() => checkCatalog({ ...translations.en, reload: 42 })).toThrow();
  expect(() =>
    checkCatalog({
      ...translations.en,
      participantNotFoundName: () => "Missing participant",
    }),
  ).toThrow();
});

test.each([
  { languages: ["ja-JP", "en-US"], expected: "ja" },
  { languages: ["KO-kr", "ja"], expected: "ko" },
  { languages: ["fr-FR", "ja"], expected: "fr" },
  { languages: ["en-GB", "ko-KR"], expected: "en" },
  { languages: ["zh-Hant", "ja"], expected: "zh-TW" },
  { languages: ["ar", "de"], expected: "de" },
  { languages: ["ar", "uk"], expected: "en" },
  { languages: ["enochian", "jargon", "korean"], expected: "en" },
  { languages: ["en--US", "de_DE", "fr-CA"], expected: "fr" },
  { languages: ["tl-PH", "en"], expected: "fil" },
  { languages: ["TL", "en"], expected: "fil" },
  { languages: ["pt-BR", "es-MX"], expected: "pt" },
  { languages: ["pt-PT"], expected: "pt" },
  { languages: [], expected: "en" },
])("matches browser preferences: $languages", ({ languages, expected }) => {
  expect(matchBrowserLocale(languages)).toBe(expected);
});

test.each(languageOptions)(
  "matches regional tags for $locale",
  ({ locale }) => {
    const tag = locale === "zh-TW" ? "zh-Hant-TW" : `${locale}-US`;
    expect(matchBrowserLocale([tag.toUpperCase()])).toBe(locale);
  },
);

test("only canonical stored catalog identifiers are valid", () => {
  for (const { locale } of languageOptions) expect(isLocale(locale)).toBe(true);
  for (const value of [
    null,
    undefined,
    "ja-JP",
    "ko-KR",
    "ar",
    "tl",
    "tl-PH",
    "pt-BR",
    "EN",
    "",
    {},
  ])
    expect(isLocale(value)).toBe(false);
});

test.each([0, 1, 2])(
  "Japanese and Korean counts remain unchanged: %s",
  (count) => {
    expect(translations.ja.countActiveGroups({ count })).toBe(
      `使用中のグループ ${count} 件`,
    );
    expect(translations.ko.countActiveGroups({ count })).toBe(
      `사용 중인 그룹 ${count}개`,
    );
  },
);

test.each([
  [0, "many"],
  [1, "one"],
  [2, "few"],
  [5, "many"],
  [12, "many"],
  [21, "many"],
  [22, "few"],
  [1.5, "other"],
] as const)("Polish selects %s as %s", (value, expected) => {
  expect(
    pluralForm("pl", value, {
      one: "one",
      few: "few",
      many: "many",
      other: "other",
    }),
  ).toBe(expected);
});

test.each([
  [0, "0 aktywnych grup"],
  [1, "1 aktywna grupa"],
  [2, "2 aktywne grupy"],
  [5, "5 aktywnych grup"],
  [12, "12 aktywnych grup"],
  [21, "21 aktywnych grup"],
  [22, "22 aktywne grupy"],
  [1.5, "1.5 aktywnej grupy"],
] as const)("Polish active-group output for %s", (count, expected) => {
  expect(translations.pl.countActiveGroups({ count })).toBe(expected);
});

test.each(languageOptions)(
  "$locale plural categories follow Intl",
  ({ locale }) => {
    const rules = new Intl.PluralRules(locale);
    expect(
      [...new Set(counts.map((count) => rules.select(count)))].sort(),
    ).toEqual(rules.resolvedOptions().pluralCategories.sort());
    const forms = {
      zero: "zero",
      one: "one",
      two: "two",
      few: "few",
      many: "many",
      other: "other",
    };
    for (const count of counts)
      expect(pluralForm(locale, count, forms)).toBe(rules.select(count));
    expect(pluralForm(locale, undefined, forms)).toBe("other");
    expect(pluralForm(locale, "not-a-count", forms)).toBe("other");
    expect(pluralForm(locale, "", forms)).toBe("other");
    expect(pluralForm(locale, Infinity, forms)).toBe("other");
    expect(pluralForm(locale, 1, { other: "invariant" })).toBe("invariant");
  },
);
