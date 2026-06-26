## Goal

讓新增支出時的分帳參與者驗證與編輯支出一致：只要包含不存在或非字串的 participant ID，就回傳 400，而不是默默忽略。

## Context

`PATCH /expenses/:expenseId` 已拒絕 invalid `participantIds`，但 `POST /expenses` 會先過濾掉 invalid IDs。這可能讓壞 client 或手動 API 呼叫建立出和使用者意圖不同的分帳結果。

## Non-Goals

- 不改變合法重複 ID 的去重行為。
- 不改變分帳計算邏輯。

## Plan

- [x] Update expense creation validation in `src/server.ts` to reject invalid split participant IDs while still deduping valid IDs; verified with DB-backed API test.
- [x] Add an integration test for invalid create-time `participantIds`; verified with `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test`.
- [x] Update `docs/progress-log.md`; verified by reading the file.
- [x] Run full QA and compose smoke; verified with `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm run check`, `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Existing hand-written clients that relied on silent filtering will now get 400; accepted because silent partial split creation is a correctness bug.

## Completion Checklist

- [x] Invalid split participant IDs on expense creation return 400, verified by integration test.
- [x] Valid expense creation still succeeds, verified by existing integration test.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
