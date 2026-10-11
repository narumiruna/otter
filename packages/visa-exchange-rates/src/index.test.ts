import { describe, expect, it, vi } from "vitest";
import { fetchVisaRate, type VisaRateQuery } from "./index.js";

// Captured from the Taiwan calculator API for 1 JPY to TWD, 2026-10-11.
const fixture = {
  originalValues: {
    fromCurrency: "JPY",
    toCurrency: "TWD",
    fxRateVisa: "0.2027516836",
  },
  conversionAmountValue: "1",
  conversionBankFee: "0.0",
  conversionInputDate: "10/11/2026",
  conversionFromCurrency: "TWD",
  conversionToCurrency: "JPY",
  convertedAmount: "0.202752",
  fxRateWithAdditionalFee: "0.2027516836",
  status: "success",
};
const query = { source: "JPY", target: "TWD" };
const now = () => new Date("2026-10-10T16:05:00Z");
const response = (payload: unknown = fixture) => ({
  ok: true,
  status: 200,
  json: async () => payload,
});

describe("fetchVisaRate", () => {
  it("uses today's Taiwan date and preserves Visa's currency direction", async () => {
    const fetch = vi.fn(async (_url: string, _init: RequestInit) => response());
    const result = await fetchVisaRate(
      { source: " jpy ", target: "twd" },
      { fetch, now },
    );
    expect(result).toEqual({
      ...query,
      amount: 1,
      bankFeePercent: 0,
      date: "2026-10-11",
      rate: 0.2027516836,
      visaRate: 0.2027516836,
      convertedAmount: 0.202752,
      fetchedAt: now().toISOString(),
    });
    const [url, init] = fetch.mock.calls[0];
    expect(new URL(url).origin).toBe("https://www.visa.com.tw");
    expect(Object.fromEntries(new URL(url).searchParams)).toEqual({
      amount: "1",
      fee: "0",
      utcConvertedDate: "10/11/2026",
      exchangedate: "10/11/2026",
      fromCurr: "TWD",
      toCurr: "JPY",
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("supports explicit dates, amounts, and bank fees without applying fees twice", async () => {
    const fetch = vi.fn(async (_url: string, _init: RequestInit) =>
      response({
        ...fixture,
        conversionInputDate: "07/05/2026",
        conversionAmountValue: "100",
        conversionBankFee: "1.5",
        convertedAmount: "20.579296",
        fxRateWithAdditionalFee: "0.2057929589",
      }),
    );
    const result = await fetchVisaRate(
      { ...query, date: "2026-07-05", amount: 100, bankFeePercent: 1.5 },
      { fetch, now },
    );
    expect(result.rate).toBe(0.2057929589);
    expect(result.visaRate).toBe(0.2027516836);
    expect(result.convertedAmount).toBe(20.579296);
    expect(new URL(fetch.mock.calls[0][0]).searchParams.get("fee")).toBe("1.5");
  });

  it.each<Partial<VisaRateQuery>>([
    { source: "JP" },
    { target: "123" },
    { date: "2026-02-29" },
    { date: "2026-04-31" },
    { date: "07/05/2026" },
    { amount: 0 },
    { amount: -1 },
    { amount: Number.NaN },
    { amount: Number.POSITIVE_INFINITY },
    { bankFeePercent: -1 },
    { bankFeePercent: Number.NaN },
  ])("rejects invalid input before fetching: %j", async (invalid) => {
    const fetch = vi.fn(async () => response());
    await expect(
      fetchVisaRate({ ...query, ...invalid }, { fetch, now }),
    ).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("accepts a leap day", async () => {
    const fetch = async () =>
      response({ ...fixture, conversionInputDate: "02/29/2024" });
    expect(
      (await fetchVisaRate({ ...query, date: "2024-02-29" }, { fetch, now }))
        .date,
    ).toBe("2024-02-29");
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid timeout %s",
    async (timeoutMs) => {
      await expect(fetchVisaRate(query, { now, timeoutMs })).rejects.toThrow(
        "Timeout",
      );
    },
  );

  it("reports HTTP failure without parsing the body", async () => {
    const json = vi.fn();
    await expect(
      fetchVisaRate(query, {
        now,
        fetch: async () => ({ ok: false, status: 403, json }),
      }),
    ).rejects.toThrow("(403)");
    expect(json).not.toHaveBeenCalled();
  });

  it.each([
    null,
    [],
    {},
    { ...fixture, status: "error" },
    { ...fixture, conversionToCurrency: "USD" },
    { ...fixture, conversionFromCurrency: "JPY" },
    { ...fixture, conversionInputDate: "10/10/2026" },
    { ...fixture, conversionAmountValue: "2" },
    { ...fixture, conversionBankFee: "2" },
    {
      ...fixture,
      originalValues: { ...fixture.originalValues, fromCurrency: "USD" },
    },
    {
      ...fixture,
      originalValues: { ...fixture.originalValues, fxRateVisa: "0" },
    },
    ...["", "NaN", "Infinity", "-1", "0", true, null, {}].map((rate) => ({
      ...fixture,
      fxRateWithAdditionalFee: rate,
    })),
    { ...fixture, convertedAmount: "-1" },
  ])("rejects malformed or mismatched responses: %j", async (payload) => {
    await expect(
      fetchVisaRate(query, { now, fetch: async () => response(payload) }),
    ).rejects.toThrow();
  });

  it("propagates network and JSON errors", async () => {
    const error = new Error("Network failure");
    await expect(
      fetchVisaRate(query, {
        now,
        fetch: async () => {
          throw error;
        },
      }),
    ).rejects.toBe(error);
    await expect(
      fetchVisaRate(query, {
        now,
        fetch: async () => ({
          ...response(),
          json: async () => {
            throw new SyntaxError("Invalid JSON");
          },
        }),
      }),
    ).rejects.toThrow("Invalid JSON");
  });

  it("aborts a slow request and clears the timer", async () => {
    vi.useFakeTimers();
    try {
      const fetch = (_url: string, init: RequestInit) =>
        new Promise<ReturnType<typeof response>>((_resolve, reject) => {
          init.signal?.addEventListener(
            "abort",
            () => reject(new Error("Aborted")),
            { once: true },
          );
        });
      const assertion = expect(
        fetchVisaRate(query, { now, fetch, timeoutMs: 25 }),
      ).rejects.toThrow("Aborted");
      await vi.advanceTimersByTimeAsync(25);
      await assertion;
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
