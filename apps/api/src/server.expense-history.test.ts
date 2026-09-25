import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import {
  parseExpenseHistoryPage,
  type TripPayload,
} from "@narumitw/otter-contracts";
import { expect, test, vi } from "vitest";
import { hashApiSecret } from "./server-api-tokens.js";
import { createSession } from "./server-support.js";
import { api, postgresTestOptions, withTestApp } from "./server-test-utils.js";

async function setup() {
  const { baseUrl, pool } = await withTestApp();
  const cookies: Record<string, string> = {};
  for (const name of ["owner", "editor", "outsider"]) {
    await pool.query(
      "INSERT INTO users (id, name, username, password_hash) VALUES ($1,$1,$1,'unused')",
      [name],
    );
    cookies[name] = `otter_session=${(await createSession(pool, name)).id}`;
  }
  const created = await api<TripPayload>(baseUrl, "/api/trips", {
    method: "POST",
    headers: { cookie: cookies.owner },
    body: JSON.stringify({ name: "History", baseCurrency: "TWD" }),
  });
  assert.equal(created.response.status, 201);
  const tripId = created.data.trip.id;
  const tripUrl = `/api/trips/${tripId}`;
  const person = created.data.trip.participants[0].id;
  await pool.query(
    "INSERT INTO trip_members (id, trip_id, user_id, role) VALUES ('editor-member', $1, 'editor', 'editor')",
    [tripId],
  );
  const expense = await api<TripPayload>(baseUrl, `${tripUrl}/expenses`, {
    method: "POST",
    headers: { cookie: cookies.owner },
    body: JSON.stringify({
      description: "Dinner",
      amount: "100",
      currency: "TWD",
      paidById: person,
      participantIds: [person],
    }),
  });
  assert.equal(expense.response.status, 201);
  const expenseId = expense.data.trip.expenses[0].id;
  const url = `${tripUrl}/expenses/${expenseId}`;
  const patch = (
    body: Record<string, unknown>,
    version: string | undefined = '"1"',
    cookie = cookies.owner,
  ) =>
    api<TripPayload & { code?: string }>(baseUrl, url, {
      method: "PATCH",
      headers: {
        cookie,
        ...(version === undefined ? {} : { "If-Match": version }),
      },
      body: JSON.stringify(body),
    });
  const history = async (query = "", cookie = cookies.owner) => {
    const result = await api(baseUrl, `${tripUrl}/expense-history${query}`, {
      headers: { cookie },
    });
    assert.equal(result.response.status, 200);
    return parseExpenseHistoryPage(result.data);
  };
  return {
    baseUrl,
    pool,
    cookies,
    tripId,
    tripUrl,
    person,
    expenseId,
    url,
    patch,
    history,
  };
}

test(
  "expense versions, no-op changes, snapshots, pagination and deletion retention",
  postgresTestOptions,
  async () => {
    const s = await setup();
    const initial = (await s.history()).revisions[0];
    expect(initial).toMatchObject({
      version: 1,
      action: "created",
      source: "expense",
      actor: { id: "owner", name: "owner" },
    });
    expect(initial.snapshot.expense.amountMinor).toBe(100);
    const missing = await api(s.baseUrl, s.url, {
      method: "PATCH",
      headers: { cookie: s.cookies.owner },
      body: JSON.stringify({ amount: "200" }),
    });
    expect(missing.response.status).toBe(428);
    for (const header of [
      "*",
      'W/"1"',
      '"0"',
      '"1.5"',
      '"9007199254740992"',
      '"1", "2"',
    ]) {
      expect((await s.patch({ amount: "200" }, header)).response.status).toBe(
        400,
      );
    }
    expect((await s.patch({ amount: "-10" })).response.status).toBe(400);
    expect(
      (await s.patch({ amount: "100", description: "Dinner" })).data.trip
        .expenses[0].version,
    ).toBe(1);
    expect((await s.history()).revisions).toHaveLength(1);
    const updated = await s.patch({
      amount: "200",
      description: "Lunch",
      tags: ["food"],
    });
    expect(updated.response.status).toBe(200);
    expect(updated.data.trip.expenses[0].version).toBe(2);
    expect((await s.patch({ description: "stale" })).response.status).toBe(412);
    expect((await s.history()).revisions).toHaveLength(2);
    const page = await s.history("?limit=1");
    expect(page.revisions[0].changedFields).toEqual([
      "description",
      "amountMinor",
      "tags",
    ]);
    expect(page.revisions[0].previousSnapshot?.expense.amountMinor).toBe(100);
    expect(
      (await s.history(`?limit=1&cursor=${page.nextCursor}`)).revisions[0]
        .version,
    ).toBe(1);
    for (const query of [
      "?limit=0",
      "?limit=101",
      "?limit=1.5",
      "?cursor=missing",
      "?cursor=%20",
      "?expenseId=",
    ]) {
      expect(
        (
          await api(s.baseUrl, `${s.tripUrl}/expense-history${query}`, {
            headers: { cookie: s.cookies.owner },
          })
        ).response.status,
      ).toBe(400);
    }
    // Equal timestamps still have a deterministic cursor; previous version does
    // not depend on being adjacent in the returned page.
    await s.pool.query(
      "UPDATE expense_revisions SET recorded_at = '2026-09-21T00:00:00Z'",
    );
    const sameTime = await s.history("?limit=1");
    const rest = await s.history(`?limit=1&cursor=${sameTime.nextCursor}`);
    expect(new Set([sameTime.revisions[0].id, rest.revisions[0].id]).size).toBe(
      2,
    );
    const removed = await api<TripPayload>(s.baseUrl, s.url, {
      method: "DELETE",
      headers: { cookie: s.cookies.owner, "If-Match": '"2"' },
    });
    expect(removed.response.status).toBe(200);
    expect(removed.data.trip.expenses).toEqual([]);
    const deleted = (await s.history(`?expenseId=${s.expenseId}`)).revisions[0];
    expect(deleted).toMatchObject({
      version: 3,
      action: "deleted",
      snapshot: { expense: { amountMinor: 200 } },
    });
    expect((await s.patch({ amount: "400" }, '"3"')).response.status).toBe(404);
    await api(s.baseUrl, s.tripUrl, {
      method: "DELETE",
      headers: { cookie: s.cookies.owner },
    });
    expect(
      (await s.pool.query("SELECT * FROM expense_revisions")).rowCount,
    ).toBe(0);
  },
);

test(
  "history authorization, actor identity, public sharing, archive, and member removal",
  postgresTestOptions,
  async () => {
    const s = await setup();
    expect(
      (
        await s.patch(
          { description: "Editor edit", actor: { id: "forged" } },
          '"1"',
          s.cookies.editor,
        )
      ).response.status,
    ).toBe(200);
    expect((await s.history("", s.cookies.editor)).revisions[0].actor?.id).toBe(
      "editor",
    );
    expect(
      (await api(s.baseUrl, `${s.tripUrl}/expense-history`)).response.status,
    ).toBe(401);
    expect(
      (
        await api(s.baseUrl, `${s.tripUrl}/expense-history`, {
          headers: { cookie: s.cookies.outsider },
        })
      ).response.status,
    ).toBe(404);
    expect(
      (await s.patch({ amount: "500" }, '"2"', s.cookies.outsider)).response
        .status,
    ).toBe(404);
    const shared = await api<TripPayload>(
      s.baseUrl,
      `${s.tripUrl}/share-links`,
      { method: "POST", headers: { cookie: s.cookies.owner } },
    );
    const token = shared.data.shareLinks
      ?.find((link) => link.url)
      ?.url?.split("/")
      .at(-1);
    assert.ok(token);
    const publicPayload = await api(s.baseUrl, `/api/share/${token}`);
    expect(publicPayload.response.status).toBe(200);
    expect(JSON.stringify(publicPayload.data)).not.toContain(
      "previousSnapshot",
    );
    expect(
      (
        await api(s.baseUrl, `${s.tripUrl}/expense-history`, {
          headers: { authorization: `Bearer ${token}` },
        })
      ).response.status,
    ).toBe(401);
    const bearer = "otter_api_history_test";
    await s.pool.query(
      "INSERT INTO api_tokens (id,user_id,token_hash,name,expires_at) VALUES ('history-token','editor',$1,'History',now()+interval '1 day')",
      [hashApiSecret(bearer)],
    );
    const enabled = await api<TripPayload>(s.baseUrl, s.tripUrl, {
      method: "PATCH",
      headers: { cookie: s.cookies.owner },
      body: JSON.stringify({ allowApiWrites: true }),
    });
    expect(enabled.response.status).toBe(200);
    const tokenEdit = await api(s.baseUrl, s.url, {
      method: "PATCH",
      headers: { authorization: `Bearer ${bearer}`, "If-Match": '"2"' },
      body: JSON.stringify({ description: "Bearer edit" }),
    });
    expect(tokenEdit.response.status).toBe(200);
    expect((await s.history()).revisions[0].actor?.id).toBe("editor");
    await api(s.baseUrl, s.tripUrl, {
      method: "PATCH",
      headers: { cookie: s.cookies.owner },
      body: JSON.stringify({ archived: true }),
    });
    expect((await s.history()).revisions).toHaveLength(3);
    expect((await s.patch({ amount: "500" }, '"3"')).response.status).toBe(409);
    await api(s.baseUrl, `${s.tripUrl}/members/editor`, {
      method: "DELETE",
      headers: { cookie: s.cookies.owner },
    });
    expect(
      (
        await api(s.baseUrl, `${s.tripUrl}/expense-history`, {
          headers: { cookie: s.cookies.editor },
        })
      ).response.status,
    ).toBe(404);
  },
);

test(
  "filtered history hides latest version when membership is revoked between reads",
  postgresTestOptions,
  async () => {
    const s = await setup();
    const query = s.pool.query.bind(s.pool);
    let revoked = false;
    const spy = vi
      .spyOn(s.pool, "query")
      .mockImplementation(async (sql, params) => {
        const result = await query(sql, params);
        if (
          sql ===
            "SELECT 1 FROM trip_members WHERE trip_id = $1 AND user_id = $2" &&
          params?.[1] === "editor"
        ) {
          await query(
            "DELETE FROM trip_members WHERE trip_id = $1 AND user_id = $2",
            [s.tripId, "editor"],
          );
          revoked = true;
        }
        return result;
      });
    try {
      const response = await api(
        s.baseUrl,
        `${s.tripUrl}/expense-history?expenseId=${s.expenseId}`,
        { headers: { cookie: s.cookies.editor } },
      );
      expect(revoked).toBe(true);
      expect(response.response.status).toBe(200);
      expect(parseExpenseHistoryPage(response.data)).toMatchObject({
        revisions: [],
        latestRevision: null,
      });
    } finally {
      spy.mockRestore();
    }
    expect(
      (await s.history(`?expenseId=${s.expenseId}`)).latestRevision,
    ).toEqual({ version: 1, action: "created" });
  },
);

test(
  "receipts, merge, import and restore create atomic revisions without altering payments",
  postgresTestOptions,
  async () => {
    const s = await setup();
    const upload = await fetch(`${s.baseUrl}${s.url}/receipt`, {
      method: "PUT",
      headers: {
        cookie: s.cookies.owner,
        "Content-Type": "image/png",
        "If-Match": '"1"',
      },
      body: new Uint8Array([1, 2, 3]),
    });
    expect(upload.status).toBe(201);
    expect((await s.patch({ amount: "300" })).response.status).toBe(412);
    const receiptRevision = (await s.history()).revisions[0];
    expect(receiptRevision.changedFields).toEqual(["receipt"]);
    expect(receiptRevision.snapshot.receipt?.mimeType).toBe("image/png");
    expect(JSON.stringify(receiptRevision)).not.toMatch(/receiptUrl|"data"/);
    const replace = await fetch(`${s.baseUrl}${s.url}/receipt`, {
      method: "PUT",
      headers: {
        cookie: s.cookies.owner,
        "Content-Type": "image/webp",
        "If-Match": '"2"',
      },
      body: new Uint8Array([4]),
    });
    expect(replace.status).toBe(201);
    expect(
      (
        await api(s.baseUrl, `${s.url}/receipt`, {
          method: "DELETE",
          headers: { cookie: s.cookies.owner, "If-Match": '"2"' },
        })
      ).response.status,
    ).toBe(412);
    expect(
      (
        await api(s.baseUrl, `${s.url}/receipt`, {
          method: "DELETE",
          headers: { cookie: s.cookies.owner, "If-Match": '"3"' },
        })
      ).response.status,
    ).toBe(200);
    const personAdded = await api<TripPayload>(
      s.baseUrl,
      `${s.tripUrl}/participants`,
      {
        method: "POST",
        headers: { cookie: s.cookies.owner },
        body: JSON.stringify({ name: "Other" }),
      },
    );
    const other = personAdded.data.trip.participants.find(
      (p) => p.name === "Other",
    );
    assert.ok(other);
    const merged = await api<TripPayload>(
      s.baseUrl,
      `${s.tripUrl}/participants/${s.person}/merge`,
      {
        method: "POST",
        headers: { cookie: s.cookies.owner },
        body: JSON.stringify({ targetParticipantId: other.id }),
      },
    );
    expect(merged.response.status).toBe(200);
    expect(merged.data.trip.expenses[0]).toMatchObject({
      version: 5,
      paidById: other.id,
      participantIds: [other.id],
    });
    expect((await s.history()).revisions[0]).toMatchObject({
      source: "participant_merge",
      previousSnapshot: { participants: [{ id: s.person, name: "owner" }] },
    });
    const imported = await api<TripPayload>(
      s.baseUrl,
      `${s.tripUrl}/expenses/import`,
      {
        method: "POST",
        headers: { cookie: s.cookies.owner },
        body: JSON.stringify({
          csv: "date,description,amount,currency,paid_by,split_participants\n2026-09-21,Taxi,50,TWD,Other,Other",
        }),
      },
    );
    expect(imported.response.status).toBe(201);
    expect(imported.data.trip.expenses).toHaveLength(2);
    expect((await s.history()).revisions[0]).toMatchObject({
      version: 1,
      source: "csv_import",
    });
    const backup = await api(s.baseUrl, `${s.tripUrl}/backup`, {
      headers: { cookie: s.cookies.owner },
    });
    expect(JSON.stringify(backup.data)).not.toContain("expense_revisions");
    const restored = await api<TripPayload>(s.baseUrl, "/api/trips/restore", {
      method: "POST",
      headers: { cookie: s.cookies.owner },
      body: JSON.stringify(backup.data),
    });
    expect(restored.response.status).toBe(201);
    expect(restored.data.trip.expenses.every((e) => e.version === 1)).toBe(
      true,
    );
    const restoredHistory = await api(
      s.baseUrl,
      `/api/trips/${restored.data.trip.id}/expense-history`,
      { headers: { cookie: s.cookies.owner } },
    );
    expect(
      parseExpenseHistoryPage(restoredHistory.data).revisions.every(
        (r) => r.source === "backup_restore" && r.version === 1,
      ),
    ).toBe(true);
    expect(restored.data.trip.settlementPayments).toEqual(
      merged.data.trip.settlementPayments,
    );
  },
);

test(
  "history insertion failure rolls back expense, shares, receipt and version",
  postgresTestOptions,
  async () => {
    const s = await setup();
    await s.pool.query(`CREATE FUNCTION fail_revision() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'revision failure'; END $$;
    CREATE TRIGGER fail_revision BEFORE INSERT ON expense_revisions FOR EACH ROW EXECUTE FUNCTION fail_revision()`);
    expect((await s.patch({ amount: "500" })).response.status).toBe(500);
    const current = await api<TripPayload>(s.baseUrl, s.tripUrl, {
      headers: { cookie: s.cookies.owner },
    });
    expect(current.data.trip.expenses[0]).toMatchObject({
      amountMinor: 100,
      version: 1,
    });
    const receipt = await fetch(`${s.baseUrl}${s.url}/receipt`, {
      method: "PUT",
      headers: {
        cookie: s.cookies.owner,
        "Content-Type": "image/png",
        "If-Match": '"1"',
      },
      body: new Uint8Array([1]),
    });
    expect(receipt.status).toBe(500);
    expect(
      (await s.pool.query("SELECT * FROM receipt_attachments")).rowCount,
    ).toBe(0);
    expect((await s.history()).revisions).toHaveLength(1);
  },
);

test(
  "payload reads pair versions with a complete committed split and receipt snapshot",
  postgresTestOptions,
  async () => {
    const s = await setup();
    const writer = await s.pool.connect();
    try {
      await writer.query("BEGIN");
      await writer.query("SELECT id FROM trips WHERE id = $1 FOR UPDATE", [
        s.tripId,
      ]);
      await writer.query(
        "UPDATE expenses SET amount_minor = 400, version = 2 WHERE id = $1",
        [s.expenseId],
      );
      await writer.query(
        "UPDATE expense_participants SET share_minor = 400 WHERE expense_id = $1",
        [s.expenseId],
      );
      await writer.query(
        "INSERT INTO receipt_attachments (id,trip_id,expense_id,mime_type,data) VALUES ('concurrent-receipt',$1,$2,'image/png',decode('01','hex'))",
        [s.tripId, s.expenseId],
      );
      const old = await api<TripPayload>(s.baseUrl, s.tripUrl, {
        headers: { cookie: s.cookies.owner },
      });
      expect(old.data.trip.expenses[0]).toMatchObject({
        version: 1,
        amountMinor: 100,
      });
      expect(old.data.trip.expenses[0].participantShares).toBeUndefined();
      expect(old.data.trip.expenses[0].receiptId).toBeUndefined();
      await writer.query("COMMIT");
      const next = await api<TripPayload>(s.baseUrl, s.tripUrl, {
        headers: { cookie: s.cookies.owner },
      });
      expect(next.data.trip.expenses[0]).toMatchObject({
        version: 2,
        amountMinor: 400,
        participantShares: [{ participantId: s.person, shareMinor: 400 }],
        receiptId: "concurrent-receipt",
      });
    } finally {
      await writer.query("ROLLBACK");
      writer.release();
    }
  },
);

for (const change of ["archive", "revoke"] as const) {
  test(
    `waiting expense writes recheck ${change} after acquiring the parent lock`,
    postgresTestOptions,
    async () => {
      const s = await setup();
      const writer = await s.pool.connect();
      try {
        await writer.query("BEGIN");
        await writer.query("SELECT id FROM trips WHERE id = $1 FOR UPDATE", [
          s.tripId,
        ]);
        const pending = s.patch(
          { description: "Stale permission" },
          '"1"',
          s.cookies.editor,
        );
        await waitForWaiters(s, 1);
        if (change === "archive")
          await writer.query(
            "UPDATE trips SET archived_at = now() WHERE id = $1",
            [s.tripId],
          );
        else
          await writer.query(
            "DELETE FROM trip_members WHERE trip_id = $1 AND user_id = 'editor'",
            [s.tripId],
          );
        await writer.query("COMMIT");
        expect((await pending).response.status).toBe(
          change === "archive" ? 409 : 404,
        );
        expect((await s.history()).revisions).toHaveLength(1);
      } finally {
        await writer.query("ROLLBACK");
        writer.release();
      }
    },
  );
}

// Wait for actual DB lock waiters, never a timing assumption about requests.
async function waitForWaiters(
  s: Awaited<ReturnType<typeof setup>>,
  count: number,
) {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const result = await s.pool.query<{ count: string }>(
      "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE 'SELECT t.id, t.allow_api_writes FROM trips t%'",
    );
    if (Number(result.rows[0].count) >= count) return;
    await setImmediate();
  }
  throw new Error("Mutation did not reach trip lock");
}
for (const other of ["patch", "delete", "receipt", "merge"] as const) {
  test(
    `concurrent PATCH and ${other} use the trip lock and invalidate stale state`,
    postgresTestOptions,
    async () => {
      const s = await setup();
      const added = await api<TripPayload>(
        s.baseUrl,
        `${s.tripUrl}/participants`,
        {
          method: "POST",
          headers: { cookie: s.cookies.owner },
          body: JSON.stringify({ name: "Other" }),
        },
      );
      const target = added.data.trip.participants.find(
        (p) => p.name === "Other",
      )?.id;
      const lock = await s.pool.connect();
      try {
        await lock.query("BEGIN");
        await lock.query("SELECT id FROM trips WHERE id = $1 FOR UPDATE", [
          s.tripId,
        ]);
        const competing =
          other === "patch"
            ? s.patch({ description: "First" })
            : other === "delete"
              ? api(s.baseUrl, s.url, {
                  method: "DELETE",
                  headers: { cookie: s.cookies.owner, "If-Match": '"1"' },
                })
              : other === "receipt"
                ? fetch(`${s.baseUrl}${s.url}/receipt`, {
                    method: "PUT",
                    headers: {
                      cookie: s.cookies.owner,
                      "Content-Type": "image/png",
                      "If-Match": '"1"',
                    },
                    body: new Uint8Array([1]),
                  }).then((response) => ({ response }))
                : api(
                    s.baseUrl,
                    `${s.tripUrl}/participants/${s.person}/merge`,
                    {
                      method: "POST",
                      headers: { cookie: s.cookies.owner },
                      body: JSON.stringify({ targetParticipantId: target }),
                    },
                  );
        await waitForWaiters(s, 1);
        const stale = s.patch({ amount: "900" });
        await waitForWaiters(s, 2);
        // Another trip can still write while this trip is locked.
        const independent = await api<TripPayload>(s.baseUrl, "/api/trips", {
          method: "POST",
          headers: { cookie: s.cookies.owner },
          body: JSON.stringify({ name: "Independent", baseCurrency: "TWD" }),
        });
        expect(independent.response.status).toBe(201);
        const independentPerson = independent.data.trip.participants[0].id;
        const independentWrite = await api(
          s.baseUrl,
          `/api/trips/${independent.data.trip.id}/expenses`,
          {
            method: "POST",
            headers: { cookie: s.cookies.owner },
            body: JSON.stringify({
              description: "Independent write",
              amount: "10",
              currency: "TWD",
              paidById: independentPerson,
              participantIds: [independentPerson],
            }),
          },
        );
        expect(independentWrite.response.status).toBe(201);
        await lock.query("COMMIT");
        expect((await competing).response.status).toBe(
          other === "receipt" ? 201 : 200,
        );
        expect((await stale).response.status).toBe(
          other === "delete" ? 404 : 412,
        );
        expect((await s.history()).revisions).toHaveLength(2);
        if (other !== "delete") {
          const current = await api<TripPayload>(s.baseUrl, s.tripUrl, {
            headers: { cookie: s.cookies.owner },
          });
          expect(current.data.trip.expenses[0]).toMatchObject({
            amountMinor: 100,
            version: 2,
          });
        }
      } finally {
        await lock.query("ROLLBACK");
        lock.release();
      }
    },
  );
}
