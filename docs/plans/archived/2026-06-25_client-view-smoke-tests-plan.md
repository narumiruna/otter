## Goal

新增最小的 client view rendering smoke tests，保護近期抽出的 `src/client/views.ts` 與新增的 accessibility markup 不被後續 UI 改動弄壞。

## Context

`dashboardView` 現在負責旅行列表、參與者列表與支出列表的 HTML 字串。這些 selector 和 ARIA 屬性目前只靠 build 驗證，缺少快速 regression check。

## Non-Goals

- 不新增 DOM 測試框架或瀏覽器測試依賴。
- 不測所有 HTML 細節；只覆蓋會影響事件綁定與 accessibility 的關鍵字串。

## Plan

- [x] Add `src/client/views.test.ts` using Node `node:test` assertions against `dashboardView`; verified it checks selected trip ARIA state, participant action labels/descriptions, and expense action labels.
- [x] Run the targeted test file with `npm test -- src/client/views.test.ts`; verified it passes after formatting the new file.
- [x] Update `docs/progress-log.md`; verified by reading the file.
- [x] Run full QA and compose smoke; verified with `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- String assertions can be brittle; kept them to stable selectors and ARIA attributes that are part of the UI contract.

## Completion Checklist

- [x] `src/client/views.test.ts` exists and exercises `dashboardView`, verified by reading the test file.
- [x] Tests cover selected/inactive trip ARIA state, participant action accessibility, and expense action accessibility, verified by reading the assertions.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
