## Goal

讓旅行明細、餘額與結清建議列印時更乾淨，方便使用者把結算結果分享給同伴或離線保存。

## Context

目前畫面有卡片陰影、表單、按鈕與側邊旅行列表；直接列印會浪費空間並混入操作控制。CSS `@media print` 可用最小風險改善，不需要新套件或 API。

## Non-Goals

- 不新增匯出 PDF 功能。
- 不改變螢幕版樣式或 UI 流程。

## Plan

- [x] Add `@media print` styles in `src/client/styles.css` to remove app controls, shadows, backgrounds, and side trip navigation from printed output; verified by reading the CSS and running build through `npm run check`.
- [x] Update README and `docs/progress-log.md`; verified by reading both files.
- [x] Run full QA and compose smoke; verified with `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Print CSS may not match every browser's print renderer; accepted because native print support is still a clear improvement and CSS-only.

## Completion Checklist

- [x] Print media CSS hides forms/buttons/sidebar controls, verified by reading `src/client/styles.css`.
- [x] Screen styles remain unchanged outside `@media print`, verified by diff review.
- [x] README and progress log mention the completed change, verified by reading both files.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
