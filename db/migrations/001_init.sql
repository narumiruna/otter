CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id text PRIMARY KEY,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE trips (
  id text PRIMARY KEY,
  owner_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  base_currency text NOT NULL CHECK (base_currency IN ('TWD', 'JPY', 'USD', 'EUR')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX trips_owner_id_idx ON trips(owner_id);

CREATE TABLE participants (
  id text PRIMARY KEY,
  trip_id text NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id, id)
);
CREATE INDEX participants_trip_id_idx ON participants(trip_id);

CREATE TABLE expenses (
  id text PRIMARY KEY,
  trip_id text NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 120),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL CHECK (currency IN ('TWD', 'JPY', 'USD', 'EUR')),
  paid_by_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id, id),
  FOREIGN KEY (trip_id, paid_by_id) REFERENCES participants(trip_id, id) ON DELETE RESTRICT
);
CREATE INDEX expenses_trip_id_idx ON expenses(trip_id);

CREATE TABLE expense_participants (
  expense_id text NOT NULL,
  trip_id text NOT NULL,
  participant_id text NOT NULL,
  position integer NOT NULL CHECK (position >= 0),
  PRIMARY KEY (expense_id, participant_id),
  UNIQUE (expense_id, position),
  FOREIGN KEY (trip_id, expense_id) REFERENCES expenses(trip_id, id) ON DELETE CASCADE,
  FOREIGN KEY (trip_id, participant_id) REFERENCES participants(trip_id, id) ON DELETE RESTRICT
);
CREATE INDEX expense_participants_trip_id_idx ON expense_participants(trip_id);
