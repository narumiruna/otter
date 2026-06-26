## Goal

讓參與者列表的重新命名 / 刪除按鈕有明確 accessible label，並讓無法刪除的原因透過 `aria-describedby` 關聯到停用按鈕。

## Context

參與者列目前用相鄰文字顯示人名與封鎖原因。視覺上足夠，但輔助科技使用者可能只聽到重複的「重新命名」「刪除」按鈕，或不清楚停用刪除按鈕旁邊的原因屬於該按鈕。

## Non-Goals

- 不改變參與者新增、重新命名或刪除流程。
- 不改變可見文案或事件 selector。

## Plan

- [x] Add participant-specific `aria-label` attributes to rename/delete buttons in `src/client/views.ts`; verified by reading the button markup and running `npm run typecheck`.
- [x] Add `aria-describedby` from disabled participant delete buttons to their visible reason text in `src/client/views.ts`; verified by reading the generated IDs and attributes.
- [x] Update `docs/progress-log.md`; verified by reading the file.
- [x] Run full QA and compose smoke; verified with `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Attribute escaping mistakes could produce invalid HTML; mitigated by reusing `htmlEscape`.

## Completion Checklist

- [x] Participant rename and active delete buttons include the participant name in `aria-label`, verified by reading `src/client/views.ts`.
- [x] Disabled participant delete buttons reference the visible block reason with `aria-describedby`, verified by reading `src/client/views.ts`.
- [x] Existing visible text and `data-*` selectors are unchanged, verified by reading the diff.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
