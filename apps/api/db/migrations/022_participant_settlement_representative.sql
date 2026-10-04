ALTER TABLE participants
  ADD COLUMN settled_by_id text,
  ADD CONSTRAINT participants_no_self_settlement CHECK (settled_by_id IS DISTINCT FROM id),
  ADD CONSTRAINT participants_settled_by_same_trip
    FOREIGN KEY (trip_id, settled_by_id) REFERENCES participants(trip_id, id)
    ON DELETE SET NULL (settled_by_id);
