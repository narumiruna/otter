import assert from "node:assert/strict";
import { test } from "vitest";
import {
  api,
  postgresTestOptions,
  type TripPayload,
  type UserResponse,
  withTestApp,
} from "./server-test-utils.js";

test(
  "settlement payment APIs adjust remaining settlements",
  postgresTestOptions,
  async () => {
    const { baseUrl } = await withTestApp();
    const register = await api<UserResponse>(baseUrl, "/api/auth/register", {
      body: JSON.stringify({
        email: `settle-${Date.now()}@example.com`,
        name: "Alice",
        password: "password123",
      }),
      method: "POST",
    });
    const cookie = register.response.headers.get("set-cookie")?.split(";")[0];
    assert.ok(cookie);

    const createdTrip = await api<TripPayload>(baseUrl, "/api/trips", {
      body: JSON.stringify({ baseCurrency: "TWD", name: "Tokyo" }),
      headers: { cookie },
      method: "POST",
    });
    const owner = createdTrip.data.trip.participants[0];
    assert.ok(owner);

    const withBob = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/participants`,
      {
        body: JSON.stringify({ name: "Bob" }),
        headers: { cookie },
        method: "POST",
      },
    );
    const bob = withBob.data.trip.participants.find(
      ({ name }) => name === "Bob",
    );
    assert.ok(bob);

    const withExpense = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/expenses`,
      {
        body: JSON.stringify({
          amount: "100",
          currency: "TWD",
          description: "Dinner",
          expenseDate: "2026-06-24",
          paidById: owner.id,
          participantIds: [owner.id, bob.id],
        }),
        headers: { cookie },
        method: "POST",
      },
    );
    assert.deepEqual(
      withExpense.data.settlements.map(({ amountMinor, fromId, toId }) => ({
        amountMinor,
        fromId,
        toId,
      })),
      [{ amountMinor: 50, fromId: bob.id, toId: owner.id }],
    );

    const paid = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/settlement-payments`,
      {
        body: JSON.stringify({
          amount: "20",
          currency: "TWD",
          fromId: bob.id,
          note: "cash",
          paidAt: "2026-06-25",
          toId: owner.id,
        }),
        headers: { cookie },
        method: "POST",
      },
    );
    assert.equal(paid.response.status, 201);
    const payment = paid.data.trip.settlementPayments?.[0];
    assert.ok(payment);
    assert.equal(payment.note, "cash");
    assert.deepEqual(
      paid.data.settlements.map(({ amountMinor, fromId, toId }) => ({
        amountMinor,
        fromId,
        toId,
      })),
      [{ amountMinor: 30, fromId: bob.id, toId: owner.id }],
    );

    const invalidPayment = await api<{ error: string }>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/settlement-payments`,
      {
        body: JSON.stringify({
          amount: "10",
          currency: "TWD",
          fromId: owner.id,
          toId: owner.id,
        }),
        headers: { cookie },
        method: "POST",
      },
    );
    assert.equal(invalidPayment.response.status, 400);

    const deleted = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/settlement-payments/${payment.id}`,
      { headers: { cookie }, method: "DELETE" },
    );
    assert.equal(deleted.response.status, 200);
    assert.deepEqual(deleted.data.trip.settlementPayments, []);
    assert.deepEqual(
      deleted.data.settlements.map(({ amountMinor, fromId, toId }) => ({
        amountMinor,
        fromId,
        toId,
      })),
      [{ amountMinor: 50, fromId: bob.id, toId: owner.id }],
    );

    const withCharlie = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/participants`,
      {
        body: JSON.stringify({ name: "Charlie" }),
        headers: { cookie },
        method: "POST",
      },
    );
    const charlie = withCharlie.data.trip.participants.find(
      ({ name }) => name === "Charlie",
    );
    assert.ok(charlie);

    const charliePayment = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/settlement-payments`,
      {
        body: JSON.stringify({
          amount: "10",
          currency: "TWD",
          fromId: charlie.id,
          toId: owner.id,
        }),
        headers: { cookie },
        method: "POST",
      },
    );
    assert.equal(charliePayment.response.status, 201);

    const paymentOnlyParticipantDelete = await api<{ error: string }>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/participants/${charlie.id}`,
      { headers: { cookie }, method: "DELETE" },
    );
    assert.equal(paymentOnlyParticipantDelete.response.status, 409);
    assert.equal(
      paymentOnlyParticipantDelete.data.error,
      "參與者已有付款紀錄，不能刪除",
    );

    const tripDeleteWithPayments = await api<{ ok: true }>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}`,
      { headers: { cookie }, method: "DELETE" },
    );
    assert.equal(tripDeleteWithPayments.response.status, 200);
    assert.equal(tripDeleteWithPayments.data.ok, true);
  },
);
