import type {
  ExchangeRateDefaults,
  ExchangeRateSnapshot,
} from "@narumitw/otter-contracts";
import {
  type Currency,
  currencies,
  type ExchangeRates,
  fixedExchangeRates,
  isCurrency,
} from "@narumitw/otter-core/money";
import {
  createCachedRateFetcher,
  fetchRates,
  type Rate,
  spotMid,
} from "@narumitw/otter-exchange-rates";
import type { OtterApp, OtterMiddleware } from "./server-http.js";
import { parseRequestBody } from "./server-http.js";
import {
  type BuildTripPayload,
  type LoadedTrip,
  sendError,
  tripPayload,
} from "./server-support.js";

export type ExchangeRateRouteOptions = {
  fetchRates?: () => Promise<readonly Rate[]>;
};

export type ExchangeRateService = {
  buildTripPayload: BuildTripPayload;
  getSnapshot: (baseCurrency: Currency) => Promise<ExchangeRateSnapshot>;
};

export function createExchangeRateService(
  options: ExchangeRateRouteOptions = {},
): ExchangeRateService {
  const fetchCurrentRates =
    options.fetchRates ??
    createCachedRateFetcher(() => fetchRates("BANK_OF_TAIWAN"));
  const getSnapshot = async (baseCurrency: Currency) =>
    buildExchangeRateSnapshot(await fetchCurrentRates(), baseCurrency);

  return {
    getSnapshot,
    buildTripPayload: async (trip) => {
      const customRates = customExchangeRates(trip);
      const hasCustomRates = Object.keys(customRates).length > 0;
      let defaults: ExchangeRateDefaults;
      try {
        const snapshot = await getSnapshot(trip.baseCurrency);
        defaults = {
          fetchedAt: snapshot.fetchedAt,
          provider: snapshot.source,
          rates: snapshot.rates,
          rateType: snapshot.rateType,
          source: "bank",
        };
      } catch {
        if (!hasCustomRates) {
          return tripPayload(trip, { source: "fixed" });
        }
        defaults = {
          rates: fixedExchangeRates(trip.baseCurrency),
          source: "fixed",
        };
      }

      if (hasCustomRates) {
        return tripPayload(
          {
            ...trip,
            exchangeRates: {
              ...defaults.rates,
              ...customRates,
              [trip.baseCurrency]: 1,
            },
          },
          { customRates, defaults, source: "custom" },
        );
      }

      if (defaults.source !== "bank") {
        return tripPayload(trip, { source: "fixed" });
      }
      return tripPayload(
        { ...trip, exchangeRates: defaults.rates },
        {
          fetchedAt: defaults.fetchedAt,
          provider: defaults.provider,
          rateType: defaults.rateType,
          source: "bank",
        },
      );
    },
  };
}

function customExchangeRates(trip: LoadedTrip): ExchangeRates {
  return Object.fromEntries(
    Object.entries(trip.exchangeRates ?? {}).filter(
      ([currency]) => currency !== trip.baseCurrency,
    ),
  ) as ExchangeRates;
}

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
      if (!isCurrency(baseCurrency)) {
        return sendError(context, 400, "不支援的基準貨幣");
      }
      try {
        return context.json(await service.getSnapshot(baseCurrency));
      } catch {
        return sendError(context, 502, "目前無法取得銀行匯率，請稍後再試");
      }
    },
  );
}

export function buildExchangeRateSnapshot(
  bankRates: readonly Rate[],
  baseCurrency: Currency,
): ExchangeRateSnapshot {
  const ratesToTwd = new Map<Currency, number>([["TWD", 1]]);
  for (const rate of bankRates) {
    if (rate.target !== "TWD" || !isCurrency(rate.source)) {
      continue;
    }
    const mid = spotMid(rate);
    if (mid !== undefined && Number.isFinite(mid) && mid > 0) {
      ratesToTwd.set(rate.source, mid);
    }
  }

  const baseRate = ratesToTwd.get(baseCurrency);
  if (!baseRate) {
    throw new Error(`Missing ${baseCurrency}/TWD spot rate`);
  }

  const normalizedRates = Object.fromEntries(
    currencies.map((currency) => {
      const rateToTwd = ratesToTwd.get(currency);
      if (!rateToTwd) {
        throw new Error(`Missing ${currency}/TWD spot rate`);
      }
      return [
        currency,
        currency === baseCurrency
          ? 1
          : Number((rateToTwd / baseRate).toPrecision(12)),
      ];
    }),
  ) as Record<Currency, number>;
  const fetchedAt = bankRates[0]?.fetchedAt;
  if (!fetchedAt) {
    throw new Error("No exchange rates were returned");
  }

  return {
    baseCurrency,
    fetchedAt,
    rates: normalizedRates,
    rateType: "spotMid",
    source: "BANK_OF_TAIWAN",
  };
}
