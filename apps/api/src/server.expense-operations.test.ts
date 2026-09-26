import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "vitest";
import {
  api,
  postgresTestOptions,
  type TripPayload,
  type UserResponse,
  withTestApp,
} from "./server-test-utils.js";

test(
  "expense operation replays are durable, scoped and atomic",
  postgresTestOptions,
  async () => {
    const { baseUrl, pool } = await withTestApp();
    const register = async (name: string) => {
      const result = await api<UserResponse>(baseUrl, "/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          username: `${name}-${randomUUID().slice(0, 8)}`,
          name,
          password: "password123",
        }),
      });
      assert.equal(result.response.status, 201);
      const cookie = result.response.headers.get("set-cookie")?.split(";")[0];
      assert.ok(cookie);
      assert.ok(result.data.user);
      return { cookie, userId: result.data.user.id };
    };
    const owner = await register("owner");
    const other = await register("other");
    const createTrip = async (cookie: string) => {
      const result = await api<TripPayload>(baseUrl, "/api/trips", {
        method: "POST",
        headers: { cookie },
        body: JSON.stringify({
          name: `Test-${randomUUID().slice(0, 8)}`,
          baseCurrency: "TWD",
        }),
      });
      assert.equal(result.response.status, 201);
      return result.data.trip;
    };
    const trip = await createTrip(owner.cookie);
    const second = await createTrip(owner.cookie);
    const body = JSON.stringify({
      description: "Offline",
      amount: "100",
      currency: "TWD",
      paidById: trip.participants[0].id,
      participantIds: [trip.participants[0].id],
    });
    const path = `/api/trips/${trip.id}/expenses`;
    const key = randomUUID();
    const post = (
      cookie: string,
      operationId: string,
      json = body,
      tripPath = path,
      userId?: string,
    ) =>
      api<TripPayload & { error?: string }>(baseUrl, tripPath, {
        method: "POST",
        body: json,
        headers: {
          cookie,
          "Idempotency-Key": operationId,
          ...(userId ? { "X-Otter-Queue-User": userId } : {}),
        },
      });

    const concurrent = await Promise.all(
      Array.from({ length: 6 }, () =>
        post(owner.cookie, key, body, path, owner.userId),
      ),
    );
    assert.deepEqual(
      concurrent.map(({ response }) => response.status).sort(),
      [200, 200, 200, 200, 200, 201],
    );
    assert.ok(concurrent.every(({ data }) => data.trip.expenses.length === 1));
    const expense = concurrent[0].data.trip.expenses[0];
    assert.ok(expense);
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int AS n FROM expense_revisions WHERE trip_id = $1",
          [trip.id],
        )
      ).rows[0].n,
      1,
    );
    assert.equal(
      (
        await post(
          owner.cookie,
          key,
          JSON.stringify({ ...JSON.parse(body), amount: "101" }),
        )
      ).response.status,
      409,
    );
    assert.equal(
      (await post(owner.cookie, key, body, path, other.userId)).response.status,
      403,
    );
    assert.equal((await post(other.cookie, key)).response.status, 404);
    assert.equal(
      (await post(owner.cookie, "invalid-key")).response.status,
      400,
    );
    // A separate group cannot inherit a prior result even with the same key.
    const secondBody = JSON.stringify({
      ...JSON.parse(body),
      paidById: second.participants[0].id,
      participantIds: [second.participants[0].id],
    });
    assert.equal(
      (
        await post(
          owner.cookie,
          key,
          secondBody,
          `/api/trips/${second.id}/expenses`,
        )
      ).response.status,
      201,
    );

    const deleted = await api(baseUrl, `${path}/${expense.id}`, {
      method: "DELETE",
      headers: { cookie: owner.cookie, "If-Match": '"1"' },
    });
    assert.equal(deleted.response.status, 200);
    const replay = await post(owner.cookie, key);
    assert.equal(replay.response.status, 200);
    assert.equal(replay.data.trip.expenses.length, 0);
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int AS n FROM expense_create_operations WHERE trip_id = $1",
          [trip.id],
        )
      ).rows[0].n,
      1,
    );

    // Failure after inserting an expense and revision must roll back all three.
    await pool.query(
      `CREATE FUNCTION refuse_operation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test rollback'; END $$`,
    );
    await pool.query(
      "CREATE TRIGGER refuse_operation BEFORE INSERT ON expense_create_operations FOR EACH ROW EXECUTE FUNCTION refuse_operation()",
    );
    const failedKey = randomUUID();
    const failed = await post(owner.cookie, failedKey);
    assert.equal(failed.response.status, 500);
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int AS n FROM expenses WHERE trip_id = $1",
          [trip.id],
        )
      ).rows[0].n,
      0,
    );
    await pool.query(
      "DROP TRIGGER refuse_operation ON expense_create_operations",
    );
    assert.equal((await post(owner.cookie, failedKey)).response.status, 201);

    const participant = await api<TripPayload>(
      baseUrl,
      `/api/trips/${trip.id}/participants`,
      {
        method: "POST",
        headers: { cookie: owner.cookie },
        body: JSON.stringify({ name: "Changed person" }),
      },
    );
    assert.equal(participant.response.status, 201);
    const removed = participant.data.trip.participants.find(
      (person) => person.name === "Changed person",
    );
    assert.ok(removed);
    const changedBody = JSON.stringify({
      ...JSON.parse(body),
      participantIds: [removed.id],
    });
    await pool.query(
      "DELETE FROM participants WHERE trip_id = $1 AND id = $2",
      [trip.id, removed.id],
    );
    const changedKey = randomUUID();
    assert.equal(
      (await post(owner.cookie, changedKey, changedBody)).response.status,
      400,
    );
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int AS n FROM expense_create_operations WHERE trip_id = $1 AND operation_id = $2",
          [trip.id, changedKey],
        )
      ).rows[0].n,
      0,
    );

    await pool.query("UPDATE trips SET archived_at = now() WHERE id = $1", [
      trip.id,
    ]);
    assert.equal((await post(owner.cookie, key)).response.status, 409);
    await pool.query("UPDATE trips SET archived_at = NULL WHERE id = $1", [
      trip.id,
    ]);
    await pool.query(
      "DELETE FROM trip_members WHERE trip_id = $1 AND user_id = $2",
      [trip.id, owner.userId],
    );
    assert.equal((await post(owner.cookie, key)).response.status, 404);
  },
);
