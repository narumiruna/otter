## Goal

讓使用者能在支出紀錄中依日期、付款人、分帳成員、幣別與關鍵字搜尋、篩選、排序。

## Context

目前 trip payload 已一次載入所有支出；第一版可在 client 端篩選，不必新增 API 或資料表。

## Non-Goals

- 不做伺服器端分頁或全文索引。
- 不保存個人篩選偏好。

## Plan

- [ ] 在 `src/client/client-support.ts` 新增 `filterAndSortExpenses()`，輸入 filters 與 sort key，輸出支出清單；以 `src/client/client-support.test.ts` 驗證關鍵字、日期區間、付款人、分帳成員與排序。
- [ ] 在 `AppState` 或 `src/client/main.ts` 增加支出篩選狀態，預設為空 filter 與日期新到舊；以 typecheck 驗證。
- [ ] 更新 `src/client/views.ts` 的支出紀錄分頁，加入 native input/select 控制項與清除按鈕；以 `src/client/views.test.ts` 驗證控制項與結果數文案。
- [ ] 更新 `src/client/main.ts` 綁定 filter/sort change 事件，避免重新打 API；以瀏覽器手動操作或 DOM 測試確認支出清單即時更新。
- [ ] 加入空結果文案「沒有符合條件的支出」與清除 CTA；以 view test 驗證。
- [ ] 跑完整品質檢查；以 `npm run check` 通過作為驗收。

## Completion Checklist

- [ ] 支出列表可依關鍵字、日期、付款人、分帳成員與幣別篩選，並由 client-support tests 驗證。
- [ ] 支出列表可排序，並由 client-support tests 驗證。
- [ ] UI 有清除篩選與空結果文案，並由 view tests 驗證。
- [ ] 品質門檻通過，證據為 `npm run check`。
