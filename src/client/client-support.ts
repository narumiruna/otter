import { type Currency, convertMinorWithRates } from "../shared/money.js";
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
  archivedAt?: string | null;
  participantCount: number;
  expenseCount: number;
};

export type TripPayload = {
  trip: Trip;
  balances: Balance[];
  settlements: Settlement[];
};

export const workspaceTabs = [
  "add-expense",
  "overview",
  "expenses",
  "members",
  "settings",
] as const;

export type WorkspaceTab = (typeof workspaceTabs)[number];

export function workspaceTabForKey(
  currentTab: WorkspaceTab,
  key: string,
): WorkspaceTab | null {
  const currentIndex = workspaceTabs.indexOf(currentTab);
  switch (key) {
    case "ArrowDown":
    case "ArrowRight":
      return workspaceTabs[(currentIndex + 1) % workspaceTabs.length];
    case "ArrowLeft":
    case "ArrowUp":
      return workspaceTabs[
        (currentIndex - 1 + workspaceTabs.length) % workspaceTabs.length
      ];
    case "Home":
      return workspaceTabs[0];
    case "End":
      return workspaceTabs[workspaceTabs.length - 1];
    default:
      return null;
  }
}

export type DevAdmin = {
  email: string;
  password: string;
};

export type SpendingSummary = {
  totalMinor: number;
  dailyTotals: { amountMinor: number; date: string }[];
  payerTotals: { amountMinor: number; name: string; participantId: string }[];
  categoryTotals: { amountMinor: number; category: string }[];
};

export type ExpenseFilters = {
  query: string;
  dateFrom: string;
  dateTo: string;
  paidById: string;
  participantId: string;
  currency: string;
  category: string;
  tag: string;
  sort: "date-desc" | "date-asc" | "amount-desc" | "amount-asc";
};

export const defaultExpenseFilters: ExpenseFilters = {
  category: "",
  currency: "",
  dateFrom: "",
  dateTo: "",
  paidById: "",
  participantId: "",
  query: "",
  sort: "date-desc",
  tag: "",
};

export function isExpenseSort(value: string): value is ExpenseFilters["sort"] {
  return (
    value === "date-desc" ||
    value === "date-asc" ||
    value === "amount-desc" ||
    value === "amount-asc"
  );
}

export type AppState = {
  user: User | null;
  trips: TripSummary[];
  archivedTrips: TripSummary[];
  selected: TripPayload | null;
  activeTab: WorkspaceTab;
  expenseFilters: ExpenseFilters;
  message: string;
  error: string;
  formError?: string;
  formErrorTarget?: string;
  busy: boolean;
  devAdmin: DevAdmin | null;
};

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      ...init,
    });
  } catch {
    throw new Error("連線失敗，請稍後再試");
  }
  let data: unknown;
  let parsedJson = false;
  try {
    data = await response.json();
    parsedJson = true;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : "Request failed";
    throw new Error(error);
  }

  if (!parsedJson) {
    throw new Error("伺服器回應格式錯誤");
  }

  return data as T;
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

export function defaultExpenseFormValues(trip: Trip) {
  return {
    currency: trip.baseCurrency,
    expenseDate: todayDate(),
    paidById: trip.participants[0]?.id ?? "",
    participantIds: trip.participants.map((participant) => participant.id),
  };
}

export function expenseFormError(values: {
  amount: string;
  participantIds: readonly string[];
}): string | null {
  if (!values.amount.trim()) {
    return "請輸入支出金額";
  }
  return splitSelectionError(values.participantIds);
}

export function safeFilename(value: string): string {
  return value.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "trip";
}

export function splitCountLabel(
  selectedCount: number,
  totalCount: number,
): string {
  return `已選 ${selectedCount} / ${totalCount}`;
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

export function spendingSummary(trip: Trip): SpendingSummary {
  const participantById = new Map(
    trip.participants.map((participant) => [participant.id, participant.name]),
  );
  const dailyTotals = new Map<string, number>();
  const payerTotals = new Map<string, number>();
  const categoryTotals = new Map<string, number>();
  let totalMinor = 0;

  for (const expense of trip.expenses) {
    const amount = convertMinorWithRates(
      expense.amountMinor,
      expense.currency,
      trip.baseCurrency,
      trip.exchangeRates,
    );
    totalMinor += amount;
    dailyTotals.set(
      expense.expenseDate,
      (dailyTotals.get(expense.expenseDate) ?? 0) + amount,
    );
    payerTotals.set(
      expense.paidById,
      (payerTotals.get(expense.paidById) ?? 0) + amount,
    );
    const category = expense.category ?? "其他";
    categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + amount);
  }

  return {
    categoryTotals: [...categoryTotals.entries()]
      .map(([category, amountMinor]) => ({ amountMinor, category }))
      .sort((left, right) => right.amountMinor - left.amountMinor),
    dailyTotals: [...dailyTotals.entries()]
      .map(([date, amountMinor]) => ({ amountMinor, date }))
      .sort((left, right) => left.date.localeCompare(right.date)),
    payerTotals: [...payerTotals.entries()]
      .map(([participantId, amountMinor]) => ({
        amountMinor,
        name: participantById.get(participantId) ?? "未知",
        participantId,
      }))
      .sort((left, right) => right.amountMinor - left.amountMinor),
    totalMinor,
  };
}

export function filterAndSortExpenses(
  trip: Trip,
  filters: ExpenseFilters,
): Trip["expenses"] {
  const query = filters.query.trim().toLowerCase();
  return [...trip.expenses]
    .filter((expense) => {
      if (query && !expense.description.toLowerCase().includes(query)) {
        return false;
      }
      if (filters.dateFrom && expense.expenseDate < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo && expense.expenseDate > filters.dateTo) {
        return false;
      }
      if (filters.paidById && expense.paidById !== filters.paidById) {
        return false;
      }
      if (
        filters.participantId &&
        !expense.participantIds.includes(filters.participantId)
      ) {
        return false;
      }
      if (filters.currency && expense.currency !== filters.currency) {
        return false;
      }
      if (
        filters.category &&
        (expense.category ?? "其他") !== filters.category
      ) {
        return false;
      }
      if (filters.tag && !(expense.tags ?? []).includes(filters.tag)) {
        return false;
      }
      return true;
    })
    .sort((left, right) => {
      switch (filters.sort) {
        case "date-asc": {
          const dateCmp = left.expenseDate.localeCompare(right.expenseDate);
          if (dateCmp !== 0) return dateCmp;
          const createdAtCmp = left.createdAt.localeCompare(right.createdAt);
          if (createdAtCmp !== 0) return createdAtCmp;
          return left.id.localeCompare(right.id);
        }
        case "amount-desc":
          return (
            convertMinorWithRates(
              right.amountMinor,
              right.currency,
              trip.baseCurrency,
              trip.exchangeRates,
            ) -
            convertMinorWithRates(
              left.amountMinor,
              left.currency,
              trip.baseCurrency,
              trip.exchangeRates,
            )
          );
        case "amount-asc":
          return (
            convertMinorWithRates(
              left.amountMinor,
              left.currency,
              trip.baseCurrency,
              trip.exchangeRates,
            ) -
            convertMinorWithRates(
              right.amountMinor,
              right.currency,
              trip.baseCurrency,
              trip.exchangeRates,
            )
          );
        case "date-desc": {
          const dateCmp = right.expenseDate.localeCompare(left.expenseDate);
          if (dateCmp !== 0) return dateCmp;
          const createdAtCmp = right.createdAt.localeCompare(left.createdAt);
          if (createdAtCmp !== 0) return createdAtCmp;
          return right.id.localeCompare(left.id);
        }
        default:
          return 0;
      }
    });
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
