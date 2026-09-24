ALTER TABLE trip_share_links
  ADD COLUMN mode text NOT NULL DEFAULT 'readonly'
    CHECK (mode IN ('readonly', 'signed-in-edit', 'anyone-edit')),
  ADD COLUMN guest_user_id text REFERENCES users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX trip_share_links_guest_user_id_idx
  ON trip_share_links(guest_user_id) WHERE guest_user_id IS NOT NULL;
