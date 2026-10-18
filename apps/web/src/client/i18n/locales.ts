export const languageOptions = [
  { locale: "zh-TW", label: "正體中文" },
  { locale: "en", label: "English" },
  { locale: "ja", label: "日本語" },
  { locale: "ko", label: "한국어" },
  { locale: "hi", label: "हिन्दी" },
  { locale: "es", label: "Español" },
  { locale: "fr", label: "Français" },
  { locale: "pt", label: "Português" },
  { locale: "id", label: "Bahasa Indonesia" },
  { locale: "de", label: "Deutsch" },
  { locale: "vi", label: "Tiếng Việt" },
  { locale: "tr", label: "Türkçe" },
  { locale: "fil", label: "Filipino" },
  { locale: "th", label: "ไทย" },
  { locale: "it", label: "Italiano" },
  { locale: "pl", label: "Polski" },
  { locale: "ms", label: "Bahasa Melayu" },
  { locale: "nl", label: "Nederlands" },
] as const;

export type Locale = (typeof languageOptions)[number]["locale"];

export function isLocale(value: unknown): value is Locale {
  return languageOptions.some((option) => option.locale === value);
}

export function matchBrowserLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    let tag: string;
    try {
      [tag] = Intl.getCanonicalLocales(language);
    } catch {
      continue;
    }
    const base = tag.toLowerCase().split("-")[0];
    if (base === "zh") return "zh-TW";
    if (base === "tl") return "fil";
    if (isLocale(base)) return base;
  }
  return "en";
}
