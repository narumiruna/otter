import type express from "express";
import type { Pool as PgPool } from "pg";
import {
  asyncHandler,
  currentUser,
  findUserByEmail,
  loadTripForUser,
  makeId,
  normalizeEmail,
  nowIso,
  requestBody,
  sendError,
  stringField,
  tripPayload,
} from "./server-support.js";

export function registerCollaborationRoutes(
  app: express.Express,
  pool: PgPool,
  mustBeSignedIn: express.RequestHandler,
) {
  app.post(
    "/api/trips/:tripId/members",
    mustBeSignedIn,
    asyncHandler(async (req, res) => {
      const user = currentUser(res);
      const trip = await loadTripForUser(pool, user.id, req.params.tripId);
      if (!trip) {
        sendError(res, 404, "找不到旅行");
        return;
      }
      if (trip.currentUserRole !== "owner") {
        sendError(res, 403, "只有擁有者可管理協作者");
        return;
      }

      const email = stringField(requestBody(req), "email");
      if (!email?.includes("@")) {
        sendError(res, 400, "請輸入有效 email");
        return;
      }
      const collaborator = await findUserByEmail(pool, normalizeEmail(email));
      if (!collaborator) {
        sendError(res, 404, "找不到這個使用者");
        return;
      }
      if (collaborator.id === user.id) {
        sendError(res, 409, "擁有者已在協作者清單中");
        return;
      }
      if (
        (trip.collaborators ?? []).some(
          (member) => member.userId === collaborator.id,
        )
      ) {
        sendError(res, 409, "這位使用者已是協作者");
        return;
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
      res.status(201).json(tripPayload(updated));
    }),
  );

  app.delete(
    "/api/trips/:tripId/members/:userId",
    mustBeSignedIn,
    asyncHandler(async (req, res) => {
      const user = currentUser(res);
      const trip = await loadTripForUser(pool, user.id, req.params.tripId);
      if (!trip) {
        sendError(res, 404, "找不到旅行");
        return;
      }
      if (trip.currentUserRole !== "owner") {
        sendError(res, 403, "只有擁有者可管理協作者");
        return;
      }
      if (req.params.userId === trip.ownerId) {
        sendError(res, 400, "不能移除擁有者");
        return;
      }

      const removed = await pool.query(
        "DELETE FROM trip_members WHERE trip_id = $1 AND user_id = $2 AND role = 'editor'",
        [trip.id, req.params.userId],
      );
      if (removed.rowCount === 0) {
        sendError(res, 404, "找不到協作者");
        return;
      }
      const updated = await loadTripForUser(pool, user.id, trip.id);
      if (!updated) {
        throw new Error("Trip disappeared after collaborator delete");
      }
      res.json(tripPayload(updated));
    }),
  );
}
