-- Recovery requires the original capability. Existing hash-only links stay valid.
ALTER TABLE trip_share_links
  ADD COLUMN token text
    CONSTRAINT trip_share_links_token_format
    CHECK (token IS NULL OR token ~ '^[A-Za-z0-9_-]{43}$');

COMMENT ON COLUMN trip_share_links.token IS
  'Secret share capability for browser-owner recovery. Protect database copies and backups. NULL for legacy or revoked links.';
