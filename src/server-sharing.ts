import crypto from "node:crypto";
import type express from "express";
import type { Pool as PgPool } from "pg";
import {
  asyncHandler,
  currentUser,
  type LoadedTrip,
  loadTripById,
  loadTripForUser,
  makeId,
  nowIso,
  sendError,
  tripPayload,
} from "./server-support.js";
import {
  calculateBalances,
  calculateSettlements,
} from "./shared/settlement.js";

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
  app: express.Express,
  pool: PgPool,
  mustBeSignedIn: express.RequestHandler,
) {
  app.post(
    "/api/trips/:tripId/share-links",
    mustBeSignedIn,
    asyncHandler(async (req, res) => {
      const user = currentUser(res);
      const trip = await loadTripForUser(pool, user.id, req.params.tripId);
      if (!trip) {
        sendError(res, 404, "找不到旅行");
        return;
      }
      if (trip.currentUserRole !== "owner") {
        sendError(res, 403, "只有擁有者可管理分享連結");
        return;
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
      const url = `${req.protocol}://${req.get("host")}/share/${token}`;
      const link = updated.shareLinks?.find((item) => item.id === linkId);
      if (link) {
        link.url = url;
      }
      res.status(201).json(tripPayload(updated));
    }),
  );

  app.delete(
    "/api/trips/:tripId/share-links/:linkId",
    mustBeSignedIn,
    asyncHandler(async (req, res) => {
      const user = currentUser(res);
      const trip = await loadTripForUser(pool, user.id, req.params.tripId);
      if (!trip) {
        sendError(res, 404, "找不到旅行");
        return;
      }
      if (trip.currentUserRole !== "owner") {
        sendError(res, 403, "只有擁有者可管理分享連結");
        return;
      }

      const revoked = await pool.query(
        `UPDATE trip_share_links
         SET revoked_at = $1
         WHERE id = $2 AND trip_id = $3 AND revoked_at IS NULL`,
        [nowIso(), req.params.linkId, trip.id],
      );
      if (revoked.rowCount === 0) {
        sendError(res, 404, "找不到可撤銷的分享連結");
        return;
      }
      const updated = await loadTripForUser(pool, user.id, trip.id);
      if (!updated) {
        throw new Error("Trip disappeared after share link revoke");
      }
      res.json(tripPayload(updated));
    }),
  );

  app.get(
    "/api/share/:token",
    asyncHandler(async (req, res) => {
      const token = req.params.token;
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
        sendError(res, 404, "分享連結無效或已撤銷");
        return;
      }
      const trip = await loadTripById(pool, row.trip_id);
      if (!trip) {
        sendError(res, 404, "分享連結無效或已撤銷");
        return;
      }
      res.json(readonlyTripPayload(trip));
    }),
  );
}

function readonlyTripPayload(trip: LoadedTrip) {
  const calculationTrip = {
    ...trip,
    expenses: trip.expenses.map(
      ({ receiptId: _receiptId, receiptUrl: _receiptUrl, ...expense }) =>
        expense,
    ),
  };
  const {
    collaborators: _collaborators,
    currentUserRole: _currentUserRole,
    ownerId: _ownerId,
    settlementPayments: _settlementPayments,
    shareLinks: _shareLinks,
    ...publicTrip
  } = calculationTrip;
  return {
    balances: calculateBalances(calculationTrip),
    readonly: true,
    settlements: calculateSettlements(calculationTrip),
    trip: publicTrip,
  };
}
