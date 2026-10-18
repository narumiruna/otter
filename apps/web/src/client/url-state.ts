const accountSettingsParameter = "account";
const accountSettingsValue = "settings";

export function isAccountSettingsLocation(url: URL): boolean {
  return (
    url.searchParams.get(accountSettingsParameter) === accountSettingsValue
  );
}

export function writeAccountSettingsLocation(url: URL, open: boolean): string {
  const next = new URL(url);
  if (open) {
    next.searchParams.set(accountSettingsParameter, accountSettingsValue);
  } else {
    next.searchParams.delete(accountSettingsParameter);
  }
  return `${next.pathname}${next.search}${next.hash}`;
}

export function withoutAccountSettingsLocation(url: URL): URL {
  const next = new URL(url);
  next.searchParams.delete(accountSettingsParameter);
  return next;
}

export const workspaceViews = [
  "overview",
  "expenses",
  "analysis",
  "people",
  "more",
] as const;

export type WorkspaceView = (typeof workspaceViews)[number];
export type WorkspaceMode = "add-expense" | "edit-expense" | null;

export type WorkspaceLocation = {
  expenseId: string | null;
  mode: WorkspaceMode;
  tripId: string | null;
  view: WorkspaceView;
};

export function readWorkspaceLocation(url: URL): WorkspaceLocation {
  const rawView = url.searchParams.get("view");
  const view = workspaceViews.includes(rawView as WorkspaceView)
    ? (rawView as WorkspaceView)
    : "overview";
  const rawMode = url.searchParams.get("mode");
  const mode =
    rawMode === "add-expense" || rawMode === "edit-expense" ? rawMode : null;
  return {
    expenseId:
      mode === "edit-expense" ? url.searchParams.get("expense") || null : null,
    mode,
    tripId: url.searchParams.get("trip") || null,
    view: mode === "edit-expense" ? "expenses" : view,
  };
}

export function isSameWorkspaceLocation(
  left: WorkspaceLocation,
  right: WorkspaceLocation,
): boolean {
  return (
    left.expenseId === right.expenseId &&
    left.mode === right.mode &&
    left.tripId === right.tripId &&
    left.view === right.view
  );
}

export function writeWorkspaceLocation(
  url: URL,
  location: WorkspaceLocation,
): string {
  const next = new URL(url);
  setOrDelete(next.searchParams, "trip", location.tripId);
  const view = location.mode === "edit-expense" ? "expenses" : location.view;
  if (view === "overview") {
    next.searchParams.delete("view");
  } else {
    next.searchParams.set("view", view);
  }
  setOrDelete(next.searchParams, "mode", location.mode);
  setOrDelete(
    next.searchParams,
    "expense",
    location.mode === "edit-expense" ? location.expenseId : null,
  );
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
