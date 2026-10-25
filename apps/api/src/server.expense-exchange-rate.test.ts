import {
  type CreateExpenseResponse,
  expenseIfMatch,
  parseExpenseHistoryPage,
  parseTripPayload,
} from "@narumitw/otter-contracts";
import type { TripBackupV3 } from "@narumitw/otter-core/backup";
import type { VisaRateQuery } from "@narumitw/otter-visa-exchange-rates";
import { expect, test, vi } from "vitest";
import { createSession } from "./server-support.js";
import { api, postgresTestOptions, withTestApp } from "./server-test-utils.js";

function quote(q: VisaRateQuery) {
  const usd = q.date === "2026-07-05" ? 32 : q.date === "2026-07-06" ? 40 : 55;
  const book: Record<string, number> = { USD: usd, TWD: 1, JPY: 0.2, EUR: 35 };
  const rate = book[q.source] / book[q.target];
  return {
    source: q.source,
    target: q.target,
    date: q.date ?? "2026-07-05",
    amount: 1,
    bankFeePercent: 0,
    visaRate: rate,
    rate,
    convertedAmount: rate,
    fetchedAt: "2026-10-25T00:00:00Z",
  };
}
async function setup() {
  const fetchRate = vi.fn(async (q: VisaRateQuery) => quote(q));
  const s = await withTestApp({
    appOptions: { exchangeRates: { fetchRate } },
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
    api<CreateExpenseResponse & { error?: string }>(s.baseUrl, path, {
      method,
      headers: {
        cookie,
        ...(version ? { "If-Match": expenseIfMatch(version) } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  const created = await request("/api/trips", "POST", {
    name: "Rates",
    baseCurrency: "TWD",
  });
  expect(created.response.status).toBe(201);
  const url = `/api/trips/${created.data.trip.id}`;
  const person = created.data.trip.participants[0].id;
  const input = {
    description: "Dinner",
    amount: "1",
    currency: "USD",
    expenseDate: "2026-07-05",
    paidById: person,
    participantIds: [person],
  };
  const backup = () =>
    api<TripBackupV3>(s.baseUrl, `${url}/backup`, { headers: { cookie } });
  return { ...s, fetchRate, cookie, request, url, input, backup };
}

test(
  "dated Visa base snapshots survive reads, amount edits, history, CSV, and offline backup restore",
  postgresTestOptions,
  async () => {
    const s = await setup();
    const first = await s.request(`${s.url}/expenses`, "POST", s.input);
    expect(first.response.status).toBe(201);
    const original = first.data.trip.expenses[0];
    expect(original.exchangeRate).toMatchObject({
      source: "visa",
      provider: "VISA",
      rateToBase: 32,
      date: s.input.expenseDate,
    });
    const later = await s.request(`${s.url}/expenses`, "POST", {
      ...s.input,
      expenseDate: "2026-07-06",
    });
    expect(later.response.status).toBe(201);
    expect(
      later.data.trip.expenses.find((e) => e.id !== original.id)?.exchangeRate
        ?.rateToBase,
    ).toBe(40);
    expect(s.fetchRate).toHaveBeenCalledTimes(2);
    const described = await s.request(
      `${s.url}/expenses/${original.id}`,
      "PATCH",
      { description: "Edited" },
      original.version,
    );
    const edited = described.data.trip.expenses.find(
      (e) => e.id === original.id,
    );
    expect(edited).toBeDefined();
    const reamounted = await s.request(
      `${s.url}/expenses/${original.id}`,
      "PATCH",
      { amount: "2" },
      edited?.version,
    );
    expect(reamounted.response.status).toBe(200);
    const current = reamounted.data.trip.expenses.find(
      (e) => e.id === original.id,
    );
    expect(current?.exchangeRate).toEqual(original.exchangeRate);
    const reread = await s.request(s.url);
    expect(reread.data.balances).toEqual(reamounted.data.balances);
    expect(s.fetchRate).toHaveBeenCalledTimes(2);
    const redated = await s.request(
      `${s.url}/expenses/${original.id}`,
      "PATCH",
      { expenseDate: "2026-07-07" },
      current?.version,
    );
    expect(redated.response.status).toBe(200);
    expect(
      redated.data.trip.expenses.find((e) => e.id === original.id)
        ?.exchangeRate,
    ).toMatchObject({ date: "2026-07-07", rateToBase: 55 });
    const imported = await s.request(`${s.url}/expenses/import`, "POST", {
      csv: "date,description,amount,currency,paid_by,split_participants\n2026-07-08,Imported,1,USD,Owner,Owner",
    });
    expect(imported.response.status).toBe(201);
    const history = await api<unknown>(
      s.baseUrl,
      `${s.url}/expense-history?expenseId=${original.id}`,
      { headers: { cookie: s.cookie } },
    );
    const revisions = parseExpenseHistoryPage(history.data).revisions;
    const oldest = revisions.find((r) => r.version === 1);
    expect(oldest?.snapshot.expense.exchangeRate).toEqual(
      original.exchangeRate,
    );
    const saved = await s.backup();
    expect(saved.data.version).toBe(3);
    s.fetchRate.mockRejectedValue(new Error("No network allowed"));
    const calls = s.fetchRate.mock.calls.length;
    const restored = await s.request("/api/trips/restore", "POST", saved.data);
    expect(restored.response.status).toBe(201);
    expect(restored.data.trip.expenses.map((e) => e.exchangeRate)).toEqual(
      saved.data.trip.expenses.map((e) => e.exchangeRate),
    );
    expect(s.fetchRate).toHaveBeenCalledTimes(calls);
    const selected = redated.data.trip.expenses.find(
      (e) => e.id === original.id,
    );
    const reverted = await s.request(
      `${s.url}/expenses/${original.id}/restore`,
      "POST",
      { revisionId: oldest?.id },
      selected?.version,
    );
    expect(reverted.response.status).toBe(200);
    expect(
      reverted.data.trip.expenses.find((e) => e.id === original.id)
        ?.exchangeRate,
    ).toEqual(original.exchangeRate);
    expect(s.fetchRate).toHaveBeenCalledTimes(calls);
  },
);

test(
  "missing dates fail atomically; manual rates affect only new general snapshots",
  postgresTestOptions,
  async () => {
    const s = await setup();
    const first = await s.request(`${s.url}/expenses`, "POST", s.input);
    const original = first.data.trip.expenses[0];
    s.fetchRate.mockRejectedValue(new Error("Unavailable"));
    const failed = await s.request(`${s.url}/expenses`, "POST", {
      ...s.input,
      expenseDate: "2026-07-09",
    });
    expect(failed.response.status).toBe(502);
    const changed = await s.request(
      `${s.url}/expenses/${original.id}`,
      "PATCH",
      { expenseDate: "2026-07-09" },
      original.version,
    );
    expect(changed.response.status).toBe(502);
    const imported = await s.request(`${s.url}/expenses/import`, "POST", {
      csv: "date,description,amount,currency,paid_by,split_participants\n2026-07-05,Known,1,USD,Owner,Owner\n2026-07-09,Missing,1,USD,Owner,Owner",
    });
    expect(imported.response.status).toBe(502);
    expect((await s.request(s.url)).data.trip.expenses).toEqual(
      first.data.trip.expenses,
    );
    expect(
      (await s.pool.query("SELECT count(*)::int AS n FROM expense_revisions"))
        .rows[0].n,
    ).toBe(1);
    expect(
      (await s.request(s.url, "PATCH", { exchangeRates: { USD: 42 } })).response
        .status,
    ).toBe(200);
    const manual = await s.request(`${s.url}/expenses`, "POST", {
      ...s.input,
      expenseDate: "2026-07-09",
    });
    expect(manual.response.status).toBe(201);
    expect(
      manual.data.trip.expenses.find((e) => e.id !== original.id)?.exchangeRate,
    ).toMatchObject({ source: "custom", rateToBase: 42 });
    expect(
      manual.data.trip.expenses.find((e) => e.id === original.id)?.exchangeRate,
    ).toEqual(original.exchangeRate);
    const stale = await s.request(s.url, "PATCH", {
      exchangeRates: { USD: 99 },
      rateBaseCurrency: "JPY",
    });
    expect(stale.response.status).toBe(409);
    expect((await s.request(s.url)).data.trip.exchangeRates?.USD).toBe(42);
  },
);

test(
  "group base changes preserve original rates and save dated bridges with restorable history",
  postgresTestOptions,
  async () => {
    const s = await setup();
    const first = await s.request(`${s.url}/expenses`, "POST", s.input);
    const original = first.data.trip.expenses[0];
    const rebased = await s.request(s.url, "PATCH", { baseCurrency: "EUR" });
    expect(rebased.response.status).toBe(200);
    const changed = rebased.data.trip.expenses[0];
    expect(changed.exchangeRate).toEqual(original.exchangeRate);
    expect(changed.exchangeRateBridge).toMatchObject({
      sourceCurrency: "TWD",
      baseCurrency: "EUR",
      source: "visa",
      date: s.input.expenseDate,
    });
    const backup = await s.backup();
    const calls = s.fetchRate.mock.calls.length;
    s.fetchRate.mockRejectedValue(new Error("Offline"));
    const restored = await s.request("/api/trips/restore", "POST", backup.data);
    expect(restored.response.status).toBe(201);
    expect(restored.data.trip.expenses[0].exchangeRateBridge).toEqual(
      changed.exchangeRateBridge,
    );
    expect(restored.data.balances.map((b) => b.amountMinor)).toEqual(
      rebased.data.balances.map((b) => b.amountMinor),
    );
    expect(s.fetchRate).toHaveBeenCalledTimes(calls);
    const history = await api<unknown>(
      s.baseUrl,
      `${s.url}/expense-history?expenseId=${original.id}`,
      { headers: { cookie: s.cookie } },
    );
    const oldest = parseExpenseHistoryPage(history.data).revisions.find(
      (r) => r.version === 1,
    );
    expect(oldest?.snapshot.expense.exchangeRateBridge).toBeUndefined();
    const reverted = await s.request(
      `${s.url}/expenses/${original.id}/restore`,
      "POST",
      { revisionId: oldest?.id },
      changed.version,
    );
    expect(reverted.response.status).toBe(200);
    expect(
      parseTripPayload(reverted.data).trip.expenses[0].exchangeRate,
    ).toEqual(original.exchangeRate);
    const failed = await s.request(s.url, "PATCH", { baseCurrency: "JPY" });
    expect(failed.response.status).toBe(502);
    expect((await s.request(s.url)).data.trip.baseCurrency).toBe("EUR");
  },
);

test(
  "v3 backups reject missing bridges, stale dates and unsafe conversions before inserting a group",
  postgresTestOptions,
  async () => {
    const s = await setup();
    await s.request(`${s.url}/expenses`, "POST", s.input);
    const backup = (await s.backup()).data;
    const count = (await s.pool.query("SELECT count(*)::int AS n FROM trips"))
      .rows[0].n;
    for (const invalid of [
      { ...backup, trip: { ...backup.trip, baseCurrency: "EUR" } },
      {
        ...backup,
        trip: {
          ...backup.trip,
          expenses: backup.trip.expenses.map((e) => ({
            ...e,
            expenseDate: "2026-07-06",
          })),
        },
      },
      {
        ...backup,
        trip: {
          ...backup.trip,
          expenses: backup.trip.expenses.map((e) => ({
            ...e,
            amountMinor: Number.MAX_SAFE_INTEGER,
            exchangeRate: { ...e.exchangeRate, rateToBase: 1e20 },
          })),
        },
      },
    ]) {
      expect(
        (await s.request("/api/trips/restore", "POST", invalid)).response
          .status,
      ).toBe(400);
    }
    expect(
      (await s.pool.query("SELECT count(*)::int AS n FROM trips")).rows[0].n,
    ).toBe(count);
  },
);

test(
  "old bank snapshots remain readable and amount-only edits do not replace them",
  postgresTestOptions,
  async () => {
    const s = await setup();
    const first = await s.request(`${s.url}/expenses`, "POST", s.input);
    const original = first.data.trip.expenses[0];
    const bank = {
      baseCurrency: "TWD",
      source: "bank",
      provider: "BANK_OF_TAIWAN",
      rateType: "spotMid",
      rateToBase: 31,
      fetchedAt: "2026-07-05T00:00:00Z",
    };
    await s.pool.query("UPDATE expenses SET exchange_rate = $2 WHERE id = $1", [
      original.id,
      bank,
    ]);
    await s.pool.query(
      "UPDATE expense_revisions SET snapshot = jsonb_set(snapshot, '{expense,exchangeRate}', $2) WHERE expense_id = $1",
      [original.id, bank],
    );
    s.fetchRate.mockRejectedValue(new Error("Offline"));
    const calls = s.fetchRate.mock.calls.length;
    const updated = await s.request(
      `${s.url}/expenses/${original.id}`,
      "PATCH",
      { amount: "2" },
      original.version,
    );
    expect(updated.response.status).toBe(200);
    expect(updated.data.trip.expenses[0].exchangeRate).toEqual(bank);
    expect(s.fetchRate).toHaveBeenCalledTimes(calls);
    const backup = await s.backup();
    expect(backup.data.trip.expenses[0].exchangeRate).toEqual(bank);
  },
);

test(
  "v1 restore uses database-rounded custom rates, and v2 rates restore without a live quote",
  postgresTestOptions,
  async () => {
    const s = await setup();
    await s.request(`${s.url}/expenses`, "POST", s.input);
    const saved = (await s.backup()).data;
    const legacy = {
      ...saved,
      version: 1,
      trip: {
        ...saved.trip,
        exchangeRates: { USD: 31.123456789 },
        expenses: saved.trip.expenses.map(({ exchangeRate: _rate, ...e }) => e),
      },
    };
    const restored = await s.request("/api/trips/restore", "POST", legacy);
    expect(restored.response.status).toBe(201);
    expect(restored.data.trip.expenses[0].exchangeRate).toMatchObject({
      source: "legacy",
      rateToBase: 31.12345679,
    });
    const v2 = { ...saved, version: 2 };
    s.fetchRate.mockRejectedValue(new Error("No provider"));
    const copied = await s.request("/api/trips/restore", "POST", v2);
    expect(copied.response.status).toBe(201);
    expect(copied.data.trip.expenses[0].exchangeRate).toEqual(
      saved.trip.expenses[0].exchangeRate,
    );
  },
);

test(
  "v1 restore ignores unrecognized newer expense and payment rate fields",
  postgresTestOptions,
  async () => {
    const s = await setup();
    await s.request(`${s.url}/expenses`, "POST", s.input);
    const saved = (await s.backup()).data;
    const legacy = {
      ...saved,
      version: 1,
      trip: {
        ...saved.trip,
        baseCurrency: "JPY",
        exchangeRates: { USD: 150 },
        participants: [
          ...saved.trip.participants,
          { id: "friend", name: "Friend" },
        ],
        expenses: saved.trip.expenses.map((expense) => ({
          ...expense,
          exchangeRateBridge: {
            sourceCurrency: "TWD",
            baseCurrency: "JPY",
            rateToBase: 5,
            source: "legacy",
          },
        })),
        settlementPayments: [
          {
            id: "payment",
            fromId: saved.trip.participants[0].id,
            toId: "friend",
            amountMinor: 100,
            currency: "USD",
            paidAt: "2026-07-05",
            note: "",
            createdAt: "2026-07-05T00:00:00Z",
            exchangeRate: { invalid: true },
            exchangeRateBridge: { invalid: true },
          },
        ],
      },
    };
    const restored = await s.request("/api/trips/restore", "POST", legacy);
    expect(restored.response.status).toBe(201);
    expect(restored.data.trip.expenses[0].exchangeRate).toMatchObject({
      source: "legacy",
      baseCurrency: "JPY",
      rateToBase: 150,
    });
    expect(restored.data.trip.expenses[0].exchangeRateBridge).toBeUndefined();
    expect(
      restored.data.trip.settlementPayments?.[0].exchangeRate,
    ).toMatchObject({ source: "legacy", baseCurrency: "JPY", rateToBase: 150 });
    expect(
      restored.data.trip.settlementPayments?.[0].exchangeRateBridge,
    ).toBeUndefined();
    expect(
      restored.data.balances.map((balance) => balance.amountMinor),
    ).toEqual([150, -150]);
  },
);

test.each(["expense", "payment"])(
  "database rounding cannot make an unsafe v1 %s import commit a partial group",
  postgresTestOptions,
  async (kind) => {
    const s = await setup();
    await s.request(`${s.url}/expenses`, "POST", s.input);
    const saved = (await s.backup()).data;
    const before = (await s.pool.query("SELECT count(*)::int AS n FROM trips"))
      .rows[0].n;
    const amountMinor = Math.floor(Number.MAX_SAFE_INTEGER / 1.000000008);
    const legacy = {
      ...saved,
      version: 1,
      trip: {
        ...saved.trip,
        participants: [
          ...saved.trip.participants,
          { id: "friend", name: "Friend" },
        ],
        exchangeRates: { JPY: 1.000000006 },
        expenses:
          kind === "expense"
            ? saved.trip.expenses.map((expense) => ({
                ...expense,
                currency: "JPY",
                amountMinor,
              }))
            : [],
        settlementPayments:
          kind === "payment"
            ? [
                {
                  id: "payment",
                  fromId: saved.trip.participants[0].id,
                  toId: "friend",
                  amountMinor,
                  currency: "JPY",
                  paidAt: "2026-07-05",
                  note: "",
                  createdAt: "2026-07-05T00:00:00Z",
                },
              ]
            : [],
      },
    };
    expect(
      (await s.request("/api/trips/restore", "POST", legacy)).response.status,
    ).toBe(400);
    expect(
      (await s.pool.query("SELECT count(*)::int AS n FROM trips")).rows[0].n,
    ).toBe(before);
  },
);
