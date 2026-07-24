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
    baseURL: "http://127.0.0.1:3420",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    env: {
      ...process.env,
      DEV_ADMIN_EMAIL: "admin@otter.local",
      DEV_ADMIN_NAME: "Admin",
      DEV_ADMIN_PASSWORD: "admin1234",
      NODE_ENV: "development",
      PORT: "3420",
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: "http://127.0.0.1:3420/api/config",
  },
});
