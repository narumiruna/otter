## Goal

讓 client `api()` helper 在 `fetch` 本身失敗時丟出穩定、可讀的 app 錯誤訊息，而不是把瀏覽器或 Node 的原始 fetch exception 顯示給使用者。

## Context

上一輪已處理非 JSON 錯誤 response；但如果網路中斷、dev server 尚未就緒或代理連線失敗，`fetch` 會在有 response 前直接 reject，目前 UI 會顯示原始錯誤文字。

## Non-Goals

- 不新增 retry/backoff 或離線模式。
- 不改變成功 response 或 JSON error response 行為。

## Plan

- [x] Wrap the `fetch` call in `src/client/client-support.ts` and throw a stable localized message on request failure; verified with a focused unit test.
- [x] Add `src/client/client-support.test.ts` coverage for rejected `fetch`; verified with `npm test -- src/client/client-support.test.ts`.
- [x] Update `docs/progress-log.md`; verified by reading the file.
- [x] Run full QA and compose smoke; verified with `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Masking fetch exceptions loses low-level debugging detail in the UI; accepted for users because console/dev tools remain available.

## Completion Checklist

- [x] Rejected `fetch` calls throw `連線失敗，請稍後再試`, verified by `src/client/client-support.test.ts`.
- [x] Existing JSON and non-JSON response tests still pass, verified by `npm test -- src/client/client-support.test.ts`.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
