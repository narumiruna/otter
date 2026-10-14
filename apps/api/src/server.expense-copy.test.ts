import type {
  CreateExpenseResponse,
  TripPayload,
} from "@narumitw/otter-contracts";
import type { VisaRateQuery } from "@narumitw/otter-visa-exchange-rates";
import { expect, test, vi } from "vitest";
import { createSession } from "./server-support.js";
import { api, postgresTestOptions, withTestApp } from "./server-test-utils.js";

test.each([false, true])(
  "a copied expense POST gets new snapshots and history (Visa %s)",
  postgresTestOptions,
  async (visa) => {
    let bankMid = 32;
    const fetchRate = vi.fn(async (q: VisaRateQuery) => ({
      source: q.source,
      target: q.target,
      date: q.date ?? "2026-10-01",
      amount: 1,
      bankFeePercent: 0,
      visaRate: q.date === "2026-10-02" ? 0.9 : 0.8,
      rate: q.date === "2026-10-02" ? 0.9 : 0.8,
      convertedAmount: 0.8,
      fetchedAt: "2026-10-02T00:00:00Z",
    }));
    const s = await withTestApp({
      appOptions: {
        visaSettlement: { fetchRate },
        exchangeRates: {
          fetchRates: async () => [
            {
              exchange: "BANK_OF_TAIWAN",
              fetchedAt: "2026-10-02T00:00:00Z",
              source: "USD",
              target: "TWD",
              spotBuy: bankMid,
              spotSell: bankMid,
            },
          ],
        },
      },
      prepare: async (pool) => {
        await pool.query(
          "INSERT INTO users (id,name,username,password_hash) VALUES ('owner','Alice','owner','unused')",
        );
      },
    });
    const cookie = `otter_session=${(await createSession(s.pool, "owner")).id}`;
    const request = (path: string, method = "GET", body?: object) =>
      api<CreateExpenseResponse>(s.baseUrl, path, {
        method,
        headers: { cookie },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    const created = await request("/api/trips", "POST", {
      name: "Copy",
      baseCurrency: "TWD",
    });
    const path = `/api/trips/${created.data.trip.id}`;
    const alice = created.data.trip.participants[0].id;
    const people = await request(`${path}/participants`, "POST", {
      name: "Bob",
    });
    const input = {
      description: "Foreign meal",
      amount: "10",
      currency: "USD",
      expenseDate: "2026-10-01",
      paidById: alice,
      participantIds: people.data.trip.participants.map((p) => p.id),
      splitMode: "amount",
      splitValues: Object.fromEntries(
        people.data.trip.participants.map((p) => [p.id, "5"]),
      ),
    };
    if (visa)
      expect(
        (
          await request(`${path}/visa-settlement`, "PATCH", {
            enabled: true,
            currency: "EUR",
          })
        ).response.status,
      ).toBe(200);
    const original = await request(`${path}/expenses`, "POST", input);
    expect(original.response.status).toBe(201);
    const sourceId = original.data.createdExpenseId;
    const upload = await fetch(
      `${s.baseUrl}${path}/expenses/${sourceId}/receipt`,
      {
        method: "PUT",
        headers: { cookie, "Content-Type": "image/png", "If-Match": '"1"' },
        body: Buffer.from([1, 2, 3]),
      },
    );
    expect(upload.status).toBe(201);
    const source = ((await upload.json()) as TripPayload).trip.expenses.find(
      (e) => e.id === sourceId,
    );
    expect(source?.receiptId).toBeDefined();
    bankMid = 40;
    const copied = await request(`${path}/expenses`, "POST", {
      ...input,
      expenseDate: "2026-10-02",
    });
    expect(copied.response.status).toBe(201);
    expect(copied.data.createdExpenseId).not.toBe(sourceId);
    const expense = copied.data.trip.expenses.find(
      (e) => e.id === copied.data.createdExpenseId,
    );
    expect(expense).toMatchObject({
      version: 1,
      exchangeRate: { rateToBase: 40 },
      expenseDate: "2026-10-02",
    });
    expect(expense?.receiptId).toBeUndefined();
    expect(expense?.receiptUrl).toBeUndefined();
    expect(copied.data.trip.expenses.find((e) => e.id === sourceId)).toEqual(
      source,
    );
    if (visa) {
      expect(expense?.visaExchangeRate).toMatchObject({
        date: "2026-10-02",
        rate: 0.9,
        targetCurrency: "EUR",
      });
      expect(source?.visaExchangeRate).toMatchObject({
        date: "2026-10-01",
        rate: 0.8,
      });
      expect(fetchRate).toHaveBeenCalledWith({
        source: "USD",
        target: "EUR",
        date: "2026-10-02",
      });
    }
    const revisions = await s.pool.query(
      "SELECT version, action, source FROM expense_revisions WHERE expense_id = $1",
      [copied.data.createdExpenseId],
    );
    expect(revisions.rows).toEqual([
      { version: 1, action: "created", source: "expense" },
    ]);
    expect(
      (
        await s.pool.query(
          "SELECT count(*)::int AS n FROM receipt_attachments WHERE trip_id = $1",
          [created.data.trip.id],
        )
      ).rows[0].n,
    ).toBe(1);
  },
);
