# otter

otter 是一個為旅行和朋友聚會設計的網頁記帳拆帳 app，協助使用者記錄共同支出、整理每個人的付款狀況，並計算最後誰要付給誰多少錢。

## 功能

- 註冊、登入、登出。
- 建立、選擇、重新命名、調整基準貨幣、封存/還原與刪除支出群組，並避免同帳號重複命名。
- 可加入既有帳號為協作者；協作者可記帳與維護成員，但不能刪除旅行或管理協作者。
- 新增、重新命名與刪除未使用的參與者，並避免同一旅行內重複命名。
- 記錄支出：日期、描述、付款人、金額、貨幣、分帳參與者，並可修改日期、描述、金額、貨幣、付款人與分帳參與者。
- 每筆支出可上傳一張 JPEG、PNG 或 WebP 收據照片，大小上限 5MB，圖片目前存在 PostgreSQL。
- 刪除誤建的支出。
- 支援 TWD、JPY、USD、EUR，並以旅行的基準貨幣計算餘額；每趟旅行可自訂匯率。
- 顯示每位參與者的分帳餘額與 settle up 結清建議。
- 群組工作區以「總覽、支出、成員、更多」四個目標導向區域組織；「記一筆」是持續可見的主要動作。總覽先顯示待結清與餘額，花費分析則按需展開。
- 匯出支出群組支出、餘額與結清建議 CSV，批次匯入同格式支出 CSV，下載/還原 JSON 備份，並可用列印按鈕輸出適合列印的結算畫面。
- 擁有者可建立可撤銷的唯讀分享連結，朋友不登入也能查看支出、餘額與結清建議。
- 可安裝成手機瀏覽器捷徑；API 和記帳資料需連線，不支援離線新增或同步記帳。

## 技術

- 前端：React + Vite + TypeScript。
- UI：shadcn/ui（Base UI primitives）+ Tailwind CSS。
- Server state：TanStack Query；表單：React Hook Form。
- 後端：Express + TypeScript。
- 資料庫：PostgreSQL + raw SQL migrations。
- 共用拆帳邏輯：`src/shared/`。
- 格式與 lint：Biome CI。
- Git hook：`.pre-commit-config.yaml` 可用 `prek install` 安裝。

前端工作區已完整使用 React feature components；TanStack Query 只在 API 成功後更新遠端狀態，React Hook Form 管理草稿、驗證、預覽與取消。URL 的 `trip`、`view`、`mode` query parameters 支援返回、上一頁與直接連結，且不會移除未知參數。

## 本機開發

```bash
npm install
just dev
```

開啟 <http://localhost:3420>。dev compose 會啟動 Postgres、執行 `npm run migrate`、建立開發用帳號，再啟動 app。登入頁會預先填入：

- Email：`admin@otter.local`
- 密碼：`admin1234`

開發帳號只會在 `NODE_ENV=development` 時建立，且是一般帳號（系統沒有全域 admin 權限）。啟動時也會以可重複執行的方式加入 4 組範例資料：東京賞櫻、台南美食、紐約出差，以及一組已封存的歐洲跨年；內容涵蓋多幣別、分類、標籤、指定分帳與部分結清。

`just dev` 會以背景 container 啟動完整開發環境；若要在前景執行 app，請改用下方的手動指令。

如果不用 compose，先準備 Postgres 並設定 `DATABASE_URL`：

```bash
DATABASE_URL=postgres://user:pass@localhost:5432/otter npm run migrate
DATABASE_URL=postgres://user:pass@localhost:5432/otter npm run dev
```

常用檢查：

```bash
npm run migrate -- --help
npm run typecheck
npm test
npm run test:components
npm run test:e2e
npm run biome:ci
npm run check
```

執行 DB-backed API 測試（需先啟動 dev Postgres）：

```bash
TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test
```

重建 dev 資料庫 volume：

```bash
npm run db:reset:dev
```

`npm run check` 會執行 Biome CI、TypeScript typecheck、Node/component 測試與 production build，且維持不依賴資料庫。`npm run test:e2e` 會用 Playwright Chromium 驗證主要流程、responsive reflow、dialog focus 與 axe accessibility；先執行 `npx playwright install chromium`，並提供已遷移的 `DATABASE_URL`。

## Pre-commit / prek

```bash
prek install
```

目前 hook 會執行：

```bash
npm run check
```

## Docker

Production-like（使用外部 Postgres，必須提供 `DATABASE_URL`）：

```bash
DATABASE_URL=postgres://user:pass@db:5432/otter docker compose -f compose.yaml up --build
```

Development container（含 Postgres）：

```bash
docker compose -f compose.dev.yaml up --build
```

兩個 compose 檔都會把 app 暴露在 <http://localhost:3420>；container 啟動時會先套用 migrations。

Production session cookie 在 `NODE_ENV=production` 時預設使用 `Secure`；只有在可信任的 HTTP 測試環境才設定 `COOKIE_SECURE=false`。

## 工作流程與安全狀態

新增支出預設使用今天、群組基準貨幣、第一位付款人、所有分帳成員與平均分帳；指定金額、比例、份數、分類與標籤透過有名稱的進階區塊展開。輸入金額後會先顯示每人的具體分帳預覽，只有「記錄支出」會寫入資料。

修改基準貨幣、匯率、CSV 匯入、JSON 還原、分享、封存、合併及刪除都先顯示結果或影響範圍。`取消`、Escape 或捨棄草稿不會呼叫 mutation API；失敗會保留舊資料與草稿。封存及唯讀分享不顯示修改 controls；協作者可維護日常支出，但只有擁有者能管理權限、偏好與生命週期。離線時可閱讀已載入資料，寫入 actions 會停用並說明需恢復連線。

## 匯入、備份、分享與附件限制

CSV 匯入欄位範例：

```csv
date,description,amount,currency,paid_by,category,tags,split_participants
2026-06-25,Dinner,1200,TWD,Alice,餐飲,"food|night","Alice; Bob"
```

匯入前需先建立對應參與者；任一列錯誤會取消整批匯入。JSON 備份會還原成新的支出群組，不覆蓋既有資料；備份不包含帳號、session、密碼或收據圖片。收據圖片目前存在 PostgreSQL，每筆支出一張、上限 5MB。

分享連結知道網址即可讀取整趟旅行的結算資訊；外洩時請在「更多 → 分享與權限」撤銷。手機瀏覽器可加到主畫面捷徑，但 API 和記帳資料仍需連線，不支援離線新增支出。

## 貨幣與匯率限制

支援貨幣：TWD、JPY、USD、EUR。每趟旅行可在「更多 → 換算方式」先預覽再套用自訂匯率；未設定的幣別會使用固定原型匯率。若要正式用於長期或高金額記帳，下一步應接即時匯率。

## CI

GitHub Actions 設定在 `.github/workflows/ci.yml`，流程為：

```bash
npm ci
npx playwright install --with-deps chromium
npm run check
npm run migrate
npm run test:e2e
```
