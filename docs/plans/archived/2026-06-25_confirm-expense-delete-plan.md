## Goal

避免使用者誤按支出刪除後立刻失去資料；刪除支出前先用瀏覽器原生確認框要求確認。

## Context

旅行與參與者刪除已經有 `confirm()`，但支出刪除目前直接送出 `DELETE /expenses/:expenseId`。支出是核心記帳資料，誤刪會影響餘額與結清建議。

## Non-Goals

- 不新增復原、軟刪除或審計紀錄；目前以最小確認防呆降低誤刪風險。
- 不改 server API；現有刪除權限與 DB-backed tests 已覆蓋。

## Plan

- [x] Update `src/client/main.ts` expense delete click handler to call native `confirm()` with the expense description before API deletion; verified by source review and `npm run typecheck`.
- [x] Update `docs/progress-log.md` with the completed cycle outcome; verified by reading the log.
- [x] Run full QA and compose smoke; verified with `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Browser confirm is basic UX, but it is native, dependency-free, and consistent with existing trip/participant deletion.

## Completion Checklist

- [x] Expense deletion requires explicit confirmation, verified by `src/client/main.ts` source review.
- [x] Type/lint/test/build gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
- [x] Progress log records candidate ranking and this completed cycle, verified by reading `docs/progress-log.md`.
