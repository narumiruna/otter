import { interpolate, type MessageValues } from "./message-types.js";

export const koSettings = {
  groupSettings: "그룹 설정",
  manageSharingGroupPreferencesAndDataToolsHighImpactActionsRequireConfirmation:
    "공유, 그룹 환경 설정 및 데이터 도구를 관리하세요. 영향이 큰 작업은 실행 전에 확인이 필요합니다.",
  youAreACollaboratorAndCanUseDataToolsOnlyTheOwnerCanManageAccessAndGroupSettings:
    "공동 편집자는 데이터 도구를 사용할 수 있습니다. 소유자만 접근 권한과 그룹 설정을 관리할 수 있습니다.",
  sharingAndAccess: "공유 및 접근 권한",
  linksActiveLinksCollaboratorsCollaborators: (values: MessageValues) =>
    interpolate("활성 링크 {links}개 · 공동 편집자 {collaborators}명", values),
  shareLinkCreated: "공유 링크가 생성되었습니다",
  shareLinkCreatedAndCopied: "공유 링크가 생성되고 복사되었습니다",
  shareLinks: "공유 링크",
  chooseWhoCanEditThroughTheShareLink:
    "링크의 보기 또는 수정 권한을 선택하세요.",
  linkPermission: "링크 권한",
  readOnlyLink: "읽기 전용 (로그인 불필요)",
  signedInEditLink: "로그인 후 수정",
  anyoneEditLink: "링크를 가진 누구나 수정",
  signedInEditLinkDescription:
    "로그인하거나 가입한 후 링크를 열면 공동 편집자가 됩니다. 링크를 폐기해도 이미 참여한 사람은 제거되지 않습니다.",
  anyoneEditLinkDescription:
    "링크를 가진 누구나 로그인 없이 지출과 참여자를 수정할 수 있습니다. 신뢰하는 사람에게만 공유하세요. 폐기하면 즉시 무효화됩니다.",
  revokingSignedInLinkDoesNotRemoveExistingCollaborators:
    "폐기하면 이 링크로 새로 참여할 수 없습니다. 기존 공동 편집자는 계속 수정할 수 있으므로 권한을 별도로 제거하세요.",
  signInToEditSharedGroup: (values: MessageValues) =>
    interpolate(
      "{name}을(를) 수정하려면 로그인하거나 계정을 만드세요.",
      values,
    ),
  readOnlyShareLinkCreated: "읽기 전용 공유 링크가 생성되었습니다",
  readOnlyShareLinkCreatedAndCopied:
    "읽기 전용 공유 링크가 생성되고 복사되었습니다",
  shareLinkCreatedYourBrowserBlockedAutomaticCopyingCopyItManually:
    "공유 링크가 생성되었습니다. 브라우저에서 자동 복사를 차단했습니다. 직접 복사하세요",
  unableToCreateLink: "링크를 만들 수 없습니다",
  shareLinkCopied: "공유 링크가 복사되었습니다",
  yourBrowserBlockedCopyingOpenTheLinkAndCopyItFromTheAddressBar:
    "브라우저에서 복사를 차단했습니다. 링크를 열고 주소 표시줄에서 복사하세요",
  anyoneWithTheLinkCanViewExpensesBalancesAndSettlementsWithoutSigningInButCannotEdit:
    "링크를 가진 누구나 로그인 없이 지출, 잔액 및 정산을 볼 수 있지만 수정할 수는 없습니다.",
  readOnlyShareLinks: "읽기 전용 공유 링크",
  createReadOnlyLink: "읽기 전용 링크 만들기",
  anyoneWithTheLinkCanViewThisGroupsExpensesBalancesAndSettlementSuggestionsButCannotAddOrChangeData:
    "링크를 가진 누구나 이 그룹의 지출, 잔액 및 정산 제안을 볼 수 있지만 데이터를 추가하거나 수정할 수는 없습니다.",
  createAShareLink: "공유 링크를 만들까요?",
  createShareLink: "공유 링크 만들기",
  revoked: "폐기됨",
  active: "활성",
  openLink: "링크 열기",
  copy: "복사",
  revokeLink: "링크 폐기",
  afterRevocationTheOldLinkWillImmediatelyStopWorking:
    "폐기하면 이전 링크로 즉시 이 그룹을 볼 수 없게 됩니다.",
  shareLinkRevoked: "공유 링크가 폐기되었습니다",
  revokeThisShareLink: "이 공유 링크를 폐기할까요?",
  revoke: "폐기",
  noShareLinksYet: "아직 공유 링크가 없습니다.",
  collaboratorAdded: "공동 편집자가 추가되었습니다",
  unableToAddCollaborator: "공동 편집자를 추가할 수 없습니다",
  collaboratorsMustBeExistingUsersTheyCanManageExpensesAndParticipantsButNotOwnerSettings:
    "공동 편집자는 기존 사용자여야 합니다. 지출과 참여자를 관리할 수 있지만 소유자 설정은 변경할 수 없습니다.",
  existingUsersUsername: "기존 사용자의 사용자 이름",
  addCollaborator: "공동 편집자 추가",
  removeName: (values: MessageValues) => interpolate("{name} 제거", values),
  thisAccountWillNoLongerBeAbleToManageTheGroupExistingExpenseDataWillRemain:
    "이 계정은 더 이상 그룹을 관리할 수 없습니다. 기존 지출 데이터는 유지됩니다.",
  collaboratorRemoved: "공동 편집자가 제거되었습니다",
  removeCollaborator: "공동 편집자를 제거할까요?",
  remove: "제거",
  dataAndExport: "데이터 및 내보내기",
  csvPrintBackupAndRestore: "CSV, 인쇄, 백업 및 복원",
  exportingDoesNotChangeGroupData:
    "내보내기는 그룹 데이터를 변경하지 않습니다.",
  exportAndPrint: "내보내기 및 인쇄",
  expenseCsvExported: "지출 CSV를 내보냈습니다",
  exportExpenseCsv: "지출 CSV 내보내기",
  settlementCsvExported: "정산 CSV를 내보냈습니다",
  exportSettlementCsv: "정산 CSV 내보내기",
  print: "인쇄",
  completeBackupDownloaded: "전체 백업을 다운로드했습니다",
  downloadFailed: "다운로드에 실패했습니다",
  downloadCompleteBackup: "전체 백업 다운로드",
  expenseCsvImported: "지출 CSV를 가져왔습니다",
  importFailed: "가져오기에 실패했습니다",
  allRowsAreCheckedFirstNoDataIsWrittenIfAnyRowHasAnError:
    "먼저 모든 행을 검사합니다. 오류가 있으면 데이터를 저장하지 않습니다.",
  importExpenseCsv: "지출 CSV 가져오기",
  chooseCsv: "CSV 선택",
  importPreview: "가져오기 미리 보기",
  rowsRowsCanBeImportedErrorsErrors: (values: MessageValues) =>
    interpolate("가져올 수 있는 행 {rows}개 · 오류 {errors}개", values),
  rowRowMessage: (values: MessageValues) =>
    interpolate("{row}행: {message}", values),
  importCountExpenses: (values: MessageValues) =>
    interpolate("지출 {count}건 가져오기", values),
  thisWillAddCountExpensesAtOnceAndRecalculateBalances: (
    values: MessageValues,
  ) =>
    interpolate(
      "지출 {count}건을 한 번에 추가하고 잔액을 다시 계산합니다.",
      values,
    ),
  applyCsvImport: "CSV 가져오기를 적용할까요?",
  applyImport: "미리 보기 확인 후 가져오기 적용",
  invalidBackupFormat: "백업 형식이 잘못되었습니다",
  backupRestoredAsANewGroup: "백업이 새 그룹으로 복원되었습니다",
  restoreFailed: "복원에 실패했습니다",
  restoringCreatesANewGroupAndDoesNotOverwriteCurrentData:
    "복원하면 새 그룹이 생성됩니다. 현재 데이터는 덮어쓰지 않습니다.",
  restoreJsonBackup: "JSON 백업 복원",
  chooseJsonBackup: "JSON 백업 선택",
  restorePreviewName: (values: MessageValues) =>
    interpolate("복원 미리 보기: {name}", values),
  peoplePeopleExpensesExpensesPaymentsPaymentsBaseCurrency: (
    values: MessageValues,
  ) =>
    interpolate(
      "참여자 {people}명 · 지출 {expenses}건 · 결제 {payments}건 · 기준 통화 {currency}",
      values,
    ),
  createNewGroup: "새 그룹 만들기",
  aNewGroupNamedNameWillBeCreatedWithoutChangingExistingGroups: (
    values: MessageValues,
  ) =>
    interpolate(
      '백업에서 "{name}" 그룹을 만듭니다. 기존 그룹은 변경되지 않습니다.',
      values,
    ),
  restoreThisBackup: "이 백업을 복원할까요?",
  createNewGroup2: "미리 보기 확인 후 새 그룹 만들기",
  copyGroup: "그룹 복사",
  copyThisGroup: "이 그룹을 복사할까요?",
  copyGroupDescription:
    "참여자, 기준 통화 및 사용자 지정 환율을 새 그룹에 복사합니다. 지출, 정산 기록, 공동 편집자 및 공유 링크는 복사하지 않습니다. 원래 그룹은 변경되지 않습니다.",
  groupCopied: "그룹이 복사되었습니다",
  groupPreferences: "그룹 환경 설정",
  changingTheBaseCurrencyRecalculatesDisplayedAmountsAndClearsCustomExchangeRates:
    "기준 통화를 변경하면 표시 금액을 다시 계산하고 사용자 지정 환율을 지웁니다.",
  nameAndBaseCurrency: "이름 및 기준 통화",
  totalSpendingWillDisplayAsAmountBalancesAndSettlementsBelowWillBeConverted: (
    values: MessageValues,
  ) =>
    interpolate(
      "총 지출은 {amount}(으)로 표시됩니다. 아래 잔액과 정산도 환산됩니다.",
      values,
    ),
  expectCountSettlementSuggestionsCustomRatesWillResetToBuiltInValues: (
    values: MessageValues,
  ) =>
    interpolate(
      "정산 제안은 {count}건으로 예상됩니다. 사용자 지정 환율은 Bank of Taiwan 기본값으로 초기화됩니다.",
      values,
    ),
  cancelChanges: "변경 취소",
  applyGroupPreferences: "그룹 환경 설정 적용",
  changeTheBaseCurrencyToCurrencyRecalculateAllResultsAndClearCustomRates: (
    values: MessageValues,
  ) =>
    interpolate(
      "기준 통화를 {currency}(으)로 변경하고 모든 결과를 다시 계산하며 사용자 지정 환율을 지웁니다.",
      values,
    ),
  renameTheGroupToName: (values: MessageValues) =>
    interpolate('그룹 이름을 "{name}"(으)로 변경합니다.', values),
  applyTheseChanges: "이 변경 사항을 적용할까요?",
  applyChanges: "미리 보기 확인 후 변경 적용",
  groupPreferencesApplied: "그룹 환경 설정이 적용되었습니다",
  saveFailed: "저장에 실패했습니다",
  customExchangeRatesApplied: "사용자 지정 환율이 적용되었습니다",
  unableToSaveExchangeRates: "환율을 저장할 수 없습니다",
  currencyConversion: "통화 환산",
  countCustomRates: (values: MessageValues) =>
    interpolate("사용자 지정 환율 {count}개", values),
  setHowMuch1UnitOfEachCurrencyEqualsInCurrencyLeaveBlankToUseTheBuiltInFixedRate:
    (values: MessageValues) =>
      interpolate(
        "외화 1단위가 몇 {currency}인지 설정하세요. 비워 두면 Bank of Taiwan 현물 중간 환율을 사용합니다.",
        values,
      ),
  customExchangeRates: "사용자 지정 환율",
  bankOfTaiwanSpotMidRateDescription:
    "사용자 지정 환율이 없는 새 지출에는 Bank of Taiwan 현물 중간 환율을 적용하고 해당 지출에 저장합니다. 사용자 지정 값을 지우면 이후 지출에만 영향을 줍니다. 결제 기록은 현재 환율로 환산합니다.",
  loadBankOfTaiwanSpotMidRates: "Bank of Taiwan 기본 환율 불러오기",
  loadingBankExchangeRates: "은행 환율 불러오는 중…",
  bankOfTaiwanSpotMidRatesLoadedAtTime: (values: MessageValues) =>
    interpolate(
      "Bank of Taiwan 현물 중간 환율을 불러왔습니다 ({time}).",
      values,
    ),
  bankOfTaiwanDefaultRatesApplied: "Bank of Taiwan 기본 환율이 복원되었습니다",
  unableToLoadBankExchangeRates:
    "은행 환율을 불러올 수 없습니다. 잠시 후 다시 시도하세요",
  conversionPreview: "환산 미리 보기",
  totalSpendingAmountCountSettlementSuggestions: (values: MessageValues) =>
    interpolate("총 지출: {amount} · 정산 제안 {count}건", values),
  applyRates: "환율 적용",
  allTotalsBalancesAndSettlementSuggestionsWillBeRecalculatedWithTheseRates:
    "기록된 지출은 원래 환율을 유지합니다. 새 환율은 이후 추가하거나 금액 또는 통화를 수정하는 지출과 기존 결제 기록에 적용됩니다.",
  applyCustomExchangeRates: "사용자 지정 환율을 적용할까요?",
  restoreBankOfTaiwanDefaultRates: "Bank of Taiwan 기본 환율을 복원할까요?",
  apiWriteSettings: "API 수정 권한",
  apiWritesAllowed: "허용됨",
  apiWritesBlocked: "차단됨",
  apiWriteSettingsDescription:
    "기본적으로 API token이나 CLI로 이 그룹을 수정할 수 없습니다. 활성화하면 API token을 가진 그룹 참여자가 자신의 권한에 따라 수정할 수 있습니다. 브라우저 작업에는 영향이 없습니다.",
  allowApiWrites: "API token으로 그룹 수정 허용",
  apiWriteSettingSaved: "API 수정 권한이 변경되었습니다",
  groupLifecycle: "그룹 상태",
  archivedReadOnly: "보관됨 · 읽기 전용",
  active2: "사용 중",
  afterRestoringDataCanBeAddedAndChangedAgain:
    "복원하면 데이터를 다시 추가하고 수정할 수 있습니다.",
  archivingPreservesAllDataButMakesTheGroupReadOnly:
    "보관하면 모든 데이터는 유지되지만 그룹이 읽기 전용으로 바뀝니다.",
  restoreGroup: "그룹 복원",
  archiveGroup: "그룹 보관",
  afterRestoringTheOwnerAndCollaboratorsCanEditDataAgain:
    "복원하면 소유자와 공동 편집자가 다시 데이터를 수정할 수 있습니다.",
  expensesPeopleAndPaymentRecordsArePreservedAndCannotBeChangedWhileArchived:
    "지출, 참여자 및 결제 기록은 유지됩니다. 보관 중에는 수정할 수 없습니다.",
  groupRestored: "그룹이 복원되었습니다",
  groupArchived: "그룹이 보관되었습니다",
  restoreThisGroup: "이 그룹을 복원할까요?",
  archiveThisGroup: "이 그룹을 보관할까요?",
  thisPermanentlyDeletesAllPeopleExpensesReceiptsAndSettlementRecordsAndCannotBeUndone:
    "모든 참여자, 지출, 영수증 및 정산 기록을 영구 삭제합니다. 되돌릴 수 없습니다.",
  deleteGroup: "그룹 삭제",
  enterNameToConfirm: (values: MessageValues) =>
    interpolate('확인하려면 "{name}" 입력', values),
  permanentlyDeleteName: (values: MessageValues) =>
    interpolate('"{name}" 영구 삭제', values),
  thisCannotBeUndoneCancelingMakesNoChanges:
    "되돌릴 수 없습니다. 취소하면 변경되지 않습니다.",
  permanentlyDeleteThisGroup: "이 그룹을 영구 삭제할까요?",
  permanentlyDeleteGroup: "그룹 영구 삭제",
  groupDeleted: "그룹이 삭제되었습니다",
  readOnlyShare: "읽기 전용 공유",
  youCanViewExpensesBalancesAndSettlementSuggestionsButCannotEditData:
    "지출, 잔액 및 정산 제안을 볼 수 있지만 데이터를 수정할 수는 없습니다.",
  completeExpenseHistory: "전체 지출 기록",
  manageGroupSettings: "그룹 설정 관리",
  csvImportFailed: "CSV 가져오기에 실패했습니다",
  theCsvHasNoData: "CSV에 데이터가 없습니다",
  missingColumnsColumns: (values: MessageValues) =>
    interpolate("누락된 열: {columns}", values),
  participantNotFoundName: (values: MessageValues) =>
    interpolate("참여자를 찾을 수 없습니다: {name}", values),
  invalidJsonFormat: "JSON 형식이 잘못되었습니다",
  incorrectUsernameOrPassword: "사용자 이름 또는 비밀번호가 잘못되었습니다",
  everyPersonNeedsAnAmountForACustomSplit:
    "사용자 지정 분담에는 모든 참여자의 금액이 필요합니다",
  unsupportedBackupVersion: "지원하지 않는 백업 버전입니다",
  unsupportedSplitMethod: "지원하지 않는 분담 방식입니다",
  unsupportedExchangeRateCurrency: "지원하지 않는 환율 통화입니다",
  unsupportedBaseCurrency: "지원하지 않는 기준 통화입니다",
  unsupportedCurrency: "지원하지 않는 통화입니다",
  aParticipantCannotBeMergedIntoThemselves:
    "같은 참여자에게 병합할 수 없습니다",
  theOwnerCannotBeRemoved: "소유자를 제거할 수 없습니다",
  thePayerAndRecipientMustBeDifferent: "결제자와 수취인은 달라야 합니다",
  payerIsRequired: "결제자는 필수입니다",
  thePayerMustBeAParticipant: "결제자는 참여자여야 합니다",
  serverError: "서버 오류",
  invalidPaymentRecordsInBackup: "백업 결제 기록이 잘못되었습니다",
  splitTotalsInBackupAreInvalid: "백업의 분담 합계가 잘못되었습니다",
  invalidSplitDataInBackup: "백업 분담 데이터가 잘못되었습니다",
  invalidExchangeRatesInBackup: "백업 환율이 잘못되었습니다",
  invalidParticipantDataInBackup: "백업 참여자 데이터가 잘못되었습니다",
  backupContainsDuplicateParticipants: "백업에 중복 참여자가 있습니다",
  invalidBaseCurrencyInBackup: "백업 기준 통화가 잘못되었습니다",
  invalidExpenseCategoryInBackup: "백업 지출 분류가 잘못되었습니다",
  anExpenseParticipantInTheBackupDoesNotExist:
    "백업 지출에 존재하지 않는 참여자가 있습니다",
  anExpenseInTheBackupHasDuplicateParticipants:
    "백업 지출에 중복 참여자가 있습니다",
  invalidExpenseDataInBackup: "백업 지출 데이터가 잘못되었습니다",
  invalidExpenseTagsInBackup: "백업 지출 태그가 잘못되었습니다",
  invalidTripNameInBackup: "백업 여행 이름이 잘못되었습니다",
  backupIsMissingItsTrip: "백업에 trip이 없습니다",
  backupIsMissingParticipants: "백업에 참여자가 없습니다",
  backupIsMissingExpenses: "백업에 지출이 없습니다",
  notesCanBeUpTo160Characters: "메모는 160자 이하여야 합니다",
  theShareLinkIsInvalidOrHasBeenRevoked:
    "공유 링크가 유효하지 않거나 폐기되었습니다",
  atLeastOneSplitParticipantIsRequired: "분담 참여자가 최소 1명 필요합니다",
  splitParticipantsMustBelongToTheTrip: "분담 참여자는 여행 참여자여야 합니다",
  splitAmountsMustAddUpToTheExpenseAmount:
    "분담 금액 합계는 지출 금액과 같아야 합니다",
  splitAmountsMustBeGreaterThan0: "분담 금액은 0보다 커야 합니다",
  invalidSplitAmount: "분담 금액이 잘못되었습니다",
  invalidCategoryOrTagFormat: "분류 또는 태그 형식이 잘못되었습니다",
  exchangeRatesMustBeGreaterThan0: "환율은 0보다 커야 합니다",
  invalidExchangeRateFormat: "환율 형식이 잘못되었습니다",
  aParticipantWithThisNameAlreadyExists: "이 이름의 참여자가 이미 있습니다",
  thisParticipantHasPaymentRecordsAndCannotBeDeleted:
    "이 참여자는 결제 기록이 있어 삭제할 수 없습니다",
  thisParticipantHasExpensesAndCannotBeDeleted:
    "이 참여자는 지출이 있어 삭제할 수 없습니다",
  onlyTheOwnerCanDownloadACompleteBackup:
    "소유자만 전체 백업을 다운로드할 수 있습니다",
  onlyTheOwnerCanManageShareLinks: "소유자만 공유 링크를 관리할 수 있습니다",
  onlyTheOwnerCanManageCollaborators:
    "소유자만 공동 편집자를 관리할 수 있습니다",
  onlyTheOwnerCanManageTripSettings: "소유자만 여행 설정을 관리할 수 있습니다",
  namesCanBeUpTo80Characters: "이름은 80자 이하여야 합니다",
  passwordMustBeAtLeast8Characters3: "비밀번호는 8자 이상이어야 합니다",
  invalidArchiveStatus: "보관 상태가 잘못되었습니다",
  invalidApiWriteSetting: "API 수정 권한이 잘못되었습니다",
  onlyBrowserSessionsCanManageApiWrites:
    "브라우저 로그인으로만 API 수정 권한을 관리할 수 있습니다",
  apiWritesDisabledForThisGroup:
    "이 그룹은 API token을 통한 수정을 허용하지 않습니다",
  apiEndpointNotFound: "API를 찾을 수 없습니다",
  paymentRecordNotFound: "결제 기록을 찾을 수 없습니다",
  collaboratorNotFound: "공동 편집자를 찾을 수 없습니다",
  participantNotFound: "참여자를 찾을 수 없습니다",
  noActiveShareLinkWasFound: "폐기할 수 있는 공유 링크를 찾을 수 없습니다",
  expenseNotFound: "지출을 찾을 수 없습니다",
  receiptNotFound: "영수증을 찾을 수 없습니다",
  tripNotFound: "여행을 찾을 수 없습니다",
  userNotFound: "사용자를 찾을 수 없습니다",
  descriptionMustBe1120Characters: "설명은 1~120자여야 합니다",
  theOwnerIsAlreadyInTheCollaboratorList:
    "소유자는 이미 공동 편집자 목록에 있습니다",
  thisGroupIsArchivedRestoreItBeforeEditing:
    "이 그룹은 보관되어 있습니다. 수정하기 전에 복원하세요",
  receiptsMustBeJpegPngOrWebpImages:
    "영수증은 JPEG, PNG 또는 WebP 이미지여야 합니다",
  theRecipientMustBeAParticipant: "수취인은 참여자여야 합니다",
  aTripWithThisNameAlreadyExists: "이 이름의 여행이 이미 있습니다",
  dateMustUseTheYyyyMmDdFormat: "날짜는 YYYY-MM-DD 형식이어야 합니다",
  upTo10TagsAreAllowed: "태그는 최대 10개까지 가능합니다",
  tagsCanBeUpTo24Characters: "태그는 24자 이하여야 합니다",
  invalidTagFormat: "태그 형식이 잘못되었습니다",
  theTargetParticipantMustBelongToTheTrip:
    "대상 참여자는 여행 참여자여야 합니다",
  signInFirst: "먼저 로그인하세요",
  provideExpenseChanges: "변경할 지출 내용을 제공하세요",
  provideTripChanges: "변경할 여행 내용을 제공하세요",
  requestBodyIsTooLarge: "요청 내용이 너무 큽니다",
  selectAtLeastOneSplitParticipant: "분담 참여자를 최소 1명 선택하세요",
  enterATripNameOf1100Characters: "여행 이름을 1~100자로 입력하세요",
  enterAnExpenseDescriptionOf1120Characters: "지출 설명을 1~120자로 입력하세요",
  enterAParticipantNameOf180Characters: "참여자 이름을 1~80자로 입력하세요",
  enterAUsernameAndPassword: "사용자 이름과 비밀번호를 입력하세요",
  enterSplitValues: "분담 값을 입력하세요",
  enterAValidPaymentDate: "유효한 결제일을 입력하세요",
  enterValidSplitShares: "유효한 분담 몫을 입력하세요",
  enterValidSplitPercentages: "유효한 분담 비율을 입력하세요",
  enterValidSplitAmounts: "유효한 분담 금액을 입력하세요",
  enterAValidExpenseDate: "유효한 지출 날짜를 입력하세요",
  chooseACsvFile: "CSV 파일을 선택하세요",
  selectSplitParticipants: "분담 참여자를 선택하세요",
  chooseAReceiptImage: "영수증 이미지를 선택하세요",
  thisUserIsAlreadyACollaborator: "이 사용자는 이미 공동 편집자입니다",
  thisUsernameIsAlreadyRegistered: "이 사용자 이름은 이미 등록되어 있습니다",
  usernameIsBeingRegisteredOrAlreadyRegistered:
    "이 사용자 이름은 등록 중이거나 이미 등록되어 있습니다",
  usernameIsBeingRegistered: "이 사용자 이름은 등록 중입니다",
  usernameOrPasskeyAlreadyRegistered:
    "사용자 이름 또는 Passkey가 이미 등록되어 있습니다",
  invalidAmount: "금액이 잘못되었습니다",
  theDefaultDevelopmentAccountsUsernameCannotBeChanged:
    "개발 환경 기본 계정의 사용자 이름은 변경할 수 없습니다",
  language: "언어",
  english: "English",
  traditionalChinese: "正體中文",
};
