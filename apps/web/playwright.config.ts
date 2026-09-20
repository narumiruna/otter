import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  expect: { timeout: 8_000 },
  fullyParallel: false,
  reporter: "line",
  retries: process.env.CI ? 1 : 0,
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:17463",
    locale: "zh-TW",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run dev --workspace @narumitw/otter-api",
      env: {
        ...process.env,
        DEV_ADMIN_PASSWORD: "admin1234",
        NODE_ENV: "development",
        PASSWORD_AUTH_TRUST_PROXY: "true",
        PORT: "17464",
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      url: "http://127.0.0.1:17464/api/config",
    },
    {
      command: "npm run dev --workspace @narumitw/otter-web",
      env: process.env,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      url: "http://127.0.0.1:17463",
    },
  ],
});
