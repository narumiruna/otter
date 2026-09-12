import {
  ArrowTopRightIcon,
  FileTextIcon,
  TokensIcon,
} from "@radix-ui/react-icons";
import { formatMinor } from "../../shared/money.js";
import { spendingSummary, type TripPayload } from "../client-support.js";

export function OverviewSummary({ payload }: { payload: TripPayload }) {
  const { trip, settlements } = payload;
  const { totalMinor } = spendingSummary(trip);
  const outstandingMinor = settlements.reduce(
    (total, settlement) => total + settlement.amountMinor,
    0,
  );
  return (
    <section className="overview-summary" aria-label="群組帳目摘要">
      <div className="summary-card summary-card-primary">
        <div className="summary-card-label">
          <span>共同支出總額</span>
          <TokensIcon aria-hidden="true" />
        </div>
        <strong className="summary-card-value">
          {formatMinor(totalMinor, trip.baseCurrency)}
        </strong>
        <span className="summary-card-hint">
          {trip.baseCurrency} · 已換算為基準貨幣
        </span>
      </div>
      <div className="summary-card">
        <div className="summary-card-label">
          <span>尚待結清</span>
          <ArrowTopRightIcon aria-hidden="true" />
        </div>
        <strong className="summary-card-value">
          {formatMinor(outstandingMinor, trip.baseCurrency)}
        </strong>
        <span className="summary-card-hint">
          {settlements.length
            ? `${settlements.length} 筆建議付款，讓帳目歸零`
            : trip.expenses.length
              ? "目前沒有待結清款項"
              : "記帳後自動計算結清建議"}
        </span>
      </div>
      <div className="summary-card">
        <div className="summary-card-label">
          <span>支出紀錄</span>
          <FileTextIcon aria-hidden="true" />
        </div>
        <strong className="summary-card-value">
          {trip.expenses.length}
          <small> 筆</small>
        </strong>
        <span className="summary-card-hint">
          {trip.participants.length} 位成員一起分帳
        </span>
      </div>
    </section>
  );
}
