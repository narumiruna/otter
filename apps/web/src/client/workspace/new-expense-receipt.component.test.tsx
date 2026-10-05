// @vitest-environment jsdom
import "fake-indexeddb/auto";
import type { Expense, TripPayload } from "@narumitw/otter-contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { I18nProvider } from "../i18n.js";
import { ExpenseComposer } from "./expense-composer.js";
import { WorkspaceProvider } from "./workspace-context.js";

const expense: Expense = {
  id: "new-expense",
  version: 1,
  description: "Dinner",
  amountMinor: 100,
  currency: "TWD",
  paidById: "a",
  participantIds: ["a", "b"],
  expenseDate: "2026-10-05",
  createdAt: "2026-10-05T00:00:00Z",
};
const empty: TripPayload = {
  balances: [],
  settlements: [],
  trip: {
    id: "photo-test-trip",
    ownerId: "u",
    name: "Trip",
    baseCurrency: "TWD",
    createdAt: expense.createdAt,
    participants: [
      { id: "a", name: "Alice" },
      { id: "b", name: "Bob" },
    ],
    expenses: [],
  },
};
const created = {
  ...empty,
  createdExpenseId: expense.id,
  trip: { ...empty.trip, expenses: [expense] },
};
const uploaded: TripPayload = {
  ...created,
  trip: {
    ...created.trip,
    expenses: [
      { ...expense, version: 2, receiptId: "receipt", receiptUrl: "/receipt" },
    ],
  },
};
const image = () => new File(["photo"], "dinner.png", { type: "image/png" });

function setup(fetcher: typeof fetch, offline = false) {
  vi.stubGlobal("fetch", fetcher);
  const client = new QueryClient();
  const saved = vi.fn();
  const refreshed = vi.fn(async () => {
    client.setQueryData(["trips"], {
      archivedTrips: [],
      trips: [{ id: empty.trip.id, expenseCount: 1 }],
    });
  });
  const announce = vi.fn();
  const content = (isOffline: boolean) => (
    <I18nProvider initialLocale="en">
      <QueryClientProvider client={client}>
        <WorkspaceProvider
          announce={announce}
          offline={isOffline}
          payload={empty}
          refreshCollection={refreshed}
          userId="u"
        >
          <ExpenseComposer
            trip={empty.trip}
            onCancel={() => undefined}
            onSaved={saved}
          />
        </WorkspaceProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
  const view = render(content(offline));
  return {
    ...view,
    announce,
    client,
    refreshed,
    saved,
    setOffline: (next: boolean) => view.rerender(content(next)),
  };
}

async function fill(
  view: ReturnType<typeof setup>,
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.type(view.getByLabelText("Description"), "Dinner");
  await user.type(view.getByLabelText("Amount"), "100");
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("create form offers upload and rear camera; selecting and removing a file protects the draft", async () => {
  const view = setup(vi.fn<typeof fetch>());
  const user = userEvent.setup();
  expect(view.getByLabelText("Take photo")).toHaveAttribute(
    "capture",
    "environment",
  );
  expect(view.getByLabelText("Upload photo")).not.toHaveAttribute("capture");
  for (const label of ["Take photo", "Upload photo"]) {
    expect(view.getByLabelText(label)).toHaveAttribute(
      "accept",
      "image/jpeg,image/png,image/webp",
    );
  }
  await user.upload(view.getByLabelText("Take photo"), image());
  expect(view.getByText("dinner.png")).toBeVisible();
  await user.click(view.getByRole("button", { name: "Remove photo" }));
  expect(view.queryByText("dinner.png")).toBeNull();
  view.setOffline(true);
  expect(view.getByLabelText("Take photo")).toBeDisabled();
  expect(view.getByLabelText("Upload photo")).toBeDisabled();
  expect(view.getByText(/offline drafts do not store photos/)).toBeVisible();
});

test("rejects unsupported, empty and oversized photos before creating anything", async () => {
  const fetcher = vi.fn<typeof fetch>();
  const view = setup(fetcher);
  const user = userEvent.setup();
  await fill(view, user);
  for (const [file, message] of [
    [
      new File(["heic"], "photo.heic", { type: "image/heic" }),
      /JPEG, PNG, or WebP/,
    ],
    [
      new File([], "empty.png", { type: "image/png" }),
      /Choose a receipt image/,
    ],
    [
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.png", {
        type: "image/png",
      }),
      /5 MB or smaller/,
    ],
  ] as const) {
    fireEvent.change(view.getByLabelText("Upload photo"), {
      target: { files: [file] },
    });
    expect(view.getByRole("alert")).toHaveTextContent(message);
    expect(view.getByText(file.name)).toBeVisible();
    await user.click(view.getByRole("button", { name: "Record expense" }));
    expect(fetcher, file.name).not.toHaveBeenCalled();
  }
});

test("unchanged create without a photo sends only POST", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json(created, { status: 201 }));
  const view = setup(fetcher);
  const user = userEvent.setup();
  await fill(view, user);
  await user.click(view.getByRole("button", { name: "Record expense" }));
  await waitFor(() => expect(view.saved).toHaveBeenCalledOnce());
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0][1]?.method).toBe("POST");
});

test("uploads to the returned ID and version, not another expense in the payload", async () => {
  const other = { ...expense, id: "someone-else" };
  const response = {
    ...created,
    trip: { ...created.trip, expenses: [other, expense] },
  };
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json(response, { status: 201 }))
    .mockResolvedValueOnce(Response.json(uploaded, { status: 201 }));
  const view = setup(fetcher);
  const user = userEvent.setup();
  await fill(view, user);
  await user.upload(view.getByLabelText("Upload photo"), image());
  await user.click(view.getByRole("button", { name: "Record expense" }));
  await waitFor(() => expect(view.saved).toHaveBeenCalledOnce());
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(String(fetcher.mock.calls[1][0])).toContain(
    "/expenses/new-expense/receipt",
  );
  expect(fetcher.mock.calls[1][1]?.method).toBe("PUT");
  expect(fetcher.mock.calls[1][1]?.body).toBeInstanceOf(File);
  const headers = new Headers(fetcher.mock.calls[1][1]?.headers);
  expect(headers.get("If-Match")).toBe('"1"');
  expect(headers.get("Content-Type")).toBe("image/png");
  expect(
    view.client.getQueryData<TripPayload>(["trip", empty.trip.id])?.trip
      .expenses[0]?.receiptId,
  ).toBe("receipt");
  expect(view.refreshed).toHaveBeenCalledTimes(2);
});

test("refreshes again after upload to include changes made while it was in progress", async () => {
  let finishUpload: (response: Response) => void = () => {
    throw new Error("Upload did not start");
  };
  const pendingUpload = new Promise<Response>((resolve) => {
    finishUpload = resolve;
  });
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json(created, { status: 201 }))
    .mockReturnValueOnce(pendingUpload);
  const view = setup(fetcher);
  const collection = {
    archivedTrips: [],
    trips: [{ id: empty.trip.id, expenseCount: 0 }],
  };
  view.client.setQueryData(["trips"], collection);
  let serverExpenseCount = 1;
  view.refreshed.mockImplementation(async () => {
    view.client.setQueryData(["trips"], {
      ...collection,
      trips: [{ ...collection.trips[0], expenseCount: serverExpenseCount }],
    });
  });
  const user = userEvent.setup();
  await fill(view, user);
  await user.upload(view.getByLabelText("Upload photo"), image());
  await user.click(view.getByRole("button", { name: "Record expense" }));
  await waitFor(() => expect(view.refreshed).toHaveBeenCalledOnce());
  expect(
    view.client.getQueryData<typeof collection>(["trips"])?.trips[0]
      ?.expenseCount,
  ).toBe(1);
  serverExpenseCount = 2;
  finishUpload(Response.json(uploaded, { status: 201 }));
  await waitFor(() => expect(view.saved).toHaveBeenCalledOnce());
  expect(view.refreshed).toHaveBeenCalledTimes(2);
  expect(
    view.client.getQueryData<typeof collection>(["trips"])?.trips[0]
      ?.expenseCount,
  ).toBe(2);
});

test("failed upload leaves the created expense in place and retries PUT only", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json(created, { status: 201 }))
    .mockResolvedValueOnce(
      Response.json({ error: "upload failed" }, { status: 500 }),
    )
    .mockResolvedValueOnce(Response.json(uploaded, { status: 201 }));
  const view = setup(fetcher);
  const user = userEvent.setup();
  await fill(view, user);
  await user.upload(view.getByLabelText("Upload photo"), image());
  await user.click(view.getByRole("button", { name: "Record expense" }));
  expect(
    await view.findByText(/Expense created, but receipt upload failed/),
  ).toBeVisible();
  expect(view.getByText("upload failed")).toBeVisible();
  expect(view.saved).not.toHaveBeenCalled();
  expect(
    view.client.getQueryData<TripPayload>(["trip", empty.trip.id])?.trip
      .expenses,
  ).toHaveLength(1);
  await user.click(view.getByRole("button", { name: "Retry receipt upload" }));
  await waitFor(() => expect(view.saved).toHaveBeenCalledOnce());
  expect(fetcher.mock.calls.map(([, init]) => init?.method)).toEqual([
    "POST",
    "PUT",
    "PUT",
  ]);
  expect(view.announce).toHaveBeenCalledWith("Receipt uploaded");
});

test("conflicting upload must review the latest version before retrying", async () => {
  const latest = {
    ...created,
    trip: { ...created.trip, expenses: [{ ...expense, version: 2 }] },
  };
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json(created, { status: 201 }))
    .mockResolvedValueOnce(Response.json({ error: "changed" }, { status: 412 }))
    .mockResolvedValueOnce(Response.json(latest))
    .mockResolvedValueOnce(Response.json(uploaded, { status: 201 }));
  const view = setup(fetcher);
  const user = userEvent.setup();
  await fill(view, user);
  await user.upload(view.getByLabelText("Upload photo"), image());
  await user.click(view.getByRole("button", { name: "Record expense" }));
  await view.findByText(/Expense created, but receipt upload failed/);
  expect(
    view.getByRole("button", { name: "Retry receipt upload" }),
  ).toBeDisabled();
  await user.click(view.getByRole("button", { name: "Review latest expense" }));
  await view.findByText("v2");
  await user.click(
    view.getByRole("button", { name: /Reviewed latest version/ }),
  );
  await user.click(view.getByRole("button", { name: "Retry receipt upload" }));
  await waitFor(() => expect(view.saved).toHaveBeenCalledOnce());
  expect(new Headers(fetcher.mock.calls[3][1]?.headers).get("If-Match")).toBe(
    '"2"',
  );
  expect(fetcher.mock.calls.map(([, init]) => init?.method)).toEqual([
    "POST",
    "PUT",
    undefined,
    "PUT",
  ]);
});

test("a lost receipt response never overwrites an already attached receipt", async () => {
  const withReceipt = {
    ...created,
    trip: {
      ...created.trip,
      expenses: [{ ...expense, version: 2, receiptId: "other" }],
    },
  };
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json(created, { status: 201 }))
    .mockRejectedValueOnce(new Error("connection lost"))
    .mockResolvedValueOnce(Response.json({ error: "changed" }, { status: 412 }))
    .mockResolvedValueOnce(Response.json(withReceipt));
  const view = setup(fetcher);
  const user = userEvent.setup();
  await fill(view, user);
  await user.upload(view.getByLabelText("Upload photo"), image());
  await user.click(view.getByRole("button", { name: "Record expense" }));
  await view.findByText(/Expense created, but receipt upload failed/);
  await user.click(view.getByRole("button", { name: "Retry receipt upload" }));
  await view.findByRole("button", { name: "Review latest expense" });
  await user.click(view.getByRole("button", { name: "Review latest expense" }));
  expect(await view.findByText(/already has a receipt/)).toBeVisible();
  expect(
    view.getByRole("button", { name: "Retry receipt upload" }),
  ).toBeDisabled();
  expect(
    fetcher.mock.calls.filter(([, init]) => init?.method === "PUT"),
  ).toHaveLength(2);
});

test("upload later preserves the created expense; an uncertain create cannot be retried blindly", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json(created, { status: 201 }))
    .mockResolvedValueOnce(
      Response.json({ error: "no receipt" }, { status: 415 }),
    );
  const view = setup(fetcher);
  const collection = {
    archivedTrips: [],
    trips: [{ id: empty.trip.id, expenseCount: 0 }],
  };
  view.client.setQueryData(["trips"], collection);
  const user = userEvent.setup();
  await fill(view, user);
  await user.upload(view.getByLabelText("Upload photo"), image());
  await user.click(view.getByRole("button", { name: "Record expense" }));
  await view.findByText(/Expense created, but receipt upload failed/);
  await user.click(view.getByRole("button", { name: "Upload later" }));
  expect(view.saved).toHaveBeenCalledOnce();
  expect(view.refreshed).toHaveBeenCalledOnce();
  expect(
    view.client.getQueryData<typeof collection>(["trips"])?.trips[0]
      .expenseCount,
  ).toBe(1);
  expect(fetcher).toHaveBeenCalledTimes(2);
  view.unmount();

  const uncertainFetch = vi
    .fn<typeof fetch>()
    .mockRejectedValue(new Error("lost response"));
  const uncertain = setup(uncertainFetch);
  await fill(uncertain, user);
  await user.upload(uncertain.getByLabelText("Upload photo"), image());
  await user.click(uncertain.getByRole("button", { name: "Record expense" }));
  expect(
    await uncertain.findByText(/Check the expense list before adding it again/),
  ).toBeVisible();
  expect(
    uncertain.getByRole("button", { name: "Record expense" }),
  ).toBeDisabled();
  expect(uncertainFetch).toHaveBeenCalledTimes(1);
});

test("going offline after choosing a photo blocks queueing until it is removed", async () => {
  const fetcher = vi.fn<typeof fetch>();
  const view = setup(fetcher);
  const user = userEvent.setup();
  await fill(view, user);
  await user.upload(view.getByLabelText("Upload photo"), image());
  view.setOffline(true);
  await user.click(view.getByRole("button", { name: "Save on this device" }));
  expect(view.getAllByText(/offline drafts do not store photos/)).toHaveLength(
    2,
  );
  expect(fetcher).not.toHaveBeenCalled();
  await user.click(view.getByRole("button", { name: "Remove photo" }));
  await user.click(view.getByRole("button", { name: "Save on this device" }));
  await waitFor(() => expect(view.saved).toHaveBeenCalledOnce());
});
