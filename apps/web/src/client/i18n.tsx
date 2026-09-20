import {
  type Currency,
  currencyInfo,
  toMajor,
} from "@narumitw/otter-core/money";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { interpolate, type MessageValues } from "./i18n/message-types.js";
import { type Locale, type Messages, translations } from "./i18n/messages.js";
import { sourceMessageKeys } from "./i18n/source-message-keys.js";

export type { Locale, Messages };

export type I18nContextValue = {
  formatMoney: (amountMinor: number, currency: Currency) => string;
  locale: Locale;
  messages: Messages;
  setLocale: (locale: Locale) => void;
};

const storageKey = "otter.locale";

function storedLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  try {
    const storage = window.localStorage;
    if (typeof storage?.getItem !== "function") return null;
    const saved = storage.getItem(storageKey);
    return saved === "en" || saved === "zh-TW" ? saved : null;
  } catch {
    return null;
  }
}

function persistLocale(locale: Locale) {
  try {
    const storage = window.localStorage;
    if (typeof storage?.setItem === "function")
      storage.setItem(storageKey, locale);
  } catch {
    // Language switching still works when storage is unavailable.
  }
}

function detectedLocale(): Locale {
  if (typeof window === "undefined") return "zh-TW";
  const saved = storedLocale();
  if (saved) return saved;
  for (const language of navigator.languages) {
    const normalized = language.toLowerCase();
    if (normalized.startsWith("en")) return "en";
    if (normalized.startsWith("zh")) return "zh-TW";
  }
  return "en";
}

function parameterizedMessage(
  message: string,
): { source: keyof typeof sourceMessageKeys; values: MessageValues } | null {
  const missingColumns = /^缺少欄位：(.+)$/.exec(message);
  if (missingColumns)
    return {
      source: "缺少欄位：{columns}",
      values: { columns: missingColumns[1] },
    };
  const unknownParticipant = /^找不到參與者：(.+)$/.exec(message);
  if (unknownParticipant)
    return {
      source: "找不到參與者：{name}",
      values: { name: unknownParticipant[1] },
    };
  return null;
}

function resolveMessage(
  locale: Locale,
  key: keyof Messages,
  values: MessageValues = {},
): string {
  const message = translations[locale][key];
  return typeof message === "function" ? message(values) : message;
}

export function translate(
  locale: Locale,
  source: string,
  values?: MessageValues,
): string {
  const parameterized = parameterizedMessage(source);
  const sourceKey = parameterized?.source ?? source;
  if (!(sourceKey in sourceMessageKeys))
    return values ? interpolate(source, values) : source;
  const key = sourceMessageKeys[sourceKey as keyof typeof sourceMessageKeys];
  return resolveMessage(locale, key, parameterized?.values ?? values);
}

let activeLocale: Locale | null = null;

export function currentLocale(): Locale {
  return activeLocale ?? detectedLocale();
}

export function localizeMessage(message: string): string {
  return translate(currentLocale(), message);
}

function moneyFormatter(locale: Locale) {
  return (amountMinor: number, currency: Currency) =>
    new Intl.NumberFormat(locale, {
      currency,
      maximumFractionDigits: currencyInfo[currency].minorUnits,
      minimumFractionDigits: currencyInfo[currency].minorUnits,
      style: "currency",
    }).format(toMajor(amountMinor, currency));
}

const defaultContext: I18nContextValue = {
  formatMoney: moneyFormatter("zh-TW"),
  locale: "zh-TW",
  messages: translations["zh-TW"],
  setLocale: () => undefined,
};

const I18nContext = createContext<I18nContextValue>(defaultContext);

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, updateLocale] = useState<Locale>(() => {
    const resolvedLocale = initialLocale ?? detectedLocale();
    activeLocale = resolvedLocale;
    return resolvedLocale;
  });
  useEffect(() => {
    activeLocale = locale;
    document.documentElement.lang = locale;
    return () => {
      if (activeLocale === locale) activeLocale = null;
    };
  }, [locale]);
  const value = useMemo<I18nContextValue>(
    () => ({
      formatMoney: moneyFormatter(locale),
      locale,
      messages: translations[locale],
      setLocale: (nextLocale) => {
        activeLocale = nextLocale;
        persistLocale(nextLocale);
        document.documentElement.lang = nextLocale;
        updateLocale(nextLocale);
      },
    }),
    [locale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}

export function useLocaleError() {
  const { locale } = useI18n();
  const [error, setError] = useState("");
  const previousLocale = useRef(locale);

  useEffect(() => {
    if (previousLocale.current === locale) return;
    previousLocale.current = locale;
    setError("");
  }, [locale]);

  return [error, setError] as const;
}
