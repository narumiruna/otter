# otter

otter 是一個為旅行和朋友聚會設計的網頁記帳拆帳 app，協助使用者記錄共同支出、整理每個人的付款狀況，並計算最後誰要付給誰多少錢。

## 功能

- 註冊、登入、登出。
- 建立、選擇、重新命名、調整基準貨幣、封存/還原與刪除支出群組，並避免同帳號重複命名。
- 新增、重新命名與刪除未使用的參與者，並避免同一旅行內重複命名。
- 記錄支出：日期、描述、付款人、金額、貨幣、分帳參與者，並可修改日期、描述、金額、貨幣、付款人與分帳參與者。
- 刪除誤建的支出。
- 支援 TWD、JPY、USD、EUR，並以旅行的基準貨幣計算餘額；每趟旅行可自訂匯率。
- 顯示每位參與者的分帳餘額與 settle up 結清建議。
- 在支出群組工作區用「總覽、記帳、支出紀錄、成員、設定/匯出」分頁完成日常操作；總覽含花費圖表，支出可加分類/標籤，紀錄可搜尋、篩選與排序，已結束的群組可封存保留，刪除則會移除資料。
- 匯出支出群組支出、餘額與結清建議 CSV，並可用列印按鈕輸出適合列印的結算畫面。

## 技術

- 前端：Vite + TypeScript。
- 後端：Express + TypeScript。
- 資料庫：PostgreSQL + raw SQL migrations。
- 共用拆帳邏輯：`src/shared/`。
- 格式與 lint：Biome CI。
- Git hook：`.pre-commit-config.yaml` 可用 `prek install` 安裝。

## 本機開發

```bash
npm install
docker compose -f compose.dev.yml up --build
```

開啟 <http://localhost:3420>。dev compose 會啟動 Postgres、執行 `npm run migrate`，再啟動 app。

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

`npm run check` 會執行 Biome CI、TypeScript typecheck、測試與 production build。

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
DATABASE_URL=postgres://user:pass@db:5432/otter docker compose -f compose.yml up --build
```

Development container（含 Postgres）：

```bash
docker compose -f compose.dev.yml up --build
```

兩個 compose 檔都會把 app 暴露在 <http://localhost:3420>；container 啟動時會先套用 migrations。

Production session cookie 在 `NODE_ENV=production` 時預設使用 `Secure`；只有在可信任的 HTTP 測試環境才設定 `COOKIE_SECURE=false`。

## 貨幣與匯率限制

支援貨幣：TWD、JPY、USD、EUR。每趟旅行可在設定頁自訂匯率；未設定的幣別會使用固定原型匯率。若要正式用於長期或高金額記帳，下一步應接即時匯率。

## CI

GitHub Actions 設定在 `.github/workflows/ci.yml`，流程為：

```bash
npm ci
npm run check
```
