# Streamable HTTP MCP

Otter 提供遠端 MCP endpoint `/mcp`，讓支援 Streamable HTTP 的 client 查詢及修改群組資料。此 endpoint 與瀏覽器內的實驗性 WebMCP 不同，不需要 Chrome flag。

## 連線

1. 在 Web app 的「帳號設定 → API token」建立 token，並立即保存至 secret manager。
2. 將 MCP client 設為 Streamable HTTP，URL 使用 `https://otter.narumi.dev/mcp`，或自行部署的 HTTPS origin 加上 `/mcp`。
3. 每個請求都必須帶 `Authorization: Bearer <token>`。Token 與 CLI 共用既有到期及撤銷規則；不接受 browser cookie 或分享連結憑證，也不提供 MCP OAuth 登入。

VS Code 的 `.vscode/mcp.json` 範例會提示輸入 token，不把明文 token 寫入檔案：

```json
{
  "servers": {
    "otter": {
      "type": "http",
      "url": "https://otter.narumi.dev/mcp",
      "headers": {
        "Authorization": "Bearer ${input:otter-token}"
      }
    }
  },
  "inputs": [
    {
      "id": "otter-token",
      "type": "promptString",
      "description": "Otter API token",
      "password": true
    }
  ]
}
```

其他 client 的設定格式可能不同，但 URL、transport 與 Authorization header 相同。Client 必須支援自訂 Bearer header；只支援 OAuth 的 client 目前無法使用。

本機 Compose 使用 `http://localhost:17463/mcp`。執行 `npm run dev:server` 時，可使用 Vite 的相同路徑，或直接連 API 的 `http://localhost:17464/mcp`。只有可信任的本機環境可使用 HTTP。

## 工具

| 工具 | 功能 |
| --- | --- |
| `otter_list_trips` | 列出目前帳號的活動及封存群組。 |
| `otter_get_trip` | 讀取群組、成員、支出及版本、餘額、結清建議與付款紀錄。 |
| `otter_get_balances` | 讀取成員餘額。 |
| `otter_get_settlements` | 讀取結清建議，不記錄付款。 |
| `otter_create_trip` | 建立群組，API 修改權限預設關閉。 |
| `otter_update_trip` | 重新命名、封存或取消封存；僅擁有者可操作。 |
| `otter_delete_trip` | 刪除群組；僅擁有者可操作。 |
| `otter_add_participant` | 新增記帳參與者，不授予帳號存取權。 |
| `otter_rename_participant` | 修改參與者名稱。 |
| `otter_delete_participant` | 刪除未被支出或付款引用的參與者。 |
| `otter_add_expense` | 新增支出，以 `participantIds` 均分。 |
| `otter_update_expense` | 修改支出；提供 `participantIds` 時改為均分。 |
| `otter_delete_expense` | 刪除支出。 |
| `otter_record_settlement` | 記錄已完成的付款，不會實際轉帳。 |
| `otter_delete_settlement` | 刪除付款紀錄，不會撤回實際付款。 |

使用工具前，client 可透過 `tools/list` 取得完整 input schema。金額輸入 `amount` 為主要貨幣單位的 decimal string，例如 USD `"12.50"`；`amountMinor` 輸出為最小貨幣單位的 integer。餘額與結清工具同時回傳 `currency` 與 `unit: "minor"`。分類使用既有 Otter 分類值，不接受任意文字。

## 權限與錯誤

- 所有讀取和修改均沿用既有 API 的群組成員、擁有者、封存與資料驗證規則。
- 修改既有群組前，擁有者必須在瀏覽器的「群組設定 → API 修改權限」允許 API token 修改。MCP 不能開啟此權限。
  - 新建群組不需要既有群組的權限，但建立後仍須在瀏覽器開啟修改權限。
- 所有刪除工具都要求 `confirm: true`；client 應先取得使用者確認。此欄位不是額外的身分驗證。
- 修改或刪除支出必須提供 `version`，取自最新 `otter_get_trip` 結果。
  - 版本衝突回傳狀態 412。重新讀取資料並確認修改內容，不要猜測版本或自動覆寫。
- 工具結果的文字 JSON 與 `structuredContent` 均為 `{ "status": 200, "data": ... }`。
  - REST API 錯誤使用原 HTTP status，例如 400、403、404、409、412，並標記 `isError: true`。此時 MCP HTTP response 通常仍為 200。
  - Schema 驗證錯誤使用 SDK 的工具錯誤格式，不保證包含 `status` 或 `data`。
  - MCP endpoint 缺少、到期或撤銷 token 時，HTTP response 為 401，並帶 Bearer challenge。
- 工具不提供帳號、Passkey、token、協作者、分享連結、收據上傳或備份管理。

## 傳輸與部署

- `/mcp` 使用官方 TypeScript SDK 的 stateless Streamable HTTP JSON response 模式。
  - 每個請求獨立驗證 token，不建立 MCP session，不回傳 `Mcp-Session-Id`。
  - 不提供 standalone GET SSE stream、server notification 或斷線續傳；GET、DELETE 與其他非 POST method 回傳 405。此行為符合不提供這些選用功能的 Streamable HTTP server，不是舊版 HTTP+SSE transport。
- POST client 必須接受 `application/json` 及 `text/event-stream`，並使用 `Content-Type: application/json`。SDK 負責 JSON-RPC 與 protocol version 驗證；不接受舊版 JSON-RPC batch array，這類請求回傳 400。
- 請求 body 上限為 1 MiB；包含無 Content-Length 的串流 body。超過限制回傳 413。
- 不開放跨 origin browser CORS。一般 server-to-server client 不送 Origin；如果提供 Origin，必須與可信任的公開 origin 完全相同，否則回傳 403。
  - 設定既有 `PASSKEY_ORIGIN` 時，以該 origin 驗證，支援 HTTPS reverse proxy；未設定時，以 API request URL 的 origin 驗證。
  - 不信任 client 提供的 `X-Forwarded-*` header 來決定 MCP origin。HTTPS proxy 部署應明確設定 `PASSKEY_ORIGIN`。
- Reverse proxy 必須將 `/mcp` 送至 API，保留 Authorization、Accept、Content-Type 與 MCP protocol headers；不可回傳 SPA HTML 或快取 MCP response。
- 正式環境使用 HTTPS。不要在 URL、log、版本控制或公開 client 設定中放入 token。
- 不新增資料庫 migration、環境變數或 cookie 行為。回復前一版部署或封鎖 `/mcp` 即可停止此服務；已寫入的資料不會自動還原，可依既有支出歷史修正。疑似洩漏的 token 應從帳號設定撤銷。

## 驗證

```bash
DATABASE_URL=postgres://user:password@localhost:5432/otter_test \
  npm test --workspace @narumitw/otter-api -- \
  src/server.mcp.test.ts src/server-mcp-tools.test.ts
```

整合測試會建立並清除獨立 PostgreSQL schema，驗證 SDK client 初始化、工具查詢、金額修改、權限、版本衝突與 HTTP 邊界。未設定 `DATABASE_URL` 時，資料庫測試會略過；工具單元測試不需要資料庫。
