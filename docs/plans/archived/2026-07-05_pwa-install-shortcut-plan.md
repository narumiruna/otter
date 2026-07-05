## Goal

讓 otter 可在手機瀏覽器安裝成捷徑/PWA，旅途中更快開啟並有基本離線殼層。

## Context

目前是 Vite + Express 網頁 app，尚無 manifest 或 service worker。

## Tech Stack

使用原生 Web App Manifest 與 Service Worker，不新增 PWA 套件。

## Non-Goals

- 不做完整離線記帳同步。
- 不做 push notification。

## Plan

- [x] 新增 `public/manifest.webmanifest` 與必要 icon assets，設定 app name、start_url、display、theme_color；以 Chrome DevTools Application panel 或 Lighthouse PWA 檢查驗證。
- [x] 更新 `index.html` 加 manifest link、theme-color 與 icon link；以 `npm run build` 驗證 Vite 打包。
- [x] 新增最小 service worker，cache app shell 靜態資源，API request 一律 network-only；以瀏覽器離線重新整理確認殼層或離線提示。
- [x] 在 `src/client/main.ts` 註冊 service worker，並在不支援時靜默略過；以 typecheck 驗證。
- [x] 更新 `src/client/views.ts` 或全域錯誤區，離線時顯示「目前離線，資料需連線後載入」；以瀏覽器 offline 模式檢查。
- [x] 更新 README 加入 PWA 限制：可安裝但不支援離線新增支出；以 `git diff -- README.md` 檢查。
- [x] 跑完整品質檢查；以 `npm run check` 通過作為驗收。

## Risks

- Service worker cache 可能讓舊版前端卡住；第一版只 cache hashed static assets，API 不 cache。

## Rollback / Recovery

- 若 PWA cache 造成問題，可移除 registration 並發佈 unregister script 清掉舊 service worker。

## Completion Checklist

- [x] App 有有效 web manifest 與 icons，並由 Chrome/Lighthouse 檢查驗證。
- [x] Service worker 只 cache app shell、不 cache API，並由 source review 與 offline 測試驗證。
- [x] README 說明 PWA 可安裝但不支援離線記帳，並由 diff 檢查驗證。
- [x] 品質門檻通過，證據為 `npm run check`。
