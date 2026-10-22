# Remove shared-port blocking from OpenAI OAuth

## Goal

Prevent one account's pending provider login from blocking another account through the shared callback port `127.0.0.1:1455`.

This document tracks the fix for PR #149 at commit `1a6baf9`. The follow-up user request authorizes implementation and a separate pull request. Deployment and live provider requests remain out of scope. Tasks remain open until their acceptance checks pass.

## Context

- `apps/api/src/server-ai-providers.ts` advertises OpenAI OAuth and calls the provider's SDK login method.
- `apps/api/src/server-ai-logins.ts` permits account-owned pending logins for up to ten minutes. Its state limits do not isolate callback ports.
- The installed `@earendil-works/pi-ai` version is `1.4.0`.
  - `dist/auth/oauth/openai-chatgpt.js` binds port 1455 before it exposes a manual-input prompt. A second login fails when that port is occupied.
  - `dist/auth/types.d.ts` exposes no option to disable this listener in `LoginOptions`.
  - `dist/auth/oauth/openai-codex.js` supports `device_code`, which does not start a callback listener. Its `browser` choice can occupy port 1455.
- The security review reproduced the SDK port conflict inside an isolated network namespace, without external requests or real credentials. Cancelling the first login released the port.

## Decision

Apply the smallest fix supported by the current SDK:

1. Remove OAuth from the authentication methods offered for provider `openai`.
   - Reject direct `openai` OAuth login requests before the SDK starts.
   - Keep OpenAI API-key login, stored credentials, and model preferences unchanged.
2. Keep account sign-in for `openai-codex`, but automatically select the SDK's `device_code` method.
   - Do not expose or fall back to its `browser` method.
   - If the SDK no longer offers the expected device-code choice, fail closed.
   - If the provider rejects device authorization, report a login error. Do not retry with a callback listener.
3. Use the same supported-method policy for catalog output and login dispatch.
   - Retain the existing Radius restriction and other provider checks.

`openai` and `openai-codex` are separate provider IDs. Do not rename, copy, or remap their credentials, models, or saved selections. Device authorization is an alternative connection, not an automatic migration.

A queue, global lock, shorter timeout, or rate limit alone does not remove the shared resource. Do not use these as the fix. Do not copy SDK OAuth protocol code into Otter or assume that another callback port is accepted.

A future restoration of modern OpenAI account sign-in requires a supported SDK flow that does not reserve a shared callback port, plus the isolation tests below. That dependency work is outside this plan.

## Non-Goals

- Do not change logout or session-revocation semantics; that separate review candidate is not part of this finding.
- Do not add AI inference, custom providers, configuration flags, or new environment variables.
- Do not change `ENCRYPTION_KEY`, credential encryption, database schema, or existing records.
- Do not change other providers' authentication flows.

## Plan

- [x] Define one supported-method policy in `apps/api/src/server-ai-providers.ts`. Use it in both `aiAuthMethods` and `loginAiProvider`. Verify that OpenAI offers only `api_key` and that direct OAuth dispatch rejects before calling the SDK.
- [x] Extend `automaticAiChoice` to select `device_code` for OpenAI Codex OAuth. Remove interactive access to the Codex browser choice. Verify that missing or changed SDK options fail closed, with no browser fallback.
- [x] Update API catalog and route tests in `server-ai-settings.test.ts` and `server.ai-auth.test.ts`. Verify that a valid browser session receives HTTP 400 for `{ "provider": "openai", "method": "oauth" }`, no broker login starts, and no credential changes. Keep API-key and account/session isolation tests passing.
- [x] Replace the unsafe-flow expectations in `server-ai-oauth-cleanup.test.ts` with regressions for the supported paths. Use the real installed SDK device-code flow with mocked HTTP responses, not only an injected successful login function. Verify that the flow does not bind port 1455, including error, cancellation, and timeout paths.
- [x] Add a two-account regression through the account APIs. Keep account A's Codex device authorization pending while account B completes its own mocked device authorization. Verify independent login IDs, device codes, cancellation, and credential ownership. Repeat with port 1455 already occupied by an isolated fixture; neither account may depend on that port. Preserve the bounded broker limits.
- [ ] Add browser/component coverage for the method-first provider list. Verify that OpenAI is absent from account sign-in, remains available for API-key sign-in, and that Codex presents device-code instructions without a browser-method selector. Verify that existing connections remain listed and can be disconnected.
- [x] Update `docs/ai-settings.md`, including its current OpenAI OAuth request example and provider restrictions. State the supported methods, lack of automatic credential migration, and no browser fallback. Update the existing Changeset for PR #149 to describe the restriction.
- [ ] Run the validation below. Record command results and blockers in this plan. Do not mark the finding resolved until all completion checks pass.

## Validation

Run target-controlled checks only in an approved OS-enforced sandbox. The user approved GitHub Actions for verification after the local Linux dependency blocker. Trusted preparation on a fresh GitHub-hosted runner may download lockfile dependencies and the Node, PostgreSQL, and matching Playwright images. Use `npm ci --ignore-scripts` for preparation, do not supply provider secrets, and disable persisted checkout credentials. Application code and tests still run only inside the offline sandbox:

- Block external network access. Use an isolated loopback namespace for the API, dummy PostgreSQL, and the port-occupation fixture; do not use the host's port 1455.
- Start with an empty environment and an explicit allowlist of safe values. Place `HOME`, caches, and temporary files inside assigned scratch storage.
- Keep the target and toolchain read-only. If a build needs source-adjacent writes, use a disposable source copy inside assigned scratch storage. Do not expose host credentials, sockets, home directories, or shared services.
- Set explicit low CPU, memory, process, file-size, disk, and wall-clock limits. Mount the prepared tools and dependencies read-only; do not install or fetch dependencies during sandbox execution.
- Mock provider HTTP responses and use dummy accounts, keys, tokens, and device codes. Unexpected provider requests must fail the test. Do not exercise live OAuth or paid APIs.
- If these controls are unavailable, record the exact blocker and leave the relevant checks open.

Required checks inside that sandbox:

- Targeted API provider, broker, authentication, and SDK regression tests.
- Relevant web component tests and `npm run test:e2e -- ai-settings.spec.ts`.
- `npm run check` with disposable PostgreSQL so database suites do not skip.
- An independent review of the supported-method policy and actual SDK device-code path.

## Rollback / Recovery

No database migration or credential rewrite is required. Existing encrypted credentials remain intact.

Deploy the corrected API and web build together. Restart all API instances to cancel any old pending SDK login and release its listener. Do not run an older API instance alongside the fixed version.

Do not roll back to a version that re-enables fixed-port OAuth. If device authorization is unavailable, keep the restricted methods and use API-key sign-in until a safe flow is available. Never delete existing credentials or regenerate the encryption key as a recovery action.

## Execution Status

- Working branch: `narumi/fix/openai-oauth-isolation`, based on the still-open PR #149 branch `narumi/feat/pi-ai-account-settings`.
- The provider policy, API/SDK/two-account tests, browser/component regressions, documentation, and existing Changeset have been edited. Browser runtime acceptance is not complete.
- A local Node 26 Docker sandbox used an isolated network namespace with no external network, an empty allowlisted environment, read-only source/dependencies/toolchain, and a disposable writable source copy under scratch storage. Limits were 2 CPUs, 1 GiB memory with no extra swap, 96 processes, 256 file descriptors, 10 MiB per file, bounded scratch tmpfs storage, and an external wall-clock watchdog.
  - The allowlist contained only scratch-local `HOME`, `TMPDIR`, `XDG_CACHE_HOME`, and npm cache paths; a fixed tool `PATH`; offline npm settings; and thread-count limits.
- Passed inside that sandbox: `npm run typecheck` for all workspaces and `npm run biome:ci` (422 files). A test-fixture type error found by the first type check was corrected before the passing run. Later fixture corrections from the independent review still require a fresh check.
- Historical local blocker: the first targeted Vitest command failed at startup because the Linux Rolldown binding is absent. No test result is claimed from that command. GitHub Actions subsequently resolved the dependency blocker.
  - Locally installed dependencies contain macOS bindings. Matching Linux packages have not been found for Rolldown `1.2.13`, Tailwind Oxide `4.3.3`, and Lightning CSS `1.32.0`.
  - Linux Biome `2.5.15` and TypeScript `7.0.2` were available in existing local images. No dependency was installed or fetched, and no target code ran on the host.
- Independent source review found no production policy or SDK-flow defect. It found two inaccurate browser-test fixtures: Codex was incorrectly offered with API-key authentication, and disconnect did not clear the selected provider's preferences. Both fixtures and their expectations have been corrected; the separate pre-disconnect preservation checks remain. The corrected component tests passed in Actions.
- The user approved GitHub Actions to resolve the dependency blocker. The manual E2E workflow now has an `isolated_ai_settings` verification job that runs the repository checks, focused API/component suites, migrations, and AI settings browser tests with dummy PostgreSQL in an offline Docker network namespace.
  - Dependencies are prepared with lifecycle scripts disabled. Tests receive an empty allowlisted environment and read-only inputs/tools; all writes remain in bounded scratch tmpfs storage.
  - Runtime limits are 2 CPUs, 3 GiB memory without extra swap, 256 processes, 1,024 file descriptors, 128 MiB per file, bounded tmpfs storage, and a 15-minute external watchdog. PostgreSQL has separate lower resource limits and shares only isolated loopback.
- GitHub Actions run [39771900108](https://github.com/narumiruna/otter/actions/runs/39771900108), commit `a881555`, passed `npm run check` with PostgreSQL: 1,406 tests, all type checks, Biome, and all builds. Focused API/SDK suites passed 60 tests and focused component suites passed 32 tests; migrations passed.
  - Earlier runs failed before application checks because the PostgreSQL image required a writable private socket directory. The workflow now provides a bounded private tmpfs mount for that socket.
  - Browser tests ran but all nine failed because the expected connection controls were absent. The failure snapshots in run [39773125024](https://github.com/narumiruna/otter/actions/runs/39773125024) confirm that loopback-only Chromium reported offline state. Playwright's offline toggle did not override the physical network state. The fixture now supplies `navigator.onLine = true` before application startup for these mocked successful API workflows; the OS network isolation remains unchanged. Run [39774506622](https://github.com/narumiruna/otter/actions/runs/39774506622) reached the final assertion in the first complete browser workflow, including reload and accessibility checks. It failed only because the existing Google Fonts stylesheet was counted as an unexpected external request. The fixture now fulfills that exact stylesheet URL locally with empty CSS; all other external requests still abort and fail. A fresh run must verify all nine browser workflows.
- The final independent static review found no production policy, real SDK flow, ownership, cancellation, timeout, or fixture defect. The workflow review found a missing writable Vitest cache mount, which is now provided as bounded scratch tmpfs.
- Validation commits and branch pushes are required to run GitHub Actions. Local pre-commit target execution will be skipped; the same repository checks must pass in Actions before completion or a ready-for-review PR. Do not mark the plan complete or claim the finding resolved before the remaining checks pass.

## Completion Checklist

- [x] OpenAI OAuth is neither advertised nor accepted by the account API or direct provider adapter.
- [x] OpenAI Codex OAuth uses only device authorization and never falls back to a callback listener.
- [x] Account B can finish supported account sign-in while account A remains pending, including when the isolated fixture holds port 1455.
- [x] New API-key connections, existing credentials, saved preferences, cancellation, and account/session isolation pass regression tests.
- [ ] Targeted checks, PostgreSQL-backed repository checks, browser coverage, and independent review pass; any unavailable check remains open.
- [ ] Documentation and the Changeset match the implemented behavior. PR #149 records the finding, fix, test evidence, and deployment restart requirement.
