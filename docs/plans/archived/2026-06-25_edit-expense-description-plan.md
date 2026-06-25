## Goal

讓使用者能修正支出描述的錯字或錯誤標籤，不必刪掉整筆支出後重建。

## Context

目前支出可以新增與刪除，但不能改描述；錯字會留在支出紀錄中。只改描述不影響金額、付款人、分帳、餘額或結清建議，是比完整支出編輯更安全的第一步。

## Non-Goals

- 不編輯金額、貨幣、付款人或分帳參與者；那些會改動餘額，另開更完整表單。
- 不新增彈窗元件；沿用原生 `prompt()`，避免新依賴與 UI 複雜度。

## Plan

- [x] Add `PATCH /api/trips/:tripId/expenses/:expenseId` in `src/server.ts` to update only description for expenses in trips owned by the current user and return the existing trip payload; verified with DB-backed API test.
- [x] Add an edit-description button in `src/client/main.ts` expense rows using native `prompt()` and refresh selected trip; verified with `npm run typecheck` and build.
- [x] Extend `src/server.test.ts` to rename an expense description and reject cross-account edits; verified with `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test`.
- [x] Update README feature list and `docs/progress-log.md`; verified by reading both files.
- [x] Run full QA and compose smoke; verified with `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Cross-account edits would corrupt data; mitigated with owner-trip loading and `WHERE trip_id = $1 AND id = $2`.

## Completion Checklist

- [x] A signed-in user can edit descriptions only for expenses in their own trip, verified by DB-backed API test.
- [x] Browser UI exposes description editing and refreshes the visible expense list, verified by source review plus build/typecheck.
- [x] README and progress log mention the completed change, verified by reading both files.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
