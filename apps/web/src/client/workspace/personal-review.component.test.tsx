// @vitest-environment jsdom
import "fake-indexeddb/auto";
import type { TripPayload } from "@narumitw/otter-contracts";
import {
  calculateBalances,
  calculateSettlements,
} from "@narumitw/otter-core/settlement";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, renderHook } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { defaultExpenseFilters } from "../client-support.js";
import { TestI18nProvider as I18nProvider } from "../test-providers.js";
import { ExpenseComposer } from "./expense-composer.js";
import { ExpensesPage } from "./expenses-page.js";
import { MemberAccounts } from "./member-accounts.js";
import { readPreferences } from "./personal-preferences.js";
import { usePersonalPreferences } from "./use-personal-preferences.js";
import { WorkspaceProvider } from "./workspace-context.js";

function fixture(): TripPayload {
  const trip: TripPayload["trip"] = {
    id: "review-trip",
    ownerId: "review-owner",
    name: "Trip",
    baseCurrency: "TWD",
    createdAt: "2026-10-01T00:00:00Z",
    participants: [
      { id: "a", name: "Alice" },
      { id: "b", name: "Bob" },
    ],
    expenses: [
      {
        id: "meal",
        version: 1,
        description: "Meal",
        amountMinor: 100,
        currency: "TWD",
        paidById: "a",
        participantIds: ["a", "b"],
        expenseDate: "2026-10-01",
        createdAt: "2026-10-01T00:00:00Z",
      },
    ],
  };
  return {
    trip,
    balances: calculateBalances(trip),
    settlements: calculateSettlements(trip),
    currentUserRole: "editor",
  };
}
function root(payload: TripPayload, children: React.ReactNode) {
  return (
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <I18nProvider initialLocale="en">
        <WorkspaceProvider
          announce={() => {}}
          offline
          payload={payload}
          refreshCollection={async () => {}}
          userId="review-owner"
        >
          {children}
        </WorkspaceProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("Unexpected mutation");
    }),
  );
});

test.each(["copy-archive", "copy-readonly", "edit-archive", "edit-readonly"])(
  "%s closes the hidden editor and releases navigation state",
  async (mode) => {
    const payload = fixture();
    const editing = vi.fn();
    const dirty = vi.fn();
    const page = (p: TripPayload, readonly = false) => (
      <ExpensesPage
        trip={p.trip}
        readonly={readonly}
        filters={defaultExpenseFilters}
        grouping="none"
        onAddExpense={() => {}}
        onFiltersChange={() => {}}
        onGroupingChange={() => {}}
        onEditingChange={editing}
        onDirtyChange={dirty}
      />
    );
    const view = render(root(payload, page(payload)));
    const user = userEvent.setup();
    if (mode.startsWith("copy")) {
      await user.click(
        view.getByRole("button", { name: "More actions for Meal" }),
      );
      await user.click(
        view.getByRole("menuitem", { name: "Copy as new expense" }),
      );
    } else {
      await user.click(view.getByRole("button", { name: "Meal" }));
    }
    await user.type(view.getByLabelText("Description"), " unsaved");
    expect(editing).toHaveBeenLastCalledWith(true);
    expect(dirty).toHaveBeenLastCalledWith(true);
    const next = {
      ...payload,
      trip: {
        ...payload.trip,
        archivedAt: mode.endsWith("archive") ? "2026-10-14T00:00:00Z" : null,
      },
    };
    view.rerender(root(next, page(next, mode.endsWith("readonly"))));
    expect(view.queryByLabelText("Description")).not.toBeInTheDocument();
    expect(editing).toHaveBeenLastCalledWith(false);
    expect(dirty).toHaveBeenLastCalledWith(false);
    view.rerender(root(payload, page(payload)));
    expect(view.queryByLabelText("Description")).not.toBeInTheDocument();
    expect(editing).toHaveBeenLastCalledWith(false);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  },
);

test.each(["empty", "paid", "represented"])(
  "%s zero balance is shown for all members without identity",
  (mode) => {
    const payload = fixture();
    if (mode === "empty") payload.trip.expenses = [];
    if (mode === "paid")
      payload.trip.settlementPayments = [
        {
          id: "p",
          fromId: "b",
          toId: "a",
          amountMinor: 50,
          currency: "TWD",
          paidAt: "2026-10-02",
          createdAt: "now",
          note: "",
        },
      ];
    if (mode === "represented") payload.trip.participants[1].settledById = "a";
    payload.balances = calculateBalances(payload.trip);
    const view = render(root(payload, <MemberAccounts payload={payload} />));
    expect(view.getAllByText("Settled")).toHaveLength(2);
    expect(
      view.queryByText("To receive", { exact: true }),
    ).not.toBeInTheDocument();
    expect(view.queryByText("To pay", { exact: true })).not.toBeInTheDocument();
    if (mode === "represented")
      expect(view.getByText(/Alice settles for this member/)).toBeVisible();
  },
);
test("all nonzero balances retain payable and receivable labels", () => {
  const payload = fixture();
  const view = render(root(payload, <MemberAccounts payload={payload} />));
  expect(
    view.getByText("To receive", { exact: true }).parentElement,
  ).toHaveTextContent("$50");
  expect(
    view.getByText("To pay", { exact: true }).parentElement,
  ).toHaveTextContent("$50");
});

test("a refreshed form cannot report removed participant defaults as saved", async () => {
  const payload = fixture();
  const composer = (p: TripPayload) => (
    <ExpenseComposer trip={p.trip} onCancel={() => {}} />
  );
  const view = render(root(payload, composer(payload)));
  const user = userEvent.setup();
  await user.type(view.getByLabelText("Amount"), "100");
  const remember = view.getByRole("button", {
    name: "Remember currency and split settings",
  });
  await user.click(remember);
  expect(
    view.getByText("Currency and split settings saved for this group."),
  ).toBeVisible();
  const next = {
    ...payload,
    trip: { ...payload.trip, participants: [payload.trip.participants[0]] },
  };
  view.rerender(root(next, composer(next)));
  expect(view.getByLabelText("Amount")).toHaveValue("100");
  expect(remember).toBeDisabled();
  expect(
    view.queryByText("Currency and split settings saved for this group."),
  ).not.toBeInTheDocument();
  expect(view.getByRole("status")).toHaveTextContent("no longer available");
  expect(
    readPreferences("review-owner", payload.trip.id).preferences.defaults,
  ).toBeUndefined();
  await user.click(view.getByRole("button", { name: "Select all" }));
  expect(remember).toBeEnabled();
  await user.click(remember);
  expect(
    view.getByText("Currency and split settings saved for this group."),
  ).toBeVisible();
  expect(
    readPreferences("review-owner", payload.trip.id).preferences.defaults
      ?.participantIds,
  ).toEqual(["a"]);
  expect(globalThis.fetch).not.toHaveBeenCalled();
});

test.each(["currency", "participants", "mode", "values"])(
  "changing saved %s clears the confirmation without updating storage",
  async (field) => {
    const payload = fixture();
    const view = render(
      root(
        payload,
        <ExpenseComposer trip={payload.trip} onCancel={() => {}} />,
      ),
    );
    const user = userEvent.setup();
    await user.type(view.getByLabelText("Amount"), "100");
    if (field === "values") {
      await user.selectOptions(view.getByLabelText("Split method"), "shares");
      await user.type(view.getByLabelText("Alice's Shares"), "1");
      await user.type(view.getByLabelText("Bob's Shares"), "1");
    }
    const remember = view.getByRole("button", {
      name: "Remember currency and split settings",
    });
    const notice = "Currency and split settings saved for this group.";
    await user.click(remember);
    expect(view.getByText(notice)).toBeVisible();
    const saved = readPreferences("review-owner", payload.trip.id).preferences;
    if (field === "currency")
      await user.selectOptions(view.getByLabelText("Currency"), "USD");
    if (field === "participants")
      await user.click(view.getByRole("checkbox", { name: /Bob/ }));
    if (field === "mode")
      await user.selectOptions(view.getByLabelText("Split method"), "ratio");
    if (field === "values")
      await user.type(view.getByLabelText("Alice's Shares"), "2");
    expect(view.queryByText(notice)).not.toBeInTheDocument();
    expect(
      readPreferences("review-owner", payload.trip.id).preferences,
    ).toEqual(saved);
    // Returning to the saved values must not restore an old confirmation.
    if (field === "currency")
      await user.selectOptions(view.getByLabelText("Currency"), "TWD");
    if (field === "participants")
      await user.click(view.getByRole("checkbox", { name: /Bob/ }));
    if (field === "mode")
      await user.selectOptions(view.getByLabelText("Split method"), "equal");
    if (field === "values") {
      await user.clear(view.getByLabelText("Alice's Shares"));
      await user.type(view.getByLabelText("Alice's Shares"), "1");
    }
    expect(view.queryByText(notice)).not.toBeInTheDocument();
    await user.click(remember);
    expect(view.getByText(notice)).toBeVisible();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  },
);

test("changing fields outside saved defaults keeps the confirmation", async () => {
  const payload = fixture();
  const view = render(
    root(payload, <ExpenseComposer trip={payload.trip} onCancel={() => {}} />),
  );
  const user = userEvent.setup();
  await user.type(view.getByLabelText("Amount"), "100");
  await user.click(
    view.getByRole("button", { name: "Remember currency and split settings" }),
  );
  await user.type(view.getByLabelText("Description"), "Dinner");
  await user.type(view.getByLabelText("Amount"), "0");
  await user.selectOptions(
    view.getByRole("combobox", { name: /^Paid by/ }),
    "b",
  );
  expect(
    view.getByText("Currency and split settings saved for this group."),
  ).toBeVisible();
  expect(globalThis.fetch).not.toHaveBeenCalled();
});

test("saving reconciled preferences returns false even if storage succeeds", () => {
  const payload = fixture();
  const { result } = renderHook(() =>
    usePersonalPreferences("review-owner", payload.trip),
  );
  let saved: boolean | undefined;
  act(() => {
    saved = result.current.savePreferences({
      defaults: {
        currency: "TWD",
        participantIds: ["removed"],
        splitMode: "equal",
        splitValues: {},
      },
    });
  });
  expect(saved).toBe(false);
  expect(result.current.preferencesChanged).toBe(true);
  expect(result.current.preferencesFailed).toBe(false);
  expect(result.current.preferences.defaults).toBeUndefined();
});
