## Goal

提供合併成員功能，讓使用者修正重複建立的參與者，且不破壞既有支出、付款人與分帳資料。

## Context

目前只能刪除未使用成員；只要成員已出現在付款人或分帳名單，就不能刪除。

## Non-Goals

- 不自動偵測相似姓名。
- 不跨旅行合併成員。

## Plan

- [x] 定義合併規則：來源成員的付款人引用改到目標成員，分帳引用若目標已存在則刪除來源重複列；以本計畫與 `participant merge API rewrites used participants` 測試名稱可追溯確認。
- [x] 新增 server helper 或交易流程，在單一 DB transaction 內更新 `expenses.paid_by_id`、`expense_participants.participant_id` 並刪除來源成員；以 DB-backed API 測試驗證成功合併。
- [x] 新增 API `POST /api/trips/:tripId/participants/:sourceId/merge`，body 指定 `targetParticipantId`；以測試驗證不能合併自己與 used participant 合併。
- [x] 若不平均分帳已存在，合併同筆支出的兩筆分帳時加總 `share_minor`；以 DB-backed API 測試驗證。
- [x] 更新 `src/client/views.ts` 成員設定區，加入來源/目標選擇與確認提示；以 `src/client/views.test.ts` 驗證表單存在且避免單一成員時出現。
- [x] 更新 `src/client/main.ts` 送出合併請求後重載 trip payload；以 `npm run check` 和 DB-backed API 測試驗證資料更新。
- [x] 跑完整品質檢查；以 `npm run check` 通過作為驗收。

## Risks

- 分帳重複列處理錯誤會改變總分帳人數；用合併前後 balance/API 測試覆蓋。

## Rollback / Recovery

- 合併是破壞性資料修正；正式上線前需用 transaction 測試確認失敗會 rollback。

## Completion Checklist

- [x] 已使用成員可以合併到另一位成員，並由 DB-backed API 測試驗證。
- [x] 合併後餘額與結清建議仍能計算，並由 API 測試驗證。
- [x] UI 可執行合併且有確認提示，並由 view test 驗證。
- [x] 品質門檻通過，證據為 `npm run check`。
