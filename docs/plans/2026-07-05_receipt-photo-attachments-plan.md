## Goal

讓使用者可替支出上傳與查看收據照片，先保存圖片本身，不做 OCR。

## Context

目前沒有檔案上傳。為避免引入 multipart 套件，第一版可用 raw image upload endpoint：前端直接把選到的 image file 作為 request body 上傳。

## Architecture

新增 `receipt_attachments` 表保存小型圖片 `bytea`、mime type 與 expense 關聯；API 限制檔案大小與 MIME，只允許該 trip 的使用者讀寫。

## Non-Goals

- 不做 OCR、圖片裁切或壓縮服務。
- 不接 S3/object storage；等檔案量大再換。

## Plan

- [ ] 新增 `receipt_attachments` 遷移，欄位含 `id`, `trip_id`, `expense_id`, `mime_type`, `data bytea`, `created_at`，每筆支出先限制一張；以 `npm run migrate` 驗證。
- [ ] 在 Express 加 raw image body parser 只套用收據 upload route，限制 5MB 與 `image/jpeg|png|webp`；以 API tests 驗證過大與錯誤 MIME 被拒。
- [ ] 新增 API 上傳、讀取、刪除收據；以 DB-backed tests 驗證 ownership、expense/trip 關聯與 response content-type。
- [ ] 更新 `loadTripForUser()` payload，對每筆支出只回傳 `receiptId`/`receiptUrl` metadata，不直接塞圖片；以 API test 驗證。
- [ ] 更新支出列表 UI，加入檔案 input、查看連結與刪除按鈕；以 `src/client/views.test.ts` 驗證。
- [ ] 更新 `src/client/main.ts` 用 `fetch` 直接上傳 `File`，不設定 JSON content-type；以瀏覽器手動上傳小圖驗證。
- [ ] 更新 README 說明本機 DB 儲存圖片與 5MB 限制；以 `git diff -- README.md` 檢查。
- [ ] 跑完整品質檢查；以 `npm run check` 通過作為驗收。

## Risks

- `bytea` 不適合大量大圖；第一版用 5MB 限制，正式大量使用再改 object storage。

## Rollback / Recovery

- 若上傳功能有問題，可隱藏 UI；支出資料不依賴附件表。

## Completion Checklist

- [ ] 支出可上傳、查看與刪除一張收據照片，並由 DB-backed API tests 驗證。
- [ ] 錯誤 MIME、超過 5MB 與未授權讀取會被拒，並由 API tests 驗證。
- [ ] UI 顯示附件狀態與操作，並由 view test 或瀏覽器檢查驗證。
- [ ] 品質門檻通過，證據為 `npm run check`。
