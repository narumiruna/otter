CREATE TABLE receipt_attachments (
  id text PRIMARY KEY,
  trip_id text NOT NULL,
  expense_id text NOT NULL,
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  data bytea NOT NULL CHECK (octet_length(data) <= 5242880),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (expense_id),
  FOREIGN KEY (trip_id, expense_id) REFERENCES expenses(trip_id, id) ON DELETE CASCADE
);
CREATE INDEX receipt_attachments_trip_id_idx ON receipt_attachments(trip_id);
