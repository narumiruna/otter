CREATE TABLE settlement_payments (
  id text PRIMARY KEY,
  trip_id text NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  from_id text NOT NULL,
  to_id text NOT NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL CHECK (currency IN ('TWD', 'JPY', 'USD', 'EUR')),
  paid_at date NOT NULL,
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 160),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (trip_id, from_id) REFERENCES participants(trip_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (trip_id, to_id) REFERENCES participants(trip_id, id) ON DELETE RESTRICT
);
CREATE INDEX settlement_payments_trip_id_idx ON settlement_payments(trip_id);
