ALTER TABLE expenses ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version > 0);

CREATE TABLE expense_revisions (
  id text PRIMARY KEY,
  trip_id text NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  expense_id text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  action text NOT NULL CHECK (action IN ('baseline', 'created', 'updated', 'deleted')),
  source text NOT NULL CHECK (source IN ('expense', 'csv_import', 'backup_restore', 'participant_merge', 'receipt', 'development_seed', 'migration')),
  actor jsonb,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  snapshot jsonb NOT NULL CHECK (snapshot->>'schemaVersion' = '1'),
  UNIQUE (trip_id, expense_id, version)
);
CREATE INDEX expense_revisions_page_idx ON expense_revisions (trip_id, recorded_at DESC, id DESC);
CREATE INDEX expense_revisions_expense_page_idx ON expense_revisions (trip_id, expense_id, recorded_at DESC, id DESC);

-- One statement snapshot used both for backfill and application writes. No image bytes or URLs.
CREATE FUNCTION expense_revision_snapshot(expenses) RETURNS jsonb
LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'schemaVersion', 1,
    'expense', jsonb_strip_nulls(jsonb_build_object(
      'id', $1.id, 'description', $1.description, 'amountMinor', $1.amount_minor,
      'currency', $1.currency, 'category', $1.category, 'tags', $1.tags,
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

INSERT INTO expense_revisions (id, trip_id, expense_id, version, action, source, actor, snapshot)
SELECT 'baseline_' || id, trip_id, id, version, 'baseline', 'migration', NULL, expense_revision_snapshot(expenses)
FROM expenses;
