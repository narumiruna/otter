## Goal

讓使用者能刪除誤建的支出，並立即看到支出清單、餘額、結清建議與旅行摘要更新。

## Context

目前 app 可以新增支出，但如果金額或分帳人選錯，只能重新建立旅行。Postgres schema 已有 `expenses` 與 `expense_participants` 的 cascade delete，足以支援最小刪除流程。

## Non-Goals

- 不新增編輯支出；先用刪除後重建覆蓋錯誤修正情境。
- 不新增軟刪除或復原；目前沒有稽核需求。

## Plan

- [x] Add `DELETE /api/trips/:tripId/expenses/:expenseId` in `src/server.ts` to delete only expenses in trips owned by the current user and return the existing trip payload; verified with `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test`.
- [x] Add a delete button in `src/client/main.ts` expense records and wire it to the new endpoint; verified with `npm run typecheck` and `npm run check`.
- [x] Extend `src/server.test.ts` to create, delete, and reload an expense against Postgres; verified with `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test`.
- [x] Run the full gate and compose smoke test; verified with `npm run check` and `docker compose -f compose.dev.yml up --build -d` plus `curl http://127.0.0.1:3000/api/me`.

## Risks

- Accidental cross-trip deletion would be data loss; mitigated by loading the owner trip first and deleting by both trip id and expense id.

## Completion Checklist

- [x] Owned users can delete their expense and receive updated `trip`, `balances`, and `settlements`, verified by DB-backed API test.
- [x] Browser UI exposes deletion from each expense row, verified by source review and build/typecheck.
- [x] Existing quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by `curl http://127.0.0.1:3000/api/me`.
