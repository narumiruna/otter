// Browser tests use the real API and PostgreSQL with an injected Visa fixture.
// This command is not an application entry point for deployments.
import { serve } from "@hono/node-server";
import { fixedExchangeRates, isCurrency } from "@narumitw/otter-core/money";
import { createApp } from "../src/server.js";
import {
  developmentAdminCredentials,
  ensureDevelopmentAdmin,
  ensureDevelopmentFixtures,
} from "../src/server-dev.js";
import { createPool } from "../src/server-support.js";
import { runMigrations } from "./migrate.js";

const pool = createPool();
await runMigrations(pool);
const credentials = developmentAdminCredentials(process.env);
if (credentials)
  await ensureDevelopmentFixtures(
    pool,
    await ensureDevelopmentAdmin(pool, credentials),
  );
const app = createApp(pool, {
  devLoginCredentials: credentials,
  exchangeRates: {
    fetchRate: async (q) => {
      if (
        !isCurrency(q.source) ||
        !isCurrency(q.target) ||
        q.date === "1900-01-01"
      )
        throw new Error("Visa fixture unavailable");
      const book = fixedExchangeRates("TWD");
      if (q.date === "2026-07-06") book.JPY = 0.24;
      const rate = book[q.source] / book[q.target];
      return {
        source: q.source,
        target: q.target,
        date: q.date ?? "2026-10-25",
        amount: 1,
        bankFeePercent: 0,
        visaRate: rate,
        rate,
        convertedAmount: rate,
        fetchedAt: "2026-10-25T00:00:00Z",
      };
    },
  },
});
const server = serve(
  {
    fetch: app.fetch,
    hostname: "127.0.0.1",
    port: Number(process.env.PORT ?? 17464),
  },
  () =>
    console.log("E2E API ready; Visa fixtures only, no external rate requests"),
);
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  server.close(() => {
    void pool.end();
  });
  if ("closeIdleConnections" in server) server.closeIdleConnections();
}
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
