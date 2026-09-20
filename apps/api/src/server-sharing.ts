import crypto from "node:crypto";
import type { Pool as PgPool } from "pg";
import type { OtterApp, OtterMiddleware } from "./server-http.js";
import { parseRequestBody } from "./server-http.js";
import {
  type BuildTripPayload,
  currentUser,
  type LoadedTrip,
  loadTripById,
  loadTripForUser,
  makeId,
  nowIso,
  sendError,
} from "./server-support.js";

export function generateShareToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashShareToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function verifyShareTokenHash(
  token: string,
  storedHash: string,
): boolean {
  const expected = Buffer.from(storedHash, "hex");
  const actual = Buffer.from(hashShareToken(token), "hex");
  return (
    expected.length === actual.length &&
    crypto.timingSafeEqual(expected, actual)
  );
}

export function registerShareRoutes(
  app: OtterApp,
  pool: PgPool,
  mustHaveBrowserSession: OtterMiddleware,
  buildTripPayload: BuildTripPayload,
) {
  app.post(
    "/api/trips/:tripId/share-links",
    mustHaveBrowserSession,
    parseRequestBody,
    async (context) => {
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
        return sendError(context, 403, "只有擁有者可管理分享連結");
      }

      const token = generateShareToken();
      const linkId = makeId("share");
      await pool.query(
        `INSERT INTO trip_share_links (id, trip_id, token_hash, created_at)
         VALUES ($1, $2, $3, $4)`,
        [linkId, trip.id, hashShareToken(token), nowIso()],
      );
      const updated = await loadTripForUser(pool, user.id, trip.id);
      if (!updated) {
        throw new Error("Trip disappeared after share link insert");
      }
      const url = `${new URL(context.req.url).protocol}//${context.req.header("host")}/share/${token}`;
      const link = updated.shareLinks?.find((item) => item.id === linkId);
      if (link) {
        link.url = url;
      }
      return context.json(await buildTripPayload(updated), 201);
    },
  );

  app.delete(
    "/api/trips/:tripId/share-links/:linkId",
    mustHaveBrowserSession,
    parseRequestBody,
    async (context) => {
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
        return sendError(context, 403, "只有擁有者可管理分享連結");
      }

      const revoked = await pool.query(
        `UPDATE trip_share_links
         SET revoked_at = $1
         WHERE id = $2 AND trip_id = $3 AND revoked_at IS NULL`,
        [nowIso(), context.req.param("linkId"), trip.id],
      );
      if (revoked.rowCount === 0) {
        return sendError(context, 404, "找不到可撤銷的分享連結");
      }
      const updated = await loadTripForUser(pool, user.id, trip.id);
      if (!updated) {
        throw new Error("Trip disappeared after share link revoke");
      }
      return context.json(await buildTripPayload(updated));
    },
  );

  app.get("/api/share/:token", parseRequestBody, async (context) => {
    const token = context.req.param("token");
    const tokenHash = hashShareToken(token);
    const result = await pool.query<{
      trip_id: string;
      token_hash: string;
      revoked_at: Date | string | null;
      expires_at: Date | string | null;
    }>(
      `SELECT trip_id, token_hash, revoked_at, expires_at
         FROM trip_share_links
         WHERE token_hash = $1
         LIMIT 1`,
      [tokenHash],
    );
    const row = result.rows[0];
    if (
      !row ||
      row.revoked_at ||
      (row.expires_at && new Date(row.expires_at) <= new Date()) ||
      !verifyShareTokenHash(token, row.token_hash)
    ) {
      return sendError(context, 404, "分享連結無效或已撤銷");
    }
    const trip = await loadTripById(pool, row.trip_id);
    if (!trip) {
      return sendError(context, 404, "分享連結無效或已撤銷");
    }
    return context.json(await readonlyTripPayload(trip, buildTripPayload));
  });
}

async function readonlyTripPayload(
  trip: LoadedTrip,
  buildTripPayload: BuildTripPayload,
) {
  const payload = await buildTripPayload({
    ...trip,
    expenses: trip.expenses.map(
      ({ receiptId: _receiptId, receiptUrl: _receiptUrl, ...expense }) =>
        expense,
    ),
  });
  const {
    collaborators: _collaborators,
    currentUserRole: _currentUserRole,
    shareLinks: _shareLinks,
    trip: calculationTrip,
    ...publicPayload
  } = payload;
  const {
    ownerId: _ownerId,
    settlementPayments: _settlementPayments,
    ...publicTrip
  } = calculationTrip;
  return { ...publicPayload, readonly: true, trip: publicTrip };
}
