# Otter CLI

`@narumitw/otter-cli` 是給 scripts、CI 與 AI agents 使用的非互動式 CLI。它透過 Otter HTTP API 管理群組、參與者、支出、餘額與結清紀錄，資料結果固定輸出 JSON。

CLI 需要 Node.js 20 或更新版本。

## 安裝

```bash
npm install --global @narumitw/otter-cli
otter --help
```

從 repository 開發：

```bash
npm run build:cli
npm link --workspace @narumitw/otter-cli
otter --help
```

## 登入

CLI 預設連線至 `https://otter.narumi.dev/`。第一次使用時執行：

```bash
otter auth login
```

CLI 會開啟 `/device` 並顯示一次性 code。使用者在瀏覽器登入並核准後，CLI 取得 90 天有效的 Bearer token。Device code 10 分鐘後失效且只能兌換一次。若無法開啟瀏覽器，使用 `otter auth login --no-open` 並手動開啟顯示的 URL。

Token 依 server URL 儲存在 `~/.config/otter/credentials.json`，檔案權限為 `0600`。伺服器只保存 token hash。執行 `otter auth logout` 會撤銷目前 token 並移除本機 credentials。

連線其他 server 時設定：

```bash
OTTER_URL=http://localhost:17463 otter auth login
```

遠端 URL 預設必須使用 HTTPS。只有明確設定 `OTTER_ALLOW_INSECURE_HTTP=1` 時，CLI 才會把 credentials 送到非本機 HTTP URL。

## 自動化

無狀態 agent 或 CI 應在 Web app 的「帳號設定 → API token」建立 token，立即複製到 secret manager，再以環境變數提供：

```bash
OTTER_TOKEN='otter_api_…' otter auth status
OTTER_TOKEN='otter_api_…' otter trips list
```

明文 token 只顯示一次。帳號、Passkey、協作者、分享連結、token 管理及 device approval 仍要求 browser session；Bearer token 不能執行這些操作。

## 常用命令

```bash
otter trips list
otter participants list --trip trip-id
otter expenses add \
  --trip trip-id \
  --description Dinner \
  --amount 1200 \
  --currency TWD \
  --paid-by participant-id \
  --split-with participant-id,other-participant-id
otter balances get --trip trip-id
otter trips get --trip trip-id > trip.json
otter settlements preview --input trip.json
```

`settlements preview` 會以 `packages/contracts` 驗證保存的 trip payload，再以 `packages/core` 在本機計算餘額及結清建議，不需要 token 或網路。使用 `--input -` 可從 stdin 讀取。

金額輸入使用主要貨幣單位，例如 USD `12.50`；JSON 的 `amountMinor` 使用最小貨幣單位。CLI 會先驗證貨幣、金額、日期、分類及分帳清單，API 仍是最終驗證權威。刪除命令必須明確加上 `--yes`。

完整命令見 `otter --help`。Repository 內也可執行：

```bash
npm run --silent otter -- --help
npm run --silent otter:built -- --help
```

給 AI agent 的操作流程位於 [`skills/otter-manage-expenses/SKILL.md`](../skills/otter-manage-expenses/SKILL.md)。Package 摘要見 [`packages/cli/README.md`](../packages/cli/README.md)。
