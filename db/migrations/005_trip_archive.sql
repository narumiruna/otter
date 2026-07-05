ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS trips_owner_archived_idx ON trips(owner_id, archived_at);
