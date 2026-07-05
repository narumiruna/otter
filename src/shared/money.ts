export const currencies = ["TWD", "JPY", "USD", "EUR"] as const;

export type Currency = (typeof currencies)[number];

export type CurrencyInfo = {
  label: string;
  minorUnits: number;
  rateToTwd: number;
};

export type ExchangeRates = Partial<Record<Currency, number>>;

export const currencyInfo: Record<Currency, CurrencyInfo> = {
  TWD: { label: "新台幣", minorUnits: 0, rateToTwd: 1 },
  JPY: { label: "日幣", minorUnits: 0, rateToTwd: 0.22 },
  USD: { label: "美金", minorUnits: 2, rateToTwd: 32 },
  EUR: { label: "歐元", minorUnits: 2, rateToTwd: 35 },
};

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && currencies.includes(value as Currency);
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
  if (fromRate && toRate) {
    const targetMajor = (toMajor(amountMinor, from) * fromRate) / toRate;
    return Math.round(targetMajor * 10 ** currencyInfo[to].minorUnits);
  }
  const amountTwd = toMajor(amountMinor, from) * currencyInfo[from].rateToTwd;
  const targetMajor = amountTwd / currencyInfo[to].rateToTwd;
  return Math.round(targetMajor * 10 ** currencyInfo[to].minorUnits);
}

export function formatMinor(amountMinor: number, currency: Currency): string {
  return new Intl.NumberFormat("zh-TW", {
    currency,
    maximumFractionDigits: currencyInfo[currency].minorUnits,
    minimumFractionDigits: currencyInfo[currency].minorUnits,
    style: "currency",
  }).format(toMajor(amountMinor, currency));
}
