CREATE TABLE api_tokens (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);
CREATE INDEX api_tokens_user_id_idx ON api_tokens(user_id, created_at DESC);
CREATE INDEX api_tokens_active_hash_idx ON api_tokens(token_hash, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE device_authorizations (
  id text PRIMARY KEY,
  device_code_hash text NOT NULL UNIQUE,
  user_code text NOT NULL UNIQUE CHECK (user_code ~ '^[A-Z2-9]{4}-[A-Z2-9]{4}$'),
  client_name text NOT NULL CHECK (char_length(client_name) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  approved_by_user_id text REFERENCES users(id) ON DELETE CASCADE,
  approved_at timestamptz,
  consumed_at timestamptz
);
CREATE INDEX device_authorizations_user_code_idx ON device_authorizations(user_code, expires_at);
CREATE INDEX device_authorizations_expiry_idx ON device_authorizations(expires_at);
