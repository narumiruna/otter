## Goal

讓支出能記錄並顯示實際發生日，方便旅行後依日期回看消費紀錄。

## Context

目前支出只有建立時間，使用者無法輸入消費日期。使用原生 `<input type="date">` 和 PostgreSQL `date` 欄位即可補上，不需要新依賴或自訂日期選擇器。

## Non-Goals

- 不新增日期編輯流程；本次只處理新增支出時的日期輸入與列表顯示。
- 不改支出排序規則；仍維持現有資料庫排序與列表倒序顯示。

## Plan

- [x] Add a migration for `expenses.expense_date` with a safe default for existing rows; verified with `DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm run migrate` and DB-backed tests.
- [x] Update shared/server expense types and API create/load paths to validate `YYYY-MM-DD`, persist the date, and return it in trip payloads; verified with `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test`.
- [x] Add a native date input to the expense form and show the date in expense rows in `src/client/main.ts`; verified with `npm run typecheck` and build.
- [x] Update README feature list and `docs/progress-log.md`; verified by reading both files.
- [x] Run full QA and compose smoke; verified with `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Date parsing can drift by timezone; mitigated by returning `expense_date::text` from PostgreSQL and displaying the `YYYY-MM-DD` string directly.

## Completion Checklist

- [x] New expenses persist an `expenseDate` and reject malformed dates, verified by DB-backed API test.
- [x] Expense rows display the stored date, verified by source review plus build/typecheck.
- [x] Existing databases migrate without manual data edits, verified by `DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm run migrate`.
- [x] README and progress log mention the completed change, verified by reading both files.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
