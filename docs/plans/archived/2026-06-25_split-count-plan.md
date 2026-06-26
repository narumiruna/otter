## Goal

在新增支出表單顯示目前已選的分帳人數，讓使用者在送出前確認分帳範圍。

## Context

分帳表單已有「全選 / 清除」快捷鍵與空分帳錯誤提示，但使用者仍需要自己數目前勾了幾個人。顯示 `已選 X / Y` 是低風險 UI 改善。

## Non-Goals

- 不改變後端分帳驗證或計算。
- 不改變編輯既有支出的 prompt 流程。

## Plan

- [x] Add a tested helper that formats selected/total split counts; verified with unit tests.
- [x] Render and update the selected split count in `src/client/main.ts` when checkboxes or split shortcut buttons change; verified with typecheck/build through `npm run check`.
- [x] Update `docs/progress-log.md`; verified by reading the file.
- [x] Run full QA and compose smoke; verified with `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm run check`, `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Count display could drift if checkbox selectors change; mitigated by using the same checkbox name the submit handler already uses.

## Completion Checklist

- [x] Split count label formats selected and total counts, verified by unit test.
- [x] Split count updates after checkbox and shortcut changes, verified by diff review and build.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
