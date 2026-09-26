import {
  expenseOperationHeader,
  expenseQueueUserHeader,
  type TripPayload,
  type UserResponse,
} from "@narumitw/otter-contracts";
import { ApiResponseError, api } from "./client-support.js";
import { changeExpense, getExpense, listExpenses } from "./expense-queue.js";

const running = new Set<string>();

export async function syncExpenses(
  userId: string,
  tripId: string,
  signal: AbortSignal,
  onSynced: (payload: TripPayload) => void,
): Promise<void> {
  const key = `${userId}:${tripId}`;
  if (running.has(key) || signal.aborted || !navigator.onLine) return;
  running.add(key);
  const run = async () => {
    const items = await listExpenses(userId, tripId);
    if (
      !items.some(
        (item) => item.status === "pending" || item.status === "attempted",
      )
    )
      return;
    const me = await api<UserResponse>("/api/me", { signal });
    if (me.user?.id !== userId || signal.aborted) return;
    for (const queued of items) {
      if (signal.aborted || !navigator.onLine) return;
      const item = await getExpense(queued.id);
      if (
        !item ||
        item.userId !== userId ||
        item.tripId !== tripId ||
        item.status === "conflict" ||
        item.status === "invalid"
      )
        continue;
      // Commit the attempted state before sending: an interrupted response
      // must be retried with the same ID and *identical* body.
      await changeExpense(item.id, userId, tripId, (current) =>
        current.status === "pending"
          ? { ...current, status: "attempted" }
          : current,
      );
      const attempt = await getExpense(item.id);
      if (!attempt || signal.aborted || attempt.status !== "attempted")
        continue;
      let posted = false;
      try {
        await api<TripPayload>(`/api/trips/${tripId}/expenses`, {
          method: "POST",
          headers: {
            [expenseOperationHeader]: attempt.id,
            [expenseQueueUserHeader]: userId,
          },
          body: JSON.stringify(attempt.draft),
          signal,
        });
        posted = true;
        // A successful write response is not a fresh balance; keep the item
        // until the authoritative trip has been fetched as well.
        const latest = await api<TripPayload>(`/api/trips/${tripId}`, {
          signal,
        });
        const currentUser = await api<UserResponse>("/api/me", { signal });
        if (signal.aborted || currentUser.user?.id !== userId) return;
        onSynced(latest);
        await changeExpense(item.id, userId, tripId, (current) =>
          current.status === "attempted" ? null : current,
        );
      } catch (error) {
        if (signal.aborted) return;
        if (!posted && error instanceof ApiResponseError) {
          if (error.status === 401) return;
          if ([400, 403, 404, 409].includes(error.status)) {
            await changeExpense(item.id, userId, tripId, (current) => ({
              ...current,
              status: error.status === 400 ? "invalid" : "conflict",
              error: error.message,
            }));
            continue;
          }
        }
        // Unknown outcome (including a lost JSON response): don't change
        // the request or key. Try again on the next focus/online/timer tick.
        return;
      }
    }
  };
  try {
    if (navigator.locks) {
      await navigator.locks.request(`otter-expenses:${key}`, { signal }, run);
    } else {
      // Older browsers still rely on server-side idempotency across tabs.
      await run();
    }
  } catch (error) {
    if (!signal.aborted) throw error;
  } finally {
    running.delete(key);
  }
}
