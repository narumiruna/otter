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
      className="surface spending-analysis"
      aria-labelledby="spending-analysis-heading"
    >
      <header>
        <h3 id="spending-analysis-heading" className="text-lg font-semibold">
          {messages.spendingAnalysis}
        </h3>
        <p className="spending-analysis-total">
          {summary.rateUnavailable
            ? messages.rateUnavailable
            : messages.totalAmount({
                amount: formatMoney(
                  summary.totalMinor,
                  payload.trip.baseCurrency,
                ),
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
          {summary.rateUnavailable
            ? messages.rateUnavailable
            : messages.totalAmount({
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
  const { formatMoney, locale, messages } = useI18n();
  const percent = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 1,
  });
  const charts = [
    {
      title: messages.dailySpending,
      showShare: false,
      rows: summary.dailyTotals.map((row) => ({
        key: row.date,
        label: row.date,
        value: row.amountMinor,
      })),
    },
    {
      title: messages.paidByPerson,
      showShare: true,
      rows: summary.payerTotals.map((row) => ({
        key: row.participantId,
        label: row.name,
        value: row.amountMinor,
      })),
    },
    {
      title: messages.byCategory,
      showShare: true,
      rows: summary.categoryTotals.map((row) => ({
        key: row.category,
        label: localizeMessage(row.category),
        value: row.amountMinor,
      })),
    },
  ];
  return (
    <div className="spending-analysis-content">
      <p className="spending-analysis-help">
        {messages.analysisBasis({ currency: trip.baseCurrency })}
      </p>
      <dl className="spending-metrics">
        <div>
          <dt>{messages.expenses}</dt>
          <dd>{summary.expenseCount.toLocaleString(locale)}</dd>
        </div>
        <div>
          <dt>{messages.analysisDays}</dt>
          <dd>
            {summary.calendarDays.toLocaleString(locale)}
            {summary.firstDate && summary.lastDate ? (
              <small>
                {messages.analysisPeriod({
                  start: summary.firstDate,
                  end: summary.lastDate,
                })}
              </small>
            ) : null}
          </dd>
        </div>
        {!summary.rateUnavailable ? (
          <>
            <div>
              <dt>{messages.analysisAverageExpense}</dt>
              <dd>
                {formatMoney(summary.averageExpenseMinor, trip.baseCurrency)}
              </dd>
            </div>
            <div>
              <dt>{messages.analysisAverageDay}</dt>
              <dd>{formatMoney(summary.averageDayMinor, trip.baseCurrency)}</dd>
            </div>
          </>
        ) : null}
      </dl>
      {summary.rateUnavailable ? (
        <p className="spending-analysis-help" role="status">
          {messages.analysisMissingRatesHelp}
        </p>
      ) : (
        <>
          <p className="spending-analysis-help">
            {messages.analysisDailyAverageHelp}
          </p>
          <div className="spending-charts">
            {charts.map((chart) => {
              const maximum = Math.max(
                1,
                ...chart.rows.map((row) => row.value),
              );
              return (
                <section className="spending-chart" key={chart.title}>
                  <h4>{chart.title}</h4>
                  {chart.rows.length ? (
                    <ul>
                      {chart.rows.map((row) => (
                        <li key={row.key}>
                          <div className="spending-chart-row">
                            <span className="min-w-0 break-anywhere">
                              {row.label}
                            </span>
                            <span className="spending-chart-amount">
                              <span className="tabular-nums">
                                {formatMoney(row.value, trip.baseCurrency)}
                              </span>
                              {chart.showShare ? (
                                <small>
                                  {messages.analysisShare({
                                    percent: percent.format(
                                      summary.totalMinor
                                        ? row.value / summary.totalMinor
                                        : 0,
                                    ),
                                  })}
                                </small>
                              ) : null}
                            </span>
                          </div>
                          <span
                            className="spending-chart-bar"
                            aria-hidden="true"
                          >
                            <span
                              style={{
                                width: `${(row.value / maximum) * 100}%`,
                              }}
                            />
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="empty-copy">{messages.noDataYet}</p>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
      <div className="spending-details">
        {!summary.rateUnavailable ? (
          <section aria-label={messages.analysisLargestExpenses}>
            <h4>{messages.analysisLargestExpenses}</h4>
            <p className="spending-analysis-help">
              {messages.analysisLargestExpensesHelp}
            </p>
            {summary.largestExpenses.length ? (
              <ol className="spending-expense-list">
                {summary.largestExpenses.map(({ expense, amountMinor }) => (
                  <li key={expense.id}>
                    <div className="spending-expense-copy">
                      <strong>{expense.description}</strong>
                      <small>
                        <time dateTime={expense.expenseDate}>
                          {expense.expenseDate}
                        </time>
                        <span>
                          {messages.paidBy}{" "}
                          {trip.participants.find(
                            (person) => person.id === expense.paidById,
                          )?.name ?? messages.unknown}
                        </span>
                      </small>
                    </div>
                    <span className="spending-expense-amount">
                      <strong className="tabular-nums">
                        {formatMoney(amountMinor, trip.baseCurrency)}
                      </strong>
                      {expense.currency !== trip.baseCurrency ? (
                        <small>
                          {formatMoney(expense.amountMinor, expense.currency)}
                        </small>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="empty-copy">{messages.noDataYet}</p>
            )}
          </section>
        ) : null}
        <section aria-label={messages.analysisOriginalCurrencyTotals}>
          <h4>{messages.analysisOriginalCurrencyTotals}</h4>
          <p className="spending-analysis-help">
            {messages.analysisOriginalCurrencyHelp}
          </p>
          {summary.currencyTotals.length ? (
            <dl className="spending-currency-totals">
              {summary.currencyTotals.map((row) => (
                <div key={row.currency}>
                  <dt>
                    {row.currency}
                    <small>
                      {messages.countEntries({ count: row.expenseCount })}
                    </small>
                  </dt>
                  <dd className="tabular-nums">
                    {formatMoney(row.amountMinor, row.currency)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="empty-copy">{messages.noDataYet}</p>
          )}
        </section>
      </div>
      <MemberAccounts payload={payload} />
    </div>
  );
}
