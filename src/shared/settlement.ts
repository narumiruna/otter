import type { Currency } from "./money.js";
import { convertMinor } from "./money.js";

export type Participant = {
  id: string;
  name: string;
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
  paidById: string;
  participantIds: string[];
  participantShares?: ExpenseParticipantShare[];
  expenseDate: string;
  createdAt: string;
};

export type Trip = {
  id: string;
  ownerId: string;
  name: string;
  baseCurrency: Currency;
  participants: Participant[];
  expenses: Expense[];
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

export function calculateBalances(trip: Trip): Balance[] {
  const participantOrder = new Map(
    trip.participants.map((participant, index) => [participant.id, index]),
  );
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

    const amount = convertMinor(
      expense.amountMinor,
      expense.currency,
      trip.baseCurrency,
    );
    balances.set(expense.paidById, payerBalance + amount);

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
        convertMinor(
          explicitShares.get(participantId) ?? 0,
          expense.currency,
          trip.baseCurrency,
        ),
      );
      let remainder = amount - shares.reduce((sum, share) => sum + share, 0);
      for (const [index, participantId] of splitIds.entries()) {
        const adjustment =
          index === shares.length - 1 ? remainder : Math.sign(remainder);
        remainder -= adjustment;
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
      balances.set(
        participantId,
        (balances.get(participantId) ?? 0) - share - extra,
      );
    }
  }

  return trip.participants.map((participant) => ({
    amountMinor: balances.get(participant.id) ?? 0,
    currency: trip.baseCurrency,
    name: participant.name,
    participantId: participant.id,
  }));
}

export function calculateSettlements(trip: Trip): Settlement[] {
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
        currency: trip.baseCurrency,
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
