import { describe, expect, test } from "vitest";
import config, { apiProxy } from "../../vite.config.js";

describe("Vite server", () => {
  test("allows the public development host without allowing all hosts", () => {
    expect(config.server?.allowedHosts).toEqual(["otter.narumi.dev"]);
  });

  test("preserves the browser host used in generated share URLs", () => {
    expect(apiProxy.changeOrigin).toBe(false);
  });
});
