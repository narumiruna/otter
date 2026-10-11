import {
  expenseIfMatch,
  parseExpenseHistoryPage,
  parseTripPayload,
  type TripPayload,
} from "@narumitw/otter-contracts";
import type { TripBackupV2 } from "@narumitw/otter-core/backup";
import type { VisaRateQuery } from "@narumitw/otter-visa-exchange-rates";
import { expect, test, vi } from "vitest";
import { createSession } from "./server-support.js";
import { api, postgresTestOptions, withTestApp } from "./server-test-utils.js";

const quote = (query: VisaRateQuery) => ({
  source: query.source,
  target: query.target,
  date: query.date ?? "2026-07-05",
  amount: 1,
  bankFeePercent: 0,
  visaRate: query.date === "2026-07-06" ? 0.22 : 0.2,
  rate: query.date === "2026-07-06" ? 0.22 : 0.2,
  convertedAmount: 0.2,
  fetchedAt: "2026-07-07T00:00:00Z",
});

async function setup(
  fetchRate = vi.fn(async (query: VisaRateQuery) => quote(query)),
) {
  const app = await withTestApp({
    appOptions: { visaSettlement: { fetchRate } },
    prepare: async (pool) => {
      await pool.query(
        "INSERT INTO users (id,name,username,password_hash) VALUES ('owner','Alice','owner','unused'), ('editor','Editor','editor','unused')",
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
    name: "Tokyo Visa",
    baseCurrency: "JPY",
  });
  expect(created.response.status).toBe(201);
  const path = `/api/trips/${created.data.trip.id}`;
  const people = await request(`${path}/participants`, "POST", { name: "Bob" });
  const [alice, bob] = people.data.trip.participants;
  const input = {
    description: "Dinner",
    amount: "1000",
    currency: "JPY",
    expenseDate: "2026-07-05",
    paidById: alice.id,
    participantIds: [alice.id, bob.id],
  };
  return { ...app, cookie, path, request, input, fetchRate };
}

test(
  "Visa mode converts dated expenses and preserves snapshots through edits, payments, history, and backups",
  postgresTestOptions,
  async () => {
    const s = await setup();
    const first = await s.request(`${s.path}/expenses`, "POST", s.input);
    expect(first.data.trip.visaSettlementEnabled).toBe(false);
    expect(first.data.settlements[0]).toMatchObject({
      currency: "JPY",
      amountMinor: 500,
    });
    expect(s.fetchRate).not.toHaveBeenCalled();
    const id = first.data.trip.expenses[0].id;
    const enabled = await s.request(`${s.path}/visa-settlement`, "PATCH", {
      enabled: true,
      currency: "TWD",
    });
    expect(enabled.response.status).toBe(200);
    expect(parseTripPayload(enabled.data).trip.baseCurrency).toBe("JPY");
    expect(enabled.data.settlements[0]).toMatchObject({
      currency: "TWD",
      amountMinor: 100,
    });
    const snap = enabled.data.trip.expenses[0].visaExchangeRate;
    expect(snap).toMatchObject({
      sourceCurrency: "JPY",
      targetCurrency: "TWD" as const,
      date: "2026-07-05",
      rate: 0.2,
    });
    expect(enabled.data.trip.expenses[0].exchangeRate).toEqual(
      first.data.trip.expenses[0].exchangeRate,
    );
    expect(s.fetchRate).toHaveBeenCalledWith({
      source: "JPY",
      target: "TWD",
      date: "2026-07-05",
    });
    const described = await s.request(
      `${s.path}/expenses/${id}`,
      "PATCH",
      { description: "Lunch" },
      enabled.data.trip.expenses[0].version,
    );
    expect(described.data.trip.expenses[0].visaExchangeRate).toEqual(snap);
    const reamounted = await s.request(
      `${s.path}/expenses/${id}`,
      "PATCH",
      { amount: "2000" },
      described.data.trip.expenses[0].version,
    );
    expect(reamounted.data.trip.expenses[0].visaExchangeRate).toEqual(snap);
    expect(reamounted.data.settlements[0].amountMinor).toBe(200);
    expect(s.fetchRate).toHaveBeenCalledTimes(1);
    const second = await s.request(`${s.path}/expenses`, "POST", {
      ...s.input,
      expenseDate: "2026-07-06",
      description: "Train",
    });
    expect(second.response.status).toBe(201);
    expect(second.data.settlements[0].amountMinor).toBe(310);
    const redated = await s.request(
      `${s.path}/expenses/${id}`,
      "PATCH",
      { expenseDate: "2026-07-06" },
      reamounted.data.trip.expenses[0].version,
    );
    expect(redated.data.trip.expenses[0].visaExchangeRate?.rate).toBe(0.22);
    expect(redated.data.settlements[0].amountMinor).toBe(330);
    const invalidPayment = await s.request(
      `${s.path}/settlement-payments`,
      "POST",
      {
        fromId: s.input.participantIds[1],
        toId: s.input.paidById,
        amount: "1",
        currency: "JPY",
      },
    );
    expect(invalidPayment.response.status).toBe(400);
    const payment = await s.request(`${s.path}/settlement-payments`, "POST", {
      fromId: s.input.participantIds[1],
      toId: s.input.paidById,
      amount: "100",
    });
    expect(payment.response.status).toBe(201);
    expect(payment.data.trip.settlementPayments?.[0].currency).toBe("TWD");
    expect(payment.data.settlements[0].amountMinor).toBe(230);

    const history = await api<unknown>(
      s.baseUrl,
      `${s.path}/expense-history?expenseId=${id}`,
      { headers: { cookie: s.cookie } },
    );
    const page = parseExpenseHistoryPage(history.data);
    expect(
      page.revisions.some(
        (r) =>
          r.source === "visa_settlement" &&
          r.changedFields.includes("visaExchangeRate"),
      ),
    ).toBe(true);
    const previous = page.revisions.find((r) => r.source === "visa_settlement");
    expect(previous).toBeDefined();
    const restored = await s.request(
      `${s.path}/expenses/${id}/restore`,
      "POST",
      { revisionId: previous?.id },
      redated.data.trip.expenses[0].version,
    );
    expect(restored.response.status).toBe(200);
    expect(restored.data.trip.expenses[0].visaExchangeRate).toEqual(snap);
    const backup = await api<TripBackupV2>(s.baseUrl, `${s.path}/backup`, {
      headers: { cookie: s.cookie },
    });
    expect(backup.data.trip.visaSettlementEnabled).toBe(true);
    expect(backup.data.trip.expenses[0].visaExchangeRate).toEqual(snap);
    s.fetchRate.mockRejectedValue(new Error("Visa unavailable"));
    const roundTrip = await s.request("/api/trips/restore", "POST", {
      backup: backup.data,
    });
    expect(roundTrip.response.status).toBe(201);
    expect(parseTripPayload(roundTrip.data).trip.visaSettlementEnabled).toBe(
      true,
    );
    expect(roundTrip.data.trip.expenses[0].visaExchangeRate).toEqual(snap);
    expect(roundTrip.data.balances.map((b) => b.amountMinor)).toEqual(
      restored.data.balances.map((b) => b.amountMinor),
    );
    const reads = await s.request(s.path);
    expect(reads.data.settlements).toEqual(restored.data.settlements);
    const disabled = await s.request(`${s.path}/visa-settlement`, "PATCH", {
      enabled: false,
      currency: "TWD",
    });
    expect(disabled.data.trip.visaSettlementEnabled).toBe(false);
    expect(disabled.data.trip.expenses[0].visaExchangeRate).toEqual(snap);
    expect(disabled.data.balances[0].currency).toBe("JPY");
    const reenabled = await s.request(`${s.path}/visa-settlement`, "PATCH", {
      enabled: true,
      currency: "TWD",
    });
    expect(reenabled.response.status).toBe(200);
    expect(reenabled.data.settlements).toEqual(restored.data.settlements);
  },
);

test(
  "Visa failures roll back enabling, new expenses, and date edits without fallback",
  postgresTestOptions,
  async () => {
    const s = await setup();
    const first = await s.request(`${s.path}/expenses`, "POST", s.input);
    s.fetchRate.mockRejectedValue(new Error("Blocked"));
    expect(
      (
        await s.request(`${s.path}/visa-settlement`, "PATCH", {
          enabled: true,
          currency: "TWD",
        })
      ).response.status,
    ).toBe(502);
    const unchanged = await s.request(s.path);
    expect(unchanged.data.trip.visaSettlementEnabled).toBe(false);
    expect(unchanged.data.trip.expenses[0].visaExchangeRate).toBeUndefined();
    s.fetchRate.mockImplementation(async (query) => quote(query));
    const enabled = await s.request(`${s.path}/visa-settlement`, "PATCH", {
      enabled: true,
      currency: "TWD",
    });
    s.fetchRate.mockRejectedValue(new Error("Blocked"));
    const edit = await s.request(
      `${s.path}/expenses/${first.data.trip.expenses[0].id}`,
      "PATCH",
      { expenseDate: "2026-07-08" },
      enabled.data.trip.expenses[0].version,
    );
    expect(edit.response.status).toBe(400);
    expect(
      (
        await s.request(`${s.path}/expenses`, "POST", {
          ...s.input,
          expenseDate: "2026-07-08",
        })
      ).response.status,
    ).toBe(400);
    const current = await s.request(s.path);
    expect(current.data.trip.expenses).toEqual(enabled.data.trip.expenses);
    expect(current.data.settlements).toEqual(enabled.data.settlements);
    expect(
      (
        await s.request(`${s.path}/expenses`, "POST", {
          ...s.input,
          currency: "TWD",
          amount: "100",
        })
      ).response.status,
    ).toBe(201);
  },
);

test(
  "Visa settings enforce owner, archived, payment, and boolean guards",
  postgresTestOptions,
  async () => {
    const s = await setup();
    expect(
      (
        await s.request(`${s.path}/visa-settlement`, "PATCH", {
          enabled: "yes",
        })
      ).response.status,
    ).toBe(400);
    await s.pool.query(
      "INSERT INTO trip_members (id,trip_id,user_id,role) VALUES ('editor-member',$1,'editor','editor')",
      [s.path.split("/").pop()],
    );
    const cookie = `otter_session=${(await createSession(s.pool, "editor")).id}`;
    expect(
      (
        await api(s.baseUrl, `${s.path}/visa-settlement`, {
          method: "PATCH",
          headers: { cookie },
          body: JSON.stringify({ enabled: true, currency: "TWD" }),
        })
      ).response.status,
    ).toBe(403);
    expect(s.fetchRate).not.toHaveBeenCalled();
    const payment = await s.request(`${s.path}/settlement-payments`, "POST", {
      fromId: s.input.participantIds[1],
      toId: s.input.paidById,
      amount: "1",
      currency: "JPY",
    });
    expect(
      (
        await s.request(`${s.path}/visa-settlement`, "PATCH", {
          enabled: true,
          currency: "TWD",
        })
      ).response.status,
    ).toBe(400);
    await s.request(
      `${s.path}/settlement-payments/${payment.data.trip.settlementPayments?.[0].id}`,
      "DELETE",
    );
    await s.request(s.path, "PATCH", { archived: true });
    expect(
      (
        await s.request(`${s.path}/visa-settlement`, "PATCH", {
          enabled: true,
          currency: "TWD",
        })
      ).response.status,
    ).toBe(409);
  },
);

test(
  "CSV imports use saved dated quotes and group copies retain the Visa setting",
  postgresTestOptions,
  async () => {
    const s = await setup();
    await s.request(`${s.path}/visa-settlement`, "PATCH", {
      enabled: true,
      currency: "TWD",
    });
    const imported = await s.request(`${s.path}/expenses/import`, "POST", {
      csv: "date,description,amount,currency,paid_by,split_participants\n2026-07-05,Lunch,1000,JPY,Alice,Alice;Bob\n2026-07-06,Train,1000,JPY,Alice,Alice;Bob",
    });
    expect(imported.response.status).toBe(201);
    expect(
      imported.data.trip.expenses.map((e) => e.visaExchangeRate?.rate),
    ).toEqual([0.2, 0.22]);
    expect(imported.data.settlements[0]).toMatchObject({
      amountMinor: 210,
      currency: "TWD",
    });
    const copied = await s.request(`${s.path}/copy`, "POST");
    expect(copied.response.status).toBe(201);
    expect(copied.data.trip.visaSettlementEnabled).toBe(true);
    expect(copied.data.trip.expenses).toEqual([]);
  },
);

test(
  "rates are fetched without holding the trip lock and stale prefetch cannot enable incomplete snapshots",
  postgresTestOptions,
  async () => {
    const s = await setup();
    await s.request(`${s.path}/expenses`, "POST", s.input);
    s.fetchRate.mockImplementationOnce(async (query) => {
      const concurrent = await s.request(`${s.path}/expenses`, "POST", {
        ...s.input,
        expenseDate: "2026-07-06",
      });
      expect(concurrent.response.status).toBe(201);
      return quote(query);
    });
    const enabled = await s.request(`${s.path}/visa-settlement`, "PATCH", {
      enabled: true,
      currency: "TWD",
    });
    expect(enabled.response.status).toBe(400);
    const current = await s.request(s.path);
    expect(current.data.trip.visaSettlementEnabled).toBe(false);
    expect(current.data.trip.expenses).toHaveLength(2);
    expect(
      current.data.trip.expenses.every((e) => e.visaExchangeRate === undefined),
    ).toBe(true);
  },
);

test(
  "selected USD and EUR targets survive repricing, payments, backups, and group copies",
  postgresTestOptions,
  async () => {
    const s = await setup();
    s.fetchRate.mockImplementation(async (query) => ({
      ...quote(query),
      visaRate:
        query.target === "USD"
          ? query.date === "2026-07-06"
            ? 0.00675
            : 0.0065
          : 0.006,
    }));
    const first = await s.request(`${s.path}/expenses`, "POST", s.input);
    const id = first.data.trip.expenses[0].id;
    const selectedOff = await s.request(`${s.path}/visa-settlement`, "PATCH", {
      enabled: false,
      currency: "USD",
    });
    expect(selectedOff.response.status).toBe(200);
    expect(selectedOff.data.trip.visaSettlementCurrency).toBe("USD");
    expect(selectedOff.data.settlements[0].currency).toBe("JPY");
    expect(s.fetchRate).not.toHaveBeenCalled();
    const usd = await s.request(`${s.path}/visa-settlement`, "PATCH", {
      enabled: true,
      currency: "USD",
    });
    expect(usd.response.status).toBe(200);
    expect(parseTripPayload(usd.data).trip.visaSettlementCurrency).toBe("USD");
    expect(usd.data.trip.baseCurrency).toBe("JPY");
    expect(usd.data.settlements[0]).toMatchObject({
      currency: "USD",
      amountMinor: 325,
    });
    expect(usd.data.trip.expenses[0].visaExchangeRate).toMatchObject({
      targetCurrency: "USD",
      rate: 0.0065,
    });
    expect(s.fetchRate).toHaveBeenCalledWith({
      source: "JPY",
      target: "USD",
      date: s.input.expenseDate,
    });
    const later = await s.request(`${s.path}/expenses`, "POST", {
      ...s.input,
      description: "Train",
      expenseDate: "2026-07-06",
    });
    expect(later.data.settlements[0]).toMatchObject({
      currency: "USD",
      amountMinor: 662,
    });
    const eur = await s.request(`${s.path}/visa-settlement`, "PATCH", {
      enabled: true,
      currency: "EUR",
    });
    expect(eur.response.status).toBe(200);
    expect(
      eur.data.trip.expenses.every(
        (e) => e.visaExchangeRate?.targetCurrency === "EUR",
      ),
    ).toBe(true);
    expect(eur.data.settlements[0]).toMatchObject({
      currency: "EUR",
      amountMinor: 600,
    });
    expect(eur.data.trip.expenses[0].amountMinor).toBe(1000);
    expect(eur.data.trip.expenses[0].exchangeRate).toEqual(
      first.data.trip.expenses[0].exchangeRate,
    );
    s.fetchRate.mockRejectedValue(new Error("Unavailable"));
    expect(
      (
        await s.request(`${s.path}/visa-settlement`, "PATCH", {
          enabled: true,
          currency: "USD",
        })
      ).response.status,
    ).toBe(502);
    expect((await s.request(s.path)).data.trip.expenses).toEqual(
      eur.data.trip.expenses,
    );
    expect((await s.request(s.path)).data.trip.visaSettlementCurrency).toBe(
      "EUR",
    );
    const payment = await s.request(`${s.path}/settlement-payments`, "POST", {
      fromId: s.input.participantIds[1],
      toId: s.input.paidById,
      amount: "1.25",
    });
    expect(payment.response.status).toBe(201);
    expect(payment.data.trip.settlementPayments?.[0]).toMatchObject({
      currency: "EUR",
      amountMinor: 125,
    });
    expect(payment.data.settlements[0].amountMinor).toBe(475);
    expect(
      (
        await s.request(`${s.path}/settlement-payments`, "POST", {
          fromId: s.input.participantIds[1],
          toId: s.input.paidById,
          amount: "1",
          currency: "TWD",
        })
      ).response.status,
    ).toBe(400);
    expect(
      (
        await s.request(`${s.path}/visa-settlement`, "PATCH", {
          enabled: true,
          currency: "USD",
        })
      ).response.status,
    ).toBe(400);
    const history = await api<unknown>(
      s.baseUrl,
      `${s.path}/expense-history?expenseId=${id}`,
      { headers: { cookie: s.cookie } },
    );
    const page = parseExpenseHistoryPage(history.data);
    expect(
      page.revisions.some(
        (r) => r.snapshot.expense.visaExchangeRate?.targetCurrency === "USD",
      ),
    ).toBe(true);
    expect(
      page.revisions.some(
        (r) => r.snapshot.expense.visaExchangeRate?.targetCurrency === "EUR",
      ),
    ).toBe(true);
    const usdRevision = page.revisions.find(
      (r) => r.snapshot.expense.visaExchangeRate?.targetCurrency === "USD",
    );
    const restoredVersion = await s.request(
      `${s.path}/expenses/${id}/restore`,
      "POST",
      { revisionId: usdRevision?.id },
      eur.data.trip.expenses[0].version,
    );
    expect(restoredVersion.response.status).toBe(200);
    expect(
      restoredVersion.data.trip.expenses[0].visaExchangeRate?.targetCurrency,
    ).toBe("EUR");
    const backup = await api<TripBackupV2>(s.baseUrl, `${s.path}/backup`, {
      headers: { cookie: s.cookie },
    });
    expect(backup.data.trip.visaSettlementCurrency).toBe("EUR");
    const restored = await s.request("/api/trips/restore", "POST", {
      backup: backup.data,
    });
    expect(restored.response.status).toBe(201);
    expect(restored.data.trip.visaSettlementCurrency).toBe("EUR");
    expect(restored.data.settlements[0]).toMatchObject({
      currency: "EUR",
      amountMinor: 475,
    });
    const copied = await s.request(`${s.path}/copy`, "POST");
    expect(copied.data.trip.visaSettlementCurrency).toBe("EUR");
    expect(copied.data.trip.visaSettlementEnabled).toBe(true);
  },
);

test(
  "selection validates supported currencies and defaults to the group currency without assuming TWD",
  postgresTestOptions,
  async () => {
    const s = await setup();
    await s.request(`${s.path}/expenses`, "POST", s.input);
    expect(
      (
        await s.request(`${s.path}/visa-settlement`, "PATCH", {
          enabled: true,
          currency: "BTC",
        })
      ).response.status,
    ).toBe(400);
    const enabled = await s.request(`${s.path}/visa-settlement`, "PATCH", {
      enabled: true,
    });
    expect(enabled.response.status).toBe(200);
    expect(enabled.data.trip.visaSettlementCurrency).toBe("JPY");
    expect(enabled.data.trip.expenses[0].visaExchangeRate).toMatchObject({
      sourceCurrency: "JPY",
      targetCurrency: "JPY",
      rate: 1,
    });
    expect(enabled.data.settlements[0]).toMatchObject({
      currency: "JPY",
      amountMinor: 500,
    });
    expect(s.fetchRate).not.toHaveBeenCalled();
  },
);
