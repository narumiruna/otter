import { expect, test } from "vitest";
import type { RouteRequest } from "./server-http.js";
import { createFixedWindowRateLimiter } from "./server-rate-limit.js";

const request: RouteRequest = {
  body: {},
  get: () => undefined,
  headers: {},
  params: {},
  protocol: "https",
};

function clientRequest(address?: string): RouteRequest {
  return { ...request, remoteAddress: address };
}

test("fixed-window rate limits per client and globally", () => {
  const rateLimit = createFixedWindowRateLimiter({
    globalLimit: 3,
    perClientLimit: 2,
    windowMs: 1_000,
  });
  const firstClient = clientRequest("192.0.2.1");

  expect(rateLimit(firstClient, 1_000)).toBeUndefined();
  expect(rateLimit(firstClient, 1_000)).toBeUndefined();
  expect(rateLimit(firstClient, 1_000)).toBe(1);
  expect(rateLimit(clientRequest("192.0.2.2"), 1_000)).toBeUndefined();
  expect(rateLimit(clientRequest("192.0.2.3"), 1_000)).toBe(1);
  expect(rateLimit(firstClient, 2_000)).toBeUndefined();
});

test("requests without a client address still consume the global limit", () => {
  const rateLimit = createFixedWindowRateLimiter({
    globalLimit: 2,
    perClientLimit: 1,
    windowMs: 1_500,
  });

  expect(rateLimit(request, 1_000)).toBeUndefined();
  expect(rateLimit(request, 1_000)).toBeUndefined();
  expect(rateLimit(request, 1_000)).toBe(2);
  expect(rateLimit(request, 2_500)).toBeUndefined();
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
  const forwardedRequest = (address: string): RouteRequest => ({
    ...request,
    get: (name) => (name === "x-forwarded-for" ? address : undefined),
    remoteAddress: "192.0.2.1",
  });

  expect(
    directRateLimit(forwardedRequest("198.51.100.1"), 1_000),
  ).toBeUndefined();
  expect(directRateLimit(forwardedRequest("198.51.100.2"), 1_000)).toBe(1);
  expect(
    trustedProxyRateLimit(forwardedRequest("198.51.100.1"), 1_000),
  ).toBeUndefined();
  expect(
    trustedProxyRateLimit(forwardedRequest("198.51.100.2"), 1_000),
  ).toBeUndefined();
});

test("trusted proxy falls back from forwarded-for to real-ip and direct address", () => {
  const rateLimit = createFixedWindowRateLimiter({
    globalLimit: 4,
    perClientLimit: 1,
    trustProxy: true,
    windowMs: 1_000,
  });
  const realIpRequest: RouteRequest = {
    ...request,
    get: (name) => (name === "x-real-ip" ? "198.51.100.1" : undefined),
    remoteAddress: "192.0.2.1",
  };
  const directRequest = clientRequest("192.0.2.1");

  expect(rateLimit(realIpRequest, 1_000)).toBeUndefined();
  expect(rateLimit(realIpRequest, 1_000)).toBe(1);
  expect(rateLimit(directRequest, 1_000)).toBeUndefined();
});
