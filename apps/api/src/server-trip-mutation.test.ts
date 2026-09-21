import assert from "node:assert/strict";
import type { TripPayload } from "@narumitw/otter-contracts";
import type { Rate } from "@narumitw/otter-exchange-rates";
import { expect, test, vi } from "vitest";
import { createSession } from "./server-support.js";
import { api, postgresTestOptions, withTestApp } from "./server-test-utils.js";

const rates: Rate[] = (
  [
    ["JPY", 0.22],
    ["USD", 32],
    ["EUR", 35],
  ] as const
).map(([source, mid]) => ({
  exchange: "BANK_OF_TAIWAN",
  fetchedAt: "2026-09-21T00:00:00.000Z",
  source,
  spotBuy: mid,
  spotSell: mid,
  target: "TWD",
}));

function barrier() {
  let release = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

async function setup() {
  const fetchRates = vi.fn(async (): Promise<readonly Rate[]> => rates);
  const { baseUrl, pool } = await withTestApp({
    appOptions: { exchangeRates: { fetchRates } },
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
  fetchRates.mockClear();
  return { pool, fetchRates, tripId, expenseId, patch };
}

for (const outcome of ["bank", "fallback"] as const) {
  test(
    `slow ${outcome} enrichment releases the client and trip lock before responding with its committed snapshot`,
    postgresTestOptions,
    async () => {
      const s = await setup();
      const entered = barrier();
      const finish = barrier();
      s.fetchRates.mockImplementationOnce(async () => {
        entered.release();
        await finish.promise;
        if (outcome === "fallback") throw new Error("provider unavailable");
        return rates;
      });
      const pending = s.patch("200");
      try {
        await entered.promise;
        // Deterministic provider barrier: the response is pending, but no pool
        // client or transaction lock may remain occupied by that request.
        expect(s.pool.idleCount).toBe(s.pool.totalCount);
        const stored = await s.pool.query(
          "SELECT version, amount_minor FROM expenses WHERE id = $1",
          [s.expenseId],
        );
        expect(stored.rows[0].version).toBe(2);
        expect(Number(stored.rows[0].amount_minor)).toBe(200);
        const history = await s.pool.query(
          "SELECT version, snapshot FROM expense_revisions WHERE expense_id = $1 ORDER BY version",
          [s.expenseId],
        );
        expect(history.rows.map((row) => row.version)).toEqual([1, 2]);
        expect(history.rows[1].snapshot.expense.amountMinor).toBe(200);
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
        // A same-trip writer can commit while the first response still awaits
        // the provider; its new snapshot must not leak into the first response.
        const newer = await s.patch("300", '"2"');
        expect(newer.response.status).toBe(200);
        expect(newer.data.trip.expenses[0]).toMatchObject({
          version: 3,
          amountMinor: 300,
        });
      } finally {
        finish.release();
        await pending;
      }
      const original = await pending;
      expect(original.response.status).toBe(200);
      expect(original.data.trip.expenses[0]).toMatchObject({
        version: 2,
        amountMinor: 200,
      });
      expect(original.data.exchangeRateInfo?.source).toBe(
        outcome === "bank" ? "bank" : "fixed",
      );
    },
  );
}

for (const timing of ["write", "commit"] as const) {
  test(
    `rejected requests and failures at ${timing} never enrich a response`,
    postgresTestOptions,
    async () => {
      const s = await setup();
      expect((await s.patch("-1")).response.status).toBe(400);
      expect((await s.patch("200", '"2"')).response.status).toBe(412);
      await s.pool.query(
        `CREATE FUNCTION reject_revision() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'revision rejected'; END $$`,
      );
      await s.pool.query(
        timing === "commit"
          ? "CREATE CONSTRAINT TRIGGER reject_revision AFTER INSERT ON expense_revisions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION reject_revision()"
          : "CREATE TRIGGER reject_revision BEFORE INSERT ON expense_revisions FOR EACH ROW EXECUTE FUNCTION reject_revision()",
      );
      expect((await s.patch("200")).response.status).toBe(500);
      expect(s.fetchRates).not.toHaveBeenCalled();
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
