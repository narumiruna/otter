## Goal

讓使用者能修正支出付款人選錯的問題，讓餘額與結清建議回到正確方向。

## Context

目前支出描述與金額可修改，但付款人選錯仍必須刪除重建。付款人錯誤會直接反轉誰應收/應付；只修改付款人、保留金額/貨幣/分帳人，是比完整支出編輯更安全的下一步。

## Non-Goals

- 不修改分帳參與者；多選 UX 與驗證另開下一步。
- 不新增自訂 modal；沿用原生 `prompt()` 選擇參與者編號，避免新依賴。

## Plan

- [x] Extend `PATCH /api/trips/:tripId/expenses/:expenseId` in `src/server.ts` to optionally update `paid_by_id` after validating the new payer is a participant in the owner-scoped trip; verified with DB-backed API test.
- [x] Add an edit-payer button in `src/client/main.ts` expense rows using native `prompt()` with numbered participant choices; verified with `npm run typecheck` and build.
- [x] Extend `src/server.test.ts` to update payer and assert balances/settlements change direction while cross-account updates stay rejected; verified with `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test`.
- [x] Update README feature list and `docs/progress-log.md`; verified by reading both files.
- [x] Run full QA and compose smoke; verified with `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Payer edits affect money results; mitigated by validating participant membership and asserting the new balance/settlement direction in DB-backed tests.

## Completion Checklist

- [x] A signed-in user can edit payer only for expenses in their own trip, verified by DB-backed API test.
- [x] Updated payer changes balances and settlements, verified by DB-backed API test.
- [x] Browser UI exposes payer editing and refreshes the visible expense list, verified by source review plus build/typecheck.
- [x] README and progress log mention the completed change, verified by reading both files.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
