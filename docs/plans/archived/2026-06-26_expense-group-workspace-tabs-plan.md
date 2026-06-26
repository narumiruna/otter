## Goal

把目前「所有操作都在同一頁」改成更舒服的 Expense Group 工作區：使用者先從支出群組選單選一個 group，進入該 group 後用分頁完成總覽、記帳、支出紀錄、成員、設定/匯出等工作。

## Context

目前 UI 已有左側 group/trip 清單與右側工作區，但右側仍把總覽、記帳、支出紀錄、成員、設定操作堆在同一個長頁面。使用者預期流程是：

1. 登入後看到支出群組清單。
2. 選擇某個 expense group。
3. 進入該 group 的工作區。
4. 在工作區內用分頁切換任務，而不是一次看到所有表單與操作。

現有後端與資料模型仍叫 `trip`；本計畫只改前端資訊架構與文案，避免資料庫/API rename 的大風險。

## Architecture

- 保留 `Trip`/API/internal type 命名；UI 顯示改用「支出群組」。
- 在 client state 加一個 active workspace tab：`overview | add-expense | expenses | members | settings`。
- `dashboardView(state)` 繼續輸出左側支出群組清單；`tripView(payload, activeTab)` 只 render 目前分頁的主要內容。
- tab 切換只改 client state，不打 API，不改 URL；若之後需要 deep link，再加 hash/query。

## Non-Goals

- 不改資料庫 schema、API route、server type 名稱。
- 不實作拖拉排序、篩選器、搜尋或批次操作。
- 不新增 UI framework、router 或狀態管理套件。
- 不把現有 `prompt()` / `confirm()` 編輯流程改成 modal。

## Plan

- [x] Rename visible navigation copy from「旅行 / 群組」to「支出群組」while keeping backend/internal names unchanged; verified by reading `src/client/views.ts` and running `npm run typecheck`.
- [x] Add client-only active tab state and tab click handlers in `src/client/main.ts`; verified tab clicks switch visible panels in Chrome without page navigation.
- [x] Render a workspace tab bar in `src/client/views.ts` with five native buttons:「總覽」「記帳」「支出紀錄」「成員」「設定/匯出」; verified with `src/client/views.test.ts` assertions for labels and active tab ARIA state.
- [x] Split existing group content into tab panels in `src/client/views.ts`: overview shows balances/settlements/recent expenses, add-expense shows only the expense form, expenses shows the expense list/actions, members shows participant management, settings shows export/print/rename/base currency/delete; verified with `npm test -- src/client/views.test.ts`.
- [x] Update `src/client/styles.css` for a comfortable desktop and mobile tab layout; verified in Chrome at 1265px desktop width and 390px mobile width.
- [x] Ensure event handlers still bind when their panel is visible: add expense, edit/delete expense, participant actions, export/print/settings actions; verified manually in Chrome by adding/deleting a smoke expense, editing a description, adding/deleting a smoke member, exporting CSV from Settings, and stubbing/clicking print, plus `npm run check`.
- [x] Update README feature wording for支出群組工作區 language; verified by reading README diff.

## Risks

- Hidden tab panels can break event binding if handlers query elements that are not rendered; mitigated by rendering only the active panel and keeping optional `querySelector` handlers.
- Moving export/delete into Settings may make them one click farther away; accepted because they are less frequent and safer when separated from daily記帳.
- UI says「支出群組」while code/API still says trip; accepted short-term to avoid a risky rename migration.

## Completion Checklist

- [x] Login screen still works and authenticated users see a支出群組 selector first, verified in Chrome.
- [x] Selecting a支出群組 opens a workspace with visible tabs, verified in Chrome.
- [x] Each tab shows only its task-focused content, verified by Chrome and `src/client/views.test.ts`.
- [x] Existing create/edit/delete/export/print flows still work from their new tabs, verified manually in Chrome (including stubbed print) and by `npm run check`.
- [x] Desktop and mobile layouts are usable, verified by Chrome viewport checks and screenshots at `/tmp/otter-workspace-tabs-desktop.png` and `/tmp/otter-workspace-tabs-mobile.png`.
- [x] Full quality gate passes, verified by `npm run check`.
