import type { Pool as PgPool } from "pg";
import type { OtterApp, OtterMiddleware } from "./server-http.js";
import { parseRequestBody } from "./server-http.js";
import {
  type BuildTripPayload,
  currentUser,
  loadTripForUser,
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
          // Serialize copies by the same owner, and prevent edits/deletion while
          // reading the source and creating the new group.
          await client.query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [
            user.id,
          ]);
          await client.query("SELECT id FROM trips WHERE id = $1 FOR UPDATE", [
            tripId,
          ]);
          const source = await loadTripForUser(client, user.id, tripId);
          if (!source) return { error: "找不到旅行", status: 404 } as const;
          if (source.currentUserRole !== "owner") {
            return { error: "只有擁有者可複製群組", status: 403 } as const;
          }

          let name = "";
          for (let index = 1; ; index += 1) {
            const suffix = ` (copy${index === 1 ? "" : ` ${index}`})`;
            const candidate = `${source.name.slice(0, 100 - suffix.length).trimEnd()}${suffix}`;
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
            [id, user.id, name, source.baseCurrency, createdAt],
          );
          await client.query(
            `INSERT INTO trip_members (id, trip_id, user_id, role, created_at)
           VALUES ($1, $2, $3, 'owner', $4)`,
            [makeId("member"), id, user.id, createdAt],
          );
          for (const [index, person] of source.participants.entries()) {
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
