import { interpolate, type MessageValues } from "./message-types.js";

export const trExpenses = {
  expenseHistory: "Değişiklik geçmişi",
  expenseHistoryDescription:
    "Gider düzenlemeleri, silmeleri ve geri yüklemeleri; ödeme geçmişi veya geçmiş bakiyeler değildir.",
  expenseHistoryEmpty: "Kayıtlı değişiklik yok",
  expenseHistoryMore: "Daha fazla değişiklik yükle",
  expenseHistoryCreated: "Oluşturuldu",
  expenseHistoryUpdated: "Güncellendi",
  expenseHistoryDeleted: "Silindi",
  expenseHistoryRestored: "Geri yüklendi",
  expenseHistoryBaseline: "İlk durum kaydı",
  expenseHistorySystem: "Sistem",
  expenseHistoryBaselineNotice:
    "Geçmiş etkinleştirildiğindeki durum; önceki değişiklikler ve ilk oluşturan kişi bilinmiyor.",
  expenseHistoryReceiptNotice:
    "Yalnızca makbuzun üst verileri korunur. Önceki görseller kullanılamaz.",
  expenseHistoryShares: "Pay tutarları",
  expenseHistoryRate: "Kaydedilen döviz kuru",
  expenseHistoryRateBank: "Bank of Taiwan",
  expenseHistoryRateCustom: "Gruba özel",
  expenseHistoryRateFixed: "Yerleşik sabit",
  expenseHistoryRateLegacy: "Eski sürüm tahmini",
  expenseHistoryRateTimeUnavailable: "Kur zamanı bilinmiyor",
  expenseHistoryRateUnavailable: "Eski sürüm: kur kaydedilmemiş",
  expenseHistoryBefore: "Önce",
  expenseHistoryAfter: "Sonra",
  expenseHistorySourceExpense: "Gider işlemi",
  expenseHistorySourceCsv: "CSV içe aktarma",
  expenseHistorySourceRestore: "Yedek geri yükleme",
  expenseHistorySourceMerge: "Katılımcı birleştirme",
  expenseHistorySourceReceipt: "Makbuz işlemi",
  expenseHistorySourceSeed: "Geliştirme örnek verisi",
  expenseHistorySourceMigration: "Veri geçişi",
  expenseHistorySourceVersionRestore: "Sürüm geri yükleme",
  expenseRestoreVersion: (values: MessageValues) =>
    interpolate("v{version} sürümünü geri yükle", values),
  expenseRestoreTitle: "Gider sürümünü geri yükle",
  expenseRestoreDescription:
    "Mevcut gideri ve geri yüklenecek sürümü inceleyin. Geri yükleme yeni bir sürüm ekler; sonraki geçmiş kayıtları korunur.",
  expenseRestoreKeepsReceipt:
    "Mevcut makbuz ekli kalır. Eski makbuz görselleri geri yüklenmez.",
  expenseRestoreNoReceipt:
    "Silinen gider makbuz olmadan geri gelir. Eski makbuz görselleri geri yüklenmez.",
  expenseRestoreMissingPerson:
    "Bu sürüm artık grupta olmayan bir kişiye başvuruyor. Bunun yerine gideri elle düzenleyin.",
  expenseRestoreUnavailable:
    "Bu gider geri yüklenemiyor. Sayfayı yenileyip tekrar deneyin.",
  expenseRestoreConflict:
    "Gider değişti. Tekrar onaylamadan önce son durumu inceleyin.",
  expenseRestoreConfirm: "Bu sürümü geri yükle",
  expenseRestored: "Gider sürümü geri yüklendi",
  expenseConflictParticipantsChanged:
    "Kişiler değişti. Onaylama, artık kullanılamayan ödeyen veya pay katılımcısı seçimlerini en son giderin ayarlarıyla değiştirir. Diğer taslak alanları korunur; kaydetmeden önce pay tutarlarını inceleyin.",
  expenseVersionConflict:
    "Bu gider değişti. Tekrar onaylamadan önce en son sürümü inceleyin.",
  expenseVersionMissing:
    "Gider sürümünü belirtin. Sayfayı yenileyip tekrar deneyin.",
  expenseVersionInvalid: "Geçersiz gider sürümü",
  reviewLatestExpense: "En son gideri incele",
  confirmLatestExpenseVersion:
    "En son sürümü inceledim; taslağımı koru ve düzenlemeye devam et",
  latestExpenseMissing:
    "Bu gider silindi veya artık erişilemiyor. Taslağınız korunuyor ancak kaydedilemez.",
  deleteExpenseHistoryRetained:
    "Gider mevcut hesap defterinden çıkarılır ve bakiyeler yeniden hesaplanır. Değişiklik geçmişi korunur; önceki bir sürümü eski makbuz görseli olmadan geri yükleyebilirsiniz.",
  expenseHistoryForName: (values: MessageValues) =>
    interpolate("Değişiklik geçmişi: {name}", values),
  dailySpending: "Günlük harcama",
  paidByPerson: "Ödeyen kişiye göre",
  byCategory: "Kategoriye göre",
  spendingAnalysis: "Harcama analizi",
  totalAmount: (values: MessageValues) =>
    interpolate("Toplam {amount}", values),
  noDataYet: "Henüz veri yok.",
  showingShownOfTotalExpenses: (values: MessageValues) =>
    interpolate("{total} giderden {shown} tanesi gösteriliyor", values),
  searchDescriptions: "Açıklamalarda ara",
  searchExpenseDescriptions: "Gider açıklamalarında ara",
  sort: "Sırala",
  groupBy: "Gruplama ölçütü",
  noGrouping: "Gruplama yok",
  groupByDate: "Tarihe göre grupla",
  groupByPayer: "Ödeyene göre grupla",
  dateNewestFirst: "Tarih: önce en yeni",
  dateOldestFirst: "Tarih: önce en eski",
  amountHighToLow: "Tutar: yüksekten düşüğe",
  amountLowToHigh: "Tutar: düşükten yükseğe",
  moreFilters: "Diğer filtreler",
  countApplied: (values: MessageValues) =>
    interpolate("{count} filtre uygulandı", values),
  datePersonCurrencyCategoryAndTag:
    "Tarih, kişi, para birimi, kategori ve etiket",
  from: "Başlangıç",
  to: "Bitiş",
  paidBy: "Ödeyen",
  splitWith: "Paylaşanlar",
  expenseParticipants: "Gider katılımcıları",
  currency: "Para birimi",
  allCurrencies: "Tüm para birimleri",
  category: "Kategori",
  allCategories: "Tüm kategoriler",
  tag: "Etiket",
  exactTag: "Tam etiket",
  applied: "Uygulanan:",
  clearAll: "Tümünü temizle",
  allPeople: "Tüm kişiler",
  categoryValue: (values: MessageValues) =>
    interpolate("Kategori: {value}", values),
  currencyValue: (values: MessageValues) =>
    interpolate("Para birimi: {value}", values),
  fromValue: (values: MessageValues) =>
    interpolate("Başlangıç: {value}", values),
  toValue: (values: MessageValues) => interpolate("Bitiş: {value}", values),
  tagValue: (values: MessageValues) => interpolate("Etiket: {value}", values),
  aCompleteHistoryWillAppearHereAfterTheFirstSharedExpense:
    "İlk ortak giderden sonra tam geçmiş burada görünür.",
  recordFirstExpense: "İlk gideri kaydet",
  noMatchingExpenses: "Eşleşen gider yok",
  adjustOrClearTheFiltersToSeeAllExpenses:
    "Tüm giderleri görmek için filtreleri değiştirin veya temizleyin.",
  clearFilters: "Filtreleri temizle",
  filteredExpenses: "Filtrelenen giderler",
  allExpenses: "Tüm giderler",
  columns: "Sütunlar",
  chooseExpenseColumns: "Gider sütunlarını seç",
  expenseName: "Gider",
  splitParticipants: "Paylaşım",
  receipt: "Makbuz",
  tags: "Etiketler",
  restoreDefaults: "Varsayılanları geri yükle",
  actions: "İşlemler",
  expenseGroupSummary: (values: MessageValues) =>
    interpolate("{count} gider · {total}", values),
  countPeople: (values: MessageValues) => interpolate("{count} kişi", values),
  viewReceiptForName: (values: MessageValues) =>
    interpolate("{name} için makbuzu görüntüle", values),
  receiptPreviewForName: (values: MessageValues) =>
    interpolate("“{name}” için makbuz", values),
  receiptImageForName: (values: MessageValues) =>
    interpolate("{name} için makbuz görseli", values),
  closeReceiptPreviewHint:
    "Kapatmak için görsele tıklayın veya Esc tuşuna basın.",
  closeReceiptPreview: "Makbuz önizlemesini kapat",
  openOriginalReceipt: "Orijinal görseli aç",
  moreActionsForName: (values: MessageValues) =>
    interpolate("{name} için diğer işlemler", values),
  datePaidByName: (values: MessageValues) =>
    interpolate("{date} · ödeyen: {name}", values),
  splitWithSplit: (values: MessageValues) =>
    interpolate("Paylaşanlar: {split}", values),
  edit: "Düzenle",
  receiptUploadFailed: "Makbuz yüklenemedi",
  receiptUploaded: "Makbuz yüklendi",
  uploading: "Yükleniyor…",
  uploadReceipt: "Makbuz yükle",
  receiptFileRequirements: "JPEG, PNG veya WebP · En fazla 5 MB",
  selectReceiptPhoto: "Fotoğraf yükle",
  takeReceiptPhoto: "Fotoğraf çek",
  removeReceiptPhoto: "Fotoğrafı kaldır",
  receiptOnlineOnly:
    "Fotoğraflar bağlantı gerektirir; çevrimdışı taslaklarda fotoğraf saklanmaz. Önce fotoğrafı kaldırın veya yeniden bağlanın.",
  receiptFileTooLarge: "Fotoğraflar en fazla 5 MB olmalıdır",
  expenseSavedReceiptFailed:
    "Gider oluşturuldu ancak makbuz yüklenemedi. Şimdi tekrar deneyin veya daha sonra gider listesinden ekleyin.",
  retryReceiptUpload: "Makbuzu yüklemeyi tekrar dene",
  receiptAlreadyAttached:
    "Bu giderin zaten bir makbuzu var. Gider listesinden inceleyin; otomatik olarak üzerine yazılmaz",
  uploadReceiptLater: "Daha sonra yükle",
  expenseCreationUncertain:
    "Giderin oluşturulup oluşturulmadığını doğrulayamıyoruz. Tekrar eklemeden önce gider listesini kontrol edin; hemen tekrar denemeyin.",
  viewReceipt: "Makbuzu görüntüle",
  noReceipt: "Makbuz yok",
  deleteReceipt: "Makbuzu sil",
  youCanUploadAnotherReceiptLaterTheExpenseWillNotBeDeleted:
    "Daha sonra başka bir makbuz yükleyebilirsiniz; gider silinmez.",
  receiptDeleted: "Makbuz silindi",
  deleteThisReceipt: "Bu makbuz silinsin mi?",
  deleteName: (values: MessageValues) =>
    interpolate("“{name}” öğesini sil", values),
  thisCannotBeUndoneAllBalancesAndSettlementSuggestionsWillBeRecalculated:
    "Bu işlem geri alınamaz. Tüm bakiyeler ve hesap kapatma önerileri yeniden hesaplanır.",
  expenseDeleted: "Gider silindi",
  deleteThisExpense: "Bu gider silinsin mi?",
  invalidSplitFormat: "Geçersiz paylaşım biçimi",
  selectAtLeastOnePersonToSplitWith: "Paylaşmak için en az bir kişi seçin",
  expenseChangesSaved: "Gider değişiklikleri kaydedildi",
  expenseRecorded: "Gider kaydedildi",
  unableToSaveExpense: "Gider kaydedilemedi",
  reviewTheSplitPreviewBeforeSavingChanges:
    "Değişiklikleri kaydetmeden önce paylaşım önizlemesini inceleyin.",
  enterTheRequiredDetailsFirstCustomSplitsAndTagsAreAvailableBelow:
    "Önce gerekli bilgileri girin. Özel paylaşımlar ve etiketler aşağıda bulunur.",
  editExpense: "Gideri düzenle",
  addExpense2: "Gider ekle",
  discardDraft: "Taslağı sil",
  unsavedChangesWillBeLostExistingDataWillNotChange:
    "Kaydedilmemiş değişiklikler kaybolur. Mevcut veriler değişmez.",
  discardThisDraft: "Bu taslak silinsin mi?",
  description: "Açıklama",
  dinnerHotelTrainTickets: "Akşam yemeği, otel, tren biletleri",
  enterAnExpenseDescription: "Bir gider açıklaması girin",
  amount: "Tutar",
  enterAnExpenseAmount: "Bir gider tutarı girin",
  date: "Tarih",
  currency2: "Para birimi",
  splitPreview: "Paylaşım önizlemesi",
  enterAnAmountToPreviewEachPersonsShare:
    "Her kişinin payını önizlemek için bir tutar girin.",
  namePaidAmount: (values: MessageValues) =>
    interpolate("{name}, {amount} ödedi", values),
  changePeopleAndSplitMethod: "Kişileri ve paylaşım yöntemini değiştir",
  selectedSelectedOfTotal: (values: MessageValues) =>
    interpolate("{total} kişiden {selected} kişi seçildi", values),
  selectAll: "Tümünü seç",
  clear: "Temizle",
  splitMethod: "Paylaşım yöntemi",
  splitEqually: "Eşit paylaş",
  exactAmounts: "Belirli tutarlar",
  percentages: "Yüzdeler",
  shares: "Pay birimleri",
  nameSKind: (values: MessageValues) =>
    interpolate("{name} için {kind}", values),
  moreDetails: "Diğer ayrıntılar",
  categoryAndTags: "Kategori ve etiketler",
  separateWithCommasForExampleBreakfastTransport:
    "Virgülle ayırın, örneğin kahvaltı, ulaşım",
  unsavedChangesWillBeLost: "Kaydedilmemiş değişiklikler kaybolur.",
  cancelEditing: "Düzenleme iptal edilsin mi?",
  saveChanges: "Değişiklikleri kaydet",
  recordExpense: "Gider kaydet",
};
