import { interpolate, type MessageValues } from "./message-types.js";

export const jaSettings = {
  groupSettings: "グループ設定",
  manageSharingGroupPreferencesAndDataToolsHighImpactActionsRequireConfirmation:
    "共有、グループ設定、データツールを管理します。影響の大きい操作には確認が必要です。",
  youAreACollaboratorAndCanUseDataToolsOnlyTheOwnerCanManageAccessAndGroupSettings:
    "共同編集者はデータツールを使用できます。アクセス権とグループ設定は所有者のみ管理できます。",
  sharingAndAccess: "共有と権限",
  linksActiveLinksCollaboratorsCollaborators: (values: MessageValues) =>
    interpolate(
      "有効なリンク {links} 件 · 共同編集者 {collaborators} 人",
      values,
    ),
  shareLinkCreated: "共有リンクを作成しました",
  shareLinkCreatedAndCopied: "共有リンクを作成してコピーしました",
  shareLinks: "共有リンク",
  chooseWhoCanEditThroughTheShareLink:
    "リンクからの閲覧・編集権限を選択してください。",
  linkPermission: "リンクの権限",
  readOnlyLink: "閲覧専用（ログイン不要）",
  signedInEditLink: "ログイン後に編集",
  anyoneEditLink: "リンクを持つ人が編集可能",
  signedInEditLinkDescription:
    "ログインまたは登録後にリンクを開くと共同編集者になります。リンクを取り消しても参加済みの人は削除されません。",
  anyoneEditLinkDescription:
    "リンクを持つ人はログインなしで支出とメンバーを編集できます。信頼できる人にのみ共有してください。取り消すと即座に無効になります。",
  revokingSignedInLinkDoesNotRemoveExistingCollaborators:
    "取り消すと、このリンクで新たに参加できなくなります。参加済みの共同編集者は引き続き編集できます。権限は別途削除してください。",
  signInToEditSharedGroup: (values: MessageValues) =>
    interpolate(
      "{name} を編集するにはログインするかアカウントを作成してください。",
      values,
    ),
  readOnlyShareLinkCreated: "閲覧専用リンクを作成しました",
  readOnlyShareLinkCreatedAndCopied: "閲覧専用リンクを作成してコピーしました",
  shareLinkCreatedYourBrowserBlockedAutomaticCopyingCopyItManually:
    "共有リンクを作成しました。ブラウザーが自動コピーを許可しなかったため、手動でコピーしてください",
  unableToCreateLink: "リンクを作成できません",
  shareLinkCopied: "共有リンクをコピーしました",
  yourBrowserBlockedCopyingOpenTheLinkAndCopyItFromTheAddressBar:
    "ブラウザーがコピーを許可しませんでした。リンクを開き、アドレスバーからコピーしてください",
  anyoneWithTheLinkCanViewExpensesBalancesAndSettlementsWithoutSigningInButCannotEdit:
    "リンクを知る人はログインなしで支出、残高、精算を閲覧できますが、編集はできません。",
  readOnlyShareLinks: "閲覧専用の共有リンク",
  createReadOnlyLink: "閲覧専用リンクを作成",
  anyoneWithTheLinkCanViewThisGroupsExpensesBalancesAndSettlementSuggestionsButCannotAddOrChangeData:
    "リンクを持つ人はこのグループの支出、残高、精算案を閲覧できますが、データの追加や変更はできません。",
  createAShareLink: "共有リンクを作成しますか？",
  createShareLink: "共有リンクを作成",
  revoked: "取り消し済み",
  active: "有効",
  openLink: "リンクを開く",
  copy: "コピー",
  revokeLink: "リンクを取り消す",
  afterRevocationTheOldLinkWillImmediatelyStopWorking:
    "取り消すと、古いリンクではこのグループを即座に閲覧できなくなります。",
  shareLinkRevoked: "共有リンクを取り消しました",
  revokeThisShareLink: "共有リンクを取り消しますか？",
  revoke: "取り消す",
  noShareLinksYet: "共有リンクはまだありません。",
  collaboratorAdded: "共同編集者を追加しました",
  unableToAddCollaborator: "共同編集者を追加できません",
  collaboratorsMustBeExistingUsersTheyCanManageExpensesAndParticipantsButNotOwnerSettings:
    "共同編集者は既存のユーザーに限ります。支出とメンバーを管理できますが、所有者用の設定は変更できません。",
  existingUsersUsername: "既存ユーザーのユーザー名",
  addCollaborator: "共同編集者を追加",
  removeName: (values: MessageValues) => interpolate("{name} を削除", values),
  thisAccountWillNoLongerBeAbleToManageTheGroupExistingExpenseDataWillRemain:
    "このアカウントはグループを管理できなくなります。既存の支出データは残ります。",
  collaboratorRemoved: "共同編集者を削除しました",
  removeCollaborator: "共同編集者を削除しますか？",
  remove: "削除",
  dataAndExport: "データとエクスポート",
  csvPrintBackupAndRestore: "CSV、印刷、バックアップ、復元",
  exportingDoesNotChangeGroupData:
    "エクスポートはグループのデータを変更しません。",
  exportAndPrint: "エクスポートと印刷",
  expenseCsvExported: "支出 CSV をエクスポートしました",
  exportExpenseCsv: "支出 CSV をエクスポート",
  settlementCsvExported: "精算 CSV をエクスポートしました",
  exportSettlementCsv: "精算 CSV をエクスポート",
  print: "印刷",
  completeBackupDownloaded: "完全バックアップをダウンロードしました",
  downloadFailed: "ダウンロードに失敗しました",
  downloadCompleteBackup: "完全バックアップをダウンロード",
  expenseCsvImported: "支出 CSV をインポートしました",
  importFailed: "インポートに失敗しました",
  allRowsAreCheckedFirstNoDataIsWrittenIfAnyRowHasAnError:
    "先にすべての行を検証します。エラーがある場合はデータを書き込みません。",
  importExpenseCsv: "支出 CSV をインポート",
  chooseCsv: "CSV を選択",
  importPreview: "インポートのプレビュー",
  rowsRowsCanBeImportedErrorsErrors: (values: MessageValues) =>
    interpolate("インポート可能 {rows} 行 · エラー {errors} 件", values),
  rowRowMessage: (values: MessageValues) =>
    interpolate("{row} 行目：{message}", values),
  importCountExpenses: (values: MessageValues) =>
    interpolate("支出 {count} 件をインポート", values),
  thisWillAddCountExpensesAtOnceAndRecalculateBalances: (
    values: MessageValues,
  ) =>
    interpolate("支出 {count} 件を一括で追加し、残高を再計算します。", values),
  applyCsvImport: "CSV インポートを適用しますか？",
  applyImport: "プレビューを確認してインポート",
  invalidBackupFormat: "バックアップ形式が無効です",
  backupRestoredAsANewGroup: "バックアップを新しいグループとして復元しました",
  restoreFailed: "復元に失敗しました",
  restoringCreatesANewGroupAndDoesNotOverwriteCurrentData:
    "復元は新しいグループを作成します。現在のデータは上書きされません。",
  restoreJsonBackup: "JSON バックアップを復元",
  chooseJsonBackup: "JSON バックアップを選択",
  restorePreviewName: (values: MessageValues) =>
    interpolate("復元のプレビュー：{name}", values),
  peoplePeopleExpensesExpensesPaymentsPaymentsBaseCurrency: (
    values: MessageValues,
  ) =>
    interpolate(
      "メンバー {people} 人 · 支出 {expenses} 件 · 支払い {payments} 件 · 基準通貨 {currency}",
      values,
    ),
  createNewGroup: "新しいグループを作成",
  aNewGroupNamedNameWillBeCreatedWithoutChangingExistingGroups: (
    values: MessageValues,
  ) =>
    interpolate(
      "バックアップから「{name}」を作成します。既存のグループは変更されません。",
      values,
    ),
  restoreThisBackup: "このバックアップを復元しますか？",
  createNewGroup2: "プレビューを確認してグループを作成",
  copyGroup: "グループをコピー",
  copyThisGroup: "このグループをコピーしますか？",
  copyGroupDescription:
    "メンバー、基準通貨、独自の為替レートを新しいグループにコピーします。支出、精算記録、共同編集者、共有リンクはコピーしません。元のグループは変更されません。",
  groupCopied: "グループをコピーしました",
  groupPreferences: "グループの設定",
  changingTheBaseCurrencyRecalculatesDisplayedAmountsAndClearsCustomExchangeRates:
    "基準通貨を変更すると表示金額を再計算し、独自の為替レートを消去します。",
  nameAndBaseCurrency: "名前と基準通貨",
  totalSpendingWillDisplayAsAmountBalancesAndSettlementsBelowWillBeConverted: (
    values: MessageValues,
  ) =>
    interpolate(
      "支出合計は {amount} と表示されます。以下の残高と精算も換算されます。",
      values,
    ),
  expectCountSettlementSuggestionsCustomRatesWillResetToBuiltInValues: (
    values: MessageValues,
  ) =>
    interpolate(
      "精算案は {count} 件になる予定です。独自のレートは Bank of Taiwan の標準値に戻ります。",
      values,
    ),
  cancelChanges: "変更をキャンセル",
  applyGroupPreferences: "グループ設定を適用",
  changeTheBaseCurrencyToCurrencyRecalculateAllResultsAndClearCustomRates: (
    values: MessageValues,
  ) =>
    interpolate(
      "基準通貨を {currency} に変更し、すべての結果を再計算して独自のレートを消去します。",
      values,
    ),
  renameTheGroupToName: (values: MessageValues) =>
    interpolate("グループ名を「{name}」に変更します。", values),
  applyTheseChanges: "これらの変更を適用しますか？",
  applyChanges: "プレビューを確認して変更を適用",
  groupPreferencesApplied: "グループ設定を適用しました",
  saveFailed: "保存に失敗しました",
  customExchangeRatesApplied: "独自の為替レートを適用しました",
  unableToSaveExchangeRates: "為替レートを保存できません",
  currencyConversion: "通貨換算",
  countCustomRates: (values: MessageValues) =>
    interpolate("独自のレート {count} 件", values),
  setHowMuch1UnitOfEachCurrencyEqualsInCurrencyLeaveBlankToUseTheBuiltInFixedRate:
    (values: MessageValues) =>
      interpolate(
        "外貨 1 単位が何 {currency} に相当するか設定してください。空欄の場合は Bank of Taiwan のスポット仲値を使用します。",
        values,
      ),
  customExchangeRates: "独自の為替レート",
  bankOfTaiwanSpotMidRateDescription:
    "独自のレートがない新しい支出は Bank of Taiwan のスポット仲値を使用し、その支出に保存します。独自の値の消去は今後の支出にのみ影響します。支払い記録は現在のレートで換算します。",
  loadBankOfTaiwanSpotMidRates: "Bank of Taiwan の標準レートを取得",
  loadingBankExchangeRates: "銀行の為替レートを取得中…",
  bankOfTaiwanSpotMidRatesLoadedAtTime: (values: MessageValues) =>
    interpolate(
      "Bank of Taiwan のスポット仲値を取得しました（{time}）。",
      values,
    ),
  bankOfTaiwanDefaultRatesApplied: "Bank of Taiwan の標準レートに戻しました",
  unableToLoadBankExchangeRates:
    "銀行の為替レートを取得できません。しばらくしてから再試行してください",
  conversionPreview: "換算のプレビュー",
  totalSpendingAmountCountSettlementSuggestions: (values: MessageValues) =>
    interpolate("支出合計：{amount} · 精算案 {count} 件", values),
  applyRates: "為替レートを適用",
  allTotalsBalancesAndSettlementSuggestionsWillBeRecalculatedWithTheseRates:
    "記録済みの支出は元のレートを保持します。新しいレートは、今後追加する支出、金額や通貨を変更する支出、既存の支払い記録に適用されます。",
  applyCustomExchangeRates: "独自の為替レートを適用しますか？",
  restoreBankOfTaiwanDefaultRates: "Bank of Taiwan の標準レートに戻しますか？",
  apiWriteSettings: "API 編集権限",
  apiWritesAllowed: "許可",
  apiWritesBlocked: "許可しない",
  apiWriteSettingsDescription:
    "初期設定では API token や CLI によるこのグループの編集は許可されません。有効にすると、API token を持つメンバーは権限に応じて編集できます。ブラウザーでの操作には影響しません。",
  allowApiWrites: "API token によるグループの編集を許可",
  apiWriteSettingSaved: "API 編集権限を更新しました",
  groupLifecycle: "グループの状態",
  archivedReadOnly: "アーカイブ済み・閲覧専用",
  active2: "使用中",
  afterRestoringDataCanBeAddedAndChangedAgain:
    "復元するとデータの追加と編集ができます。",
  archivingPreservesAllDataButMakesTheGroupReadOnly:
    "アーカイブはすべてのデータを保持しますが、グループは閲覧専用になります。",
  restoreGroup: "グループを復元",
  archiveGroup: "グループをアーカイブ",
  afterRestoringTheOwnerAndCollaboratorsCanEditDataAgain:
    "復元すると所有者と共同編集者は再びデータを編集できます。",
  expensesPeopleAndPaymentRecordsArePreservedAndCannotBeChangedWhileArchived:
    "支出、メンバー、支払い記録は保持されます。アーカイブ中は編集できません。",
  groupRestored: "グループを復元しました",
  groupArchived: "グループをアーカイブしました",
  restoreThisGroup: "このグループを復元しますか？",
  archiveThisGroup: "このグループをアーカイブしますか？",
  thisPermanentlyDeletesAllPeopleExpensesReceiptsAndSettlementRecordsAndCannotBeUndone:
    "すべてのメンバー、支出、領収書、精算記録を完全に削除します。元に戻せません。",
  deleteGroup: "グループを削除",
  enterNameToConfirm: (values: MessageValues) =>
    interpolate("確認のため「{name}」を入力", values),
  permanentlyDeleteName: (values: MessageValues) =>
    interpolate("「{name}」を完全に削除", values),
  thisCannotBeUndoneCancelingMakesNoChanges:
    "元に戻せません。キャンセルすれば変更はありません。",
  permanentlyDeleteThisGroup: "グループを完全に削除しますか？",
  permanentlyDeleteGroup: "グループを完全に削除",
  groupDeleted: "グループを削除しました",
  readOnlyShare: "閲覧専用の共有",
  youCanViewExpensesBalancesAndSettlementSuggestionsButCannotEditData:
    "支出、残高、精算案を閲覧できますが、データは編集できません。",
  completeExpenseHistory: "すべての支出記録",
  manageGroupSettings: "グループ設定を管理",
  csvImportFailed: "CSV のインポートに失敗しました",
  theCsvHasNoData: "CSV にデータがありません",
  missingColumnsColumns: (values: MessageValues) =>
    interpolate("不足している列：{columns}", values),
  participantNotFoundName: (values: MessageValues) =>
    interpolate("参加者が見つかりません：{name}", values),
  invalidJsonFormat: "JSON 形式が無効です",
  incorrectUsernameOrPassword: "ユーザー名またはパスワードが違います",
  everyPersonNeedsAnAmountForACustomSplit:
    "不均等な分担には全員の金額が必要です",
  unsupportedBackupVersion: "対応していないバックアップのバージョンです",
  unsupportedSplitMethod: "対応していない分担方法です",
  unsupportedExchangeRateCurrency: "対応していない為替レートの通貨です",
  unsupportedBaseCurrency: "対応していない基準通貨です",
  unsupportedCurrency: "対応していない通貨です",
  aParticipantCannotBeMergedIntoThemselves: "同じ参加者に統合できません",
  theOwnerCannotBeRemoved: "所有者は削除できません",
  thePayerAndRecipientMustBeDifferent: "支払者と受取人は別の人にしてください",
  payerIsRequired: "支払者は必須です",
  thePayerMustBeAParticipant: "支払者は参加者にしてください",
  serverError: "サーバーエラー",
  invalidPaymentRecordsInBackup: "バックアップの支払い記録が無効です",
  splitTotalsInBackupAreInvalid: "バックアップの分担合計が無効です",
  invalidSplitDataInBackup: "バックアップの分担データが無効です",
  invalidExchangeRatesInBackup: "バックアップの為替レートが無効です",
  invalidParticipantDataInBackup: "バックアップの参加者データが無効です",
  backupContainsDuplicateParticipants: "バックアップに重複する参加者がいます",
  invalidBaseCurrencyInBackup: "バックアップの基準通貨が無効です",
  invalidExpenseCategoryInBackup: "バックアップの支出カテゴリが無効です",
  anExpenseParticipantInTheBackupDoesNotExist:
    "バックアップの支出に存在しない参加者がいます",
  anExpenseInTheBackupHasDuplicateParticipants:
    "バックアップの支出に重複する参加者がいます",
  invalidExpenseDataInBackup: "バックアップの支出データが無効です",
  invalidExpenseTagsInBackup: "バックアップの支出タグが無効です",
  invalidTripNameInBackup: "バックアップの旅行名が無効です",
  backupIsMissingItsTrip: "バックアップに trip がありません",
  backupIsMissingParticipants: "バックアップに参加者がありません",
  backupIsMissingExpenses: "バックアップに支出がありません",
  notesCanBeUpTo160Characters: "メモは 160 文字以内にしてください",
  theShareLinkIsInvalidOrHasBeenRevoked: "共有リンクが無効か取り消し済みです",
  atLeastOneSplitParticipantIsRequired: "分担者が 1 人以上必要です",
  splitParticipantsMustBelongToTheTrip: "分担者は旅行の参加者にしてください",
  splitAmountsMustAddUpToTheExpenseAmount:
    "分担額の合計は支出額と一致する必要があります",
  splitAmountsMustBeGreaterThan0: "分担額は 0 より大きくしてください",
  invalidSplitAmount: "分担額が無効です",
  invalidCategoryOrTagFormat: "カテゴリまたはタグの形式が無効です",
  exchangeRatesMustBeGreaterThan0: "為替レートは 0 より大きくしてください",
  invalidExchangeRateFormat: "為替レートの形式が無効です",
  aParticipantWithThisNameAlreadyExists: "この名前の参加者はすでに存在します",
  thisParticipantHasPaymentRecordsAndCannotBeDeleted:
    "この参加者には支払い記録があるため削除できません",
  thisParticipantHasExpensesAndCannotBeDeleted:
    "この参加者には支出があるため削除できません",
  onlyTheOwnerCanDownloadACompleteBackup:
    "完全バックアップをダウンロードできるのは所有者のみです",
  onlyTheOwnerCanManageShareLinks: "共有リンクを管理できるのは所有者のみです",
  onlyTheOwnerCanManageCollaborators:
    "共同編集者を管理できるのは所有者のみです",
  onlyTheOwnerCanManageTripSettings: "旅行の設定を管理できるのは所有者のみです",
  namesCanBeUpTo80Characters: "名前は 80 文字以内にしてください",
  passwordMustBeAtLeast8Characters3: "パスワードは 8 文字以上必要です",
  invalidArchiveStatus: "アーカイブ状態が無効です",
  invalidApiWriteSetting: "API 編集権限が無効です",
  onlyBrowserSessionsCanManageApiWrites:
    "API 編集権限はブラウザーでのログインからのみ管理できます",
  apiWritesDisabledForThisGroup:
    "このグループは API token による編集を許可していません",
  apiEndpointNotFound: "API が見つかりません",
  paymentRecordNotFound: "支払い記録が見つかりません",
  collaboratorNotFound: "共同編集者が見つかりません",
  participantNotFound: "参加者が見つかりません",
  noActiveShareLinkWasFound: "取り消せる共有リンクが見つかりません",
  expenseNotFound: "支出が見つかりません",
  receiptNotFound: "領収書が見つかりません",
  tripNotFound: "旅行が見つかりません",
  userNotFound: "ユーザーが見つかりません",
  descriptionMustBe1120Characters: "説明は 1～120 文字にしてください",
  theOwnerIsAlreadyInTheCollaboratorList:
    "所有者はすでに共同編集者の一覧にいます",
  thisGroupIsArchivedRestoreItBeforeEditing:
    "このグループはアーカイブ済みです。編集前に復元してください",
  receiptsMustBeJpegPngOrWebpImages:
    "領収書は JPEG、PNG、WebP の画像にしてください",
  theRecipientMustBeAParticipant: "受取人は参加者にしてください",
  aTripWithThisNameAlreadyExists: "この名前の旅行はすでに存在します",
  dateMustUseTheYyyyMmDdFormat: "日付は YYYY-MM-DD 形式にしてください",
  upTo10TagsAreAllowed: "タグは 10 個までです",
  tagsCanBeUpTo24Characters: "タグは 24 文字以内にしてください",
  invalidTagFormat: "タグの形式が無効です",
  theTargetParticipantMustBelongToTheTrip:
    "統合先の参加者は旅行の参加者にしてください",
  signInFirst: "先にログインしてください",
  provideExpenseChanges: "更新する支出の内容を指定してください",
  provideTripChanges: "更新する旅行の内容を指定してください",
  requestBodyIsTooLarge: "リクエストの内容が大きすぎます",
  selectAtLeastOneSplitParticipant: "分担者を 1 人以上選択してください",
  enterATripNameOf1100Characters: "旅行名を 1～100 文字で入力してください",
  enterAnExpenseDescriptionOf1120Characters:
    "支出の説明を 1～120 文字で入力してください",
  enterAParticipantNameOf180Characters:
    "参加者名を 1～80 文字で入力してください",
  enterAUsernameAndPassword: "ユーザー名とパスワードを入力してください",
  enterSplitValues: "分担の値を入力してください",
  enterAValidPaymentDate: "有効な支払日を入力してください",
  enterValidSplitShares: "有効な分担口数を入力してください",
  enterValidSplitPercentages: "有効な分担割合を入力してください",
  enterValidSplitAmounts: "有効な分担額を入力してください",
  enterAValidExpenseDate: "有効な支出日を入力してください",
  chooseACsvFile: "CSV ファイルを選択してください",
  selectSplitParticipants: "分担者を選択してください",
  chooseAReceiptImage: "領収書の画像を選択してください",
  thisUserIsAlreadyACollaborator: "このユーザーはすでに共同編集者です",
  thisUsernameIsAlreadyRegistered: "このユーザー名は登録済みです",
  usernameIsBeingRegisteredOrAlreadyRegistered:
    "このユーザー名は登録中か登録済みです",
  usernameIsBeingRegistered: "このユーザー名は登録中です",
  usernameOrPasskeyAlreadyRegistered: "ユーザー名または Passkey は登録済みです",
  invalidAmount: "金額が無効です",
  theDefaultDevelopmentAccountsUsernameCannotBeChanged:
    "開発環境の標準アカウントのユーザー名は変更できません",
  language: "言語",
  english: "English",
  traditionalChinese: "正體中文",
};
