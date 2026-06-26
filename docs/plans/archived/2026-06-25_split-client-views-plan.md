## Goal

把 `src/client/main.ts` 的純畫面 rendering 函式抽到 `src/client/views.ts`，讓主檔維持遠低於 1,000 行並降低後續 UI 改動風險。

## Context

`src/client/main.ts` 已約 938 行，接近 repository 規範的 1,000 行分割門檻。`authView`、`dashboardView`、`tripView` 等函式只產生 HTML 字串，適合獨立成 view module。

## Non-Goals

- 不改變 UI 文案或使用流程。
- 不改變事件處理、API 呼叫或資料模型。

## Plan

- [x] Move pure view rendering functions from `src/client/main.ts` into new `src/client/views.ts`; verified `main.ts` line count drops below 750 and TypeScript compiles.
- [x] Update `src/client/main.ts` imports and render calls to use the new view module; verified with `npm run typecheck` and `npm run build` through `npm run check`.
- [x] Update `docs/progress-log.md`; verified by reading the file.
- [x] Run full QA and compose smoke; verified with `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm run check`, `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Import mistakes could break the browser bundle; mitigated by strict TypeScript and production build.

## Completion Checklist

- [x] `src/client/main.ts` is below 750 lines, verified by `wc -l src/client/main.ts` showing 662 lines.
- [x] Pure view functions live in `src/client/views.ts`, verified by reading the file.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
