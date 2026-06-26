## Goal

在支出列表中，當支出分帳給所有參與者時顯示「所有人」，避免預設情境下列出一長串姓名。

## Context

新增支出表單預設勾選所有參與者，因此很多支出都會顯示完整姓名列表。對較大的旅行群組，支出列表會變得冗長；用一個簡短標籤即可改善掃讀性。

## Non-Goals

- 不改變分帳資料或計算邏輯。
- 不改變 CSV 匯出內容。

## Plan

- [x] Add a tested client helper that turns split participant IDs into a display label and returns `所有人` when every participant is included; verified with unit tests.
- [x] Use the helper in `src/client/main.ts` expense list rendering; verified with typecheck/build through `npm run check`.
- [x] Update `docs/progress-log.md`; verified by reading the file.
- [x] Run full QA and compose smoke; verified with `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm run check`, `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Unknown participant IDs should still show as `未知`; covered in helper tests so the UI does not hide stale data issues.

## Completion Checklist

- [x] All-person splits render as `所有人`, verified by unit test.
- [x] Partial splits still render participant names, verified by unit test.
- [x] Unknown split IDs still render `未知`, verified by unit test.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
