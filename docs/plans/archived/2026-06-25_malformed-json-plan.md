## Goal

讓 API 收到 malformed JSON request body 時回傳 400，而不是落入通用 500 server error。

## Context

`express.json()` 會在 JSON parse 失敗時丟出 body-parser error。現在通用錯誤處理會把它記成伺服器錯誤並回傳 500；這是信任邊界輸入驗證問題，應回傳可預期的 400。

## Non-Goals

- 不改變合法 JSON request 的驗證規則。
- 不新增 request schema library。

## Plan

- [x] Add a narrow malformed-JSON check in `src/server.ts` error middleware to return `400 JSON 格式錯誤`; verified with DB-backed API test.
- [x] Add an integration test that sends invalid JSON to an API route and expects 400 JSON error; verified with `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test`.
- [x] Update `docs/progress-log.md`; verified by reading the file.
- [x] Run full QA and compose smoke; verified with `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm run check`, `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Error detection must stay narrow so unrelated server errors still return 500; mitigated by checking the parser error status/type.

## Completion Checklist

- [x] Malformed JSON receives HTTP 400 with a JSON error body, verified by integration test.
- [x] Existing API tests still pass with the database enabled, verified by `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test`.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
