## Goal

讓 client `api()` helper 在伺服器或代理回傳非 JSON 錯誤時，顯示穩定的「Request failed」錯誤，而不是把 JSON parse exception 暴露給使用者。

## Context

`src/client/client-support.ts` 目前無條件呼叫 `response.json()`。如果 `/api` 請求遇到 HTML/text 錯誤頁，UI 會顯示 parse error，降低除錯與使用體驗。

## Non-Goals

- 不改變正常 JSON API response 的資料形狀。
- 不新增 retry、全域錯誤分類或新依賴。

## Plan

- [x] Update `api()` in `src/client/client-support.ts` to tolerate non-JSON bodies on failed responses while preserving JSON `{ error }` messages; verified with focused unit tests.
- [x] Add `src/client/client-support.test.ts` coverage for non-JSON failed responses; verified with `npm test -- src/client/client-support.test.ts`.
- [x] Update `docs/progress-log.md`; verified by reading the file.
- [x] Run full QA and compose smoke; verified with `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Accidentally swallowing successful JSON payloads would break the UI; mitigated with TypeScript and existing app build/tests.

## Completion Checklist

- [x] Non-JSON failed responses throw `Request failed`, verified by `src/client/client-support.test.ts`.
- [x] JSON failed responses still use the server `error` message, verified by `src/client/client-support.test.ts`.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
