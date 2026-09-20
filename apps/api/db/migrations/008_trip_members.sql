CREATE TABLE trip_members (
  id text PRIMARY KEY,
  trip_id text NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'editor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id, user_id)
);
CREATE INDEX trip_members_user_id_idx ON trip_members(user_id);
CREATE INDEX trip_members_trip_id_idx ON trip_members(trip_id);

INSERT INTO trip_members (id, trip_id, user_id, role, created_at)
SELECT 'member_' || trips.id || '_' || trips.owner_id,
       trips.id,
       trips.owner_id,
       'owner',
       trips.created_at
FROM trips
ON CONFLICT (trip_id, user_id) DO NOTHING;
