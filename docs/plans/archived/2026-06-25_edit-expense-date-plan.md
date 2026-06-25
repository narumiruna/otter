## Goal

讓使用者能修正支出日期輸入錯誤，不必刪除重建支出才能修正旅行消費時間軸。

## Context

支出建立時已能輸入日期，列表也會顯示日期，但建立後不能修改。沿用既有支出 `PATCH` API 和原生 `prompt()` 編輯流程即可補齊，不需要新 modal 或後端 endpoint。

## Non-Goals

- 不改支出排序規則；仍維持現有資料庫排序與列表倒序顯示。
- 不新增自訂日期選擇器。

## Plan

- [x] Extend `PATCH /api/trips/:tripId/expenses/:expenseId` in `src/server.ts` to optionally update `expense_date` after validating `YYYY-MM-DD`; verified with DB-backed API test.
- [x] Add an edit-date button in `src/client/main.ts` expense rows using native `prompt()` prefilled from the current date; verified with `npm run typecheck` and build.
- [x] Extend `src/server.test.ts` to update date, reject malformed dates, and keep cross-account updates rejected; verified with `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test`.
- [x] Update README feature list and `docs/progress-log.md`; verified by reading both files.
- [x] Run full QA and compose smoke; verified with `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Date values can drift if parsed as local time; mitigated by validating and storing the `YYYY-MM-DD` string directly.

## Completion Checklist

- [x] A signed-in user can edit expense date only for expenses in their own trip, verified by DB-backed API test.
- [x] Malformed date edits are rejected, verified by DB-backed API test.
- [x] Browser UI exposes date editing and refreshes the visible expense list, verified by source review plus build/typecheck.
- [x] README and progress log mention the completed change, verified by reading both files.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
