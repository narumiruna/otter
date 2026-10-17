import type { Expense, Trip } from "@narumitw/otter-contracts";
import { currencyInfo } from "@narumitw/otter-core/money";
import { todayDate } from "../client-support.js";
import type { QueuedExpenseDraft as ExpenseDraft } from "../expense-queue.js";
import type { PersonalPreferences } from "./personal-preferences.js";

export function expenseDefaults(trip: Trip, expense?: Expense): ExpenseDraft {
  const explicit = new Map(
    expense?.participantShares?.map((share) => [
      share.participantId,
      share.shareMinor,
    ]) ?? [],
  );
  return {
    amount: expense
      ? String(
          expense.amountMinor / 10 ** currencyInfo[expense.currency].minorUnits,
        )
      : "",
    category: expense?.category ?? "其他",
    currency: expense?.currency ?? trip.baseCurrency,
    description: expense?.description ?? "",
    expenseDate: expense?.expenseDate ?? todayDate(),
    paidById: expense?.paidById ?? trip.participants[0]?.id ?? "",
    participantIds:
      expense?.participantIds ?? trip.participants.map((person) => person.id),
    splitMode: explicit.size ? "amount" : "equal",
    splitValues: Object.fromEntries(
      trip.participants.map((person) => [
        person.id,
        explicit.has(person.id) && expense
          ? String(
              (explicit.get(person.id) ?? 0) /
                10 ** currencyInfo[expense.currency].minorUnits,
            )
          : "",
      ]),
    ),
    tags: (expense?.tags ?? []).join(", "),
  };
}

export function newExpenseDraft(
  trip: Trip,
  preferences: PersonalPreferences,
  copy?: Expense,
): ExpenseDraft {
  if (copy) {
    const draft = expenseDefaults(trip, copy);
    const ids = new Set(trip.participants.map((p) => p.id));
    draft.expenseDate = todayDate();
    if (!ids.has(draft.paidById))
      draft.paidById = trip.participants[0]?.id ?? "";
    if (
      !draft.participantIds.length ||
      draft.participantIds.some((id) => !ids.has(id))
    ) {
      draft.participantIds = trip.participants.map((p) => p.id);
      draft.splitMode = "equal";
      draft.splitValues = {};
    }
    return draft;
  }
  const draft = expenseDefaults(trip);
  return {
    ...draft,
    ...preferences.defaults,
    participantIds: [
      ...(preferences.defaults?.participantIds ?? draft.participantIds),
    ],
    splitValues: {
      ...(preferences.defaults?.splitValues ?? draft.splitValues),
    },
  };
}
