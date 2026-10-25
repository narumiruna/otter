import type { VisaRateQuery } from "@narumitw/otter-visa-exchange-rates";
import { expect, test, vi } from "vitest";
import { createExchangeRateService } from "./server-exchange-rates.js";

const date = (index: number) =>
  new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10);
const query = (index: number) => ({
  source: "JPY",
  target: "TWD",
  date: date(index),
});
const quote = (q: VisaRateQuery) => ({
  ...q,
  date: q.date ?? date(0),
  amount: 1,
  bankFeePercent: 0,
  visaRate: 0.2,
  rate: 0.2,
  convertedAmount: 0.2,
  fetchedAt: "2026-07-05T00:00:00Z",
});
test("limits pending work and serializes external requests", async () => {
  let active = 0;
  let maximum = 0;
  const fetchRate = vi.fn(async (q: VisaRateQuery) => {
    active++;
    maximum = Math.max(maximum, active);
    await Promise.resolve();
    active--;
    return quote(q);
  });
  const service = createExchangeRateService({ fetchRate });
  const results = await Promise.allSettled(
    Array.from({ length: 65 }, (_, i) => service.getRate(query(i))),
  );
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(64);
  const rejected = results.find((r) => r.status === "rejected");
  expect(rejected?.status === "rejected" && rejected.reason.message).toContain(
    "Too many pending",
  );
  expect(maximum).toBe(1);
});
test("bounds completed cache entries without replacing record snapshots", async () => {
  const fetchRate = vi.fn(async (q: VisaRateQuery) => quote(q));
  const service = createExchangeRateService({ fetchRate });
  for (let i = 0; i < 1025; i++) await service.getRate(query(i));
  const calls = fetchRate.mock.calls.length;
  await service.getRate(query(0));
  expect(fetchRate).toHaveBeenCalledTimes(calls + 1);
});
