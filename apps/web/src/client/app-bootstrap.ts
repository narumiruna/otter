import type { LoginCredentials } from "./auth-screen.js";
import {
  api,
  type TripPayload,
  type TripSummary,
  type User,
} from "./client-support.js";

type TripCollection = {
  archivedTrips?: TripSummary[];
  trips: TripSummary[];
};

export type AppBootstrap = {
  archivedTrips: TripSummary[];
  devLoginCredentials?: LoginCredentials;
  readonlyShare: boolean;
  guestShare?: boolean;
  pendingShare?: string;
  selected: TripPayload | null;
  trips: TripSummary[];
  user: User | null;
};

export async function fetchAppBootstrap(
  pathname: string,
  search = "",
): Promise<AppBootstrap> {
  const shareToken = pathname.match(/^\/share\/([^/]+)$/)?.[1];
  if (shareToken) {
    const share = await api<
      TripPayload | { mode: "signed-in-edit"; tripName: string }
    >(`/api/share/${encodeURIComponent(shareToken)}`);
    if ("mode" in share && share.mode === "signed-in-edit") {
      const [config, me] = await Promise.all([
        api<{ devLoginCredentials: LoginCredentials | null }>("/api/config"),
        api<{ user: User | null }>("/api/me"),
      ]);
      if (me.user) {
        const joined = await api<{ tripId: string }>(
          `/api/share/${encodeURIComponent(shareToken)}/join`,
          { method: "POST" },
        );
        const destination = `/?trip=${encodeURIComponent(joined.tripId)}`;
        window.history.replaceState({}, "", destination);
        return fetchAppBootstrap(
          "/",
          `?trip=${encodeURIComponent(joined.tripId)}`,
        );
      }
      return {
        archivedTrips: [],
        devLoginCredentials: config.devLoginCredentials ?? undefined,
        pendingShare: share.tripName,
        readonlyShare: false,
        selected: null,
        trips: [],
        user: null,
      };
    }
    const selected = share as TripPayload;
    const guestShare = selected.shareMode === "anyone-edit";
    return {
      archivedTrips: [],
      guestShare,
      readonlyShare: !guestShare,
      selected,
      trips: guestShare
        ? [
            {
              id: selected.trip.id,
              name: selected.trip.name,
              baseCurrency: selected.trip.baseCurrency,
              archivedAt: selected.trip.archivedAt,
              participantCount: selected.trip.participants.length,
              expenseCount: selected.trip.expenses.length,
            },
          ]
        : [],
      user: null,
    };
  }

  const [config, me] = await Promise.all([
    api<{ devLoginCredentials: LoginCredentials | null }>("/api/config"),
    api<{ user: User | null }>("/api/me"),
  ]);
  if (!me.user) {
    return {
      archivedTrips: [],
      devLoginCredentials: config.devLoginCredentials ?? undefined,
      readonlyShare: false,
      selected: null,
      trips: [],
      user: null,
    };
  }
  if (pathname === "/device") {
    return {
      archivedTrips: [],
      devLoginCredentials: config.devLoginCredentials ?? undefined,
      readonlyShare: false,
      selected: null,
      trips: [],
      user: me.user,
    };
  }

  const collection = await api<TripCollection>("/api/trips");
  const archivedTrips = collection.archivedTrips ?? [];
  const requestedTripId = new URLSearchParams(search).get("trip");
  const selectedSummary =
    [...collection.trips, ...archivedTrips].find(
      (trip) => trip.id === requestedTripId,
    ) ??
    collection.trips[0] ??
    archivedTrips[0];
  const selected = selectedSummary
    ? await api<TripPayload>(`/api/trips/${selectedSummary.id}`)
    : null;
  return {
    archivedTrips,
    devLoginCredentials: config.devLoginCredentials ?? undefined,
    readonlyShare: false,
    selected,
    trips: collection.trips,
    user: me.user,
  };
}
