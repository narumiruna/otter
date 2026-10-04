import type { Pool as PgPool } from "pg";
import type { OtterApp, OtterMiddleware } from "./server-http.js";
import { parseRequestBody } from "./server-http.js";
import {
  apiWritesDisabledMessage,
  type BuildTripPayload,
  currentUser,
  loadTripForUser,
  lockTripNamesForUser,
  makeId,
  nowIso,
  sendError,
  tripNameExistsForUser,
  withTransaction,
} from "./server-support.js";

export function registerTripCopyRoute(
  app: OtterApp,
  pool: PgPool,
  mustBeSignedIn: OtterMiddleware,
  buildTripPayload: BuildTripPayload,
) {
  app.post(
    "/api/trips/:tripId/copy",
    mustBeSignedIn,
    parseRequestBody,
    async (context) => {
      const user = currentUser(context);
      const tripId = context.req.param("tripId");
      const copiedId: { id: string } | { error: string; status: 403 | 404 } =
        await withTransaction(pool, async (client) => {
          // Match other same-trip writers' lock order; reject guests before
          // taking the owner's name-allocation lock.
          const locked = await client.query<{ allow_api_writes: boolean }>(
            "SELECT allow_api_writes FROM trips WHERE id = $1 FOR UPDATE",
            [tripId],
          );
          if (!locked.rowCount)
            return { error: "找不到旅行", status: 404 } as const;
          const source = await client.query<{
            name: string;
            base_currency: string;
            role: string;
          }>(
            `SELECT trips.name, trips.base_currency, trip_members.role
             FROM trips JOIN trip_members ON trip_members.trip_id = trips.id
             WHERE trips.id = $1 AND trip_members.user_id = $2`,
            [tripId, user.id],
          );
          const template = source.rows[0];
          if (!template) return { error: "找不到旅行", status: 404 } as const;
          if (
            context.req.header("authorization") &&
            !locked.rows[0].allow_api_writes
          ) {
            return { error: apiWritesDisabledMessage, status: 403 } as const;
          }
          if (template.role !== "owner") {
            return { error: "只有擁有者可複製群組", status: 403 } as const;
          }
          await lockTripNamesForUser(client, user.id);
          const participants = await client.query<{ name: string }>(
            `SELECT name FROM participants WHERE trip_id = $1 ORDER BY created_at, id`,
            [tripId],
          );

          let name = "";
          for (let index = 1; ; index += 1) {
            const suffix = ` (copy${index === 1 ? "" : ` ${index}`})`;
            let prefix = "";
            for (const character of template.name) {
              if (prefix.length + character.length > 100 - suffix.length) break;
              prefix += character;
            }
            const candidate = `${prefix.trimEnd()}${suffix}`;
            if (!(await tripNameExistsForUser(client, user.id, candidate))) {
              name = candidate;
              break;
            }
          }

          const id = makeId("trip");
          const createdAt = nowIso();
          await client.query(
            `INSERT INTO trips (id, owner_id, name, base_currency, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
            [id, user.id, name, template.base_currency, createdAt],
          );
          await client.query(
            `INSERT INTO trip_members (id, trip_id, user_id, role, created_at)
           VALUES ($1, $2, $3, 'owner', $4)`,
            [makeId("member"), id, user.id, createdAt],
          );
          for (const [index, person] of participants.rows.entries()) {
            await client.query(
              `INSERT INTO participants (id, trip_id, name, created_at)
             VALUES ($1, $2, $3, $4)`,
              // Reads sort by creation time and ID. Distinct timestamps keep
              // the source order even when generated IDs sort differently.
              [
                makeId("participant"),
                id,
                person.name,
                new Date(Date.parse(createdAt) + index).toISOString(),
              ],
            );
          }
          await client.query(
            `INSERT INTO trip_exchange_rates (trip_id, currency, rate_to_base)
           SELECT $1, currency, rate_to_base FROM trip_exchange_rates WHERE trip_id = $2`,
            [id, tripId],
          );
          return { id } as const;
        });
      if ("error" in copiedId) {
        return sendError(context, copiedId.status, copiedId.error);
      }
      const copied = await loadTripForUser(pool, user.id, copiedId.id);
      if (!copied) throw new Error("Copied trip disappeared");
      return context.json(await buildTripPayload(copied), 201);
    },
  );
}
