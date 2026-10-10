import {
  type CatalogShape,
  interpolate,
  type MessageValues,
} from "./message-types.js";
import { jaSettings } from "./messages-ja-settings.js";
import type { zhTW } from "./messages-zh-tw.js";

export const ja = {
  ...jaSettings,
  welcomeBackEyebrow: "おかえりなさい",
  startNewJourneyEyebrow: "新しい旅を始めましょう",
  parchmentTheme: "パーチメント",
  expenseTotalLabel: "合計",
  expenseSplitSection: "分担するメンバー",
  expenseSplitHelp: "分担するメンバーと方法を選び、分担額を確認してください。",
  expenseTagPlaceholder: "タグを追加…",
  addShort: "追加",
  settingsShort: "設定",
  close: "閉じる",
  groupDetails: "グループの詳細",
  filters: "絞り込み",
  viewAll: "すべて表示",
  personLabel: "メンバー",
  preferencesLabel: "環境設定",
  profileLabel: "プロフィール",
  securityLabel: "セキュリティ",
  backToGroups: "グループに戻る",
  createdLabel: "作成日",
  statusLabel: "状態",
  peopleDeletionHelp:
    "帳簿に使用されているメンバーは削除できません。情報ボタンで制限を確認するか、重複するメンバーを統合してください。",
  personRestriction: (values: MessageValues) =>
    interpolate("{name} の削除制限", values),
  representsPeople: (values: MessageValues) =>
    interpolate("精算の代表者：{names}", values),
  expenseRateForName: (values: MessageValues) =>
    interpolate("「{name}」の金額と為替レートの詳細を表示", values),
  rateUnavailable: "旧バージョン：為替レートなし",
  offlineQueueBanner:
    "オフラインです。読み込み済みのデータは閲覧できます。新しい支出はこの端末に保存できますが、他の編集には接続が必要です。",
  queueSave: "この端末に保存",
  queueSaved:
    "この端末に保存しました。残高にはまだ反映されません。為替レートは同期時に決まります。",
  queueStorageError:
    "この端末に保存できません。ページを開いたまま再試行してください。",
  queueTitle: "未同期の支出",
  queueNotice:
    "この端末にのみ保存され、残高には反映されません。為替レートは同期時に決まります。ブラウザーのデータを消去すると下書きが失われます。",
  queuePending: "同期待ち",
  queueAttempted: "同期結果を確認中です。元のリクエストは変更できません",
  queueConflict:
    "同期を停止しました。権限と参加者を確認してください。元のリクエストは保持されています。",
  queueInvalid: "まだ記帳されていません。下書きを修正して再試行してください。",
  queueEdit: "下書きを編集",
  queueRetry: "元のリクエストで再試行",
  queueDelete: "端末の下書きを削除",
  queueDeleteConfirm:
    "端末の下書きを削除しますか？送信済みのリクエストは記帳済みの可能性があります。先にグループを確認してください。",
  queueCount: (values: MessageValues) =>
    interpolate("この端末に未同期の支出が {count} 件あります", values),
  queueSyncPricing:
    "プレビューは元の通貨の金額のみ表示します。為替レートは同期時にサーバーが決定します。",
  queueOrphanTitle: "アクセスできないグループの下書き",
  queueOrphanNotice:
    "これらのグループにはアクセスできません。送信済みのリクエストは記帳済みの可能性があります。端末のデータを削除する前に確認してください。",
  queueOrphanTrip: (values: MessageValues) =>
    interpolate("グループ ID：{id}", values),
  expenseHistory: "変更履歴",
  expenseHistoryDescription:
    "支出の編集、削除、バージョンの復元を確認できます。支払いや過去の残高の履歴ではありません。",
  expenseHistoryEmpty: "変更履歴はありません",
  expenseHistoryMore: "履歴をさらに読み込む",
  expenseHistoryCreated: "作成",
  expenseHistoryUpdated: "編集",
  expenseHistoryDeleted: "削除済み",
  expenseHistoryRestored: "復元済み",
  expenseHistoryBaseline: "初期スナップショット",
  expenseHistorySystem: "システム",
  expenseHistoryBaselineNotice:
    "履歴を有効にした時点の状態です。それ以前の変更と元の操作担当者は不明です。",
  expenseHistoryReceiptNotice:
    "領収書はメタデータのみ保持されます。以前の画像は表示できません。",
  expenseHistoryShares: "分担額",
  expenseHistoryRate: "為替レートのスナップショット",
  expenseHistoryRateBank: "Bank of Taiwan",
  expenseHistoryRateCustom: "グループ独自",
  expenseHistoryRateFixed: "組み込み固定",
  expenseHistoryRateLegacy: "過去の推定値",
  expenseHistoryRateTimeUnavailable: "レート取得時刻なし",
  expenseHistoryRateUnavailable: "旧バージョン：為替レートの記録なし",
  expenseHistoryBefore: "変更前",
  expenseHistoryAfter: "変更後",
  expenseHistorySourceExpense: "支出操作",
  expenseHistorySourceCsv: "CSV インポート",
  expenseHistorySourceRestore: "バックアップの復元",
  expenseHistorySourceMerge: "メンバーの統合",
  expenseHistorySourceReceipt: "領収書操作",
  expenseHistorySourceSeed: "開発用サンプル",
  expenseHistorySourceMigration: "データ移行",
  expenseHistorySourceVersionRestore: "バージョンの復元",
  expenseRestoreVersion: (values: MessageValues) =>
    interpolate("バージョン {version} を復元", values),
  expenseRestoreTitle: "支出のバージョンを復元",
  expenseRestoreDescription:
    "現在の支出と復元するバージョンを確認してください。復元すると新しいバージョンが追加され、その後の変更履歴も残ります。",
  expenseRestoreKeepsReceipt:
    "現在の領収書は保持されます。以前の領収書画像は復元されません。",
  expenseRestoreNoReceipt:
    "削除済みの支出は領収書なしで復元されます。以前の画像は復元されません。",
  expenseRestoreMissingPerson:
    "このバージョンの支払者または分担者はグループにいません。支出を手動で編集してください。",
  expenseRestoreUnavailable:
    "この支出は復元できません。再読み込みして再試行してください。",
  expenseRestoreConflict:
    "支出が変更されました。最新の内容を確認してから再度確定してください。",
  expenseRestoreConfirm: "このバージョンを復元",
  expenseRestored: "支出のバージョンを復元しました",
  expenseConflictParticipantsChanged:
    "参加者が変更されました。確認すると、無効な支払者や分担設定は最新の支出の設定に置き換わります。他の下書き項目は保持されます。保存前に分担額を確認してください。",
  expenseVersionConflict:
    "支出が変更されました。最新の内容を確認してから再度確定してください",
  expenseVersionMissing:
    "支出のバージョンが必要です。再読み込みして再試行してください",
  expenseVersionInvalid: "支出のバージョンが無効です",
  reviewLatestExpense: "最新の内容を確認",
  confirmLatestExpenseVersion:
    "最新の内容を確認しました。下書きを保持して編集を続ける",
  latestExpenseMissing:
    "この支出は削除済みかアクセスできません。下書きは保持されますが、保存はできません。",
  deleteExpenseHistoryRetained:
    "支出は現在の帳簿から除かれ、残高が再計算されます。変更履歴は残ります。以前のバージョンは復元できますが、古い領収書画像は復元できません。",
  expenseHistoryForName: (values: MessageValues) =>
    interpolate("変更履歴：{name}", values),
  usernameMustBe332LettersNumbersUnderscoresOrHyphens:
    "ユーザー名は英字、数字、アンダースコア、ハイフンで 3～32 文字にしてください",
  travelTogetherSplitExpensesEasily: "一緒に旅して、簡単に割り勘",
  goodFriendsSplitExpensesWell: "仲のいい友達と、気持ちよく割り勘。",
  skipToMainContent: "メインコンテンツへ移動",
  otterHome: "otter ホーム",
  loading: "読み込み中",
  unableToLoadOtter: "otter を読み込めません",
  loadingFailed: "読み込みに失敗しました",
  reload: "再読み込み",
  signedIn: "ログインしました",
  accountCreated: "アカウントを作成しました",
  unableToAuthenticate: "認証できません",
  authenticationRequestsTooFrequentTryAgainLater:
    "認証リクエストが多すぎます。しばらくしてから再試行してください",
  usernameUpdated: "ユーザー名を更新しました",
  signedOut: "ログアウトしました",
  signOutFailedMessage: (values: MessageValues) =>
    interpolate("ログアウトに失敗しました：{message}", values),
  pleaseTryAgainLater: "しばらくしてから再試行してください",
  signingOut: "ログアウト中…",
  signOut: "ログアウト",
  authorizeCli: "CLI を接続",
  authorizeCliDescription:
    "ターミナルに表示された Device code を入力して、この CLI に Otter データへのアクセスを許可してください。",
  deviceCode: "Device code",
  checkDeviceCode: "続ける",
  checkingDeviceCode: "確認中…",
  cliAccessRequest: "CLI アクセス要求",
  cliAccessRequestedBy: "要求元",
  approveCliAccess: "アクセスを許可",
  approvingCliAccess: "許可中…",
  cliAccessApproved: "CLI を接続しました",
  cliAccessApprovedDescription: "このページを閉じてターミナルに戻れます。",
  deviceCodeNotFoundOrExpired: "Device code が見つからないか期限切れです",
  enterAValidDeviceCode: "有効な Device code を入力してください",
  youAreOfflineLoadedDataIsAvailableButEditingRequiresAConnection:
    "オフラインです。読み込み済みのデータは閲覧できますが、編集には接続が必要です。",
  travelTogetherSplitWithEase: "一緒に出かけて、気軽に割り勘",
  spendYourTimeOnTheJourney: "時間は旅のために、",
  andLeaveTheSplittingToOtter: "割り勘は otter に。",
  fromDinnerToAFullTripRecordEverySharedExpenseAndKeepGroupFinancesSimpleAndClear:
    "夕食から旅行まで、共同の支出を記録して、友達とのお金のやりとりを簡単で明確に。",
  splitExampleAWeekendTripDinnerCostsTwd1800ForThreePeopleOrTwd600Each:
    "割り勘の例：週末旅行の 3 人の夕食代は TWD 1,800、1 人あたり TWD 600 です。",
  weekendTrip: "週末旅行",
  splitExample: "割り勘の例",
  dinnerTogether: "一緒に食べた夕食",
  you: "あなた",
  a: "A",
  y: "Y",
  splitEquallyAmong3: "3 人で均等に分担",
  each: "1 人あたり",
  quicklyRecordSharedExpenses: "共同の支出をすばやく記録",
  seeWhoOwesAndWhoIsOwedAtAGlance: "誰が払うか、誰が受け取るかを一目で確認",
  settleUpWithClearSuggestions: "わかりやすい提案で精算",
  signIn: "ログイン",
  createAccount: "アカウントを作成",
  welcomeBackContinueYourJourney: "おかえりなさい。旅を続けましょう。",
  createYourFirstGroupAndStartSplittingWithEase:
    "最初のグループを作って、気軽に割り勘を始めましょう。",
  username: "ユーザー名",
  enterAUsername: "ユーザー名を入力してください",
  password: "パスワード",
  enterAPassword: "パスワードを入力してください",
  developmentCredentialsHaveBeenFilledIn:
    "開発用のログイン情報が入力されています。",
  signingIn: "ログイン中…",
  or: "または",
  signInWithAPasskey: "Passkey でログイン",
  signingInWithAPasskey: "Passkey でログイン中…",
  unableToSignInWithAPasskey:
    "Passkey でログインできません。再試行するかパスワードを使用してください。",
  needAnAccount: "アカウントをお持ちでない方",
  usernameIsNotCaseSensitive: "大文字と小文字は区別されません。",
  passwordMustBeAtLeast8Characters: "パスワードは 8 文字以上にしてください",
  passwordMustBeAtLeast8Characters2: "パスワードは 8 文字以上にしてください。",
  creating: "作成中…",
  createAccountWithAPasskey: "Passkey でアカウントを作成",
  creatingAccountWithAPasskey: "Passkey でアカウントを作成中…",
  unableToCreateAccountWithAPasskey:
    "Passkey でアカウントを作成できません。再試行してください。",
  alreadyHaveAnAccount: "アカウントをお持ちですか？",
  backToSignIn: "ログインに戻る",
  expenseParticipantsDoNotNeedAccountsToBeIncludedInAGroup:
    "分担するメンバーは、アカウントなしでもグループに参加できます。",
  changeNameSUsername: (values: MessageValues) =>
    interpolate("{name} のユーザー名を変更", values),
  nameSAccountMenu: (values: MessageValues) =>
    interpolate("{name} のアカウントメニュー", values),
  unableToUpdateUsername: "ユーザー名を更新できません",
  changeUsername: "ユーザー名を変更",
  accountSettings: "アカウント設定",
  manageYourUsernameAndPasskeys:
    "外観、言語、ユーザー名、Passkey、API token を管理します。",
  appearance: "外観",
  chooseHowOtterLooksOnThisBrowser:
    "Otter の外観を選択します。変更はすぐに適用され、このブラウザーに保存されます。",
  colorTheme: "カラーテーマ",
  forestTheme: "森",
  oceanTheme: "海",
  lavenderTheme: "ラベンダー",
  sunsetTheme: "夕焼け",
  roseTheme: "バラ",
  displayMode: "表示モード",
  systemMode: "システム設定",
  lightMode: "ライト",
  darkMode: "ダーク",
  useTheNewUsernameTheNextTimeYouSignInYourCurrentSessionWillContinue:
    "次回のログインには新しいユーザー名を使用してください。現在のログイン状態は続きます。",
  passkeys: "Passkey",
  useAPasskeyToSignInWithoutYourPassword:
    "端末のロック解除を使って、パスワードなしでログインできます。",
  unableToLoadPasskeys: "Passkey を読み込めません",
  unableToAddPasskey:
    "Passkey を追加できません。キャンセルした場合は再試行してください。",
  unableToRemovePasskey: "Passkey を削除できません",
  passkeyAdded: "Passkey を追加しました",
  passkeyRemoved: "Passkey を削除しました",
  passkeyNumber: (values: MessageValues) =>
    interpolate("Passkey {number}", values),
  addedOnDate: (values: MessageValues) => interpolate("追加日 {date}", values),
  removePasskeyNumber: (values: MessageValues) =>
    interpolate("Passkey {number} を削除", values),
  noPasskeysAdded: "Passkey はまだ追加されていません。",
  addingPasskey: "Passkey を追加中…",
  addPasskey: "Passkey を追加",
  thisBrowserDoesNotSupportPasskeys:
    "このブラウザーは Passkey に対応していません。",
  apiTokens: "API token",
  useApiTokensWithTheOtterCli:
    "Otter CLI や自動化ツール用の Bearer token を作成します。",
  loadingApiTokens: "API token を読み込み中…",
  unableToLoadApiTokens: "API token を読み込めません",
  unableToCreateApiToken: "API token を作成できません",
  apiTokenCreationUncertain:
    "Token の作成結果を確認できません。別の Token を作成する前に、このリクエストを再試行してください。",
  retryApiTokenCreation: "Token の作成を再試行",
  unableToRevokeApiToken: "API token を取り消せません",
  unableToCopyApiToken: "API token をコピーできません",
  apiTokenRevoked: "API token を取り消しました",
  apiTokenCopied: "API token をコピーしました",
  enterATokenName: "Token 名を入力してください",
  newApiToken: "新しい API token",
  copyYourApiTokenNow: "今すぐ API token をコピーしてください",
  apiTokenShownOnce:
    "この Token は一度だけ表示されます。ページを離れると再表示できません。",
  copyToken: "Token をコピー",
  done: "完了",
  tokenName: "Token 名",
  tokenNameExample: "例：旅行の自動化",
  creatingApiToken: "Token を作成中…",
  createApiToken: "API token を作成",
  apiTokenDates: (values: MessageValues) =>
    interpolate("作成日 {created} · 有効期限 {expires}", values),
  revokeNamedApiToken: (values: MessageValues) =>
    interpolate("API token「{name}」を取り消す", values),
  noActiveApiTokens: "有効な API token はありません。",
  apiTokensExpireAfter90Days:
    "Token は 90 日後に失効します。CLI で使うには、次の値として設定してください：",
  passkeyRegistrationRequestsTooFrequent:
    "Passkey の登録リクエストが多すぎます。しばらくしてから再試行してください",
  passkeyRegistrationResponseIsInvalid: "Passkey の登録応答が無効です",
  passkeyRegistrationRequestExpired:
    "Passkey の登録リクエストが失効しました。再試行してください",
  unableToVerifyPasskey: "Passkey を検証できません。再試行してください",
  passkeyAlreadyRegistered: "この Passkey は登録済みです",
  passkeyNotFound: "Passkey が見つかりません",
  cannotRemoveOnlyPasskey:
    "唯一の Passkey は削除できません。アカウントにログインできなくなります",
  passkeyLoginResponseIsInvalid: "Passkey のログイン応答が無効です",
  passkeyLoginRequestExpired:
    "Passkey のログインリクエストが失効しました。再試行してください",
  unableToUsePasskeyToSignIn: "この Passkey でログインできません",
  cancel: "キャンセル",
  saving: "保存中…",
  save: "保存",
  connectionFailedPleaseTryAgainLater:
    "接続に失敗しました。しばらくしてから再試行してください",
  theServerReturnedAnInvalidResponse: "サーバーの応答が無効です",
  everyone: "全員",
  unknown: "不明",
  atLeastOneParticipantIsRequired: "参加者が 1 人以上必要です",
  usedByAnExpense: "支出に使用されています",
  youAreOfflineReconnectAndTryAgain:
    "オフラインです。再接続して再試行してください",
  working: "処理中…",
  unableToApplyChanges: "変更を適用できません",
  applying: "適用中…",
  noBalancesYet: "残高はまだありません。",
  settled: "精算済み",
  getsBack: "受取額",
  owes: "支払額",
  newTaiwanDollar: "新台湾ドル",
  japaneseYen: "日本円",
  usDollar: "米ドル",
  euro: "ユーロ",
  food: "食事",
  transport: "交通",
  lodging: "宿泊",
  tickets: "入場券",
  shopping: "買い物",
  other: "その他",
  unsavedChangesWillBeLostDiscardTheDraft:
    "未保存の内容が失われます。下書きを破棄しますか？",
  unableToSwitchGroups: "グループを切り替えられません",
  loadingGroup: "グループを読み込み中",
  yourSelectionWillAppearAfterItsDataLoads:
    "データの読み込みが完了すると選択した内容が表示されます。",
  unableToLoadGroup: "グループを読み込めません",
  groupSwitcher: "グループの切り替え",
  groups: "グループ",
  countActiveGroups: (values: MessageValues) =>
    interpolate("使用中のグループ {count} 件", values),
  everyTripAddsUpToSomethingWonderful: "どの旅も、素敵な思い出に。",
  recordSharedExpensesAndFocusOnThePeopleBesideYou:
    "共同の支出を記録して、一緒に旅する人との時間を大切に。",
  archivedAndReadOnlyDataIsPreservedTheOwnerCanRestoreItUnderMore:
    "アーカイブ済み・閲覧専用です。データは保持されます。所有者はグループ設定から復元できます。",
  addTravelCompanionsFirst: "まず同行者を追加",
  thereIsOnlyOneParticipantAddSomeoneToSplitWithBeforeRecordingTheFirstExpense:
    "現在メンバーは 1 人です。最初の支出を記録する前に、一緒に分担する人を追加してください。",
  addExpenseParticipant: "分担メンバーを追加",
  switchGroups: "グループを切り替え",
  youWillLeaveTheCurrentGroupOnlyAfterTheNewOneLoads:
    "新しいグループの読み込みに成功してから現在のグループを離れます。",
  participantsPeopleExpensesExpensesCurrency: (values: MessageValues) =>
    interpolate("{participants} 人 · 支出 {expenses} 件 · {currency}", values),
  archived: "アーカイブ済み",
  everydayMomentsTogether: "一緒に過ごす日々",
  collaborator: "共同編集者",
  owner: "所有者",
  baseCurrencyCurrency: (values: MessageValues) =>
    interpolate("基準通貨 {currency}", values),
  usingCustomExchangeRates: "独自の為替レートを使用中",
  usingBankOfTaiwanExchangeRates: "Bank of Taiwan の標準レートを使用中",
  usingFixedFallbackRates:
    "Bank of Taiwan に接続できないため、予備の固定レートを使用中",
  loadingGroup2: "グループを読み込み中…",
  people: "メンバー",
  expenses: "支出",
  base: "基準",
  overview: "概要",
  more: "その他",
  groupWorkspace: "グループ作業画面",
  addExpense: "支出を記録",
  archivedGroups: "アーカイブ済みのグループ",
  unableToCreateGroup: "グループを作成できません",
  createGroup: "グループを作成",
  addCompanionsAfterCreatingTheGroupThenRecordSharedExpenses:
    "グループの作成後に同行者を追加し、共同の支出を記録してください。",
  groupName: "グループ名",
  fiveDaysInTokyo: "東京 5 日間の旅",
  baseCurrency: "基準通貨",
  createYourFirstGroup: "最初のグループを作成",
  addATripOrEventGroupOrCreateOneFromAnExistingJsonBackup:
    "旅行やイベントのグループを追加するか、既存の JSON バックアップから作成してください。",
  groupExpenseSummary: "グループの支出概要",
  totalSharedExpenses: "共同支出の合計",
  convertedToBaseCurrency: "基準通貨に換算済み",
  outstanding: "未精算",
  countSuggestedPaymentsToSettleUp: (values: MessageValues) =>
    interpolate("精算のための支払い提案 {count} 件", values),
  nothingIsCurrentlyOutstanding: "未精算の金額はありません",
  settlementSuggestionsAppearAfterExpensesAreAdded:
    "支出を追加すると精算案が表示されます",
  expenseRecords: "支出記録",
  sharedAmongCountPeople: (values: MessageValues) =>
    interpolate("{count} 人で分担", values),
  calculatedFromCurrentExpensesAndRecordedPayments:
    "現在の支出と記録済みの支払いから計算しています。",
  settleUp: "精算",
  countEntries: (values: MessageValues) => interpolate("{count} 件", values),
  entries: "件",
  seePaymentsAndSharesAtAGlance: "立替額と分担額を一目で確認。",
  balances: "メンバー別残高",
  recentExpenses: "最近の支出",
  noExpensesYet: "支出はまだありません",
  thisGroupHasNotRecordedAnySharedExpenses:
    "このグループには共同の支出がまだ記録されていません。",
  recordTheFirstSharedExpense: "最初の共同支出を記録",
  addThePeopleSplittingExpensesToCalculateEachBalance:
    "まず分担するメンバーを追加し、最初の支出を記録してください。残高と精算案が自動で表示されます。",
  balancesAndSettlementSuggestionsWillAppearHereAfterYouAddExpenses:
    "支出を追加すると、ここに残高と精算案が表示されます。",
  addPerson: "メンバーを追加",
  managePeople: "メンバーを管理",
  everythingIsSettled: "すべて精算済みです",
  thereAreNoOutstandingPayments: "未精算の支払いはありません。",
  paymentRecorded: "支払いを記録しました",
  unableToRecordPayment: "支払いを記録できません",
  recordPayment: "支払いを記録",
  recordSettlementPayment: "精算の支払いを記録",
  fromPaysToTheFullSuggestedAmountIsPrefilled: (values: MessageValues) =>
    interpolate(
      "{from} から {to} への支払いです。提案額の全額が入力されています。",
      values,
    ),
  paymentAmountCurrency: (values: MessageValues) =>
    interpolate("支払額（{currency}）", values),
  enterAPaymentAmount: "支払額を入力してください",
  thePaymentMustBeGreaterThan0AndNoMoreThanTheSuggestedAmount:
    "支払額は 0 より大きく、提案額以下にしてください",
  expectedRemainder: "適用後の残額：",
  paymentDate: "支払日",
  noteOptional: "メモ（任意）",
  recordPayment2: "支払いの記録を確定",
  paymentHistory: "支払い履歴",
  dateFromPaidTo: (values: MessageValues) =>
    interpolate("{date} · {from} から {to} への支払い", values),
  deletePayment: "支払い記録を削除",
  remainingSettlementSuggestionsWillBeRecalculated:
    "残りの精算案が再計算されます。",
  paymentDeleted: "支払い記録を削除しました",
  deleteFailed: "削除に失敗しました",
  deleteThisPayment: "この支払い記録を削除しますか？",
  delete: "削除",
  datePaidByNameSplitWithSplit: (values: MessageValues) =>
    interpolate("{date} · {name} が支払い · {split} で分担", values),
  dailySpending: "日別の支出",
  paidByPerson: "メンバー別の支払額",
  byCategory: "カテゴリ別",
  spendingAnalysis: "支出分析",
  totalAmount: (values: MessageValues) =>
    interpolate("支出合計 {amount}", values),
  noDataYet: "データはまだありません。",
  showingShownOfTotalExpenses: (values: MessageValues) =>
    interpolate("支出 {total} 件中 {shown} 件を表示", values),
  searchDescriptions: "説明を検索",
  searchExpenseDescriptions: "支出の説明を検索",
  sort: "並び順",
  groupBy: "グループ化",
  noGrouping: "グループ化なし",
  groupByDate: "日付別",
  groupByPayer: "支払者別",
  dateNewestFirst: "日付の新しい順",
  dateOldestFirst: "日付の古い順",
  amountHighToLow: "金額の高い順",
  amountLowToHigh: "金額の低い順",
  moreFilters: "その他の絞り込み",
  countApplied: (values: MessageValues) =>
    interpolate("{count} 件を適用中", values),
  datePersonCurrencyCategoryAndTag: "日付、メンバー、通貨、カテゴリ、タグ",
  from: "開始日",
  to: "終了日",
  paidBy: "支払者",
  splitWith: "分担メンバー",
  expenseParticipants: "分担メンバーの管理",
  currency: "通貨",
  allCurrencies: "すべての通貨",
  category: "カテゴリ",
  allCategories: "すべてのカテゴリ",
  tag: "タグ",
  exactTag: "タグの完全一致",
  applied: "適用中：",
  clearAll: "すべてクリア",
  allPeople: "すべてのメンバー",
  categoryValue: (values: MessageValues) =>
    interpolate("カテゴリ：{value}", values),
  currencyValue: (values: MessageValues) =>
    interpolate("通貨：{value}", values),
  fromValue: (values: MessageValues) => interpolate("開始日：{value}", values),
  toValue: (values: MessageValues) => interpolate("終了日：{value}", values),
  tagValue: (values: MessageValues) => interpolate("タグ：{value}", values),
  aCompleteHistoryWillAppearHereAfterTheFirstSharedExpense:
    "最初の共同支出を記録すると、ここにすべての明細が表示されます。",
  recordFirstExpense: "最初の支出を記録",
  noMatchingExpenses: "条件に合う支出がありません",
  adjustOrClearTheFiltersToSeeAllExpenses:
    "条件を変更するか、絞り込みを解除してすべての支出を表示してください。",
  clearFilters: "絞り込みを解除",
  filteredExpenses: "絞り込み後の支出",
  allExpenses: "すべての支出",
  columns: "表示項目",
  chooseExpenseColumns: "支出の表示項目を選択",
  expenseName: "支出名",
  splitParticipants: "分担者",
  receipt: "領収書",
  tags: "タグ",
  restoreDefaults: "標準設定に戻す",
  actions: "操作",
  expenseGroupSummary: (values: MessageValues) =>
    interpolate("{count} 件 · 合計 {total}", values),
  countPeople: (values: MessageValues) => interpolate("{count} 人", values),
  viewReceiptForName: (values: MessageValues) =>
    interpolate("「{name}」の領収書を表示", values),
  receiptPreviewForName: (values: MessageValues) =>
    interpolate("「{name}」の領収書", values),
  receiptImageForName: (values: MessageValues) =>
    interpolate("「{name}」の領収書画像", values),
  closeReceiptPreviewHint: "画像をクリックするか Esc を押すと閉じます。",
  closeReceiptPreview: "領収書プレビューを閉じる",
  openOriginalReceipt: "元の画像を開く",
  moreActionsForName: (values: MessageValues) =>
    interpolate("「{name}」のその他の操作", values),
  datePaidByName: (values: MessageValues) =>
    interpolate("{date} · {name} が支払い", values),
  splitWithSplit: (values: MessageValues) =>
    interpolate("{split} で分担", values),
  edit: "編集",
  receiptUploadFailed: "領収書のアップロードに失敗しました",
  receiptUploaded: "領収書をアップロードしました",
  uploading: "アップロード中…",
  uploadReceipt: "領収書をアップロード",
  receiptFileRequirements: "JPEG、PNG、WebP · 最大 5 MB",
  selectReceiptPhoto: "写真をアップロード",
  takeReceiptPhoto: "写真を撮る",
  removeReceiptPhoto: "写真を削除",
  receiptOnlineOnly:
    "写真のアップロードには接続が必要です。オフラインの下書きには写真は保存されません。写真を削除するか再接続してください。",
  receiptFileTooLarge: "写真は 5 MB 以下にしてください",
  expenseSavedReceiptFailed:
    "支出は作成されましたが、領収書のアップロードに失敗しました。再試行するか、後で支出一覧からアップロードできます。",
  retryReceiptUpload: "領収書のアップロードを再試行",
  receiptAlreadyAttached:
    "この支出には領収書があります。支出一覧で確認してください。自動では上書きしません。",
  uploadReceiptLater: "後でアップロード",
  expenseCreationUncertain:
    "支出が作成されたか確認できません。再作成する前に支出一覧を確認してください。そのまま再試行しないでください。",
  viewReceipt: "領収書を表示",
  noReceipt: "領収書なし",
  deleteReceipt: "領収書を削除",
  youCanUploadAnotherReceiptLaterTheExpenseWillNotBeDeleted:
    "後から別の領収書をアップロードできます。支出自体は削除されません。",
  receiptDeleted: "領収書を削除しました",
  deleteThisReceipt: "この領収書を削除しますか？",
  deleteName: (values: MessageValues) =>
    interpolate("「{name}」を削除", values),
  thisCannotBeUndoneAllBalancesAndSettlementSuggestionsWillBeRecalculated:
    "元に戻せません。すべての残高と精算案が再計算されます。",
  expenseDeleted: "支出を削除しました",
  deleteThisExpense: "この支出を削除しますか？",
  invalidSplitFormat: "分担形式が無効です",
  selectAtLeastOnePersonToSplitWith: "分担メンバーを 1 人以上選択してください",
  expenseChangesSaved: "支出の変更を保存しました",
  expenseRecorded: "支出を記録しました",
  unableToSaveExpense: "支出を保存できません",
  reviewTheSplitPreviewBeforeSavingChanges:
    "分担のプレビューを確認してから変更を保存してください。",
  enterTheRequiredDetailsFirstCustomSplitsAndTagsAreAvailableBelow:
    "まず必須項目を入力してください。不均等な分担とタグは下で設定できます。",
  editExpense: "支出を編集",
  addExpense2: "支出を追加",
  discardDraft: "下書きを破棄",
  unsavedChangesWillBeLostExistingDataWillNotChange:
    "未保存の内容が失われます。既存のデータは変更されません。",
  discardThisDraft: "この下書きを破棄しますか？",
  description: "説明",
  dinnerHotelTrainTickets: "夕食、ホテル、電車の切符",
  enterAnExpenseDescription: "支出の説明を入力してください",
  amount: "金額",
  enterAnExpenseAmount: "支出額を入力してください",
  date: "日付",
  currency2: "通貨",
  splitPreview: "分担プレビュー",
  enterAnAmountToPreviewEachPersonsShare:
    "金額を入力すると、各メンバーの分担額が表示されます。",
  namePaidAmount: (values: MessageValues) =>
    interpolate("{name} が {amount} を支払い", values),
  changePeopleAndSplitMethod: "分担メンバーと方法を変更",
  selectedSelectedOfTotal: (values: MessageValues) =>
    interpolate("{total} 人中 {selected} 人を選択", values),
  selectAll: "すべて選択",
  clear: "クリア",
  splitMethod: "分担方法",
  splitEqually: "均等に分担",
  exactAmounts: "金額を指定",
  percentages: "割合",
  shares: "口数",
  nameSKind: (values: MessageValues) => interpolate("{name} の {kind}", values),
  moreDetails: "その他の詳細",
  categoryAndTags: "カテゴリ、タグ",
  separateWithCommasForExampleBreakfastTransport:
    "カンマで区切ってください。例：朝食, 交通",
  unsavedChangesWillBeLost: "未保存の内容が失われます。",
  cancelEditing: "編集をキャンセルしますか？",
  saveChanges: "変更を保存",
  recordExpense: "支出を記録",
  settlementRepresentative: "精算の代表者",
  settledByName: (values: MessageValues) =>
    interpolate("精算の代表者：{name}", values),
  settleSeparately: "本人（個別に精算）",
  settlementRepresentativeHelp:
    "支出は各メンバーに分担されます。残高と精算案では、割り当てたメンバーの純額を代表者に合算します。代表者を別の人に割り当てることはできません。",
  representativeHasDependents:
    "この人に割り当てられたメンバーがいます。先に割り当てを解除してください。",
  settlementRepresentativeUpdated: "精算の代表者を更新しました",
  unableToUpdateSettlementRepresentative: "精算の代表者を更新できません",
  provideParticipantChanges: "更新する参加者の内容を指定してください",
  invalidSettlementRepresentative: "精算の代表者の形式が無効です",
  settlementRepresentativeMustBeAnotherGroupMember:
    "精算の代表者は同じグループの別のメンバーにしてください",
  settlementRepresentativeCannotBeAssignedOrHaveDependents:
    "代表者は他の人に精算を任せられません。また、他の人の代表者になっているメンバーは精算を委任できません",
  invalidBackupSettlementRepresentative:
    "バックアップの精算代表者の形式が無効です",
  expenseParticipantAdded: "分担メンバーを追加しました",
  unableToAddPerson: "メンバーを追加できません",
  expenseParticipantsDoNotNeedToSignInManageAccountsWithAccessUnderMoreSharingAndAccess:
    "分担メンバーはログイン不要です。アクセスできるアカウントは「グループ設定 → 共有と権限」で管理してください。",
  personsName: "メンバー名",
  friendsName: "友達の名前",
  enterAName: "名前を入力してください",
  archivedGroupsAreReadOnlyRestoreThisGroupToChangeParticipants:
    "アーカイブ済みのグループは閲覧専用です。メンバーを変更するには復元してください。",
  usedByAPayment: "支払いに使用されています",
  cannotDeleteReasonUpdateRelatedExpensesFirstOrUseTheMergeToolBelow: (
    values: MessageValues,
  ) =>
    interpolate(
      "削除できません：{reason}。関連する支出を編集するか、下の統合ツールを使用してください。",
      values,
    ),
  deleteName2: (values: MessageValues) => interpolate("{name} を削除", values),
  thisPersonHasNoExpensesOrPaymentsDeletionCannotBeUndone:
    "このメンバーには支出や支払いがありません。削除は元に戻せません。",
  expenseParticipantDeleted: "分担メンバーを削除しました",
  deleteThisExpenseParticipant: "分担メンバーを削除しますか？",
  nameUpdated: "メンバー名を更新しました",
  unableToUpdateName: "名前を更新できません",
  rename: "名前を変更",
  renameName: (values: MessageValues) =>
    interpolate("{name} の名前を変更", values),
  existingExpensesAndPaymentsWillRemainLinkedToThisPerson:
    "既存の支出と支払いは、このメンバーに引き続き関連付けられます。",
  newName: "新しい名前",
  saveName: "名前を保存",
  advancedPeopleTools: "メンバーの詳細ツール",
  mergeDuplicatePeople: "重複するメンバーを統合",
  sourcePerson: "統合元のメンバー",
  targetPerson: "統合先のメンバー",
  mergeInto: "統合先",
  changePreview: "変更のプレビュー",
  expensesRelatedExpensesAndPaymentsPaymentsForSourceWillMoveToTargetThenTheSourcePersonWillBeDeleted:
    (values: MessageValues) =>
      interpolate(
        "{source} の関連支出 {expenses} 件と支払い {payments} 件を {target} に移し、統合元のメンバーを削除します。",
        values,
      ),
  mergePeople: "メンバーの統合を確定",
  sourceWillBeDeletedAndRelatedDataWillBeTransferredToTargetAtomically: (
    values: MessageValues,
  ) =>
    interpolate(
      "{source} を削除し、関連データを {target} に一括で移します。",
      values,
    ),
  expenseParticipantsMerged: "分担メンバーを統合しました",
  mergeFailed: "統合に失敗しました",
  applyMerge: "統合を適用しますか？",
  previewAndMerge: "プレビューして統合",
} satisfies CatalogShape<typeof zhTW>;
