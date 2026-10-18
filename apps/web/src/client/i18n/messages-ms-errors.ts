import { interpolate, type MessageValues } from "./message-types.js";

export const msErrors = {
  csvImportFailed: "Import CSV gagal",
  theCsvHasNoData: "CSV tidak mengandungi data",
  missingColumnsColumns: (values: MessageValues) =>
    interpolate("Lajur tiada: {columns}", values),
  participantNotFoundName: (values: MessageValues) =>
    interpolate("Peserta tidak ditemui: {name}", values),
  invalidJsonFormat: "Format JSON tidak sah",
  incorrectUsernameOrPassword: "Nama pengguna atau kata laluan salah",
  everyPersonNeedsAnAmountForACustomSplit:
    "Setiap orang memerlukan amaun untuk pembahagian tersuai",
  unsupportedBackupVersion: "Versi sandaran tidak disokong",
  unsupportedSplitMethod: "Kaedah pembahagian tidak disokong",
  unsupportedExchangeRateCurrency: "Mata wang kadar pertukaran tidak disokong",
  unsupportedBaseCurrency: "Mata wang asas tidak disokong",
  unsupportedCurrency: "Mata wang tidak disokong",
  aParticipantCannotBeMergedIntoThemselves:
    "Peserta tidak boleh digabungkan dengan dirinya sendiri",
  theOwnerCannotBeRemoved: "Pemilik tidak boleh dibuang",
  thePayerAndRecipientMustBeDifferent: "Pembayar dan penerima mestilah berbeza",
  payerIsRequired: "Pembayar diperlukan",
  thePayerMustBeAParticipant: "Pembayar mestilah peserta",
  serverError: "Ralat pelayan",
  invalidPaymentRecordsInBackup: "Rekod bayaran dalam sandaran tidak sah",
  splitTotalsInBackupAreInvalid: "Jumlah pembahagian dalam sandaran tidak sah",
  invalidSplitDataInBackup: "Data pembahagian dalam sandaran tidak sah",
  invalidExchangeRatesInBackup: "Kadar pertukaran dalam sandaran tidak sah",
  invalidParticipantDataInBackup: "Data peserta dalam sandaran tidak sah",
  backupContainsDuplicateParticipants: "Sandaran mengandungi peserta berganda",
  invalidBaseCurrencyInBackup: "Mata wang asas dalam sandaran tidak sah",
  invalidExpenseCategoryInBackup:
    "Kategori perbelanjaan dalam sandaran tidak sah",
  anExpenseParticipantInTheBackupDoesNotExist:
    "Seorang peserta perbelanjaan dalam sandaran tidak wujud",
  anExpenseInTheBackupHasDuplicateParticipants:
    "Satu perbelanjaan dalam sandaran mempunyai peserta berganda",
  invalidExpenseDataInBackup: "Data perbelanjaan dalam sandaran tidak sah",
  invalidExpenseTagsInBackup: "Tag perbelanjaan dalam sandaran tidak sah",
  invalidTripNameInBackup: "Nama perjalanan dalam sandaran tidak sah",
  backupIsMissingItsTrip: "Sandaran tidak mengandungi perjalanan",
  backupIsMissingParticipants: "Sandaran tidak mengandungi peserta",
  backupIsMissingExpenses: "Sandaran tidak mengandungi perbelanjaan",
  notesCanBeUpTo160Characters: "Nota boleh mengandungi sehingga 160 aksara",
  theShareLinkIsInvalidOrHasBeenRevoked:
    "Pautan perkongsian tidak sah atau telah dibatalkan",
  atLeastOneSplitParticipantIsRequired:
    "Sekurang-kurangnya seorang peserta pembahagian diperlukan",
  splitParticipantsMustBelongToTheTrip:
    "Peserta pembahagian mestilah ahli perjalanan ini",
  splitAmountsMustAddUpToTheExpenseAmount:
    "Jumlah amaun bahagian mesti sama dengan amaun perbelanjaan",
  splitAmountsMustBeGreaterThan0: "Amaun bahagian mesti lebih daripada 0",
  invalidSplitAmount: "Amaun bahagian tidak sah",
  invalidCategoryOrTagFormat: "Format kategori atau tag tidak sah",
  exchangeRatesMustBeGreaterThan0: "Kadar pertukaran mesti lebih daripada 0",
  invalidExchangeRateFormat: "Format kadar pertukaran tidak sah",
  aParticipantWithThisNameAlreadyExists: "Peserta dengan nama ini sudah wujud",
  thisParticipantHasPaymentRecordsAndCannotBeDeleted:
    "Peserta ini mempunyai rekod bayaran dan tidak boleh dipadam",
  thisParticipantHasExpensesAndCannotBeDeleted:
    "Peserta ini mempunyai perbelanjaan dan tidak boleh dipadam",
  onlyTheOwnerCanDownloadACompleteBackup:
    "Hanya pemilik boleh memuat turun sandaran lengkap",
  onlyTheOwnerCanManageShareLinks:
    "Hanya pemilik boleh mengurus pautan perkongsian",
  onlyTheOwnerCanManageCollaborators:
    "Hanya pemilik boleh mengurus rakan kerjasama",
  onlyTheOwnerCanManageTripSettings:
    "Hanya pemilik boleh mengurus tetapan perjalanan",
  namesCanBeUpTo80Characters: "Nama boleh mengandungi sehingga 80 aksara",
  passwordMustBeAtLeast8Characters3:
    "Kata laluan mesti sekurang-kurangnya 8 aksara",
  invalidArchiveStatus: "Status arkib tidak sah",
  invalidApiWriteSetting: "Tetapan akses tulis API tidak sah",
  onlyBrowserSessionsCanManageApiWrites:
    "Hanya sesi pelayar boleh mengurus akses tulis API",
  apiWritesDisabledForThisGroup:
    "Kumpulan ini tidak membenarkan perubahan melalui token API",
  apiEndpointNotFound: "Titik akhir API tidak ditemui",
  paymentRecordNotFound: "Rekod bayaran tidak ditemui",
  collaboratorNotFound: "Rakan kerjasama tidak ditemui",
  participantNotFound: "Peserta tidak ditemui",
  noActiveShareLinkWasFound: "Tiada pautan perkongsian aktif ditemui",
  expenseNotFound: "Perbelanjaan tidak ditemui",
  receiptNotFound: "Resit tidak ditemui",
  tripNotFound: "Perjalanan tidak ditemui",
  userNotFound: "Pengguna tidak ditemui",
  descriptionMustBe1120Characters:
    "Huraian mesti terdiri daripada 1–120 aksara",
  theOwnerIsAlreadyInTheCollaboratorList:
    "Pemilik sudah berada dalam senarai rakan kerjasama",
  thisGroupIsArchivedRestoreItBeforeEditing:
    "Kumpulan ini diarkibkan. Pulihkannya sebelum menyunting.",
  receiptsMustBeJpegPngOrWebpImages: "Resit mestilah imej JPEG, PNG atau WebP",
  theRecipientMustBeAParticipant: "Penerima mestilah peserta",
  aTripWithThisNameAlreadyExists: "Perjalanan dengan nama ini sudah wujud",
  dateMustUseTheYyyyMmDdFormat: "Tarikh mesti menggunakan format YYYY-MM-DD",
  upTo10TagsAreAllowed: "Sehingga 10 tag dibenarkan",
  tagsCanBeUpTo24Characters: "Tag boleh mengandungi sehingga 24 aksara",
  invalidTagFormat: "Format tag tidak sah",
  theTargetParticipantMustBelongToTheTrip:
    "Peserta sasaran mestilah ahli perjalanan ini",
  signInFirst: "Log masuk dahulu",
  provideExpenseChanges: "Sertakan perubahan perbelanjaan",
  provideTripChanges: "Sertakan perubahan perjalanan",
  requestBodyIsTooLarge: "Kandungan permintaan terlalu besar",
  selectAtLeastOneSplitParticipant:
    "Pilih sekurang-kurangnya seorang peserta pembahagian",
  enterATripNameOf1100Characters:
    "Masukkan nama perjalanan yang terdiri daripada 1–100 aksara",
  enterAnExpenseDescriptionOf1120Characters:
    "Masukkan huraian perbelanjaan yang terdiri daripada 1–120 aksara",
  enterAParticipantNameOf180Characters:
    "Masukkan nama peserta yang terdiri daripada 1–80 aksara",
  enterAUsernameAndPassword: "Masukkan nama pengguna dan kata laluan",
  enterSplitValues: "Masukkan nilai pembahagian",
  enterAValidPaymentDate: "Masukkan tarikh bayaran yang sah",
  enterValidSplitShares: "Masukkan unit bahagian yang sah",
  enterValidSplitPercentages: "Masukkan peratusan pembahagian yang sah",
  enterValidSplitAmounts: "Masukkan amaun bahagian yang sah",
  enterAValidExpenseDate: "Masukkan tarikh perbelanjaan yang sah",
  chooseACsvFile: "Pilih fail CSV",
  selectSplitParticipants: "Pilih peserta pembahagian",
  chooseAReceiptImage: "Pilih imej resit",
  thisUserIsAlreadyACollaborator: "Pengguna ini sudah menjadi rakan kerjasama",
  thisUsernameIsAlreadyRegistered: "Nama pengguna ini telah didaftarkan",
  usernameIsBeingRegisteredOrAlreadyRegistered:
    "Nama pengguna ini sedang didaftarkan atau telah digunakan",
  usernameIsBeingRegistered: "Nama pengguna ini sedang didaftarkan",
  usernameOrPasskeyAlreadyRegistered:
    "Nama pengguna atau Passkey ini telah didaftarkan",
  invalidAmount: "Amaun tidak sah",
  theDefaultDevelopmentAccountsUsernameCannotBeChanged:
    "Nama pengguna akaun pembangunan lalai tidak boleh diubah",
  language: "Bahasa",
  english: "Bahasa Inggeris",
  traditionalChinese: "Bahasa Cina Tradisional",
};
