## Goal

當新增支出沒有選任何分帳參與者時，前端直接顯示錯誤，不送出一定會被 API 拒絕的 request。

## Context

新增了分帳「清除」快捷鍵後，使用者更容易把分帳參與者清空。後端已正確回傳 400；前端先提示能少一次無效網路請求，也讓錯誤更快出現。

## Non-Goals

- 不移除後端空分帳驗證。
- 不改變支出建立 API。

## Plan

- [x] Add a tiny tested helper for empty split validation in `src/client/client-support.ts`; verified with unit tests.
- [x] Use the helper in `src/client/main.ts` expense submit handler before calling the API; verified with typecheck/build through `npm run check`.
- [x] Update `docs/progress-log.md`; verified by reading the file.
- [x] Run full QA and compose smoke; verified with `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm run check`, `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- UI validation can drift from API validation; accepted because the API remains authoritative and tests cover the shared client helper.

## Completion Checklist

- [x] Empty split selection returns the existing user-facing error, verified by unit test.
- [x] Non-empty split selection allows submit flow to continue, verified by unit test and existing API tests.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
