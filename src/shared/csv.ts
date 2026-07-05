import { currencyInfo, toMajor } from "./money.js";
import type {
  Balance,
  Participant,
  Settlement,
  SettlementPayment,
  Trip,
} from "./settlement.js";

const expenseHeaders = [
  "date",
  "description",
  "amount",
  "currency",
  "paid_by",
  "category",
  "tags",
  "split_participants",
];
const resultHeaders = [
  "type",
  "participant",
  "from",
  "to",
  "amount",
  "currency",
  "note",
];

export function tripExpensesCsv(trip: Trip): string {
  const participantById = new Map(
    trip.participants.map((participant) => [participant.id, participant.name]),
  );
  const rows = trip.expenses.map((expense) => [
    expense.expenseDate,
    expense.description,
    formatAmount(expense.amountMinor, expense.currency),
    expense.currency,
    participantById.get(expense.paidById) ?? "未知",
    expense.category ?? "其他",
    (expense.tags ?? []).join("|"),
    splitParticipantsCell(trip, expense),
  ]);

  return csvRows([expenseHeaders, ...rows]);
}

export function tripResultsCsv(
  balances: Balance[],
  settlements: Settlement[],
  payments: SettlementPayment[] = [],
  participants: Participant[] = [],
): string {
  const participantById = new Map(participants.map((p) => [p.id, p.name]));
  const balanceRows = balances.map((balance) => [
    "balance",
    balance.name,
    "",
    "",
    formatAmount(balance.amountMinor, balance.currency),
    balance.currency,
    "",
  ]);
  const settlementRows = settlements.map((settlement) => [
    "settlement",
    "",
    settlement.fromName,
    settlement.toName,
    formatAmount(settlement.amountMinor, settlement.currency),
    settlement.currency,
    "",
  ]);
  const paymentRows = payments.map((payment) => [
    "payment",
    "",
    participantById.get(payment.fromId) ?? payment.fromId,
    participantById.get(payment.toId) ?? payment.toId,
    formatAmount(payment.amountMinor, payment.currency),
    payment.currency,
    payment.note,
  ]);

  return csvRows([
    resultHeaders,
    ...balanceRows,
    ...settlementRows,
    ...paymentRows,
  ]);
}

function splitParticipantsCell(
  trip: Trip,
  expense: Trip["expenses"][number],
): string {
  const participantById = new Map(
    trip.participants.map((participant) => [participant.id, participant.name]),
  );
  const shares = new Map(
    expense.participantShares?.map((share) => [
      share.participantId,
      share.shareMinor,
    ]) ?? [],
  );
  return expense.participantIds
    .map((id) => {
      const name = participantById.get(id) ?? "未知";
      const share = shares.get(id);
      return share === undefined
        ? name
        : `${name}=${formatAmount(share, expense.currency)}`;
    })
    .join("; ");
}

function csvRows(rows: string[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function formatAmount(
  amountMinor: number,
  currency: keyof typeof currencyInfo,
): string {
  return toMajor(amountMinor, currency).toFixed(
    currencyInfo[currency].minorUnits,
  );
}

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}
