import { interpolate, type MessageValues } from "./message-types.js";

export const viExpenses = {
  expenseHistory: "Lịch sử thay đổi",
  expenseHistoryDescription:
    "Các lần chỉnh sửa, xóa và khôi phục chi phí; không phải lịch sử thanh toán hay số dư trước đây.",
  expenseHistoryEmpty: "Chưa ghi nhận thay đổi",
  expenseHistoryMore: "Tải thêm thay đổi",
  expenseHistoryCreated: "Đã tạo",
  expenseHistoryUpdated: "Đã cập nhật",
  expenseHistoryDeleted: "Đã xóa",
  expenseHistoryRestored: "Đã khôi phục",
  expenseHistoryBaseline: "Ảnh chụp trạng thái ban đầu",
  expenseHistorySystem: "Hệ thống",
  expenseHistoryBaselineNotice:
    "Trạng thái khi bật lịch sử; không rõ các thay đổi trước đó và người tạo ban đầu.",
  expenseHistoryReceiptNotice:
    "Chỉ giữ lại siêu dữ liệu biên lai. Không có hình ảnh trước đây.",
  expenseHistoryShares: "Số tiền chia",
  expenseHistoryRate: "Tỷ giá đã lưu",
  expenseHistoryRateBank: "Bank of Taiwan",
  expenseHistoryRateCustom: "Tùy chỉnh của nhóm",
  expenseHistoryRateFixed: "Cố định có sẵn",
  expenseHistoryRateLegacy: "Ước tính từ phiên bản cũ",
  expenseHistoryRateTimeUnavailable: "Không có thời gian báo tỷ giá",
  expenseHistoryRateUnavailable: "Phiên bản cũ: không ghi nhận tỷ giá",
  expenseHistoryBefore: "Trước",
  expenseHistoryAfter: "Sau",
  expenseHistorySourceExpense: "Thao tác chi phí",
  expenseHistorySourceCsv: "Nhập CSV",
  expenseHistorySourceRestore: "Khôi phục bản sao lưu",
  expenseHistorySourceMerge: "Gộp người tham gia",
  expenseHistorySourceReceipt: "Thao tác biên lai",
  expenseHistorySourceSeed: "Dữ liệu mẫu phát triển",
  expenseHistorySourceMigration: "Di chuyển dữ liệu",
  expenseHistorySourceVersionRestore: "Khôi phục phiên bản",
  expenseRestoreVersion: (values: MessageValues) =>
    interpolate("Khôi phục v{version}", values),
  expenseRestoreTitle: "Khôi phục phiên bản chi phí",
  expenseRestoreDescription:
    "Xem lại chi phí hiện tại và phiên bản cần khôi phục. Khôi phục sẽ thêm một phiên bản mới; lịch sử sau đó vẫn được giữ lại.",
  expenseRestoreKeepsReceipt:
    "Biên lai hiện tại vẫn được đính kèm. Ảnh biên lai cũ không được khôi phục.",
  expenseRestoreNoReceipt:
    "Chi phí đã xóa được khôi phục mà không có biên lai. Ảnh biên lai cũ không được khôi phục.",
  expenseRestoreMissingPerson:
    "Phiên bản này tham chiếu đến người không còn trong nhóm. Hãy chỉnh sửa chi phí thủ công.",
  expenseRestoreUnavailable:
    "Không thể khôi phục chi phí này. Tải lại và thử lại.",
  expenseRestoreConflict:
    "Chi phí đã thay đổi. Xem lại trạng thái mới nhất trước khi xác nhận lại.",
  expenseRestoreConfirm: "Khôi phục phiên bản này",
  expenseRestored: "Đã khôi phục phiên bản chi phí",
  expenseConflictParticipantsChanged:
    "Danh sách người tham gia đã thay đổi. Xác nhận sẽ thay lựa chọn người trả tiền hoặc người chia không còn khả dụng bằng cài đặt của chi phí mới nhất. Các trường khác trong bản nháp được giữ lại; hãy xem lại số tiền chia trước khi lưu.",
  expenseVersionConflict:
    "Chi phí này đã thay đổi. Xem lại phiên bản mới nhất trước khi xác nhận lại.",
  expenseVersionMissing: "Cung cấp phiên bản chi phí. Tải lại và thử lại.",
  expenseVersionInvalid: "Phiên bản chi phí không hợp lệ",
  reviewLatestExpense: "Xem lại chi phí mới nhất",
  confirmLatestExpenseVersion:
    "Đã xem phiên bản mới nhất; giữ bản nháp của tôi và tiếp tục chỉnh sửa",
  latestExpenseMissing:
    "Chi phí này đã bị xóa hoặc không còn truy cập được. Bản nháp của bạn được giữ lại nhưng không thể lưu.",
  deleteExpenseHistoryRetained:
    "Chi phí sẽ được xóa khỏi sổ hiện tại và số dư sẽ được tính lại. Lịch sử thay đổi được giữ lại; bạn có thể khôi phục phiên bản trước mà không có ảnh biên lai cũ.",
  expenseHistoryForName: (values: MessageValues) =>
    interpolate("Lịch sử thay đổi: {name}", values),
  dailySpending: "Chi tiêu hằng ngày",
  paidByPerson: "Theo người trả tiền",
  byCategory: "Theo danh mục",
  spendingAnalysis: "Phân tích chi tiêu",
  totalAmount: (values: MessageValues) => interpolate("Tổng {amount}", values),
  noDataYet: "Chưa có dữ liệu.",
  showingShownOfTotalExpenses: (values: MessageValues) =>
    interpolate("Hiển thị {shown} trên {total} chi phí", values),
  searchDescriptions: "Tìm mô tả",
  searchExpenseDescriptions: "Tìm mô tả chi phí",
  sort: "Sắp xếp",
  groupBy: "Nhóm theo",
  noGrouping: "Không nhóm",
  groupByDate: "Nhóm theo ngày",
  groupByPayer: "Nhóm theo người trả tiền",
  dateNewestFirst: "Ngày: mới nhất trước",
  dateOldestFirst: "Ngày: cũ nhất trước",
  amountHighToLow: "Số tiền: từ cao đến thấp",
  amountLowToHigh: "Số tiền: từ thấp đến cao",
  moreFilters: "Thêm bộ lọc",
  countApplied: (values: MessageValues) =>
    interpolate("Đã áp dụng {count}", values),
  datePersonCurrencyCategoryAndTag: "Ngày, người, tiền tệ, danh mục và thẻ",
  from: "Từ",
  to: "Đến",
  paidBy: "Người trả tiền",
  splitWith: "Chia với",
  expenseParticipants: "Người tham gia chi phí",
  currency: "Tiền tệ",
  allCurrencies: "Tất cả tiền tệ",
  category: "Danh mục",
  allCategories: "Tất cả danh mục",
  tag: "Thẻ",
  exactTag: "Thẻ chính xác",
  applied: "Đã áp dụng:",
  clearAll: "Xóa tất cả",
  allPeople: "Tất cả mọi người",
  categoryValue: (values: MessageValues) =>
    interpolate("Danh mục: {value}", values),
  currencyValue: (values: MessageValues) =>
    interpolate("Tiền tệ: {value}", values),
  fromValue: (values: MessageValues) => interpolate("Từ: {value}", values),
  toValue: (values: MessageValues) => interpolate("Đến: {value}", values),
  tagValue: (values: MessageValues) => interpolate("Thẻ: {value}", values),
  aCompleteHistoryWillAppearHereAfterTheFirstSharedExpense:
    "Toàn bộ lịch sử sẽ xuất hiện ở đây sau chi phí chung đầu tiên.",
  recordFirstExpense: "Ghi chi phí đầu tiên",
  noMatchingExpenses: "Không có chi phí phù hợp",
  adjustOrClearTheFiltersToSeeAllExpenses:
    "Điều chỉnh hoặc xóa bộ lọc để xem tất cả chi phí.",
  clearFilters: "Xóa bộ lọc",
  filteredExpenses: "Chi phí đã lọc",
  allExpenses: "Tất cả chi phí",
  columns: "Cột",
  chooseExpenseColumns: "Chọn cột chi phí",
  expenseName: "Chi phí",
  splitParticipants: "Chia",
  receipt: "Biên lai",
  tags: "Thẻ",
  restoreDefaults: "Khôi phục mặc định",
  actions: "Thao tác",
  expenseGroupSummary: (values: MessageValues) =>
    interpolate("{count} chi phí · {total}", values),
  countPeople: (values: MessageValues) => interpolate("{count} người", values),
  viewReceiptForName: (values: MessageValues) =>
    interpolate("Xem biên lai cho {name}", values),
  receiptPreviewForName: (values: MessageValues) =>
    interpolate("Biên lai cho “{name}”", values),
  receiptImageForName: (values: MessageValues) =>
    interpolate("Ảnh biên lai cho {name}", values),
  closeReceiptPreviewHint: "Nhấp vào ảnh hoặc nhấn Esc để đóng.",
  closeReceiptPreview: "Đóng bản xem trước biên lai",
  openOriginalReceipt: "Mở ảnh gốc",
  moreActionsForName: (values: MessageValues) =>
    interpolate("Thêm thao tác cho {name}", values),
  datePaidByName: (values: MessageValues) =>
    interpolate("{date} · {name} trả tiền", values),
  splitWithSplit: (values: MessageValues) =>
    interpolate("Chia với {split}", values),
  edit: "Chỉnh sửa",
  receiptUploadFailed: "Tải biên lai lên thất bại",
  receiptUploaded: "Đã tải biên lai lên",
  uploading: "Đang tải lên…",
  uploadReceipt: "Tải biên lai lên",
  receiptFileRequirements: "JPEG, PNG hoặc WebP · Tối đa 5 MB",
  selectReceiptPhoto: "Tải ảnh lên",
  takeReceiptPhoto: "Chụp ảnh",
  removeReceiptPhoto: "Xóa ảnh",
  receiptOnlineOnly:
    "Ảnh cần có kết nối; bản nháp ngoại tuyến không lưu ảnh. Hãy xóa ảnh hoặc kết nối lại trước.",
  receiptFileTooLarge: "Ảnh phải có kích thước tối đa 5 MB",
  expenseSavedReceiptFailed:
    "Đã tạo chi phí nhưng tải biên lai lên thất bại. Thử lại ngay hoặc thêm sau từ danh sách chi phí.",
  retryReceiptUpload: "Thử tải biên lai lên lại",
  receiptAlreadyAttached:
    "Chi phí này đã có biên lai. Hãy xem từ danh sách chi phí; biên lai sẽ không tự động bị ghi đè",
  uploadReceiptLater: "Tải lên sau",
  expenseCreationUncertain:
    "Không thể xác nhận chi phí đã được tạo hay chưa. Kiểm tra danh sách chi phí trước khi thêm lại; không thử lại ngay.",
  viewReceipt: "Xem biên lai",
  noReceipt: "Không có biên lai",
  deleteReceipt: "Xóa biên lai",
  youCanUploadAnotherReceiptLaterTheExpenseWillNotBeDeleted:
    "Bạn có thể tải biên lai khác lên sau; chi phí sẽ không bị xóa.",
  receiptDeleted: "Đã xóa biên lai",
  deleteThisReceipt: "Xóa biên lai này?",
  deleteName: (values: MessageValues) => interpolate("Xóa “{name}”", values),
  thisCannotBeUndoneAllBalancesAndSettlementSuggestionsWillBeRecalculated:
    "Không thể hoàn tác thao tác này. Tất cả số dư và đề xuất thanh toán công nợ sẽ được tính lại.",
  expenseDeleted: "Đã xóa chi phí",
  deleteThisExpense: "Xóa chi phí này?",
  invalidSplitFormat: "Định dạng chia không hợp lệ",
  selectAtLeastOnePersonToSplitWith: "Chọn ít nhất một người để chia cùng",
  expenseChangesSaved: "Đã lưu thay đổi chi phí",
  expenseRecorded: "Đã ghi chi phí",
  unableToSaveExpense: "Không thể lưu chi phí",
  reviewTheSplitPreviewBeforeSavingChanges:
    "Xem lại bản xem trước phần chia trước khi lưu thay đổi.",
  enterTheRequiredDetailsFirstCustomSplitsAndTagsAreAvailableBelow:
    "Nhập thông tin bắt buộc trước. Có thể tùy chỉnh phần chia và thẻ bên dưới.",
  editExpense: "Chỉnh sửa chi phí",
  addExpense2: "Thêm chi phí",
  discardDraft: "Bỏ bản nháp",
  unsavedChangesWillBeLostExistingDataWillNotChange:
    "Các thay đổi chưa lưu sẽ bị mất. Dữ liệu hiện có không thay đổi.",
  discardThisDraft: "Bỏ bản nháp này?",
  description: "Mô tả",
  dinnerHotelTrainTickets: "Bữa tối, khách sạn, vé tàu",
  enterAnExpenseDescription: "Nhập mô tả chi phí",
  amount: "Số tiền",
  enterAnExpenseAmount: "Nhập số tiền chi phí",
  date: "Ngày",
  currency2: "Tiền tệ",
  splitPreview: "Xem trước phần chia",
  enterAnAmountToPreviewEachPersonsShare:
    "Nhập số tiền để xem trước phần chi phí của mỗi người.",
  namePaidAmount: (values: MessageValues) =>
    interpolate("{name} đã trả {amount}", values),
  changePeopleAndSplitMethod: "Đổi người tham gia và cách chia",
  selectedSelectedOfTotal: (values: MessageValues) =>
    interpolate("Đã chọn {selected} trên {total}", values),
  selectAll: "Chọn tất cả",
  clear: "Xóa",
  splitMethod: "Cách chia",
  splitEqually: "Chia đều",
  exactAmounts: "Số tiền cụ thể",
  percentages: "Tỷ lệ phần trăm",
  shares: "Số phần",
  nameSKind: (values: MessageValues) =>
    interpolate("{kind} của {name}", values),
  moreDetails: "Thêm chi tiết",
  categoryAndTags: "Danh mục và thẻ",
  separateWithCommasForExampleBreakfastTransport:
    "Phân cách bằng dấu phẩy, ví dụ bữa sáng, đi lại",
  unsavedChangesWillBeLost: "Các thay đổi chưa lưu sẽ bị mất.",
  cancelEditing: "Hủy chỉnh sửa?",
  saveChanges: "Lưu thay đổi",
  recordExpense: "Ghi chi phí",
};
