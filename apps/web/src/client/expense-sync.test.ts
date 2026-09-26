// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { afterEach, expect, test, vi } from "vitest";
import {
  changeExpense,
  getExpense,
  listExpenses,
  queueExpense,
} from "./expense-queue.js";
import { syncExpenses } from "./expense-sync.js";

const draft = {
  amount: "50",
  currency: "TWD" as const,
  description: "Train",
  expenseDate: "2026-09-26",
  paidById: "a",
  participantIds: ["a"],
  category: "交通",
  tags: "",
  splitMode: "equal" as const,
  splitValues: {},
};
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
let tripNumber = 0;
const trip = () => `sync-trip-${++tripNumber}`;
afterEach(() => vi.unstubAllGlobals());

test("retries an unknown result unchanged and removes only after refreshing balances", async () => {
  const tripId = trip();
  const item = await queueExpense("alice", tripId, draft);
  const sent: { key: string | null; body: string }[] = [];
  let attempts = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/me") return json({ user: { id: "alice" } });
      if (url.endsWith("/expenses")) {
        sent.push({
          key: new Headers(init?.headers).get("Idempotency-Key"),
          body: String(init?.body),
        });
        attempts++;
        if (attempts === 1) throw new Error("response lost");
        return json({ trip: { expenses: [draft] } });
      }
      return json({ trip: { expenses: [draft] }, balances: [1] });
    }),
  );
  const received: unknown[] = [];
  const controller = new AbortController();
  await Promise.all([
    syncExpenses("alice", tripId, controller.signal, (payload) =>
      received.push(payload),
    ),
    syncExpenses("alice", tripId, controller.signal, (payload) =>
      received.push(payload),
    ),
  ]);
  expect((await getExpense(item.id))?.status).toBe("attempted");
  expect(received).toHaveLength(0);
  await syncExpenses("alice", tripId, controller.signal, (payload) =>
    received.push(payload),
  );
  expect(sent).toEqual([
    { key: item.id, body: JSON.stringify(draft) },
    { key: item.id, body: JSON.stringify(draft) },
  ]);
  expect(received).toHaveLength(1);
  expect(await listExpenses("alice", tripId)).toHaveLength(0);
});

test("deleting a draft during an in-flight request cannot resurrect it", async () => {
  const tripId = trip();
  const item = await queueExpense("alice", tripId, draft);
  let release: ((response: Response) => void) | undefined;
  let arrived: (() => void) | undefined;
  const started = new Promise<void>((resolve) => {
    arrived = resolve;
  });
  const pending = new Promise<Response>((resolve) => {
    release = resolve;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url === "/api/me") return json({ user: { id: "alice" } });
      if (url.endsWith("/expenses")) {
        arrived?.();
        return pending;
      }
      return json({ trip: { expenses: [draft] }, balances: [] });
    }),
  );
  const work = syncExpenses(
    "alice",
    tripId,
    new AbortController().signal,
    () => undefined,
  );
  await started;
  expect((await getExpense(item.id))?.status).toBe("attempted");
  await changeExpense(item.id, "alice", tripId, () => null);
  release?.(json({ trip: { expenses: [draft] } }));
  await work;
  expect(await listExpenses("alice", tripId)).toEqual([]);
});

test("a mid-sync account switch keeps the original operation without showing another account data", async () => {
  const tripId = trip();
  const item = await queueExpense("alice", tripId, draft);
  let identity = "alice";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url === "/api/me") return json({ user: { id: identity } });
      if (url.endsWith("/expenses")) {
        identity = "bob";
        return json({ trip: { expenses: [draft] } });
      }
      return json({ trip: { expenses: [draft] }, balances: [] });
    }),
  );
  let displayed = false;
  await syncExpenses("alice", tripId, new AbortController().signal, () => {
    displayed = true;
  });
  expect(displayed).toBe(false);
  expect((await getExpense(item.id))?.status).toBe("attempted");
});

test("401, account switching and conflicts never silently discard a draft", async () => {
  const tripId = trip();
  const item = await queueExpense("alice", tripId, draft);
  let userId = "bob";
  let outcome = 401;
  let posts = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url === "/api/me") return json({ user: { id: userId } });
      if (url.endsWith("/expenses")) {
        posts++;
        return json({ error: "denied" }, outcome);
      }
      return json({ trip: { expenses: [] } });
    }),
  );
  const controller = new AbortController();
  await syncExpenses("alice", tripId, controller.signal, () => {
    throw new Error("unexpected");
  });
  expect(posts).toBe(0);
  userId = "alice";
  await syncExpenses("alice", tripId, controller.signal, () => {
    throw new Error("unexpected");
  });
  expect(posts).toBe(1);
  expect((await getExpense(item.id))?.status).toBe("attempted");
  outcome = 403;
  await syncExpenses("alice", tripId, controller.signal, () => {
    throw new Error("unexpected");
  });
  expect((await getExpense(item.id))?.status).toBe("conflict");
  await syncExpenses("alice", tripId, controller.signal, () => {
    throw new Error("unexpected");
  });
  expect(posts).toBe(2);
});
