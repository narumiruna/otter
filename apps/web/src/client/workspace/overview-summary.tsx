import { settlementCurrency } from "@narumitw/otter-core/settlement";
import { spendingSummary, type TripPayload } from "../client-support.js";
import { useI18n } from "../i18n.js";

export function OverviewSummary({ payload }: { payload: TripPayload }) {
  const { formatMoney, messages } = useI18n();
  const { trip, settlements } = payload;
  const summary = spendingSummary(trip);
  const outstandingMinor = settlements.reduce(
    (total, settlement) => total + settlement.amountMinor,
    0,
  );
  return (
    <section
      className="overview-summary"
      aria-label={messages.groupExpenseSummary}
    >
      <div className="summary-card summary-card-primary">
        <div className="summary-card-label">
          <span>{messages.totalSharedExpenses}</span>
        </div>
        <strong className="summary-card-value">
          {summary.rateUnavailable
            ? messages.rateUnavailable
            : formatMoney(summary.totalMinor, trip.baseCurrency)}
        </strong>
        <span className="summary-card-hint">
          {trip.baseCurrency} · {messages.convertedToBaseCurrency}
        </span>
      </div>
      <div className="summary-card">
        <div className="summary-card-label">
          <span>{messages.outstanding}</span>
        </div>
        <strong className="summary-card-value">
          {formatMoney(outstandingMinor, settlementCurrency(trip))}
        </strong>
        <span className="summary-card-hint">
          {settlementCurrency(trip)} ·{" "}
          {settlements.length
            ? messages.countSuggestedPaymentsToSettleUp({
                count: settlements.length,
              })
            : trip.expenses.length
              ? messages.nothingIsCurrentlyOutstanding
              : messages.settlementSuggestionsAppearAfterExpensesAreAdded}
        </span>
      </div>
      <div className="summary-card">
        <div className="summary-card-label">
          <span>{messages.expenseRecords}</span>
        </div>
        <strong className="summary-card-value">
          {trip.expenses.length}
          <small> {messages.entries}</small>
        </strong>
        <span className="summary-card-hint">
          {messages.sharedAmongCountPeople({ count: trip.participants.length })}
        </span>
      </div>
    </section>
  );
}
