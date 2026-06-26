## Goal

讓建立旅行時的基準貨幣驗證與編輯旅行一致：不支援的 `baseCurrency` 回傳 400，而不是默默改成 TWD。

## Context

`PATCH /api/trips/:tripId` 已拒絕 invalid `baseCurrency`，但 `POST /api/trips` 目前會把 invalid 值 fallback 成 TWD。這可能讓手動 API 或壞 client 建立出錯誤基準貨幣的旅行。

## Non-Goals

- 不改變省略 `baseCurrency` 時預設為 TWD 的行為。
- 不新增貨幣種類或匯率設定。

## Plan

- [x] Update trip creation validation in `src/server.ts` to reject provided invalid `baseCurrency` while keeping omitted values defaulting to TWD; verified with DB-backed API test.
- [x] Add an integration test for invalid create-time `baseCurrency`; verified with `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test`.
- [x] Update `docs/progress-log.md`; verified by reading the file.
- [x] Run full QA and compose smoke; verified with `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm run check`, `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Existing hand-written clients that relied on invalid currencies defaulting to TWD will now get 400; accepted because silent currency fallback can produce wrong settlements.

## Completion Checklist

- [x] Invalid trip `baseCurrency` on creation returns 400, verified by integration test.
- [x] Omitted `baseCurrency` still defaults to TWD, verified by integration test.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
