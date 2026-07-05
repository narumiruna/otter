## Goal

讓每趟旅行可自訂匯率，使多幣別餘額比固定內建匯率更可信。

## Context

目前 `src/shared/money.ts` 用固定 `rateToTwd` 換算，`Trip` 只有 `baseCurrency`。

## Architecture

每趟旅行保存「1 單位來源貨幣 = X 單位基準貨幣」的匯率；基準貨幣匯率固定為 1。計算時優先用 trip rates，沒有設定時才用內建固定匯率。

## Non-Goals

- 不串接即時匯率 API。
- 不保存每日歷史匯率。

## Plan

- [ ] 新增 `trip_exchange_rates` 遷移，欄位含 `trip_id`, `currency`, `rate_to_base numeric(18,8)`，並約束 rate > 0；以 `npm run migrate` 驗證。
- [ ] 擴充 `Trip` 型別，加入可選 `exchangeRates`，並讓 `convertMinor()` 或新的 shared helper 支援 trip-specific rates；以 `src/shared/money.test.ts` 或 `settlement.test.ts` 驗證 fallback 與自訂匯率。
- [ ] 更新 `loadTripForUser()`/`tripPayload()` 載入匯率；以 API 測試驗證回傳資料。
- [ ] 更新 `PATCH /api/trips/:tripId` 或新增 rates endpoint，驗證所有非基準貨幣 rate 為正數；以 server tests 驗證錯誤輸入。
- [ ] 更新設定頁 UI，讓使用者編輯每個非基準貨幣匯率並顯示基準貨幣為 1；以 view tests 驗證欄位。
- [ ] 更新 README 的貨幣限制段落，說明自訂匯率已支援、即時匯率仍未支援；以 `git diff -- README.md` 檢查。
- [ ] 跑完整品質檢查；以 `npm run check` 通過作為驗收。

## Risks

- 修改匯率會改變所有歷史餘額；UI 需明確提示「套用於整趟旅行目前計算」。

## Rollback / Recovery

- 若自訂匯率出問題，可清空該 trip rates 回到內建固定匯率。

## Completion Checklist

- [ ] 每趟旅行可保存自訂匯率，並由 DB/API 測試驗證。
- [ ] 餘額與結清建議使用自訂匯率，並由 shared tests 驗證。
- [ ] 設定頁可編輯匯率且有變更提示，並由 view test 或瀏覽器檢查驗證。
- [ ] 品質門檻通過，證據為 `npm run check`。
