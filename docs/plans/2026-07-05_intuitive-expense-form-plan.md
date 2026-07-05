## Goal

讓日常記帳不用猜欄位或跳 prompt：新增/編輯支出使用清楚的 inline 表單、預設合理值，並在送出前顯示可理解的錯誤。

## Context

目前前端在 `src/client/main.ts` 處理表單事件，畫面由 `src/client/views.ts` 產生，部分編輯流程仍依賴 `prompt()`。後端 API 已支援新增與修改支出的欄位。

## Non-Goals

- 不引入 UI framework、router 或表單套件。
- 不改拆帳演算法或資料表結構。

## Plan

- [ ] 盤點 `src/client/main.ts` 中的 `prompt()` 支出編輯流程，列出要改成 inline 的欄位；以 `rg "prompt\(" src/client/main.ts` 與人工檢查確認範圍。
- [ ] 在 `src/client/client-support.ts` 增加最小的支出表單輔助函式，例如預設日期、預設付款人與欄位錯誤文案；以 `src/client/client-support.test.ts` 驗證空成員、空金額、未選分帳成員。
- [ ] 更新 `src/client/views.ts` 的記帳表單，讓日期預設今天、付款人預設第一位或上次使用者、分帳預設全選；以 `src/client/views.test.ts` 驗證 rendered HTML 的預設值。
- [ ] 把支出列表的單欄位 prompt 編輯改成同列「編輯/取消/儲存」表單，送出既有 PATCH API；以 `npm test -- src/client/views.test.ts src/client/client-support.test.ts` 驗證按鈕、欄位與錯誤區塊存在。
- [ ] 在 `src/client/main.ts` 將伺服器錯誤寫回表單附近而不是只靠全域訊息；以瀏覽器手動建立錯誤資料並截圖或使用 DOM 檢查確認錯誤可見。
- [ ] 跑完整品質檢查；以 `npm run check` 通過作為驗收。

## Completion Checklist

- [ ] 新增支出表單有合理預設值，並由 `src/client/views.test.ts` 或瀏覽器檢查驗證。
- [ ] 支出編輯不再依賴 `prompt()`，並由 `rg "prompt\(" src/client/main.ts` 確認支出流程已移除。
- [ ] 表單錯誤會顯示在相關欄位附近，並由測試或瀏覽器檢查驗證。
- [ ] 品質門檻通過，證據為 `npm run check`。
