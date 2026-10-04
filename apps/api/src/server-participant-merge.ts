import type { Pool as PgPool } from "pg";
import { recordExpenseChanges } from "./server-expense-history.js";
import type { OtterApp, OtterMiddleware } from "./server-http.js";
import { parseRequestBody } from "./server-http.js";
import {
  archivedTripResponse,
  type BuildTripPayload,
  currentUser,
  loadTripForUser,
  participantExists,
  requestBody,
  sendError,
  stringField,
} from "./server-support.js";
import { expenseMutation } from "./server-trip-mutation.js";

export function registerParticipantMergeRoute(
  app: OtterApp,
  pool: PgPool,
  mustBeSignedIn: OtterMiddleware,
  buildTripPayload: BuildTripPayload,
) {
  app.post(
    "/api/trips/:tripId/participants/:participantId/merge",
    mustBeSignedIn,
    parseRequestBody,
    expenseMutation(pool, async (context, pool, before) => {
      const user = currentUser(context);
      const trip = await loadTripForUser(
        pool,
        user.id,
        context.req.param("tripId"),
      );
      if (!trip) {
        return sendError(context, 404, "找不到旅行");
      }
      if (trip.archivedAt) {
        return archivedTripResponse(context);
      }
      const sourceId = context.req.param("participantId");
      const targetId = stringField(requestBody(context), "targetParticipantId");
      if (!participantExists(trip, sourceId)) {
        return sendError(context, 404, "找不到參與者");
      }
      if (!targetId || !participantExists(trip, targetId)) {
        return sendError(context, 400, "目標參與者必須是旅行參與者");
      }
      if (sourceId === targetId) {
        return sendError(context, 400, "不能合併同一位參與者");
      }

      await pool.query(
        "UPDATE expenses SET paid_by_id = $3 WHERE trip_id = $1 AND paid_by_id = $2",
        [trip.id, sourceId, targetId],
      );
      await pool.query(
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
      await pool.query(
        `DELETE FROM expense_participants source
           USING expense_participants target
           WHERE source.trip_id = $1
             AND target.trip_id = $1
             AND source.participant_id = $2
             AND target.participant_id = $3
             AND source.expense_id = target.expense_id`,
        [trip.id, sourceId, targetId],
      );
      await pool.query(
        `UPDATE expense_participants
           SET participant_id = $3
           WHERE trip_id = $1 AND participant_id = $2`,
        [trip.id, sourceId, targetId],
      );
      await pool.query(
        `DELETE FROM settlement_payments
           WHERE trip_id = $1
             AND ((from_id = $2 AND to_id = $3) OR (from_id = $3 AND to_id = $2))`,
        [trip.id, sourceId, targetId],
      );
      await pool.query(
        "UPDATE settlement_payments SET from_id = $3 WHERE trip_id = $1 AND from_id = $2",
        [trip.id, sourceId, targetId],
      );
      await pool.query(
        "UPDATE settlement_payments SET to_id = $3 WHERE trip_id = $1 AND to_id = $2",
        [trip.id, sourceId, targetId],
      );
      await pool.query(
        "DELETE FROM settlement_payments WHERE trip_id = $1 AND from_id = to_id",
        [trip.id],
      );
      // Only detach the target when the source has dependents to transfer.
      // Otherwise keep the target's existing settlement representative.
      if (trip.participants.some((person) => person.settledById === sourceId)) {
        // The target may itself be a dependent of the source. Detach it first
        // so the transfer cannot assign the target as its own representative.
        await pool.query(
          "UPDATE participants SET settled_by_id = NULL WHERE trip_id = $1 AND id = $2",
          [trip.id, targetId],
        );
        await pool.query(
          "UPDATE participants SET settled_by_id = $3 WHERE trip_id = $1 AND settled_by_id = $2",
          [trip.id, sourceId, targetId],
        );
      }
      await pool.query(
        "DELETE FROM participants WHERE trip_id = $1 AND id = $2",
        [trip.id, sourceId],
      );

      await recordExpenseChanges(
        pool,
        trip.id,
        before,
        user,
        "participant_merge",
      );
      const updated = await loadTripForUser(pool, user.id, trip.id);
      if (!updated) {
        throw new Error("Trip disappeared after participant merge");
      }
      return async () => context.json(await buildTripPayload(updated));
    }),
  );
}
