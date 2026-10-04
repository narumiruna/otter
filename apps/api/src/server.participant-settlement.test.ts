import assert from "node:assert/strict";
import { test } from "vitest";
import {
  api,
  postgresTestOptions,
  type TripPayload,
  type UserResponse,
  withTestApp,
} from "./server-test-utils.js";

function balancesById(payload: TripPayload): Record<string, number> {
  return Object.fromEntries(
    payload.balances.map(({ participantId, amountMinor }) => [
      participantId,
      amountMinor,
    ]),
  );
}

test(
  "participant settlement representatives persist, validate, and can be cleared",
  postgresTestOptions,
  async () => {
    const { baseUrl } = await withTestApp();
    const registered = await api<UserResponse>(baseUrl, "/api/auth/register", {
      body: JSON.stringify({
        username: `family-${Date.now()}`,
        password: "password123",
      }),
      method: "POST",
    });
    const cookie = registered.response.headers.get("set-cookie")?.split(";")[0];
    assert.ok(cookie);
    const created = await api<TripPayload>(baseUrl, "/api/trips", {
      body: JSON.stringify({ name: "Family" }),
      method: "POST",
      headers: { cookie },
    });
    const path = `/api/trips/${created.data.trip.id}`;
    const parent = created.data.trip.participants[0];
    assert.ok(parent);
    const childTrip = await api<TripPayload>(baseUrl, `${path}/participants`, {
      body: JSON.stringify({ name: "Child" }),
      method: "POST",
      headers: { cookie },
    });
    const child = childTrip.data.trip.participants.find(
      (p) => p.name === "Child",
    );
    assert.ok(child);
    const friendTrip = await api<TripPayload>(baseUrl, `${path}/participants`, {
      body: JSON.stringify({ name: "Friend" }),
      method: "POST",
      headers: { cookie },
    });
    const friend = friendTrip.data.trip.participants.find(
      (p) => p.name === "Friend",
    );
    assert.ok(friend);
    const expense = await api<TripPayload>(baseUrl, `${path}/expenses`, {
      body: JSON.stringify({
        description: "Dinner",
        amount: "90",
        currency: "TWD",
        expenseDate: "2026-01-01",
        paidById: friend.id,
        participantIds: [parent.id, child.id, friend.id],
      }),
      method: "POST",
      headers: { cookie },
    });
    assert.equal(expense.response.status, 201);
    const assigned = await api<TripPayload>(
      baseUrl,
      `${path}/participants/${child.id}`,
      {
        body: JSON.stringify({ settledById: parent.id }),
        method: "PATCH",
        headers: { cookie },
      },
    );
    assert.equal(assigned.response.status, 200);
    assert.equal(
      assigned.data.trip.participants.find((p) => p.id === child.id)
        ?.settledById,
      parent.id,
    );
    assert.deepEqual(balancesById(assigned.data), {
      [parent.id]: -60,
      [child.id]: 0,
      [friend.id]: 60,
    });
    assert.deepEqual(
      assigned.data.settlements.map((s) => [s.fromId, s.toId, s.amountMinor]),
      [[parent.id, friend.id, 60]],
    );
    for (const [id, target] of [
      [parent.id, child.id],
      [child.id, child.id],
      [child.id, "other"],
    ]) {
      const invalid = await api<TripPayload>(
        baseUrl,
        `${path}/participants/${id}`,
        {
          body: JSON.stringify({ settledById: target }),
          method: "PATCH",
          headers: { cookie },
        },
      );
      assert.equal(invalid.response.status, 400);
    }
    const reloaded = await api<TripPayload>(baseUrl, path, {
      headers: { cookie },
    });
    assert.equal(
      reloaded.data.trip.participants.find((p) => p.id === child.id)
        ?.settledById,
      parent.id,
    );
    const exported = await api<{
      trip: {
        participants: { id: string; name: string; settledById?: string }[];
      };
    }>(baseUrl, `${path}/backup`, { headers: { cookie } });
    assert.equal(
      exported.data.trip.participants.find((p) => p.name === "Child")
        ?.settledById,
      parent.id,
    );
    const restored = await api<TripPayload>(baseUrl, "/api/trips/restore", {
      body: JSON.stringify(exported.data),
      method: "POST",
      headers: { cookie },
    });
    assert.equal(restored.response.status, 201);
    const restoredParent = restored.data.trip.participants.find(
      (p) => p.name === parent.name,
    );
    const restoredChild = restored.data.trip.participants.find(
      (p) => p.name === "Child",
    );
    assert.ok(restoredParent && restoredChild);
    assert.equal(restoredChild.settledById, restoredParent.id);
    const restoredFriend = restored.data.trip.participants.find(
      (p) => p.name === friend.name,
    );
    assert.ok(restoredFriend);
    assert.deepEqual(balancesById(restored.data), {
      [restoredParent.id]: -60,
      [restoredChild.id]: 0,
      [restoredFriend.id]: 60,
    });

    const duplicateTrip = await api<TripPayload>(
      baseUrl,
      `${path}/participants`,
      {
        body: JSON.stringify({ name: "Child duplicate" }),
        method: "POST",
        headers: { cookie },
      },
    );
    const duplicate = duplicateTrip.data.trip.participants.find(
      (p) => p.name === "Child duplicate",
    );
    assert.ok(duplicate);
    const delegatedDuplicate = await api<TripPayload>(
      baseUrl,
      `${path}/participants/${duplicate.id}`,
      {
        body: JSON.stringify({ settledById: parent.id }),
        method: "PATCH",
        headers: { cookie },
      },
    );
    assert.equal(delegatedDuplicate.response.status, 200);
    const mergedDuplicate = await api<TripPayload>(
      baseUrl,
      `${path}/participants/${duplicate.id}/merge`,
      {
        body: JSON.stringify({ targetParticipantId: child.id }),
        method: "POST",
        headers: { cookie },
      },
    );
    assert.equal(mergedDuplicate.response.status, 200);
    assert.equal(
      mergedDuplicate.data.trip.participants.find((p) => p.id === child.id)
        ?.settledById,
      parent.id,
    );
    assert.deepEqual(balancesById(mergedDuplicate.data), {
      [parent.id]: -60,
      [child.id]: 0,
      [friend.id]: 60,
    });

    const cleared = await api<TripPayload>(
      baseUrl,
      `${path}/participants/${child.id}`,
      {
        body: JSON.stringify({ settledById: null }),
        method: "PATCH",
        headers: { cookie },
      },
    );
    assert.equal(cleared.response.status, 200);
    assert.deepEqual(balancesById(cleared.data), {
      [parent.id]: -30,
      [child.id]: -30,
      [friend.id]: 60,
    });
    await api<TripPayload>(baseUrl, `${path}/participants/${child.id}`, {
      body: JSON.stringify({ settledById: parent.id }),
      method: "PATCH",
      headers: { cookie },
    });
    const merged = await api<TripPayload>(
      baseUrl,
      `${path}/participants/${parent.id}/merge`,
      {
        body: JSON.stringify({ targetParticipantId: friend.id }),
        method: "POST",
        headers: { cookie },
      },
    );
    assert.equal(merged.response.status, 200);
    assert.equal(
      merged.data.trip.participants.find((p) => p.id === child.id)?.settledById,
      friend.id,
    );
    const guardianTrip = await api<TripPayload>(
      baseUrl,
      `${path}/participants`,
      {
        body: JSON.stringify({ name: "Guardian" }),
        method: "POST",
        headers: { cookie },
      },
    );
    const guardian = guardianTrip.data.trip.participants.find(
      (p) => p.name === "Guardian",
    );
    assert.ok(guardian);
    await api<TripPayload>(baseUrl, `${path}/participants/${child.id}`, {
      body: JSON.stringify({ settledById: guardian.id }),
      method: "PATCH",
      headers: { cookie },
    });
    const deleted = await api<TripPayload>(
      baseUrl,
      `${path}/participants/${guardian.id}`,
      {
        method: "DELETE",
        headers: { cookie },
      },
    );
    assert.equal(deleted.response.status, 200);
    assert.equal(
      deleted.data.trip.participants.find((p) => p.id === child.id)
        ?.settledById,
      undefined,
    );
  },
);
