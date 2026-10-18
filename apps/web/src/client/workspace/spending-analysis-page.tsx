import { ChevronDownIcon as ChevronDown } from "@radix-ui/react-icons";
import {
  type SpendingSummary,
  spendingSummary,
  type TripPayload,
} from "../client-support.js";
import { localizeMessage, useI18n } from "../i18n.js";
import { MemberAccounts } from "./member-accounts.js";

export function SpendingAnalysisPage({ payload }: { payload: TripPayload }) {
  const { formatMoney, messages } = useI18n();
  const summary = spendingSummary(payload.trip);
  return (
    <section
      className="surface grid gap-4"
      aria-labelledby="spending-analysis-heading"
    >
      <header>
        <h3 id="spending-analysis-heading" className="text-lg font-semibold">
          {messages.spendingAnalysis}
        </h3>
        <p className="text-sm text-muted-foreground">
          {messages.totalAmount({
            amount: formatMoney(summary.totalMinor, payload.trip.baseCurrency),
          })}
        </p>
      </header>
      <SpendingAnalysisContent payload={payload} summary={summary} />
    </section>
  );
}

export function SpendingAnalysisDisclosure({
  payload,
}: {
  payload: TripPayload;
}) {
  const { formatMoney, messages } = useI18n();
  const { trip } = payload;
  const hasCalculatedResults =
    payload.settlements.length > 0 ||
    payload.balances.some(({ amountMinor }) => amountMinor !== 0);
  if (
    trip.expenses.length === 0 &&
    !trip.settlementPayments?.length &&
    !hasCalculatedResults
  ) {
    return null;
  }
  const summary = spendingSummary(trip);
  return (
    <details className="surface disclosure">
      <summary className="text-lg">
        <ChevronDown aria-hidden="true" />
        <h3 className="inline text-lg">{messages.spendingAnalysis}</h3>{" "}
        <span className="summary-meta">
          {messages.totalAmount({
            amount: formatMoney(summary.totalMinor, trip.baseCurrency),
          })}
        </span>
      </summary>
      <div className="pt-4">
        <SpendingAnalysisContent payload={payload} summary={summary} />
      </div>
    </details>
  );
}

function SpendingAnalysisContent({
  payload,
  summary,
}: {
  payload: TripPayload;
  summary: SpendingSummary;
}) {
  const { trip } = payload;
  const { formatMoney, messages } = useI18n();
  const charts = [
    {
      title: messages.dailySpending,
      rows: summary.dailyTotals.map((row) => ({
        label: row.date,
        value: row.amountMinor,
      })),
    },
    {
      title: messages.paidByPerson,
      rows: summary.payerTotals.map((row) => ({
        label: row.name,
        value: row.amountMinor,
      })),
    },
    {
      title: messages.byCategory,
      rows: summary.categoryTotals.map((row) => ({
        label: localizeMessage(row.category),
        value: row.amountMinor,
      })),
    },
  ];
  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-3">
        {charts.map((chart) => (
          <div className="rounded-xl border p-4" key={chart.title}>
            <h4 className="mb-3 font-semibold">{chart.title}</h4>
            {chart.rows.length ? (
              <ul className="grid gap-3">
                {chart.rows.map((row) => (
                  <li className="grid gap-1 text-sm" key={row.label}>
                    <div className="flex justify-between gap-2">
                      <span className="min-w-0 break-anywhere">
                        {row.label}
                      </span>
                      <span className="shrink-0 whitespace-nowrap tabular-nums">
                        {formatMoney(row.value, trip.baseCurrency)}
                      </span>
                    </div>
                    <span className="h-2 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.max(2, Math.round((row.value / Math.max(...chart.rows.map((item) => item.value), 1)) * 100))}%`,
                        }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-copy">{messages.noDataYet}</p>
            )}
          </div>
        ))}
      </div>
      <MemberAccounts payload={payload} />
    </div>
  );
}
