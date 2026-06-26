## Goal

把 `src/client/main.ts` 的型別與純 helper 抽到小型支援模組，讓主 UI 檔在繼續增加功能前保持低於 1,000 行且更容易維護。

## Context

`src/client/main.ts` 目前約 935 行，接近 repository 規範中的 1,000 行分割門檻。抽出無狀態 helper 與型別即可降低檔案大小，不改變 UI 行為。

## Non-Goals

- 不重寫 UI 架構或導入框架狀態管理。
- 不改變任何 API、畫面文案或使用流程。

## Plan

- [x] Move client-only types and pure helpers from `src/client/main.ts` into a new `src/client/client-support.ts`; verified `src/client/main.ts` line count drops and TypeScript still compiles.
- [x] Update imports in `src/client/main.ts` without behavior changes; verified with `npm run typecheck` and `npm run build` through `npm run check`.
- [x] Update `docs/progress-log.md`; verified by reading the file.
- [x] Run full QA and compose smoke; verified with `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Import mistakes could break the browser bundle; mitigated by TypeScript and production build.

## Completion Checklist

- [x] `src/client/main.ts` is below 900 lines, verified by `wc -l src/client/main.ts` showing 869 lines.
- [x] Client support helpers live in `src/client/client-support.ts`, verified by reading the file.
- [x] UI behavior is unchanged, verified by `npm run check` and dev compose `/api/me` smoke.
- [x] Progress log mentions the completed change, verified by reading `docs/progress-log.md`.
