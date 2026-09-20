import { describe, expect, test } from "vitest";
import { apiProxy } from "../../vite.config.js";

describe("Vite API proxy", () => {
  test("preserves the browser host used in generated share URLs", () => {
    expect(apiProxy.changeOrigin).toBe(false);
  });
});
