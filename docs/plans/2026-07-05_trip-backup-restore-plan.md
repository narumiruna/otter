## Goal

提供整趟旅行的 JSON 備份與還原，讓使用者能保存、搬移或復原資料。

## Context

目前可匯出 CSV，但 CSV 不是完整備份，無法保留 trip、participants、expenses 的完整關係。

## Architecture

備份格式使用 versioned JSON。還原時在目前登入帳號下建立新 trip，重新產生 DB ids，並用備份內的 participant ids 建立映射。

## Non-Goals

- 不覆蓋既有 trip。
- 不備份使用者帳號、session 或密碼。

## Plan

- [ ] 定義 `TripBackupV1` 型別與 validation helper，包含 trip name/baseCurrency、participants、expenses；以 shared/server tests 驗證缺欄與未知版本。
- [ ] 新增 API `GET /api/trips/:tripId/backup` 回傳 JSON，移除 owner/session 資訊；以 API 測試驗證只有 owner 可下載。
- [ ] 新增 API `POST /api/trips/restore`，在 transaction 內建立新 trip、participants、expenses；以 DB-backed tests 驗證 id 映射、名稱衝突改名或錯誤策略。
- [ ] 更新設定/匯出分頁，加入「下載完整備份」與「還原備份」檔案 input；以 `src/client/views.test.ts` 驗證控制項。
- [ ] 更新 `src/client/main.ts` 下載 JSON 與讀取還原檔，成功後選中新 trip；以瀏覽器手動備份再還原驗證。
- [ ] 在 README 加入備份/還原注意事項；以 `git diff -- README.md` 檢查。
- [ ] 跑完整品質檢查；以 `npm run check` 通過作為驗收。

## Risks

- 還原錯誤可能建立部分資料；必須 transaction 包住整個還原。

## Rollback / Recovery

- 還原只建立新 trip；若結果不對，使用者可刪除新 trip，不影響原資料。

## Completion Checklist

- [ ] 下載的 JSON 備份包含完整 trip 資料且不含敏感帳號資料，並由 API 測試驗證。
- [ ] JSON 備份可還原成新的 trip，並由 DB-backed tests 驗證。
- [ ] UI 可下載與還原備份，並由 view test 或瀏覽器檢查驗證。
- [ ] 品質門檻通過，證據為 `npm run check`。
