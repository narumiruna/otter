import assert from "node:assert/strict";
import test from "node:test";
import {
  api,
  postgresTestOptions,
  type TripPayload,
  type UserResponse,
  withTestApp,
} from "./server-test-utils.js";

test(
  "backup, sharing, receipts, CSV import, and collaboration APIs",
  postgresTestOptions,
  async (t) => {
    const { baseUrl } = await withTestApp(t);
    const suffix = `${Date.now()}-${Math.random()}`;
    const owner = await api<UserResponse>(baseUrl, "/api/auth/register", {
      body: JSON.stringify({
        email: `owner-${suffix}@example.com`,
        name: "Alice",
        password: "password123",
      }),
      method: "POST",
    });
    const ownerCookie = owner.response.headers.get("set-cookie")?.split(";")[0];
    assert.ok(ownerCookie);

    const editor = await api<UserResponse>(baseUrl, "/api/auth/register", {
      body: JSON.stringify({
        email: `editor-${suffix}@example.com`,
        name: "Editor",
        password: "password123",
      }),
      method: "POST",
    });
    const editorCookie = editor.response.headers
      .get("set-cookie")
      ?.split(";")[0];
    assert.ok(editorCookie);
    assert.ok(editor.data.user);

    const createdTrip = await api<TripPayload>(baseUrl, "/api/trips", {
      body: JSON.stringify({ baseCurrency: "TWD", name: "Tokyo" }),
      headers: { cookie: ownerCookie },
      method: "POST",
    });
    const ownerParticipant = createdTrip.data.trip.participants[0];
    assert.ok(ownerParticipant);
    const withBob = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/participants`,
      {
        body: JSON.stringify({ name: "Bob" }),
        headers: { cookie: ownerCookie },
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
          paidById: ownerParticipant.id,
          participantIds: [ownerParticipant.id, bob.id],
        }),
        headers: { cookie: ownerCookie },
        method: "POST",
      },
    );
    const expense = withExpense.data.trip.expenses[0];
    assert.ok(expense);

    const badReceiptMime = await fetch(
      `${baseUrl}/api/trips/${createdTrip.data.trip.id}/expenses/${expense.id}/receipt`,
      {
        body: Buffer.from("gif"),
        headers: { "Content-Type": "image/gif", cookie: ownerCookie },
        method: "PUT",
      },
    );
    assert.equal(badReceiptMime.status, 415);
    const tooLargeReceipt = await fetch(
      `${baseUrl}/api/trips/${createdTrip.data.trip.id}/expenses/${expense.id}/receipt`,
      {
        body: Buffer.alloc(5 * 1024 * 1024 + 1),
        headers: { "Content-Type": "image/png", cookie: ownerCookie },
        method: "PUT",
      },
    );
    assert.equal(tooLargeReceipt.status, 413);

    const receiptUpload = await fetch(
      `${baseUrl}/api/trips/${createdTrip.data.trip.id}/expenses/${expense.id}/receipt`,
      {
        body: Buffer.from([1, 2, 3]),
        headers: { "Content-Type": "image/png", cookie: ownerCookie },
        method: "PUT",
      },
    );
    assert.equal(receiptUpload.status, 201);
    const receiptTrip = (await receiptUpload.json()) as TripPayload;
    assert.ok(receiptTrip.trip.expenses[0]?.receiptId);
    const receiptRead = await fetch(
      `${baseUrl}${receiptTrip.trip.expenses[0]?.receiptUrl}`,
      { headers: { cookie: ownerCookie } },
    );
    assert.equal(receiptRead.status, 200);
    assert.match(receiptRead.headers.get("content-type") ?? "", /image\/png/);
    const forbiddenReceiptRead = await fetch(
      `${baseUrl}${receiptTrip.trip.expenses[0]?.receiptUrl}`,
      { headers: { cookie: editorCookie } },
    );
    assert.equal(forbiddenReceiptRead.status, 404);
    const receiptDelete = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/expenses/${expense.id}/receipt`,
      { headers: { cookie: ownerCookie }, method: "DELETE" },
    );
    assert.equal(receiptDelete.response.status, 200);
    assert.equal(receiptDelete.data.trip.expenses[0]?.receiptId, undefined);

    const addEditor = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/members`,
      {
        body: JSON.stringify({ email: editor.data.user.email }),
        headers: { cookie: ownerCookie },
        method: "POST",
      },
    );
    assert.equal(
      addEditor.data.collaborators?.some(
        (member) =>
          member.userId === editor.data.user?.id && member.role === "editor",
      ),
      true,
    );
    const duplicateEditor = await api<{ error: string }>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/members`,
      {
        body: JSON.stringify({ email: editor.data.user.email }),
        headers: { cookie: ownerCookie },
        method: "POST",
      },
    );
    assert.equal(duplicateEditor.response.status, 409);
    const missingEditor = await api<{ error: string }>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/members`,
      {
        body: JSON.stringify({ email: `missing-${suffix}@example.com` }),
        headers: { cookie: ownerCookie },
        method: "POST",
      },
    );
    assert.equal(missingEditor.response.status, 404);
    const editorTrip = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}`,
      { headers: { cookie: editorCookie } },
    );
    assert.equal(editorTrip.data.currentUserRole, "editor");
    const editorExpense = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/expenses`,
      {
        body: JSON.stringify({
          amount: "50",
          currency: "TWD",
          description: "Coffee",
          paidById: bob.id,
          participantIds: [bob.id],
        }),
        headers: { cookie: editorCookie },
        method: "POST",
      },
    );
    assert.equal(editorExpense.response.status, 201);
    const editorDeleteTrip = await api<{ error: string }>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}`,
      { headers: { cookie: editorCookie }, method: "DELETE" },
    );
    assert.notEqual(editorDeleteTrip.response.status, 200);
    const editorInvite = await api<{ error: string }>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/members`,
      {
        body: JSON.stringify({ email: "nobody@example.com" }),
        headers: { cookie: editorCookie },
        method: "POST",
      },
    );
    assert.equal(editorInvite.response.status, 403);

    const invalidImport = await api<{ error: string; errors: string[] }>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/expenses/import`,
      {
        body: JSON.stringify({
          csv: [
            "date,description,amount,currency,paid_by,split_participants",
            "2026-06-25,Lunch,25,TWD,Alice,Alice; Missing",
          ].join("\n"),
        }),
        headers: { cookie: ownerCookie },
        method: "POST",
      },
    );
    assert.equal(invalidImport.response.status, 400);
    assert.match(invalidImport.data.errors[0] ?? "", /Missing/);
    const afterInvalidImport = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}`,
      { headers: { cookie: ownerCookie } },
    );
    assert.equal(afterInvalidImport.data.trip.expenses.length, 2);

    const validImport = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/expenses/import`,
      {
        body: JSON.stringify({
          csv: [
            "date,description,amount,currency,paid_by,category,tags,split_participants",
            '2026-06-25,"Lunch, set",25,TWD,Alice,餐飲,"food|noon","Alice=15; Bob=10"',
          ].join("\n"),
        }),
        headers: { cookie: ownerCookie },
        method: "POST",
      },
    );
    assert.equal(validImport.response.status, 201);
    assert.equal(validImport.data.trip.expenses.length, 3);
    assert.deepEqual(validImport.data.trip.expenses.at(-1)?.participantShares, [
      { participantId: ownerParticipant.id, shareMinor: 15 },
      { participantId: bob.id, shareMinor: 10 },
    ]);

    const backup = await api<Record<string, unknown>>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/backup`,
      { headers: { cookie: ownerCookie } },
    );
    assert.equal(backup.response.status, 200);
    assert.equal(backup.data.version, 1);
    assert.equal(JSON.stringify(backup.data).includes("ownerId"), false);
    const editorBackup = await api<{ error: string }>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/backup`,
      { headers: { cookie: editorCookie } },
    );
    assert.equal(editorBackup.response.status, 403);
    const invalidRateBackup = structuredClone(backup.data) as {
      trip: { exchangeRates?: Record<string, number> };
    };
    invalidRateBackup.trip.exchangeRates = { BTC: 1 };
    const invalidRateRestore = await api<{ error: string }>(
      baseUrl,
      "/api/trips/restore",
      {
        body: JSON.stringify(invalidRateBackup),
        headers: { cookie: ownerCookie },
        method: "POST",
      },
    );
    assert.equal(invalidRateRestore.response.status, 400);
    assert.equal(invalidRateRestore.data.error, "備份匯率格式錯誤");
    const restored = await api<TripPayload>(baseUrl, "/api/trips/restore", {
      body: JSON.stringify(backup.data),
      headers: { cookie: ownerCookie },
      method: "POST",
    });
    assert.equal(restored.response.status, 201);
    assert.equal(restored.data.trip.name, "Tokyo (restored)");
    assert.notEqual(
      restored.data.trip.participants[0]?.id,
      ownerParticipant.id,
    );
    assert.equal(restored.data.trip.expenses.length, 3);
    const longName = "L".repeat(100);
    await api<TripPayload>(baseUrl, "/api/trips", {
      body: JSON.stringify({ baseCurrency: "TWD", name: longName }),
      headers: { cookie: ownerCookie },
      method: "POST",
    });
    const longNameBackup = structuredClone(backup.data) as {
      trip: { name: string };
    };
    longNameBackup.trip.name = longName;
    const restoredLongName = await api<TripPayload>(
      baseUrl,
      "/api/trips/restore",
      {
        body: JSON.stringify(longNameBackup),
        headers: { cookie: ownerCookie },
        method: "POST",
      },
    );
    assert.equal(restoredLongName.response.status, 201);
    assert.equal(restoredLongName.data.trip.name.length <= 100, true);
    assert.match(restoredLongName.data.trip.name, /\(restored\)$/);

    const payment = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/settlement-payments`,
      {
        body: JSON.stringify({
          amount: "1",
          fromId: bob.id,
          note: "private note",
          toId: ownerParticipant.id,
        }),
        headers: { cookie: ownerCookie },
        method: "POST",
      },
    );
    assert.equal(payment.response.status, 201);

    const share = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/share-links`,
      { headers: { cookie: ownerCookie }, method: "POST" },
    );
    const shareLink = share.data.shareLinks?.find((link) => link.url);
    assert.ok(shareLink?.url);
    const shareToken = new URL(shareLink.url).pathname.split("/").pop();
    assert.ok(shareToken);
    const publicShare = await api<Record<string, unknown>>(
      baseUrl,
      `/api/share/${shareToken}`,
    );
    assert.equal(publicShare.response.status, 200);
    assert.equal(JSON.stringify(publicShare.data).includes("ownerId"), false);
    assert.equal(
      JSON.stringify(publicShare.data).includes("settlementPayments"),
      false,
    );
    assert.equal(
      JSON.stringify(publicShare.data).includes("private note"),
      false,
    );
    const revoked = await api<TripPayload>(
      baseUrl,
      `/api/trips/${createdTrip.data.trip.id}/share-links/${shareLink.id}`,
      { headers: { cookie: ownerCookie }, method: "DELETE" },
    );
    assert.equal(revoked.response.status, 200);
    const revokedPublicShare = await api<{ error: string }>(
      baseUrl,
      `/api/share/${shareToken}`,
    );
    assert.equal(revokedPublicShare.response.status, 404);
  },
);
