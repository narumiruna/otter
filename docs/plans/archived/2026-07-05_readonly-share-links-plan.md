## Goal

讓群組擁有者能產生唯讀分享連結，朋友不登入也能查看支出、餘額與結清建議。

## Context

目前所有 `/api/trips/:tripId` 資料都需要登入 session，沒有公開唯讀入口。

## Architecture

建立隨機分享 token，只在 DB 保存 hash；公開路由只能讀取 sanitized trip payload，不能呼叫任何 mutation API。

## Non-Goals

- 不支援公開留言或編輯。
- 不做細粒度欄位隱私設定；第一版分享整個 trip 結算資訊。

## Plan

- [x] 新增 `trip_share_links` 遷移，欄位含 `id`, `trip_id`, `token_hash`, `created_at`, `revoked_at`, `expires_at NULL`；以 `npm run migrate` 驗證。
- [x] 新增 token 產生與 hash helper，使用 `crypto.randomBytes` 與 timing-safe 比對；以 server-support tests 驗證 token 不以明文保存。
- [x] 新增 owner API 建立/撤銷/列出分享連結；以 API 測試驗證 ownership 與 revoked 行為。
- [x] 新增公開 GET 路由，例如 `/share/:token` 或 `/api/share/:token`，回傳 sanitized trip payload；以測試驗證不需要登入且無 ownerId/session 資料。
- [x] 更新前端設定頁，提供建立、複製、撤銷連結；以 view tests 驗證 UI。
- [x] 增加唯讀分享頁 render，隱藏新增、編輯、刪除、匯入等操作；以 view tests 或瀏覽器檢查驗證。
- [x] 更新 README 的分享限制與安全注意事項；以 `git diff -- README.md` 檢查。
- [x] 跑完整品質檢查；以 `npm run check` 通過作為驗收。

## Risks

- 分享連結外洩即能讀資料；用高熵 token、撤銷功能與 README 提醒緩解。

## Rollback / Recovery

- 若分享頁有問題，可撤銷 links 或停用公開路由；原 authenticated app 不受影響。

## Completion Checklist

- [x] Owner 可建立與撤銷唯讀分享連結，並由 API 測試驗證。
- [x] 未登入使用者可透過有效連結查看 sanitized 結算頁，並由 API/view tests 驗證。
- [x] 無效或撤銷 token 不能讀取資料，並由 API 測試驗證。
- [x] 品質門檻通過，證據為 `npm run check`。
