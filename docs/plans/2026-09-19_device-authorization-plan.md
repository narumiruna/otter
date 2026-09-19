# Device authorization for the Otter CLI

## Goal

Replace agent-facing password authentication with a browser-approved device flow and reusable, revocable Bearer tokens.

## Architecture

- The CLI creates a short-lived device authorization and opens Otter's `/device` page.
- A signed-in user enters or reviews the user code and explicitly approves the CLI.
- The CLI polls with a separate high-entropy device secret, receives an access token once, and stores it in a mode-`0600` config file scoped by server URL.
- The server stores only SHA-256 hashes of device secrets and access tokens.
- Existing browser cookie sessions remain unchanged, while data API middleware also accepts unexpired, unrevoked Bearer tokens. Account, passkey, collaborator, share-link, and device-approval administration remains browser-session-only.
- `OTTER_TOKEN` remains available for ephemeral agents and CI without local persistence.

## Security

- Device authorizations expire after 10 minutes and can be consumed once.
- Access tokens expire after 90 days and can revoke themselves through CLI logout.
- The short user code is never sufficient to retrieve a token.
- Remote plaintext HTTP remains blocked by the CLI unless explicitly allowed.

## Non-Goals

- Become a general OAuth identity provider or implement third-party OAuth clients.
- Add refresh tokens, scopes, organization policies, or external social login.
- Remove existing username/password browser login.

## Plan

- [x] Inspect session authentication, API middleware, React bootstrap, migrations, and test setup.
- [x] Add device authorization and API token schema, token authentication helpers, routes, and DB-backed tests; DB-backed coverage was added but could not run locally because `DATABASE_URL` is unset and Docker is unavailable.
- [x] Add the signed-in browser approval page with accessible component tests; static accessibility coverage passes.
- [x] Add CLI `auth login`, token persistence, Bearer requests, logout/revocation, and focused tests; 11 CLI/component tests pass.
- [x] Update the skill and user documentation to remove agent password handling.
- [x] Run formatting, typecheck, tests, build, smoke checks, and diff review; `npm run check`, source/built help, structured error smoke, and `git diff --check` pass.

## Rollback / Recovery

The migration only adds new tables and does not alter sessions or passwords.
Rollback by deploying the previous app, then dropping `device_authorizations` and `api_tokens` if issued CLI credentials no longer need to work.

## Completion Checklist

- [ ] A user can approve a displayed device code from an authenticated Otter browser session; implementation and tests are present, but live DB/browser verification is unavailable locally.
- [x] The CLI uses a persisted or environment-provided Bearer token without receiving the user's password.
- [x] Device secrets and API tokens are never stored in plaintext by the server.
- [ ] Expired, invalid, consumed, and revoked credentials are rejected; DB-backed coverage exists but is skipped without PostgreSQL.
- [ ] Existing cookie authentication continues to pass its tests; non-DB suites pass and DB-backed suites are skipped without PostgreSQL.
- [x] `npm run check` and `git diff --check` pass.
