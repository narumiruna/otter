# Verified simplifications plan

## Goal

Resolve the seven confirmed review findings without changing externally observable behavior. Keep this user-requested plan with the pull request and record validation evidence here.

## Context

The review found repeated expense calculations, repeated persistence mappings, identical group-created callbacks, an unreachable cleanup query, and duplicated local conversions. The initial working tree was clean on `main`.

The review baseline passed Biome, TypeScript checks, and 1,416 tests. Another 112 API tests were skipped because `DATABASE_URL` was not set. This implementation must use a disposable PostgreSQL instance to validate the affected persistence paths.

## Behavior boundaries

- Keep money conversion, split rounding, participant order, and payment and representative adjustment order unchanged.
  - Use only fresh, local calculation maps. Do not add a cache or change public calculation APIs.
- Keep signup and passkey enrollment transaction boundaries and error responses unchanged.
- Preserve `archived_at` exactly when `archived` is omitted.
  - Explicit `false` writes NULL. Explicit `true` uses the newly calculated timestamp.
- Keep the participant merge's early bidirectional payment deletion and endpoint update order.
  - Remove only the final self-payment cleanup that cannot match rows under the existing database constraint.
- Keep group creation's cache update, awaited collection refresh, and navigation order.
  - Do not combine copy and normal restore flows with creation.
- Keep timestamp conversion errors and CSV output unchanged.
- Do not change migrations, authentication configuration, cookies, provider behavior, persisted formats, or supported compatibility paths.

## Plan

- [x] Confirm repository instructions, a clean starting tree, the GitHub base branch, and local validation tools.
  - Evidence: `AGENTS.md`; clean Git status; GitHub default branch `main`; Node.js, Docker, PostgreSQL tools, and GitHub CLI available.
- [x] Prepare a new disposable PostgreSQL instance and confirm that tests cannot use application data.
  - Evidence: a unique task-owned PostgreSQL 17 container uses a loopback-only random port; readiness passed and all 28 migrations applied.
- [x] Reuse expense totals in `packages/core/src/settlement.ts`.
  - The private balance function uses the fresh expense-balance map already calculated by each caller.
  - Evidence: focused core tests pass, including missing expense/payment rates, positive and negative split remainders, entry order, unknown IDs, and input immutability.
- [x] Use one group-created callback in `apps/web/src/client/workspace/authenticated-workspace.tsx`.
  - Evidence: 20 focused component tests passed, including all three creation entry points, delayed refresh, dialog closure, cached payload use, and the existing refresh-failure behavior.
- [x] Share only the duplicated passkey INSERT in `apps/api/src/server-passkeys.ts`.
  - Evidence: the focused PostgreSQL run passed signup, enrollment, duplicate-credential messages, signup rollback, key preservation, and enrollment challenge consumption.
- [x] Use one trip-settings UPDATE in `apps/api/src/server-trip-settings.ts`.
  - Evidence: focused PostgreSQL tests passed archive, restore, and permission updates; both permission values preserve the exact microsecond-precision archive timestamp.
- [x] Remove the unreachable final payment cleanup in `apps/api/src/server-participant-merge.ts`.
  - Evidence: the PostgreSQL merge test removes both internal payment directions and verifies exact surviving payment IDs, directions, currencies, and amounts.
- [x] Replace local timestamp converters with `iso` from `apps/api/src/server-support.ts`.
  - Evidence: Date, UTC-string, offset-string, and invalid-date cases pass; the support, device-auth, and personal-token suites passed all 13 tests against the disposable database.
- [x] Reuse the participant-name map in `packages/core/src/csv.ts`.
  - Evidence: focused CSV tests passed exact mixed multi-expense output, split and row order, escaping, unknown names, partial shares, repeated exports, and input immutability.
- [x] Add a Changeset for the affected core, API, and Web packages.
  - Evidence: `.changeset/ninety-otters-win.md` records patch releases for only those three packages and describes all seven simplifications.
- [x] Run the complete repository check with the disposable database and focused browser workflows.
  - Evidence: `npm run check` passed Biome, TypeScript, all 1,575 tests without skips, and all production builds. Four focused Playwright workflows passed with a separate fresh database, isolated ports, one worker, and no retries.
- [x] Review the final diff, update this plan with evidence, and remove temporary validation resources.
  - Evidence: final review found no actionable issues; diff checks pass; only the intended source, tests, Changeset, and plan are included. The task-owned PostgreSQL container and its volume were removed, and both browser server ports were released.
- [ ] Commit the intended paths, push the topic branch, and open a pull request against `main`.
  - Acceptance: the pull request describes the overall result, lists validation evidence, and links this plan.

## Validation

Run commands from the repository root. Use only the disposable test database for commands that need `DATABASE_URL`.

1. Run targeted core, Web component, and API regression tests after implementation.
2. Run `npm run check` with `DATABASE_URL` set to the disposable instance.
3. Run focused Playwright workflows with a separate fresh database and isolated API and Web ports.
4. Run `git diff --check` and inspect the staged diff before committing.

Do not treat skipped database tests as a successful persistence check. Do not change assertions or timeouts to hide a failure.

## Validation evidence

| Check | Result |
| --- | --- |
| Focused core calculation and CSV tests | 31 passed |
| Focused workspace component tests | 20 passed |
| Focused PostgreSQL API tests | 33 passed |
| `npm run check` with disposable PostgreSQL | Passed: Biome, TypeScript, 1,575 tests, and all production builds |
| Focused Playwright workflows | 4 passed with one worker and no retries |

The browser run covered group copy, archived-group controls and dialog focus, settings previews, and group creation with expense entry and deletion. The full API run passed all 348 tests, including migrations, passkeys, tokens, archive precision, participant merge, and trip-lock behavior. The Web run passed all 932 tests.

The production Web build emitted the existing large-chunk warning. No assertion, timeout, migration, public API, or runtime configuration was changed.

## Completion Checklist

- [x] All seven findings have focused implementations and regression coverage.
- [x] Required validation passes, including the affected database paths.
- [x] Money, transaction, archive, merge, navigation, timestamp, and CSV behavior remains covered.
- [x] The Changeset and this requested plan are included; unrelated files and runtime artifacts are excluded.
- [ ] Temporary validation resources are removed and the pull request is open.

## Rollback / Recovery

No migration or data-format change is required. Revert the implementation commit and redeploy the prior compatible build if a regression occurs. Do not restore or rewrite application data to reverse these refactors.
