// @vitest-environment jsdom
import type { TripPayload } from "@narumitw/otter-contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { listExpenses, type QueuedExpense } from "../expense-queue.js";
import { syncExpenses } from "../expense-sync.js";
import { TestI18nProvider } from "../test-providers.js";
import { useWorkspace, WorkspaceProvider } from "./workspace-context.js";

vi.mock("../expense-queue.js", () => ({
  listExpenses: vi.fn(),
  listenToQueue: vi.fn(() => vi.fn()),
}));
vi.mock("../expense-sync.js", () => ({ syncExpenses: vi.fn() }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

const payload: TripPayload = {
  trip: {
    id: "trip",
    ownerId: "owner",
    name: "Trip",
    baseCurrency: "TWD",
    createdAt: "now",
    participants: [],
    expenses: [],
  },
  balances: [],
  settlements: [],
  currentUserRole: "owner",
};

function Probe() {
  const { queued, queueError } = useWorkspace();
  return <output>{`${queued.length}:${queueError}`}</output>;
}

function setup() {
  const client = new QueryClient();
  const root = (userId: string, tripId = "trip", offline = true) => (
    <QueryClientProvider client={client}>
      <TestI18nProvider>
        <WorkspaceProvider
          announce={() => {}}
          offline={offline}
          payload={{ ...payload, trip: { ...payload.trip, id: tripId } }}
          refreshCollection={async () => {}}
          userId={userId}
        >
          <Probe />
        </WorkspaceProvider>
      </TestI18nProvider>
    </QueryClientProvider>
  );
  return root;
}

for (const change of ["account", "trip"] as const) {
  for (const result of ["success", "failure"] as const) {
    test(`ignores an old queue ${result} after changing ${change}`, async () => {
      const old = deferred<QueuedExpense[]>();
      vi.mocked(listExpenses)
        .mockReturnValueOnce(old.promise)
        .mockResolvedValueOnce([]);
      const root = setup();
      const view = render(root("owner"));
      await act(async () => {
        view.rerender(
          root(
            change === "account" ? "other" : "owner",
            change === "trip" ? "other-trip" : "trip",
          ),
        );
      });
      await act(async () => {
        if (result === "success")
          old.resolve([
            {
              id: "old",
              userId: "owner",
              tripId: "trip",
              createdAt: "now",
              status: "pending",
              draft: {
                amount: "10",
                currency: "TWD",
                description: "Old draft",
                expenseDate: "2026-10-17",
                paidById: "owner",
                participantIds: ["owner"],
                category: "其他",
                tags: "",
                splitMode: "equal",
                splitValues: {},
              },
            },
          ]);
        else old.reject(new Error("Old queue failed"));
      });
      expect(screen.getByRole("status")).toHaveTextContent(/^0:$/);
    });
  }
}

for (const result of ["success", "failure"] as const) {
  test(`ignores queue ${result} after unmount and browser teardown`, async () => {
    const pending = deferred<QueuedExpense[]>();
    vi.mocked(listExpenses).mockReturnValueOnce(pending.promise);
    const view = render(setup()("owner"));
    view.unmount();
    const browserWindow = window;
    vi.stubGlobal("window", undefined);
    try {
      if (result === "success") pending.resolve([]);
      else pending.reject(new Error("Storage closed"));
      await pending.promise.catch(() => {});
      // Drain the reload continuation before restoring the browser global.
      await Promise.resolve();
    } finally {
      vi.stubGlobal("window", browserWindow);
    }
  });
}

test("ignores sync rejection after its effect is cancelled", async () => {
  vi.mocked(listExpenses).mockResolvedValue([]);
  const pending = deferred<Awaited<ReturnType<typeof syncExpenses>>>();
  vi.mocked(syncExpenses).mockReturnValueOnce(pending.promise);
  const root = setup();
  const view = render(root("owner", "trip", false));
  expect(syncExpenses).toHaveBeenCalled();
  await act(async () => {
    view.rerender(root("owner"));
  });
  await act(async () => {
    pending.reject(new Error("Cancelled sync"));
  });
  expect(screen.getByRole("status")).toHaveTextContent(/^0:$/);
});
