import { currencyInfo, toMajor } from "./money.js";
import type { Trip } from "./settlement.js";

const expenseHeaders = [
  "date",
  "description",
  "amount",
  "currency",
  "paid_by",
  "split_participants",
];

export function tripExpensesCsv(trip: Trip): string {
  const participantById = new Map(
    trip.participants.map((participant) => [participant.id, participant.name]),
  );
  const rows = trip.expenses.map((expense) => [
    expense.expenseDate,
    expense.description,
    toMajor(expense.amountMinor, expense.currency).toFixed(
      currencyInfo[expense.currency].minorUnits,
    ),
    expense.currency,
    participantById.get(expense.paidById) ?? "未知",
    expense.participantIds
      .map((id) => participantById.get(id) ?? "未知")
      .join("; "),
  ]);

  return [expenseHeaders, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");
}

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}
