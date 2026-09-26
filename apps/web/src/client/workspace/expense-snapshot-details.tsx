import type {
  ExpenseChangeField,
  ExpenseSnapshot,
} from "@narumitw/otter-contracts";
import { localizeMessage, useI18n } from "../i18n.js";

export function ExpenseSnapshotDetails({
  snapshot,
  fields = [
    "description",
    "amountMinor",
    "currency",
    "exchangeRate",
    "expenseDate",
    "paidById",
    "category",
    "tags",
    "participantIds",
    "participantShares",
  ],
}: {
  snapshot: ExpenseSnapshot;
  fields?: ExpenseChangeField[];
}) {
  const { messages, formatMoney } = useI18n();
  const e = snapshot.expense;
  const names = new Map(
    snapshot.participants.map((person) => [person.id, person.name]),
  );
  const labels: Record<ExpenseChangeField, string> = {
    description: messages.description,
    amountMinor: messages.amount,
    currency: messages.currency,
    exchangeRate: messages.expenseHistoryRate,
    expenseDate: messages.date,
    paidById: messages.paidBy,
    category: messages.category,
    tags: messages.tags,
    participantIds: messages.splitWith,
    participantShares: messages.expenseHistoryShares,
    receipt: messages.receipt,
  };
  const rateSource = e.exchangeRate
    ? {
        bank: messages.expenseHistoryRateBank,
        custom: messages.expenseHistoryRateCustom,
        fixed: messages.expenseHistoryRateFixed,
        legacy: messages.expenseHistoryRateLegacy,
      }[e.exchangeRate.source]
    : "";
  const values: Record<ExpenseChangeField, string> = {
    description: e.description,
    amountMinor: formatMoney(e.amountMinor, e.currency),
    currency: e.currency,
    exchangeRate: e.exchangeRate
      ? `1 ${e.currency} = ${e.exchangeRate.rateToBase} ${e.exchangeRate.baseCurrency} · ${rateSource} · ${e.exchangeRate.fetchedAt ?? messages.expenseHistoryRateTimeUnavailable}`
      : messages.expenseHistoryRateUnavailable,
    expenseDate: e.expenseDate,
    paidById: names.get(e.paidById) ?? e.paidById,
    category: localizeMessage(e.category ?? "其他"),
    tags: e.tags?.join(", ") || "—",
    participantIds: e.participantIds
      .map((id) => names.get(id) ?? id)
      .join(", "),
    participantShares:
      e.participantShares
        ?.map(
          (s) =>
            `${names.get(s.participantId) ?? s.participantId}: ${formatMoney(s.shareMinor, e.currency)}`,
        )
        .join(", ") ?? messages.splitEqually,
    receipt: snapshot.receipt
      ? `${snapshot.receipt.mimeType} · ${snapshot.receipt.id}`
      : "—",
  };
  return (
    <dl className="grid gap-1 text-sm break-anywhere">
      {fields.map((field) => (
        <div key={field}>
          <dt className="font-medium">{labels[field]}</dt>
          <dd>{values[field]}</dd>
        </div>
      ))}
    </dl>
  );
}
