import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    include: ["src/**/*.test.ts"],
    restoreMocks: true,
    testTimeout: 30_000,
  },
});
