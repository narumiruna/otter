import type { Trip } from "./settlement.js";

export type ParticipantDeletionBlock =
  | "last-participant"
  | "expense"
  | "payment";

export function participantDeletionBlock(
  trip: Trip,
  participantId: string,
): ParticipantDeletionBlock | null {
  if (trip.participants.length <= 1) return "last-participant";
  if (
    trip.expenses.some(
      (expense) =>
        expense.paidById === participantId ||
        expense.participantIds.includes(participantId),
    )
  )
    return "expense";
  if (
    (trip.settlementPayments ?? []).some(
      (payment) =>
        payment.fromId === participantId || payment.toId === participantId,
    )
  )
    return "payment";
  return null;
}
