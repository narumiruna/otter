export const languageOptions = [
  { locale: "zh-TW", label: "正體中文" },
  { locale: "en", label: "English" },
  { locale: "ja", label: "日本語" },
  { locale: "ko", label: "한국어" },
] as const;

export type Locale = (typeof languageOptions)[number]["locale"];

export function isLocale(value: unknown): value is Locale {
  return languageOptions.some((option) => option.locale === value);
}

export function matchBrowserLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    const base = language.toLowerCase().split("-")[0];
    if (base === "zh") return "zh-TW";
    if (isLocale(base)) return base;
  }
  return "en";
}
