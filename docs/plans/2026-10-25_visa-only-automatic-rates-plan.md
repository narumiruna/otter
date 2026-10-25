# Visa 唯一自動匯率來源計畫

狀態：實作及本機驗證完成；正式副本演練與切換基準核准受阻。分支：`narumi/feat/visa-only-automatic-rates`，base：`origin/main`。

驗證環境：原生 PostgreSQL 17，獨立本機資料庫；不使用共享或正式資料庫。正式資料副本及其切換基準尚未提供，正式副本演練與核准不得標示完成。

## Goal

- 將 Visa 設為支出統計、基準貨幣結清及貨幣換算設定的唯一自動匯率來源。
- 保留原幣金額、群組基準貨幣、指定結清貨幣及手動匯率功能。
- 保留 `packages/exchange-rates`；應用程式停止呼叫銀行匯率，但本階段不刪除該套件或清理其 workspace、建置及 Docker 設定。
- 保留已保存的匯率與歷史紀錄，不將舊銀行匯率重新標示或重算為 Visa 匯率。

## Context

目前程式碼有兩條獨立的換算路徑：

| 路徑 | 現有實作 | 本次目標 |
| --- | --- | --- |
| 支出統計及金額排序 | `apps/web/src/client/client-support.ts` 使用 `expense.exchangeRate` 換算成群組基準貨幣 | 新建自動快照改用支出日期的 Visa 匯率 |
| 未啟用指定貨幣結清時的餘額 | `packages/core/src/settlement.ts` 使用一般支出快照及群組匯率 | 使用已保存的基準貨幣換算資料，不再取得銀行報價 |
| 指定貨幣結清 | `apps/api/src/server-visa-settlement.ts` 保存 `expense.visaExchangeRate` | 保留依支出日期、指定目標貨幣及 0% 手續費的行為 |
| 自動匯率及設定 | `apps/api/src/server-exchange-rates.ts` 提供 Bank of Taiwan 報價；Web 設定頁可載入目前牌告 | 改為 Visa；目前匯率預覽與歷史支出快照分開 |
| 異幣付款與變更基準貨幣 | 付款及舊快照的跨基準貨幣換算目前使用浮動的群組匯率 | 改為有明確日期及來源的持久化換算資料 |

`packages/core/src/money.ts`、`packages/contracts/src/index.ts` 及 migration `024_travel_currencies.sql` 的部分驗證寫死 `bank`、`BANK_OF_TAIWAN` 與 `spotMid`。替換必須涵蓋型別、HTTP 契約及 PostgreSQL 限制，不能只替換 fetch 函式。

## Architecture

### 換算規則

- 一般換算以群組基準貨幣為目標。
  - 原幣與目標相同時使用 1，不呼叫外部服務。
  - 有群組手動匯率時，沿用手動來源；否則取得支出日期的 Visa 匯率。
  - 不再為新支出自動退回銀行牌告或內建固定估算。
- 指定貨幣結清以所選結清貨幣為目標。
  - 保留現有規則：所有支出包含現金，依支出日期使用 Visa 匯率，銀行手續費為 0%。
  - 不使用一般換算的手動匯率覆蓋指定貨幣結清快照。
- 異幣付款使用付款日期 `paidAt`，不是支出日期或讀取當天。
  - 指定貨幣結清仍要求付款使用所選貨幣；同幣付款直接扣抵，不再換算。
- 日期使用記錄上的 `expenseDate` 或 `paidAt`，不得從 `fetchedAt` 推算。
  - 補記與離線同步仍使用原記錄日期，不改用送出或同步當天。
- 有效快照不因讀取、修改金額或修改描述而重新取價。
  - 日期、原幣或換算目標改變時，才取得缺少的匹配匯率。
  - 調整群組手動匯率只影響之後需要新快照的操作，不默默改算已保存的支出。
- 缺少必要匯率時回傳明確錯誤，整筆操作不寫入部分資料。
  - 一般換算可由使用者明確設定手動匯率後重試。
  - Visa 指定貨幣結清仍須取得有效 Visa 匯率，不能以手動或固定估算替代。

### 資料與責任

- 延伸既有 `expense.exchangeRate`，加入可驗證日期的 Visa 來源，作為基準貨幣快照。
- 保留 `expense.visaExchangeRate`，作為指定結清貨幣快照。
  - 兩者可能有不同目標；不得直接用 TWD 結清快照計算 JPY 統計。
- 為需要異幣換算的付款加入匯率快照。
- 為原快照基準貨幣不同於目前群組基準貨幣的資料，保存明確的基準貨幣橋接快照。
  - 保留原快照及目前兩段換算的 rounding 順序，不能以相乘後的單一匯率取代而改變 minor units。
  - 日後變更基準貨幣時，在寫入前取得各記錄日期所需的 Visa 橋接匯率；失敗則設定及資料均不變。
- `apps/api` 負責取價、快取、權限、鎖與持久化；`packages/core` 只負責驗證及純計算；`packages/contracts` 負責 HTTP DTO 與 guards。
  - API 新邏輯放在匯率及相關 route 模組，`server.ts` 只負責接線；如需超過 1,000 行，先拆分職責。
- 一般讀取、統計、結清建議及備份匯出只使用已保存資料，不查詢外部匯率。
  - 今日匯率預覽是明確要求的查詢，不得將查詢結果寫入歷史支出或當成所有日期的共同匯率。
- 不建立通用 provider registry，不新增來源切換旗標或環境變數。

## Non-Goals

- 不移除 `packages/exchange-rates`、其測試或既有建置入口。
- 不強制所有群組使用 TWD，也不變更原始支出貨幣。
- 不取消手動匯率，不批次將已存在的銀行、固定或手動快照轉成 Visa。
- 不新增信用卡帳單匯入、實際扣款核對或手續費設定。
- 不變更 authentication、session、cookie、群組權限或金額 rounding 規則。

## Plan

### 1. 建立切換基準並確認舊資料處理

- [x] 建立固定匯率 fixtures 與金額基準，涵蓋兩日期 JPY 支出、TWD 混合支出、手動匯率、已付款及已變更基準貨幣的群組。
  - 證據：記錄總支出、餘額、結清建議、快照與 revision 的預期值；日後測試不依賴真實 Visa 報價。
- [ ] 盤點缺少快照、異幣付款、跨基準貨幣橋接及舊版備份，確定一次性的相容資料保存方式。
  - 本機 fixtures、盤點 SQL 及保存方式已驗證；實際 production 資料盤點及基準核准仍未取得。
  - 原本浮動的換算沒有唯一歷史值；以切換前固定資料與有效匯率建立可重現基準，將必要相容資料標示為 `legacy`，不冒稱當時 Visa 報價。
  - 無法建立可靠基準的資料列入待處理清單；不得用當日 Visa 或固定估算靜默補值後上線。
  - 證據：在隔離資料庫的升級測試中，原快照與 revisions 不變，浮動部分固定於已核准基準，金額差異為零或有明確核准紀錄。
- [x] 確認實際使用的 Visa 幣別組合與日期可用性，記錄無法取得報價時的結果。
  - 證據：有效、不可用日期、不支援組合及 provider 失敗均有 fixtures；發布前以少量必要幣別組合做網路 smoke check，不將 live API 加入 CI。

### 2. 擴充快照、HTTP 契約及資料庫

- [x] 在 `packages/core` 定義基準換算的 Visa 快照、付款快照及必要橋接資料，保留舊來源的讀取相容性。
  - 證據：guards 拒絕錯誤幣別、日期、目標、非有限數值與錯誤同幣匯率；新舊快照的 rounding 與分帳守恆測試通過。
- [x] 在 `packages/contracts` 更新 payload、匯率預覽、付款及支出歷史 guards，區分預設取價政策與各筆實際匯率。
  - `exchangeRateInfo` 不再宣稱跨日期的群組只有一個自動匯率或抓取時間。
  - 證據：新 Visa payload 與舊銀行 payload 均可讀取，缺少必要 Visa 日期的 payload 會被拒絕。
- [x] 在 `apps/api/db/migrations/` 新增 migration，擴充來源限制、付款快照及必要橋接資料，不修改既有 migrations。
  - 更新資料載入、保存及 `expense_revision_snapshot`，讓目前支出及新增歷史版本保存完整資料。
  - 證據：從現有 migrations 升級成功，重跑沒有變更，舊快照及 revision 指紋不變；SQL 限制與 TypeScript guards 一致。
- [x] 新增可完整保存付款及橋接快照的備份版本，繼續接受既有 v1／v2 備份。
  - 舊版缺漏只走明確標示的 `legacy` 相容流程；完整備份還原不依賴 Visa 或銀行連線。
  - 證據：新格式 export／restore round-trip 金額及來源一致；舊格式 fixtures 可還原且不被標示為 Visa。

### 3. 建立唯一自動取價路徑

- [x] 在 API 匯率 service 共用 `fetchVisaRate`，統一以 amount 1、bank fee 0 取得匯率。
  - 以原幣、目標貨幣及日期作為 key；共用進行中的請求與成功快取，同幣直接回傳 1。
  - 保留 10 秒 timeout、15 分鐘成功快取及 1 分鐘失敗等待的既有操作尺度；保存的快照不受快取到期影響。
  - 批次資料依不同 key 取價，避免每筆支出重複查詢或大量同時送出請求。
  - 證據：deduplication、timeout、錯誤回應及快取到期測試通過，任一請求都沒有銀行或固定匯率 fallback。
- [x] 改寫 `server-exchange-rates.ts` 的自動來源及預覽 route，停止在 `buildTripPayload` 取得目前銀行報價。
  - 保留 `/api/exchange-rates/:baseCurrency` 作為今日 Visa 匯率的唯讀預覽；回傳實際日期及 Visa 來源，未提供的幣別明確標示不可用，不補固定值。
  - 預覽不需要新增日期選項；其預設日期使用 `Asia/Taipei`，與 Visa client 一致。
  - 證據：一般 GET、分享讀取與已封存群組不發出外部匯率請求；明確預覽只呼叫 Visa。

### 4. 接入所有寫入入口

- [x] 將新增、編輯、複製、CSV 匯入及 CLI 經由 API 建立的支出接到共用 Visa service。
  - 一般快照與指定結清快照各自確認日期及目標；既有記錄的匹配快照重用，不把金額變更視為重新取價理由。
  - 新增或複製支出只共用匹配的 Visa 報價，不將其他支出的舊銀行或固定快照當作新自動報價；備份及歷史還原另依相容規則保留原值。
  - 離線同步依 draft 原日期取價，重播既有 operation ID 不重新定價或產生重複支出。
  - 證據：API、CSV、複製及離線同步測試涵蓋相同日期共用、不同行程日期分開、原幣保留與 provider 失敗。
- [x] 將取價維持在 trip row lock 之外，鎖內依最新設定驗證候選匯率，再原子保存支出與 revision。
  - 群組貨幣、日期、手動設定或結清目標已變更而候選不匹配時，整筆失敗；不得在鎖內補發網路請求。
  - 證據：受控並行測試證明慢速 Visa 不占用 trip lock；設定交錯、失敗及重試都沒有部分寫入。
- [x] 接入付款、基準貨幣變更及指定貨幣結清的啟用、停用與更換目標流程。
  - 需要換算的付款按 `paidAt` 保存快照；切換設定前補足必要的付款或橋接資料，同幣付款仍直接扣抵。
  - 保留現有付款貨幣相容性檢查；任何必要報價缺少時，原設定、付款及快照均不變。
  - 證據：異幣付款、切換後再切回、舊快照基準不同及日期不可用測試通過。
- [x] 更新歷史版本還原、備份還原及開發 fixtures，移除對銀行候選與即時固定估算的依賴。
  - 歷史還原保留所選版本的原匯率；只為目前目標缺少的換算取得必要 Visa 資料，不改寫舊 revision。
  - 固定表僅保留在明確的舊格式相容與測試 fixtures 中，不作新記帳的自動報價。
  - 證據：provider 離線時，匹配快照的還原及完整備份仍成功；新異幣記帳缺少報價則失敗。

### 5. 更新計算、設定與顯示

- [x] 將統計、排序、個人帳目及非指定貨幣結清改為只使用持久化快照與明確手動資料。
  - 移除現行計算路徑缺匯率時隱式使用 `currencyInfo.rateToTwd` 或 `fixedExchangeRates` 的行為。
  - 證據：兩日期不同 Visa 匯率的混合幣別統計與結清符合固定預期，重新載入不改變金額。
- [x] 更新貨幣設定及匯率明細，顯示 Visa 日期、來源及目標，保留舊銀行來源的歷史標示。
  - 「載入 Bank of Taiwan」改為「查看今日 Visa 匯率」唯讀預覽，不能藉由套用今日預覽覆蓋過去支出日期。
  - 手動設定仍可保存；說明僅影響之後需要新快照的操作，不再宣稱會重算全部歷史支出。
  - 指定貨幣結清的開關只控制結清目標與該結清規則，不再暗示關閉後會改用銀行來源；保留現有 API 設定欄位。
  - 證據：component tests 驗證啟用／停用、手動覆蓋、唯讀預覽、匯率缺失及舊快照顯示。
- [x] 更新所有支援語系、CLI 相容性及相關文件，明確說明新舊資料與日期可用性限制。
  - 文件包括 `docs/visa-settlements.md`、`docs/development.md` 及相關 package README。
  - 證據：catalog、CLI、備份與歷史契約測試通過；沒有將相容用固定值或歷史銀行資料稱為新 Visa 報價。

### 6. 驗證與發布

- [x] 增加應用程式不得呼叫銀行來源的 regression tests，同時保留 `packages/exchange-rates` 本身的測試與建置。
  - 證據：銀行 transport 被設為失敗時，應用程式 Visa 流程仍正常，銀行呼叫次數為 0；新報價失敗不退回固定值。
- [x] 執行完整檢查，保存執行結果及所用測試環境。
  - 無資料庫檢查：`npm run check`、`npm run test:components`。
  - 設定 `DATABASE_URL` 為隔離測試資料庫後，依序執行 `npm run migrate`、`npm test`、`npm run test:e2e -- --workers=1`；E2E 前需安裝 Chromium。
  - 增加真實 API／PostgreSQL 的日本旅行 workflow 測試；既有 `visa-settlement.spec.ts` 使用 mocked API，不能單獨證明資料庫保存正確。
  - 證據：DB-backed suites 實際執行而非 skipped，桌面與手機的 JPY 記帳／TWD 結清、混合幣別統計、付款及匯率失敗均通過。
- [ ] 在隔離 production 副本演練 migration、切換基準及回復流程，完成部署前金額比對。
  - 證據：保留原幣金額及歷史快照的比對報告、浮動資料固定基準的核准紀錄與備份可還原證明。
- [ ] 補上 Changeset 與部署文件，先套用相容 schema，再一起部署能讀新快照的 API、Web 與 CLI。
  - `.changeset/grumpy-lamps-trade.md` 與 `docs/visa-rate-cutover.md` 已完成；實際 release review 與部署仍受上述 production 驗證門檻阻擋。
  - 以 `npm run changeset -- --empty` 建立檔案，再填入實際受影響 workspace 的版本與摘要，避免互動提示。
  - 不讓不識別新 Visa 來源的舊 API writer 與新版同時提供服務；文件要求舊 browser client 重新載入及 CLI 更新。
  - 證據：release review 確認 migration 順序、client 相容性、回復限制及唯一自動來源政策。

## Execution Evidence

### 已驗證

- 分支由乾淨的 `origin/main`（`98b740d`）建立；保留原計畫檔，未修改其他既有工作。
- Node.js 26.10.0、npm 11.19.1、PostgreSQL 17.11 與 UTF8 隔離資料庫；`npm run migrate` 已驗證全新 28 個 migrations 及重跑 0 個。
- `env -u DATABASE_URL npm run check` 通過；112 項 DB tests 按設計 skipped，這些 skipped 不計為 DB 驗證。
- 設定隔離 `DATABASE_URL` 的 `npm run check` 通過：tooling 42、API 340、Web 928、CLI 55、contracts 59、core 85、銀行套件 8、Visa client 41，共 1,558 項，沒有 skipped。Biome、TypeScript 及 production build 通過。
- `npm run test:components` 通過：44 個檔案、597 項。
- 升級 fixtures 驗證缺少基準時停止；匯入明確基準後餘額保持 `[64, -64] JPY`，原金額、銀行 JSON 與 revision 不變；不連線取價。
- 核心與 API fixtures 驗證兩段 rounding、兩日期、混合幣別、手動設定、付款、切換設定、橋接、CSV、複製、離線重播、歷史還原及 v1／v2／v3 備份。
  - 最終審查增加 v1 未知新欄位相容測試，以及資料庫匯率四捨五入造成 expense／payment 超出範圍時的 rollback 測試。
  - 舊 payload 的個人帳目缺付款匯率時，顯示 unavailable，不使用固定表，也不使頁面出錯。
- 2026-10-25 的少量 live smoke check 成功：JPY/TWD（2026-07-05、2026-07-06）、TWD/JPY 及 USD/JPY（2026-10-25），全部為 amount 1、bank fee 0。
  - 此結果只證明該次可取得報價，不保證其他日期或幣別未來可用；CI 使用固定 fixtures。
- 最終相容性修正後，以全新 UTF8 資料庫執行 `npm run test:e2e -- --workers=1`：268／268 通過，10.3 分鐘，exit 0。包含 1440px／390px 真實 API／PostgreSQL 的 JPY／TWD 流程，未使用 browser route mock。
  - 較早輪次曾發現不完整 fixtures、過時設定文案及開發期 HMR／navigation 失敗。已修正 fixtures 與語意斷言，未放寬 timeout、accessibility 或金額檢查。
- 完整 diff 已審查來源邊界、權限、transaction、快取上限、網路 timeout、讀取不取價、新舊格式及部署風險。沒有新增 provider flag，未移除銀行 workspace 或建置入口。

### 未完成及交接限制

- 未取得 production 副本、舊版有效匯率的完整盤點、切換前後金額報告或資料擁有者的基準核准。隔離 fixtures 不取代此門檻。
- 正式副本的 migration／備份回復演練、實際 release review 及部署未執行；本計畫不授權直接操作 production。
- Changeset 及 `docs/visa-rate-cutover.md` 已備妥。PR 應維持 draft，待上述外部資料及核准完成。
- Docker daemon 未啟動（本機 socket 不存在），未執行 container build／restart smoke；TypeScript、Web／API／CLI build 與原生 PostgreSQL 路徑已驗證。
- 關聯 issue #127 的實際信用卡入帳金額不在本次範圍，不關閉該 issue。
- 未發布套件、建立 version tag 或觸發 release workflow。因仍有未完成條件，保留本計畫，不刪除。

## Rollback / Recovery

- 本計畫不授權在正式資料庫執行 migration；先取得可還原備份及部署核准。
- schema 變更採擴充方式，保留舊來源與原快照，不刪除既有欄位、資料或 migrations。
- 新格式尚未寫入前，可回復先前 app，保留已擴充 schema；先以隔離資料庫驗證相容性。
- 新 Visa、付款或橋接快照已寫入後，不直接回退至無法讀取新格式的舊版。
  - 先停止受影響寫入，保留資料，部署能讀新格式的修正版；不得默默改回銀行或固定匯率。
  - 只有在明確核准資料損失及停機範圍後，才可從切換前備份還原。
- 保留 `packages/exchange-rates` 不等於可以安全直接切回銀行；回復判斷必須以資料格式及已保存金額為準。

## Completion Checklist

- [x] 新建自動匯率只來自 Visa；應用程式執行路徑不再呼叫任何銀行 endpoint。
- [x] `packages/exchange-rates`、其原始碼、測試、workspace 及既有建置入口仍存在。
- [x] 統計、預設結清、指定貨幣結清及異幣付款都使用正確日期與目標；同幣不查價。
- [x] 讀取、排序、修改金額及重播操作不會重新定價；匯率失敗沒有固定 fallback 或部分寫入。
- [ ] 舊快照及 revisions 保持原值；浮動付款與跨基準換算的切換方式已驗證並核准。
- [x] 備份、歷史還原、CSV、CLI、離線同步、所有語系及桌面／手機測試均通過。
- [ ] DB migrations、完整測試、回復演練、Changeset 與部署文件均有完成證據；沒有將 skipped 測試視為通過。

全部任務及完成條件通過、發布與交接完成後，刪除此計畫檔；持久規則保留在功能與部署文件。
