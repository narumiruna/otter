## Goal

讓參與者列表不要提供一定會失敗的刪除操作，改為清楚標示「已有支出」或「至少需要一位參與者」。

## Context

API 已保護不能刪除最後一位參與者，也不能刪除已被付款或分帳使用的參與者。但 UI 仍對所有參與者顯示刪除按鈕，使用者點擊後才看到錯誤。

## Non-Goals

- 不改變 API 刪除規則。
- 不實作參與者合併或支出改派。

## Plan

- [x] Add a small client helper that returns why a participant cannot be deleted; verified with a unit test.
- [x] Use that helper in `src/client/main.ts` to disable impossible participant delete buttons and show the reason; verified with build/typecheck through `npm run check`.
- [x] Update `docs/progress-log.md`; verified by reading the file.
- [x] Run full QA and compose smoke; verified with `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm run check`, `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- The UI check mirrors API rules and could drift later; mitigated by keeping the API checks authoritative and only disabling obvious impossible actions.

## Completion Checklist

- [x] Used participants show a disabled delete affordance, verified by helper unit test and diff review.
- [x] The last participant shows a disabled delete affordance, verified by helper unit test and diff review.
- [x] Deletable participants still have a working delete button, verified by helper unit test and existing API tests.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
