-- 019 could only estimate legacy expenses from the built-in table. Recover
-- configured rates for rows that existed before 019, without rewriting quotes
-- recorded by newer writers or v1 restores after that migration.
-- Rates changed since 019 cannot be reconstructed; see deployment notes.
-- Fail atomically if a recovered rate would make an expense unreadable.
DO $$
DECLARE
  bad_trip text;
  bad_expense text;
BEGIN
  SELECT c.trip_id, c.expense_id INTO bad_trip, bad_expense
  FROM (
    SELECT e.trip_id, e.id AS expense_id, e.currency,
      e.amount_minor::text AS amount_minor
    FROM expenses e, schema_migrations m
    WHERE m.version = '019_expense_exchange_rate'
      AND e.exchange_rate = legacy_expense_rate(e.currency,
        (SELECT base_currency FROM trips WHERE id = e.trip_id))
      AND EXISTS (SELECT 1 FROM expense_revisions r
        WHERE r.trip_id = e.trip_id AND r.expense_id = e.id
          AND r.recorded_at < m.applied_at)
      AND NOT EXISTS (SELECT 1 FROM expense_revisions r
        WHERE r.trip_id = e.trip_id AND r.expense_id = e.id
          AND r.recorded_at >= m.applied_at)
    UNION ALL
    SELECT r.trip_id, r.expense_id,
      r.snapshot->'expense'->>'currency',
      r.snapshot->'expense'->>'amountMinor'
    FROM expense_revisions r, schema_migrations m
    WHERE m.version = '019_expense_exchange_rate'
      AND r.recorded_at < m.applied_at
      AND r.snapshot->'expense'->'exchangeRate' =
        legacy_expense_rate(r.snapshot->'expense'->>'currency',
          (SELECT base_currency FROM trips WHERE id = r.trip_id))
  ) c
  JOIN trips t ON t.id = c.trip_id
  JOIN trip_exchange_rates x ON x.trip_id = c.trip_id AND x.currency = c.currency
  WHERE c.currency <> t.base_currency
    AND round(c.amount_minor::numeric /
      (CASE c.currency WHEN 'USD' THEN 100 WHEN 'EUR' THEN 100 ELSE 1 END) *
      x.rate_to_base *
      (CASE t.base_currency WHEN 'USD' THEN 100 WHEN 'EUR' THEN 100 ELSE 1 END))
      > 9007199254740000
  LIMIT 1;
  IF bad_expense IS NOT NULL THEN
    RAISE EXCEPTION 'Legacy custom rate exceeds safe conversion range for trip %, expense %', bad_trip, bad_expense
      USING HINT = 'Compare the saved rate and expense against the pre-upgrade backup before retrying migration 020.';
  END IF;
END $$;

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
  )
  AND NOT EXISTS (
    SELECT 1 FROM expense_revisions r
    WHERE r.trip_id = e.trip_id AND r.expense_id = e.id
      AND r.recorded_at >= c.applied_at
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
