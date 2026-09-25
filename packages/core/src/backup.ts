import { isDateOnly } from "./date.js";
import { isExpenseCategory } from "./expense-metadata.js";
import type { Currency, ExpenseExchangeRate } from "./money.js";
import {
  convertExpenseMinor,
  fixedExchangeRates,
  isCurrency,
  isExpenseExchangeRate,
} from "./money.js";

export type TripBackupV1 = {
  version: 1;
  exportedAt: string;
  trip: {
    name: string;
    baseCurrency: Currency;
    exchangeRates?: Partial<Record<Currency, number>>;
    participants: { id: string; name: string }[];
    expenses: {
      id: string;
      description: string;
      amountMinor: number;
      currency: Currency;
      category?: string;
      tags?: string[];
      paidById: string;
      participantIds: string[];
      participantShares?: { participantId: string; shareMinor: number }[];
      expenseDate: string;
      createdAt: string;
    }[];
    settlementPayments?: {
      id: string;
      fromId: string;
      toId: string;
      amountMinor: number;
      currency: Currency;
      paidAt: string;
      note: string;
      createdAt: string;
    }[];
  };
};

export type TripBackupV2 = Omit<TripBackupV1, "version" | "trip"> & {
  version: 2;
  trip: Omit<TripBackupV1["trip"], "expenses"> & {
    expenses: (TripBackupV1["trip"]["expenses"][number] & {
      exchangeRate: ExpenseExchangeRate;
    })[];
  };
};
export type TripBackup = TripBackupV1 | TripBackupV2;

export function validateTripBackupV1(value: unknown): TripBackup {
  if (!value || typeof value !== "object") {
    throw new Error("備份格式錯誤");
  }
  const backup = value as { version?: unknown; trip?: unknown };
  if (backup.version !== 1 && backup.version !== 2) {
    throw new Error("不支援的備份版本");
  }
  if (!backup.trip || typeof backup.trip !== "object") {
    throw new Error("備份缺少 trip");
  }

  const trip = backup.trip as TripBackupV1["trip"];
  if (!trip.name || typeof trip.name !== "string" || trip.name.length > 100) {
    throw new Error("備份旅行名稱錯誤");
  }
  if (!isCurrency(trip.baseCurrency)) {
    throw new Error("備份基準貨幣錯誤");
  }
  if (trip.exchangeRates !== undefined) {
    if (
      !trip.exchangeRates ||
      typeof trip.exchangeRates !== "object" ||
      Array.isArray(trip.exchangeRates)
    ) {
      throw new Error("備份匯率格式錯誤");
    }
    for (const [currency, rate] of Object.entries(trip.exchangeRates)) {
      if (
        !isCurrency(currency) ||
        typeof rate !== "number" ||
        !Number.isFinite(rate) ||
        rate < 0.00000001 ||
        rate >= 10000000000
      ) {
        throw new Error("備份匯率格式錯誤");
      }
    }
  }
  if (!Array.isArray(trip.participants) || trip.participants.length === 0) {
    throw new Error("備份缺少參與者");
  }
  if (!Array.isArray(trip.expenses)) {
    throw new Error("備份缺少支出");
  }

  const participantIds = new Set<string>();
  const participantNames = new Set<string>();
  for (const participant of trip.participants) {
    if (
      !participant ||
      typeof participant.id !== "string" ||
      !participant.id ||
      typeof participant.name !== "string" ||
      !participant.name ||
      participant.name.length > 80
    ) {
      throw new Error("備份參與者格式錯誤");
    }
    const name = participant.name.trim().toLocaleLowerCase();
    if (participantIds.has(participant.id) || participantNames.has(name)) {
      throw new Error("備份參與者重複");
    }
    participantIds.add(participant.id);
    participantNames.add(name);
  }

  for (const expense of trip.expenses) {
    if (
      !expense ||
      typeof expense.id !== "string" ||
      !expense.id ||
      typeof expense.description !== "string" ||
      !expense.description ||
      expense.description.length > 120 ||
      !Number.isSafeInteger(expense.amountMinor) ||
      expense.amountMinor <= 0 ||
      !isCurrency(expense.currency) ||
      !participantIds.has(expense.paidById) ||
      !isDateOnly(expense.expenseDate) ||
      typeof expense.createdAt !== "string" ||
      !Array.isArray(expense.participantIds) ||
      expense.participantIds.length === 0
    ) {
      throw new Error("備份支出格式錯誤");
    }
    const rate = (expense as { exchangeRate?: unknown }).exchangeRate;
    if (
      backup.version === 2 &&
      !isExpenseExchangeRate(rate, expense.currency)
    ) {
      throw new Error("備份支出匯率格式錯誤");
    }
    try {
      const snapshot =
        backup.version === 2 && isExpenseExchangeRate(rate, expense.currency)
          ? rate
          : {
              baseCurrency: trip.baseCurrency,
              rateToBase: fixedExchangeRates(trip.baseCurrency)[
                expense.currency
              ],
              source: "legacy" as const,
            };
      convertExpenseMinor(
        expense.amountMinor,
        expense.currency,
        trip.baseCurrency,
        snapshot,
        trip.exchangeRates,
      );
    } catch {
      throw new Error("備份支出換算金額超出範圍");
    }
    const expenseParticipantIds = new Set<string>();
    for (const participantId of expense.participantIds) {
      if (!participantIds.has(participantId)) {
        throw new Error("備份支出參與者不存在");
      }
      if (expenseParticipantIds.has(participantId)) {
        throw new Error("備份支出參與者重複");
      }
      expenseParticipantIds.add(participantId);
    }
    if (
      expense.category !== undefined &&
      !isExpenseCategory(expense.category)
    ) {
      throw new Error("備份支出分類錯誤");
    }
    if (
      expense.tags !== undefined &&
      (!Array.isArray(expense.tags) ||
        expense.tags.some((tag) => typeof tag !== "string" || tag.length > 24))
    ) {
      throw new Error("備份支出標籤錯誤");
    }
    if (expense.participantShares !== undefined) {
      if (!Array.isArray(expense.participantShares)) {
        throw new Error("備份分帳格式錯誤");
      }
      const shareParticipantIds = new Set<string>();
      const total = expense.participantShares.reduce((sum, share) => {
        if (
          !expenseParticipantIds.has(share.participantId) ||
          shareParticipantIds.has(share.participantId) ||
          !Number.isSafeInteger(share.shareMinor) ||
          share.shareMinor <= 0
        ) {
          throw new Error("備份分帳格式錯誤");
        }
        shareParticipantIds.add(share.participantId);
        return sum + share.shareMinor;
      }, 0);
      if (shareParticipantIds.size !== expenseParticipantIds.size) {
        throw new Error("備份分帳格式錯誤");
      }
      if (total !== expense.amountMinor) {
        throw new Error("備份分帳加總錯誤");
      }
    }
  }

  for (const payment of trip.settlementPayments ?? []) {
    if (
      !payment ||
      typeof payment.id !== "string" ||
      !participantIds.has(payment.fromId) ||
      !participantIds.has(payment.toId) ||
      payment.fromId === payment.toId ||
      !Number.isSafeInteger(payment.amountMinor) ||
      payment.amountMinor <= 0 ||
      !isCurrency(payment.currency) ||
      !isDateOnly(payment.paidAt) ||
      typeof payment.note !== "string" ||
      payment.note.length > 160 ||
      typeof payment.createdAt !== "string"
    ) {
      throw new Error("備份付款紀錄格式錯誤");
    }
  }

  return value as TripBackup;
}
