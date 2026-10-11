ALTER TABLE expense_revisions DROP CONSTRAINT expense_revisions_source_check;
ALTER TABLE expense_revisions ADD CONSTRAINT expense_revisions_source_check
  CHECK (source IN ('expense', 'csv_import', 'backup_restore', 'participant_merge', 'receipt', 'development_seed', 'migration', 'version_restore', 'visa_settlement'));

ALTER TABLE trips ADD COLUMN visa_settlement_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE expenses ADD COLUMN visa_exchange_rate jsonb;
ALTER TABLE expenses ADD CONSTRAINT expenses_visa_exchange_rate_check CHECK (
  visa_exchange_rate IS NULL OR coalesce((
    jsonb_typeof(visa_exchange_rate) = 'object' AND
    visa_exchange_rate->>'sourceCurrency' = currency AND
    visa_exchange_rate->>'date' = expense_date::text AND
    jsonb_typeof(visa_exchange_rate->'rateToTwd') = 'number' AND
    (visa_exchange_rate->>'rateToTwd')::numeric > 0 AND
    (currency <> 'TWD' OR (visa_exchange_rate->>'rateToTwd')::numeric = 1) AND
    visa_exchange_rate->>'fetchedAt' IS NOT NULL
  ), false)
);

CREATE OR REPLACE FUNCTION expense_revision_snapshot(expenses) RETURNS jsonb
LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'schemaVersion', 1,
    'expense', jsonb_strip_nulls(jsonb_build_object(
      'id', $1.id, 'description', $1.description, 'amountMinor', $1.amount_minor,
      'currency', $1.currency, 'category', $1.category, 'tags', $1.tags,
      'visaExchangeRate', $1.visa_exchange_rate,
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
