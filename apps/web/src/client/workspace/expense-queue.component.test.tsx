// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import type { TripPayload } from "../client-support.js";
import { changeExpense, listExpenses, queueExpense } from "../expense-queue.js";
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

test("switching queued editors cannot discard dirty changes without confirmation", async () => {
  const trip = { ...payload.trip, id: "offline-switch-guard" };
  const draft = {
    amount: "100",
    currency: "TWD" as const,
    description: "First",
    expenseDate: "2026-09-26",
    paidById: "a",
    participantIds: ["a", "b"],
    category: "其他",
    tags: "",
    splitMode: "equal" as const,
    splitValues: {},
  };
  const first = await queueExpense("u", trip.id, draft);
  await queueExpense("u", trip.id, { ...draft, description: "Second" });
  await queueExpense("u", trip.id, { ...draft, description: "Third" });
  const client = new QueryClient();
  const user = userEvent.setup();
  const view = render(
    <QueryClientProvider client={client}>
      <WorkspaceProvider
        announce={() => undefined}
        offline
        payload={{ ...payload, trip }}
        userId="u"
        refreshCollection={async () => undefined}
      >
        <ExpenseQueuePanel />
      </WorkspaceProvider>
    </QueryClientProvider>,
  );
  const panel = await view.findByRole("region", { name: "尚未同步的支出" });
  const firstRow = within(panel)
    .getByText("First", { selector: "strong" })
    .closest("li");
  const secondRow = within(panel)
    .getByText("Second", { selector: "strong" })
    .closest("li");
  expect(firstRow).not.toBeNull();
  expect(secondRow).not.toBeNull();
  if (!firstRow || !secondRow) throw new Error("Missing queue rows");
  await user.click(within(firstRow).getByRole("button", { name: "修改草稿" }));
  const description = within(panel).getByLabelText("描述");
  await user.clear(description);
  await user.type(description, "Unsaved change");
  const switchButton = within(secondRow).getByRole("button", {
    name: "修改草稿",
  });
  expect(switchButton).toBeDisabled();
  await user.click(switchButton);
  expect(description).toHaveValue("Unsaved change");
  const confirmDeletion = vi.spyOn(window, "confirm").mockReturnValue(true);
  const thirdRow = within(panel)
    .getByText("Third", { selector: "strong" })
    .closest("li");
  if (!thirdRow) throw new Error("Missing third queue row");
  await user.click(
    within(thirdRow).getByRole("button", { name: "刪除本機草稿" }),
  );
  await waitFor(() =>
    expect(
      within(panel).queryByText("Third", { selector: "strong" }),
    ).toBeNull(),
  );
  confirmDeletion.mockRestore();
  expect(description).toHaveValue("Unsaved change");
  expect(switchButton).toBeDisabled();
  await user.click(within(panel).getAllByRole("button", { name: "取消" })[0]);
  const confirm = view.getByRole("dialog", { name: "要捨棄這份草稿嗎？" });
  await user.click(within(confirm).getByRole("button", { name: "取消" }));
  expect(description).toHaveValue("Unsaved change");
  expect(switchButton).toBeDisabled();
  await user.click(within(panel).getAllByRole("button", { name: "取消" })[0]);
  await user.click(
    within(view.getByRole("dialog", { name: "要捨棄這份草稿嗎？" })).getByRole(
      "button",
      { name: "捨棄草稿" },
    ),
  );
  await waitFor(() => expect(switchButton).toBeEnabled());
  await user.click(switchButton);
  expect(within(panel).getByLabelText("描述")).toHaveValue("Second");
  expect(
    (await listExpenses("u", trip.id)).find((item) => item.id === first.id)
      ?.draft.description,
  ).toBe("First");
  view.unmount();
  client.clear();
});

test("storage failure preserves the offline form without claiming it was saved", async () => {
  const client = new QueryClient();
  const user = userEvent.setup();
  const stored = globalThis.indexedDB;
  const privateMode = {
    open: () => {
      throw new DOMException("Storage unavailable", "QuotaExceededError");
    },
  };
  const view = render(
    <QueryClientProvider client={client}>
      <WorkspaceProvider
        announce={() => undefined}
        offline
        payload={{
          ...payload,
          trip: { ...payload.trip, id: "offline-storage-failure" },
        }}
        userId="u"
        refreshCollection={async () => undefined}
      >
        <ExpenseComposer trip={payload.trip} onCancel={() => undefined} />
      </WorkspaceProvider>
    </QueryClientProvider>,
  );
  try {
    await user.type(view.getByLabelText("描述"), "Keep this draft");
    await user.type(view.getByLabelText("金額"), "100");
    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      value: privateMode,
    });
    await user.click(view.getByRole("button", { name: "存到此裝置" }));
    expect(await view.findByRole("alert")).toHaveTextContent("無法存到此裝置");
    expect(view.getByLabelText("描述")).toHaveValue("Keep this draft");
  } finally {
    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      value: stored,
    });
    view.unmount();
    client.clear();
  }
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
