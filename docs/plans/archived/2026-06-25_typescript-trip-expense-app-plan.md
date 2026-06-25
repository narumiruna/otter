## Goal

Build a TypeScript web app for trip/friend-group expense tracking with registration/login, multi-currency expenses, balance calculation, settlement suggestions, Docker/Compose files, Biome CI, prek-compatible pre-commit config, and GitHub Actions CI.

## Architecture

Single Node/Express TypeScript app serves the API and Vite-built TypeScript frontend. JSON file storage is used for the early prototype to avoid database setup. Shared TypeScript settlement logic powers the API and tests.

## Assumptions

- Fixed exchange rates are acceptable for the prototype; live FX lookup is out of scope.
- JSON file persistence is acceptable for local/dev/early production use.

## Plan

- [x] Create npm/TypeScript/Vite/Biome project files to support frontend and backend TypeScript; verified with `npm run typecheck` via `npm run check`.
- [x] Implement shared currency and settlement logic for TWD, JPY, USD, and EUR; verified with `npm test` via `npm run check`.
- [x] Implement Express API with registration, login/logout, session cookies, trips, participants, expenses, balances, and settlements persisted to a JSON data file; verified with `npm run check` and a production API smoke test using `node dist/server/server.js` plus `curl`.
- [x] Implement a Vite TypeScript browser UI for auth, trip creation/selection, participants, expenses, balances, and settlement suggestions; verified with `npm run build` via `npm run check` and a production root-page smoke test.
- [x] Add Dockerfile, `compose.yml`, and `compose.dev.yml` for production and development workflows; verified with `docker compose -f compose.yml config` and `docker compose -f compose.dev.yml config`.
- [x] Add `.pre-commit-config.yaml` using local prek/pre-commit hooks and GitHub Actions CI using `npm ci` and `npm run check`; verified config files exist and `npm run check` passes.
- [x] Update README with setup, dev, Docker, CI, and supported currency notes; verified `README.md` commands match `package.json` and compose files.

## Risks

- Fixed exchange rates can become inaccurate; documented in the UI and README as a prototype limitation.
- JSON file storage is not safe for high-concurrency production use; documented in README as prototype storage.

## Completion Checklist

- [x] The TypeScript frontend/backend app exists and builds, verified by `npm run build` via `npm run check`.
- [x] Registration/login and expense APIs are implemented, verified by route code in `src/server.ts`, `npm run check`, and production API smoke test.
- [x] Multi-currency settlement math for TWD, JPY, USD, and EUR is implemented, verified by `npm test` via `npm run check`.
- [x] Docker and Compose workflows exist, verified by `docker compose -f compose.yml config` and `docker compose -f compose.dev.yml config`.
- [x] Biome, prek-compatible pre-commit config, and GitHub Actions CI exist, verified by `biome.json`, `.pre-commit-config.yaml`, `.github/workflows/ci.yml`, and `npm run check`.
- [x] User-facing setup documentation exists, verified by `README.md`.
