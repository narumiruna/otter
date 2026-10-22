-- Account preferences only. No model is selected until the account saves one.
CREATE TABLE user_ai_settings (
  user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (char_length(provider) > 0),
  model text NOT NULL CHECK (char_length(model) > 0),
  thinking_level text NOT NULL CHECK (
    thinking_level IN ('off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max')
  )
);
