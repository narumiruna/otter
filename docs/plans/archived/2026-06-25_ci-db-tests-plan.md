## Goal

讓 GitHub Actions CI 執行 PostgreSQL-backed API tests，避免資料庫整合錯誤因為缺少 `TEST_DATABASE_URL` 而被跳過。

## Context

目前 CI 只執行 `npm run check`，但沒有啟動 Postgres，也沒有設定 `TEST_DATABASE_URL`。因此 DB-backed auth/trip/expense tests 在 CI 中會 skip，只能靠本機手動執行。

## Non-Goals

- 不改測試框架或拆分 CI job。
- 不新增 production database 或 secret。

## Plan

- [x] Add a Postgres service and test database environment to `.github/workflows/ci.yml`; verified by reviewing the workflow and matching `compose.dev.yml` credentials/image.
- [x] Run migrations before `npm run check` in CI so DB-backed tests have schema; verified with local equivalent `DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm run migrate`.
- [x] Run local CI-equivalent check with `TEST_DATABASE_URL=... npm run check`; verified DB-backed tests were not skipped.
- [x] Update `docs/progress-log.md`; verified by reading the file.

## Risks

- CI may take slightly longer because Postgres starts and DB-backed tests run; accepted because it catches higher-impact API regressions.

## Completion Checklist

- [x] CI workflow defines a healthy Postgres service, verified by reading `.github/workflows/ci.yml`.
- [x] CI runs migrations before checks, verified by reading `.github/workflows/ci.yml`.
- [x] DB-backed tests run under the same URL shape locally, verified by `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm run check` showing no skipped DB tests.
- [x] Progress log mentions the completed change, verified by reading `docs/progress-log.md`.
