import { currencies } from "@narumitw/otter-core/money";
import { fetchRates as fetchBankRates } from "@narumitw/otter-exchange-rates";
import type {
  VisaRate,
  VisaRateQuery,
} from "@narumitw/otter-visa-exchange-rates";
import { Hono } from "hono";
import { expect, test, vi } from "vitest";
import {
  createExchangeRateService,
  registerExchangeRateRoutes,
} from "./server-exchange-rates.js";
import type { OtterEnv, OtterMiddleware } from "./server-http.js";
import type { LoadedTrip } from "./server-support.js";

vi.mock("@narumitw/otter-exchange-rates", () => ({
  fetchRates: vi.fn(() => {
    throw new Error("Bank transport must never be called");
  }),
}));

const date = "2026-07-05";
const query = { source: "JPY", target: "TWD", date };
function quote(q: VisaRateQuery): VisaRate {
  return {
    ...q,
    date: q.date ?? date,
    amount: 1,
    bankFeePercent: 0,
    rate: 0.2,
    visaRate: 0.2,
    convertedAmount: 0.2,
    fetchedAt: "2026-07-05T00:00:00Z",
  };
}
const emptyTrip: LoadedTrip = {
  baseCurrency: "TWD",
  createdAt: "2026-07-05T00:00:00Z",
  expenses: [],
  id: "t",
  name: "Japan",
  ownerId: "u",
  participants: [],
};

test("record reads use saved data without fetching any current rate", async () => {
  const fetchRate = vi.fn(async () => {
    throw new Error("No provider access");
  });
  const service = createExchangeRateService({ fetchRate });
  expect((await service.buildTripPayload(emptyTrip)).exchangeRateInfo).toEqual({
    source: "visa",
  });
  const custom = await service.buildTripPayload({
    ...emptyTrip,
    exchangeRates: { USD: 30, TWD: 1 },
  });
  expect(custom.exchangeRateInfo).toEqual({
    source: "custom",
    customRates: { USD: 30 },
    defaults: { source: "visa" },
  });
  expect(custom.trip.exchangeRates).toEqual({ USD: 30, TWD: 1 });
  expect(fetchRate).not.toHaveBeenCalled();
  expect(fetchBankRates).not.toHaveBeenCalled();
});

test("coalesces requests, caches successes, and separates both targets and dates", async () => {
  let now = Date.parse("2026-07-05T00:00:00Z");
  const fetchRate = vi.fn(async (q: VisaRateQuery) => quote(q));
  const service = createExchangeRateService({
    fetchRate,
    now: () => new Date(now),
  });
  const [first, second] = await Promise.all([
    service.getRate(query),
    service.getRate(query),
  ]);
  expect(first).toEqual(second);
  await service.getRate(query);
  expect(fetchRate).toHaveBeenCalledTimes(1);
  await service.getRate({ ...query, date: "2026-07-06" });
  await service.getRate({ ...query, target: "USD" });
  expect(fetchRate).toHaveBeenCalledTimes(3);
  now += 15 * 60_000;
  await service.getRate(query);
  expect(fetchRate).toHaveBeenCalledTimes(4);
  expect(fetchRate).toHaveBeenLastCalledWith({
    ...query,
    amount: 1,
    bankFeePercent: 0,
  });
});

test("backs off failed requests without fallback and retries after expiry", async () => {
  let now = 0;
  const fetchRate = vi
    .fn(async (q: VisaRateQuery) => quote(q))
    .mockRejectedValueOnce(new Error("Provider timeout"));
  const service = createExchangeRateService({
    fetchRate,
    now: () => new Date(now),
  });
  await expect(service.getRate(query)).rejects.toThrow("timeout");
  await expect(service.getRate(query)).rejects.toThrow("timeout");
  expect(fetchRate).toHaveBeenCalledTimes(1);
  now += 60_000;
  await expect(service.getRate(query)).resolves.toMatchObject({
    visaRate: 0.2,
  });
  expect(fetchRate).toHaveBeenCalledTimes(2);
});

test.each([
  { visaRate: 0 },
  { bankFeePercent: 1.5 },
  { amount: 2 },
  { date: "2026-07-06" },
  { source: "USD" },
  { fetchedAt: "invalid" },
])("rejects a mismatched Visa response %j", async (invalid) => {
  const service = createExchangeRateService({
    fetchRate: async (q) => ({ ...quote(q), ...invalid }),
  });
  await expect(service.getRate(query)).rejects.toThrow("Invalid Visa quote");
});

test("identity rates do not query a provider, but still validate dates", async () => {
  const fetchRate = vi.fn(async (q: VisaRateQuery) => quote(q));
  const service = createExchangeRateService({ fetchRate });
  await expect(
    service.getRate({ source: "JPY", target: "JPY", date }),
  ).resolves.toMatchObject({ visaRate: 1 });
  await expect(
    service.getRate({ source: "JPY", target: "JPY", date: "invalid" }),
  ).rejects.toThrow("Invalid rate query");
  expect(fetchRate).not.toHaveBeenCalled();
});

test("preview queries direct pairs, uses the Taiwan date, and reports missing currencies", async () => {
  const fetchRate = vi.fn(async (q: VisaRateQuery) => {
    if (q.source === "KRW") throw new Error("Unavailable");
    return quote(q);
  });
  const service = createExchangeRateService({
    fetchRate,
    now: () => new Date("2026-07-05T18:00:00Z"),
  });
  const snapshot = await service.getSnapshot("USD");
  expect(snapshot).toMatchObject({
    source: "VISA",
    rateType: "visa",
    date: "2026-07-06",
    rates: { USD: 1, JPY: 0.2 },
    unavailableCurrencies: ["KRW"],
  });
  expect(snapshot.rates.KRW).toBeUndefined();
  expect(fetchRate).toHaveBeenCalledTimes(currencies.length - 1);
  expect(fetchRate.mock.calls.every(([q]) => q.target === "USD")).toBe(true);
});

test("preview endpoint validates inputs and returns a stable provider error", async () => {
  const allowed: OtterMiddleware = async (_context, next) => next();
  const app = new Hono<OtterEnv>();
  const fetchRate = vi.fn(async () => {
    throw new Error("Provider unavailable");
  });
  registerExchangeRateRoutes(
    app,
    allowed,
    createExchangeRateService({ fetchRate }),
  );
  expect((await app.request("/api/exchange-rates/BTC")).status).toBe(400);
  const unavailable = await app.request("/api/exchange-rates/TWD");
  expect(unavailable.status).toBe(502);
  expect(await unavailable.json()).toEqual({
    error: "目前無法取得 Visa 匯率，請稍後再試",
  });
});
