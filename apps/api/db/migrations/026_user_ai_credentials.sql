CREATE TABLE user_ai_credentials (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  method text NOT NULL CHECK (method IN ('oauth', 'api_key')),
  encrypted_credential bytea NOT NULL,
  PRIMARY KEY (user_id, provider)
);
