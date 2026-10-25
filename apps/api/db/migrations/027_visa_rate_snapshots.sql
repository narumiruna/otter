-- Expand the schema before the cutover. Old snapshots remain valid.
CREATE FUNCTION valid_saved_exchange_rate(r jsonb, currency text, record_date text) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(
    jsonb_typeof(r) = 'object' AND
    r->>'baseCurrency' IN ('TWD','JPY','USD','EUR','SGD','GBP','AUD','CAD','KRW') AND
    jsonb_typeof(r->'rateToBase') = 'number' AND
    (r->>'rateToBase')::numeric > 0 AND (r->>'rateToBase')::numeric < 1e308::numeric AND
    (r->>'baseCurrency' <> currency OR (r->>'rateToBase')::numeric = 1) AND
    CASE r->>'source'
      WHEN 'visa' THEN r->>'provider' = 'VISA' AND r->>'rateType' = 'visa' AND
        jsonb_typeof(r->'date') = 'string' AND r->>'date' = record_date AND
        jsonb_typeof(r->'fetchedAt') = 'string' AND r->>'fetchedAt' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T' AND
        (r->>'fetchedAt')::timestamptz IS NOT NULL
      WHEN 'bank' THEN r->>'provider' = 'BANK_OF_TAIWAN' AND r->>'rateType' = 'spotMid' AND
        jsonb_typeof(r->'fetchedAt') = 'string' AND
        (r->>'fetchedAt')::timestamptz IS NOT NULL
      ELSE r->>'source' IN ('custom','fixed','legacy') AND
        NOT r ? 'provider' AND NOT r ? 'rateType' AND NOT r ? 'fetchedAt'
    END, false)
$$;

CREATE FUNCTION valid_exchange_rate_bridge(r jsonb, source_currency text, record_date text) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(r->>'sourceCurrency' = source_currency AND
    source_currency IN ('TWD','JPY','USD','EUR','SGD','GBP','AUD','CAD','KRW') AND
    valid_saved_exchange_rate(r, source_currency, record_date), false)
$$;

ALTER TABLE expenses DROP CONSTRAINT expenses_exchange_rate_check;
ALTER TABLE expenses ADD CONSTRAINT expenses_exchange_rate_check
  CHECK (exchange_rate IS NULL OR valid_saved_exchange_rate(exchange_rate, currency, expense_date::text));
ALTER TABLE expenses ADD COLUMN exchange_rate_bridge jsonb;
ALTER TABLE expenses ADD CONSTRAINT expenses_exchange_rate_bridge_check
  CHECK (exchange_rate_bridge IS NULL OR valid_exchange_rate_bridge(exchange_rate_bridge, exchange_rate->>'baseCurrency', expense_date::text));

ALTER TABLE settlement_payments ADD COLUMN exchange_rate jsonb;
ALTER TABLE settlement_payments ADD COLUMN exchange_rate_bridge jsonb;
ALTER TABLE settlement_payments ADD CONSTRAINT settlement_payments_exchange_rate_check
  CHECK (exchange_rate IS NULL OR valid_saved_exchange_rate(exchange_rate, currency, paid_at::text));
ALTER TABLE settlement_payments ADD CONSTRAINT settlement_payments_bridge_check
  CHECK (exchange_rate_bridge IS NULL OR valid_exchange_rate_bridge(exchange_rate_bridge, exchange_rate->>'baseCurrency', paid_at::text));

-- Explicit, operator-approved rates from the old app. Never used for new quotes.
CREATE TABLE rate_cutover_baselines (
  trip_id text PRIMARY KEY REFERENCES trips(id) ON DELETE CASCADE,
  base_currency text NOT NULL CHECK (base_currency IN ('TWD','JPY','USD','EUR','SGD','GBP','AUD','CAD','KRW')),
  rates jsonb NOT NULL CHECK (jsonb_typeof(rates) = 'object' AND rates->>base_currency = '1'),
  captured_at timestamptz NOT NULL
);

CREATE OR REPLACE FUNCTION expense_revision_snapshot(expenses) RETURNS jsonb
LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'schemaVersion', 1,
    'expense', jsonb_strip_nulls(jsonb_build_object(
      'id', $1.id, 'description', $1.description, 'amountMinor', $1.amount_minor,
      'currency', $1.currency, 'category', $1.category, 'tags', $1.tags,
      'visaExchangeRate', $1.visa_exchange_rate, 'exchangeRateBridge', $1.exchange_rate_bridge,
      'exchangeRate', $1.exchange_rate,
      'paidById', $1.paid_by_id, 'expenseDate', $1.expense_date,
      'createdAt', $1.created_at,
      'participantIds', (SELECT jsonb_agg(ep.participant_id ORDER BY ep.position) FROM expense_participants ep WHERE ep.expense_id = $1.id),
      'participantShares', (SELECT jsonb_agg(jsonb_build_object('participantId', ep.participant_id, 'shareMinor', ep.share_minor) ORDER BY ep.position) FILTER (WHERE ep.share_minor IS NOT NULL) FROM expense_participants ep WHERE ep.expense_id = $1.id)
    )),
    'participants', (SELECT jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name) ORDER BY p.id)
      FROM participants p WHERE p.trip_id = $1.trip_id AND (p.id = $1.paid_by_id OR EXISTS (SELECT 1 FROM expense_participants ep WHERE ep.expense_id = $1.id AND ep.participant_id = p.id))),
    'receipt', (SELECT jsonb_build_object('id', r.id, 'mimeType', r.mime_type) FROM receipt_attachments r WHERE r.expense_id = $1.id)
  )
$$;
