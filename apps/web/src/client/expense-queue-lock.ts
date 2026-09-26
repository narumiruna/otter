// Hold the same trip lock while editing a local draft and while sending queued
// expenses. Web Locks coordinate tabs; the fallback serializes this tab, while
// server idempotency still guards submissions in browsers without Web Locks.
const localLocks = new Map<string, Promise<void>>();

export async function acquireExpenseQueueLock(
  userId: string,
  tripId: string,
  signal?: AbortSignal,
): Promise<() => void> {
  const name = `otter-expenses:${userId}:${tripId}`;
  if (navigator.locks) {
    return new Promise<() => void>((resolve, reject) => {
      void navigator.locks
        .request(name, { signal }, async () => {
          let release: () => void = () => undefined;
          const held = new Promise<void>((finish) => {
            release = finish;
          });
          resolve(release);
          await held;
        })
        .catch(reject);
    });
  }

  const previous = localLocks.get(name) ?? Promise.resolve();
  let release: () => void = () => undefined;
  const held = new Promise<void>((finish) => {
    release = finish;
  });
  const tail = previous.then(() => held);
  localLocks.set(name, tail);
  const abort = () => release();
  signal?.addEventListener("abort", abort, { once: true });
  await previous;
  signal?.removeEventListener("abort", abort);
  if (signal?.aborted) {
    release();
    throw new DOMException("Queue lock canceled", "AbortError");
  }
  return () => {
    release();
    if (localLocks.get(name) === tail) localLocks.delete(name);
  };
}
