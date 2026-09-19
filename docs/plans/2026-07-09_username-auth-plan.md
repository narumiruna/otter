# Username authentication

## Goal
Use username instead of email for registration, login, public user data, and collaborator lookup.

## Plan
- [x] Inspect authentication, schema, UI, fixtures, and test setup.
- [x] Add migration 011 to rename the column and unique constraint without rewriting rows; SQL reviewed against migrations 001 and 008.
- [x] Update API, UI, fixtures, and docs. New usernames use 3–32 ASCII letters, digits, underscores, or hyphens; normalize case and surrounding whitespace. Existing email-shaped identifiers remain usable for login and collaborator lookup.
- [x] Add unit, component, API, and migration regression coverage. Unit and component checks pass.
- [ ] Run PostgreSQL-backed API/migration tests and Playwright checks. Blocked: `DATABASE_URL` is unset and Docker daemon is unavailable.

## Rollback / Recovery
Deploy migration and app together. Migration preserves existing email values as usernames rather than generating potentially conflicting names. Before rollback after new registrations, back up the database; stop the app, rename username and its unique constraint back to email, remove migration 011's tracking row, then deploy the previous app. New usernames will not satisfy the previous email login UI.

## Completion Checklist
- [x] `npm run check` passes: Biome, typecheck, 62 tests, and production build. Nine DB-backed tests skipped; no DB execution claimed.
- [ ] Database migration, API, and browser tests pass with a migrated `DATABASE_URL`.
- [x] Diff reviewed; `git diff --check` passes. README documents username rules, API field changes, legacy login, and coordinated migration/app deployment.
