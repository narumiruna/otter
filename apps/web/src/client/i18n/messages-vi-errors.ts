import { interpolate, type MessageValues } from "./message-types.js";

export const viErrors = {
  csvImportFailed: "Nhập CSV thất bại",
  theCsvHasNoData: "CSV không có dữ liệu",
  missingColumnsColumns: (values: MessageValues) =>
    interpolate("Thiếu cột: {columns}", values),
  participantNotFoundName: (values: MessageValues) =>
    interpolate("Không tìm thấy người tham gia: {name}", values),
  invalidJsonFormat: "Định dạng JSON không hợp lệ",
  incorrectUsernameOrPassword: "Tên người dùng hoặc mật khẩu không đúng",
  everyPersonNeedsAnAmountForACustomSplit:
    "Cần nhập số tiền cho mỗi người khi chia tùy chỉnh",
  unsupportedBackupVersion: "Phiên bản sao lưu không được hỗ trợ",
  unsupportedSplitMethod: "Cách chia không được hỗ trợ",
  unsupportedExchangeRateCurrency: "Tiền tệ của tỷ giá không được hỗ trợ",
  unsupportedBaseCurrency: "Tiền tệ cơ sở không được hỗ trợ",
  unsupportedCurrency: "Tiền tệ không được hỗ trợ",
  aParticipantCannotBeMergedIntoThemselves:
    "Không thể gộp người tham gia vào chính họ",
  theOwnerCannotBeRemoved: "Không thể xóa chủ sở hữu",
  thePayerAndRecipientMustBeDifferent: "Người trả và người nhận phải khác nhau",
  payerIsRequired: "Cần có người trả tiền",
  thePayerMustBeAParticipant: "Người trả tiền phải là người tham gia",
  serverError: "Lỗi máy chủ",
  invalidPaymentRecordsInBackup:
    "Hồ sơ thanh toán trong bản sao lưu không hợp lệ",
  splitTotalsInBackupAreInvalid:
    "Tổng số tiền chia trong bản sao lưu không hợp lệ",
  invalidSplitDataInBackup: "Dữ liệu chia trong bản sao lưu không hợp lệ",
  invalidExchangeRatesInBackup: "Tỷ giá trong bản sao lưu không hợp lệ",
  invalidParticipantDataInBackup:
    "Dữ liệu người tham gia trong bản sao lưu không hợp lệ",
  backupContainsDuplicateParticipants:
    "Bản sao lưu chứa người tham gia trùng lặp",
  invalidBaseCurrencyInBackup: "Tiền tệ cơ sở trong bản sao lưu không hợp lệ",
  invalidExpenseCategoryInBackup:
    "Danh mục chi phí trong bản sao lưu không hợp lệ",
  anExpenseParticipantInTheBackupDoesNotExist:
    "Một người tham gia chi phí trong bản sao lưu không tồn tại",
  anExpenseInTheBackupHasDuplicateParticipants:
    "Một chi phí trong bản sao lưu có người tham gia trùng lặp",
  invalidExpenseDataInBackup: "Dữ liệu chi phí trong bản sao lưu không hợp lệ",
  invalidExpenseTagsInBackup: "Thẻ chi phí trong bản sao lưu không hợp lệ",
  invalidTripNameInBackup: "Tên chuyến đi trong bản sao lưu không hợp lệ",
  backupIsMissingItsTrip: "Bản sao lưu thiếu chuyến đi",
  backupIsMissingParticipants: "Bản sao lưu thiếu người tham gia",
  backupIsMissingExpenses: "Bản sao lưu thiếu chi phí",
  notesCanBeUpTo160Characters: "Ghi chú có thể dài tối đa 160 ký tự",
  theShareLinkIsInvalidOrHasBeenRevoked:
    "Liên kết chia sẻ không hợp lệ hoặc đã bị thu hồi",
  atLeastOneSplitParticipantIsRequired:
    "Cần ít nhất một người tham gia chia chi phí",
  splitParticipantsMustBelongToTheTrip:
    "Người tham gia chia chi phí phải thuộc chuyến đi",
  splitAmountsMustAddUpToTheExpenseAmount:
    "Tổng số tiền chia phải bằng số tiền chi phí",
  splitAmountsMustBeGreaterThan0: "Số tiền chia phải lớn hơn 0",
  invalidSplitAmount: "Số tiền chia không hợp lệ",
  invalidCategoryOrTagFormat: "Định dạng danh mục hoặc thẻ không hợp lệ",
  exchangeRatesMustBeGreaterThan0: "Tỷ giá phải lớn hơn 0",
  invalidExchangeRateFormat: "Định dạng tỷ giá không hợp lệ",
  aParticipantWithThisNameAlreadyExists: "Đã có người tham gia mang tên này",
  thisParticipantHasPaymentRecordsAndCannotBeDeleted:
    "Người tham gia này có hồ sơ thanh toán nên không thể xóa",
  thisParticipantHasExpensesAndCannotBeDeleted:
    "Người tham gia này có chi phí nên không thể xóa",
  onlyTheOwnerCanDownloadACompleteBackup:
    "Chỉ chủ sở hữu mới có thể tải xuống bản sao lưu đầy đủ",
  onlyTheOwnerCanManageShareLinks:
    "Chỉ chủ sở hữu mới có thể quản lý liên kết chia sẻ",
  onlyTheOwnerCanManageCollaborators:
    "Chỉ chủ sở hữu mới có thể quản lý cộng tác viên",
  onlyTheOwnerCanManageTripSettings:
    "Chỉ chủ sở hữu mới có thể quản lý cài đặt chuyến đi",
  namesCanBeUpTo80Characters: "Tên có thể dài tối đa 80 ký tự",
  passwordMustBeAtLeast8Characters3: "Mật khẩu phải có ít nhất 8 ký tự",
  invalidArchiveStatus: "Trạng thái lưu trữ không hợp lệ",
  invalidApiWriteSetting: "Cài đặt quyền ghi qua API không hợp lệ",
  onlyBrowserSessionsCanManageApiWrites:
    "Chỉ phiên trình duyệt mới có thể quản lý quyền ghi qua API",
  apiWritesDisabledForThisGroup:
    "Nhóm này không cho phép thay đổi qua mã thông báo API",
  apiEndpointNotFound: "Không tìm thấy điểm cuối API",
  paymentRecordNotFound: "Không tìm thấy hồ sơ thanh toán",
  collaboratorNotFound: "Không tìm thấy cộng tác viên",
  participantNotFound: "Không tìm thấy người tham gia",
  noActiveShareLinkWasFound: "Không tìm thấy liên kết chia sẻ đang hoạt động",
  expenseNotFound: "Không tìm thấy chi phí",
  receiptNotFound: "Không tìm thấy biên lai",
  tripNotFound: "Không tìm thấy chuyến đi",
  userNotFound: "Không tìm thấy người dùng",
  descriptionMustBe1120Characters: "Mô tả phải có từ 1 đến 120 ký tự",
  theOwnerIsAlreadyInTheCollaboratorList:
    "Chủ sở hữu đã có trong danh sách cộng tác viên",
  thisGroupIsArchivedRestoreItBeforeEditing:
    "Nhóm này đã được lưu trữ. Hãy khôi phục trước khi chỉnh sửa.",
  receiptsMustBeJpegPngOrWebpImages: "Biên lai phải là ảnh JPEG, PNG hoặc WebP",
  theRecipientMustBeAParticipant: "Người nhận phải là người tham gia",
  aTripWithThisNameAlreadyExists: "Đã có chuyến đi mang tên này",
  dateMustUseTheYyyyMmDdFormat: "Ngày phải dùng định dạng YYYY-MM-DD",
  upTo10TagsAreAllowed: "Cho phép tối đa 10 thẻ",
  tagsCanBeUpTo24Characters: "Thẻ có thể dài tối đa 24 ký tự",
  invalidTagFormat: "Định dạng thẻ không hợp lệ",
  theTargetParticipantMustBelongToTheTrip:
    "Người tham gia đích phải thuộc chuyến đi",
  signInFirst: "Đăng nhập trước",
  provideExpenseChanges: "Cung cấp các thay đổi chi phí",
  provideTripChanges: "Cung cấp các thay đổi chuyến đi",
  requestBodyIsTooLarge: "Nội dung yêu cầu quá lớn",
  selectAtLeastOneSplitParticipant:
    "Chọn ít nhất một người tham gia chia chi phí",
  enterATripNameOf1100Characters: "Nhập tên chuyến đi có từ 1 đến 100 ký tự",
  enterAnExpenseDescriptionOf1120Characters:
    "Nhập mô tả chi phí có từ 1 đến 120 ký tự",
  enterAParticipantNameOf180Characters:
    "Nhập tên người tham gia có từ 1 đến 80 ký tự",
  enterAUsernameAndPassword: "Nhập tên người dùng và mật khẩu",
  enterSplitValues: "Nhập các giá trị chia",
  enterAValidPaymentDate: "Nhập ngày thanh toán hợp lệ",
  enterValidSplitShares: "Nhập số phần chia hợp lệ",
  enterValidSplitPercentages: "Nhập tỷ lệ phần trăm chia hợp lệ",
  enterValidSplitAmounts: "Nhập số tiền chia hợp lệ",
  enterAValidExpenseDate: "Nhập ngày chi phí hợp lệ",
  chooseACsvFile: "Chọn tệp CSV",
  selectSplitParticipants: "Chọn người tham gia chia chi phí",
  chooseAReceiptImage: "Chọn ảnh biên lai",
  thisUserIsAlreadyACollaborator: "Người dùng này đã là cộng tác viên",
  thisUsernameIsAlreadyRegistered: "Tên người dùng này đã được đăng ký",
  usernameIsBeingRegisteredOrAlreadyRegistered:
    "Tên người dùng này đang được đăng ký hoặc đã có người dùng",
  usernameIsBeingRegistered: "Tên người dùng này đang được đăng ký",
  usernameOrPasskeyAlreadyRegistered:
    "Tên người dùng hoặc Passkey này đã được đăng ký",
  invalidAmount: "Số tiền không hợp lệ",
  theDefaultDevelopmentAccountsUsernameCannotBeChanged:
    "Không thể thay đổi tên người dùng của tài khoản phát triển mặc định",
};
