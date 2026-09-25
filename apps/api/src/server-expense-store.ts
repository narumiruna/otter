import type { Expense } from "@narumitw/otter-core/settlement";
import type { PoolClient } from "pg";

type ExpenseInsert = Pick<
  Expense,
  | "id"
  | "description"
  | "amountMinor"
  | "currency"
  | "paidById"
  | "expenseDate"
  | "createdAt"
  | "participantIds"
  | "participantShares"
  | "exchangeRate"
> & { category: string; tags: string[] };

// Callers own validation, IDs, timestamps, and the surrounding transaction.
export async function insertExpense(
  client: PoolClient,
  tripId: string,
  expense: ExpenseInsert,
): Promise<void> {
  await client.query(
    `INSERT INTO expenses
       (id, trip_id, description, amount_minor, currency, category, tags, paid_by_id, expense_date, created_at, exchange_rate)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      expense.id,
      tripId,
      expense.description,
      expense.amountMinor,
      expense.currency,
      expense.category,
      expense.tags,
      expense.paidById,
      expense.expenseDate,
      expense.createdAt,
      expense.exchangeRate ?? null,
    ],
  );
  await insertExpenseParticipants(client, tripId, expense);
}

export async function insertExpenseParticipants(
  client: PoolClient,
  tripId: string,
  expense: Pick<Expense, "id" | "participantIds" | "participantShares">,
): Promise<void> {
  const shareByParticipant = new Map(
    expense.participantShares?.map((share) => [
      share.participantId,
      share.shareMinor,
    ]),
  );
  for (const [position, participantId] of expense.participantIds.entries()) {
    await client.query(
      `INSERT INTO expense_participants
         (expense_id, trip_id, participant_id, position, share_minor)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        expense.id,
        tripId,
        participantId,
        position,
        shareByParticipant.get(participantId) ?? null,
      ],
    );
  }
}
