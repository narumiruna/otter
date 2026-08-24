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
  "expense API accepts uneven split modes",
  postgresTestOptions,
  async () => {
    const { baseUrl } = await withTestApp();
    const register = await api<UserResponse>(baseUrl, "/api/auth/register", {
      body: JSON.stringify({
        email: `split-${Date.now()}@example.com`,
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

    const invalidAmountSplit = await api<{ error: string }>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/expenses`,
      {
        body: JSON.stringify({
          amount: "100",
          currency: "TWD",
          description: "Taxi",
          expenseDate: "2026-06-24",
          paidById: owner.id,
          participantIds: [owner.id, bob.id],
          splitMode: "amount",
          splitValues: { [owner.id]: "70", [bob.id]: "20" },
        }),
        headers: { cookie },
        method: "POST",
      },
    );
    assert.equal(invalidAmountSplit.response.status, 400);
    assert.equal(invalidAmountSplit.data.error, "分帳金額加總必須等於支出金額");

    const amountSplit = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/expenses`,
      {
        body: JSON.stringify({
          amount: "100",
          currency: "TWD",
          description: "Taxi",
          expenseDate: "2026-06-24",
          paidById: owner.id,
          participantIds: [owner.id, bob.id],
          splitMode: "amount",
          splitValues: { [owner.id]: "70", [bob.id]: "30" },
        }),
        headers: { cookie },
        method: "POST",
      },
    );
    assert.equal(amountSplit.response.status, 201);
    const taxiExpense = amountSplit.data.trip.expenses[0];
    assert.ok(taxiExpense);
    assert.deepEqual(taxiExpense.participantShares, [
      { participantId: owner.id, shareMinor: 70 },
      { participantId: bob.id, shareMinor: 30 },
    ]);
    assert.deepEqual(
      amountSplit.data.balances.map(({ amountMinor, participantId }) => ({
        amountMinor,
        participantId,
      })),
      [
        { amountMinor: 30, participantId: owner.id },
        { amountMinor: -30, participantId: bob.id },
      ],
    );

    const reamountedAmountSplit = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/expenses/${taxiExpense.id}`,
      {
        body: JSON.stringify({ amount: "200" }),
        headers: { cookie },
        method: "PATCH",
      },
    );
    assert.equal(reamountedAmountSplit.response.status, 200);
    const reamountedTaxiExpense = reamountedAmountSplit.data.trip.expenses.find(
      ({ id }) => id === taxiExpense.id,
    );
    assert.deepEqual(reamountedTaxiExpense?.participantShares, [
      { participantId: owner.id, shareMinor: 140 },
      { participantId: bob.id, shareMinor: 60 },
    ]);

    const ratioSplit = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/expenses`,
      {
        body: JSON.stringify({
          amount: "101",
          currency: "TWD",
          description: "Meal",
          expenseDate: "2026-06-25",
          paidById: owner.id,
          participantIds: [owner.id, bob.id],
          splitMode: "ratio",
          splitValues: { [owner.id]: "1", [bob.id]: "2" },
        }),
        headers: { cookie },
        method: "POST",
      },
    );
    assert.equal(ratioSplit.response.status, 201);
    const mealExpense = ratioSplit.data.trip.expenses.find(
      ({ description }) => description === "Meal",
    );
    assert.ok(mealExpense);
    assert.deepEqual(mealExpense.participantShares, [
      { participantId: owner.id, shareMinor: 34 },
      { participantId: bob.id, shareMinor: 67 },
    ]);

    const sharesSplit = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/expenses/${mealExpense.id}`,
      {
        body: JSON.stringify({
          amount: "100",
          splitMode: "shares",
          splitValues: { [owner.id]: "1", [bob.id]: "3" },
        }),
        headers: { cookie },
        method: "PATCH",
      },
    );
    assert.equal(sharesSplit.response.status, 200);
    const updatedMealExpense = sharesSplit.data.trip.expenses.find(
      ({ id }) => id === mealExpense.id,
    );
    assert.deepEqual(updatedMealExpense?.participantShares, [
      { participantId: owner.id, shareMinor: 25 },
      { participantId: bob.id, shareMinor: 75 },
    ]);
  },
);
