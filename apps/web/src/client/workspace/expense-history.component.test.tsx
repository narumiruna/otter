// @vitest-environment jsdom
import type {
  Expense,
  ExpenseHistoryPage,
  ExpenseSnapshot,
  TripPayload,
} from "@narumitw/otter-contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { I18nProvider } from "../i18n.js";
import { DeleteExpenseAction, ReceiptControls } from "./expense-actions.js";
import { ExpenseComposer } from "./expense-composer.js";
import { ExpenseHistoryDialog } from "./expense-history-dialog.js";
import { WorkspaceProvider } from "./workspace-context.js";

const expense: Expense = {
  id: "e",
  version: 1,
  description: "Dinner",
  amountMinor: 100,
  currency: "TWD",
  paidById: "a",
  participantIds: ["a", "b"],
  category: "餐飲",
  tags: [],
  expenseDate: "2026-09-21",
  createdAt: "2026-09-21T00:00:00Z",
};
const payload: TripPayload = {
  balances: [],
  settlements: [],
  trip: {
    id: "t",
    ownerId: "u",
    name: "Trip",
    baseCurrency: "TWD",
    createdAt: expense.createdAt,
    participants: [
      { id: "a", name: "Alice" },
      { id: "b", name: "Bob" },
    ],
    expenses: [expense],
  },
};
const snapshot: ExpenseSnapshot = {
  schemaVersion: 1,
  expense,
  participants: payload.trip.participants,
  receipt: null,
};
const page: ExpenseHistoryPage = {
  revisions: [
    {
      id: "r2",
      expenseId: "e",
      version: 2,
      action: "updated",
      source: "expense",
      actor: { id: "u", name: "Alice" },
      recordedAt: expense.createdAt,
      snapshot: { ...snapshot, expense: { ...expense, amountMinor: 200 } },
      previousSnapshot: snapshot,
      changedFields: ["amountMinor"],
    },
  ],
  nextCursor: "r2",
};
afterEach(() => vi.unstubAllGlobals());
function harness(initialPayload = payload, locale: "en" | "zh-TW" = "en") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrap = (children: ReactNode, nextPayload = initialPayload) => (
    <I18nProvider initialLocale={locale}>
      <QueryClientProvider client={client}>
        <WorkspaceProvider
          announce={() => {}}
          offline={false}
          payload={nextPayload}
          refreshCollection={async () => {}}
        >
          {children}
        </WorkspaceProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
  return { client, wrap };
}
test("editor freezes version across background updates, keeps draft on conflict and requires review", async () => {
  const user = userEvent.setup();
  const saved = vi.fn();
  const latest = {
    ...expense,
    version: 2,
    description: "Latest expense",
    amountMinor: 200,
    receiptId: "latest-receipt",
  };
  const updated = { ...payload, trip: { ...payload.trip, expenses: [latest] } };
  const headers: Headers[] = [];
  let mutations = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (_url, init) => {
      if (init?.method === "PATCH") {
        headers.push(new Headers(init.headers));
        mutations++;
        return mutations === 1
          ? Response.json(
              { error: "Changed", code: "EXPENSE_VERSION_CONFLICT" },
              { status: 412 },
            )
          : Response.json(updated);
      }
      return Response.json(updated);
    }),
  );
  const { wrap } = harness();
  const view = render(
    wrap(
      <ExpenseComposer
        expense={expense}
        trip={payload.trip}
        onCancel={() => {}}
        onSaved={saved}
      />,
    ),
  );
  await user.clear(view.getByLabelText("Description"));
  await user.type(view.getByLabelText("Description"), "My draft");
  view.rerender(
    wrap(
      <ExpenseComposer
        expense={latest}
        trip={updated.trip}
        onCancel={() => {}}
        onSaved={saved}
      />,
      updated,
    ),
  );
  await user.click(view.getByRole("button", { name: "Save changes" }));
  expect(headers[0].get("If-Match")).toBe('"1"');
  expect(headers[0].get("Content-Type")).toBe("application/json");
  expect(view.getByLabelText("Description")).toHaveValue("My draft");
  expect(saved).not.toHaveBeenCalled();
  expect(view.getByRole("button", { name: "Save changes" })).toBeDisabled();
  await user.click(view.getByRole("button", { name: "Review latest expense" }));
  expect(await view.findByText("Latest expense")).toBeVisible();
  expect(view.getByText("Receipt: latest-receipt")).toBeVisible();
  await user.click(
    view.getByRole("button", { name: /Reviewed latest version/ }),
  );
  expect(view.getByLabelText("Description")).toHaveValue("My draft");
  await user.click(view.getByRole("button", { name: "Save changes" }));
  expect(headers[1].get("If-Match")).toBe('"2"');
  expect(saved).toHaveBeenCalledTimes(1);
});
test("deleted expenses retain unsaved drafts and do not retry", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ error: "Missing" }, { status: 404 }));
  vi.stubGlobal("fetch", fetcher);
  const { wrap } = harness();
  const view = render(
    wrap(
      <ExpenseComposer
        expense={expense}
        trip={payload.trip}
        onCancel={() => {}}
      />,
    ),
  );
  const user = userEvent.setup();
  await user.type(view.getByLabelText("Description"), " draft");
  await user.click(view.getByRole("button", { name: "Save changes" }));
  expect(await view.findByText(/Your draft is retained/)).toBeVisible();
  expect(view.getByLabelText("Description")).toHaveValue("Dinner draft");
  expect(view.getByRole("button", { name: "Save changes" })).toBeDisabled();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
test("delete confirmation captures its opening version, not a subsequent refresh", async () => {
  const headers: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (_url, init) => {
      headers.push(new Headers(init?.headers).get("If-Match") ?? "");
      return Response.json(
        { error: "Changed", code: "EXPENSE_VERSION_CONFLICT" },
        { status: 412 },
      );
    }),
  );
  const { wrap } = harness();
  const view = render(
    wrap(<DeleteExpenseAction expense={expense} trip={payload.trip} />),
  );
  const user = userEvent.setup();
  await user.click(view.getByRole("button", { name: "Delete" }));
  view.rerender(
    wrap(
      <DeleteExpenseAction
        expense={{ ...expense, version: 2 }}
        trip={payload.trip}
      />,
    ),
  );
  await user.click(
    within(view.getByRole("dialog")).getByRole("button", {
      name: /Delete.*Dinner/,
    }),
  );
  expect(headers).toEqual(['"1"']);
  expect(
    await view.findByRole("button", { name: "Review latest expense" }),
  ).toBeVisible();
});
test("receipt upload uses an explicit version and invalidates history on success", async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
    Response.json({
      ...payload,
      trip: {
        ...payload.trip,
        expenses: [{ ...expense, version: 2, receiptId: "receipt" }],
      },
    }),
  );
  vi.stubGlobal("fetch", fetcher);
  const { wrap, client } = harness();
  client.setQueryData(["expense-history", "t", "all"], page);
  const view = render(
    wrap(<ReceiptControls expense={expense} trip={payload.trip} />),
  );
  const user = userEvent.setup();
  await user.upload(
    view.getByLabelText("Upload receipt"),
    new File(["image"], "receipt.png", { type: "image/png" }),
  );
  expect(new Headers(fetcher.mock.calls[0][1]?.headers).get("If-Match")).toBe(
    '"1"',
  );
  expect(
    new Headers(fetcher.mock.calls[0][1]?.headers).get("Content-Type"),
  ).toBe("image/png");
  await waitFor(() =>
    expect(
      client.getQueryState(["expense-history", "t", "all"])?.isInvalidated,
    ).toBe(true),
  );
});
test("history is lazy, paginated, shows deletions and differences, and restores trigger focus", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json(page))
    .mockResolvedValueOnce(
      Response.json({
        revisions: [
          {
            ...page.revisions[0],
            id: "r3",
            version: 3,
            action: "deleted",
            changedFields: [],
          },
        ],
        nextCursor: null,
      }),
    );
  vi.stubGlobal("fetch", fetcher);
  const { wrap } = harness();
  const view = render(wrap(<ExpenseHistoryDialog tripId="t" />));
  expect(fetcher).not.toHaveBeenCalled();
  const user = userEvent.setup();
  const trigger = view.getByRole("button", { name: "Change history" });
  await user.click(trigger);
  expect(await view.findByText("Before")).toBeVisible();
  expect(view.getByText("After")).toBeVisible();
  expect(view.getByText("NT$100")).toBeVisible();
  expect(view.getByText("NT$200")).toBeVisible();
  await user.click(view.getByRole("button", { name: "Load more changes" }));
  expect(await view.findByText(/Deleted · v3/)).toBeVisible();
  expect(String(fetcher.mock.calls[1][0])).toContain("cursor=r2");
  await user.click(view.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(trigger).toHaveFocus());
});
test("history loading, empty, malformed response and retry states are visible", async () => {
  let finish: (response: Response) => void = () => {};
  const pending = new Promise<Response>((resolve) => {
    finish = resolve;
  });
  const fetcher = vi
    .fn<typeof fetch>()
    .mockReturnValueOnce(pending)
    .mockResolvedValueOnce(Response.json({ revisions: [], nextCursor: null }));
  vi.stubGlobal("fetch", fetcher);
  const { wrap } = harness();
  const view = render(wrap(<ExpenseHistoryDialog tripId="t" />));
  const user = userEvent.setup();
  await user.click(view.getByRole("button", { name: "Change history" }));
  expect(view.getByRole("status")).toHaveTextContent("Loading");
  await act(async () => finish(Response.json({ revisions: "invalid" })));
  expect(await view.findByRole("alert")).toHaveTextContent(
    "Invalid expense history",
  );
  await user.click(view.getByRole("button", { name: "Reload" }));
  expect(await view.findByText("No changes recorded")).toBeVisible();
});
test("history explains baseline and missing old receipts in Chinese", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        revisions: [
          {
            ...page.revisions[0],
            action: "baseline",
            source: "migration",
            actor: null,
            previousSnapshot: null,
            snapshot: {
              ...snapshot,
              receipt: { id: "r", mimeType: "image/png" },
            },
            changedFields: [],
          },
        ],
        nextCursor: null,
      }),
    ),
  );
  const { wrap } = harness(payload, "zh-TW");
  const view = render(wrap(<ExpenseHistoryDialog tripId="t" />));
  await userEvent.setup().click(view.getByRole("button", { name: "修改紀錄" }));
  expect(await view.findByText(/更早的修改與原操作者未知/)).toBeVisible();
  expect(view.getByText(/舊圖片無法查看/)).toBeVisible();
});
test("a public readonly payload never exposes the history entry point", () => {
  const { wrap } = harness({ ...payload, readonly: true });
  const view = render(wrap(<ExpenseHistoryDialog tripId="t" />));
  expect(view.queryByRole("button", { name: "Change history" })).toBeNull();
});
