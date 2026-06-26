## Goal

讓 malformed Cookie header 中的非法 percent-encoding 不會讓 auth/session parsing 丟出例外；無法解碼的目標 cookie 視為不存在。

## Context

`getCookie()` 目前直接呼叫 `decodeURIComponent()`。如果使用者或代理送出像 `%E0%A4%A` 的壞 cookie，`/api/me`、logout 或受保護 API 可能進入 500，而不是當作未登入。

## Non-Goals

- 不改變 session cookie 名稱、屬性或過期策略。
- 不新增完整 cookie parser dependency。

## Plan

- [x] Update `getCookie()` in `src/server-support.ts` to catch decode errors and return `undefined` for malformed target cookie values; verified with a unit test.
- [x] Add `src/server-support.test.ts` coverage for malformed cookie values while preserving valid decode behavior; verified with `npm test -- src/server-support.test.ts`.
- [x] Update `docs/progress-log.md`; verified by reading the file.
- [x] Run full QA and compose smoke; verified with `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- A malformed session cookie will be treated as absent; accepted because it cannot identify a valid session.

## Completion Checklist

- [x] Malformed target cookie values return `undefined`, verified by `src/server-support.test.ts`.
- [x] Valid encoded cookie values still decode, verified by `src/server-support.test.ts`.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
