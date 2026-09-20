# Personal API Tokens Plan

## Goal

Let a signed-in user create, view, copy, and revoke a personal API token from account settings, then use that token through `OTTER_TOKEN` with the Otter CLI.

## Context

- Otter already authenticates CLI requests with hashed, 90-day Bearer tokens issued by device authorization.
- `api_tokens` already stores token ID, user, hash, name, creation time, expiry, and revocation time.
- Token administration must require a browser session so an API token cannot mint or manage other credentials.
- The plaintext token must be returned once at creation and never stored by the server.

## Architecture

- Add browser-session-only token collection routes for listing active tokens, creating a named 90-day token, and revoking a token by ID.
- Reuse the existing `otter_api_` generator, SHA-256 hashing, and `api_tokens` table; no migration is required.
- Add shared response types in `packages/contracts`.
- Add an account-settings component that manages token metadata and shows a newly created secret once with copy instructions for `OTTER_TOKEN`.
- Keep device login and `DELETE /api/auth/tokens/current` behavior unchanged.

## Non-Goals

- Token scopes or per-trip permissions.
- Non-expiring tokens.
- Persisting a manually generated token into the CLI credential file.
- Showing a token again after the one-time creation response.

## Plan

- [x] Inspect existing device authorization, API token storage, CLI authentication, account settings, and tests; evidence: migration 013 and the current server/CLI/web implementations all support hashed Bearer tokens but no personal-token management UI.
- [x] Define personal-token contracts and browser-session-only API routes; accept named tokens, return plaintext only on creation, and expose active metadata.
- [x] Add API integration coverage for authentication boundaries, validation, hashing, token use, listing, and revocation.
- [x] Add account-settings token management UI with one-time secret display, copy action, active-token list, expiry, and revocation.
- [x] Add component coverage for loading, creation, one-time secret handling, copying, and revocation.
- [x] Document the browser-generated-token workflow and CLI `OTTER_TOKEN` usage.
- [x] Run formatting, type checking, relevant tests, build, and repository checks; evidence: `npm run check` passes. PostgreSQL-backed suites are skipped when `DATABASE_URL` is unset.

## Risks

- A plaintext token exposed after creation cannot be recovered; the UI must explicitly say it is shown once.
- Browser-session enforcement is required on every management route to prevent credential escalation from a stolen API token.
- Existing device-issued tokens share the table and will appear in the active-token list; names and expiry dates must make them understandable and revocable.

## Completion Checklist

- [x] A signed-in browser session has routes to create and immediately use a named API token, covered by a PostgreSQL integration test.
- [x] Token creation inserts only the SHA-256 hash, covered by a PostgreSQL integration assertion.
- [x] All management routes use browser-session middleware, and integration coverage rejects Bearer-only list, create, and revoke requests.
- [x] The active-token query includes both device-issued and personal tokens and supports revocation by owned token ID.
- [x] Account settings clearly explains expiry, one-time visibility, revocation, and `OTTER_TOKEN` usage; component tests pass.
- [x] `npm run check` passes, including Biome, type checking, non-DB tests, and production builds.
- [ ] Run `apps/api/src/server.personal-api-tokens.test.ts` against PostgreSQL; unavailable because `DATABASE_URL` is unset and Docker is not installed in this environment.

## Rollback / Recovery

No schema migration is needed. Roll back the route registration, contracts, UI component, tests, and documentation together. Existing device-issued tokens and CLI device login remain valid because their storage and authentication format are unchanged.
