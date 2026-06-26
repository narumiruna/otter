## Goal

讓支出紀錄列表依支出日期由新到舊顯示，日期相同時再用建立時間與 id 穩定排序。

## Context

支出已支援 `expenseDate`，但目前 `src/client/views.ts` 仍用建立順序反轉顯示。使用者補登或修改日期後，列表可能不符合旅行時間順序。

## Non-Goals

- 不改變後端資料載入順序或 CSV 匯出順序。
- 不改變結算計算或 expense data model。

## Plan

- [x] Update `expenseList` in `src/client/views.ts` to sort by `expenseDate` descending, then `createdAt` descending, then `id` descending; verified with `npm run typecheck`.
- [x] Extend `src/client/views.test.ts` to assert newer expense dates render before older dates even when array order differs; verified with `npm test -- src/client/views.test.ts`.
- [x] Update `docs/progress-log.md`; verified by reading the file.
- [x] Run full QA and compose smoke; verified with `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Users who expected creation order will see a changed order; accepted because the visible date is now the primary timeline field.

## Completion Checklist

- [x] Expense list sorting uses `expenseDate`, `createdAt`, and `id` descending, verified by reading `src/client/views.ts`.
- [x] A view test fails if an older-dated expense renders before a newer-dated expense, verified by reading `src/client/views.test.ts`.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
