CREATE TABLE trip_share_links (
  id text PRIMARY KEY,
  trip_id text NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  expires_at timestamptz
);
CREATE INDEX trip_share_links_trip_id_idx ON trip_share_links(trip_id);
CREATE INDEX trip_share_links_active_idx ON trip_share_links(token_hash, revoked_at, expires_at);
