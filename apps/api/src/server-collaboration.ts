import type { Pool as PgPool } from "pg";
import type { OtterApp, OtterMiddleware } from "./server-http.js";
import { parseRequestBody } from "./server-http.js";
import {
  type BuildTripPayload,
  currentUser,
  findUserByUsername,
  loadTripForUser,
  makeId,
  normalizeUsername,
  nowIso,
  requestBody,
  sendError,
  stringField,
} from "./server-support.js";
import { tripMutation } from "./server-trip-mutation.js";

export function registerCollaborationRoutes(
  app: OtterApp,
  pool: PgPool,
  mustHaveBrowserSession: OtterMiddleware,
  buildTripPayload: BuildTripPayload,
) {
  app.post(
    "/api/trips/:tripId/members",
    mustHaveBrowserSession,
    parseRequestBody,
    tripMutation(pool, async (context, pool) => {
      const user = currentUser(context);
      const trip = await loadTripForUser(
        pool,
        user.id,
        context.req.param("tripId"),
      );
      if (!trip) {
        return sendError(context, 404, "找不到旅行");
      }
      if (trip.currentUserRole !== "owner") {
        return sendError(context, 403, "只有擁有者可管理協作者");
      }

      const username = stringField(requestBody(context), "username");
      if (!username) {
        return sendError(context, 400, "請輸入 Username");
      }
      const collaborator = await findUserByUsername(
        pool,
        normalizeUsername(username),
      );
      if (!collaborator) {
        return sendError(context, 404, "找不到這個使用者");
      }
      if (collaborator.id === user.id) {
        return sendError(context, 409, "擁有者已在協作者清單中");
      }
      if (
        (trip.collaborators ?? []).some(
          (member) => member.userId === collaborator.id,
        )
      ) {
        return sendError(context, 409, "這位使用者已是協作者");
      }

      await pool.query(
        `INSERT INTO trip_members (id, trip_id, user_id, role, created_at)
         VALUES ($1, $2, $3, 'editor', $4)`,
        [makeId("member"), trip.id, collaborator.id, nowIso()],
      );
      const updated = await loadTripForUser(pool, user.id, trip.id);
      if (!updated) {
        throw new Error("Trip disappeared after collaborator insert");
      }
      return async () => context.json(await buildTripPayload(updated), 201);
    }),
  );

  app.delete(
    "/api/trips/:tripId/members/:userId",
    mustHaveBrowserSession,
    parseRequestBody,
    tripMutation(pool, async (context, pool) => {
      const user = currentUser(context);
      const trip = await loadTripForUser(
        pool,
        user.id,
        context.req.param("tripId"),
      );
      if (!trip) {
        return sendError(context, 404, "找不到旅行");
      }
      if (trip.currentUserRole !== "owner") {
        return sendError(context, 403, "只有擁有者可管理協作者");
      }
      if (context.req.param("userId") === trip.ownerId) {
        return sendError(context, 400, "不能移除擁有者");
      }

      const removed = await pool.query(
        "DELETE FROM trip_members WHERE trip_id = $1 AND user_id = $2 AND role = 'editor'",
        [trip.id, context.req.param("userId")],
      );
      if (removed.rowCount === 0) {
        return sendError(context, 404, "找不到協作者");
      }
      const updated = await loadTripForUser(pool, user.id, trip.id);
      if (!updated) {
        throw new Error("Trip disappeared after collaborator delete");
      }
      return async () => context.json(await buildTripPayload(updated));
    }),
  );
}
