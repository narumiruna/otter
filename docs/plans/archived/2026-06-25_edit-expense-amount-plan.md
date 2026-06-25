## Goal

讓使用者能修正支出金額輸入錯誤，避免只能刪除重建支出才能修正餘額。

## Context

目前支出描述可修改，但金額仍不可修改。金額錯誤會直接造成餘額與結清建議錯誤；只修改金額、保留原貨幣/付款人/分帳人，是比完整支出編輯更安全的下一步。

## Non-Goals

- 不修改貨幣、付款人或分帳參與者；那些會增加更多驗證與 UI 狀態。
- 不新增自訂 modal；沿用原生 `prompt()`，避免新依賴。

## Plan

- [x] Extend `PATCH /api/trips/:tripId/expenses/:expenseId` in `src/server.ts` to optionally update `amountMinor` using the existing expense currency while preserving owner scoping; verified with DB-backed API test.
- [x] Add an edit-amount button in `src/client/main.ts` expense rows using native `prompt()` prefilled from the current amount; verified with `npm run typecheck` and build.
- [x] Extend `src/server.test.ts` to update amount and assert balances/settlements change while cross-account updates stay rejected; verified with `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test`.
- [x] Update README feature list and `docs/progress-log.md`; verified by reading both files.
- [x] Run full QA and compose smoke; verified with `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Amount edits affect money results; mitigated by reusing `parseAmountToMinor()` and existing settlement tests plus DB-backed API assertions.

## Completion Checklist

- [x] A signed-in user can edit amount only for expenses in their own trip, verified by DB-backed API test.
- [x] Updated amount changes balances and settlements, verified by DB-backed API test.
- [x] Browser UI exposes amount editing and refreshes the visible expense list, verified by source review plus build/typecheck.
- [x] README and progress log mention the completed change, verified by reading both files.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
