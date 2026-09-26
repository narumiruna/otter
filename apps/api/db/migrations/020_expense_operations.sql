-- Keep operation receipts for the lifetime of a trip, even when its expense is
-- deleted. Never expire these while offline clients may still retry.
CREATE TABLE expense_create_operations (
  trip_id text NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  operation_id uuid NOT NULL,
  request_hash text NOT NULL,
  expense_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (trip_id, user_id, operation_id)
);
