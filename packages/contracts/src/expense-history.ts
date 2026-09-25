import { isDateOnly } from "@narumitw/otter-core/date";
import { isExpenseCategory } from "@narumitw/otter-core/expense-metadata";
import { isCurrency } from "@narumitw/otter-core/money";
import type {
  Expense as DomainExpense,
  Trip as DomainTrip,
  Participant,
} from "@narumitw/otter-core/settlement";

// Legacy offline payloads may lack a version. Never infer one for a write.
export type Expense = DomainExpense & { version?: number };
export type Trip = Omit<DomainTrip, "expenses"> & { expenses: Expense[] };
export type VersionedExpense = Expense & { version: number };
export type VersionedTrip = Omit<Trip, "expenses"> & {
  expenses: VersionedExpense[];
};
export type ExpenseSnapshot = {
  schemaVersion: 1;
  expense: DomainExpense;
  participants: Participant[];
  receipt: { id: string; mimeType: string } | null;
};
export const revisionSources = [
  "expense",
  "csv_import",
  "backup_restore",
  "participant_merge",
  "receipt",
  "development_seed",
  "migration",
  "version_restore",
] as const;
export type RevisionSource = (typeof revisionSources)[number];
export const expenseChangeFields = [
  "description",
  "amountMinor",
  "currency",
  "expenseDate",
  "paidById",
  "category",
  "tags",
  "participantIds",
  "participantShares",
  "receipt",
] as const;
export type ExpenseChangeField = (typeof expenseChangeFields)[number];
export type ExpenseRevision = {
  id: string;
  expenseId: string;
  version: number;
  action: "baseline" | "created" | "updated" | "deleted" | "restored";
  source: RevisionSource;
  actor: { id: string; name: string } | null;
  recordedAt: string;
  snapshot: ExpenseSnapshot;
  previousSnapshot: ExpenseSnapshot | null;
  changedFields: ExpenseChangeField[];
};
export type ExpenseHistoryPage = {
  revisions: ExpenseRevision[];
  nextCursor: string | null;
  // Present for expenseId-filtered reads, even when timestamps tie.
  latestRevision?: Pick<ExpenseRevision, "version" | "action"> | null;
};
export type ExpenseVersionErrorCode =
  | "EXPENSE_VERSION_REQUIRED"
  | "EXPENSE_VERSION_INVALID"
  | "EXPENSE_VERSION_CONFLICT";
export function isExpenseVersion(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
export function expenseIfMatch(version: number | undefined): string {
  if (!isExpenseVersion(version))
    throw new Error("Expense version is missing. Reload before editing.");
  return `"${version}"`;
}
export function parseExpenseIfMatch(
  value: string | undefined,
): number | undefined {
  if (value === undefined) return undefined;
  if (!/^"[1-9]\d*"$/.test(value)) throw new Error("Invalid expense version");
  const version = Number(value.slice(1, -1));
  if (!isExpenseVersion(version)) throw new Error("Invalid expense version");
  return version;
}
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function text(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(text);
}
function timestamp(value: unknown): boolean {
  return text(value) && Number.isFinite(Date.parse(value));
}
export function isExpenseSnapshot(value: unknown): value is ExpenseSnapshot {
  if (
    !record(value) ||
    value.schemaVersion !== 1 ||
    !record(value.expense) ||
    !Array.isArray(value.participants)
  )
    return false;
  const e = value.expense;
  if (
    !text(e.id) ||
    !text(e.description) ||
    !isExpenseVersion(e.amountMinor) ||
    !isCurrency(e.currency) ||
    !text(e.paidById) ||
    !strings(e.participantIds) ||
    !e.participantIds.length ||
    new Set(e.participantIds).size !== e.participantIds.length ||
    !text(e.expenseDate) ||
    !isDateOnly(e.expenseDate) ||
    !timestamp(e.createdAt) ||
    !isExpenseCategory(e.category) ||
    !Array.isArray(e.tags) ||
    !e.tags.every((tag) => typeof tag === "string")
  )
    return false;
  if (!value.participants.every((p) => record(p) && text(p.id) && text(p.name)))
    return false;
  const people = new Set(value.participants.map((p) => p.id));
  if (
    people.size !== value.participants.length ||
    !people.has(e.paidById) ||
    !e.participantIds.every((id) => people.has(id))
  )
    return false;
  if (e.participantShares !== undefined) {
    if (
      !Array.isArray(e.participantShares) ||
      e.participantShares.length !== e.participantIds.length
    )
      return false;
    let total = 0;
    const ids = new Set<string>();
    for (const share of e.participantShares) {
      if (
        !record(share) ||
        !text(share.participantId) ||
        !e.participantIds.includes(share.participantId) ||
        !isExpenseVersion(share.shareMinor)
      )
        return false;
      ids.add(share.participantId);
      total += share.shareMinor;
    }
    if (ids.size !== e.participantIds.length || total !== e.amountMinor)
      return false;
  }
  const receipt = value.receipt;
  return (
    receipt === null ||
    (record(receipt) &&
      text(receipt.id) &&
      ["image/jpeg", "image/png", "image/webp"].includes(
        String(receipt.mimeType),
      ))
  );
}
export function parseExpenseHistoryPage(value: unknown): ExpenseHistoryPage {
  if (
    !record(value) ||
    !Array.isArray(value.revisions) ||
    !(value.nextCursor === null || text(value.nextCursor)) ||
    (value.latestRevision !== undefined &&
      value.latestRevision !== null &&
      (!record(value.latestRevision) ||
        !isExpenseVersion(value.latestRevision.version) ||
        !["baseline", "created", "updated", "deleted", "restored"].includes(
          String(value.latestRevision.action),
        )))
  )
    throw new Error("Invalid expense history");
  for (const r of value.revisions) {
    if (
      !record(r) ||
      !text(r.id) ||
      !text(r.expenseId) ||
      !isExpenseVersion(r.version) ||
      !["baseline", "created", "updated", "deleted", "restored"].includes(
        String(r.action),
      ) ||
      !revisionSources.some((s) => s === r.source) ||
      !timestamp(r.recordedAt) ||
      !isExpenseSnapshot(r.snapshot) ||
      r.snapshot.expense.id !== r.expenseId ||
      !(
        r.previousSnapshot === null ||
        (isExpenseSnapshot(r.previousSnapshot) &&
          r.previousSnapshot.expense.id === r.expenseId)
      ) ||
      !(
        r.actor === null ||
        (record(r.actor) && text(r.actor.id) && text(r.actor.name))
      ) ||
      !Array.isArray(r.changedFields) ||
      !r.changedFields.every((f) =>
        expenseChangeFields.some((field) => field === f),
      )
    )
      throw new Error("Invalid expense history");
  }
  return value as ExpenseHistoryPage;
}
export function changedExpenseFields(
  before: ExpenseSnapshot,
  after: ExpenseSnapshot,
): ExpenseChangeField[] {
  return expenseChangeFields.filter(
    (field) =>
      JSON.stringify(
        field === "receipt" ? before.receipt : before.expense[field],
      ) !==
      JSON.stringify(
        field === "receipt" ? after.receipt : after.expense[field],
      ),
  );
}
