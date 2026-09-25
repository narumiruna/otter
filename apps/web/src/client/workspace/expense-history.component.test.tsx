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
import { DeleteExpenseAction } from "./expense-actions.js";
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
function harness(
  initialPayload = payload,
  locale: "en" | "zh-TW" = "en",
  offline = false,
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrap = (children: ReactNode, nextPayload = initialPayload) => (
    <I18nProvider initialLocale={locale}>
      <QueryClientProvider client={client}>
        <WorkspaceProvider
          announce={() => {}}
          offline={offline}
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
for (const split of ["equal", "amount", "valid-amount"] as const) {
  test(`merge conflict reconciles missing participants without losing the ${split} draft`, async () => {
    const user = userEvent.setup();
    const explicit = split !== "equal";
    const original: Expense = {
      ...expense,
      participantIds: split === "valid-amount" ? ["b"] : ["a", "b"],
      participantShares: explicit
        ? split === "valid-amount"
          ? [{ participantId: "b", shareMinor: 100 }]
          : [
              { participantId: "a", shareMinor: 60 },
              { participantId: "b", shareMinor: 40 },
            ]
        : undefined,
    };
    const latest: Expense = {
      ...original,
      version: 2,
      paidById: "b",
      participantIds: ["b"],
      participantShares: explicit
        ? [{ participantId: "b", shareMinor: 100 }]
        : undefined,
    };
    const initial = {
      ...payload,
      trip: { ...payload.trip, expenses: [original] },
    };
    const updated = {
      ...payload,
      trip: {
        ...payload.trip,
        participants: [{ id: "b", name: "Bob" }],
        expenses: [latest],
      },
    };
    const writes: { headers: Headers; body: Record<string, unknown> }[] = [];
    const saved = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (_url, init) => {
        if (init?.method === "PATCH") {
          writes.push({
            headers: new Headers(init.headers),
            body: JSON.parse(String(init.body)),
          });
          return writes.length === 1
            ? Response.json(
                { error: "Changed", code: "EXPENSE_VERSION_CONFLICT" },
                { status: 412 },
              )
            : Response.json(updated);
        }
        return Response.json(updated);
      }),
    );
    const { wrap } = harness(initial);
    const view = render(
      wrap(
        <ExpenseComposer
          expense={original}
          trip={initial.trip}
          onCancel={() => {}}
          onSaved={saved}
        />,
      ),
    );
    await user.clear(view.getByLabelText("Description"));
    await user.type(view.getByLabelText("Description"), "Retained draft");
    await user.clear(view.getByLabelText("Amount", { exact: true }));
    await user.type(view.getByLabelText("Amount", { exact: true }), "150");
    if (explicit) {
      await user.click(view.getByText(/Change people and split method/));
      if (split === "amount") {
        await user.clear(view.getByLabelText("Alice's Amount"));
        await user.type(view.getByLabelText("Alice's Amount"), "90");
      }
      await user.clear(view.getByLabelText("Bob's Amount"));
      await user.type(
        view.getByLabelText("Bob's Amount"),
        split === "amount" ? "60" : "150",
      );
    }
    expect(
      view.getByRole("button", { name: "Save changes" }),
      view.container.textContent ?? "",
    ).toBeEnabled();
    await user.click(view.getByRole("button", { name: "Save changes" }));
    expect(writes).toHaveLength(1);
    expect(writes[0].headers.get("If-Match")).toBe('"1"');
    await user.click(
      view.getByRole("button", { name: "Review latest expense" }),
    );
    expect(
      await view.findByText(/Confirming replaces unavailable payer/),
    ).toBeVisible();
    if (split === "amount") {
      expect(view.getByLabelText("Bob's Amount")).toHaveValue("60");
    }
    await user.click(
      await view.findByRole("button", { name: /Reviewed latest version/ }),
    );
    expect(writes).toHaveLength(1); // Confirmation never submits automatically.
    expect(view.getByLabelText("Description")).toHaveValue("Retained draft");
    expect(view.getByLabelText("Amount", { exact: true })).toHaveValue("150");
    if (split === "amount") {
      // Latest explicit split totals 100, while the retained amount is 150.
      // Keep the user's amount and require a deliberate split correction.
      expect(view.getByLabelText("Bob's Amount")).toHaveValue("100");
      expect(view.getByRole("button", { name: "Save changes" })).toBeDisabled();
      await user.clear(view.getByLabelText("Bob's Amount"));
      await user.type(view.getByLabelText("Bob's Amount"), "150");
    } else if (explicit) {
      expect(view.getByLabelText("Bob's Amount")).toHaveValue("150");
    }
    await user.click(view.getByRole("button", { name: "Save changes" }));
    expect(writes).toHaveLength(2);
    expect(writes[1].headers.get("If-Match")).toBe('"2"');
    expect(writes[1].body).toMatchObject({
      description: "Retained draft",
      amount: "150",
      paidById: "b",
      participantIds: ["b"],
    });
    if (split === "amount")
      expect(writes[1].body.splitValues).toEqual({ b: "150" });
    expect(saved).toHaveBeenCalledTimes(1);
  });
}

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
test("expense editor uploads a receipt and saves its draft with the returned version", async () => {
  const withReceipt = {
    ...payload,
    trip: {
      ...payload.trip,
      expenses: [{ ...expense, version: 2, receiptId: "receipt" }],
    },
  };
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json(withReceipt))
    .mockResolvedValueOnce(
      Response.json({
        ...withReceipt,
        trip: {
          ...withReceipt.trip,
          expenses: [
            {
              ...withReceipt.trip.expenses[0],
              description: "Dinner with receipt",
              version: 3,
            },
          ],
        },
      }),
    );
  vi.stubGlobal("fetch", fetcher);
  const { wrap, client } = harness();
  client.setQueryData(["expense-history", "t", "all"], page);
  const saved = vi.fn();
  const view = render(
    wrap(
      <ExpenseComposer
        expense={expense}
        onCancel={() => {}}
        onSaved={saved}
        trip={payload.trip}
      />,
    ),
  );
  const user = userEvent.setup();
  expect(view.getByRole("heading", { name: "Receipt" })).toBeVisible();
  expect(view.getByRole("button", { name: "Delete" })).toBeVisible();

  await user.upload(
    view.getByLabelText("Upload receipt"),
    new File(["image"], "receipt.png", { type: "image/png" }),
  );
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  const uploadHeaders = new Headers(fetcher.mock.calls[0][1]?.headers);
  expect(fetcher.mock.calls[0][1]?.method).toBe("PUT");
  expect(uploadHeaders.get("If-Match")).toBe('"1"');
  expect(uploadHeaders.get("Content-Type")).toBe("image/png");
  await waitFor(() =>
    expect(
      client.getQueryState(["expense-history", "t", "all"])?.isInvalidated,
    ).toBe(true),
  );

  await user.clear(view.getByLabelText("Description"));
  await user.type(view.getByLabelText("Description"), "Dinner with receipt");
  await user.click(view.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  const saveHeaders = new Headers(fetcher.mock.calls[1][1]?.headers);
  expect(fetcher.mock.calls[1][1]?.method).toBe("PATCH");
  expect(saveHeaders.get("If-Match")).toBe('"2"');
  expect(saved).toHaveBeenCalledOnce();
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

test("restore previews old and current expense, preserves receipt, and sends reviewed version", async () => {
  const old = { ...page.revisions[0], id: "r1", version: 1, snapshot };
  const withReceipt = {
    ...payload,
    trip: {
      ...payload.trip,
      expenses: [
        { ...expense, version: 2, amountMinor: 200, receiptId: "receipt" },
      ],
    },
  };
  const fetcher = vi.fn<typeof fetch>(async (url, init) => {
    const pathname = String(url);
    if (init?.method === "POST")
      return Response.json({
        ...withReceipt,
        trip: {
          ...withReceipt.trip,
          expenses: [{ ...expense, version: 3, receiptId: "receipt" }],
        },
      });
    if (pathname.includes("expense-history"))
      return Response.json({
        revisions: [page.revisions[0], old],
        nextCursor: null,
      });
    return Response.json(withReceipt);
  });
  vi.stubGlobal("fetch", fetcher);
  const { wrap, client } = harness(withReceipt);
  const view = render(wrap(<ExpenseHistoryDialog tripId="t" />));
  const user = userEvent.setup();
  await user.click(view.getByRole("button", { name: "Change history" }));
  await user.click(await view.findByRole("button", { name: "Restore v1" }));
  const restoreDialog = await view.findByRole("region", {
    name: "Restore expense version",
  });
  expect(
    within(restoreDialog).getByText(/current receipt stays attached/),
  ).toBeVisible();
  expect(within(restoreDialog).getByText("NT$200")).toBeVisible();
  expect(within(restoreDialog).getByText("NT$100")).toBeVisible();
  await user.click(
    within(restoreDialog).getByRole("button", { name: "Cancel" }),
  );
  expect(fetcher.mock.calls.some(([, init]) => init?.method === "POST")).toBe(
    false,
  );
  await user.click(view.getByRole("button", { name: "Restore v1" }));
  const confirm = await view.findByRole("button", {
    name: "Restore this version",
  });
  await waitFor(() => expect(confirm).toBeEnabled());
  await user.click(confirm);
  await waitFor(() =>
    expect(fetcher.mock.calls.some(([, init]) => init?.method === "POST")).toBe(
      true,
    ),
  );
  const request = fetcher.mock.calls.find(
    ([, init]) => init?.method === "POST",
  );
  expect(String(request?.[0])).toBe("/api/trips/t/expenses/e/restore");
  expect(new Headers(request?.[1]?.headers).get("If-Match")).toBe('"2"');
  expect(JSON.parse(String(request?.[1]?.body))).toEqual({ revisionId: "r1" });
  expect(
    client.getQueryData<TripPayload>(["trip", "t"])?.trip.expenses[0],
  ).toMatchObject({ version: 3, receiptId: "receipt" });
});

test("undelete uses latest deletion version, not the selected version, and explains missing receipt", async () => {
  const deleted = {
    ...page.revisions[0],
    id: "r3",
    action: "deleted",
    version: 3,
  };
  const old = { ...page.revisions[0], id: "r1", version: 1, snapshot };
  const withoutExpense = {
    ...payload,
    trip: { ...payload.trip, expenses: [] },
  };
  const fetcher = vi.fn<typeof fetch>(async (url, init) => {
    if (init?.method === "POST") return Response.json(payload);
    return Response.json(
      String(url).includes("expense-history")
        ? {
            revisions: [old, deleted], // Recorded-at order need not match version order.
            nextCursor: null,
            latestRevision: { version: 3, action: "deleted" },
          }
        : withoutExpense,
    );
  });
  vi.stubGlobal("fetch", fetcher);
  const { wrap } = harness(withoutExpense, "zh-TW");
  const view = render(wrap(<ExpenseHistoryDialog tripId="t" />));
  const user = userEvent.setup();
  await user.click(view.getByRole("button", { name: "修改紀錄" }));
  await user.click(await view.findByRole("button", { name: "還原版本 1" }));
  expect(await view.findByText(/沒有收據的狀態下還原/)).toBeVisible();
  await user.click(view.getByRole("button", { name: "還原此版本" }));
  await waitFor(() =>
    expect(fetcher.mock.calls.some(([, init]) => init?.method === "POST")).toBe(
      true,
    ),
  );
  const request = fetcher.mock.calls.find(
    ([, init]) => init?.method === "POST",
  );
  expect(new Headers(request?.[1]?.headers).get("If-Match")).toBe('"3"');
});

test("stale restore reloads current state and requires a second explicit confirmation", async () => {
  const old = { ...page.revisions[0], id: "r1", version: 1, snapshot };
  const newer = {
    ...payload,
    trip: {
      ...payload.trip,
      expenses: [{ ...expense, amountMinor: 400, version: 4 }],
    },
  };
  let current = {
    ...payload,
    trip: {
      ...payload.trip,
      expenses: [{ ...expense, amountMinor: 200, version: 2 }],
    },
  };
  let posts = 0;
  const fetcher = vi.fn<typeof fetch>(async (url, init) => {
    if (init?.method === "POST") {
      posts++;
      current = newer;
      return posts === 1
        ? Response.json(
            { error: "Changed", code: "EXPENSE_VERSION_CONFLICT" },
            { status: 412 },
          )
        : Response.json({
            ...newer,
            trip: { ...newer.trip, expenses: [{ ...expense, version: 5 }] },
          });
    }
    return Response.json(
      String(url).includes("expense-history")
        ? { revisions: [page.revisions[0], old], nextCursor: null }
        : current,
    );
  });
  vi.stubGlobal("fetch", fetcher);
  const { wrap } = harness(current);
  const view = render(wrap(<ExpenseHistoryDialog tripId="t" />));
  const user = userEvent.setup();
  await user.click(view.getByRole("button", { name: "Change history" }));
  await user.click(await view.findByRole("button", { name: "Restore v1" }));
  await user.click(
    await view.findByRole("button", { name: "Restore this version" }),
  );
  expect(
    await view.findByText(/expense changed. Review the latest state/),
  ).toBeVisible();
  const confirm = view.getByRole("button", { name: "Restore this version" });
  expect(confirm).toBeDisabled();
  expect(view.getByText("NT$400")).toBeVisible();
  await user.click(
    view.getByRole("button", { name: /Reviewed latest version/ }),
  );
  expect(confirm).toBeEnabled();
  await user.click(confirm);
  await waitFor(() => expect(posts).toBe(2));
  const writes = fetcher.mock.calls.filter(
    ([, init]) => init?.method === "POST",
  );
  expect(new Headers(writes[0][1]?.headers).get("If-Match")).toBe('"2"');
  expect(new Headers(writes[1][1]?.headers).get("If-Match")).toBe('"4"');
});

test("archived, offline and removed-participant versions cannot be restored", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async () =>
      Response.json({ revisions: [page.revisions[0]], nextCursor: null }),
    ),
  );
  const user = userEvent.setup();
  for (const candidate of [
    {
      data: {
        ...payload,
        trip: { ...payload.trip, archivedAt: "2026-09-21T00:00:00Z" },
      },
      offline: false,
    },
    { data: payload, offline: true },
    {
      data: {
        ...payload,
        trip: { ...payload.trip, participants: [{ id: "a", name: "Alice" }] },
      },
      offline: false,
    },
  ]) {
    const { wrap } = harness(candidate.data, "en", candidate.offline);
    const view = render(wrap(<ExpenseHistoryDialog tripId="t" />));
    await user.click(view.getByRole("button", { name: "Change history" }));
    expect(
      await view.findByRole("button", { name: "Restore v2" }),
    ).toBeDisabled();
    view.unmount();
  }
});
