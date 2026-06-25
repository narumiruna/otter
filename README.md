# otter

otter 是一個為旅行和朋友聚會設計的網頁記帳拆帳 app，協助使用者記錄共同支出、整理每個人的付款狀況，並計算最後誰要付給誰多少錢。

## 功能

- 註冊、登入、登出。
- 建立旅行 / 群組。
- 新增參與者。
- 記錄支出：描述、付款人、金額、貨幣、分帳參與者。
- 支援 TWD、JPY、USD、EUR，並以旅行的基準貨幣計算餘額。
- 顯示每位參與者的分帳餘額與 settle up 結清建議。

## 技術

- 前端：Vite + TypeScript。
- 後端：Express + TypeScript。
- 共用拆帳邏輯：`src/shared/`。
- 早期原型資料保存：JSON 檔案，預設在 `data/otter.json`。
- 格式與 lint：Biome CI。
- Git hook：`.pre-commit-config.yaml` 可用 `prek install` 安裝。

## 本機開發

```bash
npm install
npm run dev
```

開啟 <http://localhost:3000>。

常用檢查：

```bash
npm run typecheck
npm test
npm run biome:ci
npm run check
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

Production-like：

```bash
docker compose -f compose.yml up --build
```

Development container：

```bash
docker compose -f compose.dev.yml up --build
```

兩個 compose 檔都會把 app 暴露在 <http://localhost:3000>，並用 Docker volume 保存資料。

## 貨幣與匯率限制

支援貨幣：TWD、JPY、USD、EUR。原型目前使用固定匯率換算成旅行基準貨幣；若要正式用於長期或高金額記帳，下一步應接即時匯率或允許每趟旅行自訂匯率。

## CI

GitHub Actions 設定在 `.github/workflows/ci.yml`，流程為：

```bash
npm ci
npm run check
```
