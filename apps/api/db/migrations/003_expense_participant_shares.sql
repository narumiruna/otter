ALTER TABLE expense_participants
  ADD COLUMN IF NOT EXISTS share_minor bigint CHECK (share_minor IS NULL OR share_minor > 0);
