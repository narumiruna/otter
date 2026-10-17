import {
  calculateMemberAccounts,
  type MemberAccount,
  type Trip,
} from "@narumitw/otter-core/settlement";
import { useMemo } from "react";
import type { TripPayload } from "../client-support.js";
import { useI18n } from "../i18n.js";

export function MemberAccounts({ payload }: { payload: TripPayload }) {
  const { messages, formatMoney } = useI18n();
  const { trip } = payload;
  const accounts = useMemo(() => calculateMemberAccounts(trip), [trip]);
  const balanceById = new Map(
    payload.balances.map((balance) => [balance.participantId, balance]),
  );
  const personById = new Map(
    trip.participants.map((person) => [person.id, person]),
  );
  return (
    <section className="member-accounts" aria-label={messages.memberAccounts}>
      <header>
        <h4>{messages.memberAccounts}</h4>
        <span className="text-sm text-muted-foreground">
          {accounts[0]?.currency ?? trip.baseCurrency}
        </span>
      </header>
      <p className="text-sm text-muted-foreground">
        {messages.accountPaidHelp}
      </p>
      <p className="text-sm text-muted-foreground">
        {messages.accountTotalsHelp}
      </p>
      <table className="member-account-table">
        <caption className="sr-only">{messages.memberAccounts}</caption>
        <thead>
          <tr>
            <th scope="col">{messages.people}</th>
            <th scope="col">{messages.accountPaid}</th>
            <th scope="col">{messages.accountShared}</th>
            <th scope="col">{messages.accountBalance}</th>
          </tr>
        </thead>
        {accounts.map((account) => {
          const person = personById.get(account.participantId);
          const representative = personById.get(person?.settledById ?? "");
          // Public shares can omit payment records. Their supplied balance is authoritative.
          const balance = balanceById.get(account.participantId);
          const amount = balance?.amountMinor ?? account.balanceMinor;
          const currency = balance?.currency ?? account.currency;
          return (
            <tbody key={account.participantId}>
              <tr className="member-account-summary">
                <th scope="row">
                  {person?.name}
                  {representative ? (
                    <p className="member-account-note">
                      {messages.accountRepresentedBy({
                        name: representative.name,
                      })}
                    </p>
                  ) : null}
                </th>
                <td>
                  <span
                    className="member-account-mobile-label"
                    aria-hidden="true"
                  >
                    {messages.accountPaid}
                  </span>
                  {account.paidMinor === 0
                    ? "0"
                    : formatMoney(account.paidMinor, account.currency)}
                </td>
                <td>
                  <span
                    className="member-account-mobile-label"
                    aria-hidden="true"
                  >
                    {messages.accountShared}
                  </span>
                  {account.sharedMinor === 0
                    ? "0"
                    : formatMoney(account.sharedMinor, account.currency)}
                </td>
                <td
                  className={
                    amount > 0
                      ? "member-account-receivable"
                      : amount < 0
                        ? "member-account-payable"
                        : "text-muted-foreground"
                  }
                >
                  <span>
                    {amount === 0
                      ? messages.accountSettled
                      : amount > 0
                        ? messages.accountReceivable
                        : messages.accountPayable}
                  </span>
                  {amount !== 0 ? (
                    <strong>{formatMoney(Math.abs(amount), currency)}</strong>
                  ) : null}
                </td>
              </tr>
              <tr className="member-account-detail-row">
                <td colSpan={4}>
                  <details className="member-account-details">
                    <summary>
                      {messages.accountDetails}
                      <span className="sr-only"> {person?.name}</span>
                    </summary>
                    <MemberDetails trip={trip} account={account} />
                  </details>
                </td>
              </tr>
            </tbody>
          );
        })}
      </table>
    </section>
  );
}

function MemberDetails({
  trip,
  account,
}: {
  trip: Trip;
  account: MemberAccount;
}) {
  const { messages, formatMoney } = useI18n();
  const expenses = new Map(
    trip.expenses.map((expense) => [expense.id, expense]),
  );
  const payments = new Map(
    trip.settlementPayments?.map((payment) => [payment.id, payment]),
  );
  const people = new Map(
    trip.participants.map((person) => [person.id, person.name]),
  );
  return (
    <div className="member-account-detail-content">
      {[
        { title: messages.accountPaidExpenses, entries: account.paidExpenses },
        {
          title: messages.accountSharedExpenses,
          entries: account.sharedExpenses,
        },
      ].map(({ title, entries }) => (
        <section key={title}>
          <h5>
            {title} ({account.currency})
          </h5>
          {entries.length ? (
            <ul>
              {entries.map((entry) => {
                const expense = expenses.get(entry.expenseId);
                return (
                  <li key={entry.expenseId}>
                    <span>
                      {expense?.expenseDate} {expense?.description}
                    </span>
                    <span>
                      {formatMoney(entry.amountMinor, account.currency)}
                      <small>
                        {expense
                          ? `${expense.currency} ${formatMoney(expense.amountMinor, expense.currency)}`
                          : ""}
                      </small>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>{messages.noDataYet}</p>
          )}
        </section>
      ))}
      <section>
        <h5>
          {messages.accountPayments} ({account.currency})
        </h5>
        {trip.settlementPayments === undefined ? (
          <p>{messages.accountDetailsUnavailable}</p>
        ) : account.payments.length ? (
          <ul>
            {account.payments.map((entry) => {
              const payment = payments.get(entry.paymentId);
              return (
                <li key={entry.paymentId}>
                  <span>
                    {entry.direction === "paid"
                      ? messages.accountPaymentSent
                      : messages.accountPaymentReceived}{" "}
                    {payment?.paidAt} {people.get(payment?.fromId ?? "")} →{" "}
                    {people.get(payment?.toId ?? "")}
                  </span>
                  <span>
                    {formatMoney(entry.amountMinor, account.currency)}
                    <small>
                      {payment
                        ? `${payment.currency} ${formatMoney(payment.amountMinor, payment.currency)}`
                        : ""}
                    </small>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p>{messages.noDataYet}</p>
        )}
      </section>
      <section>
        <h5>
          {messages.accountAdjustments} ({account.currency})
        </h5>
        {trip.settlementPayments === undefined ? (
          <p>{messages.accountDetailsUnavailable}</p>
        ) : account.adjustments.length ? (
          <ul>
            {account.adjustments.map((entry) => (
              <li key={entry.participantId}>
                <span>{people.get(entry.participantId)}</span>
                <span>
                  {entry.amountMinor > 0 ? "+" : ""}
                  {formatMoney(entry.amountMinor, account.currency)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>{messages.noDataYet}</p>
        )}
      </section>
    </div>
  );
}
