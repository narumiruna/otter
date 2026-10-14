import type { Trip } from "@narumitw/otter-contracts";
import { useEffect, useMemo, useState } from "react";
import {
  clearPreferences,
  type PersonalPreferences,
  readPreferences,
  reconcilePreferences,
  writePreferences,
} from "./personal-preferences.js";

export function usePersonalPreferences(userId: string | undefined, trip: Trip) {
  const scope = JSON.stringify([userId ?? null, trip.id]);
  const load = () => ({
    scope,
    ...(userId
      ? readPreferences(userId, trip.id)
      : { preferences: {}, failed: false }),
    changed: false,
  });
  const [state, setState] = useState(load);
  // Discard the previous scope before children can consume another account's values.
  if (state.scope !== scope) setState(load());
  const current = state.scope === scope ? state : load();
  const reconciled = useMemo(
    () => reconcilePreferences(current.preferences, trip),
    [current.preferences, trip],
  );
  useEffect(() => {
    if (!reconciled.changed || state.scope !== scope) return;
    const failed =
      !!userId && !writePreferences(userId, trip.id, reconciled.preferences);
    setState({
      scope,
      preferences: reconciled.preferences,
      failed,
      changed: true,
    });
  }, [reconciled, scope, state.scope, userId, trip.id]);
  function save(preferences: PersonalPreferences) {
    if (!userId) return false;
    const next = reconcilePreferences(preferences, trip);
    const failed = !writePreferences(userId, trip.id, next.preferences);
    setState({
      scope,
      preferences: next.preferences,
      failed,
      changed: next.changed,
    });
    return !failed && !next.changed;
  }
  function clear() {
    if (!userId) return;
    const failed = !clearPreferences(userId, trip.id);
    setState({ scope, preferences: {}, failed, changed: false });
  }
  return {
    preferences: reconciled.preferences,
    preferencesFailed: current.failed,
    preferencesChanged: current.changed || reconciled.changed,
    savePreferences: save,
    clearPreferences: clear,
  };
}
