import assert from "node:assert/strict";
import { test } from "vitest";
import {
  api,
  postgresTestOptions,
  type TripPayload,
  type UserResponse,
  withTestApp,
} from "./server-test-utils.js";

test(
  "signed-in invites and anonymous edit capabilities stay scoped and revocable",
  postgresTestOptions,
  async () => {
    const { baseUrl, pool } = await withTestApp();
    const unique = Date.now();
    async function register(username: string) {
      const result = await api<UserResponse>(baseUrl, "/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          username: `${username}-${unique}`,
          password: "password123",
        }),
      });
      const cookie = result.response.headers.get("set-cookie")?.split(";")[0];
      assert.ok(cookie);
      return cookie;
    }
    const owner = await register("share-owner");
    const editor = await register("share-editor");
    const trip = await api<TripPayload>(baseUrl, "/api/trips", {
      method: "POST",
      headers: { cookie: owner },
      body: JSON.stringify({ name: "Shared trip" }),
    });
    const tripId = trip.data.trip.id;
    const other = await api<TripPayload>(baseUrl, "/api/trips", {
      method: "POST",
      headers: { cookie: owner },
      body: JSON.stringify({ name: "Private trip" }),
    });
    const create = async (mode: string) => {
      const result = await api<TripPayload>(
        baseUrl,
        `/api/trips/${tripId}/share-links`,
        {
          method: "POST",
          headers: { cookie: owner },
          body: JSON.stringify({ mode }),
        },
      );
      assert.equal(result.response.status, 201);
      const link = result.data.shareLinks?.find((item) => item.url);
      assert.ok(link?.url);
      assert.equal(link.mode, mode);
      return {
        token: new URL(link.url).pathname.split("/").pop(),
        id: link.id,
      };
    };
    const invalidMode = await api(baseUrl, `/api/trips/${tripId}/share-links`, {
      method: "POST",
      headers: { cookie: owner },
      body: JSON.stringify({ mode: "owner" }),
    });
    assert.equal(invalidMode.response.status, 400);
    assert.equal(
      (
        await api(baseUrl, `/api/trips/${tripId}/share-links`, {
          method: "POST",
          headers: { cookie: owner },
          body: JSON.stringify({ mode: null }),
        })
      ).response.status,
      400,
    );
    const invite = await create("signed-in-edit");
    const preview = await api<{ mode: string; tripName: string }>(
      baseUrl,
      `/api/share/${invite.token}`,
    );
    assert.deepEqual(preview.data, {
      mode: "signed-in-edit",
      tripName: "Shared trip",
    });
    assert.equal(
      (
        await api(baseUrl, `/api/share/${invite.token}/join`, {
          method: "POST",
        })
      ).response.status,
      401,
    );
    assert.equal(
      (
        await api(baseUrl, `/api/trips/${tripId}`, {
          headers: { cookie: editor },
        })
      ).response.status,
      404,
    );
    const joined = await api<{ tripId: string }>(
      baseUrl,
      `/api/share/${invite.token}/join`,
      {
        method: "POST",
        headers: { cookie: editor },
      },
    );
    assert.equal(joined.data.tripId, tripId);
    assert.equal(
      (
        await api(baseUrl, `/api/share/${invite.token}/join`, {
          method: "POST",
          headers: { cookie: editor },
        })
      ).response.status,
      200,
    );
    assert.equal(
      (
        await api(baseUrl, `/api/trips/${tripId}`, {
          headers: { cookie: editor },
        })
      ).response.status,
      200,
    );
    const anon = await create("anyone-edit");
    const guestHeaders = { "X-Otter-Share-Token": anon.token ?? "" };
    const guestView = await api<TripPayload>(
      baseUrl,
      `/api/share/${anon.token}`,
    );
    assert.equal(guestView.data.shareMode, "anyone-edit");
    assert.equal(guestView.data.currentUserRole, "editor");
    assert.equal(guestView.data.shareLinks, undefined);
    const guestEdit = await api<TripPayload>(
      baseUrl,
      `/api/trips/${tripId}/participants`,
      {
        method: "POST",
        headers: guestHeaders,
        body: JSON.stringify({ name: "Guest added" }),
      },
    );
    assert.equal(guestEdit.response.status, 201);
    assert.ok(
      guestEdit.data.trip.participants.some((p) => p.name === "Guest added"),
    );
    const participantId = guestEdit.data.trip.participants[0]?.id;
    assert.ok(participantId);
    const guestExpense = await api<TripPayload>(
      baseUrl,
      `/api/trips/${tripId}/expenses`,
      {
        method: "POST",
        headers: guestHeaders,
        body: JSON.stringify({
          amount: "120",
          currency: "TWD",
          description: "Guest dinner",
          paidById: participantId,
          participantIds: [participantId],
        }),
      },
    );
    assert.equal(guestExpense.response.status, 201);
    assert.equal(
      guestExpense.data.trip.expenses[0]?.description,
      "Guest dinner",
    );
    const guestTrip = await api<TripPayload>(baseUrl, `/api/trips/${tripId}`, {
      headers: guestHeaders,
    });
    assert.equal(guestTrip.data.collaborators?.length, 0);
    assert.equal(
      (
        await api<{ user: unknown }>(baseUrl, "/api/me", {
          headers: guestHeaders,
        })
      ).data.user,
      null,
    );
    assert.equal(
      (await api(baseUrl, "/api/trips", { headers: guestHeaders })).response
        .status,
      401,
    );
    assert.notEqual(
      (
        await api(baseUrl, `/api/trips/${other.data.trip.id}`, {
          headers: guestHeaders,
        })
      ).response.status,
      200,
    );
    assert.equal(
      (
        await api(baseUrl, `/api/trips/${tripId}/share-links`, {
          method: "POST",
          headers: guestHeaders,
        })
      ).response.status,
      401,
    );
    assert.equal(
      (
        await api(baseUrl, `/api/trips/${tripId}`, {
          method: "PATCH",
          headers: guestHeaders,
          body: JSON.stringify({ name: "Hacked" }),
        })
      ).response.status,
      403,
    );
    assert.equal(
      (
        await api(baseUrl, `/api/trips/${tripId}/members`, {
          method: "POST",
          headers: guestHeaders,
          body: JSON.stringify({ username: "someone" }),
        })
      ).response.status,
      401,
    );
    const listed = await api<TripPayload>(baseUrl, `/api/trips/${tripId}`, {
      headers: { cookie: owner },
    });
    assert.equal(listed.data.collaborators?.length, 2);
    await pool.query(
      "UPDATE trip_share_links SET expires_at = now() - interval '1 second' WHERE id = $1",
      [anon.id],
    );
    assert.equal(
      (await api(baseUrl, `/api/share/${anon.token}`)).response.status,
      404,
    );
    assert.equal(
      (await api(baseUrl, `/api/trips/${tripId}`, { headers: guestHeaders }))
        .response.status,
      401,
    );
    await pool.query(
      "UPDATE trip_share_links SET expires_at = NULL WHERE id = $1",
      [anon.id],
    );
    assert.equal(
      (
        await api(baseUrl, `/api/trips/${tripId}/share-links/${anon.id}`, {
          method: "DELETE",
          headers: { cookie: owner },
        })
      ).response.status,
      200,
    );
    assert.notEqual(
      (
        await api(baseUrl, `/api/trips/${tripId}/participants`, {
          method: "POST",
          headers: guestHeaders,
          body: JSON.stringify({ name: "After revoke" }),
        })
      ).response.status,
      201,
    );
    assert.equal(
      (await api(baseUrl, `/api/share/${anon.token}`)).response.status,
      404,
    );
    const guests = await pool.query(
      "SELECT id FROM users WHERE id LIKE 'guest_%'",
    );
    assert.equal(guests.rows.length, 0);
    await api(baseUrl, `/api/trips/${tripId}/share-links/${invite.id}`, {
      method: "DELETE",
      headers: { cookie: owner },
    });
    assert.equal(
      (
        await api(baseUrl, `/api/share/${invite.token}/join`, {
          method: "POST",
          headers: { cookie: editor },
        })
      ).response.status,
      404,
    );
    // Joining grants lasting membership; revoke affects future joins only.
    assert.equal(
      (
        await api(baseUrl, `/api/trips/${tripId}`, {
          headers: { cookie: editor },
        })
      ).response.status,
      200,
    );
  },
);
