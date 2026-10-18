import { interpolate, type MessageValues } from "./message-types.js";

export const msSettings = {
  groupSettings: "Tetapan kumpulan",
  manageSharingGroupPreferencesAndDataToolsHighImpactActionsRequireConfirmation:
    "Urus perkongsian, keutamaan kumpulan dan alat data. Tindakan berimpak tinggi memerlukan pengesahan.",
  youAreACollaboratorAndCanUseDataToolsOnlyTheOwnerCanManageAccessAndGroupSettings:
    "Anda ialah rakan kerjasama dan boleh menggunakan alat data. Hanya pemilik boleh mengurus akses dan tetapan kumpulan.",
  sharingAndAccess: "Perkongsian dan akses",
  linksActiveLinksCollaboratorsCollaborators: (values: MessageValues) =>
    interpolate(
      "{links} pautan aktif · {collaborators} rakan kerjasama",
      values,
    ),
  shareLinkCreated: "Pautan perkongsian dicipta",
  shareLinkCreatedAndCopied: "Pautan perkongsian dicipta dan disalin",
  shareLinks: "Pautan perkongsian",
  chooseWhoCanEditThroughTheShareLink:
    "Pilih siapa yang boleh melihat atau menyunting melalui pautan ini.",
  linkPermission: "Kebenaran pautan",
  readOnlyLink: "Baca sahaja (tanpa log masuk)",
  signedInEditLink: "Sunting selepas log masuk",
  anyoneEditLink: "Sesiapa yang mempunyai pautan boleh menyunting",
  signedInEditLinkDescription:
    "Selepas log masuk atau mendaftar, pelawat menjadi rakan kerjasama. Membatalkan pautan tidak membuang orang yang sudah menyertai.",
  anyoneEditLinkDescription:
    "Sesiapa yang mempunyai pautan boleh menyunting perbelanjaan dan peserta tanpa log masuk. Kongsi hanya dengan orang yang anda percayai; pembatalan berkuat kuasa serta-merta.",
  revokingSignedInLinkDoesNotRemoveExistingCollaborators:
    "Pembatalan menghalang penyertaan baharu. Rakan kerjasama sedia ada masih boleh menyunting; buang akses mereka secara berasingan.",
  signInToEditSharedGroup: (values: MessageValues) =>
    interpolate("Log masuk atau cipta akaun untuk menyunting {name}.", values),
  readOnlyShareLinkCreated: "Pautan perkongsian baca sahaja dicipta",
  readOnlyShareLinkCreatedAndCopied:
    "Pautan perkongsian baca sahaja dicipta dan disalin",
  shareLinkCreatedYourBrowserBlockedAutomaticCopyingCopyItManually:
    "Pautan perkongsian dicipta. Pelayar anda menyekat penyalinan automatik; salin secara manual.",
  unableToCreateLink: "Tidak dapat mencipta pautan",
  shareLinkCopied: "Pautan perkongsian disalin",
  yourBrowserBlockedCopyingOpenTheLinkAndCopyItFromTheAddressBar:
    "Pelayar anda menyekat penyalinan. Buka pautan dan salin daripada bar alamat.",
  anyoneWithTheLinkCanViewExpensesBalancesAndSettlementsWithoutSigningInButCannotEdit:
    "Sesiapa yang mempunyai pautan boleh melihat perbelanjaan, baki dan penyelesaian tanpa log masuk, tetapi tidak boleh menyunting.",
  readOnlyShareLinks: "Pautan perkongsian baca sahaja",
  createReadOnlyLink: "Cipta pautan baca sahaja",
  anyoneWithTheLinkCanViewThisGroupsExpensesBalancesAndSettlementSuggestionsButCannotAddOrChangeData:
    "Sesiapa yang mempunyai pautan boleh melihat perbelanjaan, baki dan cadangan penyelesaian kumpulan ini, tetapi tidak boleh menambah atau mengubah data.",
  createAShareLink: "Cipta pautan perkongsian?",
  createShareLink: "Cipta pautan perkongsian",
  revoked: "Dibatalkan",
  active: "Aktif",
  openLink: "Buka pautan",
  copy: "Salin",
  revokeLink: "Batalkan pautan",
  afterRevocationTheOldLinkWillImmediatelyStopWorking:
    "Selepas pembatalan, pautan lama akan berhenti berfungsi serta-merta.",
  shareLinkRevoked: "Pautan perkongsian dibatalkan",
  revokeThisShareLink: "Batalkan pautan perkongsian ini?",
  revoke: "Batalkan",
  noShareLinksYet: "Belum ada pautan perkongsian.",
  collaboratorAdded: "Rakan kerjasama ditambah",
  unableToAddCollaborator: "Tidak dapat menambah rakan kerjasama",
  collaboratorsMustBeExistingUsersTheyCanManageExpensesAndParticipantsButNotOwnerSettings:
    "Rakan kerjasama mestilah pengguna sedia ada. Mereka boleh mengurus perbelanjaan dan peserta, tetapi bukan tetapan pemilik.",
  existingUsersUsername: "Nama pengguna sedia ada",
  addCollaborator: "Tambah rakan kerjasama",
  removeName: (values: MessageValues) => interpolate("Buang {name}", values),
  thisAccountWillNoLongerBeAbleToManageTheGroupExistingExpenseDataWillRemain:
    "Akaun ini tidak lagi dapat mengurus kumpulan. Data perbelanjaan sedia ada akan dikekalkan.",
  collaboratorRemoved: "Rakan kerjasama dibuang",
  removeCollaborator: "Buang rakan kerjasama?",
  remove: "Buang",
  dataAndExport: "Data dan eksport",
  csvPrintBackupAndRestore: "CSV, cetak, sandaran dan pemulihan",
  exportingDoesNotChangeGroupData: "Eksport tidak mengubah data kumpulan.",
  exportAndPrint: "Eksport dan cetak",
  expenseCsvExported: "CSV perbelanjaan dieksport",
  exportExpenseCsv: "Eksport CSV perbelanjaan",
  settlementCsvExported: "CSV penyelesaian dieksport",
  exportSettlementCsv: "Eksport CSV penyelesaian",
  print: "Cetak",
  completeBackupDownloaded: "Sandaran lengkap dimuat turun",
  downloadFailed: "Muat turun gagal",
  downloadCompleteBackup: "Muat turun sandaran lengkap",
  expenseCsvImported: "CSV perbelanjaan diimport",
  importFailed: "Import gagal",
  allRowsAreCheckedFirstNoDataIsWrittenIfAnyRowHasAnError:
    "Semua baris disemak dahulu. Tiada data ditulis jika mana-mana baris mempunyai ralat.",
  importExpenseCsv: "Import CSV perbelanjaan",
  chooseCsv: "Pilih CSV",
  importPreview: "Pratonton import",
  rowsRowsCanBeImportedErrorsErrors: (values: MessageValues) =>
    interpolate("{rows} baris boleh diimport; {errors} ralat.", values),
  rowRowMessage: (values: MessageValues) =>
    interpolate("Baris {row}: {message}", values),
  importCountExpenses: (values: MessageValues) =>
    interpolate("Import {count} perbelanjaan", values),
  thisWillAddCountExpensesAtOnceAndRecalculateBalances: (
    values: MessageValues,
  ) =>
    interpolate(
      "Ini akan menambah {count} perbelanjaan serentak dan mengira semula baki.",
      values,
    ),
  applyCsvImport: "Gunakan import CSV?",
  applyImport: "Gunakan import",
  invalidBackupFormat: "Format sandaran tidak sah",
  backupRestoredAsANewGroup: "Sandaran dipulihkan sebagai kumpulan baharu",
  restoreFailed: "Pemulihan gagal",
  restoringCreatesANewGroupAndDoesNotOverwriteCurrentData:
    "Pemulihan mencipta kumpulan baharu dan tidak menulis ganti data semasa.",
  restoreJsonBackup: "Pulihkan sandaran JSON",
  chooseJsonBackup: "Pilih sandaran JSON",
  restorePreviewName: (values: MessageValues) =>
    interpolate("Pratonton pemulihan: {name}", values),
  peoplePeopleExpensesExpensesPaymentsPaymentsBaseCurrency: (
    values: MessageValues,
  ) =>
    interpolate(
      "{people} orang · {expenses} perbelanjaan · {payments} bayaran · asas {currency}",
      values,
    ),
  createNewGroup: "Cipta kumpulan baharu",
  aNewGroupNamedNameWillBeCreatedWithoutChangingExistingGroups: (
    values: MessageValues,
  ) =>
    interpolate(
      "Kumpulan baharu bernama “{name}” akan dicipta tanpa mengubah kumpulan sedia ada.",
      values,
    ),
  restoreThisBackup: "Pulihkan sandaran ini?",
  createNewGroup2: "Cipta kumpulan baharu",
  copyGroup: "Gandakan kumpulan",
  copyThisGroup: "Gandakan kumpulan ini?",
  copyGroupDescription:
    "Salin orang, mata wang asas dan kadar tersuai ke kumpulan baharu. Perbelanjaan, bayaran penyelesaian, rakan kerjasama dan pautan perkongsian tidak disalin. Kumpulan asal tidak berubah.",
  groupCopied: "Kumpulan digandakan",
  groupPreferences: "Keutamaan kumpulan",
  changingTheBaseCurrencyRecalculatesDisplayedAmountsAndClearsCustomExchangeRates:
    "Menukar mata wang asas akan mengira semula amaun yang dipaparkan dan memadam kadar pertukaran tersuai.",
  nameAndBaseCurrency: "Nama dan mata wang asas",
  totalSpendingWillDisplayAsAmountBalancesAndSettlementsBelowWillBeConverted: (
    values: MessageValues,
  ) =>
    interpolate(
      "Jumlah perbelanjaan akan dipaparkan sebagai {amount}; baki dan penyelesaian di bawah akan ditukar.",
      values,
    ),
  expectCountSettlementSuggestionsCustomRatesWillResetToBuiltInValues: (
    values: MessageValues,
  ) =>
    interpolate(
      "Jangkakan {count} cadangan penyelesaian; kadar tersuai akan ditetapkan semula kepada kadar lalai Bank of Taiwan.",
      values,
    ),
  cancelChanges: "Batalkan perubahan",
  applyGroupPreferences: "Gunakan keutamaan kumpulan",
  changeTheBaseCurrencyToCurrencyRecalculateAllResultsAndClearCustomRates: (
    values: MessageValues,
  ) =>
    interpolate(
      "Tukar mata wang asas kepada {currency}, kira semula semua hasil dan padam kadar tersuai.",
      values,
    ),
  renameTheGroupToName: (values: MessageValues) =>
    interpolate("Namakan semula kumpulan kepada “{name}”.", values),
  applyTheseChanges: "Gunakan perubahan ini?",
  applyChanges: "Gunakan perubahan",
  groupPreferencesApplied: "Keutamaan kumpulan digunakan",
  saveFailed: "Penyimpanan gagal",
  customExchangeRatesApplied: "Kadar pertukaran tersuai digunakan",
  unableToSaveExchangeRates: "Tidak dapat menyimpan kadar pertukaran",
  currencyConversion: "Penukaran mata wang",
  countCustomRates: (values: MessageValues) =>
    interpolate("{count} kadar tersuai", values),
  setHowMuch1UnitOfEachCurrencyEqualsInCurrencyLeaveBlankToUseTheBuiltInFixedRate:
    (values: MessageValues) =>
      interpolate(
        "Tetapkan nilai 1 unit setiap mata wang dalam {currency}. Kadar yang tidak ditetapkan menggunakan kadar pertengahan semerta Bank of Taiwan secara automatik.",
        values,
      ),
  customExchangeRates: "Kadar pertukaran tersuai",
  bankOfTaiwanSpotMidRateDescription:
    "Perbelanjaan baharu tanpa kadar tersuai menggunakan kadar pertengahan semerta Bank of Taiwan dan menyimpan sebut harga itu. Memadam kadar tersuai mempengaruhi perbelanjaan akan datang; bayaran masih menggunakan kadar semasa.",
  loadBankOfTaiwanSpotMidRates: "Muatkan kadar lalai Bank of Taiwan",
  loadingBankExchangeRates: "Memuatkan kadar pertukaran bank…",
  bankOfTaiwanSpotMidRatesLoadedAtTime: (values: MessageValues) =>
    interpolate(
      "Kadar pertengahan semerta Bank of Taiwan dimuatkan ({time}).",
      values,
    ),
  bankOfTaiwanDefaultRatesApplied: "Kadar lalai Bank of Taiwan dipulihkan",
  unableToLoadBankExchangeRates:
    "Kadar pertukaran bank tidak tersedia pada masa ini. Cuba lagi kemudian.",
  conversionPreview: "Pratonton penukaran",
  totalSpendingAmountCountSettlementSuggestions: (values: MessageValues) =>
    interpolate(
      "Jumlah perbelanjaan: {amount} · {count} cadangan penyelesaian.",
      values,
    ),
  applyRates: "Gunakan kadar",
  allTotalsBalancesAndSettlementSuggestionsWillBeRecalculatedWithTheseRates:
    "Perbelanjaan sedia ada mengekalkan kadarnya. Perbelanjaan baharu atau yang dinilai semula serta bayaran sedia ada menggunakan kadar yang dikemas kini.",
  applyCustomExchangeRates: "Gunakan kadar pertukaran tersuai?",
  restoreBankOfTaiwanDefaultRates: "Pulihkan kadar lalai Bank of Taiwan?",
  apiWriteSettings: "Akses tulis API",
  apiWritesAllowed: "Dibenarkan",
  apiWritesBlocked: "Tidak dibenarkan",
  apiWriteSettingsDescription:
    "Token API dan CLI tidak boleh mengubah kumpulan ini secara lalai. Apabila diaktifkan, ahli dengan token API boleh menyunting mengikut kebenaran mereka. Tindakan pelayar tidak terjejas.",
  allowApiWrites: "Benarkan perubahan melalui token API",
  apiWriteSettingSaved: "Akses tulis API dikemas kini",
  groupLifecycle: "Kitar hayat kumpulan",
  archivedReadOnly: "Diarkibkan · baca sahaja",
  active2: "Aktif",
  afterRestoringDataCanBeAddedAndChangedAgain:
    "Selepas pemulihan, data boleh ditambah dan diubah semula.",
  archivingPreservesAllDataButMakesTheGroupReadOnly:
    "Pengarkiban mengekalkan semua data tetapi menjadikan kumpulan baca sahaja.",
  restoreGroup: "Pulihkan kumpulan",
  archiveGroup: "Arkibkan kumpulan",
  afterRestoringTheOwnerAndCollaboratorsCanEditDataAgain:
    "Selepas pemulihan, pemilik dan rakan kerjasama boleh menyunting data semula.",
  expensesPeopleAndPaymentRecordsArePreservedAndCannotBeChangedWhileArchived:
    "Perbelanjaan, orang dan rekod bayaran dikekalkan dan tidak boleh diubah semasa diarkibkan.",
  groupRestored: "Kumpulan dipulihkan",
  groupArchived: "Kumpulan diarkibkan",
  restoreThisGroup: "Pulihkan kumpulan ini?",
  archiveThisGroup: "Arkibkan kumpulan ini?",
  thisPermanentlyDeletesAllPeopleExpensesReceiptsAndSettlementRecordsAndCannotBeUndone:
    "Ini memadam semua orang, perbelanjaan, resit dan rekod penyelesaian secara kekal dan tidak boleh dibuat asal.",
  deleteGroup: "Padam kumpulan",
  enterNameToConfirm: (values: MessageValues) =>
    interpolate("Masukkan “{name}” untuk mengesahkan", values),
  permanentlyDeleteName: (values: MessageValues) =>
    interpolate("Padam “{name}” secara kekal", values),
  thisCannotBeUndoneCancelingMakesNoChanges:
    "Tindakan ini tidak boleh dibuat asal. Pembatalan tidak membuat sebarang perubahan.",
  permanentlyDeleteThisGroup: "Padam kumpulan ini secara kekal?",
  permanentlyDeleteGroup: "Padam kumpulan secara kekal",
  groupDeleted: "Kumpulan dipadam",
  readOnlyShare: "Perkongsian baca sahaja",
  youCanViewExpensesBalancesAndSettlementSuggestionsButCannotEditData:
    "Anda boleh melihat perbelanjaan, baki dan cadangan penyelesaian, tetapi tidak boleh menyunting data.",
  completeExpenseHistory: "Sejarah perbelanjaan lengkap",
  manageGroupSettings: "Urus tetapan kumpulan",
};
