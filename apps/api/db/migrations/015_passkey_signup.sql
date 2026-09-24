-- Passwordless accounts have no password hash; existing accounts keep theirs.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- A short-lived pending signup is not a user or session until WebAuthn succeeds.
CREATE TABLE passkey_signup_challenges (
  id text PRIMARY KEY,
  challenge text NOT NULL,
  username text NOT NULL,
  user_id text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX passkey_signup_challenges_expires_at_idx
  ON passkey_signup_challenges(expires_at);
