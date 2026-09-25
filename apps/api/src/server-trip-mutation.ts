import type { ExchangeRateSnapshot } from "@narumitw/otter-contracts";
import type { Context } from "hono";
import type { Pool, PoolClient } from "pg";
import {
  type CapturedExpense,
  captureExpenses,
  ExpenseVersionError,
} from "./server-expense-history.js";
import { ExpenseRateError } from "./server-expense-rates.js";
import type { OtterEnv } from "./server-http.js";
import { apiWritesDisabledMessage, currentUser } from "./server-support.js";

type MutationResult = Response | (() => Promise<Response>);

// All same-trip writers lock the parent first. Nested withTransaction calls reuse
// this client; only this boundary owns commit/rollback (including HTTP errors).
// Return a function to enrich a successful response after commit AND release.
// Capture its data in the transaction; never use this client in that function.
export function tripMutation<Path extends string>(
  pool: Pool,
  handler: (
    context: Context<OtterEnv, Path>,
    client: PoolClient,
  ) => Promise<MutationResult>,
) {
  return async (context: Context<OtterEnv, Path>): Promise<Response> => {
    const client = await pool.connect();
    let result: MutationResult;
    try {
      await client.query("BEGIN");
      const tripId = context.req.param("tripId");
      if (tripId) {
        const access = await client.query<{
          id: string;
          allow_api_writes: boolean;
        }>(
          `SELECT t.id, t.allow_api_writes FROM trips t WHERE t.id = $1 AND EXISTS
           (SELECT 1 FROM trip_members m WHERE m.trip_id = t.id AND m.user_id = $2)
           FOR UPDATE`,
          [tripId, currentUser(context).id],
        );
        if (!access.rowCount) {
          await client.query("ROLLBACK");
          return context.json({ error: "找不到旅行" }, 404);
        }
        if (
          context.req.header("authorization") &&
          access.rows[0].allow_api_writes === false
        ) {
          await client.query("ROLLBACK");
          return context.json({ error: apiWritesDisabledMessage }, 403);
        }
      }
      result = await handler(context, client);
      await client.query(
        typeof result === "function" || result.status < 400
          ? "COMMIT"
          : "ROLLBACK",
      );
    } catch (error) {
      await client.query("ROLLBACK");
      if (error instanceof ExpenseRateError) {
        return context.json({ error: error.message }, 400);
      }
      if (error instanceof ExpenseVersionError) {
        return context.json(
          { error: error.message, code: error.code },
          error.status,
        );
      }
      throw error;
    } finally {
      client.release();
    }
    // Enrichment errors cannot roll back an already committed mutation, and
    // must not execute SQL against the released client in the catch above.
    return typeof result === "function" ? result() : result;
  };
}

// Opt in only when the handler can change expenses, splits, or receipts. Other
// trip writers need the same lock, but do not need a before-expense snapshot.
export function expenseMutation<Path extends string>(
  pool: Pool,
  handler: (
    context: Context<OtterEnv, Path>,
    client: PoolClient,
    before: CapturedExpense[],
    candidate: ExchangeRateSnapshot | null,
  ) => Promise<MutationResult>,
  prefetch?: () => Promise<ExchangeRateSnapshot>,
) {
  return async (context: Context<OtterEnv, Path>): Promise<Response> => {
    // Network I/O must finish before tripMutation takes the parent row lock.
    const candidate = prefetch ? await prefetch().catch(() => null) : null;
    return tripMutation<Path>(pool, async (context, client) => {
      const tripId = context.req.param("tripId");
      if (!tripId) throw new Error("Expense mutation requires a trip ID");
      return handler(
        context,
        client,
        await captureExpenses(client, tripId),
        candidate,
      );
    })(context);
  };
}
