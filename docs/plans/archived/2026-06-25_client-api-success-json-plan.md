## Goal

讓 client `api()` helper 在 HTTP 成功但 response 不是 JSON 時丟出穩定錯誤，避免把 `null` 當成成功 payload 傳進 UI。

## Context

目前 `api()` 已處理 fetch reject 與錯誤 response 的非 JSON body；但如果 server/proxy 誤回 200 HTML/text，`api()` 會回傳 `null as T`，後續 UI 可能產生較難懂的 runtime error。

## Non-Goals

- 不改變正常 JSON 成功 response 行為。
- 不新增 schema validation 或 runtime decoder。

## Plan

- [x] Update `src/client/client-support.ts` so successful non-JSON responses throw `伺服器回應格式錯誤`; verified with a focused unit test.
- [x] Add `src/client/client-support.test.ts` coverage for successful non-JSON responses while keeping existing API error tests passing; verified with `npm test -- src/client/client-support.test.ts`.
- [x] Update `docs/progress-log.md`; verified by reading the file.
- [x] Run full QA and compose smoke; verified with `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Empty 204 responses would now fail, but current `api()` callers expect JSON payloads and backend endpoints return JSON.

## Completion Checklist

- [x] Successful non-JSON responses throw `伺服器回應格式錯誤`, verified by `src/client/client-support.test.ts`.
- [x] Existing fetch failure and failed-response tests still pass, verified by `npm test -- src/client/client-support.test.ts`.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
