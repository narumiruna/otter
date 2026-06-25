## Goal

允許使用者在建立旅行後修正基準貨幣，讓餘額與結清建議能改用正確貨幣計算。

## Context

目前旅行建立時可選基準貨幣，但之後只能重新命名旅行。若使用者一開始選錯基準貨幣，所有餘額與結清建議都會用錯貨幣顯示。現有 `PATCH /api/trips/:tripId` 可安全擴充，不需要資料庫 migration。

## Non-Goals

- 不修改個別支出的原始貨幣或金額。
- 不新增自訂匯率或即時匯率。

## Plan

- [x] Extend `PATCH /api/trips/:tripId` to accept optional `baseCurrency` while preserving rename behavior and owner-scoped 404s; verified with DB-backed API tests.
- [x] Add a browser control that prompts for one of the existing currency options and PATCHes the selected trip; verified with TypeScript/build and smoke test.
- [x] Update README and `docs/progress-log.md`; verified by reading both files.
- [x] Run full QA and compose smoke; verified with `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test`, `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Changing base currency recalculates balances using prototype fixed rates; accepted because the app already documents fixed-rate prototype behavior.

## Completion Checklist

- [x] Trip base currency can be updated by the owner, verified by DB-backed API test.
- [x] Invalid base currencies are rejected, verified by DB-backed API test.
- [x] Cross-account base-currency edits remain 404, verified by DB-backed API test.
- [x] Browser UI exposes the edit action without adding dependencies, verified by build/smoke test.
- [x] README and progress log mention the completed change, verified by reading both files.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
