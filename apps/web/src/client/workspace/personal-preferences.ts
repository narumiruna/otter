import type { Trip } from "@narumitw/otter-contracts";
import { parseSplitMode } from "@narumitw/otter-core/expense-splits";
import { isCurrency, parseAmountToMinor } from "@narumitw/otter-core/money";
import type { QueuedExpenseDraft } from "../expense-queue.js";

export type PersonalPreferences = {
  defaults?: Pick<
    QueuedExpenseDraft,
    "currency" | "participantIds" | "splitMode" | "splitValues"
  >;
};
export type PreferenceStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;
export function preferenceKey(userId: string, tripId: string) {
  return `otter.personal.v1:${encodeURIComponent(userId)}:${encodeURIComponent(tripId)}`;
}
function storage(): PreferenceStorage {
  return window.localStorage;
}
export function readPreferences(
  userId: string,
  tripId: string,
  store?: PreferenceStorage,
): { preferences: PersonalPreferences; failed: boolean } {
  try {
    const raw = (store ?? storage()).getItem(preferenceKey(userId, tripId));
    if (!raw) return { preferences: {}, failed: false };
    const value: unknown = JSON.parse(raw);
    if (!record(value) || value.version !== 1)
      throw new Error("Invalid preferences");
    let defaults: PersonalPreferences["defaults"];
    if (value.defaults !== undefined) {
      const d = value.defaults;
      if (
        !record(d) ||
        !isCurrency(d.currency) ||
        !Array.isArray(d.participantIds) ||
        !d.participantIds.every((id) => typeof id === "string") ||
        !["equal", "amount", "ratio", "shares"].includes(String(d.splitMode)) ||
        !record(d.splitValues) ||
        !Object.values(d.splitValues).every((v) => typeof v === "string")
      )
        throw new Error("Invalid defaults");
      defaults = {
        currency: d.currency,
        participantIds: d.participantIds,
        splitMode: parseSplitMode(d.splitMode),
        splitValues: Object.fromEntries(
          Object.entries(d.splitValues).map(([id, v]) => [id, String(v)]),
        ),
      };
    }
    let failed = false;
    if (Object.hasOwn(value, "participantId")) {
      const { participantId: _identity, ...remaining } = value;
      try {
        (store ?? storage()).setItem(
          preferenceKey(userId, tripId),
          JSON.stringify(remaining),
        );
      } catch {
        failed = true;
      }
    }
    return { preferences: { defaults }, failed };
  } catch {
    return { preferences: {}, failed: true };
  }
}
export function writePreferences(
  userId: string,
  tripId: string,
  preferences: PersonalPreferences,
  store?: PreferenceStorage,
): boolean {
  try {
    (store ?? storage()).setItem(
      preferenceKey(userId, tripId),
      JSON.stringify({ version: 1, defaults: preferences.defaults }),
    );
    return true;
  } catch {
    return false;
  }
}
export function clearPreferences(
  userId: string,
  tripId: string,
  store?: PreferenceStorage,
): boolean {
  try {
    (store ?? storage()).removeItem(preferenceKey(userId, tripId));
    return true;
  } catch {
    return false;
  }
}
export function reconcilePreferences(
  preferences: PersonalPreferences,
  trip: Trip,
): { preferences: PersonalPreferences; changed: boolean } {
  const ids = new Set(trip.participants.map((p) => p.id));
  const d = preferences.defaults;
  const valid =
    !d ||
    (isCurrency(d.currency) &&
      d.participantIds.length > 0 &&
      new Set(d.participantIds).size === d.participantIds.length &&
      d.participantIds.every((id) => ids.has(id)) &&
      validSplitValues(d));
  return {
    preferences: { defaults: valid ? d : undefined },
    changed: !valid,
  };
}
export function defaultsPreference(
  draft: QueuedExpenseDraft,
): NonNullable<PersonalPreferences["defaults"]> {
  return {
    currency: draft.currency,
    participantIds: [...draft.participantIds],
    splitMode: draft.splitMode,
    splitValues: Object.fromEntries(
      draft.participantIds.map((id) => [id, draft.splitValues[id] ?? ""]),
    ),
  };
}
function validSplitValues(
  d: NonNullable<PersonalPreferences["defaults"]>,
): boolean {
  if (!isCurrency(d.currency)) return false;
  if (d.splitMode === "equal") return true;
  try {
    const values = d.participantIds.map((id) => {
      const value = d.splitValues[id]?.trim() ?? "";
      if (d.splitMode === "amount")
        return parseAmountToMinor(value, d.currency);
      if (!/^\d+(\.\d+)?$/.test(value)) throw new Error("Invalid weight");
      const weight = Number(value);
      if (!Number.isFinite(weight) || weight <= 0)
        throw new Error("Invalid weight");
      return weight;
    });
    const total = values.reduce((sum, v) => sum + v, 0);
    return (
      Number.isFinite(total) &&
      (d.splitMode !== "amount" || Number.isSafeInteger(total))
    );
  } catch {
    return false;
  }
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
