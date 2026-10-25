import type { ExchangeRateSnapshot } from "@narumitw/otter-contracts";
import { isDateOnly } from "@narumitw/otter-core/date";
import {
  type Currency,
  currencies,
  type ExchangeRates,
  isCurrency,
} from "@narumitw/otter-core/money";
import {
  fetchVisaRate,
  type VisaRate,
  type VisaRateQuery,
} from "@narumitw/otter-visa-exchange-rates";
import type { OtterApp, OtterMiddleware } from "./server-http.js";
import { parseRequestBody } from "./server-http.js";
import {
  type BuildTripPayload,
  sendError,
  tripPayload,
} from "./server-support.js";

export type ExchangeRateRouteOptions = {
  fetchRate?: typeof fetchVisaRate;
  now?: () => Date;
};

export function rateKey(source: string, target: string, date: string): string {
  return `${source}/${target}/${date}`;
}

export function createExchangeRateService(
  options: ExchangeRateRouteOptions = {},
) {
  const fetchRate = options.fetchRate ?? fetchVisaRate;
  const now = options.now ?? (() => new Date());
  const cache = new Map<
    string,
    { expiresAt: number; result: Promise<VisaRate> }
  >();
  let tail: Promise<unknown> = Promise.resolve();
  let pending = 0;
  const getRate = async (query: VisaRateQuery): Promise<VisaRate> => {
    const date = query.date ?? taiwanDate(now());
    const source = query.source;
    const target = query.target;
    if (!isCurrency(source) || !isCurrency(target) || !isDateOnly(date))
      throw new Error("Invalid rate query");
    const key = rateKey(source, target, date);
    const saved = cache.get(key);
    if (saved && saved.expiresAt > now().getTime()) return saved.result;
    const fetchedAt = now().toISOString();
    if (source === target)
      return {
        source,
        target,
        date,
        fetchedAt,
        amount: 1,
        bankFeePercent: 0,
        rate: 1,
        visaRate: 1,
        convertedAmount: 1,
      };
    if (pending >= 64) throw new Error("Too many pending Visa requests");
    pending += 1;
    const result = tail
      .then(async () => {
        const quote = await fetchRate({
          source,
          target,
          date,
          amount: 1,
          bankFeePercent: 0,
        });
        if (
          quote.source !== source ||
          quote.target !== target ||
          quote.date !== date ||
          quote.amount !== 1 ||
          quote.bankFeePercent !== 0 ||
          !Number.isFinite(quote.visaRate) ||
          quote.visaRate <= 0 ||
          quote.visaRate >= 1e308 ||
          !/^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(quote.fetchedAt) ||
          !Number.isFinite(Date.parse(quote.fetchedAt))
        )
          throw new Error("Invalid Visa quote");
        entry.expiresAt = now().getTime() + 15 * 60_000;
        return quote;
      })
      .catch((error: unknown) => {
        entry.expiresAt = now().getTime() + 60_000;
        throw error;
      })
      .finally(() => {
        pending -= 1;
      });
    const entry = { expiresAt: Number.POSITIVE_INFINITY, result };
    cache.set(key, entry);
    tail = result.catch(() => {});
    // Expired entries are not historical storage. Saved record snapshots are.
    for (const [oldKey, old] of cache) {
      if (
        old.expiresAt <= now().getTime() ||
        (cache.size > 1024 && Number.isFinite(old.expiresAt))
      )
        cache.delete(oldKey);
    }
    return result;
  };
  const buildTripPayload: BuildTripPayload = async (trip) => {
    const customRates = Object.fromEntries(
      Object.entries(trip.exchangeRates ?? {}).filter(
        ([currency]) => currency !== trip.baseCurrency,
      ),
    );
    return tripPayload(
      trip,
      Object.keys(customRates).length
        ? { source: "custom", customRates, defaults: { source: "visa" } }
        : { source: "visa" },
    );
  };
  const getSnapshot = async (
    baseCurrency: Currency,
  ): Promise<ExchangeRateSnapshot> => {
    const date = taiwanDate(now());
    const rates: ExchangeRates = { [baseCurrency]: 1 };
    const unavailableCurrencies: Currency[] = [];
    const fetchedAt = now().toISOString();
    for (const source of currencies) {
      if (source === baseCurrency) continue;
      try {
        rates[source] = (
          await getRate({ source, target: baseCurrency, date })
        ).visaRate;
      } catch {
        unavailableCurrencies.push(source);
      }
    }
    if (unavailableCurrencies.length === currencies.length - 1)
      throw new Error("Visa unavailable");
    return {
      baseCurrency,
      date,
      fetchedAt,
      rates,
      source: "VISA",
      rateType: "visa",
      unavailableCurrencies,
    };
  };
  return { buildTripPayload, getSnapshot, getRate };
}

export type ExchangeRateService = ReturnType<typeof createExchangeRateService>;

export function registerExchangeRateRoutes(
  app: OtterApp,
  mustBeSignedIn: OtterMiddleware,
  service: ExchangeRateService,
) {
  app.get(
    "/api/exchange-rates/:baseCurrency",
    mustBeSignedIn,
    parseRequestBody,
    async (context) => {
      const baseCurrency = context.req.param("baseCurrency");
      if (!isCurrency(baseCurrency))
        return sendError(context, 400, "不支援的基準貨幣");
      try {
        return context.json(await service.getSnapshot(baseCurrency));
      } catch {
        return sendError(context, 502, "目前無法取得 Visa 匯率，請稍後再試");
      }
    },
  );
}

function taiwanDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) =>
    parts.find((value) => value.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
