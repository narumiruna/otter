import {
  ArrowTopRightIcon,
  FileTextIcon,
  TokensIcon,
} from "@radix-ui/react-icons";
import { spendingSummary, type TripPayload } from "../client-support.js";
import { useI18n } from "../i18n.js";

export function OverviewSummary({ payload }: { payload: TripPayload }) {
  const { formatMoney, messages } = useI18n();
  const { trip, settlements } = payload;
  const { totalMinor } = spendingSummary(trip);
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
          <TokensIcon aria-hidden="true" />
        </div>
        <strong className="summary-card-value">
          {formatMoney(totalMinor, trip.baseCurrency)}
        </strong>
        <span className="summary-card-hint">
          {trip.baseCurrency} · {messages.convertedToBaseCurrency}
        </span>
      </div>
      <div className="summary-card">
        <div className="summary-card-label">
          <span>{messages.outstanding}</span>
          <ArrowTopRightIcon aria-hidden="true" />
        </div>
        <strong className="summary-card-value">
          {formatMoney(outstandingMinor, trip.baseCurrency)}
        </strong>
        <span className="summary-card-hint">
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
          <FileTextIcon aria-hidden="true" />
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
