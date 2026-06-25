## Goal

讓使用者能修正支出貨幣選錯的問題，避免只能刪除重建支出才能修正跨幣別餘額。

## Context

支出日期、描述、金額、付款人與分帳參與者都已可修改，貨幣仍不可改。貨幣錯誤會直接影響基準貨幣換算；沿用既有 `PATCH` API 與原生 `prompt()` 即可補齊，不需要新 endpoint。

## Non-Goals

- 不新增自訂貨幣 selector modal。
- 不修改匯率模型；仍使用現有固定原型匯率。

## Plan

- [x] Extend `PATCH /api/trips/:tripId/expenses/:expenseId` in `src/server.ts` to optionally update `currency`, validating supported currencies and preserving the displayed major amount when only currency changes; verified with DB-backed API test.
- [x] Add an edit-currency button in `src/client/main.ts` expense rows using native `prompt()` with numbered currency choices; verified with `npm run typecheck` and build.
- [x] Extend `src/server.expenses.test.ts` and shared test types to assert currency edits update amount minor units, balances, settlements, and cross-account/invalid-currency rejection; verified with `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test`.
- [x] Update README feature list and `docs/progress-log.md`; verified by reading both files.
- [x] Run full QA and compose smoke; verified with `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Currency edits can change conversion results dramatically; mitigated by preserving the visible major amount and asserting converted balances/settlements in DB-backed tests.

## Completion Checklist

- [x] A signed-in user can edit expense currency only for expenses in their own trip, verified by DB-backed API test.
- [x] Invalid currencies are rejected, verified by DB-backed API test.
- [x] Currency edits update balances and settlements, verified by DB-backed API test.
- [x] Browser UI exposes currency editing and refreshes the visible expense list, verified by source review plus build/typecheck.
- [x] README and progress log mention the completed change, verified by reading both files.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
