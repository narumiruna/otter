import type { ExchangeRateSnapshot } from "@narumitw/otter-contracts";
import {
  type Currency,
  currencies,
  isCurrency,
} from "@narumitw/otter-core/money";
import {
  createCachedRateFetcher,
  fetchRates,
  type Rate,
  spotMid,
} from "@narumitw/otter-exchange-rates";
import type { OtterApp, OtterMiddleware } from "./server-http.js";
import {
  asyncHandler,
  type BuildTripPayload,
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
      if (Object.keys(trip.exchangeRates ?? {}).length > 0) {
        return tripPayload(trip, { source: "custom" });
      }
      try {
        const snapshot = await getSnapshot(trip.baseCurrency);
        return tripPayload(
          { ...trip, exchangeRates: snapshot.rates },
          {
            fetchedAt: snapshot.fetchedAt,
            provider: snapshot.source,
            rateType: snapshot.rateType,
            source: "bank",
          },
        );
      } catch {
        return tripPayload(trip, { source: "fixed" });
      }
    },
  };
}

export function registerExchangeRateRoutes(
  app: OtterApp,
  mustBeSignedIn: OtterMiddleware,
  service: ExchangeRateService,
) {
  app.get(
    "/api/exchange-rates/:baseCurrency",
    mustBeSignedIn,
    asyncHandler(async (req, res) => {
      if (!isCurrency(req.params.baseCurrency)) {
        sendError(res, 400, "不支援的基準貨幣");
        return;
      }
      try {
        res.json(await service.getSnapshot(req.params.baseCurrency));
      } catch {
        sendError(res, 502, "目前無法取得銀行匯率，請稍後再試");
      }
    }),
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
