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
    (legacyBackup.trip as { exchangeRates?: object }).exchangeRates = {
      USD: 40,
    };
    const oldRestored = await request(
      "/api/trips/restore",
      "POST",
      legacyBackup,
    );
    expect(oldRestored.response.status).toBe(201);
    expect(
      oldRestored.data.trip.expenses.every(
        (e) =>
          e.exchangeRate?.source === "legacy" &&
          e.exchangeRate.rateToBase === 40,
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
    const historicalLarge = await request(`${url}/expenses`, "POST", {
      ...input,
      description: "Historical large amount",
      currency: "TWD",
      amount: "10000000",
    });
    expect(historicalLarge.response.status).toBe(201);
    const historicalId = historicalLarge.data.trip.expenses.find(
      (e) => e.description === "Historical large amount",
    )?.id;
    assert.ok(historicalId);
    expect(
      (
        await request(
          `${url}/expenses/${historicalId}`,
          "PATCH",
          { amount: "100" },
          1,
        )
      ).response.status,
    ).toBe(200);
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
    const unsafeBackup = {
      ...rebasedBackup.data,
      trip: {
        ...rebasedBackup.data.trip,
        exchangeRates: { TWD: 1e9, EUR: 1e9 },
      },
    };
    expect(
      (await request("/api/trips/restore", "POST", unsafeBackup)).response
        .status,
    ).toBe(400);
    const rebasedRestore = await request(
      "/api/trips/restore",
      "POST",
      rebasedBackup.data,
    );
    expect(rebasedRestore.response.status).toBe(201);
    expect(
      rebasedRestore.data.trip.expenses[0].exchangeRate?.baseCurrency,
    ).toBe("TWD");
    expect(
      (
        await request(
          `${url}/expenses/${largeBaseExpense.data.trip.expenses.find((e) => e.description === "Old base amount")?.id}`,
          "PATCH",
          { amount: "100" },
          1,
        )
      ).response.status,
    ).toBe(200);
    expect(
      (await request(url, "PATCH", { exchangeRates: { TWD: 1e9 } })).response
        .status,
    ).toBe(200);
    const oldVersions = await api<{
      revisions: { id: string; version: number }[];
    }>(
      s.baseUrl,
      `${url}/expense-history?expenseId=${encodeURIComponent(historicalId)}`,
      { headers: { cookie } },
    );
    const oldVersion = oldVersions.data.revisions.find((r) => r.version === 1);
    assert.ok(oldVersion);
    const unsafeRestore = await request(
      `${url}/expenses/${historicalId}/restore`,
      "POST",
      { revisionId: oldVersion.id },
      2,
    );
    expect(unsafeRestore.response.status).toBe(400);
    expect((await request(url)).response.status).toBe(200);
    expect(
      (
        await s.pool.query("SELECT amount_minor FROM expenses WHERE id = $1", [
          historicalId,
        ])
      ).rows[0].amount_minor,
    ).toBe("100");
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

test(
  "v2 backup rejects bank-unsafe cross-base snapshots before inserting a trip",
  postgresTestOptions,
  async () => {
    let eur = 10;
    const fetchRates = vi.fn(async () =>
      quote(32).map((rate) =>
        rate.source === "EUR" ? { ...rate, spotBuy: eur, spotSell: eur } : rate,
      ),
    );
    const s = await withTestApp({
      appOptions: { exchangeRates: { fetchRates } },
      prepare: async (pool) => {
        await pool.query(
          "INSERT INTO users (id,name,username,password_hash) VALUES ('owner','Owner','owner','unused')",
        );
      },
    });
    const cookie = `otter_session=${(await createSession(s.pool, "owner")).id}`;
    const request = (path: string, method = "GET", body?: object) =>
      api<TripPayload>(s.baseUrl, path, {
        method,
        headers: { cookie },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    const created = await request("/api/trips", "POST", {
      name: "Backup bridge",
      baseCurrency: "TWD",
    });
    const person = created.data.trip.participants[0].id;
    const url = `/api/trips/${created.data.trip.id}`;
    expect(
      (
        await request(`${url}/expenses`, "POST", {
          description: "Large TWD",
          amount: "1000000000000000",
          currency: "TWD",
          paidById: person,
          participantIds: [person],
        })
      ).response.status,
    ).toBe(201);
    const backup = await api<{
      trip: {
        baseCurrency: string;
        exchangeRates?: object;
        expenses: { amountMinor: number }[];
      };
    }>(s.baseUrl, `${url}/backup`, { headers: { cookie } });
    const imported = structuredClone(backup.data);
    imported.trip.baseCurrency = "EUR";
    expect(imported.trip.exchangeRates).toBeUndefined();
    const rejected = await request("/api/trips/restore", "POST", imported);
    expect(rejected.response.status).toBe(400);
    expect(
      (await s.pool.query("SELECT count(*)::int AS count FROM trips")).rows[0]
        .count,
    ).toBe(1);
    expect((await request(url)).response.status).toBe(200);
    // A quote that makes the same bridge safe must not be rejected by
    // validation against the old fixed table (which overflows here).
    eur = 100;
    const safe = structuredClone(imported);
    safe.trip.expenses[0].amountMinor = 4000000000000000;
    fetchRates.mockClear();
    const accepted = await request("/api/trips/restore", "POST", safe);
    expect(accepted.response.status).toBe(201);
    expect(accepted.data.exchangeRateInfo?.source).toBe("bank");
    expect(fetchRates).toHaveBeenCalledTimes(1);
    expect(
      (await request(`/api/trips/${accepted.data.trip.id}`)).response.status,
    ).toBe(200);
  },
);

test(
  "v1 restore snapshots the PostgreSQL-rounded custom rate",
  postgresTestOptions,
  async () => {
    const s = await withTestApp({
      prepare: async (pool) => {
        await pool.query(
          "INSERT INTO users (id,name,username,password_hash) VALUES ('owner','Owner','owner','unused')",
        );
      },
    });
    const cookie = `otter_session=${(await createSession(s.pool, "owner")).id}`;
    const request = (path: string, method = "GET", body?: object) =>
      api<TripPayload>(s.baseUrl, path, {
        method,
        headers: { cookie },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    const created = await request("/api/trips", "POST", {
      name: "V1",
      baseCurrency: "TWD",
    });
    const tripUrl = `/api/trips/${created.data.trip.id}`;
    const participant = created.data.trip.participants[0].id;
    expect(
      (
        await request(`${tripUrl}/expenses`, "POST", {
          description: "Old USD",
          amount: "100000000",
          currency: "USD",
          paidById: participant,
          participantIds: [participant],
        })
      ).response.status,
    ).toBe(201);
    const backup = await api<{
      version: number;
      trip: { expenses: { exchangeRate?: unknown }[]; exchangeRates?: object };
    }>(s.baseUrl, `${tripUrl}/backup`, { headers: { cookie } });
    const legacy = structuredClone(backup.data);
    legacy.version = 1;
    legacy.trip.exchangeRates = { USD: 0.000000014 };
    for (const expense of legacy.trip.expenses) delete expense.exchangeRate;
    const restored = await request("/api/trips/restore", "POST", legacy);
    expect(restored.response.status).toBe(201);
    expect(restored.data.trip.exchangeRates?.USD).toBe(0.00000001);
    expect(restored.data.trip.expenses[0].exchangeRate).toMatchObject({
      source: "legacy",
      rateToBase: 0.00000001,
    });
    const saved = await s.pool.query(
      "SELECT rate_to_base FROM trip_exchange_rates WHERE trip_id = $1 AND currency = 'USD'",
      [restored.data.trip.id],
    );
    expect(Number(saved.rows[0].rate_to_base)).toBe(
      restored.data.trip.expenses[0].exchangeRate?.rateToBase,
    );
  },
);

test(
  "restore uses a directly normalized bank quote for validation and response",
  postgresTestOptions,
  async () => {
    const fetchRates = vi.fn(async () =>
      quote(32).map((rate) =>
        rate.source === "EUR"
          ? { ...rate, spotBuy: 10.0001, spotSell: 10.0001 }
          : rate,
      ),
    );
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
      name: "Rounding bridge",
      baseCurrency: "TWD",
    });
    const url = `/api/trips/${created.data.trip.id}`;
    const person = created.data.trip.participants[0].id;
    const first = await request(`${url}/expenses`, "POST", {
      description: "Large original base",
      amount: "900728932673353",
      currency: "TWD",
      paidById: person,
      participantIds: [person],
    });
    expect(first.response.status).toBe(201);
    const expenseId = first.data.trip.expenses[0].id;
    expect(
      (
        await request(
          `${url}/expenses/${expenseId}`,
          "PATCH",
          { amount: "100" },
          1,
        )
      ).response.status,
    ).toBe(200);
    expect(
      (await request(url, "PATCH", { baseCurrency: "EUR" })).response.status,
    ).toBe(200);
    const history = await api<{ revisions: { id: string; version: number }[] }>(
      s.baseUrl,
      `${url}/expense-history?expenseId=${encodeURIComponent(expenseId)}`,
      { headers: { cookie } },
    );
    const revision = history.data.revisions.find((item) => item.version === 1);
    assert.ok(revision);
    fetchRates.mockClear();
    const rejected = await request(
      `${url}/expenses/${expenseId}/restore`,
      "POST",
      { revisionId: revision.id },
      2,
    );
    expect(rejected.response.status).toBe(400);
    expect(fetchRates).toHaveBeenCalledTimes(1);
    const current = await request(url);
    expect(current.response.status).toBe(200);
    expect(current.data.trip.expenses[0].amountMinor).toBe(100);
    expect(current.data.trip.expenses[0].version).toBe(2);
  },
);

test(
  "restore checks a cross-base revision against bank rates used by the response",
  postgresTestOptions,
  async () => {
    const fetchRates = vi.fn(async () =>
      quote(32).map((rate) =>
        rate.source === "EUR" ? { ...rate, spotBuy: 100, spotSell: 100 } : rate,
      ),
    );
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
      name: "Bank bridge",
      baseCurrency: "TWD",
    });
    const url = `/api/trips/${created.data.trip.id}`;
    const person = created.data.trip.participants[0].id;
    const expense = await request(`${url}/expenses`, "POST", {
      description: "Large original base",
      amount: "4000000000000000",
      currency: "TWD",
      paidById: person,
      participantIds: [person],
    });
    expect(expense.response.status).toBe(201);
    const expenseId = expense.data.trip.expenses[0].id;
    const rebased = await request(url, "PATCH", { baseCurrency: "EUR" });
    expect(rebased.response.status).toBe(200);
    expect(rebased.data.trip.exchangeRates?.EUR).toBe(1);
    const history = await api<{ revisions: { id: string; version: number }[] }>(
      s.baseUrl,
      `${url}/expense-history?expenseId=${encodeURIComponent(expenseId)}`,
      { headers: { cookie } },
    );
    const first = history.data.revisions.find(
      (revision) => revision.version === 1,
    );
    assert.ok(first);
    const noOp = await request(
      `${url}/expenses/${expenseId}/restore`,
      "POST",
      { revisionId: first.id },
      1,
    );
    expect(noOp.response.status).toBe(200);
    expect((await request(url)).response.status).toBe(200);
  },
);
