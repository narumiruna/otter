import { defineConfig } from "@playwright/test";
import config from "./playwright.config.js";

// These suites intercept every API request; PostgreSQL and the API server are not needed.
export default defineConfig({
  ...config,
  testMatch: [
    "account-menu.spec.ts",
    "analysis.spec.ts",
    "auth-layout.spec.ts",
    "responsive-interface.spec.ts",
    "expense-footer.spec.ts",
    "expenses-layout.spec.ts",
    "empty-overview.spec.ts",
    "dialog.spec.ts",
    "expense-defaults.spec.ts",
    "member-accounts.spec.ts",
    "browser-defaults.spec.ts",
    "localization.spec.ts",
  ],
  webServer: {
    command: `npm run dev --workspace @narumitw/otter-web -- --strictPort --port ${process.env.OTTER_E2E_WEB_PORT ?? "17463"}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: `http://127.0.0.1:${process.env.OTTER_E2E_WEB_PORT ?? "17463"}`,
  },
});
