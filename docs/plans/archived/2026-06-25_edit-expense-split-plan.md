## Goal

讓使用者能修正支出分帳參與者選錯的問題，避免只能刪除重建支出才能修正每個人的應收應付。

## Context

支出描述、金額與付款人已可修改。分帳參與者仍不可改，會讓正確金額被分給錯的人；補上這一塊後，常見支出輸入錯誤都能直接修正。

## Non-Goals

- 不修改貨幣；這會牽涉跨幣別金額解讀。
- 不新增自訂多選 modal；沿用原生 `prompt()` 輸入參與者編號，避免 UI 複雜度。

## Plan

- [x] Extend `PATCH /api/trips/:tripId/expenses/:expenseId` in `src/server.ts` to optionally replace split participant rows after validating a non-empty owner-scoped participant set; verified with DB-backed API test.
- [x] Add an edit-split button in `src/client/main.ts` expense rows using native `prompt()` with numbered participant choices and comma-separated selections; verified with `npm run typecheck` and build.
- [x] Extend `src/server.test.ts` to update split participants and assert participant IDs, balances, settlements, and cross-account rejection; verified with `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test`.
- [x] Update README feature list and `docs/progress-log.md`; verified by reading both files.
- [x] Run full QA and compose smoke; verified with `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Replacing split rows can corrupt balances if partial writes occur; mitigated by wrapping the expense update and split-row replacement in one transaction.

## Completion Checklist

- [x] A signed-in user can edit split participants only for expenses in their own trip, verified by DB-backed API test.
- [x] Updated split participants change balances and settlements, verified by DB-backed API test.
- [x] Browser UI exposes split editing and refreshes the visible expense list, verified by source review plus build/typecheck.
- [x] README and progress log mention the completed change, verified by reading both files.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
