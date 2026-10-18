import { interpolate, type MessageValues } from "./message-types.js";

export const trErrors = {
  csvImportFailed: "CSV içe aktarma başarısız",
  theCsvHasNoData: "CSV dosyasında veri yok",
  missingColumnsColumns: (values: MessageValues) =>
    interpolate("Eksik sütunlar: {columns}", values),
  participantNotFoundName: (values: MessageValues) =>
    interpolate("Katılımcı bulunamadı: {name}", values),
  invalidJsonFormat: "Geçersiz JSON biçimi",
  incorrectUsernameOrPassword: "Kullanıcı adı veya parola yanlış",
  everyPersonNeedsAnAmountForACustomSplit:
    "Özel paylaşımda her kişi için bir tutar gerekir",
  unsupportedBackupVersion: "Desteklenmeyen yedek sürümü",
  unsupportedSplitMethod: "Desteklenmeyen paylaşım yöntemi",
  unsupportedExchangeRateCurrency: "Desteklenmeyen döviz kuru para birimi",
  unsupportedBaseCurrency: "Desteklenmeyen temel para birimi",
  unsupportedCurrency: "Desteklenmeyen para birimi",
  aParticipantCannotBeMergedIntoThemselves:
    "Bir katılımcı kendisiyle birleştirilemez",
  theOwnerCannotBeRemoved: "Grup sahibi kaldırılamaz",
  thePayerAndRecipientMustBeDifferent: "Ödeyen ve alıcı farklı olmalıdır",
  payerIsRequired: "Ödeyen gereklidir",
  thePayerMustBeAParticipant: "Ödeyen bir katılımcı olmalıdır",
  serverError: "Sunucu hatası",
  invalidPaymentRecordsInBackup: "Yedekte geçersiz ödeme kayıtları var",
  splitTotalsInBackupAreInvalid: "Yedekteki pay toplamları geçersiz",
  invalidSplitDataInBackup: "Yedekte geçersiz paylaşım verileri var",
  invalidExchangeRatesInBackup: "Yedekte geçersiz döviz kurları var",
  invalidParticipantDataInBackup: "Yedekte geçersiz katılımcı verileri var",
  backupContainsDuplicateParticipants: "Yedekte yinelenen katılımcılar var",
  invalidBaseCurrencyInBackup: "Yedekteki temel para birimi geçersiz",
  invalidExpenseCategoryInBackup: "Yedekteki gider kategorisi geçersiz",
  anExpenseParticipantInTheBackupDoesNotExist:
    "Yedekteki bir gider katılımcısı mevcut değil",
  anExpenseInTheBackupHasDuplicateParticipants:
    "Yedekteki bir giderde yinelenen katılımcılar var",
  invalidExpenseDataInBackup: "Yedekte geçersiz gider verileri var",
  invalidExpenseTagsInBackup: "Yedekte geçersiz gider etiketleri var",
  invalidTripNameInBackup: "Yedekteki seyahat adı geçersiz",
  backupIsMissingItsTrip: "Yedekte seyahat eksik",
  backupIsMissingParticipants: "Yedekte katılımcılar eksik",
  backupIsMissingExpenses: "Yedekte giderler eksik",
  notesCanBeUpTo160Characters: "Notlar en fazla 160 karakter olabilir",
  theShareLinkIsInvalidOrHasBeenRevoked:
    "Paylaşım bağlantısı geçersiz veya iptal edilmiş",
  atLeastOneSplitParticipantIsRequired:
    "En az bir paylaşım katılımcısı gereklidir",
  splitParticipantsMustBelongToTheTrip:
    "Paylaşım katılımcıları seyahate ait olmalıdır",
  splitAmountsMustAddUpToTheExpenseAmount:
    "Pay tutarlarının toplamı gider tutarına eşit olmalıdır",
  splitAmountsMustBeGreaterThan0: "Pay tutarları 0'dan büyük olmalıdır",
  invalidSplitAmount: "Geçersiz pay tutarı",
  invalidCategoryOrTagFormat: "Geçersiz kategori veya etiket biçimi",
  exchangeRatesMustBeGreaterThan0: "Döviz kurları 0'dan büyük olmalıdır",
  invalidExchangeRateFormat: "Geçersiz döviz kuru biçimi",
  aParticipantWithThisNameAlreadyExists: "Bu ada sahip bir katılımcı zaten var",
  thisParticipantHasPaymentRecordsAndCannotBeDeleted:
    "Bu katılımcının ödeme kayıtları var ve silinemez",
  thisParticipantHasExpensesAndCannotBeDeleted:
    "Bu katılımcının giderleri var ve silinemez",
  onlyTheOwnerCanDownloadACompleteBackup:
    "Tam yedeği yalnızca grup sahibi indirebilir",
  onlyTheOwnerCanManageShareLinks:
    "Paylaşım bağlantılarını yalnızca grup sahibi yönetebilir",
  onlyTheOwnerCanManageCollaborators:
    "Ortak düzenleyicileri yalnızca grup sahibi yönetebilir",
  onlyTheOwnerCanManageTripSettings:
    "Seyahat ayarlarını yalnızca grup sahibi yönetebilir",
  namesCanBeUpTo80Characters: "Adlar en fazla 80 karakter olabilir",
  passwordMustBeAtLeast8Characters3: "Parola en az 8 karakter olmalıdır",
  invalidArchiveStatus: "Geçersiz arşiv durumu",
  invalidApiWriteSetting: "Geçersiz API yazma erişimi ayarı",
  onlyBrowserSessionsCanManageApiWrites:
    "API yazma erişimini yalnızca tarayıcı oturumları yönetebilir",
  apiWritesDisabledForThisGroup:
    "Bu grup API belirteciyle değişikliklere izin vermiyor",
  apiEndpointNotFound: "API uç noktası bulunamadı",
  paymentRecordNotFound: "Ödeme kaydı bulunamadı",
  collaboratorNotFound: "Ortak düzenleyici bulunamadı",
  participantNotFound: "Katılımcı bulunamadı",
  noActiveShareLinkWasFound: "Etkin paylaşım bağlantısı bulunamadı",
  expenseNotFound: "Gider bulunamadı",
  receiptNotFound: "Makbuz bulunamadı",
  tripNotFound: "Seyahat bulunamadı",
  userNotFound: "Kullanıcı bulunamadı",
  descriptionMustBe1120Characters: "Açıklama 1–120 karakter olmalıdır",
  theOwnerIsAlreadyInTheCollaboratorList:
    "Grup sahibi zaten ortak düzenleyici listesinde",
  thisGroupIsArchivedRestoreItBeforeEditing:
    "Bu grup arşivlenmiş. Düzenlemeden önce geri yükleyin.",
  receiptsMustBeJpegPngOrWebpImages:
    "Makbuzlar JPEG, PNG veya WebP görselleri olmalıdır",
  theRecipientMustBeAParticipant: "Alıcı bir katılımcı olmalıdır",
  aTripWithThisNameAlreadyExists: "Bu ada sahip bir seyahat zaten var",
  dateMustUseTheYyyyMmDdFormat: "Tarih YYYY-MM-DD biçiminde olmalıdır",
  upTo10TagsAreAllowed: "En fazla 10 etikete izin verilir",
  tagsCanBeUpTo24Characters: "Etiketler en fazla 24 karakter olabilir",
  invalidTagFormat: "Geçersiz etiket biçimi",
  theTargetParticipantMustBelongToTheTrip:
    "Hedef katılımcı seyahate ait olmalıdır",
  signInFirst: "Önce oturum açın",
  provideExpenseChanges: "Gider değişikliklerini belirtin",
  provideTripChanges: "Seyahat değişikliklerini belirtin",
  requestBodyIsTooLarge: "İstek gövdesi çok büyük",
  selectAtLeastOneSplitParticipant: "En az bir paylaşım katılımcısı seçin",
  enterATripNameOf1100Characters: "1–100 karakterlik bir seyahat adı girin",
  enterAnExpenseDescriptionOf1120Characters:
    "1–120 karakterlik bir gider açıklaması girin",
  enterAParticipantNameOf180Characters:
    "1–80 karakterlik bir katılımcı adı girin",
  enterAUsernameAndPassword: "Bir kullanıcı adı ve parola girin",
  enterSplitValues: "Paylaşım değerlerini girin",
  enterAValidPaymentDate: "Geçerli bir ödeme tarihi girin",
  enterValidSplitShares: "Geçerli pay birimleri girin",
  enterValidSplitPercentages: "Geçerli paylaşım yüzdeleri girin",
  enterValidSplitAmounts: "Geçerli pay tutarları girin",
  enterAValidExpenseDate: "Geçerli bir gider tarihi girin",
  chooseACsvFile: "Bir CSV dosyası seçin",
  selectSplitParticipants: "Paylaşım katılımcılarını seçin",
  chooseAReceiptImage: "Bir makbuz görseli seçin",
  thisUserIsAlreadyACollaborator: "Bu kullanıcı zaten ortak düzenleyici",
  thisUsernameIsAlreadyRegistered: "Bu kullanıcı adı zaten kayıtlı",
  usernameIsBeingRegisteredOrAlreadyRegistered:
    "Bu kullanıcı adı kaydediliyor veya zaten alınmış",
  usernameIsBeingRegistered: "Bu kullanıcı adı kaydediliyor",
  usernameOrPasskeyAlreadyRegistered:
    "Bu kullanıcı adı veya Passkey zaten kayıtlı",
  invalidAmount: "Geçersiz tutar",
  theDefaultDevelopmentAccountsUsernameCannotBeChanged:
    "Varsayılan geliştirme hesabının kullanıcı adı değiştirilemez",
};
