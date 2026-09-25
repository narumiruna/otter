ALTER TABLE expense_revisions DROP CONSTRAINT expense_revisions_action_check;
ALTER TABLE expense_revisions ADD CONSTRAINT expense_revisions_action_check
  CHECK (action IN ('baseline', 'created', 'updated', 'deleted', 'restored'));

ALTER TABLE expense_revisions DROP CONSTRAINT expense_revisions_source_check;
ALTER TABLE expense_revisions ADD CONSTRAINT expense_revisions_source_check
  CHECK (source IN ('expense', 'csv_import', 'backup_restore', 'participant_merge', 'receipt', 'development_seed', 'migration', 'version_restore'));
