// Optional on POST /api/trips/:tripId/expenses. A UUID identifies one create
// operation for the authenticated user and trip. Replays of the same JSON body
// return the current trip payload (201 initially, 200 on replay); a different
// body returns 409. Authorization is checked on every replay. Legacy callers
// without the header keep the original create behavior.
export const expenseOperationHeader = "Idempotency-Key";
export const expenseQueueUserHeader = "X-Otter-Queue-User";

export function parseExpenseOperationId(
  value: string | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new Error("Invalid expense operation ID");
  }
  return value.toLowerCase();
}
