import assert from "node:assert/strict";
import test from "node:test";
import {
  api,
  postgresTestOptions,
  type TripPayload,
  type TripsResponse,
  type UserResponse,
  withTestApp,
} from "./server-test-utils.js";

test(
  "participant and expense APIs use Postgres",
  postgresTestOptions,
  async (t) => {
    const { baseUrl } = await withTestApp(t);
    const email = `alice-${Date.now()}@example.com`;
    const register = await api<UserResponse>(baseUrl, "/api/auth/register", {
      body: JSON.stringify({
        email,
        name: "Alice",
        password: "password123",
      }),
      method: "POST",
    });
    assert.equal(register.response.status, 201);
    const cookie = register.response.headers.get("set-cookie")?.split(";")[0];
    assert.ok(cookie);

    const createdTrip = await api<TripPayload>(baseUrl, "/api/trips", {
      body: JSON.stringify({ baseCurrency: "TWD", name: "Tokyo" }),
      headers: { cookie },
      method: "POST",
    });
    assert.equal(createdTrip.response.status, 201);
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
      `/api/trips/${createdTrip.data.trip.id}/participants/${bob.id}`,
      {
        body: JSON.stringify({ name: "Bobby" }),
        headers: { cookie },
        method: "PATCH",
      },
    );
    assert.equal(withBobby.response.status, 200);
    assert.equal(
      withBobby.data.trip.participants.find(({ id }) => id === bob.id)?.name,
      "Bobby",
    );

    const duplicateParticipantAdd = await api<{ error: string }>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/participants`,
      {
        body: JSON.stringify({ name: " bobby " }),
        headers: { cookie },
        method: "POST",
      },
    );
    assert.equal(duplicateParticipantAdd.response.status, 409);
    assert.equal(duplicateParticipantAdd.data.error, "參與者名稱已存在");

    const duplicateParticipantRename = await api<{ error: string }>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/participants/${owner.id}`,
      {
        body: JSON.stringify({ name: "Bobby" }),
        headers: { cookie },
        method: "PATCH",
      },
    );
    assert.equal(duplicateParticipantRename.response.status, 409);
    assert.equal(duplicateParticipantRename.data.error, "參與者名稱已存在");

    const invalidExpenseDate = await api<{ error: string }>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/expenses`,
      {
        body: JSON.stringify({
          amount: "100",
          currency: "TWD",
          description: "Dinner",
          expenseDate: "2026-13-40",
          paidById: owner.id,
          participantIds: [owner.id, bob.id],
        }),
        headers: { cookie },
        method: "POST",
      },
    );
    assert.equal(invalidExpenseDate.response.status, 400);

    const invalidCreateSplit = await api<{ error: string }>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/expenses`,
      {
        body: JSON.stringify({
          amount: "100",
          currency: "TWD",
          description: "Dinner",
          expenseDate: "2026-06-24",
          paidById: owner.id,
          participantIds: [owner.id, "participant_missing"],
        }),
        headers: { cookie },
        method: "POST",
      },
    );
    assert.equal(invalidCreateSplit.response.status, 400);
    assert.equal(invalidCreateSplit.data.error, "分帳參與者必須是旅行參與者");

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
    assert.equal(withExpense.response.status, 201);
    assert.equal(withExpense.data.trip.expenses.length, 1);
    assert.equal(withExpense.data.trip.expenses[0]?.expenseDate, "2026-06-24");
    const expense = withExpense.data.trip.expenses[0];
    assert.ok(expense);

    const otherRegister = await api<UserResponse>(
      baseUrl,
      "/api/auth/register",
      {
        body: JSON.stringify({
          email: `bob-${Date.now()}@example.com`,
          name: "Bob Owner",
          password: "password123",
        }),
        method: "POST",
      },
    );
    assert.equal(otherRegister.response.status, 201);
    const otherCookie = otherRegister.response.headers
      .get("set-cookie")
      ?.split(";")[0];
    assert.ok(otherCookie);

    const redatedExpense = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/expenses/${expense.id}`,
      {
        body: JSON.stringify({ expenseDate: "2026-06-25" }),
        headers: { cookie },
        method: "PATCH",
      },
    );
    assert.equal(redatedExpense.response.status, 200);
    assert.equal(
      redatedExpense.data.trip.expenses[0]?.expenseDate,
      "2026-06-25",
    );

    const invalidExpenseDateUpdate = await api<{ error: string }>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/expenses/${expense.id}`,
      {
        body: JSON.stringify({ expenseDate: "2026-02-30" }),
        headers: { cookie },
        method: "PATCH",
      },
    );
    assert.equal(invalidExpenseDateUpdate.response.status, 400);

    const forbiddenExpenseDate = await api<{ error: string }>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/expenses/${expense.id}`,
      {
        body: JSON.stringify({ expenseDate: "2026-06-26" }),
        headers: { cookie: otherCookie },
        method: "PATCH",
      },
    );
    assert.equal(forbiddenExpenseDate.response.status, 404);

    const renamedExpense = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/expenses/${expense.id}`,
      {
        body: JSON.stringify({ description: "Supper" }),
        headers: { cookie },
        method: "PATCH",
      },
    );
    assert.equal(renamedExpense.response.status, 200);
    assert.equal(renamedExpense.data.trip.expenses[0]?.description, "Supper");

    const forbiddenExpenseRename = await api<{ error: string }>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/expenses/${expense.id}`,
      {
        body: JSON.stringify({ description: "Hack" }),
        headers: { cookie: otherCookie },
        method: "PATCH",
      },
    );
    assert.equal(forbiddenExpenseRename.response.status, 404);

    const reamountedExpense = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/expenses/${expense.id}`,
      {
        body: JSON.stringify({ amount: "200" }),
        headers: { cookie },
        method: "PATCH",
      },
    );
    assert.equal(reamountedExpense.response.status, 200);
    assert.equal(reamountedExpense.data.trip.expenses[0]?.amountMinor, 200);
    assert.deepEqual(
      reamountedExpense.data.balances.map(({ amountMinor, participantId }) => ({
        amountMinor,
        participantId,
      })),
      [
        { amountMinor: 100, participantId: owner.id },
        { amountMinor: -100, participantId: bob.id },
      ],
    );
    assert.deepEqual(
      reamountedExpense.data.settlements.map(
        ({ amountMinor, fromId, toId }) => ({
          amountMinor,
          fromId,
          toId,
        }),
      ),
      [{ amountMinor: 100, fromId: bob.id, toId: owner.id }],
    );

    const forbiddenExpenseAmount = await api<{ error: string }>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/expenses/${expense.id}`,
      {
        body: JSON.stringify({ amount: "300" }),
        headers: { cookie: otherCookie },
        method: "PATCH",
      },
    );
    assert.equal(forbiddenExpenseAmount.response.status, 404);

    const repaidExpense = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/expenses/${expense.id}`,
      {
        body: JSON.stringify({ paidById: bob.id }),
        headers: { cookie },
        method: "PATCH",
      },
    );
    assert.equal(repaidExpense.response.status, 200);
    assert.deepEqual(
      repaidExpense.data.balances.map(({ amountMinor, participantId }) => ({
        amountMinor,
        participantId,
      })),
      [
        { amountMinor: -100, participantId: owner.id },
        { amountMinor: 100, participantId: bob.id },
      ],
    );
    assert.deepEqual(
      repaidExpense.data.settlements.map(({ amountMinor, fromId, toId }) => ({
        amountMinor,
        fromId,
        toId,
      })),
      [{ amountMinor: 100, fromId: owner.id, toId: bob.id }],
    );

    const forbiddenExpensePayer = await api<{ error: string }>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/expenses/${expense.id}`,
      {
        body: JSON.stringify({ paidById: owner.id }),
        headers: { cookie: otherCookie },
        method: "PATCH",
      },
    );
    assert.equal(forbiddenExpensePayer.response.status, 404);

    const resplitExpense = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/expenses/${expense.id}`,
      {
        body: JSON.stringify({ participantIds: [owner.id] }),
        headers: { cookie },
        method: "PATCH",
      },
    );
    assert.equal(resplitExpense.response.status, 200);
    assert.deepEqual(resplitExpense.data.trip.expenses[0]?.participantIds, [
      owner.id,
    ]);
    assert.deepEqual(
      resplitExpense.data.balances.map(({ amountMinor, participantId }) => ({
        amountMinor,
        participantId,
      })),
      [
        { amountMinor: -200, participantId: owner.id },
        { amountMinor: 200, participantId: bob.id },
      ],
    );
    assert.deepEqual(
      resplitExpense.data.settlements.map(({ amountMinor, fromId, toId }) => ({
        amountMinor,
        fromId,
        toId,
      })),
      [{ amountMinor: 200, fromId: owner.id, toId: bob.id }],
    );

    const forbiddenExpenseSplit = await api<{ error: string }>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/expenses/${expense.id}`,
      {
        body: JSON.stringify({ participantIds: [owner.id] }),
        headers: { cookie: otherCookie },
        method: "PATCH",
      },
    );
    assert.equal(forbiddenExpenseSplit.response.status, 404);

    const recurrencyExpense = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/expenses/${expense.id}`,
      {
        body: JSON.stringify({ currency: "USD" }),
        headers: { cookie },
        method: "PATCH",
      },
    );
    assert.equal(recurrencyExpense.response.status, 200);
    assert.equal(recurrencyExpense.data.trip.expenses[0]?.currency, "USD");
    assert.equal(recurrencyExpense.data.trip.expenses[0]?.amountMinor, 20000);
    assert.deepEqual(
      recurrencyExpense.data.balances.map(({ amountMinor, participantId }) => ({
        amountMinor,
        participantId,
      })),
      [
        { amountMinor: -6400, participantId: owner.id },
        { amountMinor: 6400, participantId: bob.id },
      ],
    );
    assert.deepEqual(
      recurrencyExpense.data.settlements.map(
        ({ amountMinor, fromId, toId }) => ({
          amountMinor,
          fromId,
          toId,
        }),
      ),
      [{ amountMinor: 6400, fromId: owner.id, toId: bob.id }],
    );

    const invalidExpenseCurrency = await api<{ error: string }>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/expenses/${expense.id}`,
      {
        body: JSON.stringify({ currency: "BTC" }),
        headers: { cookie },
        method: "PATCH",
      },
    );
    assert.equal(invalidExpenseCurrency.response.status, 400);

    const forbiddenExpenseCurrency = await api<{ error: string }>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/expenses/${expense.id}`,
      {
        body: JSON.stringify({ currency: "TWD" }),
        headers: { cookie: otherCookie },
        method: "PATCH",
      },
    );
    assert.equal(forbiddenExpenseCurrency.response.status, 404);

    const rebasedTrip = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}`,
      {
        body: JSON.stringify({ baseCurrency: "USD" }),
        headers: { cookie },
        method: "PATCH",
      },
    );
    assert.equal(rebasedTrip.response.status, 200);
    assert.equal(rebasedTrip.data.trip.baseCurrency, "USD");
    assert.deepEqual(
      rebasedTrip.data.balances.map(
        ({ amountMinor, currency, participantId }) => ({
          amountMinor,
          currency,
          participantId,
        }),
      ),
      [
        { amountMinor: -20000, currency: "USD", participantId: owner.id },
        { amountMinor: 20000, currency: "USD", participantId: bob.id },
      ],
    );

    const loadedTrip = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}`,
      { headers: { cookie } },
    );
    assert.equal(loadedTrip.data.trip.expenses.length, 1);

    const usedParticipantDelete = await api<{ error: string }>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/participants/${bob.id}`,
      { headers: { cookie }, method: "DELETE" },
    );
    assert.equal(usedParticipantDelete.response.status, 409);
    assert.equal(usedParticipantDelete.data.error, "參與者已有支出，不能刪除");

    const afterDelete = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/expenses/${expense.id}`,
      { headers: { cookie }, method: "DELETE" },
    );
    assert.equal(afterDelete.response.status, 200);
    assert.equal(afterDelete.data.trip.expenses.length, 0);
    assert.deepEqual(
      afterDelete.data.balances.map(({ amountMinor, participantId }) => ({
        amountMinor,
        participantId,
      })),
      [
        { amountMinor: 0, participantId: owner.id },
        { amountMinor: 0, participantId: bob.id },
      ],
    );
    assert.deepEqual(afterDelete.data.settlements, []);

    const afterParticipantDelete = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/participants/${bob.id}`,
      { headers: { cookie }, method: "DELETE" },
    );
    assert.equal(afterParticipantDelete.response.status, 200);
    assert.deepEqual(
      afterParticipantDelete.data.trip.participants.map(({ id }) => id),
      [owner.id],
    );

    const lastParticipantDelete = await api<{ error: string }>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/participants/${owner.id}`,
      { headers: { cookie }, method: "DELETE" },
    );
    assert.equal(lastParticipantDelete.response.status, 400);
    assert.equal(lastParticipantDelete.data.error, "至少需要一位參與者");

    const trips = await api<TripsResponse>(baseUrl, "/api/trips", {
      headers: { cookie },
    });
    assert.deepEqual(
      trips.data.trips.map(({ expenseCount, id, participantCount }) => ({
        expenseCount,
        id,
        participantCount,
      })),
      [
        {
          expenseCount: 0,
          id: createdTrip.data.trip.id,
          participantCount: 1,
        },
      ],
    );

    const forbiddenParticipantRename = await api<{ error: string }>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/participants/${owner.id}`,
      {
        body: JSON.stringify({ name: "Hack" }),
        headers: { cookie: otherCookie },
        method: "PATCH",
      },
    );
    assert.equal(forbiddenParticipantRename.response.status, 404);

    const forbiddenParticipantDelete = await api<{ error: string }>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/participants/${owner.id}`,
      { headers: { cookie: otherCookie }, method: "DELETE" },
    );
    assert.equal(forbiddenParticipantDelete.response.status, 404);
  },
);

test(
  "expense API accepts uneven split modes",
  postgresTestOptions,
  async (t) => {
    const { baseUrl } = await withTestApp(t);
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
