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
  "participant merge API rewrites used participants",
  postgresTestOptions,
  async () => {
    const { baseUrl } = await withTestApp();
    const register = await api<UserResponse>(baseUrl, "/api/auth/register", {
      body: JSON.stringify({
        email: `merge-${Date.now()}@example.com`,
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
    const withBobby = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/participants`,
      {
        body: JSON.stringify({ name: "Bobby" }),
        headers: { cookie },
        method: "POST",
      },
    );
    const bobby = withBobby.data.trip.participants.find(
      ({ name }) => name === "Bobby",
    );
    assert.ok(bobby);

    const withExpense = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/expenses`,
      {
        body: JSON.stringify({
          amount: "100",
          currency: "TWD",
          description: "Dinner",
          expenseDate: "2026-06-24",
          paidById: bob.id,
          participantIds: [owner.id, bob.id, bobby.id],
          splitMode: "amount",
          splitValues: { [owner.id]: "30", [bob.id]: "30", [bobby.id]: "40" },
        }),
        headers: { cookie },
        method: "POST",
      },
    );
    const expense = withExpense.data.trip.expenses[0];
    assert.ok(expense);

    // settlement payment from bob (source) to owner: should be rewritten to bobby after merge
    const withPayment = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/settlement-payments`,
      {
        body: JSON.stringify({
          amount: "20",
          currency: "TWD",
          fromId: bob.id,
          paidAt: "2026-06-24",
          toId: owner.id,
        }),
        headers: { cookie },
        method: "POST",
      },
    );
    assert.equal(withPayment.response.status, 201);
    const payment = withPayment.data.trip.settlementPayments?.find(
      ({ fromId, toId }) => fromId === bob.id && toId === owner.id,
    );
    assert.ok(payment);

    // settlement payment from bob (source) to bobby (target): should be deleted after merge (becomes self-payment)
    const withSelfPayment = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/settlement-payments`,
      {
        body: JSON.stringify({
          amount: "10",
          currency: "TWD",
          fromId: bob.id,
          paidAt: "2026-06-24",
          toId: bobby.id,
        }),
        headers: { cookie },
        method: "POST",
      },
    );
    assert.equal(withSelfPayment.response.status, 201);

    const invalidMerge = await api<{ error: string }>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/participants/${bob.id}/merge`,
      {
        body: JSON.stringify({ targetParticipantId: bob.id }),
        headers: { cookie },
        method: "POST",
      },
    );
    assert.equal(invalidMerge.response.status, 400);

    const merged = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/participants/${bob.id}/merge`,
      {
        body: JSON.stringify({ targetParticipantId: bobby.id }),
        headers: { cookie },
        method: "POST",
      },
    );
    assert.equal(merged.response.status, 200);
    assert.deepEqual(
      merged.data.trip.participants.map(({ id }) => id),
      [owner.id, bobby.id],
    );
    const mergedExpense = merged.data.trip.expenses.find(
      ({ id }) => id === expense.id,
    );
    assert.equal(mergedExpense?.paidById, bobby.id);
    assert.deepEqual(mergedExpense?.participantIds, [owner.id, bobby.id]);
    assert.deepEqual(mergedExpense?.participantShares, [
      { participantId: owner.id, shareMinor: 30 },
      { participantId: bobby.id, shareMinor: 70 },
    ]);
    // payment from bob→owner should be rewritten to bobby→owner
    assert.equal(merged.data.trip.settlementPayments?.length, 1);
    const mergedPayment = merged.data.trip.settlementPayments?.[0];
    assert.equal(mergedPayment?.id, payment.id);
    assert.equal(mergedPayment?.fromId, bobby.id);
    assert.equal(mergedPayment?.toId, owner.id);
  },
);
