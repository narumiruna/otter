## Goal

讓旅行列表目前選取的旅行除了視覺樣式外，也透過 ARIA 狀態讓輔助科技辨識。

## Context

旅行列表按鈕目前只有 `.active` class 顯示選取狀態。加上 `aria-pressed` 可保留現有 UI，同時讓 screen reader 能理解哪個旅行目前被選取。

## Non-Goals

- 不改變旅行切換流程或視覺樣式。
- 不新增自訂 tab/listbox 元件。

## Plan

- [x] Add `aria-pressed` to trip list buttons in `src/client/views.ts`; verified by reading the file and running build through `npm run check`.
- [x] Update `docs/progress-log.md`; verified by reading the file.
- [x] Run full QA and compose smoke; verified with `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- `aria-pressed` is a simple toggle-button state and should match the existing visual active state; risk is low.

## Completion Checklist

- [x] Active trip buttons expose `aria-pressed="true"`, verified by reading `src/client/views.ts`.
- [x] Inactive trip buttons expose `aria-pressed="false"`, verified by reading `src/client/views.ts`.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
