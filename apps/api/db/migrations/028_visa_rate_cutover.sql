-- No network I/O and no fixed fallback. Missing baselines stop the cutover.
SET LOCAL lock_timeout = '10s';
LOCK TABLE trips, expenses, settlement_payments, trip_exchange_rates IN ACCESS EXCLUSIVE MODE;
CREATE FUNCTION cutover_rate(trip text, source_currency text) RETURNS numeric
LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN source_currency = t.base_currency THEN 1
    WHEN b.trip_id IS NOT NULL AND b.base_currency = t.base_currency THEN (b.rates->>source_currency)::numeric
    WHEN b.trip_id IS NULL THEN c.rate_to_base ELSE NULL END
  FROM trips t
  LEFT JOIN rate_cutover_baselines b ON b.trip_id = t.id
  LEFT JOIN trip_exchange_rates c ON c.trip_id = t.id AND c.currency = source_currency
  WHERE t.id = trip
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM expenses e JOIN trips t ON t.id = e.trip_id
    WHERE (e.exchange_rate IS NULL AND cutover_rate(t.id, e.currency) IS NULL)
      OR (e.exchange_rate->>'baseCurrency' <> t.base_currency AND
          cutover_rate(t.id, e.exchange_rate->>'baseCurrency') IS NULL)
    UNION ALL
    SELECT 1 FROM settlement_payments p JOIN trips t ON t.id = p.trip_id
    WHERE NOT t.visa_settlement_enabled AND cutover_rate(t.id, p.currency) IS NULL
  ) THEN
    RAISE EXCEPTION 'Missing rate cutover baseline. Keep old writers stopped, import approved baselines with scripts/import-rate-baseline.ts, then rerun migrations.';
  END IF;
END
$$;

UPDATE expenses e SET exchange_rate = jsonb_build_object(
  'baseCurrency', t.base_currency, 'rateToBase', cutover_rate(t.id, e.currency), 'source', 'legacy')
FROM trips t WHERE t.id = e.trip_id AND e.exchange_rate IS NULL;

UPDATE expenses e SET exchange_rate_bridge = jsonb_build_object(
  'sourceCurrency', e.exchange_rate->>'baseCurrency', 'baseCurrency', t.base_currency,
  'rateToBase', cutover_rate(t.id, e.exchange_rate->>'baseCurrency'), 'source', 'legacy')
FROM trips t WHERE t.id = e.trip_id AND e.exchange_rate->>'baseCurrency' <> t.base_currency;

UPDATE settlement_payments p SET exchange_rate = jsonb_build_object(
  'baseCurrency', t.base_currency, 'rateToBase', cutover_rate(t.id, p.currency), 'source', 'legacy')
FROM trips t WHERE t.id = p.trip_id AND cutover_rate(t.id, p.currency) IS NOT NULL;

-- Original expense rates and append-only revisions are not rewritten.
DROP FUNCTION cutover_rate(text, text);
