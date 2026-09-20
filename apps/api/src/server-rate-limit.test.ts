import { expect, test } from "vitest";
import { createFixedWindowRateLimiter } from "./server-rate-limit.js";

const request = new Request("https://example.com");

test("fixed-window rate limits per client and globally", () => {
  const rateLimit = createFixedWindowRateLimiter({
    globalLimit: 3,
    perClientLimit: 2,
    windowMs: 1_000,
  });

  expect(rateLimit(request, "192.0.2.1", 1_000)).toBeUndefined();
  expect(rateLimit(request, "192.0.2.1", 1_000)).toBeUndefined();
  expect(rateLimit(request, "192.0.2.1", 1_000)).toBe(1);
  expect(rateLimit(request, "192.0.2.2", 1_000)).toBeUndefined();
  expect(rateLimit(request, "192.0.2.3", 1_000)).toBe(1);
  expect(rateLimit(request, "192.0.2.1", 2_000)).toBeUndefined();
});

test("requests without a client address still consume the global limit", () => {
  const rateLimit = createFixedWindowRateLimiter({
    globalLimit: 2,
    perClientLimit: 1,
    windowMs: 1_500,
  });

  expect(rateLimit(request, undefined, 1_000)).toBeUndefined();
  expect(rateLimit(request, undefined, 1_000)).toBeUndefined();
  expect(rateLimit(request, undefined, 1_000)).toBe(2);
  expect(rateLimit(request, undefined, 2_500)).toBeUndefined();
});

test("forwarded addresses are trusted only when configured", () => {
  const directRateLimit = createFixedWindowRateLimiter({
    globalLimit: 3,
    perClientLimit: 1,
    windowMs: 1_000,
  });
  const trustedProxyRateLimit = createFixedWindowRateLimiter({
    globalLimit: 3,
    perClientLimit: 1,
    trustProxy: true,
    windowMs: 1_000,
  });
  const forwardedRequest = (address: string) =>
    new Request(request, {
      headers: { "x-forwarded-for": address },
    });

  expect(
    directRateLimit(forwardedRequest("198.51.100.1"), "192.0.2.1", 1_000),
  ).toBeUndefined();
  expect(
    directRateLimit(forwardedRequest("198.51.100.2"), "192.0.2.1", 1_000),
  ).toBe(1);
  expect(
    trustedProxyRateLimit(forwardedRequest("198.51.100.1"), "192.0.2.1", 1_000),
  ).toBeUndefined();
  expect(
    trustedProxyRateLimit(forwardedRequest("198.51.100.2"), "192.0.2.1", 1_000),
  ).toBeUndefined();
});

test("trusted proxy falls back from forwarded-for to real-ip and direct address", () => {
  const rateLimit = createFixedWindowRateLimiter({
    globalLimit: 4,
    perClientLimit: 1,
    trustProxy: true,
    windowMs: 1_000,
  });
  const realIpRequest = new Request(request, {
    headers: { "x-real-ip": "198.51.100.1" },
  });

  expect(rateLimit(realIpRequest, "192.0.2.1", 1_000)).toBeUndefined();
  expect(rateLimit(realIpRequest, "192.0.2.1", 1_000)).toBe(1);
  expect(rateLimit(request, "192.0.2.1", 1_000)).toBeUndefined();
  expect(
    rateLimit(
      new Request(request, {
        headers: { "x-forwarded-for": " 198.51.100.1 , 192.0.2.2 " },
      }),
      "192.0.2.3",
      1_000,
    ),
  ).toBe(1);
  expect(
    rateLimit(
      new Request(request, {
        headers: { "x-forwarded-for": " ", "x-real-ip": " " },
      }),
      " 192.0.2.1 ",
      1_000,
    ),
  ).toBe(1);
});
