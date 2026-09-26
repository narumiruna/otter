-- 019 could only estimate legacy expenses from the built-in table. Recover
-- configured rates for rows that existed before 019, without rewriting quotes
-- recorded by newer writers or v1 restores after that migration.
-- Rates changed since 019 cannot be reconstructed; see deployment notes.
WITH cutoff AS (
  SELECT applied_at FROM schema_migrations
  WHERE version = '019_expense_exchange_rate'
)
UPDATE expenses e SET exchange_rate = jsonb_build_object(
  'baseCurrency', t.base_currency, 'rateToBase', x.rate_to_base,
  'source', 'legacy'
)
FROM trips t, trip_exchange_rates x, cutoff c
WHERE e.trip_id = t.id AND x.trip_id = t.id AND x.currency = e.currency
  AND e.currency <> t.base_currency
  AND e.exchange_rate = legacy_expense_rate(e.currency, t.base_currency)
  AND EXISTS (
    SELECT 1 FROM expense_revisions r
    WHERE r.trip_id = e.trip_id AND r.expense_id = e.id
      AND r.recorded_at < c.applied_at
  );

UPDATE expense_revisions r SET snapshot = jsonb_set(
  r.snapshot, '{expense,exchangeRate}',
  jsonb_build_object('baseCurrency', t.base_currency,
    'rateToBase', x.rate_to_base, 'source', 'legacy')
)
FROM trips t, trip_exchange_rates x, schema_migrations m
WHERE m.version = '019_expense_exchange_rate'
  AND r.trip_id = t.id AND x.trip_id = t.id
  AND x.currency = r.snapshot->'expense'->>'currency'
  AND x.currency <> t.base_currency
  AND r.recorded_at < m.applied_at
  AND r.snapshot->'expense'->'exchangeRate' =
    legacy_expense_rate(x.currency, t.base_currency);
