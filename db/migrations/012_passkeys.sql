CREATE TABLE passkeys (
  credential_id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_key bytea NOT NULL,
  counter bigint NOT NULL CHECK (counter >= 0),
  transports text[] NOT NULL DEFAULT '{}',
  device_type text NOT NULL CHECK (device_type IN ('singleDevice', 'multiDevice')),
  backed_up boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
CREATE INDEX passkeys_user_id_idx ON passkeys(user_id);

CREATE TABLE passkey_challenges (
  id text PRIMARY KEY,
  challenge text NOT NULL,
  ceremony text NOT NULL CHECK (ceremony IN ('registration', 'authentication')),
  user_id text REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (ceremony = 'registration' AND user_id IS NOT NULL) OR
    (ceremony = 'authentication' AND user_id IS NULL)
  )
);
CREATE INDEX passkey_challenges_expires_at_idx ON passkey_challenges(expires_at);
CREATE UNIQUE INDEX passkey_registration_challenges_user_id_idx
  ON passkey_challenges(user_id)
  WHERE ceremony = 'registration';
