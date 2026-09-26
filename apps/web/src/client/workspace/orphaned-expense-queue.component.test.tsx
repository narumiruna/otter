// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { listExpenses, queueExpense } from "../expense-queue.js";
import { I18nProvider } from "../i18n.js";
import { OrphanedExpenseQueue } from "./orphaned-expense-queue.js";

const draft = {
  amount: "100",
  currency: "TWD" as const,
  description: "Lost trip expense",
  expenseDate: "2026-09-26",
  paidById: "participant",
  participantIds: ["participant"],
  category: "其他",
  tags: "",
  splitMode: "equal" as const,
  splitValues: {},
};

test("orphaned drafts remain visible only to their account and can be explicitly deleted", async () => {
  const item = await queueExpense("owner", "deleted-trip", draft);
  await queueExpense("another-account", "deleted-trip", {
    ...draft,
    description: "Other account draft",
  });
  await queueExpense("owner", "accessible-trip", draft);
  const client = new QueryClient();
  const user = userEvent.setup();
  const screen = (userId: string) => (
    <I18nProvider initialLocale="en">
      <QueryClientProvider client={client}>
        <OrphanedExpenseQueue
          userId={userId}
          trips={[
            {
              id: "accessible-trip",
              name: "Accessible",
              baseCurrency: "TWD",
              participantCount: 1,
              expenseCount: 0,
            },
          ]}
        />
      </QueryClientProvider>
    </I18nProvider>
  );
  const view = render(screen("owner"));
  try {
    const section = await view.findByRole("region", {
      name: "Drafts from unavailable groups",
    });
    expect(section).toHaveTextContent("Group ID: deleted-trip");
    expect(section).not.toHaveTextContent("accessible-trip");
    view.rerender(screen("another-account"));
    expect(view.queryByText("Lost trip expense")).toBeNull();
    expect(await view.findByText("Other account draft")).toBeVisible();
    view.rerender(screen("owner"));
    expect(view.queryByText("Other account draft")).toBeNull();
    expect(await view.findByText("Lost trip expense")).toBeVisible();
    expect(
      view.getAllByRole("button", { name: "Delete local draft" }),
    ).toHaveLength(1);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await user.click(view.getByRole("button", { name: "Delete local draft" }));
    expect(await listExpenses("owner", "deleted-trip")).toHaveLength(1);
    confirm.mockReturnValue(true);
    await user.click(view.getByRole("button", { name: "Delete local draft" }));
    await waitFor(() =>
      expect(
        view.queryByRole("region", { name: "Drafts from unavailable groups" }),
      ).toBeNull(),
    );
    expect(await listExpenses("owner", "deleted-trip")).toEqual([]);
    expect(await listExpenses("another-account", "deleted-trip")).toHaveLength(
      1,
    );
    expect(item.userId).toBe("owner");
  } finally {
    vi.restoreAllMocks();
    view.unmount();
    client.clear();
  }
});
