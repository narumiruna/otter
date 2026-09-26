// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import type { TripPayload } from "../client-support.js";
import { changeExpense, listExpenses } from "../expense-queue.js";
import { ExpenseComposer } from "./expense-composer.js";
import { ExpenseQueuePanel } from "./expense-queue-panel.js";
import { WorkspaceProvider } from "./workspace-context.js";

const payload: TripPayload = {
  balances: [],
  settlements: [],
  trip: {
    id: "offline-component-trip",
    name: "Trip",
    baseCurrency: "TWD",
    createdAt: "2026-09-26T00:00:00Z",
    ownerId: "u",
    expenses: [],
    participants: [
      { id: "a", name: "Alice" },
      { id: "b", name: "Bob" },
    ],
  },
};

test("offline creates a durable, uncounted draft; pending edits rotate the ID, attempted ones stay locked", async () => {
  const client = new QueryClient();
  const user = userEvent.setup();
  const view = render(
    <QueryClientProvider client={client}>
      <WorkspaceProvider
        announce={() => undefined}
        offline
        payload={payload}
        userId="u"
        refreshCollection={async () => undefined}
      >
        <ExpenseComposer trip={payload.trip} onCancel={() => undefined} />
        <ExpenseQueuePanel />
      </WorkspaceProvider>
    </QueryClientProvider>,
  );
  await user.type(view.getByPlaceholderText("晚餐、飯店、車票"), "Dinner");
  await user.type(view.getByPlaceholderText("1000"), "100");
  await user.click(view.getByRole("button", { name: "存到此裝置" }));
  await waitFor(async () =>
    expect(await listExpenses("u", payload.trip.id)).toHaveLength(1),
  );
  const [original] = await listExpenses("u", payload.trip.id);
  expect(payload.trip.expenses).toHaveLength(0);
  await user.click(view.getByRole("button", { name: "修改草稿" }));
  const panel = view.getByRole("region", { name: "尚未同步的支出" });
  const input = within(panel).getByPlaceholderText("1000");
  await user.clear(input);
  await user.type(input, "200");
  await user.click(within(panel).getByRole("button", { name: "存到此裝置" }));
  await waitFor(async () => {
    const [revised] = await listExpenses("u", payload.trip.id);
    expect(revised.id).not.toBe(original.id);
    expect(revised.draft.amount).toBe("200");
  });
  const [revised] = await listExpenses("u", payload.trip.id);
  await changeExpense(revised.id, "u", payload.trip.id, (item) => ({
    ...item,
    status: "attempted",
  }));
  await waitFor(() =>
    expect(
      within(panel).queryByRole("button", { name: "修改草稿" }),
    ).toBeNull(),
  );
  view.unmount();
  client.clear();
});

test("offline existing-expense edit cannot accidentally enqueue a second expense", async () => {
  const client = new QueryClient();
  const expense = {
    id: "recorded",
    amountMinor: 100,
    currency: "TWD" as const,
    description: "Recorded",
    expenseDate: "2026-09-26",
    paidById: "a",
    participantIds: ["a"],
    createdAt: "2026-09-26T00:00:00Z",
    version: 1,
  };
  const existingTrip = { ...payload.trip, id: "offline-existing-edit" };
  const existingPayload = { ...payload, trip: existingTrip };
  const view = render(
    <QueryClientProvider client={client}>
      <WorkspaceProvider
        announce={() => undefined}
        offline
        payload={existingPayload}
        userId="u"
        refreshCollection={async () => undefined}
      >
        <ExpenseComposer
          expense={expense}
          trip={existingTrip}
          onCancel={() => undefined}
        />
      </WorkspaceProvider>
    </QueryClientProvider>,
  );
  fireEvent.submit(view.container.querySelector("form") as HTMLFormElement);
  await waitFor(() => expect(view.getByRole("alert")).toBeVisible());
  expect(await listExpenses("u", existingTrip.id)).toHaveLength(0);
  view.unmount();
  client.clear();
});
