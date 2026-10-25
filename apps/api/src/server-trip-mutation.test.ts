import assert from "node:assert/strict";
import type { TripPayload } from "@narumitw/otter-contracts";
import type { PoolClient } from "pg";
import { expect, test, vi } from "vitest";
import { createSession } from "./server-support.js";
import {
  api,
  postgresTestOptions,
  testVisaRate,
  withTestApp,
} from "./server-test-utils.js";

function barrier() {
  let release = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

async function setup() {
  const fetchRate = vi.fn(testVisaRate);
  const { baseUrl, pool } = await withTestApp({
    appOptions: { exchangeRates: { fetchRate } },
    prepare: async (pool) => {
      await pool.query(
        "INSERT INTO users (id, name, username, password_hash) VALUES ('owner','Owner','owner','unused')",
      );
    },
  });
  const cookie = `otter_session=${(await createSession(pool, "owner")).id}`;
  const created = await api<TripPayload>(baseUrl, "/api/trips", {
    method: "POST",
    headers: { cookie },
    body: JSON.stringify({ name: "Slow rates", baseCurrency: "TWD" }),
  });
  assert.equal(created.response.status, 201);
  const tripId = created.data.trip.id;
  const person = created.data.trip.participants[0].id;
  const added = await api<TripPayload>(
    baseUrl,
    `/api/trips/${tripId}/expenses`,
    {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({
        description: "Dinner",
        amount: "100",
        currency: "TWD",
        paidById: person,
        participantIds: [person],
      }),
    },
  );
  assert.equal(added.response.status, 201);
  const expenseId = added.data.trip.expenses[0].id;
  const patch = (amount: string, version = '"1"') =>
    api<TripPayload>(baseUrl, `/api/trips/${tripId}/expenses/${expenseId}`, {
      method: "PATCH",
      headers: { cookie, "If-Match": version },
      body: JSON.stringify({ amount }),
    });
  fetchRate.mockClear();
  return {
    pool,
    fetchRate,
    tripId,
    expenseId,
    patch,
    baseUrl,
    cookie,
    person,
  };
}

for (const outcome of ["quote", "failure"] as const) {
  test(
    `slow Visa ${outcome} holds no trip lock and cannot overwrite a concurrent expense edit`,
    postgresTestOptions,
    async () => {
      const s = await setup();
      const entered = barrier();
      const finish = barrier();
      s.fetchRate.mockImplementationOnce(async (q) => {
        entered.release();
        await finish.promise;
        if (outcome === "failure") throw new Error("Provider unavailable");
        return testVisaRate(q);
      });
      const pending = api<TripPayload>(
        s.baseUrl,
        `/api/trips/${s.tripId}/expenses/${s.expenseId}`,
        {
          method: "PATCH",
          headers: { cookie: s.cookie, "If-Match": '"1"' },
          body: JSON.stringify({
            amount: "2",
            currency: "USD",
            expenseDate: "2026-07-05",
          }),
        },
      );
      try {
        await entered.promise;
        expect(s.pool.idleCount).toBe(s.pool.totalCount);
        const stored = await s.pool.query(
          "SELECT version, amount_minor FROM expenses WHERE id = $1",
          [s.expenseId],
        );
        expect(stored.rows[0].version).toBe(1);
        expect(Number(stored.rows[0].amount_minor)).toBe(100);
        const client = await s.pool.connect();
        try {
          await client.query("BEGIN");
          await client.query(
            "SELECT id FROM trips WHERE id = $1 FOR UPDATE NOWAIT",
            [s.tripId],
          );
        } finally {
          await client.query("ROLLBACK");
          client.release();
        }
        const newer = await s.patch("300");
        expect(newer.response.status).toBe(200);
        expect(newer.data.trip.expenses[0]).toMatchObject({
          version: 2,
          amountMinor: 300,
          currency: "TWD",
        });
      } finally {
        finish.release();
        await pending;
      }
      expect((await pending).response.status).toBe(412);
      const current = await api<TripPayload>(
        s.baseUrl,
        `/api/trips/${s.tripId}`,
        { headers: { cookie: s.cookie } },
      );
      expect(current.data.trip.expenses[0]).toMatchObject({
        version: 2,
        amountMinor: 300,
        currency: "TWD",
      });
      expect(
        (await s.pool.query("SELECT * FROM expense_revisions")).rowCount,
      ).toBe(2);
      expect(s.fetchRate).toHaveBeenCalledTimes(1);
    },
  );
}

test(
  "only expense-affecting mutations capture before snapshots",
  postgresTestOptions,
  async () => {
    const s = await setup();
    await s.pool.query(
      "INSERT INTO users (id,name,username,password_hash) VALUES ('editor','Editor','editor','unused')",
    );
    const observed = new WeakSet<PoolClient>();
    const queries: (() => string[])[] = [];
    const restore: (() => void)[] = [];
    const observe = (client: PoolClient) => {
      if (observed.has(client)) return;
      observed.add(client);
      const query = vi.spyOn(client, "query");
      queries.push(() => query.mock.calls.map(([sql]) => String(sql)));
      restore.push(() => query.mockRestore());
    };
    s.pool.on("acquire", observe);
    const snapshots = () =>
      queries
        .flatMap((read) => read())
        .filter(
          (sql) =>
            sql.includes("AS snapshot FROM expenses") &&
            sql.endsWith("ORDER BY id"),
        );
    const mutate = async (
      path: string,
      method: string,
      body?: Record<string, unknown>,
    ) => {
      const result = await api<TripPayload>(
        s.baseUrl,
        `/api/trips/${s.tripId}${path}`,
        {
          method,
          headers: { cookie: s.cookie },
          ...(body ? { body: JSON.stringify(body) } : {}),
        },
      );
      expect(result.response.status).toBe(method === "POST" ? 201 : 200);
      return result.data;
    };
    try {
      await mutate("", "PATCH", { name: "Renamed trip" });
      const added = await mutate("/participants", "POST", { name: "Other" });
      const person = added.trip.participants.find((p) => p.name === "Other");
      assert.ok(person);
      await mutate(`/participants/${person.id}`, "PATCH", {
        name: "Renamed person",
      });
      await mutate("/members", "POST", { username: "editor" });
      await mutate("/members/editor", "DELETE");
      const paid = await mutate("/settlement-payments", "POST", {
        fromId: person.id,
        toId: s.person,
        amount: "10",
        currency: "TWD",
      });
      const payment = paid.trip.settlementPayments?.[0];
      assert.ok(payment);
      await mutate(`/settlement-payments/${payment.id}`, "DELETE");
      await mutate(`/participants/${person.id}`, "DELETE");
      expect(snapshots()).toHaveLength(0);
      expect(
        (await s.pool.query("SELECT * FROM expense_revisions")).rowCount,
      ).toBe(1);
      expect((await s.patch("200")).response.status).toBe(200);
      expect(snapshots()).toHaveLength(2); // Required before + after capture.
      expect(
        (await s.pool.query("SELECT * FROM expense_revisions")).rowCount,
      ).toBe(2);
    } finally {
      s.pool.off("acquire", observe);
      for (const reset of restore) reset();
    }
  },
);

for (const timing of ["write", "commit"] as const) {
  test(
    `rejected requests and failures at ${timing} never enrich a response`,
    postgresTestOptions,
    async () => {
      const s = await setup();
      expect((await s.patch("-1")).response.status).toBe(400);
      expect((await s.patch("200", '"2"')).response.status).toBe(412);
      s.fetchRate.mockClear();
      await s.pool.query(
        `CREATE FUNCTION reject_revision() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'revision rejected'; END $$`,
      );
      await s.pool.query(
        timing === "commit"
          ? "CREATE CONSTRAINT TRIGGER reject_revision AFTER INSERT ON expense_revisions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION reject_revision()"
          : "CREATE TRIGGER reject_revision BEFORE INSERT ON expense_revisions FOR EACH ROW EXECUTE FUNCTION reject_revision()",
      );
      expect((await s.patch("200")).response.status).toBe(500);
      expect(s.fetchRate).not.toHaveBeenCalled(); // Amount-only edits and error responses never reprice.
      expect(s.pool.idleCount).toBe(s.pool.totalCount);
      const current = await s.pool.query(
        "SELECT version, amount_minor FROM expenses WHERE id = $1",
        [s.expenseId],
      );
      expect(current.rows[0].version).toBe(1);
      expect(Number(current.rows[0].amount_minor)).toBe(100);
      expect(
        (await s.pool.query("SELECT * FROM expense_revisions")).rowCount,
      ).toBe(1);
    },
  );
}
