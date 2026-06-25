## Goal

把 otter 從本機 JSON 檔案持久化改成 PostgreSQL，保留現有 API 行為、登入 session、旅行、參與者、支出、餘額與結清建議功能；完成後 `npm run check` 通過，dev 環境可用 Docker Compose 啟動 app + Postgres。

## Context

目前 `src/server.ts` 在啟動時讀 `data/otter.json` 到記憶體，寫入時整包 JSON 存回檔案。這適合原型，但 production 需要可靠 DB、migration、備份與部署時可重跑的 schema 初始化。

## Tech Stack

- DB：PostgreSQL。
- Driver：`pg`，不加 Prisma/Drizzle。
- Migration：raw SQL files under `db/migrations/` + 一個小型 TypeScript runner。
- Config：`DATABASE_URL`；保留 `COOKIE_SECURE`、`PORT` 等既有 env。

## Non-Goals

- 不導入 ORM 或 repository/service 抽象層。
- 不做既有 `data/otter.json` 自動匯入；若需要，另開一次性 import script。
- 不改拆帳演算法；繼續使用 `src/shared/settlement.ts`。

## Assumptions

- 目前沒有 production JSON 資料需要遷移。
- 初期 production 是單一 app 連一個 Postgres database。
- ID 可沿用目前的 string prefix + UUID 格式，不必改成 DB-generated UUID。

## Plan

- [ ] Add Postgres dependencies to `package.json` (`pg` and `@types/pg`) and install them; verify with `npm install` updating `package-lock.json` and `npm run typecheck` reaching dependency resolution.
- [ ] Add `db/migrations/001_init.sql` with tables `users`, `sessions`, `trips`, `participants`, `expenses`, `expense_participants`, plus `schema_migrations`; verify by reviewing SQL constraints for primary keys, foreign keys, `email` uniqueness, participant membership joins, and `amount_minor > 0`.
- [ ] Add `scripts/migrate.ts` to read `DATABASE_URL`, acquire a migration lock, apply pending `db/migrations/*.sql` inside transactions, and record versions in `schema_migrations`; verify with a local Postgres container and `npm run migrate` applying `001_init.sql` once, then no-oping on the second run.
- [ ] Add npm scripts `migrate`, `db:reset:dev` if needed, and update `.pre-commit-config.yaml` only if the aggregate check changes; verify with `npm run migrate -- --help` or runner usage output and `npm run check`.
- [ ] Update `compose.dev.yml` with a `postgres` service, `DATABASE_URL` for `otter-dev`, a healthcheck, and a named volume; verify with `docker compose -f compose.dev.yml up --build` reaching a healthy DB and app startup.
- [ ] Update production `compose.yml` to require `DATABASE_URL` or include a Postgres service only if this repo owns production DB hosting; verify by running `docker compose -f compose.yml config` without exposing secrets.
- [ ] Replace the in-memory JSON `Store` in `src/server.ts` with `pg` queries using a shared pool; verify existing API endpoints still return the same response shapes by running focused Node tests or manual curl flow for register, login, create trip, add participant, add expense, get trip.
- [ ] Keep settlement calculation in shared TypeScript by loading a trip graph from Postgres into the existing `Trip` type; verify `npm test` keeps `src/shared/settlement.test.ts` green and an API trip response includes `balances` and `settlements`.
- [ ] Add minimal DB-backed integration tests for auth + trip creation using a disposable test database or transaction reset; verify with `npm test` and no committed test data.
- [ ] Update `README.md` and `AGENTS.md` with `DATABASE_URL`, migration command, dev compose usage, and no-JSON-store guidance; verify every documented command exists in `package.json` or compose files.
- [ ] Remove obsolete JSON persistence config from docs and app code (`DATA_DIR`, `DATA_FILE`) only after Postgres paths pass; verify `rg "DATA_DIR|DATA_FILE|otter.json|loadStore|saveStore"` has no stale production guidance.
- [ ] Run the full gate; verify `npm run check` passes.

## Risks

- Raw SQL means less generated TypeScript help; keep SQL small and tested through API flows.
- Migration mistakes can damage production data; always review SQL and run `migrate deploy` equivalent against a disposable DB first.
- Compose production ownership is unknown; avoid baking secrets or local-only DB assumptions into production config.

## Rollback / Recovery

- Before applying production migrations, take a Postgres backup with the hosting provider or `pg_dump`.
- If migration fails before app release, restore the backup and redeploy the previous image.
- If app code fails after migration but schema is compatible, roll back the app image first; only roll back DB from backup if schema changes are destructive.

## Completion Checklist

- [ ] App no longer reads or writes `data/otter.json`, verified by `rg "otter.json|loadStore|saveStore|DATA_FILE" src README.md AGENTS.md` returning no stale runtime path.
- [ ] Database schema is reproducible from an empty Postgres database, verified by `npm run migrate` applying all migrations and a second run no-oping.
- [ ] Dev environment starts app + Postgres, verified by `docker compose -f compose.dev.yml up --build` and opening or curling `http://localhost:3000/api/me`.
- [ ] Existing user/trip/expense behavior works against Postgres, verified by automated tests or a documented curl/manual flow.
- [ ] Full quality gate passes, verified by `npm run check`.
- [ ] README and AGENTS mention Postgres setup and migration commands, verified by reading both files after edits.
