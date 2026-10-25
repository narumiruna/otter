import {
  type CatalogShape,
  interpolate,
  type MessageValues,
} from "./message-types.js";
import { viAi } from "./messages-ai.js";
import { viAiAuth } from "./messages-ai-auth.js";
import { automaticRateMessages } from "./messages-automatic-rates.js";
import { viErrors } from "./messages-vi-errors.js";
import { viExpenses } from "./messages-vi-expenses.js";
import { viSettings } from "./messages-vi-settings.js";
import type { zhTW } from "./messages-zh-tw.js";

export const vi = {
  ...automaticRateMessages("vi"),
  ...viAi,
  ...viAiAuth,
  ...viErrors,
  ...viExpenses,
  ...viSettings,
  browserExpenseDefaults: "Mặc định chi phí trong trình duyệt này",
  browserExpenseDefaultsHelp:
    "Chỉ xóa mặc định tiền tệ và cách chia của tài khoản này cho nhóm này. Tài khoản, việc đăng nhập và quyền không thay đổi.",
  clearPersonalPreferences: "Xóa mặc định chi phí cho nhóm này",
  expenseDefaultsCleared: "Đã xóa mặc định chi phí cho nhóm này.",
  personalPreferencesChanged:
    "Cài đặt chia của bạn không còn khả dụng. Đang dùng mặc định hợp lệ; hãy chọn lại.",
  personalStorageFailed:
    "Không thể lưu mặc định chi phí. Cài đặt hiện tại vẫn dùng được nhưng có thể mất khi bạn mở lại trang.",
  rememberExpenseDefaults: "Ghi nhớ tiền tệ và cài đặt chia",
  expenseDefaultsRemembered: "Đã lưu tiền tệ và cài đặt chia cho nhóm này.",
  deleteExpense: "Xóa chi phí",
  copyExpense: "Sao chép thành chi phí mới",
  copyExpenseNamed: (values: MessageValues) =>
    interpolate("Sao chép {name} thành chi phí mới", values),
  memberAccounts: "Tài khoản thành viên",
  accountPaid: "Đã trả",
  accountShared: "Phần chi phí",
  accountBalance: "Cần nhận / trả",
  accountReceivable: "Cần nhận",
  accountPayable: "Cần trả",
  accountSettled: "Đã thanh toán công nợ",
  accountPaidHelp:
    "Đã trả là số tiền đã trả cho cửa hàng và các bên cung cấp hàng hóa hoặc dịch vụ khác. Không bao gồm các khoản thanh toán công nợ giữa thành viên.",
  accountTotalsHelp:
    "Phần chi phí là số tiền chi phí mỗi thành viên phải chịu. Số dư cũng bao gồm các khoản thanh toán đã ghi và điều chỉnh của người đại diện. Không tính bản nháp chưa đồng bộ.",
  accountDetails: "Xem chi tiết",
  accountPaidExpenses: "Chi phí đã trả cho nhóm",
  accountSharedExpenses: "Chi phí chung",
  accountExpenseTotal: "Toàn bộ số tiền chi phí",
  accountPayments: "Khoản thanh toán đã gửi / nhận",
  accountPaymentSent: "Đã gửi",
  accountPaymentReceived: "Đã nhận",
  accountAdjustments: "Điều chỉnh của người đại diện",
  accountDetailsUnavailable:
    "Bản chia sẻ này không bao gồm chi tiết thanh toán. Số dư dùng kết quả tính toán của nhóm.",
  accountRepresentedBy: (values: MessageValues) =>
    interpolate(
      "{name} thanh toán công nợ thay cho thành viên này. Số dư bằng không không có nghĩa thành viên này đã thanh toán.",
      values,
    ),
  visaSettlementTitle: "Thanh toán công nợ theo Visa",
  visaSettlementCurrency: "Tiền tệ thanh toán công nợ",
  visaSettlementEnable:
    "Quy đổi mọi chi phí theo tỷ giá Visa của từng ngày và thanh toán công nợ bằng tiền tệ đã chọn",
  visaSettlementHelp:
    "Mặc định tắt. Số tiền gốc không thay đổi. Khi bật, tỷ giá Visa cho ngày của mỗi chi phí được lưu và tiền tệ đã chọn được dùng cho số dư và thanh toán công nợ. Áp dụng cho mọi chi phí, kể cả tiền mặt, không tính phí ngân hàng. Tỷ giá Visa là ước tính; hóa đơn thẻ có thể khác. Các khoản thanh toán hiện có phải dùng tiền tệ đã chọn trước khi bật hoặc đổi tiền tệ.",
  visaSettlementSaved: "Đã lưu cài đặt thanh toán công nợ Visa",
  visaSettlementOn: (values: MessageValues) =>
    interpolate("Bật · {currency}", values),
  visaSettlementOff: "Tắt",
  visaRateLabel: "Visa",
  visaSettingInvalid: "Cài đặt thanh toán công nợ Visa không hợp lệ",
  visaIncompatiblePayments:
    "Hồ sơ thanh toán hiện có phải dùng tiền tệ thanh toán công nợ đã chọn",
  visaSettingUnavailable:
    "Không có tỷ giá Visa. Cài đặt chưa thay đổi. Hãy thử lại sau.",
  visaPaymentCurrency:
    "Các khoản thanh toán công nợ Visa phải dùng tiền tệ đã chọn",
  visaRateUnavailable: (values: MessageValues) =>
    interpolate(
      "Không có tỷ giá Visa {currency}/{target} cho ngày {date}. Hãy thử lại sau.",
      values,
    ),
  offlineQueueBanner:
    "Ngoại tuyến: dữ liệu đã tải vẫn dùng được. Chi phí mới có thể được lưu trên thiết bị này; các chỉnh sửa khác cần có kết nối.",
  queueSave: "Lưu trên thiết bị này",
  queueSaved:
    "Đã lưu trên thiết bị này. Chưa được tính vào số dư; tỷ giá được đặt khi đồng bộ.",
  queueStorageError:
    "Không thể lưu trên thiết bị này. Giữ trang này mở và thử lại.",
  queueTitle: "Chi phí chưa đồng bộ",
  queueNotice:
    "Chỉ có trên thiết bị này. Không được tính vào số dư. Tỷ giá được đặt khi đồng bộ. Xóa dữ liệu trình duyệt sẽ làm mất các bản nháp này.",
  queuePending: "Đang chờ đồng bộ",
  queueAttempted: "Đang chờ xác nhận đồng bộ; giữ nguyên yêu cầu ban đầu",
  queueConflict:
    "Đã dừng đồng bộ. Kiểm tra quyền truy cập và người tham gia trước khi thử lại; yêu cầu ban đầu được giữ lại.",
  queueInvalid: "Chưa ghi nhận. Chỉnh sửa bản nháp và thử lại.",
  queueEdit: "Chỉnh sửa bản nháp",
  queueRetry: "Thử lại yêu cầu ban đầu",
  queueDelete: "Xóa bản nháp cục bộ",
  queueDeleteConfirm:
    "Xóa bản nháp cục bộ này? Yêu cầu đã gửi có thể đã được ghi nhận trên máy chủ. Kiểm tra nhóm trước.",
  queueCount: (values: MessageValues) =>
    interpolate("{count} chi phí chưa đồng bộ trên thiết bị này", values),
  queueSyncPricing:
    "Bản xem trước chỉ hiển thị tiền tệ gốc. Máy chủ đặt tỷ giá khi đồng bộ.",
  queueOrphanTitle: "Bản nháp của nhóm không còn truy cập được",
  queueOrphanNotice:
    "Các nhóm này không còn truy cập được. Yêu cầu đã gửi có thể đã được ghi nhận; hãy kiểm tra trước khi xóa bản sao cục bộ.",
  queueOrphanTrip: (values: MessageValues) =>
    interpolate("ID nhóm: {id}", values),
  welcomeBackEyebrow: "CHÀO MỪNG TRỞ LẠI",
  startNewJourneyEyebrow: "BẮT ĐẦU HÀNH TRÌNH MỚI",
  parchmentTheme: "Giấy da",
  expenseTotalLabel: "Tổng",
  expenseSplitSection: "Chia giữa mọi người",
  expenseSplitHelp:
    "Chọn người cùng chia chi phí này, chọn cách chia và xem kết quả.",
  expenseTagPlaceholder: "Thêm thẻ…",
  addShort: "Thêm",
  settingsShort: "Cài đặt",
  close: "Đóng",
  groupDetails: "Chi tiết nhóm",
  filters: "Bộ lọc",
  viewAll: "Xem tất cả",
  personLabel: "Người",
  preferencesLabel: "Tùy chọn",
  profileLabel: "Hồ sơ",
  securityLabel: "Bảo mật",
  backToGroups: "Quay lại các nhóm",
  backToExpenseList: "Quay lại danh sách chi phí",
  expenseEditorUnavailable:
    "Không thể chỉnh sửa chi phí này. Chi phí có thể không tồn tại, hoặc nhóm chỉ có quyền đọc hoặc đã được lưu trữ.",
  createdLabel: "Đã tạo",
  statusLabel: "Trạng thái",
  peopleDeletionHelp:
    "Không thể xóa người đã được dùng trong sổ chi phí. Kiểm tra hạn chế của từng người bằng nút thông tin hoặc gộp những người trùng lặp.",
  personRestriction: (values: MessageValues) =>
    interpolate("Hạn chế xóa đối với {name}", values),
  representsPeople: (values: MessageValues) =>
    interpolate("Đại diện cho {names}", values),
  expenseRateForName: (values: MessageValues) =>
    interpolate("Xem số tiền và tỷ giá cho {name}", values),
  rateUnavailable: "Không có tỷ giá (dữ liệu phiên bản cũ)",
  usernameMustBe332LettersNumbersUnderscoresOrHyphens:
    "Tên người dùng phải gồm 3–32 chữ cái, chữ số, dấu gạch dưới hoặc dấu gạch nối",
  travelTogetherSplitExpensesEasily: "Cùng du lịch, dễ dàng chia chi phí",
  goodFriendsSplitExpensesWell: "Bạn tốt chia chi phí rõ ràng.",
  skipToMainContent: "Chuyển đến nội dung chính",
  otterHome: "Trang chủ otter",
  loading: "Đang tải",
  unableToLoadOtter: "Không thể tải otter",
  loadingFailed: "Tải thất bại",
  reload: "Tải lại",
  signedIn: "Đã đăng nhập",
  accountCreated: "Đã tạo tài khoản",
  unableToAuthenticate: "Không thể xác thực",
  authenticationRequestsTooFrequentTryAgainLater:
    "Quá nhiều yêu cầu xác thực. Hãy thử lại sau.",
  usernameUpdated: "Đã cập nhật tên người dùng",
  signedOut: "Đã đăng xuất",
  signOutFailedMessage: (values: MessageValues) =>
    interpolate("Đăng xuất thất bại: {message}", values),
  pleaseTryAgainLater: "Vui lòng thử lại sau",
  signingOut: "Đang đăng xuất…",
  signOut: "Đăng xuất",
  authorizeCli: "Kết nối CLI",
  authorizeCliDescription:
    "Nhập mã thiết bị hiển thị trong terminal để phê duyệt quyền truy cập dữ liệu Otter của bạn cho CLI này.",
  deviceCode: "Mã thiết bị",
  checkDeviceCode: "Tiếp tục",
  checkingDeviceCode: "Đang kiểm tra…",
  cliAccessRequest: "Yêu cầu truy cập CLI",
  cliAccessRequestedBy: "Bên yêu cầu",
  approveCliAccess: "Phê duyệt quyền truy cập",
  approvingCliAccess: "Đang phê duyệt…",
  cliAccessApproved: "Đã kết nối CLI",
  cliAccessApprovedDescription:
    "Bạn có thể đóng trang này và quay lại terminal.",
  deviceCodeNotFoundOrExpired: "Không tìm thấy mã thiết bị hoặc mã đã hết hạn",
  enterAValidDeviceCode: "Nhập mã thiết bị hợp lệ",
  youAreOfflineLoadedDataIsAvailableButEditingRequiresAConnection:
    "Bạn đang ngoại tuyến. Dữ liệu đã tải vẫn dùng được, nhưng chỉnh sửa cần có kết nối.",
  travelTogetherSplitWithEase: "Cùng du lịch, dễ dàng chia sẻ",
  spendYourTimeOnTheJourney: "Dành thời gian cho hành trình,",
  andLeaveTheSplittingToOtter: "và để otter lo việc chia chi phí.",
  fromDinnerToAFullTripRecordEverySharedExpenseAndKeepGroupFinancesSimpleAndClear:
    "Từ bữa tối đến cả chuyến đi, ghi lại mọi chi phí chung và giữ tài chính nhóm đơn giản, rõ ràng.",
  splitExampleAWeekendTripDinnerCostsTwd1800ForThreePeopleOrTwd600Each:
    "Ví dụ chia chi phí: bữa tối trong chuyến đi cuối tuần tốn 1.800 TWD cho ba người, mỗi người 600 TWD.",
  weekendTrip: "Chuyến đi cuối tuần",
  splitExample: "Ví dụ chia chi phí",
  dinnerTogether: "Ăn tối cùng nhau",
  you: "Bạn",
  a: "A",
  y: "Y",
  splitEquallyAmong3: "Chia đều cho 3 người",
  each: "mỗi người",
  quicklyRecordSharedExpenses: "Ghi nhanh chi phí chung",
  seeWhoOwesAndWhoIsOwedAtAGlance: "Xem ngay ai cần trả và ai cần nhận",
  settleUpWithClearSuggestions: "Thanh toán công nợ theo đề xuất rõ ràng",
  signIn: "Đăng nhập",
  createAccount: "Tạo tài khoản",
  welcomeBackContinueYourJourney:
    "Chào mừng trở lại. Tiếp tục hành trình của bạn.",
  createYourFirstGroupAndStartSplittingWithEase:
    "Tạo nhóm đầu tiên và bắt đầu chia chi phí dễ dàng.",
  username: "Tên người dùng",
  enterAUsername: "Nhập tên người dùng",
  password: "Mật khẩu",
  enterAPassword: "Nhập mật khẩu",
  developmentCredentialsHaveBeenFilledIn:
    "Đã điền thông tin đăng nhập cho môi trường phát triển.",
  signingIn: "Đang đăng nhập…",
  or: "hoặc",
  signInWithAPasskey: "Đăng nhập bằng Passkey",
  signingInWithAPasskey: "Đang đăng nhập bằng Passkey…",
  unableToSignInWithAPasskey:
    "Không thể đăng nhập bằng Passkey. Hãy thử lại hoặc dùng mật khẩu.",
  needAnAccount: "Bạn cần tài khoản?",
  usernameIsNotCaseSensitive:
    "Tên người dùng không phân biệt chữ hoa và chữ thường.",
  passwordMustBeAtLeast8Characters: "Mật khẩu phải có ít nhất 8 ký tự",
  passwordMustBeAtLeast8Characters2: "Mật khẩu phải có ít nhất 8 ký tự.",
  creating: "Đang tạo…",
  createAccountWithAPasskey: "Tạo tài khoản bằng Passkey",
  creatingAccountWithAPasskey: "Đang tạo tài khoản bằng Passkey…",
  unableToCreateAccountWithAPasskey:
    "Không thể tạo tài khoản bằng Passkey. Hãy thử lại.",
  alreadyHaveAnAccount: "Bạn đã có tài khoản?",
  backToSignIn: "Quay lại đăng nhập",
  expenseParticipantsDoNotNeedAccountsToBeIncludedInAGroup:
    "Người tham gia chi phí không cần tài khoản để có tên trong nhóm.",
  changeNameSUsername: (values: MessageValues) =>
    interpolate("Đổi tên người dùng của {name}", values),
  nameSAccountMenu: (values: MessageValues) =>
    interpolate("Menu tài khoản của {name}", values),
  unableToUpdateUsername: "Không thể cập nhật tên người dùng",
  changeUsername: "Đổi tên người dùng",
  passkeyRegistrationRequestsTooFrequent:
    "Quá nhiều yêu cầu đăng ký Passkey. Hãy thử lại sau.",
  passkeyRegistrationResponseIsInvalid: "Phản hồi đăng ký Passkey không hợp lệ",
  passkeyRegistrationRequestExpired:
    "Yêu cầu đăng ký Passkey đã hết hạn. Hãy thử lại.",
  unableToVerifyPasskey: "Không thể xác minh Passkey. Hãy thử lại.",
  passkeyAlreadyRegistered: "Passkey này đã được đăng ký",
  passkeyNotFound: "Không tìm thấy Passkey",
  cannotRemoveOnlyPasskey:
    "Bạn không thể xóa Passkey duy nhất mà không mất quyền truy cập tài khoản",
  passkeyLoginResponseIsInvalid: "Phản hồi đăng nhập bằng Passkey không hợp lệ",
  passkeyLoginRequestExpired:
    "Yêu cầu đăng nhập bằng Passkey đã hết hạn. Hãy thử lại.",
  unableToUsePasskeyToSignIn: "Không thể đăng nhập bằng Passkey này",
  cancel: "Hủy",
  saving: "Đang lưu…",
  save: "Lưu",
  connectionFailedPleaseTryAgainLater:
    "Kết nối thất bại. Vui lòng thử lại sau.",
  theServerReturnedAnInvalidResponse: "Máy chủ trả về phản hồi không hợp lệ.",
  everyone: "Mọi người",
  unknown: "Không rõ",
  atLeastOneParticipantIsRequired: "Cần ít nhất một người tham gia",
  usedByAnExpense: "Được dùng trong chi phí",
  youAreOfflineReconnectAndTryAgain:
    "Bạn đang ngoại tuyến. Kết nối lại và thử lại.",
  working: "Đang xử lý…",
  unableToApplyChanges: "Không thể áp dụng thay đổi",
  applying: "Đang áp dụng…",
  noBalancesYet: "Chưa có số dư.",
  settled: "Đã thanh toán công nợ",
  getsBack: "Cần nhận lại",
  owes: "Cần trả",
  newTaiwanDollar: "Đô la Đài Loan mới",
  japaneseYen: "Yên Nhật",
  usDollar: "Đô la Mỹ",
  euro: "Euro",
  singaporeDollar: "Đô la Singapore",
  poundSterling: "Bảng Anh",
  australianDollar: "Đô la Úc",
  canadianDollar: "Đô la Canada",
  southKoreanWon: "Won Hàn Quốc",
  food: "Ăn uống",
  transport: "Đi lại",
  lodging: "Lưu trú",
  tickets: "Vé",
  shopping: "Mua sắm",
  other: "Khác",
  unsavedChangesWillBeLostDiscardTheDraft:
    "Các thay đổi chưa lưu sẽ bị mất. Bỏ bản nháp?",
  unableToSwitchGroups: "Không thể chuyển nhóm",
  loadingGroup: "Đang tải nhóm",
  yourSelectionWillAppearAfterItsDataLoads:
    "Lựa chọn của bạn sẽ hiển thị sau khi dữ liệu được tải.",
  unableToLoadGroup: "Không thể tải nhóm",
  groupSwitcher: "Bộ chuyển nhóm",
  groups: "Nhóm",
  countActiveGroups: (values: MessageValues) =>
    interpolate("{count} nhóm đang hoạt động", values),
  everyTripAddsUpToSomethingWonderful:
    "Mỗi chuyến đi góp nên những điều tuyệt vời.",
  recordSharedExpensesAndFocusOnThePeopleBesideYou:
    "Ghi lại chi phí chung và dành sự quan tâm cho những người bên bạn.",
  archivedAndReadOnlyDataIsPreservedTheOwnerCanRestoreItUnderMore:
    "Đã lưu trữ và chỉ đọc. Dữ liệu được giữ lại; chủ sở hữu có thể khôi phục trong Cài đặt nhóm.",
  addTravelCompanionsFirst: "Thêm bạn đồng hành trước",
  thereIsOnlyOneParticipantAddSomeoneToSplitWithBeforeRecordingTheFirstExpense:
    "Chỉ có một người tham gia. Thêm người cùng chia trước khi ghi chi phí đầu tiên.",
  addExpenseParticipant: "Thêm người tham gia chi phí",
  switchGroups: "Chuyển nhóm",
  youWillLeaveTheCurrentGroupOnlyAfterTheNewOneLoads:
    "Bạn chỉ rời nhóm hiện tại sau khi nhóm mới được tải.",
  participantsPeopleExpensesExpensesCurrency: (values: MessageValues) =>
    interpolate(
      "{participants} người · {expenses} chi phí · {currency}",
      values,
    ),
  archived: "Đã lưu trữ",
  everydayMomentsTogether: "Những khoảnh khắc thường ngày bên nhau",
  collaborator: "Cộng tác viên",
  owner: "Chủ sở hữu",
  baseCurrencyCurrency: (values: MessageValues) =>
    interpolate("Tiền tệ cơ sở {currency}", values),
  usingCustomExchangeRates: "Đang dùng tỷ giá tùy chỉnh",
  usingBankOfTaiwanExchangeRates:
    "Đang dùng tỷ giá mặc định của Bank of Taiwan",
  usingFixedFallbackRates:
    "Bank of Taiwan không khả dụng; đang dùng tỷ giá cố định dự phòng",
  loadingGroup2: "Đang tải nhóm…",
  people: "Người tham gia",
  expenses: "Chi phí",
  base: "Cơ sở",
  overview: "Tổng quan",
  more: "Thêm",
  groupWorkspace: "Không gian làm việc của nhóm",
  addExpense: "Thêm chi phí",
  archivedGroups: "Nhóm đã lưu trữ",
  unableToCreateGroup: "Không thể tạo nhóm",
  createGroup: "Tạo nhóm",
  addCompanionsAfterCreatingTheGroupThenRecordSharedExpenses:
    "Thêm bạn đồng hành sau khi tạo nhóm, rồi ghi chi phí chung.",
  groupName: "Tên nhóm",
  fiveDaysInTokyo: "Năm ngày ở Tokyo",
  baseCurrency: "Tiền tệ cơ sở",
  createYourFirstGroup: "Tạo nhóm đầu tiên của bạn",
  addATripOrEventGroupOrCreateOneFromAnExistingJsonBackup:
    "Thêm nhóm cho chuyến đi hoặc sự kiện, hoặc tạo nhóm từ bản sao lưu JSON hiện có.",
  groupExpenseSummary: "Tóm tắt chi phí nhóm",
  totalSharedExpenses: "Tổng chi phí chung",
  convertedToBaseCurrency: "Đã quy đổi sang tiền tệ cơ sở",
  outstanding: "Chưa thanh toán",
  countSuggestedPaymentsToSettleUp: (values: MessageValues) =>
    interpolate(
      "{count} khoản thanh toán được đề xuất để thanh toán công nợ",
      values,
    ),
  nothingIsCurrentlyOutstanding: "Hiện không còn khoản nào chưa thanh toán",
  settlementSuggestionsAppearAfterExpensesAreAdded:
    "Đề xuất thanh toán công nợ xuất hiện sau khi thêm chi phí",
  expenseRecords: "Bản ghi chi phí",
  sharedAmongCountPeople: (values: MessageValues) =>
    interpolate("Chia giữa {count} người", values),
  calculatedFromCurrentExpensesAndRecordedPayments:
    "Tính từ chi phí hiện tại và các khoản thanh toán đã ghi.",
  settleUp: "Thanh toán công nợ",
  countEntries: (values: MessageValues) => interpolate("{count} mục", values),
  entries: "mục",
  seePaymentsAndSharesAtAGlance: "Xem nhanh số tiền đã trả và phần chi phí.",
  balances: "Số dư",
  recentExpenses: "Chi phí gần đây",
  noExpensesYet: "Chưa có chi phí",
  thisGroupHasNotRecordedAnySharedExpenses:
    "Nhóm này chưa ghi chi phí chung nào.",
  recordTheFirstSharedExpense: "Ghi chi phí chung đầu tiên",
  addThePeopleSplittingExpensesToCalculateEachBalance:
    "Trước tiên thêm người cùng chia chi phí, rồi ghi chi phí đầu tiên. Số dư và đề xuất thanh toán công nợ sẽ tự động xuất hiện.",
  balancesAndSettlementSuggestionsWillAppearHereAfterYouAddExpenses:
    "Số dư và đề xuất thanh toán công nợ sẽ xuất hiện ở đây sau khi bạn thêm chi phí.",
  addPerson: "Thêm người",
  managePeople: "Quản lý người tham gia",
  everythingIsSettled: "Đã thanh toán hết công nợ",
  thereAreNoOutstandingPayments: "Không còn khoản thanh toán tồn đọng.",
  paymentRecorded: "Đã ghi thanh toán",
  unableToRecordPayment: "Không thể ghi thanh toán",
  recordPayment: "Ghi thanh toán",
  recordSettlementPayment: "Ghi khoản thanh toán công nợ",
  fromPaysToTheFullSuggestedAmountIsPrefilled: (values: MessageValues) =>
    interpolate(
      "{from} trả cho {to}; toàn bộ số tiền đề xuất đã được điền sẵn.",
      values,
    ),
  paymentAmountCurrency: (values: MessageValues) =>
    interpolate("Số tiền thanh toán ({currency})", values),
  enterAPaymentAmount: "Nhập số tiền thanh toán",
  thePaymentMustBeGreaterThan0AndNoMoreThanTheSuggestedAmount:
    "Khoản thanh toán phải lớn hơn 0 và không vượt quá số tiền đề xuất",
  expectedRemainder: "Số tiền còn lại dự kiến: ",
  paymentDate: "Ngày thanh toán",
  noteOptional: "Ghi chú (không bắt buộc)",
  recordPayment2: "Ghi thanh toán",
  paymentHistory: "Lịch sử thanh toán",
  dateFromPaidTo: (values: MessageValues) =>
    interpolate("{date} · {from} đã trả cho {to}", values),
  deletePayment: "Xóa thanh toán",
  remainingSettlementSuggestionsWillBeRecalculated:
    "Các đề xuất thanh toán công nợ còn lại sẽ được tính lại.",
  paymentDeleted: "Đã xóa thanh toán",
  deleteFailed: "Xóa thất bại",
  deleteThisPayment: "Xóa khoản thanh toán này?",
  delete: "Xóa",
  datePaidByNameSplitWithSplit: (values: MessageValues) =>
    interpolate("{date} · {name} trả tiền · chia với {split}", values),
  settlementRepresentative: "Người được giao thanh toán công nợ",
  settledByName: (values: MessageValues) =>
    interpolate("Giao thanh toán công nợ cho {name}", values),
  settleSeparately: "Tự thanh toán (riêng)",
  settlementRepresentativeHelp:
    "Chi phí được chia theo từng người; số dư và đề xuất thanh toán công nợ gộp số dư ròng của mỗi người vào người đại diện của họ. Người đại diện không thể được giao cho người khác.",
  representativeHasDependents:
    "Có thành viên khác được giao cho người này. Hãy xóa các phân công đó trước.",
  settlementRepresentativeUpdated:
    "Đã cập nhật người đại diện thanh toán công nợ",
  unableToUpdateSettlementRepresentative:
    "Không thể cập nhật người đại diện thanh toán công nợ",
  provideParticipantChanges: "Cung cấp thông tin người tham gia cần cập nhật",
  invalidSettlementRepresentative:
    "Người đại diện thanh toán công nợ không hợp lệ",
  settlementRepresentativeMustBeAnotherGroupMember:
    "Người đại diện thanh toán công nợ phải là thành viên khác trong nhóm này",
  settlementRepresentativeCannotBeAssignedOrHaveDependents:
    "Người đại diện không thể thanh toán công nợ qua người khác, và người này không thể có thành viên thanh toán công nợ qua mình",
  invalidBackupSettlementRepresentative:
    "Người đại diện thanh toán công nợ trong bản sao lưu không hợp lệ",
  expenseParticipantAdded: "Đã thêm người tham gia chi phí",
  unableToAddPerson: "Không thể thêm người",
  expenseParticipantsDoNotNeedToSignInManageAccountsWithAccessUnderMoreSharingAndAccess:
    "Người tham gia chi phí không cần đăng nhập. Quản lý tài khoản có quyền truy cập trong Cài đặt nhóm → Chia sẻ và quyền truy cập.",
  personsName: "Tên người tham gia",
  friendsName: "Tên bạn bè",
  enterAName: "Nhập tên",
  archivedGroupsAreReadOnlyRestoreThisGroupToChangeParticipants:
    "Nhóm đã lưu trữ chỉ cho phép đọc. Khôi phục nhóm này để thay đổi người tham gia.",
  usedByAPayment: "Được dùng trong khoản thanh toán",
  cannotDeleteReasonUpdateRelatedExpensesFirstOrUseTheMergeToolBelow: (
    values: MessageValues,
  ) =>
    interpolate(
      "Không thể xóa: {reason}. Cập nhật chi phí liên quan trước, hoặc dùng công cụ gộp bên dưới.",
      values,
    ),
  deleteName2: (values: MessageValues) => interpolate("Xóa {name}", values),
  thisPersonHasNoExpensesOrPaymentsDeletionCannotBeUndone:
    "Người này không có chi phí hay khoản thanh toán. Không thể hoàn tác việc xóa.",
  expenseParticipantDeleted: "Đã xóa người tham gia chi phí",
  deleteThisExpenseParticipant: "Xóa người tham gia chi phí này?",
  nameUpdated: "Đã cập nhật tên",
  unableToUpdateName: "Không thể cập nhật tên",
  rename: "Đổi tên",
  renameName: (values: MessageValues) => interpolate("Đổi tên {name}", values),
  existingExpensesAndPaymentsWillRemainLinkedToThisPerson:
    "Chi phí và khoản thanh toán hiện có vẫn được liên kết với người này.",
  newName: "Tên mới",
  saveName: "Lưu tên",
  advancedPeopleTools: "Công cụ nâng cao cho người tham gia",
  mergeDuplicatePeople: "Gộp người trùng lặp",
  sourcePerson: "Người nguồn",
  targetPerson: "Người đích",
  mergeInto: "Gộp vào",
  changePreview: "Xem trước thay đổi",
  expensesRelatedExpensesAndPaymentsPaymentsForSourceWillMoveToTargetThenTheSourcePersonWillBeDeleted:
    (values: MessageValues) =>
      interpolate(
        "{expenses} chi phí liên quan và {payments} khoản thanh toán của {source} sẽ được chuyển sang {target}, sau đó người nguồn sẽ bị xóa.",
        values,
      ),
  mergePeople: "Gộp người tham gia",
  sourceWillBeDeletedAndRelatedDataWillBeTransferredToTargetAtomically: (
    values: MessageValues,
  ) =>
    interpolate(
      "{source} sẽ bị xóa và dữ liệu liên quan sẽ được chuyển sang {target} trong cùng một giao dịch không thể tách rời.",
      values,
    ),
  expenseParticipantsMerged: "Đã gộp người tham gia chi phí",
  mergeFailed: "Gộp thất bại",
  applyMerge: "Áp dụng việc gộp?",
  previewAndMerge: "Xem trước và gộp",
  language: "Ngôn ngữ",
  english: "Tiếng Anh",
  traditionalChinese: "Tiếng Trung phồn thể",
} satisfies CatalogShape<typeof zhTW>;
