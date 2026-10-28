import assert from "node:assert/strict";
import type { ShareMode, TripShareLink } from "@narumitw/otter-contracts";
import { test } from "vitest";
import { createApp } from "./server.js";
import { hashApiSecret } from "./server-api-tokens.js";
import {
  generateShareToken,
  hashShareToken,
  verifyShareTokenHash,
} from "./server-sharing.js";
import {
  api,
  postgresTestOptions,
  type TripPayload,
  type UserResponse,
  withTestApp,
} from "./server-test-utils.js";

type ShareLinksResponse = { shareLinks: TripShareLink[] };

async function recoveryFixture() {
  const { baseUrl, pool } = await withTestApp();
  async function register(username: string) {
    const result = await api<UserResponse>(baseUrl, "/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password: "password123" }),
    });
    assert.equal(result.response.status, 201);
    const cookie = result.response.headers.get("set-cookie")?.split(";")[0];
    assert.ok(cookie);
    assert.ok(result.data.user);
    return { cookie, user: result.data.user };
  }
  const owner = await register("recovery-owner");
  const created = await api<TripPayload>(baseUrl, "/api/trips", {
    method: "POST",
    headers: { cookie: owner.cookie },
    body: JSON.stringify({ name: "Recoverable links", baseCurrency: "TWD" }),
  });
  assert.equal(created.response.status, 201);
  const tripPath = `/api/trips/${created.data.trip.id}`;
  const linksPath = `${tripPath}/share-links`;
  async function createLink(mode: ShareMode = "readonly") {
    const result = await api<TripPayload>(baseUrl, linksPath, {
      method: "POST",
      headers: { cookie: owner.cookie },
      body: JSON.stringify({ mode }),
    });
    assert.equal(result.response.status, 201);
    assert.equal(
      result.response.headers.get("cache-control"),
      "private, no-store",
    );
    const linksWithUrls = result.data.shareLinks?.filter((link) => link.url);
    assert.equal(linksWithUrls?.length, 1);
    const link = linksWithUrls?.[0];
    assert.ok(link?.url);
    assert.equal(link.mode, mode);
    const url = new URL(link.url);
    assert.equal(url.origin, baseUrl);
    const token = url.pathname.slice("/share/".length);
    assert.match(token, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(JSON.stringify(result.data).includes('"token"'), false);
    assert.equal(JSON.stringify(result.data).includes("token_hash"), false);
    return { ...link, url: link.url, token };
  }
  async function listLinks() {
    const result = await api<ShareLinksResponse>(baseUrl, linksPath, {
      headers: { cookie: owner.cookie },
    });
    assert.equal(result.response.status, 200);
    assert.equal(
      result.response.headers.get("cache-control"),
      "private, no-store",
    );
    assert.deepEqual(Object.keys(result.data), ["shareLinks"]);
    return result.data;
  }
  return {
    baseUrl,
    pool,
    owner,
    tripPath,
    linksPath,
    register,
    createLink,
    listLinks,
  };
}

test(
  "owners recover all share modes after reload and repeated reads without changing tokens",
  postgresTestOptions,
  async () => {
    const fixture = await recoveryFixture();
    const { baseUrl, pool, owner, linksPath, createLink, listLinks } = fixture;
    assert.deepEqual(await listLinks(), { shareLinks: [] });
    const readonly = await createLink();
    const invite = await createLink("signed-in-edit");
    const first = await listLinks();
    assert.equal(first.shareLinks.length, 2);
    for (const link of [readonly, invite]) {
      assert.equal(
        first.shareLinks.find(({ id }) => id === link.id)?.url,
        link.url,
      );
    }
    assert.deepEqual(await listLinks(), first);

    const guest = await createLink("anyone-edit");
    const all = await listLinks();
    assert.equal(all.shareLinks.length, 3);
    for (const link of [readonly, invite, guest]) {
      const recovered = all.shareLinks.find(({ id }) => id === link.id);
      const { token: _token, ...metadata } = link;
      assert.deepEqual(recovered, metadata);
      const stored = await pool.query<{ token: string; token_hash: string }>(
        "SELECT token, token_hash FROM trip_share_links WHERE id = $1",
        [link.id],
      );
      assert.equal(stored.rows[0]?.token, link.token);
      assert.equal(stored.rows[0]?.token_hash, hashShareToken(link.token));
      assert.ok(verifyShareTokenHash(link.token, stored.rows[0].token_hash));
      assert.equal(
        verifyShareTokenHash(generateShareToken(), stored.rows[0].token_hash),
        false,
      );
      assert.equal(
        (await api(baseUrl, `/api/share/${link.token}`)).response.status,
        200,
      );
    }
    assert.deepEqual(await listLinks(), all);

    // A new app instance has no create-response or browser state to recover from.
    const restarted = createApp(pool);
    const reloaded = await restarted.request(`${baseUrl}${linksPath}`, {
      headers: { cookie: owner.cookie, host: new URL(baseUrl).host },
    });
    assert.equal(reloaded.status, 200);
    assert.equal(reloaded.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(await reloaded.json(), all);

    // Verification must still use the hash, not the recoverable token column.
    await pool.query(
      "UPDATE trip_share_links SET token_hash = $1 WHERE id = $2",
      [hashShareToken(generateShareToken()), readonly.id],
    );
    assert.equal(
      (await api(baseUrl, `/api/share/${readonly.token}`)).response.status,
      404,
    );
    await pool.query(
      "UPDATE trip_share_links SET token_hash = $1 WHERE id = $2",
      [hashShareToken(readonly.token), readonly.id],
    );
    assert.equal(
      (await api(baseUrl, `/api/share/${readonly.token}`)).response.status,
      200,
    );
    for (const invalid of ["short", "!".repeat(43), "a".repeat(44)]) {
      await assert.rejects(
        pool.query("UPDATE trip_share_links SET token = $1 WHERE id = $2", [
          invalid,
          readonly.id,
        ]),
        { code: "23514", constraint: "trip_share_links_token_format" },
      );
    }
    assert.deepEqual(await listLinks(), all);
  },
);

test(
  "legacy, expired, and revoked links keep metadata without recoverable URLs",
  postgresTestOptions,
  async () => {
    const { baseUrl, pool, owner, linksPath, createLink, listLinks } =
      await recoveryFixture();
    const legacy = await createLink();
    const expired = await createLink("signed-in-edit");
    const revoked = await createLink("anyone-edit");
    const active = await createLink();
    await pool.query("UPDATE trip_share_links SET token = NULL WHERE id = $1", [
      legacy.id,
    ]);
    const expiresAt = "2000-01-01T00:00:00.000Z";
    await pool.query(
      "UPDATE trip_share_links SET expires_at = $1 WHERE id = $2",
      [expiresAt, expired.id],
    );
    const beforeRevoke = await pool.query<{ guest_user_id: string }>(
      "SELECT guest_user_id FROM trip_share_links WHERE id = $1",
      [revoked.id],
    );
    const guestId = beforeRevoke.rows[0]?.guest_user_id;
    assert.ok(guestId);
    const result = await api<TripPayload>(
      baseUrl,
      `${linksPath}/${revoked.id}`,
      {
        method: "DELETE",
        headers: { cookie: owner.cookie },
      },
    );
    assert.equal(result.response.status, 200);
    assert.equal(
      result.data.shareLinks?.some((link) => link.url),
      false,
    );
    for (const link of [legacy, expired, revoked, active]) {
      assert.equal(JSON.stringify(result.data).includes(link.token), false);
    }
    const stored = await pool.query<{
      token: string | null;
      token_hash: string;
      revoked_at: Date;
      guest_user_id: string | null;
    }>(
      "SELECT token, token_hash, revoked_at, guest_user_id FROM trip_share_links WHERE id = $1",
      [revoked.id],
    );
    assert.equal(stored.rows[0]?.token, null);
    assert.equal(stored.rows[0]?.token_hash, hashShareToken(revoked.token));
    assert.ok(stored.rows[0]?.revoked_at);
    assert.equal(stored.rows[0]?.guest_user_id, null);
    assert.equal(
      (await pool.query("SELECT id FROM users WHERE id = $1", [guestId]))
        .rowCount,
      0,
    );

    const listed = await listLinks();
    assert.equal(listed.shareLinks.length, 4);
    for (const link of [legacy, expired, revoked]) {
      const metadata = listed.shareLinks.find(({ id }) => id === link.id);
      assert.ok(metadata);
      assert.equal(Object.hasOwn(metadata, "url"), false);
      assert.equal(metadata.mode, link.mode);
      assert.equal(metadata.createdAt, link.createdAt);
    }
    assert.equal(
      listed.shareLinks.find(({ id }) => id === expired.id)?.expiresAt,
      expiresAt,
    );
    assert.equal(
      listed.shareLinks.find(({ id }) => id === revoked.id)?.revokedAt,
      stored.rows[0].revoked_at.toISOString(),
    );
    assert.equal(
      listed.shareLinks.find(({ id }) => id === active.id)?.url,
      active.url,
    );
    assert.deepEqual(await listLinks(), listed);
    assert.equal(
      (await api(baseUrl, `/api/share/${legacy.token}`)).response.status,
      200,
    );
    for (const link of [expired, revoked]) {
      assert.equal(
        (await api(baseUrl, `/api/share/${link.token}`)).response.status,
        404,
      );
    }
    // Expiration hides recovery without deleting metadata or the stored token.
    assert.equal(
      (
        await pool.query<{ token: string }>(
          "SELECT token FROM trip_share_links WHERE id = $1",
          [expired.id],
        )
      ).rows[0]?.token,
      expired.token,
    );
    assert.equal(
      (
        await api(baseUrl, `${linksPath}/${revoked.id}`, {
          method: "DELETE",
          headers: { cookie: owner.cookie },
        })
      ).response.status,
      404,
    );
  },
);

test(
  "recovery is browser-owner only and generic, public, guest, Bearer, and export reads never leak tokens",
  postgresTestOptions,
  async () => {
    const { baseUrl, pool, owner, tripPath, linksPath, register, createLink } =
      await recoveryFixture();
    const links = [
      await createLink(),
      await createLink("signed-in-edit"),
      await createLink("anyone-edit"),
    ];
    const invite = links[1];
    const guest = links[2];
    assert.ok(invite && guest);
    const editor = await register("recovery-editor");
    assert.equal(
      (
        await api(baseUrl, `/api/share/${invite.token}/join`, {
          method: "POST",
          headers: { cookie: editor.cookie },
        })
      ).response.status,
      200,
    );
    const other = await register("recovery-other-owner");
    assert.equal(
      (
        await api(baseUrl, "/api/trips", {
          method: "POST",
          headers: { cookie: other.cookie },
          body: JSON.stringify({ name: "Unrelated trip" }),
        })
      ).response.status,
      201,
    );
    const bearerToken = "otter_api_recovery_owner";
    await pool.query(
      `INSERT INTO api_tokens (id, user_id, token_hash, name, created_at, expires_at)
       VALUES ('recovery-owner-token', $1, $2, 'Recovery boundary', now(), now() + interval '1 day')`,
      [owner.user.id, hashApiSecret(bearerToken)],
    );
    const bearerHeaders = { authorization: `Bearer ${bearerToken}` };
    const guestHeaders = { "X-Otter-Share-Token": guest.token };
    const attempts: { headers: Record<string, string>; status: number }[] = [
      { headers: {}, status: 401 },
      { headers: bearerHeaders, status: 401 },
      { headers: { cookie: editor.cookie }, status: 403 },
      { headers: { cookie: other.cookie }, status: 404 },
      { headers: guestHeaders, status: 401 },
      { headers: { cookie: owner.cookie, ...bearerHeaders }, status: 401 },
      { headers: { cookie: owner.cookie, ...guestHeaders }, status: 401 },
      { headers: { cookie: owner.cookie, authorization: "" }, status: 401 },
      {
        headers: { cookie: owner.cookie, "X-Otter-Share-Token": "" },
        status: 401,
      },
    ];
    for (const { headers, status } of attempts) {
      const result = await api(baseUrl, linksPath, { headers });
      assert.equal(result.response.status, status);
      for (const link of links)
        assert.equal(JSON.stringify(result.data).includes(link.token), false);
    }

    const reads = [
      { path: tripPath, headers: { cookie: owner.cookie } },
      { path: tripPath, headers: bearerHeaders },
      { path: tripPath, headers: { cookie: editor.cookie } },
      { path: tripPath, headers: guestHeaders },
      { path: "/api/trips", headers: { cookie: owner.cookie } },
      { path: "/api/trips", headers: bearerHeaders },
      { path: `${tripPath}/backup`, headers: { cookie: owner.cookie } },
      { path: `${tripPath}/backup`, headers: bearerHeaders },
      ...links.map((link) => ({
        path: `/api/share/${link.token}`,
        headers: {},
      })),
    ];
    for (const { path, headers } of reads) {
      const result = await api(baseUrl, path, { headers });
      assert.equal(result.response.status, 200, path);
      const json = JSON.stringify(result.data);
      for (const link of links) {
        assert.equal(json.includes(link.token), false, path);
        assert.equal(json.includes(hashShareToken(link.token)), false, path);
        assert.equal(json.includes(link.url), false, path);
      }
      assert.equal(json.includes('"token"'), false, path);
      assert.equal(json.includes("token_hash"), false, path);
    }
  },
);
