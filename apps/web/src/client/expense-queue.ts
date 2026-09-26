import type { CreateExpenseRequest } from "@narumitw/otter-contracts";
import type { SplitMode } from "@narumitw/otter-core/expense-splits";

export type QueuedExpenseDraft = Omit<
  CreateExpenseRequest,
  "category" | "tags" | "expenseDate" | "splitMode" | "splitValues"
> & {
  category: string;
  tags: string;
  expenseDate: string;
  splitMode: SplitMode;
  splitValues: Record<string, string>;
};

export type QueuedExpense = {
  id: string;
  userId: string;
  tripId: string;
  createdAt: string;
  draft: QueuedExpenseDraft;
  // Once sent, the original body and key must remain immutable until a
  // successful replay or a definitive 400 (the server never committed it).
  status: "pending" | "attempted" | "conflict" | "invalid";
  error?: string;
};

const databaseName = "otter-expense-queue";
const storeName = "expenses";
export const queueEvent = "otter-expense-queue-changed";
const channelName = "otter-expense-queue";

function changed() {
  window.dispatchEvent(new Event(queueEvent));
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(channelName);
    channel.postMessage("changed");
    channel.close();
  }
}

export function listenToQueue(onChange: () => void): () => void {
  window.addEventListener(queueEvent, onChange);
  if (typeof BroadcastChannel === "undefined")
    return () => window.removeEventListener(queueEvent, onChange);
  const channel = new BroadcastChannel(channelName);
  channel.onmessage = onChange;
  return () => {
    window.removeEventListener(queueEvent, onChange);
    channel.close();
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 2);
    let blocked = false;
    request.onupgradeneeded = () => {
      const store = request.result.objectStoreNames.contains(storeName)
        ? request.transaction?.objectStore(storeName)
        : request.result.createObjectStore(storeName, { keyPath: "id" });
      if (!store) throw new Error("Expense storage upgrade failed");
      if (!store.indexNames.contains("ownerTrip"))
        store.createIndex("ownerTrip", ["userId", "tripId"]);
    };
    request.onsuccess = () => {
      if (blocked) request.result.close();
      else resolve(request.result);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      blocked = true;
      reject(new Error("Expense storage is blocked by another tab"));
    };
  });
}

async function transact<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore, resolveValue: (value: T) => void) => void,
): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      let value: T;
      tx.oncomplete = () => resolve(value);
      tx.onabort = () =>
        reject(tx.error ?? new Error("Expense storage aborted"));
      tx.onerror = () =>
        reject(tx.error ?? new Error("Expense storage failed"));
      try {
        action(tx.objectStore(storeName), (result) => {
          value = result;
        });
      } catch (error) {
        tx.abort();
        reject(error);
      }
    });
  } finally {
    db.close();
  }
}

export async function listExpenses(
  userId: string,
  tripId: string,
): Promise<QueuedExpense[]> {
  const items = await transact<QueuedExpense[]>("readonly", (store, set) => {
    const request = store.index("ownerTrip").getAll([userId, tripId]);
    request.onsuccess = () => set(request.result as QueuedExpense[]);
  });
  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getExpense(
  id: string,
): Promise<QueuedExpense | undefined> {
  return transact("readonly", (store, set) => {
    const request = store.get(id);
    request.onsuccess = () => set(request.result as QueuedExpense | undefined);
  });
}

export async function putExpense(item: QueuedExpense): Promise<void> {
  await transact<void>("readwrite", (store, set) => {
    store.put(item);
    set(undefined);
  });
  changed();
}

// Only mutate a record if its expected version still exists. Never resurrect
// a draft deleted in another tab while a network request was in flight.
export async function changeExpense(
  id: string,
  userId: string,
  tripId: string,
  update: (item: QueuedExpense) => QueuedExpense | null,
): Promise<boolean> {
  const found = await transact<boolean>("readwrite", (store, set) => {
    const request = store.get(id);
    request.onsuccess = () => {
      const item = request.result as QueuedExpense | undefined;
      if (!item || item.userId !== userId || item.tripId !== tripId) {
        set(false);
        return;
      }
      const next = update(item);
      if (next) store.put(next);
      else store.delete(id);
      set(true);
    };
  });
  if (found) changed();
  return found;
}

export async function reviseExpense(
  item: QueuedExpense,
  draft: QueuedExpenseDraft,
): Promise<boolean> {
  const saved = await transact<boolean>("readwrite", (store, set) => {
    const request = store.get(item.id);
    request.onsuccess = () => {
      const current = request.result as QueuedExpense | undefined;
      if (
        !current ||
        current.userId !== item.userId ||
        current.tripId !== item.tripId ||
        (current.status !== "pending" && current.status !== "invalid")
      ) {
        set(false);
        return;
      }
      store.delete(item.id);
      store.add({
        ...current,
        id: crypto.randomUUID(),
        draft,
        status: "pending",
        error: undefined,
      });
      set(true);
    };
  });
  if (saved) changed();
  return saved;
}

export async function queueExpense(
  userId: string,
  tripId: string,
  draft: QueuedExpenseDraft,
): Promise<QueuedExpense> {
  const item: QueuedExpense = {
    id: crypto.randomUUID(),
    userId,
    tripId,
    createdAt: new Date().toISOString(),
    draft,
    status: "pending",
  };
  await putExpense(item);
  return item;
}
