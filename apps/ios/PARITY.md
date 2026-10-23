# iOS parity verification map

此表記錄實作入口與驗證範圍，不代表所有項目已驗收。完整完成條件仍以 `docs/plans/2026-10-23_ios-web-parity-plan.md` 為準。

Baseline：Web/API `0cb4dfd4719f3e3f17a2348db9285cd06351729e`，加上工作目錄中的 iOS、AASA route 與測試變更。使用現有 26 migrations，不新增或移除業務資料表。

## 功能、routes 與測試

`LiveIntegration.swift` 使用真實 Hono／PostgreSQL／Swift URLSession。`Differential.swift` 比較 TypeScript core 與 Swift 的同一組輸入。App tests 使用替代 transport 驗證 UI state；不能將它們當作 live UI 或真機證據。

| ID | 原生入口／主要 API | 已有測試入口 | 尚需完成的驗收 |
| --- | --- | --- | --- |
| P01 | `LoginView`、`PasskeyCoordinator`、`AppSession`；`/api/auth/register`、`login`、`logout`、`passkey/*`、`GET /api/me` | `AuthTransportTests`、`AppSessionTests`、`SessionStoreTests`、`LoginUITests`；live `password registration and login return session`、`session account identity`、logout checks | 真實 UI 全流程、Passkey-only 真機註冊／登入；iOS 17.0–17.3 credential exclusion 限制處置 |
| P02 | `AccountSettingsView`；`PATCH /api/me` | live `cookie-only account rename`、`bearer cannot rename account` | 原生改名與失敗保留輸入 UI |
| P03 | `PasskeyCoordinator`／account keys；`GET /api/passkeys`、`POST /registration/{options,verify}`、`DELETE /:credentialId` | live `cookie-only passkey list`、既有 API Passkey suites | 真機多組 key、取消、到期、最後一組保護；AASA 與簽章 |
| P04 | `TokenSettingsView`、`DeviceApprovalView`；`/api/auth/tokens`、`/api/auth/device/:code`、`/approve` | token replay／revoke live cases、`AuthTransportTests.tokenRequestUsesStableIdentityAnd32RandomBytes`、既有 API device suites | 原生 token 未知結果、device link/login/approval UI |
| P05 | `TripListView`、`GroupSettingsView`；`/api/trips` CRUD、`/:id/copy` | live group/lifecycle/copy checks、`GroupManagementRulesTests`、`GroupManagementStateTests` | 完整原生 lifecycle、同名與未知建立結果 UI |
| P06 | `GroupSettingsView`；`PATCH /api/trips/:id`、`GET /api/exchange-rates/:currency` | API-write permission live checks、custom rates live checks、`clearingCustomRatesUsesAnEmptyObjectNotNull`、rate preview tests | 原生預覽／確認、失敗資料不變、最新報價 UI |
| P07 | `PeopleView`；participants CRUD、`/:id/merge`、`settledById` PATCH | live participant/representative/merge checks；rules deletion/name/merge/representatives cases | 成員管理、合併影響、代表人限制的原生 UI |
| P08 | `ExpenseEditorView`／state；expenses POST/PATCH/DELETE | 4-mode CRUD live cases、412 live checks、`ExpenseEditorTests`、finance/split differential cases | 原生完整表單及衝突流程；UTF-16 邊界 UI |
| P09 | `ExpenseBrowserView`、`ExpenseQuery`；群組 GET 後本機查詢 | `ExpenseQueryTests`、differential query fixtures | 全篩選／排序／分組、欄位與返回狀態 UI；不同語言 collation |
| P10 | `ReceiptPickerView`、`ReceiptImageEncoder`；receipt GET/PUT/DELETE | live PNG roundtrip、editor receipt sequencing／version／retry tests | 相機／PhotosUI 權限、選圖、上傳及故障真機操作 |
| P11 | `ExpenseHistoryView`、restore review；`GET expense-history`、`POST expenses/:id/restore` | live revision／deleted restore／412 checks；editor snapshot/version review tests | 原生分頁、差異與還原確認 UI |
| P12 | `OverviewView`、`PaymentEditorView`；settlement-payments POST/DELETE | live payment checks、finance tests、mutation outcome tests | 原生部分付款、日期／備註、刪除與不明回應操作 |
| P13 | `AnalysisView`；`Finance.spendingSummary`／`memberAccounts(payload:)` | finance/differential snapshots、floating payments、Visa、representative、readonly overlay tests | 真實 UI 圖表、展開明細、長內容與可及性 |
| P14 | `AccessSettingsView`；members POST/DELETE | owner/editor/nonmember live checks、management state guards | 原生邀請／移除及角色變動 UI |
| P15 | `IncomingLinkView`、`ShareClient`、`AccessSettingsView`；`/api/share/:token`、`/join`、share-links POST/DELETE | 3 modes/privacy/revocation live checks；`IncomingLinkTests`；URL validation rules | cold/warm Universal Links 真機、登入邀請銜接與全部原生 guest/readonly 操作 |
| P16 | `TripDataToolsView`、`CSV`；`POST expenses/import`、本機 CSV export | CSV fixture/BOM/quoted multiline/CRLF/9 currencies tests；live import checks | Files picker、失敗保留、未知結果與原生匯出互通 |
| P17 | `TripDataToolsView`、`RestoreBackupView`、`BackupPreview`；`GET backup`、`POST /api/trips/restore` | backup preview/v1/v2/range/representative/Visa tests；live backup roundtrip | 原生 Files 互通、還原預覽、未知提交結果 |
| P18 | `PrintSettlementView`、`CSV.printHTML`；UIKit 系統列印 | HTML escaping、120 rows、公開資料範圍 tests | 全語言排版、多頁與真機／AirPrint |
| P19 | `ExpenseDefaultsStore`、editor save/clear、`ExpenseDefaultsResetView`；本機檔案 | `ExpenseDefaultsTests`、queued/new/copy/default tests | 原生明確保存／清除、容量不足與跨帳號 UI |
| P20 | `ExpenseQueue`、`LocalExpenseState`、`ExpenseQueueView`、`QueuedExpenseEditorView`；POST expenses 的 `Idempotency-Key`／`X-Otter-Queue-User` | `ExpenseQueueTests`、`MutationOutcomeTests`、`ExpenseLocalStorageTests`、6 個 hosted `LocalExpenseIsolationTests`；API replay tests | 真實斷線／回應遺失、foreground、重開及 orphan UI；physical Data Protection |
| P21 | `AISettingsView`／state；`/api/auth/ai/{catalog,settings,connections,logins}` | `AIClientTests`；live cookie-only catalog/settings/connections reads；既有 Web/API AI suites | 專用 Provider 帳號的各類登入、取消／背景／重啟、解除與設定 UI；不是推論測試 |
| P22 | `AppPreferences`、`AppearanceSettingsView`、String Catalog、InfoPlist resources | preferences 9 tests；839 keys × 18 locales；實際編譯與 26,136 runtime cases；source audit 0 gaps、61 tooling tests；18 camera descriptions；hosted bundle／print／6 色 contrast tests | 最新 18 語言 UI 操作、VoiceOver、AX 字級、Reduce Motion 與 physical print；不把 source/runtime 字串證據當作全部畫面驗收 |
| P23 | `TripDetailView`、`AppNavigation`、`IncomingLink`、`NavigationSplitView`、原生 sheets／tabs | incoming-link tests 含 40 個 mode／view／account 組合、encoded controls、stale-generation；editor/management state tests；3 個最新 login smoke UI | editor/account settings 及 Universal Links 實際操作、返回／捲動、iPad 旋轉／split、VoiceOver、AX 字級、Reduce Motion |
| P24 | 瀏覽器 `document.modelContext`；既有遠端 `/mcp` | 現有 WebMCP／MCP suites，不是假造原生 API | 平台例外的明確接受；目前沒有將此項標為完成 |

## 認證與操作矩陣

以下是允許方向；伺服器每次 request 仍會重驗。讀取到舊 payload 不會授予新的權限。

| 模式 | 讀取／歷史 | 日常修改 | owner 設定 | access／API 開關 | JSON backup／restore | 本機 queue |
| --- | --- | --- | --- | --- | --- | --- |
| Session owner，active | 是 | 是 | 是 | 是 | owner 可下載；登入帳號可還原新群組 | 是 |
| Session editor，active | 是 | 是 | 否 | 否 | 不可下載完整 backup；可還原為自己的新群組 | 是 |
| Session owner，archived | 是 | 否 | 名稱／貨幣／Visa／匯率否；可複製、還原、刪除 | 是 | 依 owner／登入規則 | 不新增 |
| Bearer owner/editor | 是 | 需要 API writes 且 active | owner 操作另需 API writes | 不可管理 access 或 API 開關 | 下載另需 owner；可還原新群組 | loaded/active、有效 user ID 與 API write permission |
| Anyone-edit guest | 僅自己的 trip；可讀歷史 | active 時可維護日常資料 | 否 | 否 | 否 | 否 |
| Readonly share | 僅公開 payload；無歷史／收據／付款明細 | 否 | 否 | 否 | 否 | 否 |
| Anonymous／到期／非成員 | 除公開分享外拒絕 | 拒絕 | 拒絕 | 拒絕 | 拒絕 | 不自動同步 |

## 驗證證據的限制

- Package tests、App state tests、real API tests、real UI tests、真機及外部 Provider 驗證分開記錄；不能互相取代。
- Unsigned Simulator build 不能證明 Keychain 可保存憑證。含 Keychain 的測試使用 ad-hoc signing，並只操作唯一測試 namespace。
- 銀行／Visa quote services 在 integration harness 以固定報價替換；不能把 fixture 通過當成外部報價站可用。
- 詳細執行時間、通過／失敗／skip 數與未完成項目持續寫入當前計畫，直到完整驗收後才關閉。
