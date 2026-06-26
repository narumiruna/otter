## Goal

在旅行頁面加入明確的列印按鈕，讓使用者能直接列印目前的結算畫面。

## Context

專案已有 print-friendly CSS，但使用者必須知道瀏覽器列印功能才會發現。加入 `window.print()` 按鈕即可讓列印流程更可見，不需要新套件。

## Non-Goals

- 不新增 PDF 匯出。
- 不改變列印 CSS 或結算資料。

## Plan

- [x] Add a `列印` button in `src/client/main.ts` trip actions and bind it to `window.print()`; verified with typecheck/build through `npm run check`.
- [x] Update README and `docs/progress-log.md`; verified by reading both files.
- [x] Run full QA and compose smoke; verified with `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Browser print dialogs cannot be automated in this environment; accepted because `window.print()` is native and verified by build plus code review.

## Completion Checklist

- [x] Trip actions include a visible `列印` button, verified by reading `src/client/main.ts`.
- [x] The button calls `window.print()`, verified by reading `src/client/main.ts`.
- [x] README and progress log mention the completed change, verified by reading both files.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
