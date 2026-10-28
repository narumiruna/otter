// @vitest-environment jsdom

import type { TripShareLink } from "@narumitw/otter-contracts";
import { Theme } from "@radix-ui/themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import type { TripPayload } from "../client-support.js";
import { I18nProvider } from "../i18n.js";
import { AccessSettings } from "./access-settings.js";
import { WorkspaceProvider } from "./workspace-context.js";

const payload: TripPayload = {
  balances: [],
  settlements: [],
  shareLinks: [],
  currentUserRole: "owner",
  trip: {
    id: "trip_1",
    name: "Trip",
    ownerId: "user_1",
    baseCurrency: "TWD",
    createdAt: "2026-09-20T00:00:00.000Z",
    expenses: [],
    participants: [],
  },
};

function link(id: string, extra: Partial<TripShareLink> = {}): TripShareLink {
  return {
    id,
    mode: "readonly",
    createdAt: "2026-09-20T00:00:00.000Z",
    revokedAt: null,
    expiresAt: null,
    url: `https://otter.test/share/${id}`,
    ...extra,
  };
}

function metadata(links: TripShareLink[]): TripPayload {
  return {
    ...payload,
    shareLinks: links.map(({ url: _url, ...item }) => item),
  };
}

const clients: QueryClient[] = [];
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  vi.unstubAllGlobals();
});

function settings(initial = payload) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  clients.push(client);
  const announce = vi.fn();
  let update = (_next: TripPayload) => {};
  let navigate = (_visible: boolean) => {};
  let account = (_userId: string | undefined) => {};
  let connectivity = (_offline: boolean) => {};
  function Harness() {
    const [current, setCurrent] = useState(initial);
    const [visible, setVisible] = useState(true);
    const [userId, setUserId] = useState<string | undefined>("user_1");
    const [offline, setOffline] = useState(false);
    update = (next) => act(() => setCurrent(next));
    navigate = (next) => act(() => setVisible(next));
    account = (next) => act(() => setUserId(next));
    connectivity = (next) => act(() => setOffline(next));
    return (
      <Theme>
        <I18nProvider initialLocale="en">
          <QueryClientProvider client={client}>
            <WorkspaceProvider
              announce={announce}
              offline={offline}
              payload={current}
              onPayload={setCurrent}
              refreshCollection={async () => undefined}
              userId={userId}
            >
              {visible ? <AccessSettings payload={current} expanded /> : null}
            </WorkspaceProvider>
          </QueryClientProvider>
        </I18nProvider>
      </Theme>
    );
  }
  const view = render(<Harness />);
  return {
    ...view,
    client,
    announce,
    update: (next: TripPayload) => update(next),
    navigate: (next: boolean) => navigate(next),
    account: (next: string | undefined) => account(next),
    connectivity: (next: boolean) => connectivity(next),
  };
}

async function create(view: ReturnType<typeof settings>, mode = "readonly") {
  fireEvent.change(view.getByLabelText("Link permission"), {
    target: { value: mode },
  });
  fireEvent.click(view.getByRole("button", { name: "Create share link" }));
  fireEvent.click(
    within(view.getByRole("dialog")).getByRole("button", {
      name: "Create share link",
    }),
  );
  await waitFor(() =>
    expect(view.queryByRole("dialog")).not.toBeInTheDocument(),
  );
}

test("two created links stay visible and independently copyable through metadata updates and navigation", async () => {
  let links: TripShareLink[] = [];
  const modes: string[] = [];
  const fetchMock = vi.fn(async (path: string, init?: RequestInit) => {
    expect(path).toBe("/api/trips/trip_1/share-links");
    if (init?.method === "POST") {
      const mode = JSON.parse(String(init.body)).mode;
      modes.push(mode);
      const created = link(`link-${links.length + 1}`, { mode });
      links = [...links, created];
      // Include an older URL first: automatic copy must use the new ID and mode.
      return Response.json({ ...payload, shareLinks: links });
    }
    return Response.json({ shareLinks: links });
  });
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  const copy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
  const view = settings();
  await create(view, "signed-in-edit");
  await create(view, "anyone-edit");
  expect(modes).toEqual(["signed-in-edit", "anyone-edit"]);
  expect(copy.mock.calls.slice(0, 2)).toEqual(links.map((item) => [item.url]));
  view.update(metadata(links));
  await waitFor(() =>
    expect(view.getAllByLabelText("Share link address")).toHaveLength(2),
  );
  for (const [index, item] of links.entries()) {
    const field = view.getAllByRole("textbox", { name: "Share link address" })[
      index
    ];
    expect(field).toHaveValue(item.url);
    expect(field).toHaveAttribute("readonly");
    const row = field?.closest("li");
    if (!row) throw new Error("Missing share link row");
    expect(
      within(row).getByRole("link", { name: "Open link" }),
    ).toHaveAttribute("href", item.url);
    await user.click(within(row).getByRole("button", { name: "Copy" }));
    expect(copy).toHaveBeenLastCalledWith(item.url);
  }
  expect(
    view.client
      .getQueryData<TripPayload>(["trip", "trip_1"])
      ?.shareLinks?.every((item) => !item.url),
  ).toBe(true);
  view.navigate(false);
  await waitFor(() =>
    expect(
      view.client.getQueryData(["owner-share-links", "user_1", "trip_1"]),
    ).toBeUndefined(),
  );
  view.navigate(true);
  await waitFor(() =>
    expect(view.getAllByLabelText("Share link address")).toHaveLength(2),
  );
  expect(
    fetchMock.mock.calls.filter(([, init]) => init?.method !== "POST").length,
  ).toBeGreaterThanOrEqual(3);
});

test("a create completed after navigation is recovered even when trip metadata is stale", async () => {
  const created = link("created-after-navigation");
  let saved: TripShareLink[] = [];
  let finish: (response: Response) => void = () => {};
  const fetchMock = vi.fn(async (_path: string, init?: RequestInit) => {
    if (init?.method === "POST")
      return new Promise<Response>((resolve) => {
        finish = resolve;
      });
    return Response.json({ shareLinks: saved });
  });
  vi.stubGlobal("fetch", fetchMock);
  const view = settings();
  await waitFor(() =>
    expect(view.queryByRole("status")).not.toBeInTheDocument(),
  );
  fireEvent.click(view.getByRole("button", { name: "Create share link" }));
  fireEvent.click(
    within(view.getByRole("dialog")).getByRole("button", {
      name: "Create share link",
    }),
  );
  await waitFor(() =>
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === "POST"),
    ).toBe(true),
  );
  view.navigate(false);
  saved = [created];
  await act(async () =>
    finish(Response.json({ ...payload, shareLinks: saved })),
  );
  view.navigate(true);
  expect(await view.findByLabelText("Share link address")).toHaveValue(
    created.url,
  );
  expect(
    await view.findByText("1 active link · 0 collaborators"),
  ).toBeVisible();
  expect(
    view.client.getQueryData<TripPayload>(["trip", "trip_1"])?.shareLinks?.[0]
      ?.url,
  ).toBeUndefined();
});

test("returning before a pending create completes refreshes the current recovery query", async () => {
  const created = link("created-after-return");
  const recoveryKey = ["owner-share-links", "user_1", "trip_1"] as const;
  const otherKeys = [
    ["owner-share-links", "user_2", "trip_1"],
    ["owner-share-links", "user_1", "trip_2"],
  ];
  let saved: TripShareLink[] = [];
  let finish: (response: Response) => void = () => {};
  let reads = 0;
  const fetchMock = vi.fn(async (_path: string, init?: RequestInit) => {
    if (init?.method === "POST")
      return new Promise<Response>((resolve) => {
        finish = resolve;
      });
    reads++;
    return Response.json({ shareLinks: saved });
  });
  vi.stubGlobal("fetch", fetchMock);
  const view = settings();
  await waitFor(() =>
    expect(view.client.getQueryData(recoveryKey)).toEqual({ shareLinks: [] }),
  );
  for (const key of otherKeys)
    view.client.setQueryData(key, { shareLinks: [] });
  fireEvent.click(view.getByRole("button", { name: "Create share link" }));
  fireEvent.click(
    within(view.getByRole("dialog")).getByRole("button", {
      name: "Create share link",
    }),
  );
  await waitFor(() =>
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === "POST"),
    ).toBe(true),
  );
  view.navigate(false);
  view.navigate(true);
  await waitFor(() => {
    expect(reads).toBeGreaterThanOrEqual(2);
    expect(view.client.getQueryState(recoveryKey)?.fetchStatus).toBe("idle");
  });
  expect(view.queryByLabelText("Share link address")).not.toBeInTheDocument();
  saved = [created];
  await act(async () =>
    finish(Response.json({ ...payload, shareLinks: saved })),
  );
  expect(await view.findByLabelText("Share link address")).toHaveValue(
    created.url,
  );
  expect(
    await view.findByText("1 active link · 0 collaborators"),
  ).toBeVisible();
  expect(view.announce).not.toHaveBeenCalled();
  expect(
    view.client.getQueryData<TripPayload>(["trip", "trip_1"])?.shareLinks?.[0]
      ?.url,
  ).toBeUndefined();
  for (const key of otherKeys)
    expect(view.client.getQueryState(key)?.isInvalidated).toBe(false);
});

test("recovered revocation and expiry override older active trip metadata", async () => {
  const active = [link("revoked-on-server"), link("expired-on-server")];
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        shareLinks: [
          { ...active[0], revokedAt: "2026-01-01T00:00:00Z", url: undefined },
          { ...active[1], expiresAt: "2020-01-01T00:00:00Z", url: undefined },
        ],
      }),
    ),
  );
  const view = settings(metadata(active));
  expect(await view.findByText("Revoked", { exact: true })).toBeVisible();
  expect(view.getByText("Expired", { exact: true })).toBeVisible();
  expect(view.queryByLabelText("Share link address")).not.toBeInTheDocument();
  expect(
    view.queryByText(
      "This older link cannot be shown again. Create a new link to copy it.",
    ),
  ).not.toBeInTheDocument();
});

test("clipboard rejection keeps a visible manual-copy field and localized errors", async () => {
  const created = link("manual-copy");
  let exists = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_path: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        exists = true;
        return Response.json({ ...payload, shareLinks: [created] });
      }
      return Response.json({ shareLinks: exists ? [created] : [] });
    }),
  );
  const user = userEvent.setup();
  vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
    new Error("Denied"),
  );
  const view = settings();
  await create(view);
  const field = view.getByRole("textbox", { name: "Share link address" });
  expect(field).toHaveValue(created.url);
  expect(view.getByRole("alert")).toHaveTextContent(
    /blocked automatic copying/i,
  );
  await user.click(field);
  expect(field).toHaveFocus();
  expect((field as HTMLInputElement).selectionStart).toBe(0);
  expect((field as HTMLInputElement).selectionEnd).toBe(created.url?.length);
  await user.click(view.getByRole("button", { name: "Copy" }));
  expect(view.getByRole("alert")).toHaveTextContent(/blocked copying/i);
  expect(field).toHaveValue(created.url);
});

test("reload recovers two links; legacy, revoked and expired links never expose an address", async () => {
  const links = [
    link("first"),
    link("second", { mode: "anyone-edit" }),
    link("legacy", { url: undefined }),
    link("revoked", { revokedAt: "2026-09-21T00:00:00Z" }),
    link("expired", { expiresAt: "2020-01-01T00:00:00Z" }),
  ];
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ shareLinks: links })),
  );
  const view = settings(metadata(links));
  await waitFor(() =>
    expect(view.getAllByLabelText("Share link address")).toHaveLength(2),
  );
  expect(
    view.getByText(
      "This older link cannot be shown again. Create a new link to copy it.",
    ),
  ).toBeVisible();
  expect(view.getByText("Expired", { exact: true })).toBeVisible();
  expect(view.getAllByRole("link", { name: "Open link" })).toHaveLength(2);
  expect(view.queryByDisplayValue(links[3]?.url ?? "")).not.toBeInTheDocument();
  expect(view.queryByDisplayValue(links[4]?.url ?? "")).not.toBeInTheDocument();
  // A metadata-only authoritative update must beat an older recovery response.
  view.update(
    metadata(
      links.map((item) =>
        item.id === "first"
          ? { ...item, revokedAt: "2026-09-22T00:00:00Z" }
          : item,
      ),
    ),
  );
  expect(view.queryByDisplayValue(links[0]?.url ?? "")).not.toBeInTheDocument();
  expect(view.getAllByLabelText("Share link address")).toHaveLength(1);
});

test("an address stops being usable when it expires while settings stay open", async () => {
  const item = link("expires-soon", {
    expiresAt: new Date(Date.now() + 500).toISOString(),
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ shareLinks: [item] })),
  );
  const view = settings(metadata([item]));
  expect(await view.findByLabelText("Share link address")).toHaveValue(
    item.url,
  );
  await waitFor(
    () =>
      expect(
        view.queryByLabelText("Share link address"),
      ).not.toBeInTheDocument(),
    { timeout: 2000 },
  );
  expect(view.getByText("Expired")).toBeVisible();
  expect(
    view.queryByRole("link", { name: "Open link" }),
  ).not.toBeInTheDocument();
  expect(view.queryByRole("button", { name: "Copy" })).not.toBeInTheDocument();
});

test("revocation removes the address and refreshes recovery data", async () => {
  let current = link("revoke-me");
  let reads = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_path: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        current = {
          ...current,
          revokedAt: new Date().toISOString(),
          url: undefined,
        };
        return Response.json(metadata([current]));
      }
      reads++;
      return Response.json({ shareLinks: [current] });
    }),
  );
  const view = settings(metadata([current]));
  await view.findByLabelText("Share link address");
  const user = userEvent.setup();
  await user.click(view.getByRole("button", { name: "Revoke" }));
  await user.click(view.getByRole("button", { name: "Revoke link" }));
  await waitFor(() =>
    expect(view.queryByLabelText("Share link address")).not.toBeInTheDocument(),
  );
  await waitFor(() => expect(reads).toBeGreaterThan(1));
  expect(
    view.queryByRole("link", { name: "Open link" }),
  ).not.toBeInTheDocument();
});

test("recovery has loading, retry and offline states without losing known URLs", async () => {
  let respond: (value: Response) => void = () => {};
  const fetchMock = vi.fn(
    () =>
      new Promise<Response>((resolve) => {
        respond = resolve;
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  const item = link("recovered");
  const view = settings(metadata([item]));
  expect(view.getByRole("status")).toHaveTextContent("Loading");
  await act(async () =>
    respond(Response.json({ error: "Recovery failed" }, { status: 500 })),
  );
  expect(await view.findByRole("alert")).toHaveTextContent("Recovery failed");
  const user = userEvent.setup();
  await user.click(view.getByRole("button", { name: "Reload" }));
  await act(async () => respond(Response.json({ shareLinks: [item] })));
  expect(await view.findByLabelText("Share link address")).toHaveValue(
    item.url,
  );
  view.connectivity(true);
  expect(view.getByRole("status")).toHaveTextContent("You are offline");
  expect(view.getByLabelText("Share link address")).toHaveValue(item.url);
  expect(
    view.getByRole("button", { name: "Create share link" }),
  ).toBeDisabled();
  expect(view.getByRole("button", { name: "Revoke" })).toBeDisabled();
});

test("recovery URLs are isolated by account, trip and owner role", async () => {
  const item = link("private-owner-token");
  const fetchMock = vi.fn(async () => Response.json({ shareLinks: [item] }));
  vi.stubGlobal("fetch", fetchMock);
  const view = settings(metadata([item]));
  await view.findByLabelText("Share link address");
  let respond: (value: Response) => void = () => {};
  fetchMock.mockImplementation(
    () =>
      new Promise<Response>((resolve) => {
        respond = resolve;
      }),
  );
  view.account("user_2");
  expect(view.queryByDisplayValue(item.url ?? "")).not.toBeInTheDocument();
  await act(async () => respond(Response.json({ shareLinks: [] })));
  expect(view.queryByLabelText("Share link address")).not.toBeInTheDocument();
  const calls = fetchMock.mock.calls.length;
  view.account(undefined);
  await act(async () => {});
  expect(view.queryByLabelText("Share link address")).not.toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(calls);
  view.account("user_1");
  view.update({ ...metadata([item]), trip: { ...payload.trip, id: "trip_2" } });
  expect(view.queryByDisplayValue(item.url ?? "")).not.toBeInTheDocument();
  view.update({ ...metadata([item]), currentUserRole: "editor" });
  expect(view.queryByLabelText("Share link address")).not.toBeInTheDocument();
});
