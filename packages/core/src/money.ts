import { isDateOnly } from "./date.js";

export const currencies = [
  "TWD",
  "JPY",
  "USD",
  "EUR",
  "SGD",
  "GBP",
  "AUD",
  "CAD",
  "KRW",
] as const;

export type Currency = (typeof currencies)[number];

export type CurrencyInfo = {
  label: string;
  minorUnits: number;
  rateToTwd: number;
};

export type ExchangeRates = Partial<Record<Currency, number>>;

export type ExpenseExchangeRate = {
  baseCurrency: Currency;
  rateToBase: number;
} & (
  | {
      source: "visa";
      provider: "VISA";
      rateType: "visa";
      fetchedAt: string;
      date: string;
    }
  | {
      source: "bank" | "custom" | "fixed" | "legacy";
      provider?: string;
      rateType?: string;
      fetchedAt?: string;
      // Older JSON readers ignored this extra property. Do not reinterpret it.
      date?: unknown;
    }
);

export type ExchangeRateBridge = ExpenseExchangeRate & {
  sourceCurrency: Currency;
};

export function isExpenseExchangeRate(
  value: unknown,
  currency: Currency,
  date?: string,
): value is ExpenseExchangeRate {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const rate = value as Partial<ExpenseExchangeRate>;
  if (
    !isCurrency(rate.baseCurrency) ||
    typeof rate.rateToBase !== "number" ||
    !Number.isFinite(rate.rateToBase) ||
    rate.rateToBase <= 0 ||
    rate.rateToBase >= 1e308 ||
    (currency === rate.baseCurrency && rate.rateToBase !== 1)
  )
    return false;
  if (rate.source === "visa" || rate.source === "bank") {
    const visa = rate.source === "visa";
    return (
      rate.provider === (visa ? "VISA" : "BANK_OF_TAIWAN") &&
      rate.rateType === (visa ? "visa" : "spotMid") &&
      typeof rate.fetchedAt === "string" &&
      Number.isFinite(Date.parse(rate.fetchedAt)) &&
      (visa
        ? /^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(rate.fetchedAt) &&
          typeof rate.date === "string" &&
          isDateOnly(rate.date) &&
          (date === undefined || rate.date === date)
        : true)
    );
  }
  return (
    ["custom", "fixed", "legacy"].includes(rate.source ?? "") &&
    rate.provider === undefined &&
    rate.rateType === undefined &&
    rate.fetchedAt === undefined
  );
}

export function isExchangeRateBridge(
  value: unknown,
  source?: Currency,
  target?: Currency,
  date?: string,
): value is ExchangeRateBridge {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const bridge = value as Partial<ExchangeRateBridge>;
  return (
    isCurrency(bridge.sourceCurrency) &&
    (source === undefined || bridge.sourceCurrency === source) &&
    (target === undefined || bridge.baseCurrency === target) &&
    isExpenseExchangeRate(value, bridge.sourceCurrency, date)
  );
}

export function convertExpenseMinor(
  amountMinor: number,
  currency: Currency,
  baseCurrency: Currency,
  snapshot?: ExpenseExchangeRate,
  rates?: ExchangeRates,
  bridge?: ExchangeRateBridge,
  date?: string,
): number {
  if (!snapshot)
    return convertMinorWithRates(amountMinor, currency, baseCurrency, rates);
  if (!isExpenseExchangeRate(snapshot, currency, date))
    throw new Error("Invalid expense exchange rate");
  if (
    currency === snapshot.baseCurrency &&
    snapshot.baseCurrency === baseCurrency
  )
    return amountMinor;
  const originalBaseMinor = Math.round(
    toMajor(amountMinor, currency) *
      snapshot.rateToBase *
      10 ** currencyInfo[snapshot.baseCurrency].minorUnits,
  );
  if (!Number.isSafeInteger(originalBaseMinor))
    throw new Error("Converted amount is out of range");
  const converted =
    snapshot.baseCurrency === baseCurrency
      ? originalBaseMinor
      : bridge
        ? convertBridgeMinor(
            originalBaseMinor,
            snapshot.baseCurrency,
            baseCurrency,
            bridge,
            date,
          )
        : convertMinorWithRates(
            originalBaseMinor,
            snapshot.baseCurrency,
            baseCurrency,
            rates,
          );
  if (!Number.isSafeInteger(converted))
    throw new Error("Converted amount is out of range");
  return converted;
}

export const currencyInfo: Record<Currency, CurrencyInfo> = {
  TWD: { label: "新台幣", minorUnits: 0, rateToTwd: 1 },
  JPY: { label: "日幣", minorUnits: 0, rateToTwd: 0.22 },
  USD: { label: "美金", minorUnits: 2, rateToTwd: 32 },
  EUR: { label: "歐元", minorUnits: 2, rateToTwd: 35 },
  SGD: { label: "Singapore dollar", minorUnits: 2, rateToTwd: 24 },
  GBP: { label: "Pound sterling", minorUnits: 2, rateToTwd: 41 },
  AUD: { label: "Australian dollar", minorUnits: 2, rateToTwd: 21 },
  CAD: { label: "Canadian dollar", minorUnits: 2, rateToTwd: 23 },
  KRW: { label: "South Korean won", minorUnits: 0, rateToTwd: 0.024 },
};

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && currencies.includes(value as Currency);
}

export function fixedExchangeRates(
  baseCurrency: Currency,
): Record<Currency, number> {
  const baseRateToTwd = currencyInfo[baseCurrency].rateToTwd;
  return Object.fromEntries(
    currencies.map((currency) => [
      currency,
      currencyInfo[currency].rateToTwd / baseRateToTwd,
    ]),
  ) as Record<Currency, number>;
}

export function parseAmountToMinor(input: string, currency: Currency): number {
  const value = input.trim();
  if (!/^\d+(\.\d+)?$/.test(value)) {
    throw new Error("Amount must be a positive number");
  }

  const [whole, fraction = ""] = value.split(".");
  const minorUnits = currencyInfo[currency].minorUnits;

  if (fraction.length > minorUnits) {
    throw new Error(`${currency} supports ${minorUnits} decimal places`);
  }

  const paddedFraction = fraction.padEnd(minorUnits, "0");
  const factor = 10 ** minorUnits;
  const amount = Number(whole) * factor + Number(paddedFraction || 0);

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error("Amount must be greater than zero");
  }

  return amount;
}

export function toMajor(amountMinor: number, currency: Currency): number {
  return amountMinor / 10 ** currencyInfo[currency].minorUnits;
}

export function convertMinorWithRates(
  amountMinor: number,
  from: Currency,
  to: Currency,
  rates?: ExchangeRates,
): number {
  if (from === to) {
    return amountMinor;
  }
  const fromRate = rates?.[from];
  const toRate = rates?.[to];
  if (
    fromRate &&
    toRate &&
    Number.isFinite(fromRate) &&
    Number.isFinite(toRate) &&
    fromRate > 0 &&
    toRate > 0
  ) {
    const targetMajor = (toMajor(amountMinor, from) * fromRate) / toRate;
    const converted = Math.round(
      targetMajor * 10 ** currencyInfo[to].minorUnits,
    );
    if (!Number.isSafeInteger(converted))
      throw new Error("Converted amount is out of range");
    return converted;
  }
  throw new Error(`Missing saved ${from}/${to} exchange rate`);
}

function convertBridgeMinor(
  amountMinor: number,
  source: Currency,
  target: Currency,
  bridge: ExchangeRateBridge,
  date?: string,
): number {
  if (!isExchangeRateBridge(bridge, source, target, date))
    throw new Error("Invalid exchange-rate bridge");
  const amount = Math.round(
    toMajor(amountMinor, source) *
      bridge.rateToBase *
      10 ** currencyInfo[target].minorUnits,
  );
  if (!Number.isSafeInteger(amount))
    throw new Error("Converted amount is out of range");
  return amount;
}

export function formatMinor(amountMinor: number, currency: Currency): string {
  return new Intl.NumberFormat("zh-TW", {
    currency,
    maximumFractionDigits: currencyInfo[currency].minorUnits,
    minimumFractionDigits: currencyInfo[currency].minorUnits,
    style: "currency",
  }).format(toMajor(amountMinor, currency));
}
