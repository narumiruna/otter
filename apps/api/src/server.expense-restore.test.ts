import assert from "node:assert/strict";
import {
  parseExpenseHistoryPage,
  type TripPayload,
} from "@narumitw/otter-contracts";
import { expect, test } from "vitest";
import { createSession } from "./server-support.js";
import { api, postgresTestOptions, withTestApp } from "./server-test-utils.js";

async function setup() {
  const { baseUrl, pool } = await withTestApp();
  for (const name of ["owner", "editor", "outsider"]) {
    await pool.query(
      "INSERT INTO users (id, name, username, password_hash) VALUES ($1,$1,$1,'unused')",
      [name],
    );
  }
  const cookies = Object.fromEntries(
    await Promise.all(
      ["owner", "editor", "outsider"].map(async (name) => [
        name,
        `otter_session=${(await createSession(pool, name)).id}`,
      ]),
    ),
  );
  const trip = await api<TripPayload>(baseUrl, "/api/trips", {
    method: "POST",
    headers: { cookie: cookies.owner },
    body: JSON.stringify({ name: "Restore", baseCurrency: "TWD" }),
  });
  const tripId = trip.data.trip.id;
  const person = trip.data.trip.participants[0].id;
  const path = `/api/trips/${tripId}`;
  await pool.query(
    "INSERT INTO trip_members (id,trip_id,user_id,role) VALUES ('editor-member',$1,'editor','editor')",
    [tripId],
  );
  const created = await api<TripPayload>(baseUrl, `${path}/expenses`, {
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
  const expense = created.data.trip.expenses[0];
  const url = `${path}/expenses/${expense.id}`;
  const history = async () => {
    const result = await api(
      baseUrl,
      `${path}/expense-history?expenseId=${expense.id}`,
      {
        headers: { cookie: cookies.owner },
      },
    );
    return parseExpenseHistoryPage(result.data).revisions;
  };
  const restore = (
    revisionId: unknown,
    version: string | undefined,
    cookie = cookies.owner,
    urlOverride = url,
  ) =>
    api<TripPayload & { code?: string; error?: string }>(
      baseUrl,
      `${urlOverride}/restore`,
      {
        method: "POST",
        headers: {
          cookie,
          ...(version === undefined ? {} : { "If-Match": version }),
        },
        body: JSON.stringify({ revisionId }),
      },
    );
  return {
    baseUrl,
    pool,
    cookies,
    tripId,
    path,
    person,
    expense,
    url,
    history,
    restore,
  };
}

test(
  "restore live expense preserves receipt and payments and recalculates balances",
  postgresTestOptions,
  async () => {
    const s = await setup();
    const other = await api<TripPayload>(s.baseUrl, `${s.path}/participants`, {
      method: "POST",
      headers: { cookie: s.cookies.owner },
      body: JSON.stringify({ name: "Other" }),
    });
    const otherId = other.data.trip.participants.find(
      (p) => p.name === "Other",
    )?.id;
    assert.ok(otherId);
    const edited = await api<TripPayload>(s.baseUrl, s.url, {
      method: "PATCH",
      headers: { cookie: s.cookies.owner, "If-Match": '"1"' },
      body: JSON.stringify({
        amount: "150",
        participantIds: [otherId, s.person],
        splitMode: "amount",
        splitValues: { [otherId]: "50", [s.person]: "100" },
      }),
    });
    expect(edited.data.trip.expenses[0].participantShares).toEqual([
      { participantId: otherId, shareMinor: 50 },
      { participantId: s.person, shareMinor: 100 },
    ]);
    const paid = await api<TripPayload>(
      s.baseUrl,
      `${s.path}/settlement-payments`,
      {
        method: "POST",
        headers: { cookie: s.cookies.owner },
        body: JSON.stringify({
          fromId: otherId,
          toId: s.person,
          amount: "10",
          currency: "TWD",
        }),
      },
    );
    expect(paid.response.status).toBe(201);
    const upload = await fetch(`${s.baseUrl}${s.url}/receipt`, {
      method: "PUT",
      headers: {
        cookie: s.cookies.owner,
        "Content-Type": "image/png",
        "If-Match": '"2"',
      },
      body: new Uint8Array([1, 2]),
    });
    expect(upload.status).toBe(201);
    const revisions = await s.history();
    const before = await api<TripPayload>(s.baseUrl, s.path, {
      headers: { cookie: s.cookies.owner },
    });
    const restored = await s.restore(
      revisions.at(-1)?.id,
      '"3"',
      s.cookies.editor,
    );
    expect(restored.response.status).toBe(200);
    expect(restored.data.trip.expenses[0]).toMatchObject({
      id: s.expense.id,
      createdAt: s.expense.createdAt,
      version: 4,
      description: "Dinner",
      amountMinor: 100,
      participantIds: [s.person],
      receiptId: before.data.trip.expenses[0].receiptId,
    });
    expect(restored.data.trip.expenses[0].participantShares).toBeUndefined();
    expect(restored.data.trip.settlementPayments).toEqual(
      paid.data.trip.settlementPayments,
    );
    expect(restored.data.balances).not.toEqual(before.data.balances);
    expect((await s.history())[0]).toMatchObject({
      version: 4,
      action: "updated",
      source: "version_restore",
      actor: { id: "editor" },
    });
    const identical = await s.restore(revisions.at(-1)?.id, '"4"');
    expect(identical.data.trip.expenses[0].version).toBe(4);
    expect(await s.history()).toHaveLength(4);
    const explicit = await s.restore(revisions[1].id, '"4"');
    expect(explicit.data.trip.expenses[0].participantShares).toEqual(
      edited.data.trip.expenses[0].participantShares,
    );
    expect(explicit.data.trip.expenses[0].version).toBe(5);
    const equal = await api<TripPayload>(s.baseUrl, s.url, {
      method: "PATCH",
      headers: { cookie: s.cookies.owner, "If-Match": '"5"' },
      body: JSON.stringify({
        participantIds: [s.person, otherId],
        splitMode: "equal",
      }),
    });
    expect(equal.data.trip.expenses[0].participantShares).toBeUndefined();
    const equalRevision = (await s.history())[0];
    const explicitAgain = await s.restore(revisions[1].id, '"6"');
    expect(explicitAgain.data.trip.expenses[0].version).toBe(7);
    const equalAgain = await s.restore(equalRevision.id, '"7"');
    expect(equalAgain.data.trip.expenses[0]).toMatchObject({
      version: 8,
      participantIds: [s.person, otherId],
    });
    expect(equalAgain.data.trip.expenses[0].participantShares).toBeUndefined();
  },
);

test(
  "undelete keeps the expense ID and advances version without recovering receipt",
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
      body: new Uint8Array([1]),
    });
    expect(upload.status).toBe(201);
    const deleted = await api<TripPayload>(s.baseUrl, s.url, {
      method: "DELETE",
      headers: { cookie: s.cookies.owner, "If-Match": '"2"' },
    });
    expect(deleted.data.trip.expenses).toEqual([]);
    const revisions = await s.history();
    expect(revisions[0].action).toBe("deleted");
    expect(revisions[0].version).toBe(3);
    await s.pool.query(
      "UPDATE expense_revisions SET recorded_at = '2026-09-21T00:00:00Z' WHERE trip_id = $1",
      [s.tripId],
    );
    const filtered = await api(
      s.baseUrl,
      `${s.path}/expense-history?expenseId=${s.expense.id}&limit=1`,
      { headers: { cookie: s.cookies.owner } },
    );
    expect(parseExpenseHistoryPage(filtered.data).latestRevision).toEqual({
      version: 3,
      action: "deleted",
    });
    expect((await s.restore(revisions[1].id, '"2"')).response.status).toBe(412);
    const restored = await s.restore(revisions[1].id, '"3"');
    expect(restored.response.status).toBe(200);
    expect(restored.data.trip.expenses[0]).toMatchObject({
      id: s.expense.id,
      createdAt: s.expense.createdAt,
      version: 4,
    });
    expect(restored.data.trip.expenses[0].receiptId).toBeUndefined();
    expect((await s.history())[0]).toMatchObject({
      action: "restored",
      source: "version_restore",
      version: 4,
    });
    expect(
      (
        await s.pool.query(
          "SELECT count(*)::int AS count FROM expense_revisions WHERE trip_id = $1",
          [s.tripId],
        )
      ).rows[0].count,
    ).toBe(4);
    expect((await s.restore(revisions[0].id, '"3"')).response.status).toBe(412);
  },
);

test(
  "restore rejects bad target, stale version, missing participants, unauthorized and archived writes",
  postgresTestOptions,
  async () => {
    const s = await setup();
    const initial = (await s.history())[0];
    expect((await s.restore(initial.id, undefined)).response.status).toBe(428);
    expect((await s.restore(initial.id, "* ")).response.status).toBe(400);
    expect((await s.restore("not-found", '"1"')).response.status).toBe(404);
    expect((await s.restore(123, '"1"')).response.status).toBe(400);
    expect(
      (await s.restore(initial.id, '"1"', s.cookies.outsider)).response.status,
    ).toBe(404);
    expect(
      (
        await api(s.baseUrl, `${s.url}/restore`, {
          method: "POST",
          body: JSON.stringify({ revisionId: initial.id }),
          headers: { "If-Match": '"1"' },
        })
      ).response.status,
    ).toBe(401);
    const second = await api<TripPayload>(s.baseUrl, "/api/trips", {
      method: "POST",
      headers: { cookie: s.cookies.owner },
      body: JSON.stringify({ name: "Another", baseCurrency: "TWD" }),
    });
    expect(
      (
        await s.restore(
          initial.id,
          '"1"',
          s.cookies.owner,
          `/api/trips/${second.data.trip.id}/expenses/${s.expense.id}`,
        )
      ).response.status,
    ).toBe(404);
    const changed = await api<TripPayload>(s.baseUrl, s.url, {
      method: "PATCH",
      headers: { cookie: s.cookies.owner, "If-Match": '"1"' },
      body: JSON.stringify({ amount: "200" }),
    });
    expect(changed.data.trip.expenses[0].version).toBe(2);
    expect((await s.restore(initial.id, '"1"')).response.status).toBe(412);
    await api(s.baseUrl, s.path, {
      method: "PATCH",
      headers: { cookie: s.cookies.owner },
      body: JSON.stringify({ archived: true }),
    });
    expect((await s.restore(initial.id, '"2"')).response.status).toBe(409);
    expect(await s.history()).toHaveLength(2);
  },
);

test(
  "undelete rejects a removed participant and revision insertion failure rolls back updates",
  postgresTestOptions,
  async () => {
    const s = await setup();
    const initial = (await s.history())[0];
    await s.pool.query(`CREATE FUNCTION fail_restore_revision() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.source = 'version_restore' THEN RAISE EXCEPTION 'failed restore'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER fail_restore_revision BEFORE INSERT ON expense_revisions FOR EACH ROW EXECUTE FUNCTION fail_restore_revision()`);
    const updated = await api<TripPayload>(s.baseUrl, s.url, {
      method: "PATCH",
      headers: { cookie: s.cookies.owner, "If-Match": '"1"' },
      body: JSON.stringify({ amount: "200" }),
    });
    expect(updated.response.status).toBe(200);
    expect((await s.restore(initial.id, '"2"')).response.status).toBe(500);
    const afterFailed = await api<TripPayload>(s.baseUrl, s.path, {
      headers: { cookie: s.cookies.owner },
    });
    expect(afterFailed.data.trip.expenses[0]).toMatchObject({
      version: 2,
      amountMinor: 200,
    });
    expect(await s.history()).toHaveLength(2);
    await s.pool.query(
      "DROP TRIGGER fail_restore_revision ON expense_revisions",
    );
    await api(s.baseUrl, s.url, {
      method: "DELETE",
      headers: { cookie: s.cookies.owner, "If-Match": '"2"' },
    });
    await s.pool.query(
      `CREATE TRIGGER fail_restore_revision BEFORE INSERT ON expense_revisions FOR EACH ROW EXECUTE FUNCTION fail_restore_revision()`,
    );
    expect((await s.restore(initial.id, '"3"')).response.status).toBe(500);
    expect(
      (
        await s.pool.query("SELECT id FROM expenses WHERE id = $1", [
          s.expense.id,
        ])
      ).rowCount,
    ).toBe(0);
    expect((await s.history())[0]).toMatchObject({
      action: "deleted",
      version: 3,
    });
    await s.pool.query(
      "DROP TRIGGER fail_restore_revision ON expense_revisions",
    );
    await s.pool.query("DROP FUNCTION fail_restore_revision()");
    await s.pool.query("DELETE FROM participants WHERE id = $1", [s.person]);
    const removed = await s.restore(initial.id, '"3"');
    expect(removed.response.status).toBe(409);
    expect(removed.data.error).toMatch(/參與者/);
    expect((await s.history())[0].action).toBe("deleted");
  },
);

test(
  "concurrent restores serialize on the trip and reject a stale second request",
  postgresTestOptions,
  async () => {
    const s = await setup();
    const initial = (await s.history())[0];
    await api(s.baseUrl, s.url, {
      method: "PATCH",
      headers: { cookie: s.cookies.owner, "If-Match": '"1"' },
      body: JSON.stringify({ amount: "200" }),
    });
    const [first, second] = await Promise.all([
      s.restore(initial.id, '"2"', s.cookies.owner),
      s.restore(initial.id, '"2"', s.cookies.editor),
    ]);
    expect([first.response.status, second.response.status].sort()).toEqual([
      200, 412,
    ]);
    expect((await s.history()).map((revision) => revision.version)).toEqual([
      3, 2, 1,
    ]);
    const current = await api<TripPayload>(s.baseUrl, s.path, {
      headers: { cookie: s.cookies.owner },
    });
    expect(current.data.trip.expenses[0]).toMatchObject({
      amountMinor: 100,
      version: 3,
    });
  },
);
