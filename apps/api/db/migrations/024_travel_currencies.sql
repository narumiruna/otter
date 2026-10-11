-- Extend currency constraints without rewriting existing financial records.
ALTER TABLE trips DROP CONSTRAINT trips_base_currency_check;
ALTER TABLE trips ADD CONSTRAINT trips_base_currency_check
  CHECK (base_currency IN ('TWD', 'JPY', 'USD', 'EUR', 'SGD', 'GBP', 'AUD', 'CAD', 'KRW'));

ALTER TABLE expenses DROP CONSTRAINT expenses_currency_check;
ALTER TABLE expenses ADD CONSTRAINT expenses_currency_check
  CHECK (currency IN ('TWD', 'JPY', 'USD', 'EUR', 'SGD', 'GBP', 'AUD', 'CAD', 'KRW'));

ALTER TABLE settlement_payments DROP CONSTRAINT settlement_payments_currency_check;
ALTER TABLE settlement_payments ADD CONSTRAINT settlement_payments_currency_check
  CHECK (currency IN ('TWD', 'JPY', 'USD', 'EUR', 'SGD', 'GBP', 'AUD', 'CAD', 'KRW'));

ALTER TABLE trip_exchange_rates DROP CONSTRAINT trip_exchange_rates_currency_check;
ALTER TABLE trip_exchange_rates ADD CONSTRAINT trip_exchange_rates_currency_check
  CHECK (currency IN ('TWD', 'JPY', 'USD', 'EUR', 'SGD', 'GBP', 'AUD', 'CAD', 'KRW'));

ALTER TABLE trips DROP CONSTRAINT trips_visa_settlement_currency_check;
ALTER TABLE trips ADD CONSTRAINT trips_visa_settlement_currency_check
  CHECK (visa_settlement_currency IN ('TWD', 'JPY', 'USD', 'EUR', 'SGD', 'GBP', 'AUD', 'CAD', 'KRW'));

ALTER TABLE expenses DROP CONSTRAINT expenses_exchange_rate_check;
ALTER TABLE expenses ADD CONSTRAINT expenses_exchange_rate_check CHECK (
  exchange_rate IS NULL OR coalesce((
    jsonb_typeof(exchange_rate) = 'object' AND
    exchange_rate->>'baseCurrency' IN ('TWD', 'JPY', 'USD', 'EUR', 'SGD', 'GBP', 'AUD', 'CAD', 'KRW') AND
    exchange_rate->>'source' IN ('bank', 'custom', 'fixed', 'legacy') AND
    jsonb_typeof(exchange_rate->'rateToBase') = 'number' AND
    (exchange_rate->>'rateToBase')::numeric > 0 AND
    (exchange_rate->>'baseCurrency' <> currency OR (exchange_rate->>'rateToBase')::numeric = 1) AND
    (exchange_rate->>'source' <> 'bank' OR
      (exchange_rate->>'provider' = 'BANK_OF_TAIWAN' AND exchange_rate->>'rateType' = 'spotMid' AND exchange_rate->>'fetchedAt' IS NOT NULL))
  ), false)
);


ALTER TABLE expenses DROP CONSTRAINT expenses_visa_exchange_rate_check;
ALTER TABLE expenses ADD CONSTRAINT expenses_visa_exchange_rate_check CHECK (
  visa_exchange_rate IS NULL OR coalesce((
    jsonb_typeof(visa_exchange_rate) = 'object' AND
    visa_exchange_rate->>'sourceCurrency' = currency AND
    visa_exchange_rate->>'date' = expense_date::text AND
    visa_exchange_rate->>'targetCurrency' IN ('TWD', 'JPY', 'USD', 'EUR', 'SGD', 'GBP', 'AUD', 'CAD', 'KRW') AND
    jsonb_typeof(visa_exchange_rate->'rate') = 'number' AND
    (visa_exchange_rate->>'rate')::numeric > 0 AND
    (currency <> visa_exchange_rate->>'targetCurrency' OR (visa_exchange_rate->>'rate')::numeric = 1) AND
    visa_exchange_rate->>'fetchedAt' IS NOT NULL
  ), false)
);


-- Keep legacy estimates aligned with the domain fixed-rate metadata.
CREATE OR REPLACE FUNCTION legacy_expense_rate(source_currency text, base_currency text) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_build_object(
    'baseCurrency', base_currency, 'rateToBase',
    CASE WHEN source_currency = base_currency THEN 1 ELSE round(
      (CASE source_currency WHEN 'TWD' THEN 1 WHEN 'JPY' THEN 0.22 WHEN 'USD' THEN 32 WHEN 'EUR' THEN 35 WHEN 'SGD' THEN 24 WHEN 'GBP' THEN 41 WHEN 'AUD' THEN 21 WHEN 'CAD' THEN 23 WHEN 'KRW' THEN 0.024 END)::numeric /
      (CASE base_currency WHEN 'TWD' THEN 1 WHEN 'JPY' THEN 0.22 WHEN 'USD' THEN 32 WHEN 'EUR' THEN 35 WHEN 'SGD' THEN 24 WHEN 'GBP' THEN 41 WHEN 'AUD' THEN 21 WHEN 'CAD' THEN 23 WHEN 'KRW' THEN 0.024 END)::numeric, 12) END,
    'source', 'legacy'
  )
$$;
