# iOS 與 Web 完整功能對齊計畫

## Goal

將 `apps/ios` 從 SwiftUI MVP 補齊為與目前 Otter Web 功能等價的原生 iPhone／iPad App。使用同一個帳號、群組與 PostgreSQL 資料；相同操作必須產生相同資料、金額與權限結果。

- 「完整」包含帳號、Passkey、群組、支出、收據、歷史還原、分析、協作、分享、資料工具、離線佇列、AI 設定、語言與外觀，不只包含日常記帳。
- 採用原生導覽與控制項，不要求逐像素複製 Web。不得以「開啟網頁版」代替尚未完成的產品功能。
- Provider 自有登入頁可使用系統瀏覽器，與 Web 的外部授權流程相同；Otter 的設定與操作仍在原生介面完成。
- Chrome WebMCP 是待確認的平台例外，見 P24。未取得明確接受前，不得將它標為已對齊。
- 2026-10-23 已依使用者 Goal 指示開始實作。執行時更新本檔；所有驗收完成後才刪除此計畫。

## Context

### 盤點基準

本計畫於 2026-10-23 盤點。Repository HEAD 為 `0cb4dfd`；目前 iOS MVP、其 Changeset 與 README 連結仍在工作目錄，不能只依 HEAD 判斷 iOS 現況。開始實作前須記錄實際採用的 Web/API commit 與 iOS baseline，避免網頁功能持續增加而沒有固定驗收範圍。

主要依據：

- 產品與操作規則：`docs/product.md`、`docs/expense-editor-navigation.md`、`docs/visa-settlements.md`、`docs/ai-settings.md`、`docs/development.md`。
- Web：`apps/web/src/client/auth-screen.tsx`、`account-settings-page.tsx`、`workspace/`、`expense-queue.ts`、`expense-sync.ts`、`i18n/locales.ts`。
- API：`apps/api/src/server*.ts`；DTO：`packages/contracts/src/`；金額、分帳、帳務、CSV 與備份：`packages/core/src/`。
- iOS：`apps/ios/Sources/OtterKit/`、`apps/ios/Otter/Views/`、`apps/ios/README.md`、`apps/ios/project.yml`。
- 現有 Web 驗收：`apps/web/tests/e2e/`，尤其是 editor、history、analysis、member-accounts、defaults、sharing、AI、localization 與 Visa suites。

目前 iOS 只有手動 Bearer token 登入、Keychain 儲存、群組建立與讀取、成員新增、均分支出新增／刪除、餘額與簡化的付款記錄。先前驗證為 26 個 Swift package tests、2 個登入 UI tests 與 Simulator build；尚未完成真實帳號的完整流程驗收。這些結果不是功能對齊證明。

### 已確認的限制與文件差異

- Bearer token 不能取代 session。帳號、Passkey、token 管理、協作者、分享管理、device approval 與 AI 設定需要 session cookie。
  - AI routes 即使收到有效 cookie，也會拒絕 `Authorization` 與 `X-Otter-Share-Token`。
  - 現有 iOS client 永遠傳 Bearer，且停用 cookie，因此必須先重做認證邊界。
- `Trip.canWrite` 目前只看 `allowApiWrites` 與封存狀態，不適用完整 session／分享權限。不能繼續用單一 Bool 管理所有操作。
- Web 已支援 Passkey-only 註冊；不能假設每個帳號都有密碼備援。
- Web/API 已支援歷史版本與已刪支出還原；`docs/product.md` 的「目前不提供還原」已過時。
- 封存不代表所有操作都禁止。擁有者仍可管理存取權、API 修改權限、還原或刪除群組；須依實際 route 建立操作矩陣。
- Native Passkey、Associated Domains、AASA 與 Universal Links 尚不存在。任意自訂 server 不會自動取得 App 的網域關聯。
- Otter device authorization 只發出 API token，不會產生具完整設定權限的 session。不可用它繞過 session-only 規則。

## 功能對齊矩陣

「部分」代表現有 MVP 仍須補齊及回歸測試。每個 P 編號在驗收時須附自動測試名稱及必要的手動證據，不能只附畫面截圖。

| ID | Web 功能與 iOS 必須達到的結果 | iOS MVP baseline | 完成依據 |
| --- | --- | --- | --- |
| P01 | Username／密碼註冊與登入、Passkey-only 註冊、discoverable Passkey 登入、session 還原與登出；保留 token 登入作為受限模式 | 部分 | 真實 API 註冊→登入→重開 App→登出；Passkey 真機驗證；429／到期／取消案例 |
| P02 | 修改 Username；正規化、唯一性、長度、開發帳號限制與 Web 相同；修改後 session 仍有效 | 未有 | API／UI 驗證與重新登入案例；不新增 Web 沒有的顯示名稱或密碼修改功能 |
| P03 | 列出、新增、移除多組 Passkey；禁止 Passkey-only 帳號移除最後一組 | 未有 | AuthenticationServices、challenge expiry／replay、最後一組保護及真機案例 |
| P04 | API token 命名建立、一次性顯示／複製、列表與撤銷；開啟 `/device?code=...`、查看 client 並明確批准 | 未有 | token 90 天規則、未知建立結果不重複產生、device code 到期／重播及撤銷驗證 |
| P05 | 群組建立、選擇、重新命名、複製、封存、取消封存、輸入名稱後確認刪除 | 部分 | owner／editor 案例；同名拒絕；複製正確保留貨幣、匯率與 Visa 設定，但不複製帳目、協作或 API 修改權限 |
| P06 | 基準貨幣、自訂匯率預覽／保存／清除、銀行報價資訊、API 修改權限開關 | 未有 | 變更影響預覽；舊快照不改寫；session owner 可修改開關，Bearer 不可 |
| P07 | 成員新增、改名、刪除阻擋原因、合併、設定／解除 `settledById` 代表人 | 部分 | 重名、最後一人、支出／付款引用、多層代表人與合併後 ID／帳務案例 |
| P08 | 支出新增、編輯、刪除、複製為新支出；日期、付款人、9 種貨幣、4 種分帳、分類、標籤、逐人預覽 | 部分 | equal／amount／ratio／shares 尾差及守恆；只改描述不破壞指定份額；複製日期與快照政策相同 |
| P09 | 描述搜尋、日期範圍、付款人、分攤人、貨幣、分類與標籤篩選；日期／換算金額排序；日期／付款人／不分組；可選欄位或等價的列資訊設定 | 未有 | 與 Web 同資料的結果順序一致；回列表保留篩選、分組、捲動與來源支出 |
| P10 | 相簿選圖、拍照、收據預覽／上傳／替換／刪除；建立支出後可單獨重試收據 | 未有 | 5 MB 與 MIME 限制；HEIC 轉成支援格式或明確拒絕；權限拒絕、412 與上傳失敗不重複建帳 |
| P11 | 群組／單筆修改紀錄、cursor 分頁、操作者、欄位差異、快照、版本還原與已刪支出還原 | 未有 | 目前版本或最新刪除 revision 作為 `If-Match`；412 保留草稿；缺成員拒絕；不宣稱可還原舊收據圖片 |
| P12 | 總覽、每人餘額、待結清、最近支出；付款金額／日期／備註、部分付款與剩餘額預覽、付款紀錄刪除 | 部分 | Web→iOS 及 iOS→Web 的餘額一致；付款不等於轉帳；確認失敗保留輸入與對話框 |
| P13 | 每日／付款人／分類花費分析；成員實付、分攤、待收／待付與支出、付款、代表人調整明細 | 未有 | 原幣、基準幣與結清幣分離；與 core/Web 差分測試一致；唯讀分享不推測隱藏付款 |
| P14 | 邀請既有帳號成為 editor、顯示角色與列表、移除 editor | 未有 | owner/session 限制；移除不刪支出；不能移除 owner；被移除者下一次操作被拒絕 |
| P15 | 建立／撤銷 3 種分享；原生開啟唯讀、登入加入、免登入編輯連結；登入後繼續原邀請 | 未有 | readonly／signed-in-edit／anyone-edit 全流程；訪客 trip 隔離、撤銷／過期、敏感資料不外洩 |
| P16 | 支出與結算 CSV 匯出；檔案匯入、逐列錯誤預覽、確認後整批提交 | 未有 | Web/iOS 檔案互通；UTF-8、引號、換行、分類／標籤；任一列錯誤不寫入 |
| P17 | JSON 備份下載與還原成新群組；支援目前 v2 與相容 v1 | 未有 | 雙向互通、預覽與大小限制；保留匯率／Visa／代表人；不含照片、歷史或帳號秘密 |
| P18 | 結算內容列印與系統分享；以原生列印／PDF 提供等價結果 | 未有 | 多頁、長名稱、9 種貨幣、18 種語言不截斷；列印不含編輯控制項或未公開資料 |
| P19 | 明確保存／清除本機支出預設；帳號與群組隔離；不覆蓋編輯／複製／待同步草稿 | 未有 | 幣別與分帳模式／輸入值保存；成員失效提示；取消不隱式保存；清除不刪帳目或佇列 |
| P20 | 已載入群組的離線新增佇列、狀態、編輯、刪除、重試、孤立草稿清理及回前景同步 | 未有 | 操作 ID 去重、attempted-before-send、未知結果不改原請求、跨帳號不重送、容量不足不宣稱保存 |
| P21 | AI provider 連線／替換／取消／解除、API key／外部登入、prompt／device code、provider／model 搜尋、thinking level 保存 | 未有 | 依 catalog 與 SDK 限制；session 綁定、503／429／重啟／取消競態；秘密不在裝置落地、不新增推論功能 |
| P22 | 18 種語言、6 種配色、system／light／dark；偏好只保存在此裝置 | 未有 | String Catalog 完整性、複數與插值、地區語言對應、日期／金額顯示；切換不改資料格式 |
| P23 | 總覽／支出／分析／成員／群組設定五區；帳號設定；原生返回、直接連結、未保存確認、iPad 與可及性 | 部分 | 編輯中開關設定不丟草稿；晚到結果不改別頁；Dynamic Type、VoiceOver、橫向、鍵盤與 Reduce Motion |
| P24 | Chrome 專用 WebMCP／公開示範頁的處置 | 不適用原生 API，待接受 | 明列平台差異並取得接受；遠端 `/mcp` 保持相容。未接受前不得宣稱無例外全功能對齊 |

## Architecture

### 原生程式與資料邊界

- 保持 Swift 6、SwiftUI、iOS 17+、XcodeGen；不改成 WebView 外殼。
- `apps/ios/Otter` 放畫面、導覽、PhotosUI／相機、AuthenticationServices、系統分享與列印整合。
- `apps/ios/Sources/OtterKit` 放 DTO、API client、session、權限判斷、純函式與本機資料存取。依功能分檔；不先建立未使用的 service 或配置層。
- `apps/api` 與 `packages/*` 保持 TypeScript。Swift 不匯入或複製 API implementation，也不直接存取 PostgreSQL。
- 先沿用既有 REST routes。必要的 Passkey／網域關聯支援另以最小、向後相容變更處理；不得擴大 Bearer 權限以省略 native session。
- 金額輸入用 decimal string，DTO 用 integer minor units，遵守 JS safe integer 邊界。正式餘額與結清建議以 API 回傳為準。
  - Swift 必要的分帳預覽、換匯顯示、排序及分析依現有 core 規則移植，使用同一組測資做差分測試。
  - 不假設 Swift rounding 等同 `Math.round`，不改動既有快照、尾差、付款浮動匯率或 Visa 規則。
  - Web 內需要共用的純計算先移到 `packages/core`，去除介面字串依賴，Web 回歸通過後再供測試工具呼叫；不新增只為省測試而設的 production endpoint。

### 認證與權限

- 認證狀態明確分為 session、Bearer、trip-scoped guest capability 與公開唯讀。每個 request 只使用該情境需要的憑證，不混送 cookie／Bearer／share header。
- 原生 Username／密碼登入呼叫既有 auth routes；接收 session cookie，以受控 transport 傳送。Session 憑證保存在 Keychain；不依賴 Safari 或共享 cookie jar，不保存密碼。
  - 遵守 cookie 的 origin、Secure、Path 與有效期，不把 session 送到外部 provider 或 redirect。
  - 先驗證這條路徑能使用 session-only routes，再建帳號與分享管理介面。
- 權限依「認證類型 × role × 分享模式 × 封存 × 操作」判定；API 仍是最後防線。Token 登入維持 API 修改權限限制，不自動升級為 session。
- 保留現有 session generation 防護；request、polling、導覽與 mutation callback 都須辨識發起時的 server／帳號／session／群組，忽略過時結果。
- Native Passkey 使用 AuthenticationServices。官方網域需有效 signing identity、`webcredentials` Associated Domains、AASA、正確 RP ID／origin 與 WebAuthn JSON。
  - 自訂 server 的網域關聯與 Passkey-only 帳號登入必須先做可行性驗證。若需系統 Web 授權與一次性 session handoff，須先完成契約、安全設計及測試，不能假設現有 device token 可直接換 session。
  - 未解決的自訂 server Passkey 流程保留為缺項，不用密碼登入取代驗收。
- AI mutations 包含 bodyless DELETE 都送 `Content-Type: application/json`；遵守既有 Origin／Fetch Metadata 限制，不偽造瀏覽器來源來繞過驗證。

### 本機狀態與離線

- UI state 與 server state 分開。表單草稿不寫入 URL、導覽還原資訊、log 或 analytics。
- 偏好以 origin／user ID／trip ID 正確隔離；語言與外觀維持裝置層級。MVP Keychain 格式變更須提供不丟憑證的 migration。
- 離線佇列使用 iOS 17 可用的持久化儲存及單一同步 actor，提供檔案保護與版本 migration。
  - 本機新增成功提交後才顯示已保存；送出前先持久化 attempted 狀態、operation ID 與原始 JSON。
  - 以 `packages/contracts/src/expense-operation.ts` 的 `Idempotency-Key` 與 `X-Otter-Queue-User` 契約去重；重播仍須重新檢查帳號、權限與群組狀態。
  - 回應不明時原 ID 與原 body 不變；伺服器確定未記帳且資料需改動時，才建立新 ID。
  - 登出／切帳號只停止同步，不自動刪除舊草稿。訪客與唯讀不排隊；收據不進佇列。
  - 僅新增支出支援離線寫入；不擴充到離線修改、付款、設定或背景保證執行。不得把佇列保存等同完整離線冷啟動支援。

## Plan

依序拆成可獨立驗證的 PR。每個 PR 含 Changeset、對應測試與本檔進度；不以 UI 已出現判定完成。階段 2 之後可以分工，但所有整合仍受前置驗收約束。

### 0. 固定範圍與解決認證未知項

- [x] 盤點現有 Web、API 與 iOS，建立 P01–P24 矩陣；確認 session-only、Passkey-only、封存例外及歷史還原差異。證據為上述 source 路徑；未執行 live auth。
- [ ] 固定實作 baseline；為 P01–P24 列出 Web 入口、routes、允許／拒絕角色及對應測試名稱，取得功能等價與 P24 平台例外的範圍確認。
- [x] 用隔離測試帳號驗證 native session：註冊／登入後讀取帳號與 AI catalog，登出後 session 失效；Bearer／share 的 session-only 操作拒絕。證據：`scripts/test-ios-integration.ts` 的真實 Hono／PostgreSQL／Swift 執行，共 102 個 live assertions 通過，獨立 schema 已清除。
- [ ] 在簽章真機驗證 Passkey 註冊／登入、官方及自訂 server 關聯；驗證 share／device Universal Links。記錄 Team ID、部署需求、不能沿用既有流程的部分及最小補強方案。
- [x] 修正產品文件對還原、Passkey 備援與封存權限的落差。`docs/product.md` 已依 source 修正；真實 API harness 驗證歷史與刪除還原、封存 owner 操作例外；Passkey-only 最後一組保護仍由既有 API 實作。

出口條件：認證方案、網域需求與平台例外已決定；未解決的 Passkey-only 或 session 問題會阻擋「完整對齊」，不能排到最後才處理。

### 1. 補齊契約、認證 client 與權限模型

- [x] 補齊 Swift DTO 與 transport：角色、分享、份額、分類／標籤、收據、快照、歷史、`createdExpenseId`、錯誤 code／status／`Retry-After`、binary response 與必要 headers；以真實 API contract fixtures 驗證 decoding，不默默丟棄需要往返的欄位。
- [x] 分離 session／Bearer／share／public request，加入 cookie 與 Keychain migration、失效處理、server 切換及 operation capability tests；拒絕混送或跨 origin 洩漏憑證。
- [x] 移除把 `Trip.canWrite` 當成全域權限的用法；以操作矩陣測試 active／archived owner、editor、Bearer API 開／關、guest、readonly、非成員及已到期 session。
- [x] 建立差分測試工具與手寫案例，涵蓋 9 種貨幣、4 種分帳、尾差、safe integer、匯率快照／bridge、Visa 與代表人；運行時產生的參考輸出放暫存目錄，不提交 generated files。

出口條件：現有 26 個 package tests 與 2 個 UI tests 不退步，新增 contract、權限、並發與差分 tests 通過。

### 2. 登入、帳號、Passkey 與共用介面

- [ ] 完成 P01–P04：密碼及 Passkey-only 註冊／登入、Username、Passkey 管理、API token 管理與 device approval；包含最後一組 key、challenge 重播、限流與未知 token 建立結果的驗收。
- [ ] 建立 P23 五區導覽、iPad split layout、直接連結與草稿生命週期；返回、取消、切組、帳號設定與中斷請求均不丟資料或重送操作。
- [ ] 建立 P22 String Catalog、18 語言切換、6 配色與顯示模式基礎；後續功能必須同時補翻譯，不在最後一次性補字串。

出口條件：新使用者不需先到網頁取 token，即可完成註冊、建組與日常寫入；token 模式仍維持受限權限。

### 3. 群組、成員與計算設定

- [ ] 完成 P05–P07：群組 CRUD／copy／archive、匯率與 API 開關、成員 CRUD／merge／代表人；每個高影響操作先預覽並確認，取消不送 mutation。
- [ ] 完成 Visa 設定與支出匯率顯示：來源、日期、rate、估算標記、目標幣切換與失敗不部分套用；驗證舊快照、付款及備份保持既有政策。

出口條件：Web/iOS 交替管理同一群組後，成員 ID、份額、設定與帳務一致；封存例外與 owner-only 拒絕測試通過。

### 4. 支出、查詢、歷史與收據

- [ ] 完成 P08–P09 的表單、複製、篩選／排序／分組／欄位；保留原指定份額，逐人預覽與 core 結果一致，列表狀態可在編輯返回後恢復。
- [ ] 完成 P11：歷史分頁、差異與還原；428／400／412／409 分別處理，不猜版號、不自動覆寫。412 後保留草稿，檢查最新成員與分帳，再由使用者明確確認。
- [ ] 完成 P10：相機／相簿／檔案處理及收據管理；新增後只使用 `createdExpenseId` 上傳，不能從列表差異猜新支出。支出已建成時，只重試收據，不再 POST 支出。

出口條件：兩個 client 並發編輯、刪除、上傳及還原不會遺失更新；草稿、失敗確認視窗、收據部分成功案例均有測試。

### 5. 總覽、付款與分析

- [ ] 完成 P12–P13：總覽、部分付款／日期／備註／刪除、三類花費分析、成員帳務與展開明細；付款上限／剩餘額與 Web UI 相同。
- [ ] 對相同資料比較 Web、API、Swift：一般匯率、Visa、不同基準／結清幣、已付款、零餘額及代表人；所有金額與公開資料邊界一致。

出口條件：圖表及成員明細不只可見，數值也通過差分驗證；正式餘額不包含離線草稿。

### 6. 協作、分享與外部連結

- [ ] 完成 P14–P15：owner 管理協作者與三種分享；連結明文只在建立時可取得，後續 metadata 不偽造可再次複製的 URL。
- [ ] 完成分享及 device 的 cold／warm link handling、登入後繼續及 server 路由；外部 origin 需獨立確認，不帶目前 server 的憑證過去。
- [ ] 驗證 readonly 不載入收據、付款紀錄、協作者、share metadata 或 owner ID；guest 只能操作自己的 trip，無帳號管理／JSON 備份／離線佇列。撤銷登入邀請不會假裝移除已加入 editor。

出口條件：登入、未登入、已登入其他帳號、訪客、過期／撤銷、封存等 link 情境有自動測試，Universal Links 有真機證據。

### 7. 資料工具、本機預設與離線同步

- [ ] 完成 P16–P18：CSV／JSON 輸入、預覽、確認、輸出、系統分享與列印；Web→iOS→Web 互通，檔案選取與匯出失敗不修改資料。
- [ ] 完成 P19：明確保存／清除本機支出預設、帳號與群組隔離、ID 失效處理與儲存失敗提示；不自動縮放指定金額，不套用到既有／複製／佇列草稿。
- [ ] 完成 P20 的持久化佇列與同步 actor；測試重開 App 的資料保存、斷線／回應遺失、重複觸發同步、編輯暫停、移除成員、封存、權限撤銷、401 與孤立草稿。
- [ ] 驗證儲存空間不足、migration 失敗、登出／切帳號及取消操作不靜默刪草稿；未知結果只允許原 ID／body 重試或明確刪本機資料，並提示先核對伺服器。

出口條件：同一 queued expense 重播只建一筆；錯誤 CSV 整批零寫入；JSON v1／v2 互通；共享檔案不含憑證或未公開資料。

### 8. AI 設定與 Provider 登入

- [ ] 完成 P21 的 catalog-driven 介面：connections、provider／model 搜尋、thinking levels、API key、device code、copy code、manual redirect 與 prompt 回應；不硬編碼 provider 清單或另做 OAuth token exchange。
- [ ] 覆蓋現有 provider／method 組合及限制：OpenAI 與 Codex 分離、Codex device-code only、Anthropic copy-code、OpenRouter manual redirect，以及被禁止的 SDK prompts／custom endpoints；外部 URL 與秘密遵守既有協定。
- [ ] 驗證登入綁定同一 Otter session；背景暫停／回前景、10 分鐘到期、API 重啟、429／503、換帳號、取消後可能已 commit、解除後清除選用設定等情境。API key 與 redirect input 送出後清除且不寫檔或 log。

出口條件：stub tests 覆蓋當次 catalog 所有公開組合；測試帳號完成各種外部互動形態的實際流程。沒有 provider 測試憑證時保留未驗證狀態，不以 catalog 可見當作 live login 成功，也不把連線保存當成 key 已驗證。

### 9. 完整驗收、CI 與交付

目前 CI source 已建立 iPhone／iPad native matrix 與獨立 browser↔Swift job，`actionlint` 通過；未宣告 GitHub-hosted execution 已通過。四個 native cases 在兩種裝置各自執行，仍維持每案例 280 秒及原 runner budget。

- [ ] 補齊 P22–P23：所有 catalog keys、插值／複數、錯誤／確認／列印翻譯；語言地區對應、English fallback、6 色與 3 模式、VoiceOver、AX 字級、Reduce Motion、iPad／橫向與硬體鍵盤。
- [ ] 建立 macOS iOS CI：Swift tests、format lint、unsigned Simulator build 與 UI tests；另以專用 PostgreSQL process／獨立測試資料庫及真實 API 執行跨 client tests。不假設 macOS runner 支援 Linux service containers。
- [ ] 執行完整 repository checks、DB-backed API tests、Web E2E 及 iOS tests；mock suites 與真實 API suites 分開記錄，skipped tests 不算通過。
- [ ] 更新 `apps/ios/README.md`、產品／開發／部署文件、Changesets 與 P01–P24 驗收證據；測試乾淨 checkout 的 project generation、Simulator 及簽章真機執行。
- [ ] 用測試帳號完成雙向驗收：iOS 建組／記帳→Web 修改→iOS 衝突處理→付款／分享→CSV／JSON→離線同步→重新登入。比較 ID、version、金額、權限與保存結果，不只比較畫面。

## 驗證方式

所有 commands 從 repository root 執行。真實資料測試只用新建、已 migration 的隔離資料庫；不清除開發共用或 production 資料。

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
xcodebuild -project apps/ios/Otter.xcodeproj -scheme Otter \
  -destination 'platform=iOS Simulator,id=DEVICE_ID' \
  -derivedDataPath apps/ios/DerivedData \
  CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- test

npm run check
# 以下指令另需 DATABASE_URL，且 Web E2E 需 Chromium。
npm test
npm run test:e2e -- --workers=1
```

- 真實 API／差分：`DATABASE_URL=<test-database-url> npm run test:ios:integration`；加 `-- --ui` 或 `-- --ui-ipad` 執行各裝置的真實原生 UI；加 `-- --web` 執行真實 browser↔Swift client roundtrip。兩種模式使用不同 server／schema。只使用測試 PostgreSQL；harness 建立並清除自己的 schema。詳細命令及簽章差異見 `apps/ios/README.md`。
- 每次驗證記錄 source commit、工具版本、裝置／OS、資料庫初始化方式、通過／失敗／skip 數與未解決項。
- Simulator 不取代真機 Passkey、Associated Domains、相機、檔案分享／列印與前背景切換驗收。

## Execution Evidence

- 2026-10-23 resumed work（目前 HEAD `58616390ca6db35f96c3f1c56837109989f27b2e`）：已確認並清除先前精確 owned schemas `otter_ios_48008_9bb8a4566c7347edb824a4f93586a312` 與 `otter_ios_38575_c25cd1a0315b409a84f4fc7aa195c101`。共享 PostgreSQL 的 TCP 密碼與既有 volume 不一致，未重設憑證或資料；後續診斷改用獨立、loopback-only、tmpfs PostgreSQL container，密碼僅在 process memory。`package.json` 已加入 `pretest:ios:integration` 自動建置共享 packages，該 hook 與 Biome 檢查通過。
- 群組複製失敗已重現：348 differential／102 live API assertions 通過，group UI 為 0 passed／1 failed／0 skipped。API 與資料庫確認副本獨立、無支出且保留兩位成員，原群組保留一筆支出；UI snapshot 卻顯示原群組名稱。`TripListView.onCreated` 原本將另一個含 TabView 的 workspace 推入 detail stack；已改為清除 detail path 並選取新群組作為 detail root，避免 tab reselection 回到原群組。新增實際名稱欄位與正常 tab 切換回歸斷言，沒有移除原資料保存斷言或增加 timeout。
- 修正後 source-frozen parent diagnostic：348 differential／102 live API assertions 再次通過；build-for-testing 通過，但 UI 在登入的 `appearance.language` 控制項出現之前失敗（0 passed／1 failed／0 skipped），尚未到達複製操作，不能宣告導覽修正已通過 UI 驗收。Source fingerprints 前後相同；owned schema、Simulator、HTTP/pools、processes 與獨立 PostgreSQL container 均已清理。最新 Swift package tests 為 191 tests／19 suites 通過；三個變更 Swift 檔的 strict swift-format 與 Git whitespace checks 通過。完整 iPhone／iPad UI 仍待驗證。持久證據：`/Users/narumi/.cache/otter-validation/group-resume-bZr0dQvG/`，包含 initial-run failure evidence、parent-corrected-run result／cleanup／attachments 與 package-after-navigation.log。中途另一個 corrected-run 的 supervisor 被中斷、未產生測試結果；其精確 owned container 已移除，不算通過或 UI 回歸證據。

- 2026-10-23：使用者停用 Goal mode，已停止後續實作與測試。Expense diagnostic 期間 OrbStack／Docker 消失，PostgreSQL `127.0.0.1:55432` 無法連線；該次結果屬 infrastructure-invalid。已停止 owned processes、關閉 API、刪除專用 Simulator、關閉 verifier pool；沒有重啟共享服務。Database schema 清理無法確認，僅知此次 owned schema prefix 為 `otter_ios_48008_`，完整 UUID 未記錄。恢復資料庫後須先確認 ownership，再清理該次 schema，不可刪除其他資料。交接：`/tmp/otter-native-serial-handoff-20261022T2219.json`。乾淨 source snapshot worktree 已移除；未執行其 build 驗證，未建立交付 commit／PR。

- 2026-10-23 baseline：Web/API HEAD `0cb4dfd4719f3e3f17a2348db9285cd06351729e`；保留既有未提交的 iOS MVP、README 與 Changeset。尚未建立 PR 或宣告完整對齊。
- 已加入 isolated session／Bearer／share transport、cookie capture、session Keychain 相容讀取、操作權限、完整 Swift DTO、分帳／換匯／分析純函式、AI client/UI、持久化佇列與本機預設。畫面與全部流程整合仍在進行。
- 最新完整 package run：191 tests／19 suites 通過，`/tmp/otter-business-text-final-package.log`。新增回歸先實際失敗再修正，涵蓋全部 25 個 ECMAScript trim characters、4 個 negative controls、UTF-16 原始標籤／搜尋／CSV／backup names，以及 Username ASCII 驗證；金額與 protocol 規則未混用。包含 selected `.lproj`、獨立複數、原始參數、date-only／timestamp、完整 Web URL context 與過時 callback tests。首次新 route tests 找到 Foundation percent decoding 可移除開頭 BOM；已在 URLComponents 前以原 bytes 驗證 UTF-8／control／BOM，兩個失敗案例修正後全套通過。
- Phase 1 證據：上述 package suites、79 個差分／102 個真實 API assertions；另外以 ad-hoc 簽章的 Simulator 通過 2 個 `SessionStoreTests`，驗證舊格式讀取、DeviceOnly accessibility 與僅刪除自己的 namespace。原 37 個 App tests／3 個 login UI smoke tests 曾通過；不以它們取代完整 UI 流程。
- 最新 `npm run check` 在全新獨立 `otter_ios_checks_*` database 通過，先套用 26 migrations：1,564 tests 通過，包含 67 tooling tests、332 DB-backed API tests 及 native localization gate；0 skipped。證據：`/tmp/otter-native-coordinator-20261022T2007.rootcheck2.{safe.log,status.json}`。Database／connections／owned child processes 已清除；不用 development public schema 的結果替代此證據。
- 完整 Web E2E：先前 266-case run 有 3 個失敗；298-case run 因多 tab／Axe 工作及並行 Simulator 耗盡 budget，1 個失敗且 safety abort，均未算通過。修正 typed mocks，將 AX 與跨 tab 導覽分成獨立案例且保留全部語言／viewport／斷言。最後無並行 native compiler 的 `npm run test:e2e -- --workers=1 --retries=0`：458／458 通過、0 failed／skipped／interrupted／not-started、0 retries；每案例 30 秒不變。耗時 13.7 分鐘；`/tmp/otter-full-web-e2e-20261022-pFd0OK/` 保存 source fingerprints、26 migrations、結果及 own DB／process／ports 清理證據。
- 最新 unsigned Simulator build 通過：`/tmp/otter-native-integrated-build.log`。最新 ad-hoc signed hosted App tests 共 75：74 passed、1 physical Data Protection skipped、0 failed；`/tmp/otter-native-hosted-business.log`。包含 Unicode-only 草稿變更、group/member/token names、原始 UTF-16 刪除名稱確認及 AI secret 原值保留。包含 6 個受控 account／origin 切換 tests，證明 activation 尚未完成時不顯示或更改舊帳號草稿；新增 14 個 synthetic AI state tests 驗證 503／429、過時 401／save／poll、取消已 commit、失效 prompt、背景及 secret input 清除，不是 Provider live proof；包括真實 Keychain、資料排除備份、6 色 light/dark 4.5:1 contrast 與實際 App bundle localization／print tests。3 個最新 login UI smoke tests 全通過，包含以真實 Appearance UI 選擇語言，`/tmp/otter-native-smoke-latest.log`。
- 真實 native UI 曾找到 unsigned Keychain `-34018`，已改 ad-hoc signing；AutoFill 關閉可能清除第一字元，test-only entry 以實際 secure value 長度處理。完整 workflow 拆成 4 個獨立案例，保留原操作斷言、每案例 280 秒不變。最近完整 run 為 2 passed／2 failed／0 skipped：Password 與 Settlement 通過，部分付款／日期／備註／刪除實際重算 75→55→75。Group 已實際建組與 session 成員新增，但測試點選 outer Switch row 而不是 nested Switch，沒有開啟確認對話框。Workspace 的 generic reveal 在 picker menu 開啟後操作背景 navigation／keyboard，關閉 menu。已依完整 AX tree 修正 foreground hittable surface、Switch control、transient menu direct tap、平均分帳選項及 selected-label assertion，所有斷言保留；最新測試仍待完整重跑，不將測試缺陷誤記為產品 sheet failure。
- `ExpenseLocalStorageTests` 發現 Simulator 不提供 Data Protection attributes；檔案往返／排除備份與實體裝置 protection 斷言分開，後者在 Simulator 明確 skip，必須真機通過，不計入已驗證保護。
- P22 已整合 839 catalog keys × 18 locales（15,102 values）及 18 camera descriptions。保留 13 settings keys；歧義短詞使用 semantic ID，3 個 HTML／JSON wrappers 已抽成 plain messages。實際 xcstringstool 編譯通過；獨立 Swift runtime probe 對 18 locales、完整 count Cartesian product、typed aliases、使用者 sentinel 執行 26,136 cases，0 failures。Source auditor 更新 871 active IDs、4 個明確 retirements，missing／type mismatch／unmigrated／pending／errors 均為 0；61 tooling tests、TypeScript、targeted Biome 及完整／audit-only CLI 均通過。最新整合 UI、18 語言操作、VoiceOver、AX 字級與實體列印仍未宣告完成。
- P01–P24 實作／API／角色／測試範圍見 `apps/ios/PARITY.md`。P23 的 Web mode／account context、原生 NavigationSplitView、sheet-dismiss 後導覽及 session/user/origin guards 已實作；parser tests 全通過。iPhone／iPad 實際返回、旋轉／split、直接連結與帳號 sheet 下的草稿保留仍須操作驗收。
- Stage 9 的同帳號 Web UI↔Swift client 雙向驗收已實作於 `apps/ios/CrossClientIntegration/`、`scripts/ios-integration-browser.ts`，`--web` 模式使用全新 server／schema，不與 `--ui` 共用限流狀態。最近真實 run：26 migrations、348 differential、102 live API、25 browser↔Swift checks 通過，0 skipped。實際下載 CSV／JSON、精確 stale 412、明確 v2→v3、付款、分享、原 operation/body 跨 process queue replay 及 Web reload 均通過；`/tmp/otter-final-web-20261023T0455.*` 保存前後 SHA256 與清理證據（後續 business-name 修正後需重跑），0 owned schemas／processes／backends。另有 6 個 pure helper tests、TypeScript／Biome 通過。此項是 macOS Swift App client，不宣稱已完成整條 iPhone UI 雙向驗收。
- Preferences diagnosis：3 個 login smoke cases 與 1 個使用 workflow gestures 的 fresh-Simulator focused probe 通過，Done 均真正消失；temporary generic action/state events 記錄 true→false，沒有認證或資料 payload。所有診斷 App code 與 temporary test 已移除，不能把這次 diagnosis 當作最新未加 instrumentation 的完整 UI gate。
- 真實 API／PostgreSQL／Swift harness 已通過：`scripts/test-ios-integration.ts` + `apps/ios/Integration/` 執行 79 個跨語言差分案例與 102 個 live assertions。只建立獨立 schema、套用 26 migrations；結束後 `otter_ios_%` schema 數為 0。修正清除匯率 request 需 `{}` 而非 `null` 的 client 契約錯誤。此證據不包含原生 UI 或真機／外部 Provider 登入。
- Native Passkey／Universal Links 外部驗收未完成：`xcrun devicectl list devices` 僅列出 simulated devices；正式站 `/.well-known/apple-app-site-association` 目前回傳 `Content-Type: text/html`，不是有效 AASA JSON。Signing identity 存在，但不能據此宣稱網域關聯或真機驗證通過。
- P24 平台例外仍未取得明確接受；Provider live login 尚未使用測試帳號驗證。上述項目保留為未完成，不計入已完成工作。

## Risks and External Dependencies

- Apple signing、Team ID、官方 AASA 部署權限、真機與自訂 server 測試網域是階段 0 的外部依賴。缺少其中任一項時，不將 Passkey／Universal Links 標為完成。
- Provider live 驗證需要專用測試帳號及既有 `ENCRYPTION_KEY` 設定。不得索取或輸出 production secret，不為測試重新產生 production key。
- Swift 與 JavaScript 的浮點運算、rounding、字串排序及日期／時區可能不同。跨語言測試是必要交付，不以肉眼抽查取代。
- 分享 payload 刻意隱藏付款與收據；native analysis／cache 不得從其他登入情境補回秘密資料。分享撤銷不能收回先前已下載的內容。
- Web 在開發期間可能新增功能。每個 PR 更新 baseline 差異；新差異須加入矩陣或取得明確延後同意，不能在最後默默忽略。
- 本計畫不新增 Web 沒有的密碼重設、帳號刪除、轉移擁有者、通知、實際轉帳、AI 推論或離線編輯。App Store 公開發佈另需審核與法規／商店要求，不包含在功能對齊完成的宣告中。

## Rollback / Recovery

- iOS 各階段維持現有 API 相容；必要後端變更採 additive contracts。舊 Web、CLI、MCP 與 MVP client 仍須通過回歸。
- 若新增 session handoff 或 AASA 部署，先獨立審查安全設計與回復步驟。不得放寬原有 auth、cookie、Origin 或 provider 限制來解決相容問題。
- 本機 schema／Keychain migration 保留原資料直到新格式確認可讀；失敗時停止 migration 並提示，不自動清除憑證或離線草稿。較舊 App 遇到無法讀取的新版佇列，不嘗試重新解碼後送出。
- 回復 App／API 不會回復已完成的記帳。先核對 operation ID、版本歷史與付款紀錄，再依產品功能修正；不為移除 native 功能而還原整個資料庫。
- 不刪既有 AI credentials、不更換 `ENCRYPTION_KEY`、不 drop additive tables。若必要 migration 涉及資料變更，該 PR 另附隔離備份／還原演練證據。

## Completion Checklist

- [ ] P01–P23 每一列都有對應實作、自動測試及必要的真機／live 證據；沒有以 Web 跳轉代替未完成項目。
- [ ] P24 與自訂 server 的平台差異已明確處理並取得接受；任何未接受例外仍屬缺項。
- [ ] Username／密碼與 Passkey-only 使用者都能從原生 App 完成帳號與群組完整流程，不依賴手動複製 API token。
- [ ] owner／editor／Bearer API 開關／readonly／guest／archived／expired／nonmember 矩陣全部通過；不存在憑證混送、跨帳號 callback 或私密資料回填。
- [ ] 9 幣別、4 分帳模式、匯率／Visa、代表人、付款、歷史還原與 CSV／JSON 雙向結果一致；差分測試無未解決差異。
- [ ] 離線佇列、未知提交結果、412 衝突、收據部分成功、AI 取消競態與本機 migration 均有故障測試，且不造成重複記帳或草稿遺失。
- [ ] 18 語言、6 配色與 3 顯示模式完整；iPhone／iPad、Dynamic Type、VoiceOver、原生導覽與列印驗收完成。
- [ ] Swift／iOS／API／Web／repository checks 全部有可重現通過證據；外部阻擋、skipped 或僅 mock 通過項目沒有被算成完成。
- [ ] 乾淨 checkout 可依文件產生專案並執行；CI、Changesets、部署／回復文件與測試帳號交付完成；不提交 generated projects、build output、影像測試產物或 secrets。
- [ ] 最終矩陣審查及使用者驗收完成，沒有未接受缺項；達成以上所有條件後才刪除本計畫並在交付摘要註明路徑。仍有缺項時保留本檔並列出阻擋。
