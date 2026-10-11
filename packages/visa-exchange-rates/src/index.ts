import { Impit } from "impit";

export type VisaRateQuery = {
  /** Transaction currency, such as JPY. */
  source: string;
  /** Card billing currency, such as TWD. */
  target: string;
  /** YYYY-MM-DD. Defaults to today's date in Asia/Taipei. */
  date?: string;
  amount?: number;
  /** Percentage, not a fraction. Defaults to 0. */
  bankFeePercent?: number;
};

export type VisaRate = Readonly<{
  source: string;
  target: string;
  date: string;
  amount: number;
  bankFeePercent: number;
  /** Target currency units for one source currency unit, excluding bank fees. */
  visaRate: number;
  /** Target currency units for one source currency unit, including bank fees. */
  rate: number;
  convertedAmount: number;
  fetchedAt: string;
}>;

export type VisaRateFetch = (
  url: string,
  init: RequestInit,
) => Promise<Pick<Response, "ok" | "status" | "json">>;

export type FetchVisaRateOptions = {
  fetch?: VisaRateFetch;
  now?: () => Date;
  timeoutMs?: number;
};

const endpoint = "https://www.visa.com.tw/cmsapi/fx/rates";

/** Query the public Visa calculator API. Intended for server-side use. */
export async function fetchVisaRate(
  query: VisaRateQuery,
  options: FetchVisaRateOptions = {},
): Promise<VisaRate> {
  const source = currency(query.source);
  const target = currency(query.target);
  const now = (options.now ?? (() => new Date()))();
  const date = query.date ?? taiwanDate(now);
  const apiDate = formatApiDate(date);
  const amount = query.amount ?? 1;
  const bankFeePercent = query.bankFeePercent ?? 0;
  const timeoutMs = options.timeoutMs ?? 10_000;
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a positive finite number");
  }
  if (!Number.isFinite(bankFeePercent) || bankFeePercent < 0) {
    throw new Error("Bank fee must be a non-negative finite percentage");
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("Timeout must be a positive finite number");
  }

  // Visa's calculator reverses these query names: fromCurr is the billing currency.
  const url = `${endpoint}?${new URLSearchParams({
    amount: String(amount),
    fee: String(bankFeePercent),
    utcConvertedDate: apiDate,
    exchangedate: apiDate,
    fromCurr: target,
    toCurr: source,
  })}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = { Accept: "application/json" };
    const response = options.fetch
      ? await options.fetch(url, { headers, signal: controller.signal })
      : await new Impit({ browser: "chrome", timeout: timeoutMs }).fetch(url, {
          headers,
          signal: controller.signal,
        });
    if (!response.ok) {
      throw new Error(`Visa exchange-rate request failed (${response.status})`);
    }
    const payload = record(await response.json());
    const original = record(payload.originalValues);
    if (
      payload.status !== "success" ||
      payload.conversionToCurrency !== source ||
      payload.conversionFromCurrency !== target ||
      payload.conversionInputDate !== apiDate ||
      original.fromCurrency !== source ||
      original.toCurrency !== target ||
      numeric(payload.conversionAmountValue) !== amount ||
      numeric(payload.conversionBankFee) !== bankFeePercent
    ) {
      throw new Error("Visa response does not match the requested conversion");
    }
    return {
      source,
      target,
      date,
      amount,
      bankFeePercent,
      visaRate: numeric(original.fxRateVisa, true),
      rate: numeric(payload.fxRateWithAdditionalFee, true),
      convertedAmount: numeric(payload.convertedAmount),
      fetchedAt: now.toISOString(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function currency(value: string): string {
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) {
    throw new Error("Currency must be a three-letter code");
  }
  return code;
}

function taiwanDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function formatApiDate(date: string): string {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) ||
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date
  ) {
    throw new Error("Date must be a valid calendar date in YYYY-MM-DD format");
  }
  return `${date.slice(5, 7)}/${date.slice(8, 10)}/${date.slice(0, 4)}`;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Unexpected Visa exchange-rate response");
  }
  return value as Record<string, unknown>;
}

function numeric(value: unknown, positive = false): number {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    (typeof value === "string" && !/^\d+(\.\d+)?$/.test(value))
  ) {
    throw new Error("Unexpected Visa exchange-rate numeric value");
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || (positive && number === 0)) {
    throw new Error("Unexpected Visa exchange-rate numeric value");
  }
  return number;
}
