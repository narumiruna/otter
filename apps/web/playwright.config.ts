import { defineConfig, devices } from "@playwright/test";

const webPort = process.env.OTTER_E2E_WEB_PORT ?? "17463";
const apiPort = process.env.OTTER_E2E_API_PORT ?? "17464";

export default defineConfig({
  expect: { timeout: 8_000 },
  fullyParallel: false,
  reporter: "line",
  retries: process.env.CI ? 1 : 0,
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://127.0.0.1:${webPort}`,
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
        PORT: apiPort,
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      url: `http://127.0.0.1:${apiPort}/api/config`,
    },
    {
      command: `npm run dev --workspace @narumitw/otter-web -- --strictPort --port ${webPort}`,
      env: { ...process.env, OTTER_API_URL: `http://127.0.0.1:${apiPort}` },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      url: `http://127.0.0.1:${webPort}`,
    },
  ],
});
