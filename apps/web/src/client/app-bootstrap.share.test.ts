// @vitest-environment jsdom

import { afterEach, expect, test, vi } from "vitest";
import { fetchAppBootstrap } from "./app-bootstrap.js";
import { api } from "./client-support.js";

const token = "x".repeat(43);
const trip = {
  id: "trip_shared",
  name: "Shared trip",
  ownerId: "owner",
  baseCurrency: "TWD",
  createdAt: "2026-09-20T00:00:00.000Z",
  participants: [{ id: "person", name: "Alice" }],
  expenses: [],
};

afterEach(() => vi.unstubAllGlobals());

test("anonymous editing sends the share capability only to trip APIs", async () => {
  window.history.replaceState({}, "", `/share/${token}`);
  const fetcher = vi.fn(async (path: string, _init: RequestInit) => {
    if (path.startsWith("/api/share/")) {
      return Response.json({
        trip,
        balances: [],
        settlements: [],
        shareMode: "anyone-edit",
        currentUserRole: "editor",
      });
    }
    return Response.json({ ok: true });
  });
  vi.stubGlobal("fetch", fetcher);
  const bootstrap = await fetchAppBootstrap(window.location.pathname);
  expect(bootstrap.guestShare).toBe(true);
  expect(bootstrap.readonlyShare).toBe(false);
  expect(bootstrap.trips).toHaveLength(1);
  await api("/api/trips/trip_shared/participants", { method: "POST" });
  await api("/api/me");
  expect(
    new Headers(fetcher.mock.calls[1]?.[1].headers).get("X-Otter-Share-Token"),
  ).toBe(token);
  expect(
    new Headers(fetcher.mock.calls[2]?.[1].headers).has("X-Otter-Share-Token"),
  ).toBe(false);
});

test("signed-in invite waits for login and then joins once before opening the trip", async () => {
  window.history.replaceState({}, "", `/share/${token}`);
  let loggedIn = false;
  const paths: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: string) => {
      paths.push(path);
      if (path === `/api/share/${token}`)
        return Response.json({
          mode: "signed-in-edit",
          tripName: "Shared trip",
        });
      if (path === "/api/config")
        return Response.json({ devLoginCredentials: null });
      if (path === "/api/me")
        return Response.json({
          user: loggedIn
            ? { id: "editor", name: "Editor", username: "editor" }
            : null,
        });
      if (path === `/api/share/${token}/join`)
        return Response.json({ tripId: trip.id });
      if (path === "/api/trips")
        return Response.json({
          trips: [
            {
              id: trip.id,
              name: trip.name,
              baseCurrency: "TWD",
              participantCount: 1,
              expenseCount: 0,
            },
          ],
          archivedTrips: [],
        });
      if (path === `/api/trips/${trip.id}`)
        return Response.json({
          trip,
          balances: [],
          settlements: [],
          currentUserRole: "editor",
        });
      throw new Error(`Unexpected request: ${path}`);
    }),
  );
  const pending = await fetchAppBootstrap(window.location.pathname);
  expect(pending.pendingShare).toBe("Shared trip");
  expect(paths).not.toContain(`/api/share/${token}/join`);
  loggedIn = true;
  const joined = await fetchAppBootstrap(window.location.pathname);
  expect(joined.selected?.trip.id).toBe(trip.id);
  expect(
    paths.filter((path) => path === `/api/share/${token}/join`),
  ).toHaveLength(1);
  expect(window.location.pathname).toBe("/");
  expect(window.location.search).toBe("?trip=trip_shared");
});
