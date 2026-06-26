## Goal

讓支出列表中重複出現的編輯 / 刪除按鈕有包含支出描述的 accessible label，讓輔助科技使用者能分辨每個按鈕作用於哪一筆支出。

## Context

`src/client/views.ts` 的支出列表每筆都有「改日期」「改描述」「刪除」等相同文字按鈕。視覺使用者可由列位置理解目標，但 screen reader 只聽到重複按鈕文字時不夠清楚。

## Non-Goals

- 不改變按鈕可見文字、排列或事件 selector。
- 不改變任何 API 或資料模型。

## Plan

- [x] Add `aria-label` attributes to each expense action button in `src/client/views.ts` using the escaped expense description; verified by reading the generated button markup and running `npm run typecheck`.
- [x] Update `docs/progress-log.md`; verified by reading the file.
- [x] Run full QA and compose smoke; verified with `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Incorrect escaping in attributes could create invalid HTML; mitigated by reusing `htmlEscape` and TypeScript/build checks.

## Completion Checklist

- [x] Each expense action button has an `aria-label` that includes the expense description, verified by reading `src/client/views.ts`.
- [x] Existing visible button text and `data-*` selectors are unchanged, verified by reading the diff.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
