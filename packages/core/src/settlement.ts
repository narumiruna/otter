import type { ExpenseCategory } from "./expense-metadata.js";
import type { Currency, ExchangeRates, ExpenseExchangeRate } from "./money.js";
import { convertExpenseMinor, convertMinorWithRates } from "./money.js";

import {
  convertVisaExpenseMinor,
  type VisaExpenseRate,
} from "./visa-settlement.js";

export type Participant = {
  id: string;
  name: string;
  settledById?: string;
};

export type ExpenseParticipantShare = {
  participantId: string;
  shareMinor: number;
};

export type Expense = {
  id: string;
  description: string;
  amountMinor: number;
  currency: Currency;
  exchangeRate?: ExpenseExchangeRate;
  visaExchangeRate?: VisaExpenseRate;
  category?: ExpenseCategory;
  tags?: string[];
  paidById: string;
  participantIds: string[];
  participantShares?: ExpenseParticipantShare[];
  receiptId?: string;
  receiptUrl?: string;
  expenseDate: string;
  createdAt: string;
};

export type SettlementPayment = {
  id: string;
  fromId: string;
  toId: string;
  amountMinor: number;
  currency: Currency;
  paidAt: string;
  note: string;
  createdAt: string;
};

export type Trip = {
  id: string;
  ownerId: string;
  name: string;
  baseCurrency: Currency;
  archivedAt?: string | null;
  allowApiWrites?: boolean;
  visaSettlementEnabled?: boolean;
  visaSettlementCurrency?: Currency;
  participants: Participant[];
  expenses: Expense[];
  settlementPayments?: SettlementPayment[];
  exchangeRates?: ExchangeRates;
  createdAt: string;
};

export type Balance = {
  participantId: string;
  name: string;
  amountMinor: number;
  currency: Currency;
};

export type Settlement = {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amountMinor: number;
  currency: Currency;
};

export function settlementCurrency(
  trip: Pick<
    Trip,
    "baseCurrency" | "visaSettlementEnabled" | "visaSettlementCurrency"
  >,
): Currency {
  return trip.visaSettlementEnabled
    ? (trip.visaSettlementCurrency ?? trip.baseCurrency)
    : trip.baseCurrency;
}

type ExpenseEntry = { expenseId: string; amountMinor: number };
type PaymentEntry = {
  paymentId: string;
  amountMinor: number;
  direction: "paid" | "received";
};
type AdjustmentEntry = { participantId: string; amountMinor: number };

export type MemberAccount = PersonalSummary & {
  participantId: string;
  paidExpenses: ExpenseEntry[];
  sharedExpenses: ExpenseEntry[];
  payments: PaymentEntry[];
  adjustments: AdjustmentEntry[];
};

function expenseTotals(
  trip: Trip,
  record?: (
    participantId: string,
    kind: "paid" | "shared",
    entry: ExpenseEntry,
  ) => void,
) {
  const currency = settlementCurrency(trip);
  const convertExpense = (amountMinor: number, expense: Expense) =>
    trip.visaSettlementEnabled
      ? convertVisaExpenseMinor(
          amountMinor,
          expense.currency,
          expense.expenseDate,
          expense.visaExchangeRate,
          currency,
        )
      : convertExpenseMinor(
          amountMinor,
          expense.currency,
          trip.baseCurrency,
          expense.exchangeRate,
          trip.exchangeRates,
        );
  const participantOrder = new Map(
    trip.participants.map((participant, index) => [participant.id, index]),
  );
  const paid = new Map(trip.participants.map((p) => [p.id, 0]));
  const shared = new Map(trip.participants.map((p) => [p.id, 0]));
  const balances = new Map(
    trip.participants.map((participant) => [participant.id, 0]),
  );

  for (const expense of trip.expenses) {
    const payerBalance = balances.get(expense.paidById);
    const splitIds = expense.participantIds
      .filter((id) => balances.has(id))
      .sort(
        (a, b) =>
          (participantOrder.get(a) ?? 0) - (participantOrder.get(b) ?? 0),
      );

    if (payerBalance === undefined || splitIds.length === 0) {
      continue;
    }

    const amount = convertExpense(expense.amountMinor, expense);
    balances.set(expense.paidById, payerBalance + amount);
    paid.set(expense.paidById, (paid.get(expense.paidById) ?? 0) + amount);
    record?.(expense.paidById, "paid", {
      expenseId: expense.id,
      amountMinor: amount,
    });

    const explicitShares = new Map(
      expense.participantShares?.map((share) => [
        share.participantId,
        share.shareMinor,
      ]) ?? [],
    );
    const hasExplicitShares =
      splitIds.every((id) => explicitShares.has(id)) &&
      splitIds.reduce((sum, id) => sum + (explicitShares.get(id) ?? 0), 0) ===
        expense.amountMinor;

    if (hasExplicitShares) {
      const shares = splitIds.map((participantId) =>
        convertExpense(explicitShares.get(participantId) ?? 0, expense),
      );
      let remainder = amount - shares.reduce((sum, share) => sum + share, 0);
      for (const [index, participantId] of splitIds.entries()) {
        const adjustment =
          index === shares.length - 1 ? remainder : Math.sign(remainder);
        remainder -= adjustment;
        record?.(participantId, "shared", {
          expenseId: expense.id,
          amountMinor: (shares[index] ?? 0) + adjustment,
        });
        shared.set(
          participantId,
          (shared.get(participantId) ?? 0) + (shares[index] ?? 0) + adjustment,
        );
        balances.set(
          participantId,
          (balances.get(participantId) ?? 0) -
            (shares[index] ?? 0) -
            adjustment,
        );
      }
      continue;
    }

    const share = Math.floor(amount / splitIds.length);
    let remainder = amount % splitIds.length;

    for (const participantId of splitIds) {
      const extra = remainder > 0 ? 1 : 0;
      remainder -= extra;
      record?.(participantId, "shared", {
        expenseId: expense.id,
        amountMinor: share + extra,
      });
      shared.set(
        participantId,
        (shared.get(participantId) ?? 0) + share + extra,
      );
      balances.set(
        participantId,
        (balances.get(participantId) ?? 0) - share - extra,
      );
    }
  }

  return { balances, paid, shared };
}

export type PersonalSummary = {
  paidMinor: number;
  sharedMinor: number;
  balanceMinor: number;
  currency: Currency;
};

export function calculatePersonalSummary(
  trip: Trip,
  participantId: string,
): PersonalSummary | undefined {
  if (!trip.participants.some((p) => p.id === participantId)) return undefined;
  const totals = expenseTotals(trip);
  const balance = calculateBalances(trip).find(
    (b) => b.participantId === participantId,
  );
  return {
    paidMinor: totals.paid.get(participantId) ?? 0,
    sharedMinor: totals.shared.get(participantId) ?? 0,
    balanceMinor: balance?.amountMinor ?? 0,
    currency: settlementCurrency(trip),
  };
}

export function calculateBalances(trip: Trip): Balance[] {
  return balancesWithEntries(trip);
}

function balancesWithEntries(
  trip: Trip,
  recordPayment?: (participantId: string, entry: PaymentEntry) => void,
  recordAdjustment?: (participantId: string, entry: AdjustmentEntry) => void,
): Balance[] {
  const currency = settlementCurrency(trip);
  const { balances } = expenseTotals(trip);

  for (const payment of trip.settlementPayments ?? []) {
    if (!balances.has(payment.fromId) || !balances.has(payment.toId)) {
      continue;
    }
    if (trip.visaSettlementEnabled && payment.currency !== currency)
      throw new Error(
        "Visa settlement payments must use the selected currency",
      );
    const amount = convertMinorWithRates(
      payment.amountMinor,
      payment.currency,
      currency,
      trip.exchangeRates,
    );
    recordPayment?.(payment.fromId, {
      paymentId: payment.id,
      amountMinor: amount,
      direction: "paid",
    });
    recordPayment?.(payment.toId, {
      paymentId: payment.id,
      amountMinor: amount,
      direction: "received",
    });
    balances.set(payment.fromId, (balances.get(payment.fromId) ?? 0) + amount);
    balances.set(payment.toId, (balances.get(payment.toId) ?? 0) - amount);
  }

  // Split and payment records stay with their original people. Only the final
  // net balance moves to the person responsible for settling it.
  for (const participant of trip.participants) {
    const representative = participant.settledById;
    if (
      representative &&
      representative !== participant.id &&
      balances.has(representative)
    ) {
      const transferred = balances.get(participant.id) ?? 0;
      recordAdjustment?.(participant.id, {
        participantId: representative,
        amountMinor: -transferred,
      });
      recordAdjustment?.(representative, {
        participantId: participant.id,
        amountMinor: transferred,
      });
      balances.set(
        representative,
        (balances.get(representative) ?? 0) +
          (balances.get(participant.id) ?? 0),
      );
      balances.set(participant.id, 0);
    }
  }

  return trip.participants.map((participant) => ({
    amountMinor: balances.get(participant.id) ?? 0,
    currency,
    name: participant.name,
    participantId: participant.id,
  }));
}

// Read-only entries use the same conversion, remainder and settlement paths as balances.
export function calculateMemberAccounts(trip: Trip): MemberAccount[] {
  const accounts = new Map(
    trip.participants.map((person) => [
      person.id,
      {
        participantId: person.id,
        currency: settlementCurrency(trip),
        paidMinor: 0,
        sharedMinor: 0,
        balanceMinor: 0,
        paidExpenses: [] as ExpenseEntry[],
        sharedExpenses: [] as ExpenseEntry[],
        payments: [] as PaymentEntry[],
        adjustments: [] as AdjustmentEntry[],
      },
    ]),
  );
  const totals = expenseTotals(trip, (id, kind, entry) => {
    const account = accounts.get(id);
    if (account)
      (kind === "paid" ? account.paidExpenses : account.sharedExpenses).push(
        entry,
      );
  });
  const balances = balancesWithEntries(
    trip,
    (id, entry) => accounts.get(id)?.payments.push(entry),
    (id, entry) => accounts.get(id)?.adjustments.push(entry),
  );
  const balanceById = new Map(
    balances.map((balance) => [balance.participantId, balance.amountMinor]),
  );
  return [...accounts.values()].map((account) => ({
    ...account,
    paidMinor: totals.paid.get(account.participantId) ?? 0,
    sharedMinor: totals.shared.get(account.participantId) ?? 0,
    balanceMinor: balanceById.get(account.participantId) ?? 0,
  }));
}

export function calculateSettlements(trip: Trip): Settlement[] {
  const currency = settlementCurrency(trip);
  const balances = calculateBalances(trip);
  const debtors = balances
    .filter((balance) => balance.amountMinor < 0)
    .map((balance) => ({ ...balance, amountMinor: -balance.amountMinor }))
    .sort((a, b) => b.amountMinor - a.amountMinor);
  const creditors = balances
    .filter((balance) => balance.amountMinor > 0)
    .sort((a, b) => b.amountMinor - a.amountMinor);
  const settlements: Settlement[] = [];

  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(debtor.amountMinor, creditor.amountMinor);

    if (amount > 0) {
      settlements.push({
        amountMinor: amount,
        currency,
        fromId: debtor.participantId,
        fromName: debtor.name,
        toId: creditor.participantId,
        toName: creditor.name,
      });
    }

    debtor.amountMinor -= amount;
    creditor.amountMinor -= amount;

    if (debtor.amountMinor === 0) {
      debtorIndex += 1;
    }
    if (creditor.amountMinor === 0) {
      creditorIndex += 1;
    }
  }

  return settlements;
}
