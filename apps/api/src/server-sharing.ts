import crypto from "node:crypto";
import type { ShareMode } from "@narumitw/otter-contracts";
import type { Pool as PgPool, PoolClient } from "pg";
import type { OtterApp, OtterMiddleware } from "./server-http.js";
import { parseRequestBody } from "./server-http.js";
import {
  apiWritesDisabledMessage,
  type BuildTripPayload,
  currentUser,
  type LoadedTrip,
  loadTripById,
  loadTripForUser,
  makeId,
  nowIso,
  requestBody,
  sendError,
  userFromRequest,
  withTransaction,
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

type ShareRow = {
  trip_id: string;
  token_hash: string;
  mode: ShareMode;
  guest_user_id: string | null;
};

async function activeShare(
  pool: PgPool | PoolClient,
  token: string,
): Promise<ShareRow | undefined> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return undefined;
  const result = await pool.query<ShareRow>(
    `SELECT trip_id, token_hash, mode, guest_user_id FROM trip_share_links
     WHERE token_hash = $1 AND revoked_at IS NULL
       AND (expires_at IS NULL OR expires_at > now())`,
    [hashShareToken(token)],
  );
  const row = result.rows[0];
  return row && verifyShareTokenHash(token, row.token_hash) ? row : undefined;
}

// A capability is accepted only on its own trip's API routes. It never
// authenticates /api/me, token creation, backups, or other account endpoints.
export function requireUserOrShare(pool: PgPool): OtterMiddleware {
  return async (context, next) => {
    // The explicit capability takes precedence over a browser session on this
    // trip only; account and owner-only routes still require a real session.
    const tripId = context.req.path.match(
      /^\/api\/trips\/([^/]+)(?:\/|$)/,
    )?.[1];
    const token = context.req.header("X-Otter-Share-Token") ?? "";
    if (!context.req.header("authorization") && tripId && token) {
      const link = await activeShare(pool, token);
      if (
        link?.mode === "anyone-edit" &&
        link.trip_id === tripId &&
        link.guest_user_id
      ) {
        context.set("user", {
          id: link.guest_user_id,
          name: "Link editor",
          username: "",
          passwordHash: null,
          createdAt: "",
        });
        await next();
        return;
      }
      return sendError(context, 401, "分享連結無效或已撤銷");
    }
    const user = await userFromRequest(pool, context.req.raw);
    if (!user) return sendError(context, 401, "請先登入");
    if (
      context.req.header("authorization") &&
      tripId &&
      !["GET", "HEAD", "OPTIONS"].includes(context.req.method)
    ) {
      const access = await pool.query<{ allow_api_writes: boolean }>(
        `SELECT trips.allow_api_writes FROM trips
         JOIN trip_members ON trip_members.trip_id = trips.id
         WHERE trips.id = $1 AND trip_members.user_id = $2`,
        [tripId, user.id],
      );
      if (access.rows[0]?.allow_api_writes === false) {
        return sendError(context, 403, apiWritesDisabledMessage);
      }
    }
    context.set("user", user);
    await next();
  };
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

      const requestedMode = requestBody(context).mode;
      const mode = requestedMode === undefined ? "readonly" : requestedMode;
      if (
        mode !== "readonly" &&
        mode !== "signed-in-edit" &&
        mode !== "anyone-edit"
      ) {
        return sendError(context, 400, "分享連結權限格式錯誤");
      }
      const token = generateShareToken();
      const linkId = makeId("share");
      await withTransaction(pool, async (client) => {
        const guestId = mode === "anyone-edit" ? makeId("guest") : null;
        if (guestId) {
          await client.query(
            `INSERT INTO users (id, name, username, created_at)
             VALUES ($1, 'Link editor', $2, $3)`,
            [guestId, guestId, nowIso()],
          );
          await client.query(
            `INSERT INTO trip_members (id, trip_id, user_id, role, created_at)
             VALUES ($1, $2, $3, 'editor', $4)`,
            [makeId("member"), trip.id, guestId, nowIso()],
          );
        }
        await client.query(
          `INSERT INTO trip_share_links (id, trip_id, token_hash, mode, guest_user_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [linkId, trip.id, hashShareToken(token), mode, guestId, nowIso()],
        );
      });
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

      const revoked = await withTransaction(pool, async (client) => {
        await client.query("SELECT id FROM trips WHERE id = $1 FOR UPDATE", [
          trip.id,
        ]);
        const result = await client.query<{ guest_user_id: string | null }>(
          `UPDATE trip_share_links SET revoked_at = $1
           WHERE id = $2 AND trip_id = $3 AND revoked_at IS NULL
           RETURNING guest_user_id`,
          [nowIso(), context.req.param("linkId"), trip.id],
        );
        const guestId = result.rows[0]?.guest_user_id;
        if (guestId)
          await client.query("DELETE FROM users WHERE id = $1", [guestId]);
        return result.rowCount;
      });
      if (revoked === 0) {
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
    const row = await activeShare(pool, context.req.param("token"));
    if (!row) {
      return sendError(context, 404, "分享連結無效或已撤銷");
    }
    const trip = await loadTripById(pool, row.trip_id);
    if (!trip) {
      return sendError(context, 404, "分享連結無效或已撤銷");
    }
    if (row.mode === "signed-in-edit") {
      return context.json({ mode: row.mode, tripName: trip.name });
    }
    if (row.mode === "anyone-edit" && row.guest_user_id) {
      const guestTrip = await loadTripForUser(
        pool,
        row.guest_user_id,
        row.trip_id,
      );
      if (!guestTrip) return sendError(context, 404, "分享連結無效或已撤銷");
      const {
        collaborators: _collaborators,
        shareLinks: _shareLinks,
        ...payload
      } = await buildTripPayload(guestTrip);
      return context.json({ ...payload, shareMode: row.mode });
    }
    return context.json({
      ...(await readonlyTripPayload(trip, buildTripPayload)),
      shareMode: row.mode,
    });
  });

  app.post(
    "/api/share/:token/join",
    mustHaveBrowserSession,
    parseRequestBody,
    async (context) => {
      const user = currentUser(context);
      const tripId = await withTransaction(pool, async (client) => {
        const link = await activeShare(client, context.req.param("token"));
        if (link?.mode !== "signed-in-edit") return undefined;
        await client.query("SELECT id FROM trips WHERE id = $1 FOR UPDATE", [
          link.trip_id,
        ]);
        // Recheck after the trip lock: revocation uses the same lock.
        const active = await activeShare(client, context.req.param("token"));
        if (!active) return undefined;
        await client.query(
          `INSERT INTO trip_members (id, trip_id, user_id, role, created_at)
         VALUES ($1, $2, $3, 'editor', $4)
         ON CONFLICT (trip_id, user_id) DO NOTHING`,
          [makeId("member"), link.trip_id, user.id, nowIso()],
        );
        return link.trip_id;
      });
      if (!tripId) return sendError(context, 404, "分享連結無效或已撤銷");
      return context.json({ tripId });
    },
  );
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
