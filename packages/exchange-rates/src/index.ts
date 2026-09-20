import { Impit } from "impit";

export const exchanges = ["BANK_OF_TAIWAN", "BANK_SINOPAC"] as const;

export type Exchange = (typeof exchanges)[number];
export type RateKind = "cash" | "spot";

export type Rate = Readonly<{
  cashBuy?: number;
  cashSell?: number;
  exchange: Exchange;
  fetchedAt: string;
  source: string;
  spotBuy?: number;
  spotSell?: number;
  target: string;
}>;

export type RateFetchResponse = Pick<
  Response,
  "json" | "ok" | "status" | "text"
>;
export type RateFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<RateFetchResponse>;

export type FetchRatesOptions = {
  fetch?: RateFetch;
  now?: () => Date;
  timeoutMs?: number;
};

export type CachedRateFetcher = () => Promise<readonly Rate[]>;

const botEndpoint = "https://rate.bot.com.tw/xrt/fltxt/0/day";
const sinopacEndpoint = "https://m.sinopac.com/ws/share/rate/ws_exchange.ashx";
const missingValues = new Set(["", "-", "--", "—", "N/A", "NA", "NULL"]);
const currencyCodePattern = /^[A-Z]{3}$/;

export function spotMid(rate: Rate): number | undefined {
  if (rate.spotBuy === undefined || rate.spotSell === undefined) {
    return undefined;
  }
  return (rate.spotBuy + rate.spotSell) / 2;
}

export function cashMid(rate: Rate): number | undefined {
  if (rate.cashBuy === undefined || rate.cashSell === undefined) {
    return undefined;
  }
  return (rate.cashBuy + rate.cashSell) / 2;
}

export function parseBankOfTaiwanRates(
  text: string,
  fetchedAt = new Date(),
): Rate[] {
  const normalizedText = text.replace(/^\uFEFF/, "");
  if (/^\s*<!doctype|^\s*<html/i.test(normalizedText)) {
    throw new Error(
      "Bank of Taiwan returned an anti-bot challenge instead of rates",
    );
  }
  const lines = normalizedText.split(/\r?\n/).filter((line) => line.trim());
  const header = lines[0];
  if (!header) {
    throw new Error("Bank of Taiwan rate response is empty");
  }
  const headerColumns = splitColumns(header);
  if (
    headerColumns.length < 14 ||
    headerColumns[0] !== "幣別" ||
    headerColumns[2] !== "現金" ||
    headerColumns[3] !== "即期" ||
    headerColumns[12] !== "現金" ||
    headerColumns[13] !== "即期"
  ) {
    throw new Error("Unexpected Bank of Taiwan rate header");
  }

  const rates = lines.slice(1).map((line) => {
    const columns = splitColumns(line);
    if (
      columns.length < 14 ||
      columns[1] !== "本行買入" ||
      columns[11] !== "本行賣出"
    ) {
      throw new Error("Unexpected Bank of Taiwan rate row");
    }
    const source = normalizeCurrencyCode(columns[0]);
    if (!source) {
      throw new Error("Unexpected Bank of Taiwan currency code");
    }
    return {
      cashBuy: parseRateNumber(columns[2]),
      cashSell: parseRateNumber(columns[12]),
      exchange: "BANK_OF_TAIWAN" as const,
      fetchedAt: fetchedAt.toISOString(),
      source,
      spotBuy: parseRateNumber(columns[3]),
      spotSell: parseRateNumber(columns[13]),
      target: "TWD",
    };
  });
  if (rates.length === 0) {
    throw new Error("No Bank of Taiwan exchange rates were returned");
  }
  return rates;
}

export function parseSinopacRates(
  remitPayload: unknown,
  cashPayload: unknown,
  fetchedAt = new Date(),
): Rate[] {
  const fetchedAtIso = fetchedAt.toISOString();
  const spotRates = parseSinopacResponse(remitPayload, "spot", fetchedAtIso);
  const cashRates = parseSinopacResponse(cashPayload, "cash", fetchedAtIso);
  const merged = new Map<string, Rate>();

  for (const rate of [...spotRates, ...cashRates]) {
    const key = `${rate.source}/${rate.target}`;
    const previous = merged.get(key);
    merged.set(key, { ...previous, ...rate });
  }

  const rates = [...merged.values()];
  if (rates.length === 0) {
    throw new Error("No SinoPac exchange rates were returned");
  }
  return rates;
}

export async function fetchRates(
  exchange: Exchange = "BANK_OF_TAIWAN",
  options: FetchRatesOptions = {},
): Promise<Rate[]> {
  const now = options.now ?? (() => new Date());
  const fetchedAt = now();
  switch (exchange) {
    case "BANK_OF_TAIWAN":
      return fetchBankOfTaiwanRates(fetchedAt, options);
    case "BANK_SINOPAC": {
      const [remitPayload, cashPayload] = await Promise.all([
        fetchSinopacPayload("remit", fetchedAt, options),
        fetchSinopacPayload("cash", fetchedAt, options),
      ]);
      return parseSinopacRates(remitPayload, cashPayload, fetchedAt);
    }
  }
}

export function createCachedRateFetcher(
  fetcher: CachedRateFetcher = () => fetchRates(),
  options: { failureTtlMs?: number; now?: () => number; ttlMs?: number } = {},
): CachedRateFetcher {
  const now = options.now ?? Date.now;
  const ttlMs = options.ttlMs ?? 15 * 60 * 1000;
  const failureTtlMs = options.failureTtlMs ?? 60 * 1000;
  if (!Number.isFinite(ttlMs) || ttlMs < 0) {
    throw new Error("Cache TTL must be a non-negative finite number");
  }
  if (!Number.isFinite(failureTtlMs) || failureTtlMs < 0) {
    throw new Error("Failure cache TTL must be a non-negative finite number");
  }

  let cached: { expiresAt: number; rates: readonly Rate[] } | undefined;
  let failed: { error: unknown; expiresAt: number } | undefined;
  let pending: Promise<readonly Rate[]> | undefined;

  return async () => {
    const currentTime = now();
    if (cached && currentTime < cached.expiresAt) {
      return cached.rates;
    }
    if (failed && currentTime < failed.expiresAt) {
      throw failed.error;
    }
    if (pending) {
      return pending;
    }

    pending = fetcher()
      .then((rates) => {
        cached = { expiresAt: now() + ttlMs, rates };
        failed = undefined;
        return rates;
      })
      .catch((error: unknown) => {
        failed = { error, expiresAt: now() + failureTtlMs };
        throw error;
      })
      .finally(() => {
        pending = undefined;
      });
    return pending;
  };
}

async function fetchBankOfTaiwanRates(
  fetchedAt: Date,
  options: FetchRatesOptions,
): Promise<Rate[]> {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = options.fetch
      ? await options.fetch(botEndpoint, {
          headers: { "Accept-Language": "zh-TW,zh;q=0.9" },
          signal: controller.signal,
        })
      : await new Impit({ browser: "chrome", timeout: timeoutMs }).fetch(
          botEndpoint,
          { headers: { "Accept-Language": "zh-TW,zh;q=0.9" } },
        );
    if (!response.ok) {
      throw new Error(
        `Bank of Taiwan exchange-rate request failed (${response.status})`,
      );
    }
    return parseBankOfTaiwanRates(await response.text(), fetchedAt);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchSinopacPayload(
  kind: "cash" | "remit",
  now: Date,
  options: FetchRatesOptions,
): Promise<unknown> {
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const url = `${sinopacEndpoint}?${now.getTime()}`;

  try {
    const response = await fetchImplementation(url, {
      body: new URLSearchParams({ exchangeType: kind.toUpperCase() }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      method: "POST",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(
        `SinoPac exchange-rate request failed (${response.status})`,
      );
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function parseSinopacResponse(
  payload: unknown,
  kind: RateKind,
  fetchedAt: string,
): Rate[] {
  if (!Array.isArray(payload) || payload.length !== 1) {
    throw new Error("Unexpected SinoPac exchange-rate response");
  }
  const response = requireRecord(payload[0]);
  if (response.Header !== "SUCCESS" || !Array.isArray(response.SubInfo)) {
    throw new Error("SinoPac exchange-rate response was not successful");
  }

  const rates: Rate[] = [];
  const seen = new Set<string>();
  for (const rawItem of response.SubInfo) {
    const item = requireRecord(rawItem);
    const source = normalizeCurrencyCode(item.DataValue4);
    if (!source || seen.has(source)) {
      continue;
    }
    const buy = parseRateNumber(item.DataValue2);
    const sell = parseRateNumber(item.DataValue3);
    if (buy === undefined && sell === undefined) {
      continue;
    }
    seen.add(source);
    rates.push({
      exchange: "BANK_SINOPAC",
      fetchedAt,
      source,
      target: "TWD",
      ...(kind === "spot"
        ? { spotBuy: buy, spotSell: sell }
        : { cashBuy: buy, cashSell: sell }),
    });
  }
  return rates;
}

function splitColumns(row: string): string[] {
  return row.split(" ").filter(Boolean);
}

function normalizeCurrencyCode(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const code = value.trim().toUpperCase();
  return currencyCodePattern.test(code) ? code : undefined;
}

function parseRateNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === "boolean") {
    throw new Error("Exchange-rate values must be numeric");
  }

  let number: number;
  if (typeof value === "number") {
    number = value;
  } else if (typeof value === "string") {
    const normalized = value.replaceAll(",", "").trim();
    if (missingValues.has(normalized.toUpperCase())) {
      return undefined;
    }
    number = Number(normalized);
  } else {
    throw new Error("Exchange-rate values must be numeric");
  }

  if (!Number.isFinite(number) || number < 0) {
    throw new Error("Exchange-rate values must be finite and non-negative");
  }
  return number === 0 ? undefined : number;
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Unexpected SinoPac exchange-rate response");
  }
  return value as Record<string, unknown>;
}
