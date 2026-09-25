-- Keep the column nullable for rolling upgrades: older writers still insert, and
-- readers mark those rows as estimates rather than inventing a bank quote.
ALTER TABLE expenses ADD COLUMN exchange_rate jsonb;

CREATE FUNCTION legacy_expense_rate(source_currency text, base_currency text) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_build_object(
    'baseCurrency', base_currency, 'rateToBase',
    CASE WHEN source_currency = base_currency THEN 1 ELSE round(
      (CASE source_currency WHEN 'TWD' THEN 1 WHEN 'JPY' THEN 0.22 WHEN 'USD' THEN 32 WHEN 'EUR' THEN 35 END)::numeric /
      (CASE base_currency WHEN 'TWD' THEN 1 WHEN 'JPY' THEN 0.22 WHEN 'USD' THEN 32 WHEN 'EUR' THEN 35 END)::numeric, 12) END,
    'source', 'legacy'
  )
$$;

UPDATE expenses e SET exchange_rate = legacy_expense_rate(e.currency, t.base_currency)
FROM trips t WHERE t.id = e.trip_id;

-- Historical versions are estimates too. Do not attribute current quotes to them.
UPDATE expense_revisions r SET snapshot = jsonb_set(
  r.snapshot, '{expense,exchangeRate}',
  legacy_expense_rate(r.snapshot->'expense'->>'currency', t.base_currency)
) FROM trips t WHERE t.id = r.trip_id;

ALTER TABLE expenses ADD CONSTRAINT expenses_exchange_rate_check CHECK (
  exchange_rate IS NULL OR coalesce((
    jsonb_typeof(exchange_rate) = 'object' AND
    exchange_rate->>'baseCurrency' IN ('TWD', 'JPY', 'USD', 'EUR') AND
    exchange_rate->>'source' IN ('bank', 'custom', 'fixed', 'legacy') AND
    jsonb_typeof(exchange_rate->'rateToBase') = 'number' AND
    (exchange_rate->>'rateToBase')::numeric > 0 AND
    (exchange_rate->>'baseCurrency' <> currency OR (exchange_rate->>'rateToBase')::numeric = 1) AND
    (exchange_rate->>'source' <> 'bank' OR
      (exchange_rate->>'provider' = 'BANK_OF_TAIWAN' AND exchange_rate->>'rateType' = 'spotMid' AND exchange_rate->>'fetchedAt' IS NOT NULL))
  ), false)
);

CREATE OR REPLACE FUNCTION expense_revision_snapshot(expenses) RETURNS jsonb
LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'schemaVersion', 1,
    'expense', jsonb_strip_nulls(jsonb_build_object(
      'id', $1.id, 'description', $1.description, 'amountMinor', $1.amount_minor,
      'currency', $1.currency, 'category', $1.category, 'tags', $1.tags,
      'exchangeRate', coalesce($1.exchange_rate, legacy_expense_rate($1.currency, (SELECT base_currency FROM trips WHERE id = $1.trip_id))),
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
