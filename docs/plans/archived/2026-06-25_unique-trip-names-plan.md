## Goal

避免同一帳號下出現重複旅行名稱，讓旅行列表、CSV 檔名與後續匯出更容易辨識。

## Context

參與者名稱已避免同一旅行內重複，但旅行/群組名稱仍可重複。重複旅行名稱會讓側邊列表與匯出檔名混淆；用現有 API 驗證即可阻止新的重複名稱，不需要資料庫 migration。

## Non-Goals

- 不處理既有資料中已存在的重複旅行名稱。
- 不新增 archive/folder 管理流程。

## Plan

- [x] Add owner-scoped duplicate trip-name detection for create and rename in `src/server.ts`/support helpers, excluding the trip being renamed; verified with DB-backed API tests.
- [x] Extend `src/server.auth.test.ts` to reject duplicate trip create and rename while preserving cross-account 404 behavior; verified with `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test`.
- [x] Update README feature list and `docs/progress-log.md`; verified by reading both files.
- [x] Run full QA and compose smoke; verified with `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Case-insensitive duplicate checks may reject names users consider distinct only by capitalization; accepted because identical-looking trip names are confusing in lists and exports.

## Completion Checklist

- [x] Creating a duplicate trip name for the same account is rejected, verified by DB-backed API test.
- [x] Renaming a trip to another owned trip's name is rejected, verified by DB-backed API test.
- [x] Cross-account trip rename/delete behavior remains owner-scoped, verified by DB-backed API test.
- [x] README and progress log mention the completed change, verified by reading both files.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
