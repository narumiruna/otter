# #123 群組個人身分與快速記帳

Issue: <https://github.com/narumiruna/otter/issues/123>

## Goal

讓使用者選定群組內的個人身分、保存常用分帳設定、複製支出並查看個人帳務，減少重複操作。不改變帳號權限或現有帳目計算。

實作與本機驗證已完成；等待 pull request 與 issue 證據交接。

## Context

- `apps/web/src/client/workspace/expense-composer.tsx` 的 `defaults()` 預設第一位參與者付款、基準貨幣、所有成員與平均分帳。編輯及待同步草稿也使用同一表單。
- `workspace-context.tsx` 已提供 `userId`、正式群組資料與離線佇列；可用來隔離個人偏好，不需增加權限 API。
- `expenses-page.tsx`、`expense-list.tsx` 與 `mobile-expense-row.tsx` 管理支出列表及編輯入口；複製操作須涵蓋桌面與手機。
- `overview-summary.tsx` 目前顯示群組摘要，尚無個人摘要。
- `packages/core/src/settlement.ts` 處理匯率快照、Visa 結算、尾差、付款及 `settledById`。個人金額不能在網頁中建立另一套換算規則。
- 正式支出保存 `participantShares`，不保存原始比例或份數輸入；不能從金額反推原始分帳模式。

## Architecture

### 個人偏好

首版採目前瀏覽器的 `localStorage`，以版本、帳號 ID、群組 ID 組成 key；保存參與者 ID、貨幣、分帳成員、模式及模式所需值，不保存支出描述、金額、收據或存取 token。不新增 migration、公開 API 或跨裝置同步。

偏好模組負責解析、驗證、清除及失效設定處理。工作區負責提供已驗證的偏好與操作；表單負責建立草稿，不在多個元件各自讀寫 storage。

- 無帳號 ID 的訪客不使用共用的 `current` key；首版不保存訪客偏好。
- 偏好只影響新表單初始化；不能覆盖既有支出、待同步草稿或已開始輸入的表單。
- 未選身分時維持第一位有效付款人的預設。已選身分失效時清除該選擇並提示重新選擇，不依名稱猜測合併結果。
- 無效分帳設定回到所有有效成員與平均分帳，並提示變動。
- 比例／份數可保留輸入；指定金額若與新總額不符，不自動按比例調整，必須修正預覽後才能提交。
- 使用者明確選擇「記住設定」才更新偏好；取消表單不寫入。storage 失敗時保留當次選擇並提示未持久保存。
- 登出或切換帳號立即切換偏好作用域；殘留 storage 不提供其他帳號使用，並提供清除本群組偏好的操作。

### 複製支出

區分編輯來源與複製來源。複製以白名單建立新草稿：描述、原幣金額、貨幣、付款人、有效分帳成員、分類、標籤與指定分攤金額。日期使用 `todayDate()`。

來源有 `participantShares` 時以指定金額初始化；否則以平均分帳初始化。不複製 ID、version、createdAt、收據、匯率快照、修改紀錄或付款紀錄。複製內容優先於個人預設；畫面標明正在建立新支出。

沿用新增支出的 POST／離線排隊流程及伺服器匯率取得規則，不新增複製 API。取消不寫入；封存與唯讀畫面不提供複製操作。回應不明時沿用現有錯誤處理，不加入自動重送。

### 個人帳務

在 core 提供可測試的個人摘要，與 `calculateBalances()` 共用支出換算及分攤邏輯，避免尾差分配不同。只在抽取共用計算能保證一致性時重構，不修改既有分帳規則。

- 「我墊付」及「我分攤」是支出累計，不含結清付款；使用目前結算貨幣並明確標示。
- 「我待付／待收」使用包含付款及代表人歸屬的正式餘額。
- 被代表人成員保留自己的墊付／分攤數字，但說明由誰結算，不將零餘額誤標為已付款。
- 代表人的淨額可能包含其他成員，須提示這不是單純的個人墊付減分攤。
- 未同步草稿不列入；未選身分時提供選擇入口，不顯示推測的個人帳務。

## Non-Goals

跨群組個人總覽（#128）、離線冷啟動（#125）、收據辨識、週期支出、帳號與參與者的強制綁定、跨裝置偏好同步，以及保存歷史比例／份數模式。

## Plan

- [x] 確認個人偏好的操作位置、訪客限制與分帳失效策略；以文字／元件設計審查驗證上述規則涵蓋 owner、editor、唯讀、封存及無帳號訪客。
- [x] 新增 `apps/web/src/client/workspace/personal-preferences.ts` 與相鄰單元測試；驗證帳號／群組隔離、格式版本、無效 JSON、失效成員、清除與 storage 失敗。
- [x] 在 `workspace-context.tsx` 接入偏好及個人身分選擇控制項；以元件測試驗證切換帳號／群組、刪除或合併成員後提示、身分選擇不改變角色權限。
- [x] 將表單預設與複製草稿建立邏輯移到單一可測試的模組，接入 `expense-composer.tsx`；驗證個人預設僅用於新支出，既有編輯、佇列草稿與未保存輸入不被覆蓋，指定金額不符時不能提交。
- [x] 在新增表單加入明確的保存常用設定操作；以元件測試驗證取消不保存、明確保存可再次載入、儲存失敗保留當次資料並提示。
- [x] 在桌面／手機支出列表接入複製入口與新的表單來源狀態；以元件測試驗證今天日期、來源不變、敏感欄位不傳送、取消無 mutation、唯讀／封存禁止操作及髒草稿切換確認。
- [x] 在 `packages/core/src` 新增個人摘要及共用支出分攤計算；以 domain 測試驗證平均／指定分攤、多幣別、Visa、尾差、付款與代表人，並確保原有 settlement 測試不變。
- [x] 在總覽加入個人墊付、分攤與待付／待收；以 `overview.component.test.tsx` 驗證貨幣標示、未選身分、代表人提示及不計入待同步草稿。
- [x] 為 API 新增複製流程使用的 POST 回歸測試；驗證建立新 ID／version、依新日期及貨幣取得普通／Visa 快照、來源支出不變且無收據或舊歷史移轉。不要為偏好新增 API。
- [x] 更新四種語言訊息與產品文件，說明本機偏好、清除方式、複製模式限制及個人摘要定義；以訊息測試及文件審查驗證一致性。
- [x] 新增瀏覽器測試，涵蓋選身分、保存預設、複製外幣支出及個人摘要；驗證手機／桌面、鍵盤操作、焦點與可及性。
- [x] 新增 `.changeset/` 檔案；只有 app 變更時用 empty changeset，若 core 公開 API 有變更則記錄適當版本調整，審查變更範圍。

## Risks

- 共用分攤邏輯的抽取可能改變尾差；以既有 settlement 測試及逐人摘要對照測試防止回歸。
- 合併成員後舊 ID 無法直接對應新 ID；首版清除失效偏好並要求重新選擇，不猜測。
- 個人身分不是權限，也不是可信的付款人身分驗證；介面與文件必須明確區分。
- 本機偏好可能因清除網站資料而遺失；不將其宣稱為帳號設定或備份。

## Rollback / Recovery

首版不修改資料 schema。回退網頁版本時，舊版忽略新增偏好 key；偏好可由使用者清除，不能清除既有離線佇列。新建立的支出使用既有資料格式，回退不刪除帳目。

core 計算抽取須保持既有結果；若測試出現餘額差異，停止發布並回退抽取，不透過資料重寫修補。本計畫不允許未另行審查的 migration 或公開 HTTP API 變更。

## Completion Checklist

- [x] `npm run check` 通過；記錄結果，確認 DB-backed API 測試實際使用已遷移的 `DATABASE_URL`，不能以跳過結果當作完成。
- [x] `npm run test:components` 通過，涵蓋偏好、複製與個人摘要的新案例。
- [x] 在已遷移的測試 PostgreSQL 與已安裝 Chromium 的環境執行 `npm run test:e2e` 並通過；不可使用正式資料庫。
- [x] #123 的全部驗收條件有測試或明確人工驗證證據，未知事項已解決，權限、離線佇列與既有結算規則無回歸。
- [x] 文件、四種語言與 changeset 完成；檢查 `git diff --check` 與變更範圍，沒有非本 issue 的修改。
- [ ] 經使用者接受或授權發布／交接後，更新 issue 的完成證據；全部檢查完成才刪除此計畫。

## Verification Evidence

- 偏好／表單：`personal-preferences.test.ts` 與 `personal-preferences.component.test.tsx` 驗證帳號與群組隔離、格式版本、storage 失敗、失效成員、明確保存、髒表單不被覆蓋、指定金額不符、舊支出與佇列草稿不套用偏好。
- 複製：單元／元件測試驗證白名單草稿、今天日期、來源優先、取消無 mutation、唯讀與封存限制；`personal-identity.spec.ts` 驗證手機／桌面、鍵盤、焦點、髒草稿 Back 確認及提交不含來源識別／收據／匯率。
- Accounting：`personal-summary.test.ts` 與 `overview.component.test.tsx` 驗證尾差、保存的匯率、Visa、付款、代表人與不計入待同步草稿。既有 settlement 測試全部通過。
- API：`server.expense-copy.test.ts` 兩個 PostgreSQL 案例驗證新 ID／version、新普通及 Visa 快照、來源不變、收據不複製與獨立新增歷史。
- `DATABASE_URL=<isolated test database> npm run check` 通過：655 tests，全 workspace 通過，包含 151 個 API 測試，沒有 DB 測試跳過；Biome、typecheck、build 通過。
- `npm run test:components` 通過：239 tests。
- 全部 `npm run test:e2e` 通過：65 tests。使用新建的獨立 Docker PostgreSQL、24 個 migrations、Chromium 與獨立的 API／web ports。
- 初次完整測試發現個人身分選項增加同名文字，已將 empty overview assertion 限定到 banner 並新增身分選項 assertion；離線編輯器 assertion 改為等待非同步載入。再次執行 E2E 的殘留資料問題以重建本次專用測試庫解決，不修改現有服務資料。
- 四種語言訊息與 `docs/product.md` 完成。Changeset 記錄 core／web additive minor changes；沒有 migration 或公開 HTTP API 變更。
- 已審查完整 diff：草稿白名單、存取權限隔離、scope 切換、版本保護、既有結算與離線行為保持相容。未修改其他計畫或既有服務。
- 非阻擋警告：production bundle 超過 Vite 的 500 kB 提示門檻、Node.js Web Crypto experimental warnings、E2E Vite preload warning。命令皆成功，無未處理的測試失敗；bundle 分拆與相關平台提示不在本 issue 範圍。
