export const workspaceViews = [
  "overview",
  "expenses",
  "people",
  "more",
] as const;

export type WorkspaceView = (typeof workspaceViews)[number];
export type WorkspaceMode = "add-expense" | null;

export type WorkspaceLocation = {
  mode: WorkspaceMode;
  tripId: string | null;
  view: WorkspaceView;
};

export function readWorkspaceLocation(url: URL): WorkspaceLocation {
  const rawView = url.searchParams.get("view");
  const view = workspaceViews.includes(rawView as WorkspaceView)
    ? (rawView as WorkspaceView)
    : "overview";
  return {
    mode: url.searchParams.get("mode") === "add-expense" ? "add-expense" : null,
    tripId: url.searchParams.get("trip") || null,
    view,
  };
}

export function writeWorkspaceLocation(
  url: URL,
  location: WorkspaceLocation,
): string {
  const next = new URL(url);
  setOrDelete(next.searchParams, "trip", location.tripId);
  if (location.view === "overview") {
    next.searchParams.delete("view");
  } else {
    next.searchParams.set("view", location.view);
  }
  setOrDelete(next.searchParams, "mode", location.mode);
  return `${next.pathname}${next.search}${next.hash}`;
}

function setOrDelete(
  parameters: URLSearchParams,
  key: string,
  value: string | null,
) {
  if (value) {
    parameters.set(key, value);
  } else {
    parameters.delete(key);
  }
}
