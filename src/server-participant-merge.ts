import type express from "express";
import type { Pool as PgPool } from "pg";
import {
  asyncHandler,
  currentUser,
  loadTripForUser,
  participantExists,
  requestBody,
  sendError,
  stringField,
  tripPayload,
  withTransaction,
} from "./server-support.js";

export function registerParticipantMergeRoute(
  app: express.Express,
  pool: PgPool,
  mustBeSignedIn: express.RequestHandler,
) {
  app.post(
    "/api/trips/:tripId/participants/:participantId/merge",
    mustBeSignedIn,
    asyncHandler(async (req, res) => {
      const user = currentUser(res);
      const trip = await loadTripForUser(pool, user.id, req.params.tripId);
      if (!trip) {
        sendError(res, 404, "找不到旅行");
        return;
      }
      const sourceId = req.params.participantId;
      const targetId = stringField(requestBody(req), "targetParticipantId");
      if (!participantExists(trip, sourceId)) {
        sendError(res, 404, "找不到參與者");
        return;
      }
      if (!targetId || !participantExists(trip, targetId)) {
        sendError(res, 400, "目標參與者必須是旅行參與者");
        return;
      }
      if (sourceId === targetId) {
        sendError(res, 400, "不能合併同一位參與者");
        return;
      }

      await withTransaction(pool, async (client) => {
        await client.query(
          "UPDATE expenses SET paid_by_id = $3 WHERE trip_id = $1 AND paid_by_id = $2",
          [trip.id, sourceId, targetId],
        );
        await client.query(
          `UPDATE expense_participants target
           SET share_minor = CASE
             WHEN target.share_minor IS NULL OR source.share_minor IS NULL THEN NULL
             ELSE target.share_minor + source.share_minor
           END
           FROM expense_participants source
           WHERE target.trip_id = $1
             AND source.trip_id = $1
             AND source.participant_id = $2
             AND target.participant_id = $3
             AND target.expense_id = source.expense_id`,
          [trip.id, sourceId, targetId],
        );
        await client.query(
          `DELETE FROM expense_participants source
           USING expense_participants target
           WHERE source.trip_id = $1
             AND target.trip_id = $1
             AND source.participant_id = $2
             AND target.participant_id = $3
             AND source.expense_id = target.expense_id`,
          [trip.id, sourceId, targetId],
        );
        await client.query(
          `UPDATE expense_participants
           SET participant_id = $3
           WHERE trip_id = $1 AND participant_id = $2`,
          [trip.id, sourceId, targetId],
        );
        await client.query(
          `DELETE FROM settlement_payments
           WHERE trip_id = $1
             AND ((from_id = $2 AND to_id = $3) OR (from_id = $3 AND to_id = $2))`,
          [trip.id, sourceId, targetId],
        );
        await client.query(
          "UPDATE settlement_payments SET from_id = $3 WHERE trip_id = $1 AND from_id = $2",
          [trip.id, sourceId, targetId],
        );
        await client.query(
          "UPDATE settlement_payments SET to_id = $3 WHERE trip_id = $1 AND to_id = $2",
          [trip.id, sourceId, targetId],
        );
        await client.query(
          "DELETE FROM settlement_payments WHERE trip_id = $1 AND from_id = to_id",
          [trip.id],
        );
        await client.query(
          "DELETE FROM participants WHERE trip_id = $1 AND id = $2",
          [trip.id, sourceId],
        );
      });

      const updated = await loadTripForUser(pool, user.id, trip.id);
      if (!updated) {
        throw new Error("Trip disappeared after participant merge");
      }
      res.json(tripPayload(updated));
    }),
  );
}
