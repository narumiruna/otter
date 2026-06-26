import type { Currency } from "../shared/money.js";
import type { Balance, Settlement, Trip } from "../shared/settlement.js";

export type User = {
  id: string;
  name: string;
  email: string;
};

export type TripSummary = {
  id: string;
  name: string;
  baseCurrency: Currency;
  participantCount: number;
  expenseCount: number;
};

export type TripPayload = {
  trip: Trip;
  balances: Balance[];
  settlements: Settlement[];
};

export type DevAdmin = {
  email: string;
  password: string;
};

export type AppState = {
  user: User | null;
  trips: TripSummary[];
  selected: TripPayload | null;
  message: string;
  error: string;
  devAdmin: DevAdmin | null;
};

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const data = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "Request failed");
  }

  return data;
}

export function htmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function todayDate(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function safeFilename(value: string): string {
  return value.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "trip";
}

export function splitSelectionError(
  participantIds: readonly string[],
): string | null {
  return participantIds.length === 0 ? "請至少選擇一位分帳參與者" : null;
}

export function splitShortcutChecked(
  value: string | undefined,
): boolean | null {
  if (value === "all") {
    return true;
  }
  if (value === "none") {
    return false;
  }
  return null;
}

export function expenseSplitLabel(
  trip: Trip,
  participantIds: string[],
): string {
  const participantById = new Map(
    trip.participants.map((participant) => [participant.id, participant.name]),
  );
  const splitIds = new Set(participantIds);
  if (
    trip.participants.length > 0 &&
    trip.participants.every((participant) => splitIds.has(participant.id)) &&
    participantIds.every((participantId) => participantById.has(participantId))
  ) {
    return "所有人";
  }
  return participantIds
    .map((participantId) => participantById.get(participantId) ?? "未知")
    .join("、");
}

export function participantDeleteBlockReason(
  trip: Trip,
  participantId: string,
): string | null {
  if (trip.participants.length <= 1) {
    return "至少需要一位參與者";
  }
  if (
    trip.expenses.some(
      (expense) =>
        expense.paidById === participantId ||
        expense.participantIds.includes(participantId),
    )
  ) {
    return "已有支出";
  }
  return null;
}

export function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
