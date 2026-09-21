import type { TripBackupV1 } from "@narumitw/otter-core/backup";
import { expect, test, vi } from "vitest";
import {
  api,
  postgresTestOptions,
  type TripPayload,
  withTestApp,
} from "./server-test-utils.js";

test(
  "expense writes preserve ordered splits, restore mapping, and transaction rollback",
  postgresTestOptions,
  async () => {
    const { baseUrl, pool } = await withTestApp();
    const registration = await api(baseUrl, "/api/auth/register", {
      body: JSON.stringify({
        username: "persistence",
        name: "Alice",
        password: "password123",
      }),
      method: "POST",
    });
    const cookie = registration.response.headers
      .get("set-cookie")
      ?.split(";")[0];
    expect(cookie).toBeTruthy();
    const headers = { cookie: cookie ?? "" };
    const created = await api<TripPayload>(baseUrl, "/api/trips", {
      body: JSON.stringify({ name: "Persistence" }),
      headers,
      method: "POST",
    });
    const tripId = created.data.trip.id;
    const alice = created.data.trip.participants[0].id;
    const added = await api<TripPayload>(
      baseUrl,
      `/api/trips/${tripId}/participants`,
      {
        body: JSON.stringify({ name: "Bob" }),
        headers,
        method: "POST",
      },
    );
    const bob = added.data.trip.participants.find(
      (person) => person.name === "Bob",
    )?.id;
    expect(bob).toBeTruthy();
    const draft = {
      amount: "100",
      currency: "TWD",
      description: "Equal",
      expenseDate: "2026-09-20",
      paidById: alice,
      participantIds: [bob, alice],
    };
    const equal = await api<TripPayload>(
      baseUrl,
      `/api/trips/${tripId}/expenses`,
      {
        body: JSON.stringify(draft),
        headers,
        method: "POST",
      },
    );
    expect(equal.response.status).toBe(201);
    const equalExpense = equal.data.trip.expenses[0];
    expect(equalExpense.participantIds).toEqual([bob, alice]);
    expect(equalExpense.participantShares).toBeUndefined();
    const splits = (expenseId: string) =>
      pool.query(
        "SELECT participant_id, position, share_minor FROM expense_participants WHERE expense_id = $1 ORDER BY position",
        [expenseId],
      );
    expect((await splits(equalExpense.id)).rows).toEqual([
      { participant_id: bob, position: 0, share_minor: null },
      { participant_id: alice, position: 1, share_minor: null },
    ]);
    const imported = await api<TripPayload>(
      baseUrl,
      `/api/trips/${tripId}/expenses/import`,
      {
        body: JSON.stringify({
          csv: "date,description,amount,currency,paid_by,split_participants\n2026-09-20,Explicit,100,TWD,Alice,Bob=70; Alice=30",
        }),
        headers,
        method: "POST",
      },
    );
    expect(imported.response.status).toBe(201);
    const explicit = imported.data.trip.expenses.find(
      (expense) => expense.description === "Explicit",
    );
    expect(explicit).toBeDefined();
    if (!explicit) throw new Error("Missing imported expense");
    expect(explicit.participantIds).toEqual([bob, alice]);
    expect(explicit.participantShares).toEqual([
      { participantId: bob, shareMinor: 70 },
      { participantId: alice, shareMinor: 30 },
    ]);
    const beforePatch = (await splits(explicit.id)).rows;
    const renamed = await api<TripPayload>(
      baseUrl,
      `/api/trips/${tripId}/expenses/${explicit.id}`,
      {
        body: JSON.stringify({ description: "Renamed" }),
        headers: { ...headers, "If-Match": '"1"' },
        method: "PATCH",
      },
    );
    expect(renamed.response.status).toBe(200);
    expect((await splits(explicit.id)).rows).toEqual(beforePatch);
    const resized = await api<TripPayload>(
      baseUrl,
      `/api/trips/${tripId}/expenses/${explicit.id}`,
      {
        body: JSON.stringify({ amount: "200" }),
        headers: { ...headers, "If-Match": '"2"' },
        method: "PATCH",
      },
    );
    expect(
      resized.data.trip.expenses.find((expense) => expense.id === explicit.id)
        ?.participantShares,
    ).toEqual([
      { participantId: bob, shareMinor: 140 },
      { participantId: alice, shareMinor: 60 },
    ]);
    const createdAt = "2020-01-02T03:04:05.000Z";
    await pool.query("UPDATE expenses SET created_at = $1 WHERE trip_id = $2", [
      createdAt,
      tripId,
    ]);
    const backup = await api<TripBackupV1>(
      baseUrl,
      `/api/trips/${tripId}/backup`,
      { headers },
    );
    const restored = await api<TripPayload>(baseUrl, "/api/trips/restore", {
      body: JSON.stringify(backup.data),
      headers,
      method: "POST",
    });
    expect(restored.response.status).toBe(201);
    const restoredAlice = restored.data.trip.participants.find(
      (person) => person.name === "Alice",
    )?.id;
    const restoredBob = restored.data.trip.participants.find(
      (person) => person.name === "Bob",
    )?.id;
    expect(restoredAlice).not.toBe(alice);
    expect(restoredBob).not.toBe(bob);
    for (const expense of restored.data.trip.expenses) {
      expect(expense.paidById).toBe(restoredAlice);
      expect(expense.participantIds).toEqual([restoredBob, restoredAlice]);
      expect(expense.createdAt).toBe(createdAt);
      expect(expense.expenseDate).toBe("2026-09-20");
      expect(expense.participantShares).toEqual(
        expense.description === "Equal"
          ? undefined
          : [
              { participantId: restoredBob, shareMinor: 140 },
              { participantId: restoredAlice, shareMinor: 60 },
            ],
      );
    }

    // Fail after the expense and its first participant row have been inserted.
    await pool.query(`CREATE FUNCTION fail_second_split() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.position = 1 THEN RAISE EXCEPTION 'test split failure'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER fail_second_split BEFORE INSERT ON expense_participants
    FOR EACH ROW EXECUTE FUNCTION fail_second_split()`);
    const counts = async () =>
      (
        await pool.query(`SELECT
    (SELECT count(*) FROM trips) AS trips,
    (SELECT count(*) FROM expenses) AS expenses,
    (SELECT count(*) FROM expense_participants) AS splits,
    (SELECT count(*) FROM expense_revisions) AS revisions`)
      ).rows;
    const beforeFailure = await counts();
    vi.spyOn(console, "error").mockImplementation(() => {});
    for (const [route, body] of [
      [`/api/trips/${tripId}/expenses`, draft],
      [
        `/api/trips/${tripId}/expenses/import`,
        {
          csv: "date,description,amount,currency,paid_by,split_participants\n2026-09-20,First,20,TWD,Alice,Alice\n2026-09-20,Second,100,TWD,Alice,Alice; Bob",
        },
      ],
      ["/api/trips/restore", backup.data],
    ] as const) {
      const failed = await api(baseUrl, route, {
        body: JSON.stringify(body),
        headers,
        method: "POST",
      });
      expect(failed.response.status).toBe(500);
      expect(failed.data).toEqual({ error: "伺服器錯誤" });
      expect(await counts()).toEqual(beforeFailure);
    }
    const failedPatch = await api(
      baseUrl,
      `/api/trips/${tripId}/expenses/${explicit.id}`,
      {
        body: JSON.stringify({ amount: "300" }),
        headers: { ...headers, "If-Match": '"3"' },
        method: "PATCH",
      },
    );
    expect(failedPatch.response.status).toBe(500);
    expect(
      (
        await pool.query("SELECT amount_minor FROM expenses WHERE id = $1", [
          explicit.id,
        ])
      ).rows[0].amount_minor,
    ).toBe("200");
    expect(
      (await splits(explicit.id)).rows.map((row) => row.share_minor),
    ).toEqual(["140", "60"]);
  },
);
