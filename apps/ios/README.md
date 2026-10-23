# Otter for iOS

Swift 6／SwiftUI 原生 iPhone、iPad App，使用既有 Otter REST API 與帳號資料，不是 WebView 外殼。

## 實作狀態

目前已加入下列原生介面與 client：

- Username／密碼註冊及登入、Passkey 註冊／登入／管理、受限 API token 登入。
- 帳號 Username、API token 建立／列表／撤銷、裝置授權批准。
- 群組建立、改名、複製、封存／還原、刪除、基準幣別、自訂匯率、Visa 與 API 修改權限。
- 成員新增、改名、刪除、合併、結算代表人；協作者及三種分享模式。
- 四種分帳、支出編輯／複製／刪除、搜尋／篩選／排序／分組、修改紀錄與版本還原。
- 相簿／相機收據、上傳／替換／刪除、支出建立後只重試收據。
- 總覽、部分付款、付款紀錄刪除、花費分析與成員帳務明細。
- CSV 匯入／匯出、JSON v1／v2 還原、系統檔案匯出及列印。
- 本機支出預設、持久化離線新增佇列、原操作 ID 重試、孤立草稿清理。
- AI provider 連線、prompt／device code、provider／model／thinking level 設定；不執行推論。
- 6 種配色、3 種顯示模式、18 種語言選擇。

**尚未宣告完整 Web parity。** String Catalog 已加入 839 個 keys × 18 種語言，通過實際編譯及 26,136 個獨立複數／插值 runtime cases。原生字串、日期、金額、列印與 iPad 分欄已接上，仍須完成 source-key audit 與最新整合 UI 驗證。Camera usage descriptions 有 18 份資源。真機 Passkey、Data Protection、正式 AASA、Provider live login 與可及性也尚未全部驗收。不要把可見介面、mock tests 或編譯成功當作完整驗收。

完整進度及門檻見 [`../../docs/plans/2026-10-23_ios-web-parity-plan.md`](../../docs/plans/2026-10-23_ios-web-parity-plan.md)。

## 開啟專案

需要完整 Xcode 16 或更新版本、Swift 6、XcodeGen；僅安裝 Command Line Tools 不足以建置 iOS App。最低 deployment target 為 iOS 17。

從 repository root 執行：

```bash
# 尚未安裝時執行。
brew install xcodegen

xcodegen generate --spec apps/ios/project.yml --project apps/ios
```

在 Xcode 開啟 `apps/ios/Otter.xcodeproj`，選擇 `Otter` scheme 與 Simulator 後執行。實體裝置需選擇自己的 Development Team，並使用可存取的 HTTPS server。

`project.yml` 是專案來源。不要提交產生的 project、Info.plist、DerivedData、測試結果或 `.build/`。

### Passkey 與網域關聯

`Otter/Otter.entitlements` 包含正式站的 `webcredentials`／`applinks`。必須在對應 server 設定實際簽章的 `IOS_APP_ID`，部署有效 AASA JSON，並確認 `PASSKEY_ORIGIN`、RP ID 與 entitlement 網域一致。詳見 [`../../docs/deployment.md`](../../docs/deployment.md)。自訂 server 不會自動取得已簽章 App 的 Associated Domains。

- 目前尚未有正式站關聯或簽章真機驗證通過的證據。
- iOS 17.0–17.3 的 platform credential registration API 沒有 `excludedCredentials`。若伺服器要求排除既有 credentials，App 會要求更新系統，而不會丟棄排除清單或使用 private API。
- 不可用密碼備援假設取代 Passkey-only 帳號驗收；Web 允許無密碼帳號。

## 登入與權限

一般使用者可直接以 Username／密碼註冊或登入，不需先到網頁取得 API token。完整登入使用受控 session cookie；只有受限 token 模式需要群組擁有者允許 API 修改。

- Session、Bearer、guest share 與公開唯讀 request 分離，不混送憑證。
- Session owner 可在原生群組設定管理 API 修改權限。Bearer 不能開啟此權限。
- 封存群組禁止日常資料修改，但 owner 仍可管理存取權、API 權限、複製、取消封存與刪除。
- 唯讀分享不提供收據、付款明細、歷史、協作者或 owner 資料；訪客修改只限該分享群組。
- 登出完整 session 會呼叫伺服器失效 session，再清除本機憑證。Token 模式的登出只清除本機憑證；撤銷 token 是獨立操作。

Server URL 只接受 origin，不接受 path、query、fragment 或帳密。正式環境必須使用 HTTPS；Simulator 可使用 `http://localhost:17463` 連到 Compose stack。實體裝置的 localhost 不會指向開發電腦。

憑證存在 Keychain，使用 `WhenUnlockedThisDeviceOnly`，不存入 UserDefaults、檔案或 iCloud。舊 MVP 的 server／token 格式仍可讀取。密碼不持久保存。HTTP transport 不使用共享 cookie jar、response cache 或 redirect；不把帳號憑證送到 Provider 或不同 origin。

## 本機資料與提交結果

離線佇列與支出預設使用不同的 Application Support 檔案，以 origin／user ID／trip ID 隔離。佇列 actor 先完成持久化，再顯示保存成功；送出前保存 attempted 狀態、原 body 與 UUID。iOS 檔案設有保護並排除裝置備份；不可把本機草稿當作群組備份。

- 登出／切帳號停止同步，不刪除或跨帳號重送草稿。
- 未知提交結果只能重試原 `Idempotency-Key`、`X-Otter-Queue-User` 與原 body；不直接改內容後重新建帳。
- 權限、封存或資料衝突保留本機資料，等待明確處理。容量不足或格式驗證失敗不宣稱已保存，也不刪原檔。
- 照片不進離線佇列。只有新增支出可排隊，其他修改仍需連線；不保證離線冷啟動或背景同步。
- 沒有 idempotency 契約的付款、CSV 匯入或 JSON 還原若回應不明，須先核對伺服器結果，不盲目重送。
- 支出 PATCH／DELETE、收據與還原沿用觀察到的 quoted `If-Match`；412 後保留草稿並要求檢查最新資料，不猜版號或自動覆寫。

## 驗證

從 repository root 執行。以下只使用測試資料及專用 Simulator，不重設共享或 production 資料庫。

```bash
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer

swift test --package-path apps/ios
xcrun swift-format lint --strict --recursive \
  --configuration '{"indentation":{"spaces":4}}' \
  apps/ios/Sources apps/ios/Tests apps/ios/Otter apps/ios/UITests \
  apps/ios/LiveUITests apps/ios/Integration apps/ios/Package.swift \
  apps/ios/CrossClientIntegration

xcodegen generate --spec apps/ios/project.yml --project apps/ios
xcodebuild -project apps/ios/Otter.xcodeproj -scheme Otter \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath apps/ios/DerivedData CODE_SIGNING_ALLOWED=NO build

# 將 DEVICE_ID 換成專用 Simulator UUID。
# Keychain 的實際讀寫需要 ad-hoc 簽章；不需要 Apple certificate 或 Team。
xcodebuild -project apps/ios/Otter.xcodeproj -scheme Otter \
  -destination 'platform=iOS Simulator,id=DEVICE_ID' \
  -derivedDataPath apps/ios/DerivedData \
  CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- test

npm run check

# DATABASE_URL 必須連到測試 PostgreSQL，且可建立／刪除測試 schema。
# Harness 只操作自己建立的 schema，不修改既有 application tables。
DATABASE_URL=<test-database-url> npm run test:ios:integration
DATABASE_URL=<test-database-url> npm run test:ios:integration -- --ui
DATABASE_URL=<test-database-url> npm run test:ios:integration -- --ui-ipad
# --web 另需 Playwright Chromium；每種模式使用另一個 server／schema，不能合併。
npx playwright install chromium
DATABASE_URL=<test-database-url> npm run test:ios:integration -- --web
```

- Native CI uses macOS 26, Xcode 26.6, and the matching iOS 26.5 Simulator. The cross-client job keeps macOS 15 and its default Swift toolchain for Swift 6.1 coverage.
- Swift package suites 使用測試 transport／記憶體 store，包含 DTO、金額、權限、queue、preferences 與失敗路徑。
- `OtterTests` 是 hosted App tests，含 editor、management、真實 Simulator Keychain 與本機檔案保護；使用唯一測試 namespace，不清除實際帳號資料。
- `--ui-diagnostic-group` 與 `--ui-diagnostic-expense` 只執行指定 workflow，仍使用真實 API、280 秒 allowance 與嚴格 xcresult 數量。這些診斷不替代 `--ui`／`--ui-ipad` 的七案例完整驗收。
  - Add `--ui-ipad` to either diagnostic command to run it on iPad.
  - The group diagnostic runs owner permissions, archive, restore, and copy. The expense diagnostic runs all three expense cases.
- `OtterUITests` 是不需 PostgreSQL 的四案例登入 smoke tests。`OtterLiveUITests` 則由 harness 啟動真實 API，不能以沒有設定 origin 的執行取代驗收。
- Integration harness 使用真實 Hono、PostgreSQL、migrations 與 Swift URLSession；只把外部銀行／Visa 報價換成可重現資料。沒有假造 Provider 登入成功。
- `--web` 使用真實 Web 密碼登入及檔案下載，與同帳號的 Swift App client 比較 ID、版本、指定份額、付款、分享邊界、CSV／JSON 及重開 process 後的 queue replay。這是 macOS Swift client，不替代完整 iPhone／iPad UI 操作。
- `.github/workflows/ios.yml` 分開執行 iPhone／iPad native matrix 與 browser↔Swift jobs；各自啟動 loopback-only PostgreSQL process，不使用 macOS Linux service containers。
- Unsigned build 只證明可編譯；unsigned Simulator 的 Keychain 可能回傳 `-34018`，不能用它跳過憑證保存檢查。
- 以上均不能取代真機 Passkey、Associated Domains、相機、實體列印、VoiceOver 或外部 Provider 帳號驗收。
