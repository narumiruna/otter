import assert from "node:assert/strict";
import { describe, expect, test, vi } from "vitest";
import {
  cashMid,
  createCachedRateFetcher,
  fetchRates,
  parseBankOfTaiwanRates,
  parseSinopacRates,
  type Rate,
  spotMid,
} from "./index.js";

const fetchedAt = new Date("2026-09-20T12:00:00.000Z");
const remitPayload = sinopacPayload([
  rateRow("USD", "31.7520", "31.8630"),
  rateRow("JPY", "0.2004", "0.2041"),
  rateRow("EUR", "36.3213", "36.7008"),
]);
const cashPayload = sinopacPayload([
  rateRow("USD", "31.5520", "32.0630"),
  rateRow("JPY", "0.1974", "0.2056"),
  rateRow("EUR", "-", "-"),
]);
const botText = `﻿幣別 匯率 現金 即期 遠期10天 遠期30天 遠期60天 遠期90天 遠期120天 遠期150天 遠期180天 匯率 現金 即期
USD 本行買入 31.40000 31.72500 - - - - - - - 本行賣出 32.07000 31.87500
JPY 本行買入 0.19830 0.20170 - - - - - - - 本行賣出 0.20630 0.20570
EUR 本行買入 35.85000 36.28000 - - - - - - - 本行賣出 37.19000 36.88000`;

describe("Bank of Taiwan exchange rates", () => {
  test("parses the official text board", () => {
    const rates = parseBankOfTaiwanRates(botText, fetchedAt);
    assert.deepEqual(rates[0], {
      cashBuy: 31.4,
      cashSell: 32.07,
      exchange: "BANK_OF_TAIWAN",
      fetchedAt: fetchedAt.toISOString(),
      source: "USD",
      spotBuy: 31.725,
      spotSell: 31.875,
      target: "TWD",
    });
    expect(spotMid(rates[1] as Rate)).toBeCloseTo(0.2037);
    assert.equal(rates.length, 3);
  });

  test("rejects empty, malformed, and anti-bot responses", () => {
    expect(() => parseBankOfTaiwanRates("", fetchedAt)).toThrow("empty");
    expect(() =>
      parseBankOfTaiwanRates("<html>Challenge Validation</html>", fetchedAt),
    ).toThrow("anti-bot challenge");
    expect(() =>
      parseBankOfTaiwanRates(
        `${botText.split("\n")[0]}\nUSD 本行買入 31`,
        fetchedAt,
      ),
    ).toThrow("Unexpected Bank of Taiwan rate row");
  });

  test("is the default fetch source", async () => {
    const fetchImplementation = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response(botText, { status: 200 }),
    );
    const rates = await fetchRates(undefined, {
      fetch: fetchImplementation,
      now: () => fetchedAt,
    });

    assert.equal(fetchImplementation.mock.calls.length, 1);
    assert.match(String(fetchImplementation.mock.calls[0]?.[0]), /rate\.bot/);
    assert.equal(rates[0]?.exchange, "BANK_OF_TAIWAN");
  });
});

describe("SinoPac exchange rates", () => {
  test("normalizes and merges spot and cash rates", () => {
    const rates = parseSinopacRates(remitPayload, cashPayload, fetchedAt);
    const usd = rates.find((rate) => rate.source === "USD");
    const eur = rates.find((rate) => rate.source === "EUR");

    assert.deepEqual(usd, {
      cashBuy: 31.552,
      cashSell: 32.063,
      exchange: "BANK_SINOPAC",
      fetchedAt: fetchedAt.toISOString(),
      source: "USD",
      spotBuy: 31.752,
      spotSell: 31.863,
      target: "TWD",
    });
    expect(spotMid(usd as Rate)).toBeCloseTo(31.8075);
    expect(cashMid(usd as Rate)).toBeCloseTo(31.8075);
    assert.equal(eur?.cashBuy, undefined);
    assert.equal(eur?.spotBuy, 36.3213);
  });

  test("rejects malformed and unsuccessful payloads", () => {
    expect(() => parseSinopacRates({}, cashPayload, fetchedAt)).toThrow(
      "Unexpected SinoPac",
    );
    expect(() =>
      parseSinopacRates(
        [{ Header: "ERROR", SubInfo: [] }],
        cashPayload,
        fetchedAt,
      ),
    ).toThrow("was not successful");
    expect(() =>
      parseSinopacRates(
        sinopacPayload([rateRow("USD", true, "31")]),
        cashPayload,
        fetchedAt,
      ),
    ).toThrow("must be numeric");
  });

  test("requests spot and cash boards concurrently", async () => {
    const requests: { body: string; url: string }[] = [];
    const fetchImplementation = vi.fn(
      async (input: string | URL | Request, init?: RequestInit) => {
        const body = String(init?.body);
        requests.push({ body, url: String(input) });
        return new Response(
          body.includes("REMIT")
            ? JSON.stringify(remitPayload)
            : JSON.stringify(cashPayload),
          {
            headers: { "Content-Type": "application/json" },
            status: 200,
          },
        );
      },
    );

    const rates = await fetchRates("BANK_SINOPAC", {
      fetch: fetchImplementation,
      now: () => fetchedAt,
    });

    assert.equal(fetchImplementation.mock.calls.length, 2);
    assert.deepEqual(requests.map(({ body }) => body).sort(), [
      "exchangeType=CASH",
      "exchangeType=REMIT",
    ]);
    assert.ok(
      requests.every(({ url }) => url.endsWith(String(fetchedAt.getTime()))),
    );
    assert.equal(rates.length, 3);
  });
});

test("cached fetcher reuses fresh results and coalesces concurrent requests", async () => {
  let now = 1_000;
  let resolveFetch: ((rates: readonly Rate[]) => void) | undefined;
  const fetcher = vi.fn(
    () =>
      new Promise<readonly Rate[]>((resolve) => {
        resolveFetch = resolve;
      }),
  );
  const cached = createCachedRateFetcher(fetcher, {
    now: () => now,
    ttlMs: 500,
  });

  const first = cached();
  const concurrent = cached();
  assert.equal(fetcher.mock.calls.length, 1);
  resolveFetch?.([]);
  assert.strictEqual(await first, await concurrent);
  await cached();
  assert.equal(fetcher.mock.calls.length, 1);

  now = 1_500;
  const refreshed = cached();
  assert.equal(fetcher.mock.calls.length, 2);
  resolveFetch?.([]);
  await refreshed;
});

test("cached fetcher backs off after sequential failures", async () => {
  let now = 1_000;
  const unavailable = new Error("upstream unavailable");
  const fetcher = vi.fn(async () => {
    throw unavailable;
  });
  const cached = createCachedRateFetcher(fetcher, {
    failureTtlMs: 500,
    now: () => now,
  });

  await expect(cached()).rejects.toBe(unavailable);
  await expect(cached()).rejects.toBe(unavailable);
  assert.equal(fetcher.mock.calls.length, 1);

  now = 1_500;
  await expect(cached()).rejects.toBe(unavailable);
  assert.equal(fetcher.mock.calls.length, 2);
});

function sinopacPayload(rows: unknown[]) {
  return [{ Header: "SUCCESS", SubInfo: rows }];
}

function rateRow(currency: string, buy: unknown, sell: unknown) {
  return {
    DataValue1: currency,
    DataValue2: buy,
    DataValue3: sell,
    DataValue4: currency,
  };
}
