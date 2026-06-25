# otter

otter 是一個為旅行和朋友聚會設計的網頁記帳拆帳 app，協助使用者記錄共同支出、整理每個人的付款狀況，並計算最後誰要付給誰多少錢。

## 功能

- 註冊、登入、登出。
- 建立、重新命名與刪除旅行 / 群組。
- 新增、重新命名與刪除未使用的參與者。
- 記錄支出：日期、描述、付款人、金額、貨幣、分帳參與者，並可修改日期、描述、金額、付款人與分帳參與者。
- 刪除誤建的支出。
- 支援 TWD、JPY、USD、EUR，並以旅行的基準貨幣計算餘額。
- 顯示每位參與者的分帳餘額與 settle up 結清建議。
- 匯出旅行支出 CSV。

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

開啟 <http://localhost:3000>。dev compose 會啟動 Postgres、執行 `npm run migrate`，再啟動 app。

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

兩個 compose 檔都會把 app 暴露在 <http://localhost:3000>；container 啟動時會先套用 migrations。

## 貨幣與匯率限制

支援貨幣：TWD、JPY、USD、EUR。原型目前使用固定匯率換算成旅行基準貨幣；若要正式用於長期或高金額記帳，下一步應接即時匯率或允許每趟旅行自訂匯率。

## CI

GitHub Actions 設定在 `.github/workflows/ci.yml`，流程為：

```bash
npm ci
npm run check
```
