// @vitest-environment jsdom
import { expect, test } from "vitest";
import { acquireExpenseQueueLock } from "./expense-queue-lock.js";

test("local fallback holds sync until editing ends and cleans up canceled waiters", async () => {
  const releaseEditor = await acquireExpenseQueueLock("u", "lock-trip");
  let acquired = false;
  const waiting = acquireExpenseQueueLock("u", "lock-trip").then((release) => {
    acquired = true;
    release();
  });
  const canceled = new AbortController();
  const aborted = acquireExpenseQueueLock("u", "lock-trip", canceled.signal);
  const rejected = expect(aborted).rejects.toThrow("Queue lock canceled");
  canceled.abort();
  expect(acquired).toBe(false);
  releaseEditor();
  await waiting;
  await rejected;
  const releaseNext = await acquireExpenseQueueLock("u", "lock-trip");
  releaseNext();
});
