import type { Context } from "hono";
import type { Pool, PoolClient } from "pg";
import {
  type CapturedExpense,
  captureExpenses,
  ExpenseVersionError,
} from "./server-expense-history.js";
import type { OtterEnv } from "./server-http.js";
import { currentUser } from "./server-support.js";

// All same-trip writers lock the parent first. Nested withTransaction calls reuse
// this client; only this boundary owns commit/rollback (including HTTP errors).
export function tripMutation<Path extends string>(
  pool: Pool,
  handler: (
    context: Context<OtterEnv, Path>,
    client: PoolClient,
    before: CapturedExpense[],
  ) => Promise<Response>,
) {
  return async (context: Context<OtterEnv, Path>): Promise<Response> => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const tripId = context.req.param("tripId");
      if (tripId) {
        const access = await client.query(
          `SELECT t.id FROM trips t WHERE t.id = $1 AND EXISTS
           (SELECT 1 FROM trip_members m WHERE m.trip_id = t.id AND m.user_id = $2)
           FOR UPDATE`,
          [tripId, currentUser(context).id],
        );
        if (!access.rowCount) {
          await client.query("ROLLBACK");
          return context.json({ error: "找不到旅行" }, 404);
        }
      }
      const before = tripId ? await captureExpenses(client, tripId) : [];
      const response = await handler(context, client, before);
      await client.query(response.status < 400 ? "COMMIT" : "ROLLBACK");
      return response;
    } catch (error) {
      await client.query("ROLLBACK");
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
  };
}
