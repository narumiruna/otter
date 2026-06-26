## Goal

讓前端成功與錯誤訊息對輔助科技可被即時宣告，改善表單提交與操作結果的可及性。

## Context

`render()` 會顯示 `.notice` 和 `.error`，但目前只是一般段落。加上 native ARIA role/live attributes 即可改善，不需要新套件或視覺改版。

## Non-Goals

- 不改變訊息文字或操作流程。
- 不導入自訂 toast/notification 元件。

## Plan

- [x] Add appropriate ARIA attributes to notice/error messages in `src/client/main.ts`; verified by diff review and build.
- [x] Update `docs/progress-log.md`; verified by reading the file.
- [x] Run full QA and compose smoke; verified with `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Over-announcing could be noisy; mitigated by using polite status for success and alert only for errors.

## Completion Checklist

- [x] Success messages use a polite live status, verified by reading `src/client/main.ts`.
- [x] Error messages use alert semantics, verified by reading `src/client/main.ts`.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
