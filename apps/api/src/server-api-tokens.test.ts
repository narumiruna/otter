import { describe, expect, test } from "vitest";
import { bearerTokenFromRequest } from "./server-api-tokens.js";

function requestWithAuthorization(authorization?: string): Request {
  return new Request("https://example.com", {
    headers: authorization ? { authorization } : {},
  });
}

describe("bearerTokenFromRequest", () => {
  test.each([
    ["Bearer otter_api_token", "otter_api_token"],
    ["bearer otter_api_token", "otter_api_token"],
    ["  BEARER\t otter_api_token  ", "otter_api_token"],
  ])("accepts valid Bearer syntax: %s", (authorization, token) => {
    expect(
      bearerTokenFromRequest(requestWithAuthorization(authorization)),
    ).toBe(token);
  });

  test.each([
    undefined,
    "Basic value",
    "Bearer",
    "Bearer first second",
    "Bearer otter_api_token,other",
  ])("rejects invalid Bearer syntax: %s", (authorization) => {
    expect(
      bearerTokenFromRequest(requestWithAuthorization(authorization)),
    ).toBeUndefined();
  });
});
