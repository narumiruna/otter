// @vitest-environment jsdom
import type { Expense, TripPayload } from "@narumitw/otter-contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { defaultExpenseFilters, todayDate } from "../client-support.js";
import { translations } from "../i18n/messages.js";
import type { Locale } from "../i18n.js";
import { TestI18nProvider } from "../test-providers.js";
import { type ExpenseGrouping, ExpensesPage } from "./expenses-page.js";
import { WorkspaceProvider } from "./workspace-context.js";

const expense: Expense = {
  id: "dinner",
  version: 3,
  description: "Dinner",
  amountMinor: 300,
  currency: "TWD",
  expenseDate: "2020-01-01",
  createdAt: "2020-01-01T00:00:00Z",
  paidById: "a",
  participantIds: ["a", "b"],
  participantShares: [
    { participantId: "a", shareMinor: 100 },
    { participantId: "b", shareMinor: 200 },
  ],
  category: "餐飲",
  tags: ["trip"],
};
const payload: TripPayload = {
  balances: [],
  settlements: [],
  trip: {
    id: "trip",
    name: "Trip",
    ownerId: "owner",
    baseCurrency: "TWD",
    createdAt: expense.createdAt,
    expenses: [expense],
    participants: [
      { id: "a", name: "Alice" },
      { id: "b", name: "Bob" },
    ],
  },
};

afterEach(() => vi.unstubAllGlobals());

function setup({
  initial = payload,
  offline = false,
  locale = "en",
  grouping = "none",
}: {
  initial?: TripPayload;
  offline?: boolean;
  locale?: Locale;
  grouping?: ExpenseGrouping;
} = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Harness() {
    const [current, setCurrent] = useState(initial);
    return (
      <TestI18nProvider initialLocale={locale}>
        <QueryClientProvider client={client}>
          <WorkspaceProvider
            announce={vi.fn()}
            offline={offline}
            payload={current}
            onPayload={setCurrent}
            refreshCollection={async () => {}}
          >
            <ExpensesPage
              trip={current.trip}
              readonly={!!current.readonly}
              grouping={grouping}
              filters={defaultExpenseFilters}
              onAddExpense={vi.fn()}
              onFiltersChange={vi.fn()}
              onGroupingChange={vi.fn()}
            />
          </WorkspaceProvider>
        </QueryClientProvider>
      </TestI18nProvider>
    );
  }
  return render(<Harness />);
}

async function menu(user: ReturnType<typeof userEvent.setup>, name = "Dinner") {
  const trigger = screen.getByRole("button", {
    name: `More actions for ${name}`,
  });
  await user.click(trigger);
  return trigger;
}

test.each(["en", "zh-TW", "ja", "ko"] as const)(
  "%s row menu uses localized labels and does not open the editor",
  async (locale) => {
    const user = userEvent.setup();
    const messages = translations[locale];
    setup({ locale });
    expect(
      screen.queryByRole("button", { name: messages.copyExpense }),
    ).toBeNull();
    await user.click(
      screen.getByRole("button", {
        name: messages.moreActionsForName({ name: "Dinner" }),
      }),
    );
    expect(
      screen.getAllByRole("menuitem").map((item) => item.textContent),
    ).toEqual([
      messages.editExpense,
      messages.copyExpense,
      messages.expenseHistory,
      messages.deleteExpense,
    ]);
    expect(
      screen.queryByRole("textbox", { name: messages.description }),
    ).toBeNull();
  },
);

test.each(["none", "date", "payer"] as const)(
  "%s grouping includes an action column and correct group spans",
  (grouping) => {
    setup({ grouping });
    const headers = screen.getAllByRole("columnheader");
    expect(headers.at(-1)).toHaveTextContent("Actions");
    for (const group of document.querySelectorAll(".expense-group-row th")) {
      expect(group).toHaveAttribute("colspan", String(headers.length));
    }
  },
);

test.each(["edit", "copy"] as const)(
  "%s targets the selected row without an immediate mutation",
  async (action) => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const other: Expense = {
      ...expense,
      id: "train",
      description: "Train",
      amountMinor: 900,
    };
    setup({
      initial: {
        ...payload,
        trip: { ...payload.trip, expenses: [expense, other] },
      },
    });
    const user = userEvent.setup();
    await menu(user, "Train");
    await user.click(
      screen.getByRole("menuitem", {
        name: action === "edit" ? "Edit expense" : "Copy as new expense",
      }),
    );
    expect(
      await screen.findByRole("textbox", { name: "Description" }),
    ).toHaveValue("Train");
    expect(screen.getByLabelText("Amount")).toHaveValue("900");
    expect(screen.getByLabelText("Date")).toHaveValue(
      action === "copy" ? todayDate() : expense.expenseDate,
    );
    expect(fetcher).not.toHaveBeenCalled();
    expect(payload.trip.expenses).toEqual([expense]);
  },
);

test("duplicate retains valid unequal shares and cancels without saving", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  setup();
  const user = userEvent.setup();
  await menu(user);
  await user.click(
    screen.getByRole("menuitem", { name: "Copy as new expense" }),
  );
  await screen.findByRole("heading", { name: "Copy as new expense" });
  expect(
    screen.getByLabelText(
      translations.en.nameSKind({
        name: "Alice",
        kind: translations.en.amount,
      }),
    ),
  ).toHaveValue("100");
  expect(
    screen.getByLabelText(
      translations.en.nameSKind({ name: "Bob", kind: translations.en.amount }),
    ),
  ).toHaveValue("200");
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByRole("button", { name: "Dinner" })).toBeVisible();
  expect(fetcher).not.toHaveBeenCalled();
});

test("history loads only after selection, shows an error, retries, and returns focus", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      Response.json({ error: "History unavailable" }, { status: 500 }),
    )
    .mockResolvedValueOnce(Response.json({ revisions: [], nextCursor: null }));
  vi.stubGlobal("fetch", fetcher);
  setup();
  const user = userEvent.setup();
  const trigger = await menu(user);
  expect(fetcher).not.toHaveBeenCalled();
  await user.click(screen.getByRole("menuitem", { name: "Change history" }));
  const dialog = await screen.findByRole("dialog", {
    name: "Change history: Dinner",
  });
  expect(await within(dialog).findByRole("alert")).toHaveTextContent(
    "History unavailable",
  );
  expect(String(fetcher.mock.calls[0][0])).toContain("expenseId=dinner");
  await user.click(within(dialog).getByRole("button", { name: "Reload" }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  await user.keyboard("{Escape}");
  await waitFor(() => expect(trigger).toHaveFocus());
  expect(screen.queryByRole("textbox", { name: "Description" })).toBeNull();
});

test.each([false, true])(
  "readonly guest has no actions (archived=%s)",
  (archived) => {
    setup({
      initial: {
        ...payload,
        readonly: true,
        trip: {
          ...payload.trip,
          archivedAt: archived ? "2026-10-01T00:00:00Z" : undefined,
        },
      },
    });
    expect(screen.queryByRole("button", { name: /More actions/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Change history/ })).toBeNull();
  },
);

test("archived authenticated group has history only", async () => {
  setup({
    initial: {
      ...payload,
      trip: { ...payload.trip, archivedAt: "2026-10-01T00:00:00Z" },
    },
  });
  await menu(userEvent.setup());
  expect(
    screen.getAllByRole("menuitem").map((item) => item.textContent),
  ).toEqual(["Change history"]);
});

test("offline deletion is disabled", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  setup({ offline: true });
  await menu(userEvent.setup());
  expect(
    screen.getByRole("menuitem", { name: "Delete expense" }),
  ).toHaveAttribute("data-disabled");
  expect(fetcher).not.toHaveBeenCalled();
});

test("delete cancellation sends no request and restores focus", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  setup();
  const user = userEvent.setup();
  const trigger = await menu(user);
  await user.click(screen.getByRole("menuitem", { name: "Delete expense" }));
  const dialog = await screen.findByRole("dialog", {
    name: "Delete this expense?",
  });
  expect(fetcher).not.toHaveBeenCalled();
  await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(trigger).toHaveFocus());
  expect(fetcher).not.toHaveBeenCalled();
});

test("delete failure preserves confirmation and version conflict requires review", async () => {
  const latest = { ...expense, version: 4, description: "Updated Dinner" };
  const nextPayload = {
    ...payload,
    trip: { ...payload.trip, expenses: [latest] },
  };
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      Response.json({ error: "Delete unavailable" }, { status: 500 }),
    )
    .mockResolvedValueOnce(
      Response.json(
        { error: "Changed", code: "EXPENSE_VERSION_CONFLICT" },
        { status: 412 },
      ),
    )
    .mockResolvedValueOnce(Response.json(nextPayload))
    .mockResolvedValueOnce(
      Response.json({ ...payload, trip: { ...payload.trip, expenses: [] } }),
    );
  vi.stubGlobal("fetch", fetcher);
  setup();
  const user = userEvent.setup();
  await menu(user);
  await user.click(screen.getByRole("menuitem", { name: "Delete expense" }));
  const dialog = await screen.findByRole("dialog", {
    name: "Delete this expense?",
  });
  const confirm = within(dialog).getByRole("button", {
    name: "Delete “Dinner”",
  });
  await user.click(confirm);
  expect(await within(dialog).findByRole("alert")).toHaveTextContent(
    "Delete unavailable",
  );
  await user.click(confirm);
  await user.click(
    await within(dialog).findByRole("button", {
      name: "Review latest expense",
    }),
  );
  await user.click(
    await within(dialog).findByRole("button", {
      name: translations.en.confirmLatestExpenseVersion,
    }),
  );
  await user.click(confirm);
  await screen.findByRole("heading", { name: "No expenses yet" });
  expect(
    fetcher.mock.calls
      .filter(([, init]) => init?.method === "DELETE")
      .map(([, init]) => new Headers(init?.headers).get("If-Match")),
  ).toEqual(['"3"', '"3"', '"4"']);
  await waitFor(() =>
    expect(document.getElementById("expenses-heading")).toHaveFocus(),
  );
});

test("successful deletion focuses a remaining row trigger", async () => {
  const other = { ...expense, id: "train", description: "Train" };
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        ...payload,
        trip: { ...payload.trip, expenses: [other] },
      }),
    ),
  );
  setup({
    initial: {
      ...payload,
      trip: { ...payload.trip, expenses: [expense, other] },
    },
  });
  const user = userEvent.setup();
  await menu(user);
  await user.click(screen.getByRole("menuitem", { name: "Delete expense" }));
  const dialog = await screen.findByRole("dialog");
  await user.click(
    within(dialog).getByRole("button", { name: "Delete “Dinner”" }),
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "More actions for Train" }),
    ).toHaveFocus(),
  );
});
