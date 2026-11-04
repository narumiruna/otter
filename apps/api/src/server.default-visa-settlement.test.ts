import {
  expenseIfMatch,
  parseTripPayload,
  type TripPayload,
} from "@narumitw/otter-contracts";
import type { TripBackupV3 } from "@narumitw/otter-core/backup";
import { type Currency, currencies } from "@narumitw/otter-core/money";
import { expect, test, vi } from "vitest";
import { createSession } from "./server-support.js";
import {
  api,
  postgresTestOptions,
  testVisaRate,
  withTestApp,
} from "./server-test-utils.js";

async function setup(baseCurrency: Currency = "TWD") {
  const fetchRate = vi.fn(testVisaRate);
  const app = await withTestApp({
    appOptions: { visaSettlement: { fetchRate } },
    prepare: async (pool) => {
      await pool.query(
        "INSERT INTO users (id,name,username,password_hash) VALUES ('owner','Alice','owner','unused')",
      );
    },
  });
  const cookie = `otter_session=${(await createSession(app.pool, "owner")).id}`;
  const request = (
    path: string,
    method = "GET",
    body?: object,
    version?: number,
  ) =>
    api<TripPayload & { error?: string }>(app.baseUrl, path, {
      method,
      headers: {
        cookie,
        ...(version ? { "If-Match": expenseIfMatch(version) } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  const created = await request("/api/trips", "POST", {
    name: "Japan",
    baseCurrency,
  });
  expect(created.response.status).toBe(201);
  const path = `/api/trips/${created.data.trip.id}`;
  const added = await request(`${path}/participants`, "POST", { name: "Bob" });
  const [alice, bob] = added.data.trip.participants;
  const input = {
    description: "Dinner",
    amount: "1",
    currency: "USD",
    expenseDate: "2026-07-05",
    paidById: alice.id,
    participantIds: [alice.id, bob.id],
  };
  const revisionCount = async () =>
    Number(
      (
        await app.pool.query<{ count: string }>(
          "SELECT count(*) FROM expense_revisions WHERE trip_id = $1",
          [created.data.trip.id],
        )
      ).rows[0].count,
    );
  return {
    ...app,
    cookie,
    request,
    path,
    created: created.data,
    input,
    fetchRate,
    revisionCount,
  };
}

test(
  "new groups persist enabled settlements in their base currency without requesting rates",
  postgresTestOptions,
  async () => {
    const s = await setup();
    for (const baseCurrency of [undefined, ...currencies]) {
      const result = await s.request("/api/trips", "POST", {
        name: `Default ${baseCurrency ?? "omitted"}`,
        ...(baseCurrency ? { baseCurrency } : {}),
      });
      expect(result.response.status).toBe(201);
      const trip = parseTripPayload(result.data).trip;
      expect(trip.visaSettlementEnabled).toBe(true);
      expect(trip.visaSettlementCurrency).toBe(baseCurrency ?? "TWD");
      const row = (
        await s.pool.query(
          "SELECT visa_settlement_enabled, visa_settlement_currency FROM trips WHERE id = $1",
          [trip.id],
        )
      ).rows[0];
      expect(row).toEqual({
        visa_settlement_enabled: true,
        visa_settlement_currency: trip.baseCurrency,
      });
      expect(
        parseTripPayload((await s.request(`/api/trips/${trip.id}`)).data).trip,
      ).toMatchObject({
        visaSettlementEnabled: true,
        visaSettlementCurrency: trip.baseCurrency,
      });
    }
    expect(s.fetchRate).not.toHaveBeenCalled();
  },
);

test(
  "same-target settlements reuse base rates through edits, settings, payments, copies, and offline backup restores",
  postgresTestOptions,
  async () => {
    const s = await setup();
    const created = await s.request(`${s.path}/expenses`, "POST", s.input);
    expect(created.response.status).toBe(201);
    expect(s.fetchRate).toHaveBeenCalledTimes(1);
    expect(s.fetchRate).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "USD",
        target: "TWD",
        date: s.input.expenseDate,
      }),
    );
    const expense = parseTripPayload(created.data).trip.expenses[0];
    expect(expense.visaExchangeRate).toBeUndefined();
    expect(created.data.settlements[0]).toMatchObject({
      currency: "TWD",
      amountMinor: 16,
    });
    s.fetchRate.mockRejectedValue(new Error("Visa unavailable"));
    const edited = await s.request(
      `${s.path}/expenses/${expense.id}`,
      "PATCH",
      { amount: "2" },
      expense.version,
    );
    expect(edited.response.status).toBe(200);
    expect(edited.data.settlements[0].amountMinor).toBe(32);
    const count = await s.revisionCount();
    for (const enabled of [false, true]) {
      const changed = await s.request(`${s.path}/visa-settlement`, "PATCH", {
        enabled,
        currency: "TWD",
      });
      expect(changed.response.status).toBe(200);
      expect(changed.data.trip.expenses).toEqual(edited.data.trip.expenses);
    }
    expect(await s.revisionCount()).toBe(count);
    const payment = {
      fromId: s.input.participantIds[1],
      toId: s.input.paidById,
      amount: "10",
      paidAt: s.input.expenseDate,
    };
    expect(
      (
        await s.request(`${s.path}/settlement-payments`, "POST", {
          ...payment,
          currency: "USD",
        })
      ).response.status,
    ).toBe(400);
    const paid = await s.request(
      `${s.path}/settlement-payments`,
      "POST",
      payment,
    );
    expect(paid.response.status).toBe(201);
    expect(paid.data.settlements[0]).toMatchObject({
      currency: "TWD",
      amountMinor: 22,
    });
    const backup = await api<TripBackupV3>(s.baseUrl, `${s.path}/backup`, {
      headers: { cookie: s.cookie },
    });
    const restored = await s.request("/api/trips/restore", "POST", backup.data);
    expect(restored.response.status).toBe(201);
    expect(parseTripPayload(restored.data).trip.visaSettlementEnabled).toBe(
      true,
    );
    expect(restored.data.trip.expenses[0].visaExchangeRate).toBeUndefined();
    expect(restored.data.balances.map((b) => b.amountMinor)).toEqual(
      paid.data.balances.map((b) => b.amountMinor),
    );
    const copied = await s.request(`${s.path}/copy`, "POST");
    expect(copied.response.status).toBe(201);
    expect(copied.data.trip).toMatchObject({
      visaSettlementEnabled: true,
      visaSettlementCurrency: "TWD",
      expenses: [],
    });
    const legacy = {
      ...backup.data,
      trip: {
        ...backup.data.trip,
        visaSettlementEnabled: undefined,
        visaSettlementCurrency: undefined,
      },
    };
    const old = await s.request("/api/trips/restore", "POST", legacy);
    expect(old.response.status).toBe(201);
    expect(old.data.trip.visaSettlementEnabled).toBe(false);
    const oldCopy = await s.request(
      `/api/trips/${old.data.trip.id}/copy`,
      "POST",
    );
    expect(oldCopy.data.trip.visaSettlementEnabled).toBe(false);
    expect(s.fetchRate).toHaveBeenCalledTimes(1);
  },
);

test(
  "enabling same-target settlements reuses existing custom rates with no provider or history changes",
  postgresTestOptions,
  async () => {
    const s = await setup();
    s.fetchRate.mockRejectedValue(new Error("Unavailable"));
    await s.request(s.path, "PATCH", { exchangeRates: { USD: 30 } });
    const created = await s.request(`${s.path}/expenses`, "POST", s.input);
    expect(created.response.status).toBe(201);
    expect(created.data.trip.expenses[0].exchangeRate?.source).toBe("custom");
    const revisions = await s.revisionCount();
    await s.request(`${s.path}/visa-settlement`, "PATCH", { enabled: false });
    const enabled = await s.request(`${s.path}/visa-settlement`, "PATCH", {
      enabled: true,
    });
    expect(enabled.response.status).toBe(200);
    expect(enabled.data.settlements).toEqual(created.data.settlements);
    expect(enabled.data.trip.expenses).toEqual(created.data.trip.expenses);
    expect(await s.revisionCount()).toBe(revisions);
    expect(s.fetchRate).not.toHaveBeenCalled();
  },
);

test(
  "base-currency changes prepare newly separate settlement snapshots and reuse them when targets match again",
  postgresTestOptions,
  async () => {
    const s = await setup();
    const created = await s.request(`${s.path}/expenses`, "POST", s.input);
    expect(created.response.status).toBe(201);
    const rebased = await s.request(s.path, "PATCH", { baseCurrency: "EUR" });
    expect(rebased.response.status).toBe(200);
    expect(parseTripPayload(rebased.data).trip).toMatchObject({
      baseCurrency: "EUR",
      visaSettlementCurrency: "TWD",
    });
    expect(rebased.data.trip.expenses[0].visaExchangeRate).toMatchObject({
      targetCurrency: "TWD",
      rate: 32,
    });
    expect(rebased.data.settlements).toEqual(created.data.settlements);
    const calls = s.fetchRate.mock.calls.length;
    s.fetchRate.mockRejectedValue(new Error("Unavailable"));
    const same = await s.request(`${s.path}/visa-settlement`, "PATCH", {
      enabled: true,
      currency: "EUR",
    });
    expect(same.response.status).toBe(200);
    expect(
      parseTripPayload(same.data).trip.expenses[0].visaExchangeRate
        ?.targetCurrency,
    ).toBe("TWD");
    const selectedAgain = await s.request(
      `${s.path}/visa-settlement`,
      "PATCH",
      {
        enabled: true,
        currency: "TWD",
      },
    );
    expect(selectedAgain.response.status).toBe(200);
    const sameAgain = await s.request(s.path, "PATCH", { baseCurrency: "TWD" });
    expect(sameAgain.response.status).toBe(200);
    expect(s.fetchRate).toHaveBeenCalledTimes(calls);
  },
);

test(
  "missing newly required Visa rates leave settings and revisions unchanged",
  postgresTestOptions,
  async () => {
    const s = await setup();
    await s.request(s.path, "PATCH", { exchangeRates: { USD: 30 } });
    await s.request(`${s.path}/expenses`, "POST", s.input);
    const before = parseTripPayload((await s.request(s.path)).data);
    const revisions = await s.revisionCount();
    s.fetchRate.mockImplementation(async (query) => {
      if (query.source === "USD" && query.target === "TWD")
        throw new Error("Unavailable settlement rate");
      return testVisaRate(query);
    });
    const failed = await s.request(s.path, "PATCH", { baseCurrency: "EUR" });
    expect(failed.response.status).toBe(502);
    expect((await s.request(s.path)).data).toEqual(before);
    expect(await s.revisionCount()).toBe(revisions);
  },
);

test(
  "concurrent expense creation during rebase prefetch cannot commit incomplete settlement snapshots",
  postgresTestOptions,
  async () => {
    const s = await setup();
    await s.request(s.path, "PATCH", { exchangeRates: { USD: 30 } });
    await s.request(`${s.path}/expenses`, "POST", s.input);
    let before: TripPayload | undefined;
    let revisions = 0;
    s.fetchRate.mockImplementationOnce(async (query) => {
      const added = await s.request(`${s.path}/expenses`, "POST", {
        ...s.input,
        description: "Concurrent",
        expenseDate: "2026-07-06",
      });
      expect(added.response.status).toBe(201);
      before = (await s.request(s.path)).data;
      revisions = await s.revisionCount();
      return testVisaRate(query);
    });
    const failed = await s.request(s.path, "PATCH", { baseCurrency: "EUR" });
    expect(failed.response.status).toBe(502);
    expect((await s.request(s.path)).data).toEqual(before);
    expect(await s.revisionCount()).toBe(revisions);
  },
);

test(
  "retained same-target Visa rates preserve amounts and reject unsafe edits or activation before commit",
  postgresTestOptions,
  async () => {
    const s = await setup();
    const first = await s.request(`${s.path}/expenses`, "POST", s.input);
    const expense = first.data.trip.expenses[0];
    const saved = {
      sourceCurrency: "USD",
      targetCurrency: "TWD",
      date: s.input.expenseDate,
      rate: 1e15,
      fetchedAt: "2026-07-05T00:00:00Z",
    };
    await s.pool.query(
      "UPDATE expenses SET visa_exchange_rate = $2 WHERE id = $1",
      [expense.id, saved],
    );
    const historical = parseTripPayload((await s.request(s.path)).data);
    expect(historical.settlements[0].amountMinor).toBe(5e14);
    const count = await s.revisionCount();
    const rejected = await s.request(
      `${s.path}/expenses/${expense.id}`,
      "PATCH",
      { amount: "10" },
      expense.version,
    );
    expect(rejected.response.status).toBe(502);
    expect((await s.request(s.path)).data).toEqual(historical);
    expect(await s.revisionCount()).toBe(count);
    const disabled = await s.request(`${s.path}/visa-settlement`, "PATCH", {
      enabled: false,
    });
    expect(disabled.response.status).toBe(200);
    const edited = await s.request(
      `${s.path}/expenses/${expense.id}`,
      "PATCH",
      { amount: "10" },
      expense.version,
    );
    expect(edited.response.status).toBe(200);
    const editedCount = await s.revisionCount();
    const activation = await s.request(`${s.path}/visa-settlement`, "PATCH", {
      enabled: true,
    });
    expect(activation.response.status).toBe(502);
    expect((await s.request(s.path)).data).toEqual(edited.data);
    expect(await s.revisionCount()).toBe(editedCount);
    expect(s.fetchRate).toHaveBeenCalledTimes(1);
  },
);
