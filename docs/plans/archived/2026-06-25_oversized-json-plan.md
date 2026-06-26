## Goal

讓 API 收到超過 JSON body limit 的 request 時回傳 413，而不是落入通用 500 server error。

## Context

`express.json({ limit: "1mb" })` 會在 body 過大時丟出 body-parser `entity.too.large` error。Malformed JSON 已改成 400；oversized JSON 也屬於信任邊界輸入錯誤，應回傳可預期的 413。

## Non-Goals

- 不改變現有 1MB body limit。
- 不新增 rate limiting 或 request logging。

## Plan

- [x] Extend the narrow body-parser error handling in `src/server.ts` to return `413 請求內容太大`; verified with DB-backed API test.
- [x] Add an integration test that sends a JSON body larger than 1MB and expects 413 JSON error; verified with `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test`.
- [x] Update `docs/progress-log.md`; verified by reading the file.
- [x] Run full QA and compose smoke; verified with `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm run check`, `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Error detection must stay narrow so unrelated server errors still return 500; mitigated by checking the body-parser error status/type.

## Completion Checklist

- [x] Oversized JSON receives HTTP 413 with a JSON error body, verified by integration test.
- [x] Existing API tests still pass with the database enabled, verified by `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test`.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
