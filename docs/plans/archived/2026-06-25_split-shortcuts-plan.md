## Goal

在新增支出表單提供分帳參與者「全選」與「清除」快捷鍵，讓大群組調整分帳不用逐一點選。

## Context

新增支出預設勾選所有參與者；使用者若只想記錄少數人分帳，目前要手動取消多個 checkbox。原生按鈕操作即可改善，不需要新 UI 套件。

## Non-Goals

- 不改變後端分帳驗證或計算。
- 不改變編輯既有支出的 prompt 流程。

## Plan

- [x] Add a tiny tested helper for split shortcut values; verified with unit tests.
- [x] Add `全選`/`清除` buttons to `src/client/main.ts` expense form and wire them to participant checkboxes; verified with typecheck/build through `npm run check`.
- [x] Update `docs/progress-log.md`; verified by reading the file.
- [x] Run full QA and compose smoke; verified with `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm run check`, `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Clearing all split participants still requires server validation before submit; accepted because the existing API/UI error already handles empty splits.

## Completion Checklist

- [x] `全選` maps to checked=true and `清除` maps to checked=false, verified by unit test.
- [x] Expense form includes non-submit shortcut buttons, verified by diff review and build.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
