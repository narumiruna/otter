// @vitest-environment jsdom

import { Theme } from "@radix-ui/themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { AppShell } from "../app-shell.js";
import type { TripPayload } from "../client-support.js";
import { I18nProvider } from "../i18n.js";
import { WebMcpTools } from "./webmcp-tools.js";

type Tool = {
  name: string;
  inputSchema: { properties: Record<string, unknown> };
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: () => Promise<string>;
};
type Registration = { tool: Tool; signal: AbortSignal };
const registrations: Registration[] = [];
let signedIn = true;
let failRead = false;
let deferredRead: Promise<Response> | null = null;
const payload = (id: string): TripPayload => ({
  balances: [
    {
      participantId: "person_1",
      name: "Alice",
      amountMinor: -50,
      currency: "TWD",
    },
  ],
  settlements: [
    {
      fromId: "person_1",
      fromName: "Alice",
      toId: "person_2",
      toName: "Bob",
      amountMinor: 50,
      currency: "TWD",
    },
  ],
  trip: {
    id,
    name: id,
    ownerId: "user_1",
    baseCurrency: "TWD",
    participants: [
      { id: "person_1", name: "Alice" },
      { id: "person_2", name: "Bob" },
    ],
    expenses: [],
    createdAt: "2026-09-23T00:00:00.000Z",
  },
});

function renderApp() {
  return render(
    <Theme>
      <I18nProvider initialLocale="en">
        <QueryClientProvider
          client={
            new QueryClient({ defaultOptions: { queries: { retry: false } } })
          }
        >
          <AppShell />
        </QueryClientProvider>
      </I18nProvider>
    </Theme>,
  );
}

beforeEach(() => {
  registrations.length = 0;
  signedIn = true;
  failRead = false;
  deferredRead = null;
  window.history.replaceState({}, "", "/?trip=trip_1");
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  Object.defineProperty(document, "modelContext", {
    configurable: true,
    value: {
      registerTool: vi.fn(
        async (tool: Tool, { signal }: { signal: AbortSignal }) => {
          registrations.push({ tool, signal });
        },
      ),
    },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const path = new URL(String(input), window.location.origin).pathname;
      if (path === "/api/config")
        return Response.json({ devLoginCredentials: null });
      if (path === "/api/me")
        return Response.json({
          user: signedIn
            ? { id: "user_1", name: "Alice", username: "alice" }
            : null,
        });
      if (path === "/api/auth/logout" && init?.method === "POST") {
        signedIn = false;
        return Response.json({ ok: true });
      }
      if (path === "/api/trips")
        return Response.json({
          trips: [
            {
              id: "trip_1",
              name: "trip_1",
              baseCurrency: "TWD",
              participantCount: 2,
              expenseCount: 0,
            },
            {
              id: "trip_2",
              name: "trip_2",
              baseCurrency: "TWD",
              participantCount: 2,
              expenseCount: 0,
            },
          ],
          archivedTrips: [],
        });
      if (path === "/api/share/token") return Response.json(payload("trip_1"));
      if (path.startsWith("/api/trips/")) {
        if (failRead)
          return Response.json({ error: "Access denied" }, { status: 403 });
        if (deferredRead) return deferredRead;
        return Response.json(payload(path.slice("/api/trips/".length)));
      }
      throw new Error(`Unexpected request: ${path}`);
    }),
  );
});

afterEach(() => {
  Reflect.deleteProperty(document, "modelContext");
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("registers read-only tools and discards in-flight results on trip change", async () => {
  const view = render(<WebMcpTools tripId="trip_1" />);
  await waitFor(() => expect(registrations).toHaveLength(2));
  const old = registrations[0];
  expect(old.tool.inputSchema.properties).toEqual({});
  expect(old.tool.annotations).toEqual({
    readOnlyHint: true,
    untrustedContentHint: true,
  });
  expect(JSON.parse(await old.tool.execute())).toMatchObject({
    trip: "trip_1",
    unit: "minor",
  });
  expect(JSON.parse(await registrations[1].tool.execute())).toMatchObject({
    total: 1,
    unit: "minor",
  });

  let respond: (response: Response) => void = () => undefined;
  deferredRead = new Promise<Response>((resolve) => {
    respond = resolve;
  });
  const pending = old.tool.execute();
  view.rerender(<WebMcpTools tripId="trip_2" />);
  await waitFor(() => expect(registrations).toHaveLength(4));
  expect(old.signal.aborted).toBe(true);
  respond(Response.json(payload("trip_1")));
  await expect(pending).rejects.toThrow();
  deferredRead = null;
  expect(JSON.parse(await registrations[2].tool.execute())).toMatchObject({
    trip: "trip_2",
  });
  view.unmount();
  expect(registrations[2].signal.aborted).toBe(true);
  await expect(registrations[2].tool.execute()).rejects.toThrow(
    "Group has changed",
  );
});

test("fails closed on API errors or mismatched trip data", async () => {
  const view = render(<WebMcpTools tripId="trip_1" />);
  await waitFor(() => expect(registrations).toHaveLength(2));
  failRead = true;
  await expect(registrations[0].tool.execute()).rejects.toThrow(
    "Access denied",
  );
  failRead = false;
  deferredRead = Promise.resolve(Response.json(payload("trip_2")));
  await expect(registrations[1].tool.execute()).rejects.toThrow(
    "Group has changed",
  );
  view.unmount();
});

test("does nothing in browsers without WebMCP", () => {
  Reflect.deleteProperty(document, "modelContext");
  expect(() => render(<WebMcpTools tripId="trip_1" />)).not.toThrow();
  expect(registrations).toHaveLength(0);
});

test("cleans up when permissions policy rejects registration", async () => {
  Object.defineProperty(document, "modelContext", {
    configurable: true,
    value: {
      registerTool: vi.fn(
        async (tool: Tool, { signal }: { signal: AbortSignal }) => {
          registrations.push({ tool, signal });
          throw new DOMException("Not allowed", "NotAllowedError");
        },
      ),
    },
  });
  expect(() => render(<WebMcpTools tripId="trip_1" />)).not.toThrow();
  await waitFor(() => expect(registrations).toHaveLength(2));
  await waitFor(() => expect(registrations[0].signal.aborted).toBe(true));
});

test("only exposes tools in a loaded signed-in workspace and removes them on logout", async () => {
  const user = userEvent.setup();
  const view = renderApp();
  await waitFor(() => expect(registrations).toHaveLength(2));
  await user.click(view.getByRole("button", { name: /Alice.*account menu/i }));
  await user.click(await view.findByRole("menuitem", { name: "Sign out" }));
  await waitFor(() => expect(registrations[0].signal.aborted).toBe(true));
  await expect(registrations[0].tool.execute()).rejects.toThrow(
    "Group has changed",
  );
  expect(view.getByRole("button", { name: /Sign in/i })).toBeVisible();
});

test.each(["/share/token", "/device"])(
  "does not expose tools on %s",
  async (pathname) => {
    window.history.replaceState({}, "", pathname);
    const view = renderApp();
    await waitFor(() =>
      expect(view.queryByText("Loading")).not.toBeInTheDocument(),
    );
    expect(registrations).toHaveLength(0);
  },
);

test("does not expose tools when signed out", async () => {
  signedIn = false;
  const view = renderApp();
  expect(await view.findByRole("button", { name: /Sign in/i })).toBeVisible();
  expect(registrations).toHaveLength(0);
});
