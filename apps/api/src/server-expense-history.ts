import {
  changedExpenseFields,
  type ExpenseSnapshot,
  type ExpenseVersionErrorCode,
  parseExpenseIfMatch,
  type RevisionSource,
} from "@narumitw/otter-contracts";
import type { PoolClient } from "pg";
import { makeId, type User } from "./server-support.js";

export class ExpenseVersionError extends Error {
  constructor(
    readonly status: 400 | 412 | 428,
    readonly code: ExpenseVersionErrorCode,
    message: string,
  ) {
    super(message);
  }
}
export function requireExpenseVersion(
  header: string | undefined,
  currentVersion: number | undefined,
): void {
  let version: number | undefined;
  try {
    version = parseExpenseIfMatch(header);
  } catch {
    throw new ExpenseVersionError(
      400,
      "EXPENSE_VERSION_INVALID",
      "支出版本格式錯誤",
    );
  }
  if (version === undefined)
    throw new ExpenseVersionError(
      428,
      "EXPENSE_VERSION_REQUIRED",
      "請提供支出版本，重新載入後再試",
    );
  if (version !== currentVersion)
    throw new ExpenseVersionError(
      412,
      "EXPENSE_VERSION_CONFLICT",
      "支出已被修改，請查看最新內容後重新確認",
    );
}
export type CapturedExpense = {
  id: string;
  version: number;
  snapshot: ExpenseSnapshot;
};
export async function captureExpenses(
  client: PoolClient,
  tripId: string,
): Promise<CapturedExpense[]> {
  const result = await client.query<CapturedExpense>(
    "SELECT id, version, expense_revision_snapshot(expenses) AS snapshot FROM expenses WHERE trip_id = $1 ORDER BY id",
    [tripId],
  );
  return result.rows;
}
// Caller owns a transaction and the trip lock. Names are display context, not
// expense edits. Deletions keep their final snapshot independently of live FKs.
export async function recordExpenseChanges(
  client: PoolClient,
  tripId: string,
  before: CapturedExpense[],
  actor: Pick<User, "id" | "name"> | null,
  source: RevisionSource,
): Promise<void> {
  const after = await captureExpenses(client, tripId);
  const previous = new Map(before.map((e) => [e.id, e]));
  const current = new Map(after.map((e) => [e.id, e]));
  for (const id of new Set([...previous.keys(), ...current.keys()])) {
    const old = previous.get(id);
    const next = current.get(id);
    if (
      old &&
      next &&
      changedExpenseFields(old.snapshot, next.snapshot).length === 0
    )
      continue;
    const snapshot = next?.snapshot ?? old?.snapshot;
    if (!snapshot) continue;
    const version = old ? old.version + 1 : 1;
    if (next && old)
      await client.query(
        "UPDATE expenses SET version = $3 WHERE trip_id = $1 AND id = $2",
        [tripId, id, version],
      );
    await client.query(
      `INSERT INTO expense_revisions (id, trip_id, expense_id, version, action, source, actor, snapshot)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        makeId("revision"),
        tripId,
        id,
        version,
        !next ? "deleted" : old ? "updated" : "created",
        source,
        actor ? JSON.stringify({ id: actor.id, name: actor.name }) : null,
        JSON.stringify(snapshot),
      ],
    );
  }
}
