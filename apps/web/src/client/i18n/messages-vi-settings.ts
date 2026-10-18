import { interpolate, type MessageValues } from "./message-types.js";

export const viSettings = {
  accountSettings: "Cài đặt tài khoản",
  manageYourUsernameAndPasskeys:
    "Quản lý giao diện, ngôn ngữ, tên người dùng, Passkey và mã thông báo API.",
  appearance: "Giao diện",
  chooseHowOtterLooksOnThisBrowser:
    "Chọn giao diện Otter. Thay đổi có hiệu lực ngay và được lưu trong trình duyệt này.",
  colorTheme: "Chủ đề màu",
  forestTheme: "Rừng",
  oceanTheme: "Đại dương",
  lavenderTheme: "Oải hương",
  sunsetTheme: "Hoàng hôn",
  roseTheme: "Hoa hồng",
  displayMode: "Chế độ hiển thị",
  systemMode: "Hệ thống",
  lightMode: "Sáng",
  darkMode: "Tối",
  useTheNewUsernameTheNextTimeYouSignInYourCurrentSessionWillContinue:
    "Dùng tên người dùng mới vào lần đăng nhập tiếp theo. Phiên hiện tại vẫn tiếp tục.",
  passkeys: "Passkey",
  useAPasskeyToSignInWithoutYourPassword:
    "Dùng cách mở khóa thiết bị để đăng nhập mà không cần nhập mật khẩu.",
  unableToLoadPasskeys: "Không thể tải Passkey",
  unableToAddPasskey: "Không thể thêm Passkey. Nếu bạn đã hủy, hãy thử lại.",
  unableToRemovePasskey: "Không thể xóa Passkey",
  passkeyAdded: "Đã thêm Passkey",
  passkeyRemoved: "Đã xóa Passkey",
  passkeyNumber: (values: MessageValues) =>
    interpolate("Passkey {number}", values),
  addedOnDate: (values: MessageValues) =>
    interpolate("Đã thêm ngày {date}", values),
  removePasskeyNumber: (values: MessageValues) =>
    interpolate("Xóa Passkey {number}", values),
  noPasskeysAdded: "Chưa thêm Passkey nào.",
  addingPasskey: "Đang thêm Passkey…",
  addPasskey: "Thêm Passkey",
  thisBrowserDoesNotSupportPasskeys: "Trình duyệt này không hỗ trợ Passkey.",
  apiTokens: "Mã thông báo API",
  useApiTokensWithTheOtterCli:
    "Tạo mã thông báo Bearer cho Otter CLI hoặc công cụ tự động hóa.",
  loadingApiTokens: "Đang tải mã thông báo API…",
  unableToLoadApiTokens: "Không thể tải mã thông báo API",
  unableToCreateApiToken: "Không thể tạo mã thông báo API",
  apiTokenCreationUncertain:
    "Chưa biết kết quả yêu cầu tạo mã thông báo. Hãy thử lại yêu cầu này trước khi tạo mã khác.",
  retryApiTokenCreation: "Thử tạo lại mã thông báo",
  unableToRevokeApiToken: "Không thể thu hồi mã thông báo API",
  unableToCopyApiToken: "Không thể sao chép mã thông báo API",
  apiTokenRevoked: "Đã thu hồi mã thông báo API",
  apiTokenCopied: "Đã sao chép mã thông báo API",
  enterATokenName: "Nhập tên mã thông báo",
  newApiToken: "Mã thông báo API mới",
  copyYourApiTokenNow: "Sao chép mã thông báo API ngay",
  apiTokenShownOnce:
    "Mã thông báo này chỉ hiển thị một lần. Bạn không thể xem lại sau khi rời trang.",
  copyToken: "Sao chép mã thông báo",
  done: "Xong",
  tokenName: "Tên mã thông báo",
  tokenNameExample: "Ví dụ: Tự động hóa chuyến đi",
  creatingApiToken: "Đang tạo mã thông báo…",
  createApiToken: "Tạo mã thông báo API",
  apiTokenDates: (values: MessageValues) =>
    interpolate("Đã tạo {created} · Hết hạn {expires}", values),
  revokeNamedApiToken: (values: MessageValues) =>
    interpolate("Thu hồi mã thông báo API “{name}”", values),
  noActiveApiTokens: "Không có mã thông báo API đang hoạt động.",
  apiTokensExpireAfter90Days:
    "Mã thông báo hết hạn sau 90 ngày. Để dùng với CLI, hãy đặt mã này làm",
  groupSettings: "Cài đặt nhóm",
  manageSharingGroupPreferencesAndDataToolsHighImpactActionsRequireConfirmation:
    "Quản lý chia sẻ, tùy chọn nhóm và công cụ dữ liệu. Các thao tác có tác động lớn cần được xác nhận.",
  youAreACollaboratorAndCanUseDataToolsOnlyTheOwnerCanManageAccessAndGroupSettings:
    "Bạn là cộng tác viên và có thể dùng công cụ dữ liệu. Chỉ chủ sở hữu mới có thể quản lý quyền truy cập và cài đặt nhóm.",
  sharingAndAccess: "Chia sẻ và quyền truy cập",
  linksActiveLinksCollaboratorsCollaborators: (values: MessageValues) =>
    interpolate(
      "{links} liên kết đang hoạt động · {collaborators} cộng tác viên",
      values,
    ),
  shareLinkCreated: "Đã tạo liên kết chia sẻ",
  shareLinkCreatedAndCopied: "Đã tạo và sao chép liên kết chia sẻ",
  shareLinks: "Liên kết chia sẻ",
  chooseWhoCanEditThroughTheShareLink:
    "Chọn người có thể xem hoặc chỉnh sửa qua liên kết này.",
  linkPermission: "Quyền của liên kết",
  readOnlyLink: "Chỉ đọc (không cần đăng nhập)",
  signedInEditLink: "Chỉnh sửa sau khi đăng nhập",
  anyoneEditLink: "Bất kỳ ai có liên kết đều có thể chỉnh sửa",
  signedInEditLinkDescription:
    "Sau khi đăng nhập hoặc đăng ký, khách truy cập trở thành cộng tác viên. Thu hồi liên kết không xóa những người đã tham gia.",
  anyoneEditLinkDescription:
    "Bất kỳ ai có liên kết đều có thể chỉnh sửa chi phí và người tham gia mà không cần đăng nhập. Chỉ chia sẻ với người bạn tin tưởng; việc thu hồi có hiệu lực ngay.",
  revokingSignedInLinkDoesNotRemoveExistingCollaborators:
    "Thu hồi sẽ ngăn người mới tham gia. Cộng tác viên hiện tại vẫn có thể chỉnh sửa; hãy xóa quyền truy cập của họ riêng.",
  signInToEditSharedGroup: (values: MessageValues) =>
    interpolate("Đăng nhập hoặc tạo tài khoản để chỉnh sửa {name}.", values),
  readOnlyShareLinkCreated: "Đã tạo liên kết chia sẻ chỉ đọc",
  readOnlyShareLinkCreatedAndCopied:
    "Đã tạo và sao chép liên kết chia sẻ chỉ đọc",
  shareLinkCreatedYourBrowserBlockedAutomaticCopyingCopyItManually:
    "Đã tạo liên kết chia sẻ. Trình duyệt đã chặn sao chép tự động; hãy sao chép thủ công.",
  unableToCreateLink: "Không thể tạo liên kết",
  shareLinkCopied: "Đã sao chép liên kết chia sẻ",
  yourBrowserBlockedCopyingOpenTheLinkAndCopyItFromTheAddressBar:
    "Trình duyệt đã chặn sao chép. Mở liên kết và sao chép từ thanh địa chỉ.",
  anyoneWithTheLinkCanViewExpensesBalancesAndSettlementsWithoutSigningInButCannotEdit:
    "Bất kỳ ai có liên kết đều có thể xem chi phí, số dư và việc thanh toán công nợ mà không cần đăng nhập, nhưng không thể chỉnh sửa.",
  readOnlyShareLinks: "Liên kết chia sẻ chỉ đọc",
  createReadOnlyLink: "Tạo liên kết chỉ đọc",
  anyoneWithTheLinkCanViewThisGroupsExpensesBalancesAndSettlementSuggestionsButCannotAddOrChangeData:
    "Bất kỳ ai có liên kết đều có thể xem chi phí, số dư và đề xuất thanh toán công nợ của nhóm này, nhưng không thể thêm hoặc thay đổi dữ liệu.",
  createAShareLink: "Tạo liên kết chia sẻ?",
  createShareLink: "Tạo liên kết chia sẻ",
  revoked: "Đã thu hồi",
  active: "Đang hoạt động",
  openLink: "Mở liên kết",
  copy: "Sao chép",
  revokeLink: "Thu hồi liên kết",
  afterRevocationTheOldLinkWillImmediatelyStopWorking:
    "Sau khi thu hồi, liên kết cũ sẽ ngừng hoạt động ngay.",
  shareLinkRevoked: "Đã thu hồi liên kết chia sẻ",
  revokeThisShareLink: "Thu hồi liên kết chia sẻ này?",
  revoke: "Thu hồi",
  noShareLinksYet: "Chưa có liên kết chia sẻ.",
  collaboratorAdded: "Đã thêm cộng tác viên",
  unableToAddCollaborator: "Không thể thêm cộng tác viên",
  collaboratorsMustBeExistingUsersTheyCanManageExpensesAndParticipantsButNotOwnerSettings:
    "Cộng tác viên phải là người dùng đã có tài khoản. Họ có thể quản lý chi phí và người tham gia, nhưng không thể thay đổi cài đặt của chủ sở hữu.",
  existingUsersUsername: "Tên người dùng của tài khoản đã có",
  addCollaborator: "Thêm cộng tác viên",
  removeName: (values: MessageValues) => interpolate("Xóa {name}", values),
  thisAccountWillNoLongerBeAbleToManageTheGroupExistingExpenseDataWillRemain:
    "Tài khoản này sẽ không còn quản lý được nhóm. Dữ liệu chi phí hiện có vẫn được giữ lại.",
  collaboratorRemoved: "Đã xóa cộng tác viên",
  removeCollaborator: "Xóa cộng tác viên?",
  remove: "Xóa",
  dataAndExport: "Dữ liệu và xuất dữ liệu",
  csvPrintBackupAndRestore: "CSV, in, sao lưu và khôi phục",
  exportingDoesNotChangeGroupData:
    "Xuất dữ liệu không làm thay đổi dữ liệu nhóm.",
  exportAndPrint: "Xuất và in",
  expenseCsvExported: "Đã xuất CSV chi phí",
  exportExpenseCsv: "Xuất CSV chi phí",
  settlementCsvExported: "Đã xuất CSV thanh toán công nợ",
  exportSettlementCsv: "Xuất CSV thanh toán công nợ",
  print: "In",
  completeBackupDownloaded: "Đã tải xuống bản sao lưu đầy đủ",
  downloadFailed: "Tải xuống thất bại",
  downloadCompleteBackup: "Tải xuống bản sao lưu đầy đủ",
  expenseCsvImported: "Đã nhập CSV chi phí",
  importFailed: "Nhập dữ liệu thất bại",
  allRowsAreCheckedFirstNoDataIsWrittenIfAnyRowHasAnError:
    "Tất cả các dòng được kiểm tra trước. Không ghi dữ liệu nếu có bất kỳ dòng nào bị lỗi.",
  importExpenseCsv: "Nhập CSV chi phí",
  chooseCsv: "Chọn CSV",
  importPreview: "Xem trước dữ liệu nhập",
  rowsRowsCanBeImportedErrorsErrors: (values: MessageValues) =>
    interpolate("Có thể nhập {rows} dòng; {errors} lỗi.", values),
  rowRowMessage: (values: MessageValues) =>
    interpolate("Dòng {row}: {message}", values),
  importCountExpenses: (values: MessageValues) =>
    interpolate("Nhập {count} chi phí", values),
  thisWillAddCountExpensesAtOnceAndRecalculateBalances: (
    values: MessageValues,
  ) =>
    interpolate(
      "Thao tác này sẽ thêm {count} chi phí cùng lúc và tính lại số dư.",
      values,
    ),
  applyCsvImport: "Áp dụng việc nhập CSV?",
  applyImport: "Áp dụng việc nhập",
  invalidBackupFormat: "Định dạng bản sao lưu không hợp lệ",
  backupRestoredAsANewGroup: "Đã khôi phục bản sao lưu thành nhóm mới",
  restoreFailed: "Khôi phục thất bại",
  restoringCreatesANewGroupAndDoesNotOverwriteCurrentData:
    "Khôi phục sẽ tạo nhóm mới và không ghi đè dữ liệu hiện tại.",
  restoreJsonBackup: "Khôi phục bản sao lưu JSON",
  chooseJsonBackup: "Chọn bản sao lưu JSON",
  restorePreviewName: (values: MessageValues) =>
    interpolate("Xem trước khôi phục: {name}", values),
  peoplePeopleExpensesExpensesPaymentsPaymentsBaseCurrency: (
    values: MessageValues,
  ) =>
    interpolate(
      "{people} người · {expenses} chi phí · {payments} khoản thanh toán · tiền tệ cơ sở {currency}",
      values,
    ),
  createNewGroup: "Tạo nhóm mới",
  aNewGroupNamedNameWillBeCreatedWithoutChangingExistingGroups: (
    values: MessageValues,
  ) =>
    interpolate(
      "Một nhóm mới tên “{name}” sẽ được tạo mà không thay đổi các nhóm hiện có.",
      values,
    ),
  restoreThisBackup: "Khôi phục bản sao lưu này?",
  createNewGroup2: "Tạo nhóm mới",
  copyGroup: "Nhân bản nhóm",
  copyThisGroup: "Nhân bản nhóm này?",
  copyGroupDescription:
    "Sao chép người tham gia, tiền tệ cơ sở và tỷ giá tùy chỉnh vào nhóm mới. Chi phí, khoản thanh toán công nợ, cộng tác viên và liên kết chia sẻ không được sao chép. Nhóm gốc không thay đổi.",
  groupCopied: "Đã nhân bản nhóm",
  groupPreferences: "Tùy chọn nhóm",
  changingTheBaseCurrencyRecalculatesDisplayedAmountsAndClearsCustomExchangeRates:
    "Thay đổi tiền tệ cơ sở sẽ tính lại số tiền hiển thị và xóa tỷ giá tùy chỉnh.",
  nameAndBaseCurrency: "Tên và tiền tệ cơ sở",
  totalSpendingWillDisplayAsAmountBalancesAndSettlementsBelowWillBeConverted: (
    values: MessageValues,
  ) =>
    interpolate(
      "Tổng chi tiêu sẽ hiển thị là {amount}; số dư và thanh toán công nợ bên dưới sẽ được quy đổi.",
      values,
    ),
  expectCountSettlementSuggestionsCustomRatesWillResetToBuiltInValues: (
    values: MessageValues,
  ) =>
    interpolate(
      "Dự kiến có {count} đề xuất thanh toán công nợ; tỷ giá tùy chỉnh sẽ được đặt lại về mặc định của Bank of Taiwan.",
      values,
    ),
  cancelChanges: "Hủy thay đổi",
  applyGroupPreferences: "Áp dụng tùy chọn nhóm",
  changeTheBaseCurrencyToCurrencyRecalculateAllResultsAndClearCustomRates: (
    values: MessageValues,
  ) =>
    interpolate(
      "Đổi tiền tệ cơ sở thành {currency}, tính lại mọi kết quả và xóa tỷ giá tùy chỉnh.",
      values,
    ),
  renameTheGroupToName: (values: MessageValues) =>
    interpolate("Đổi tên nhóm thành “{name}”.", values),
  applyTheseChanges: "Áp dụng các thay đổi này?",
  applyChanges: "Áp dụng thay đổi",
  groupPreferencesApplied: "Đã áp dụng tùy chọn nhóm",
  saveFailed: "Lưu thất bại",
  customExchangeRatesApplied: "Đã áp dụng tỷ giá tùy chỉnh",
  unableToSaveExchangeRates: "Không thể lưu tỷ giá",
  currencyConversion: "Quy đổi tiền tệ",
  countCustomRates: (values: MessageValues) =>
    interpolate("{count} tỷ giá tùy chỉnh", values),
  setHowMuch1UnitOfEachCurrencyEqualsInCurrencyLeaveBlankToUseTheBuiltInFixedRate:
    (values: MessageValues) =>
      interpolate(
        "Đặt giá trị của 1 đơn vị mỗi tiền tệ theo {currency}. Tỷ giá chưa đặt sẽ tự động dùng tỷ giá trung bình giao ngay của Bank of Taiwan.",
        values,
      ),
  customExchangeRates: "Tỷ giá tùy chỉnh",
  bankOfTaiwanSpotMidRateDescription:
    "Chi phí mới không có tỷ giá tùy chỉnh dùng tỷ giá trung bình mua bán giao ngay của Bank of Taiwan và lưu lại mức tỷ giá đó. Xóa tỷ giá tùy chỉnh chỉ ảnh hưởng đến chi phí sau này; các khoản thanh toán vẫn dùng tỷ giá hiện tại.",
  loadBankOfTaiwanSpotMidRates: "Tải tỷ giá mặc định của Bank of Taiwan",
  loadingBankExchangeRates: "Đang tải tỷ giá ngân hàng…",
  bankOfTaiwanSpotMidRatesLoadedAtTime: (values: MessageValues) =>
    interpolate(
      "Đã tải tỷ giá trung bình giao ngay của Bank of Taiwan ({time}).",
      values,
    ),
  bankOfTaiwanDefaultRatesApplied:
    "Đã khôi phục tỷ giá mặc định của Bank of Taiwan",
  unableToLoadBankExchangeRates:
    "Hiện không có tỷ giá ngân hàng. Hãy thử lại sau.",
  conversionPreview: "Xem trước quy đổi",
  totalSpendingAmountCountSettlementSuggestions: (values: MessageValues) =>
    interpolate(
      "Tổng chi tiêu: {amount} · {count} đề xuất thanh toán công nợ.",
      values,
    ),
  applyRates: "Áp dụng tỷ giá",
  allTotalsBalancesAndSettlementSuggestionsWillBeRecalculatedWithTheseRates:
    "Chi phí hiện có giữ nguyên tỷ giá. Chi phí mới hoặc được định giá lại và các khoản thanh toán hiện có dùng tỷ giá đã cập nhật.",
  applyCustomExchangeRates: "Áp dụng tỷ giá tùy chỉnh?",
  restoreBankOfTaiwanDefaultRates:
    "Khôi phục tỷ giá mặc định của Bank of Taiwan?",
  apiWriteSettings: "Quyền ghi qua API",
  apiWritesAllowed: "Được phép",
  apiWritesBlocked: "Không được phép",
  apiWriteSettingsDescription:
    "Theo mặc định, mã thông báo API và CLI không thể thay đổi nhóm này. Khi bật, thành viên có mã thông báo API có thể chỉnh sửa theo quyền của họ. Các thao tác trên trình duyệt không bị ảnh hưởng.",
  allowApiWrites: "Cho phép thay đổi qua mã thông báo API",
  apiWriteSettingSaved: "Đã cập nhật quyền ghi qua API",
  groupLifecycle: "Vòng đời nhóm",
  archivedReadOnly: "Đã lưu trữ · chỉ đọc",
  active2: "Đang hoạt động",
  afterRestoringDataCanBeAddedAndChangedAgain:
    "Sau khi khôi phục, bạn có thể thêm và thay đổi dữ liệu trở lại.",
  archivingPreservesAllDataButMakesTheGroupReadOnly:
    "Lưu trữ giữ lại tất cả dữ liệu nhưng chuyển nhóm sang chế độ chỉ đọc.",
  restoreGroup: "Khôi phục nhóm",
  archiveGroup: "Lưu trữ nhóm",
  afterRestoringTheOwnerAndCollaboratorsCanEditDataAgain:
    "Sau khi khôi phục, chủ sở hữu và cộng tác viên có thể chỉnh sửa dữ liệu trở lại.",
  expensesPeopleAndPaymentRecordsArePreservedAndCannotBeChangedWhileArchived:
    "Chi phí, người tham gia và hồ sơ thanh toán được giữ lại và không thể thay đổi khi nhóm được lưu trữ.",
  groupRestored: "Đã khôi phục nhóm",
  groupArchived: "Đã lưu trữ nhóm",
  restoreThisGroup: "Khôi phục nhóm này?",
  archiveThisGroup: "Lưu trữ nhóm này?",
  thisPermanentlyDeletesAllPeopleExpensesReceiptsAndSettlementRecordsAndCannotBeUndone:
    "Thao tác này xóa vĩnh viễn tất cả người tham gia, chi phí, biên lai và hồ sơ thanh toán công nợ, và không thể hoàn tác.",
  deleteGroup: "Xóa nhóm",
  enterNameToConfirm: (values: MessageValues) =>
    interpolate("Nhập “{name}” để xác nhận", values),
  permanentlyDeleteName: (values: MessageValues) =>
    interpolate("Xóa vĩnh viễn “{name}”", values),
  thisCannotBeUndoneCancelingMakesNoChanges:
    "Không thể hoàn tác thao tác này. Hủy sẽ không thay đổi gì.",
  permanentlyDeleteThisGroup: "Xóa vĩnh viễn nhóm này?",
  permanentlyDeleteGroup: "Xóa vĩnh viễn nhóm",
  groupDeleted: "Đã xóa nhóm",
  readOnlyShare: "Chia sẻ chỉ đọc",
  youCanViewExpensesBalancesAndSettlementSuggestionsButCannotEditData:
    "Bạn có thể xem chi phí, số dư và đề xuất thanh toán công nợ, nhưng không thể chỉnh sửa dữ liệu.",
  completeExpenseHistory: "Toàn bộ lịch sử chi phí",
  manageGroupSettings: "Quản lý cài đặt nhóm",
};
