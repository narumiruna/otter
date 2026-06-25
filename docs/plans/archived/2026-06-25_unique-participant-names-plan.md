## Goal

避免同一趟旅行出現重複參與者名稱，降低使用者選錯付款人或分帳人的機率。

## Context

參與者可以新增與重新命名，但目前可建立同名參與者。重複名稱會讓支出編輯與 CSV/結算結果難以辨識；比起之後做高風險的參與者合併，先阻止新的重複名稱更安全。

## Non-Goals

- 不處理既有資料中已存在的重複參與者。
- 不實作參與者合併或資料改寫流程。

## Plan

- [x] Add participant-name duplicate detection for create and rename in `src/server.ts`/support helpers, excluding the participant being renamed; verified with DB-backed API tests.
- [x] Extend `src/server.expenses.test.ts` to reject duplicate participant create and rename while preserving owner-scoped 404 behavior; verified with `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test`.
- [x] Update README feature list and `docs/progress-log.md`; verified by reading both files.
- [x] Run full QA and compose smoke; verified with `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Case-insensitive duplicate checks may reject names users consider distinct only by capitalization; accepted because identical display names are confusing in split selection.

## Completion Checklist

- [x] Creating a duplicate participant name is rejected, verified by DB-backed API test.
- [x] Renaming to another participant's name is rejected, verified by DB-backed API test.
- [x] Cross-account participant rename/delete behavior remains owner-scoped, verified by DB-backed API test.
- [x] README and progress log mention the completed change, verified by reading both files.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
