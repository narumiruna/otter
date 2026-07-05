## Goal

Reduce over-engineering found by the repo-wide ponytail audit while preserving the app's core travel expense tracking behavior. Success means the listed code can be deleted or collapsed, docs stay accurate, and `npm run check` passes.

## Context

The audit found removable complexity in dev sample seeding, PWA offline caching, duplicate validators, duplicate test DTOs, command wrappers, CI, Vite config, and migration bootstrap SQL.

## Non-Goals

- Do not add dependencies.
- Do not change expense, balance, settlement, auth, sharing, backup, or receipt behavior except where deleting dev-only/offline-shell code requires doc updates.
- Do not rewrite UI structure beyond removing dev credential prefill and service worker registration.

## Plan

- [x] Remove dev admin/sample-trip seeding from `src/server-support.ts`, `src/server.ts`, `src/client/client-support.ts`, `src/client/views.ts`, and `src/client/main.ts` so local dev starts with normal registration only; verified by `rg "devAdmin|ensureDevAdmin|ensureDevTokyoTrip|ensureDevOsakaTrip" src` returning no matches and `npm run typecheck` passing.
- [x] Delete the offline shell cache by removing `public/sw.js` and the service-worker registration in `src/client/main.ts`; update `README.md` wording to keep install shortcut support but drop offline-shell claims; verified by `rg "serviceWorker|sw.js|離線殼層|offline shell" src public README.md GOAL.md` returning no matches.
- [x] Replace duplicate `isDateOnly` implementations with one shared helper used by `src/server-support.ts`, `src/shared/csv.ts`, and `src/shared/backup.ts`; verified by `rg "function isDateOnly|export function isDateOnly" src` showing only `src/shared/date.ts` and `npm test -- src/shared/csv.test.ts src/shared/backup.test.ts` passing.
- [x] Shrink `src/server-test-utils.ts` DTO declarations by reusing existing client/shared public types where possible; verified by `npm run typecheck` and `npm test -- src/server*.test.ts` passing.
- [x] Remove the duplicate `justfile` command wrappers; verified by `test ! -f justfile` exit 0 and `rg "\bjust\b" README.md AGENTS.md docs package.json .github` returning no matches.
- [x] Remove the redundant standalone `npm run migrate` CI step from `.github/workflows/ci.yml` because DB-backed tests run migrations per schema; verified by inspecting `.github/workflows/ci.yml` and `npm run check` passing.
- [x] Delete the unused Vite dev `server` block from `vite.config.ts`; verified by `npm run build` passing.
- [x] Remove duplicate `schema_migrations` DDL from `db/migrations/001_init.sql`, leaving migration table creation to `scripts/migrate.ts`; verified by `npm test -- src/server*.test.ts` passing, with DB-backed tests skipped unless `TEST_DATABASE_URL` is set.
- [x] Run `npm run check` after all deletions; verified exit 0.

## Risks

- Removing the service worker intentionally removes the documented offline app shell; docs were changed in the same work.
- Editing migration `001_init.sql` is safe only because this repo has no checksum-based migration validation; clean DB-backed tests remain gated by `TEST_DATABASE_URL`, while normal test/bootstrap paths pass.

## Rollback / Recovery

- Revert the commit if `npm run check` fails after the cleanup.
- If users still need an offline shell, restore `public/sw.js` and its registration in one focused follow-up.

## Completion Checklist

- [x] All audit cleanup targets are either removed or explicitly kept with evidence in the PR/diff; verified by `git diff --stat` showing `21 insertions(+), 456 deletions(-)` across tracked files plus a 10-line shared date helper.
- [x] No stale docs mention dev credential prefill or offline shell caching, verified by the `rg` commands in the plan returning no matches.
- [x] TypeScript, tests, lint, and build pass, verified by `npm run check` exit 0.
- [x] The net code diff removes more code than it adds, verified by `git diff --stat` showing `21 insertions(+), 456 deletions(-)` across tracked files plus `wc -l src/shared/date.ts` showing 10 added helper lines.
