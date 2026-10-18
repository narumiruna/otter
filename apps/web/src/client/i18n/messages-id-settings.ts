import { interpolate, type MessageValues } from "./message-types.js";

// Provisional machine-authored translations; fluent review is pending.
export const idSettings = {
  groupSettings: "Pengaturan grup",
  manageSharingGroupPreferencesAndDataToolsHighImpactActionsRequireConfirmation:
    "Kelola berbagi, preferensi grup, dan alat data. Tindakan berdampak besar memerlukan konfirmasi.",
  youAreACollaboratorAndCanUseDataToolsOnlyTheOwnerCanManageAccessAndGroupSettings:
    "Anda adalah kolaborator dan dapat menggunakan alat data. Hanya pemilik yang dapat mengelola akses dan pengaturan grup.",
  sharingAndAccess: "Berbagi dan akses",
  linksActiveLinksCollaboratorsCollaborators: (values: MessageValues) =>
    interpolate("{links} tautan aktif · {collaborators} kolaborator", values),
  shareLinkCreated: "Tautan berbagi dibuat",
  shareLinkCreatedAndCopied: "Tautan berbagi dibuat dan disalin",
  shareLinks: "Tautan berbagi",
  chooseWhoCanEditThroughTheShareLink:
    "Pilih siapa yang dapat melihat atau mengedit melalui tautan ini.",
  linkPermission: "Izin tautan",
  readOnlyLink: "Hanya baca (tanpa masuk)",
  signedInEditLink: "Edit setelah masuk",
  anyoneEditLink: "Siapa pun yang memiliki tautan dapat mengedit",
  signedInEditLinkDescription:
    "Setelah masuk atau mendaftar, pengunjung menjadi kolaborator. Mencabut tautan tidak menghapus orang yang sudah bergabung.",
  anyoneEditLinkDescription:
    "Siapa pun yang memiliki tautan dapat mengedit pengeluaran dan peserta tanpa masuk. Bagikan hanya kepada orang yang Anda percaya; pencabutan langsung berlaku.",
  revokingSignedInLinkDoesNotRemoveExistingCollaborators:
    "Pencabutan mencegah orang baru bergabung. Kolaborator yang ada tetap dapat mengedit; hapus akses mereka secara terpisah.",
  signInToEditSharedGroup: (values: MessageValues) =>
    interpolate("Masuk atau buat akun untuk mengedit {name}.", values),
  readOnlyShareLinkCreated: "Tautan berbagi hanya baca dibuat",
  readOnlyShareLinkCreatedAndCopied:
    "Tautan berbagi hanya baca dibuat dan disalin",
  shareLinkCreatedYourBrowserBlockedAutomaticCopyingCopyItManually:
    "Tautan berbagi dibuat. Browser Anda memblokir penyalinan otomatis; salin secara manual.",
  unableToCreateLink: "Tidak dapat membuat tautan",
  shareLinkCopied: "Tautan berbagi disalin",
  yourBrowserBlockedCopyingOpenTheLinkAndCopyItFromTheAddressBar:
    "Browser Anda memblokir penyalinan. Buka tautan dan salin dari bilah alamat.",
  anyoneWithTheLinkCanViewExpensesBalancesAndSettlementsWithoutSigningInButCannotEdit:
    "Siapa pun yang memiliki tautan dapat melihat pengeluaran, saldo, dan pelunasan tanpa masuk, tetapi tidak dapat mengedit.",
  readOnlyShareLinks: "Tautan berbagi hanya baca",
  createReadOnlyLink: "Buat tautan hanya baca",
  anyoneWithTheLinkCanViewThisGroupsExpensesBalancesAndSettlementSuggestionsButCannotAddOrChangeData:
    "Siapa pun yang memiliki tautan dapat melihat pengeluaran, saldo, dan saran pelunasan grup ini, tetapi tidak dapat menambah atau mengubah data.",
  createAShareLink: "Buat tautan berbagi?",
  createShareLink: "Buat tautan berbagi",
  revoked: "Dicabut",
  active: "Aktif",
  openLink: "Buka tautan",
  copy: "Salin",
  revokeLink: "Cabut tautan",
  afterRevocationTheOldLinkWillImmediatelyStopWorking:
    "Setelah dicabut, tautan lama langsung berhenti berfungsi.",
  shareLinkRevoked: "Tautan berbagi dicabut",
  revokeThisShareLink: "Cabut tautan berbagi ini?",
  revoke: "Cabut",
  noShareLinksYet: "Belum ada tautan berbagi.",
  collaboratorAdded: "Kolaborator ditambahkan",
  unableToAddCollaborator: "Tidak dapat menambahkan kolaborator",
  collaboratorsMustBeExistingUsersTheyCanManageExpensesAndParticipantsButNotOwnerSettings:
    "Kolaborator harus merupakan pengguna yang sudah ada. Mereka dapat mengelola pengeluaran dan peserta, tetapi tidak dapat mengelola pengaturan pemilik.",
  existingUsersUsername: "Nama pengguna yang sudah ada",
  addCollaborator: "Tambah kolaborator",
  removeName: (values: MessageValues) => interpolate("Hapus {name}", values),
  thisAccountWillNoLongerBeAbleToManageTheGroupExistingExpenseDataWillRemain:
    "Akun ini tidak lagi dapat mengelola grup. Data pengeluaran yang ada tetap tersimpan.",
  collaboratorRemoved: "Kolaborator dihapus",
  removeCollaborator: "Hapus kolaborator?",
  remove: "Hapus",
  dataAndExport: "Data dan ekspor",
  csvPrintBackupAndRestore: "CSV, cetak, cadangkan, dan pulihkan",
  exportingDoesNotChangeGroupData: "Ekspor tidak mengubah data grup.",
  exportAndPrint: "Ekspor dan cetak",
  expenseCsvExported: "CSV pengeluaran diekspor",
  exportExpenseCsv: "Ekspor CSV pengeluaran",
  settlementCsvExported: "CSV pelunasan diekspor",
  exportSettlementCsv: "Ekspor CSV pelunasan",
  print: "Cetak",
  completeBackupDownloaded: "Cadangan lengkap diunduh",
  downloadFailed: "Gagal mengunduh",
  downloadCompleteBackup: "Unduh cadangan lengkap",
  expenseCsvImported: "CSV pengeluaran diimpor",
  importFailed: "Gagal mengimpor",
  allRowsAreCheckedFirstNoDataIsWrittenIfAnyRowHasAnError:
    "Semua baris diperiksa terlebih dahulu. Tidak ada data yang ditulis jika ada baris yang memiliki kesalahan.",
  importExpenseCsv: "Impor CSV pengeluaran",
  chooseCsv: "Pilih CSV",
  importPreview: "Pratinjau impor",
  rowsRowsCanBeImportedErrorsErrors: (values: MessageValues) =>
    interpolate("{rows} baris dapat diimpor; {errors} kesalahan.", values),
  rowRowMessage: (values: MessageValues) =>
    interpolate("Baris {row}: {message}", values),
  importCountExpenses: (values: MessageValues) =>
    interpolate("Impor {count} pengeluaran", values),
  thisWillAddCountExpensesAtOnceAndRecalculateBalances: (
    values: MessageValues,
  ) =>
    interpolate(
      "Ini akan menambahkan {count} pengeluaran sekaligus dan menghitung ulang saldo.",
      values,
    ),
  applyCsvImport: "Terapkan impor CSV?",
  applyImport: "Terapkan impor",
  invalidBackupFormat: "Format cadangan tidak valid",
  backupRestoredAsANewGroup: "Cadangan dipulihkan sebagai grup baru",
  restoreFailed: "Gagal memulihkan",
  restoringCreatesANewGroupAndDoesNotOverwriteCurrentData:
    "Pemulihan membuat grup baru dan tidak menimpa data saat ini.",
  restoreJsonBackup: "Pulihkan cadangan JSON",
  chooseJsonBackup: "Pilih cadangan JSON",
  restorePreviewName: (values: MessageValues) =>
    interpolate("Pratinjau pemulihan: {name}", values),
  peoplePeopleExpensesExpensesPaymentsPaymentsBaseCurrency: (
    values: MessageValues,
  ) =>
    interpolate(
      "{people} orang · {expenses} pengeluaran · {payments} pembayaran · dasar {currency}",
      values,
    ),
  createNewGroup: "Buat grup baru",
  aNewGroupNamedNameWillBeCreatedWithoutChangingExistingGroups: (
    values: MessageValues,
  ) =>
    interpolate(
      "Grup baru bernama “{name}” akan dibuat tanpa mengubah grup yang ada.",
      values,
    ),
  restoreThisBackup: "Pulihkan cadangan ini?",
  createNewGroup2: "Buat grup baru",
  copyGroup: "Duplikat grup",
  copyThisGroup: "Duplikat grup ini?",
  copyGroupDescription:
    "Salin orang, mata uang dasar, dan kurs khusus ke grup baru. Pengeluaran, pembayaran pelunasan, kolaborator, dan tautan berbagi tidak disalin. Grup asli tidak berubah.",
  groupCopied: "Grup diduplikasi",
  groupPreferences: "Preferensi grup",
  changingTheBaseCurrencyRecalculatesDisplayedAmountsAndClearsCustomExchangeRates:
    "Mengubah mata uang dasar menghitung ulang jumlah yang ditampilkan dan menghapus kurs khusus.",
  nameAndBaseCurrency: "Nama dan mata uang dasar",
  totalSpendingWillDisplayAsAmountBalancesAndSettlementsBelowWillBeConverted: (
    values: MessageValues,
  ) =>
    interpolate(
      "Total pengeluaran akan ditampilkan sebagai {amount}; saldo dan pelunasan di bawah akan dikonversi.",
      values,
    ),
  expectCountSettlementSuggestionsCustomRatesWillResetToBuiltInValues: (
    values: MessageValues,
  ) =>
    interpolate(
      "Diperkirakan ada {count} saran pelunasan; kurs khusus akan diatur ulang ke kurs bawaan Bank of Taiwan.",
      values,
    ),
  cancelChanges: "Batalkan perubahan",
  applyGroupPreferences: "Terapkan preferensi grup",
  changeTheBaseCurrencyToCurrencyRecalculateAllResultsAndClearCustomRates: (
    values: MessageValues,
  ) =>
    interpolate(
      "Ubah mata uang dasar menjadi {currency}, hitung ulang semua hasil, dan hapus kurs khusus.",
      values,
    ),
  renameTheGroupToName: (values: MessageValues) =>
    interpolate("Ubah nama grup menjadi “{name}”.", values),
  applyTheseChanges: "Terapkan perubahan ini?",
  applyChanges: "Terapkan perubahan",
  groupPreferencesApplied: "Preferensi grup diterapkan",
  saveFailed: "Gagal menyimpan",
  customExchangeRatesApplied: "Kurs khusus diterapkan",
  unableToSaveExchangeRates: "Tidak dapat menyimpan kurs",
  currencyConversion: "Konversi mata uang",
  countCustomRates: (values: MessageValues) =>
    interpolate("{count} kurs khusus", values),
  setHowMuch1UnitOfEachCurrencyEqualsInCurrencyLeaveBlankToUseTheBuiltInFixedRate:
    (values: MessageValues) =>
      interpolate(
        "Tetapkan nilai 1 unit tiap mata uang dalam {currency}. Kurs yang tidak ditetapkan otomatis menggunakan kurs tengah spot Bank of Taiwan.",
        values,
      ),
  customExchangeRates: "Kurs khusus",
  bankOfTaiwanSpotMidRateDescription:
    "Pengeluaran baru tanpa kurs khusus menggunakan kurs tengah spot Bank of Taiwan dan menyimpan kutipan kurs tersebut. Menghapus kurs khusus memengaruhi pengeluaran mendatang; pembayaran tetap menggunakan kurs saat ini.",
  loadBankOfTaiwanSpotMidRates: "Muat kurs bawaan Bank of Taiwan",
  loadingBankExchangeRates: "Memuat kurs bank…",
  bankOfTaiwanSpotMidRatesLoadedAtTime: (values: MessageValues) =>
    interpolate("Kurs tengah spot Bank of Taiwan dimuat ({time}).", values),
  bankOfTaiwanDefaultRatesApplied: "Kurs bawaan Bank of Taiwan dipulihkan",
  unableToLoadBankExchangeRates:
    "Kurs bank saat ini tidak tersedia. Coba lagi nanti.",
  conversionPreview: "Pratinjau konversi",
  totalSpendingAmountCountSettlementSuggestions: (values: MessageValues) =>
    interpolate(
      "Total pengeluaran: {amount} · {count} saran pelunasan.",
      values,
    ),
  applyRates: "Terapkan kurs",
  allTotalsBalancesAndSettlementSuggestionsWillBeRecalculatedWithTheseRates:
    "Pengeluaran yang ada mempertahankan kursnya. Pengeluaran baru atau yang dihitung ulang kursnya serta pembayaran yang ada menggunakan kurs yang diperbarui.",
  applyCustomExchangeRates: "Terapkan kurs khusus?",
  restoreBankOfTaiwanDefaultRates: "Pulihkan kurs bawaan Bank of Taiwan?",
  apiWriteSettings: "Akses tulis API",
  apiWritesAllowed: "Diizinkan",
  apiWritesBlocked: "Tidak diizinkan",
  apiWriteSettingsDescription:
    "Token API dan CLI tidak dapat mengubah grup ini secara bawaan. Jika diaktifkan, anggota dengan token API dapat mengedit sesuai izinnya. Tindakan di browser tidak terpengaruh.",
  allowApiWrites: "Izinkan perubahan melalui token API",
  apiWriteSettingSaved: "Akses tulis API diperbarui",
  groupLifecycle: "Siklus hidup grup",
  archivedReadOnly: "Diarsipkan · hanya baca",
  active2: "Aktif",
  afterRestoringDataCanBeAddedAndChangedAgain:
    "Setelah dipulihkan, data dapat ditambahkan dan diubah kembali.",
  archivingPreservesAllDataButMakesTheGroupReadOnly:
    "Pengarsipan menyimpan semua data, tetapi menjadikan grup hanya baca.",
  restoreGroup: "Pulihkan grup",
  archiveGroup: "Arsipkan grup",
  afterRestoringTheOwnerAndCollaboratorsCanEditDataAgain:
    "Setelah dipulihkan, pemilik dan kolaborator dapat mengedit data kembali.",
  expensesPeopleAndPaymentRecordsArePreservedAndCannotBeChangedWhileArchived:
    "Pengeluaran, orang, dan catatan pembayaran tetap disimpan dan tidak dapat diubah selama diarsipkan.",
  groupRestored: "Grup dipulihkan",
  groupArchived: "Grup diarsipkan",
  restoreThisGroup: "Pulihkan grup ini?",
  archiveThisGroup: "Arsipkan grup ini?",
  thisPermanentlyDeletesAllPeopleExpensesReceiptsAndSettlementRecordsAndCannotBeUndone:
    "Ini menghapus semua orang, pengeluaran, struk, dan catatan pelunasan secara permanen dan tidak dapat dibatalkan.",
  deleteGroup: "Hapus grup",
  enterNameToConfirm: (values: MessageValues) =>
    interpolate("Masukkan “{name}” untuk mengonfirmasi", values),
  permanentlyDeleteName: (values: MessageValues) =>
    interpolate("Hapus “{name}” secara permanen", values),
  thisCannotBeUndoneCancelingMakesNoChanges:
    "Tindakan ini tidak dapat dibatalkan. Membatalkan tidak membuat perubahan.",
  permanentlyDeleteThisGroup: "Hapus grup ini secara permanen?",
  permanentlyDeleteGroup: "Hapus grup secara permanen",
  groupDeleted: "Grup dihapus",
  readOnlyShare: "Berbagi hanya baca",
  youCanViewExpensesBalancesAndSettlementSuggestionsButCannotEditData:
    "Anda dapat melihat pengeluaran, saldo, dan saran pelunasan, tetapi tidak dapat mengedit data.",
  completeExpenseHistory: "Riwayat pengeluaran lengkap",
  manageGroupSettings: "Kelola pengaturan grup",
  csvImportFailed: "Gagal mengimpor CSV",
  theCsvHasNoData: "CSV tidak berisi data",
  missingColumnsColumns: (values: MessageValues) =>
    interpolate("Kolom yang tidak ada: {columns}", values),
  participantNotFoundName: (values: MessageValues) =>
    interpolate("Peserta tidak ditemukan: {name}", values),
  invalidJsonFormat: "Format JSON tidak valid",
  incorrectUsernameOrPassword: "Nama pengguna atau kata sandi salah",
  everyPersonNeedsAnAmountForACustomSplit:
    "Setiap orang harus memiliki jumlah untuk pembagian khusus",
  unsupportedBackupVersion: "Versi cadangan tidak didukung",
  unsupportedSplitMethod: "Metode pembagian tidak didukung",
  unsupportedExchangeRateCurrency: "Mata uang kurs tidak didukung",
  unsupportedBaseCurrency: "Mata uang dasar tidak didukung",
  unsupportedCurrency: "Mata uang tidak didukung",
  aParticipantCannotBeMergedIntoThemselves:
    "Peserta tidak dapat digabungkan dengan dirinya sendiri",
  theOwnerCannotBeRemoved: "Pemilik tidak dapat dihapus",
  thePayerAndRecipientMustBeDifferent: "Pembayar dan penerima harus berbeda",
  payerIsRequired: "Pembayar wajib diisi",
  thePayerMustBeAParticipant: "Pembayar harus merupakan peserta",
  serverError: "Kesalahan server",
  invalidPaymentRecordsInBackup:
    "Catatan pembayaran dalam cadangan tidak valid",
  splitTotalsInBackupAreInvalid: "Total pembagian dalam cadangan tidak valid",
  invalidSplitDataInBackup: "Data pembagian dalam cadangan tidak valid",
  invalidExchangeRatesInBackup: "Kurs dalam cadangan tidak valid",
  invalidParticipantDataInBackup: "Data peserta dalam cadangan tidak valid",
  backupContainsDuplicateParticipants: "Cadangan berisi peserta duplikat",
  invalidBaseCurrencyInBackup: "Mata uang dasar dalam cadangan tidak valid",
  invalidExpenseCategoryInBackup:
    "Kategori pengeluaran dalam cadangan tidak valid",
  anExpenseParticipantInTheBackupDoesNotExist:
    "Peserta pengeluaran dalam cadangan tidak ada",
  anExpenseInTheBackupHasDuplicateParticipants:
    "Pengeluaran dalam cadangan memiliki peserta duplikat",
  invalidExpenseDataInBackup: "Data pengeluaran dalam cadangan tidak valid",
  invalidExpenseTagsInBackup: "Tag pengeluaran dalam cadangan tidak valid",
  invalidTripNameInBackup: "Nama perjalanan dalam cadangan tidak valid",
  backupIsMissingItsTrip: "Cadangan tidak memiliki data perjalanan",
  backupIsMissingParticipants: "Cadangan tidak memiliki peserta",
  backupIsMissingExpenses: "Cadangan tidak memiliki pengeluaran",
  notesCanBeUpTo160Characters: "Catatan dapat berisi maksimal 160 karakter",
  theShareLinkIsInvalidOrHasBeenRevoked:
    "Tautan berbagi tidak valid atau telah dicabut",
  atLeastOneSplitParticipantIsRequired:
    "Diperlukan minimal satu peserta pembagian",
  splitParticipantsMustBelongToTheTrip:
    "Peserta pembagian harus merupakan bagian dari perjalanan",
  splitAmountsMustAddUpToTheExpenseAmount:
    "Total jumlah pembagian harus sama dengan jumlah pengeluaran",
  splitAmountsMustBeGreaterThan0: "Jumlah pembagian harus lebih besar dari 0",
  invalidSplitAmount: "Jumlah pembagian tidak valid",
  invalidCategoryOrTagFormat: "Format kategori atau tag tidak valid",
  exchangeRatesMustBeGreaterThan0: "Kurs harus lebih besar dari 0",
  invalidExchangeRateFormat: "Format kurs tidak valid",
  aParticipantWithThisNameAlreadyExists: "Peserta dengan nama ini sudah ada",
  thisParticipantHasPaymentRecordsAndCannotBeDeleted:
    "Peserta ini memiliki catatan pembayaran dan tidak dapat dihapus",
  thisParticipantHasExpensesAndCannotBeDeleted:
    "Peserta ini memiliki pengeluaran dan tidak dapat dihapus",
  onlyTheOwnerCanDownloadACompleteBackup:
    "Hanya pemilik yang dapat mengunduh cadangan lengkap",
  onlyTheOwnerCanManageShareLinks:
    "Hanya pemilik yang dapat mengelola tautan berbagi",
  onlyTheOwnerCanManageCollaborators:
    "Hanya pemilik yang dapat mengelola kolaborator",
  onlyTheOwnerCanManageTripSettings:
    "Hanya pemilik yang dapat mengelola pengaturan perjalanan",
  namesCanBeUpTo80Characters: "Nama dapat berisi maksimal 80 karakter",
  passwordMustBeAtLeast8Characters3:
    "Kata sandi harus berisi minimal 8 karakter",
  invalidArchiveStatus: "Status arsip tidak valid",
  invalidApiWriteSetting: "Pengaturan akses tulis API tidak valid",
  onlyBrowserSessionsCanManageApiWrites:
    "Hanya sesi browser yang dapat mengelola akses tulis API",
  apiWritesDisabledForThisGroup:
    "Grup ini tidak mengizinkan perubahan melalui token API",
  apiEndpointNotFound: "Endpoint API tidak ditemukan",
  paymentRecordNotFound: "Catatan pembayaran tidak ditemukan",
  collaboratorNotFound: "Kolaborator tidak ditemukan",
  participantNotFound: "Peserta tidak ditemukan",
  noActiveShareLinkWasFound: "Tidak ditemukan tautan berbagi aktif",
  expenseNotFound: "Pengeluaran tidak ditemukan",
  receiptNotFound: "Struk tidak ditemukan",
  tripNotFound: "Perjalanan tidak ditemukan",
  userNotFound: "Pengguna tidak ditemukan",
  descriptionMustBe1120Characters: "Deskripsi harus berisi 1–120 karakter",
  theOwnerIsAlreadyInTheCollaboratorList:
    "Pemilik sudah ada dalam daftar kolaborator",
  thisGroupIsArchivedRestoreItBeforeEditing:
    "Grup ini diarsipkan. Pulihkan sebelum mengedit.",
  receiptsMustBeJpegPngOrWebpImages:
    "Struk harus berupa gambar JPEG, PNG, atau WebP",
  theRecipientMustBeAParticipant: "Penerima harus merupakan peserta",
  aTripWithThisNameAlreadyExists: "Perjalanan dengan nama ini sudah ada",
  dateMustUseTheYyyyMmDdFormat: "Tanggal harus menggunakan format YYYY-MM-DD",
  upTo10TagsAreAllowed: "Maksimal 10 tag diizinkan",
  tagsCanBeUpTo24Characters: "Tag dapat berisi maksimal 24 karakter",
  invalidTagFormat: "Format tag tidak valid",
  theTargetParticipantMustBelongToTheTrip:
    "Peserta tujuan harus merupakan bagian dari perjalanan",
  signInFirst: "Masuk terlebih dahulu",
  provideExpenseChanges: "Berikan perubahan pengeluaran",
  provideTripChanges: "Berikan perubahan perjalanan",
  requestBodyIsTooLarge: "Isi permintaan terlalu besar",
  selectAtLeastOneSplitParticipant: "Pilih minimal satu peserta pembagian",
  enterATripNameOf1100Characters:
    "Masukkan nama perjalanan berisi 1–100 karakter",
  enterAnExpenseDescriptionOf1120Characters:
    "Masukkan deskripsi pengeluaran berisi 1–120 karakter",
  enterAParticipantNameOf180Characters:
    "Masukkan nama peserta berisi 1–80 karakter",
  enterAUsernameAndPassword: "Masukkan nama pengguna dan kata sandi",
  enterSplitValues: "Masukkan nilai pembagian",
  enterAValidPaymentDate: "Masukkan tanggal pembayaran yang valid",
  enterValidSplitShares: "Masukkan bobot bagian yang valid",
  enterValidSplitPercentages: "Masukkan persentase pembagian yang valid",
  enterValidSplitAmounts: "Masukkan jumlah pembagian yang valid",
  enterAValidExpenseDate: "Masukkan tanggal pengeluaran yang valid",
  chooseACsvFile: "Pilih file CSV",
  selectSplitParticipants: "Pilih peserta pembagian",
  chooseAReceiptImage: "Pilih gambar struk",
  thisUserIsAlreadyACollaborator: "Pengguna ini sudah menjadi kolaborator",
  thisUsernameIsAlreadyRegistered: "Nama pengguna ini sudah terdaftar",
  usernameIsBeingRegisteredOrAlreadyRegistered:
    "Nama pengguna ini sedang didaftarkan atau sudah digunakan",
  usernameIsBeingRegistered: "Nama pengguna ini sedang didaftarkan",
  usernameOrPasskeyAlreadyRegistered:
    "Nama pengguna atau Passkey ini sudah terdaftar",
  invalidAmount: "Jumlah tidak valid",
  theDefaultDevelopmentAccountsUsernameCannotBeChanged:
    "Nama pengguna akun pengembangan bawaan tidak dapat diubah",
  language: "Bahasa",
  english: "Bahasa Inggris",
  traditionalChinese: "Bahasa Tionghoa Tradisional",
};
