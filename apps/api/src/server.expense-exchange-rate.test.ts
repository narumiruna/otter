import assert from "node:assert/strict";
import type { TripPayload } from "@narumitw/otter-contracts";
import type { Rate } from "@narumitw/otter-exchange-rates";
import { expect, test, vi } from "vitest";
import { createSession } from "./server-support.js";
import { api, postgresTestOptions, withTestApp } from "./server-test-utils.js";

const quote = (usd: number): Rate[] =>
  (
    [
      ["JPY", 0.22],
      ["USD", usd],
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

test(
  "each expense retains its quote through changes, history, CSV and backup",
  postgresTestOptions,
  async () => {
    let current = 32;
    const fetchRates = vi.fn(async () => quote(current));
    const s = await withTestApp({
      appOptions: { exchangeRates: { fetchRates } },
      prepare: async (pool) => {
        await pool.query(
          "INSERT INTO users (id,name,username,password_hash) VALUES ('owner','Owner','owner','unused')",
        );
      },
    });
    const cookie = `otter_session=${(await createSession(s.pool, "owner")).id}`;
    const request = (
      path: string,
      method = "GET",
      body?: object,
      version?: number,
    ) =>
      api<TripPayload>(s.baseUrl, path, {
        method,
        headers: { cookie, ...(version ? { "If-Match": `"${version}"` } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    const created = await request("/api/trips", "POST", {
      name: "Rates",
      baseCurrency: "TWD",
    });
    assert.equal(created.response.status, 201);
    const url = `/api/trips/${created.data.trip.id}`;
    const person = created.data.trip.participants[0].id;
    const input = {
      description: "Dinner",
      amount: "1",
      currency: "USD",
      paidById: person,
      participantIds: [person],
    };
    const first = await request(`${url}/expenses`, "POST", input);
    expect(first.response.status).toBe(201);
    expect(first.data.trip.expenses[0].exchangeRate).toMatchObject({
      source: "bank",
      rateToBase: 32,
      provider: "BANK_OF_TAIWAN",
    });
    const id = first.data.trip.expenses[0].id;
    current = 40;
    const unchanged = await request(url);
    expect(unchanged.data.trip.expenses[0].exchangeRate?.rateToBase).toBe(32);
    expect(unchanged.data.balances).toEqual(first.data.balances);
    const second = await request(`${url}/expenses`, "POST", {
      ...input,
      description: "Later",
    });
    expect(
      second.data.trip.expenses.find((e) => e.id !== id)?.exchangeRate
        ?.rateToBase,
    ).toBe(40);
    const textOnly = await request(
      `${url}/expenses/${id}`,
      "PATCH",
      { description: "Edited" },
      1,
    );
    expect(
      textOnly.data.trip.expenses.find((e) => e.id === id)?.exchangeRate
        ?.rateToBase,
    ).toBe(32);
    const fullEditorPatch = await request(
      `${url}/expenses/${id}`,
      "PATCH",
      { ...input, description: "Full editor payload" },
      2,
    );
    expect(fullEditorPatch.response.status).toBe(200);
    expect(
      fullEditorPatch.data.trip.expenses.find((e) => e.id === id)?.exchangeRate
        ?.rateToBase,
    ).toBe(32);
    const repriced = await request(
      `${url}/expenses/${id}`,
      "PATCH",
      { amount: "2" },
      3,
    );
    expect(
      repriced.data.trip.expenses.find((e) => e.id === id)?.exchangeRate
        ?.rateToBase,
    ).toBe(40);
    const history = await api<{
      revisions: {
        id: string;
        version: number;
        snapshot: { expense: { exchangeRate: { rateToBase: number } } };
      }[];
    }>(
      s.baseUrl,
      `${url}/expense-history?expenseId=${encodeURIComponent(id)}`,
      { headers: { cookie } },
    );
    expect(
      history.data.revisions.map(
        (r) => r.snapshot.expense.exchangeRate.rateToBase,
      ),
    ).toContain(32);
    const backup = await api<{
      version: number;
      trip: { expenses: { exchangeRate: { rateToBase: number } }[] };
    }>(s.baseUrl, `${url}/backup`, { headers: { cookie } });
    expect(backup.data.version).toBe(2);
    expect(
      backup.data.trip.expenses.map((e) => e.exchangeRate.rateToBase),
    ).toContain(40);
    const restored = await request("/api/trips/restore", "POST", backup.data);
    expect(restored.response.status).toBe(201);
    expect(
      restored.data.trip.expenses.map((e) => e.exchangeRate?.rateToBase).sort(),
    ).toEqual([40, 40]);
    const originalRevision = history.data.revisions.find(
      (r) => r.version === 1,
    );
    assert.ok(originalRevision);
    const reverted = await request(
      `${url}/expenses/${id}/restore`,
      "POST",
      { revisionId: originalRevision.id },
      4,
    );
    expect(reverted.response.status).toBe(200);
    expect(
      reverted.data.trip.expenses.find((e) => e.id === id)?.exchangeRate
        ?.rateToBase,
    ).toBe(32);
    const legacyBackup = structuredClone(backup.data);
    legacyBackup.version = 1;
    for (const expense of legacyBackup.trip.expenses)
      delete (expense as { exchangeRate?: unknown }).exchangeRate;
    (legacyBackup.trip.expenses[0] as { exchangeRate?: unknown }).exchangeRate =
      { baseCurrency: "TWD", rateToBase: 9999, source: "custom" };
    const oldRestored = await request(
      "/api/trips/restore",
      "POST",
      legacyBackup,
    );
    expect(oldRestored.response.status).toBe(201);
    expect(
      oldRestored.data.trip.expenses.every(
        (e) => e.exchangeRate?.source === "legacy",
      ),
    ).toBe(true);
    current = 55;
    const imported = await request(`${url}/expenses/import`, "POST", {
      csv: "date,description,amount,currency,paid_by,split_participants\n2026-09-21,Imported,1,USD,Owner,Owner",
    });
    expect(imported.response.status).toBe(201);
    expect(
      imported.data.trip.expenses.find((e) => e.description === "Imported")
        ?.exchangeRate?.rateToBase,
    ).toBe(55);
    fetchRates.mockRejectedValueOnce(new Error("Bank unavailable"));
    const fallback = await request(`${url}/expenses`, "POST", {
      ...input,
      description: "Fallback",
    });
    expect(fallback.response.status).toBe(201);
    expect(
      fallback.data.trip.expenses.find((e) => e.description === "Fallback")
        ?.exchangeRate,
    ).toMatchObject({ source: "fixed", rateToBase: 32 });
    // Response enrichment may succeed after commit; it must not reprice the saved row.
    expect(fallback.data.exchangeRateInfo?.source).toBe("bank");
    const tooLarge = await request(url, "PATCH", {
      exchangeRates: { USD: 1e9 },
    });
    expect(tooLarge.response.status).toBe(200);
    const rejected = await request(`${url}/expenses`, "POST", {
      ...input,
      description: "Overflow",
      amount: "10000000",
    });
    expect(rejected.response.status).toBe(400);
    expect(
      (
        await s.pool.query(
          "SELECT count(*)::int AS count FROM expenses WHERE trip_id = $1",
          [created.data.trip.id],
        )
      ).rows[0].count,
    ).toBe(4);
    expect(
      (
        await s.pool.query(
          "SELECT count(*)::int AS count FROM expense_revisions WHERE trip_id = $1",
          [created.data.trip.id],
        )
      ).rows[0].count,
    ).toBe(8);
    const largeBaseExpense = await request(`${url}/expenses`, "POST", {
      ...input,
      description: "Old base amount",
      currency: "TWD",
      amount: "100000",
    });
    expect(largeBaseExpense.response.status).toBe(201);
    const rebased = await request(url, "PATCH", { baseCurrency: "EUR" });
    expect(rebased.response.status).toBe(200);
    const unrepresentableBridge = await request(url, "PATCH", {
      exchangeRates: { TWD: 1e9 },
    });
    expect(unrepresentableBridge.response.status).toBe(400);
    expect((await request(url)).response.status).toBe(200);
    expect(
      (
        await s.pool.query(
          "SELECT count(*)::int AS count FROM trip_exchange_rates WHERE trip_id = $1",
          [created.data.trip.id],
        )
      ).rows[0].count,
    ).toBe(0);
    expect(
      rebased.data.trip.expenses.find((e) => e.id === id)?.exchangeRate
        ?.baseCurrency,
    ).toBe("TWD");
    const rebasedBackup = await api<{
      version: number;
      trip: { expenses: { exchangeRate: { baseCurrency: string } }[] };
    }>(s.baseUrl, `${url}/backup`, { headers: { cookie } });
    expect(rebasedBackup.data.trip.expenses[0].exchangeRate.baseCurrency).toBe(
      "TWD",
    );
    const rebasedRestore = await request(
      "/api/trips/restore",
      "POST",
      rebasedBackup.data,
    );
    expect(rebasedRestore.response.status).toBe(201);
    expect(
      rebasedRestore.data.trip.expenses[0].exchangeRate?.baseCurrency,
    ).toBe("TWD");
    await s.pool.query(
      "UPDATE expense_revisions SET snapshot = snapshot #- '{expense,exchangeRate}' WHERE id = $1",
      [originalRevision.id],
    );
    const missingQuote = await request(
      `${url}/expenses/${id}/restore`,
      "POST",
      { revisionId: originalRevision.id },
      5,
    );
    expect(missingQuote.response.status).toBe(409);
  },
);
