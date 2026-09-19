-- Preserve existing account identifiers, passwords, sessions, and memberships.
-- Existing email values become usernames and remain valid for login/lookup.
ALTER TABLE users RENAME COLUMN email TO username;
ALTER TABLE users RENAME CONSTRAINT users_email_key TO users_username_key;
