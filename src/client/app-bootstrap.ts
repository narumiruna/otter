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
    return {
      archivedTrips: [],
      readonlyShare: true,
      selected: await api<TripPayload>(
        `/api/share/${encodeURIComponent(shareToken)}`,
      ),
      trips: [],
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
