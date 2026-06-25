## Goal

把超過 1,000 行的 `src/server.ts` 拆出支援模組，讓後續後端功能變更不用再往單一大檔案加邏輯。

## Context

`src/server.ts` 已超過 repository guideline 的 1,000 行上限。下一批高價值功能（例如支出貨幣修改、參與者合併）都會碰後端，因此先做純重構拆分，降低後續風險。

## Non-Goals

- 不改 API 行為。
- 不新增新架構、依賴或測試框架。

## Plan

- [x] Extract shared server types, auth/session helpers, trip loading, and transaction helpers into `src/server-support.ts`; verified by `npm run typecheck`.
- [x] Keep route registration and app startup in `src/server.ts`, importing the extracted helpers; verified by `npm run typecheck`.
- [x] Confirm `src/server.ts` is below 1,000 lines; verified by `wc -l src/server.ts src/server-support.ts`.
- [x] Update `docs/progress-log.md`; verified by reading it.
- [x] Run full QA and compose smoke; verified with `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test`, `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Moving helper code can break imports without changing behavior; mitigated with typecheck, DB-backed API tests, full check, and dev compose smoke.

## Completion Checklist

- [x] `src/server.ts` is under 1,000 lines, verified by `wc -l src/server.ts src/server-support.ts` showing 756 lines for `src/server.ts`.
- [x] Route behavior is unchanged, verified by preserving route code and running typecheck.
- [x] DB-backed API behavior still passes, verified by `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test`.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
