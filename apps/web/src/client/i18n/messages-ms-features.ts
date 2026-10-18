import { interpolate, type MessageValues } from "./message-types.js";

export const msFeatures = {
  browserExpenseDefaults: "Tetapan lalai perbelanjaan dalam pelayar ini",
  browserExpenseDefaultsHelp:
    "Padam hanya tetapan lalai mata wang dan pembahagian akaun ini untuk kumpulan ini. Akaun, log masuk dan kebenaran tidak berubah.",
  clearPersonalPreferences:
    "Padam tetapan lalai perbelanjaan untuk kumpulan ini",
  expenseDefaultsCleared:
    "Tetapan lalai perbelanjaan untuk kumpulan ini telah dipadam.",
  personalPreferencesChanged:
    "Tetapan pembahagian anda tidak lagi tersedia. Tetapan lalai yang sah sedang digunakan; pilih semula.",
  personalStorageFailed:
    "Tetapan lalai perbelanjaan tidak dapat disimpan. Tetapan semasa masih tersedia tetapi mungkin hilang apabila anda membuka semula halaman.",
  rememberExpenseDefaults: "Ingat tetapan mata wang dan pembahagian",
  expenseDefaultsRemembered:
    "Tetapan mata wang dan pembahagian telah disimpan untuk kumpulan ini.",
  deleteExpense: "Padam perbelanjaan",
  copyExpense: "Salin sebagai perbelanjaan baharu",
  copyExpenseNamed: (values: MessageValues) =>
    interpolate("Salin {name} sebagai perbelanjaan baharu", values),
  memberAccounts: "Akaun ahli",
  accountPaid: "Dibayar",
  accountShared: "Bahagian",
  accountBalance: "Untuk diterima / dibayar",
  accountReceivable: "Untuk diterima",
  accountPayable: "Untuk dibayar",
  accountSettled: "Selesai",
  accountPaidHelp:
    "Dibayar ialah amaun yang dibayar kepada kedai dan penyedia perbelanjaan lain. Ia tidak termasuk bayaran penyelesaian antara ahli.",
  accountTotalsHelp:
    "Bahagian ialah amaun perbelanjaan yang ditanggung oleh setiap ahli. Baki juga merangkumi bayaran yang direkodkan dan pelarasan wakil. Draf yang belum disegerakkan tidak termasuk.",
  accountDetails: "Lihat butiran",
  accountPaidExpenses: "Perbelanjaan yang dibayar untuk kumpulan",
  accountSharedExpenses: "Perbelanjaan bersama",
  accountExpenseTotal: "Jumlah penuh perbelanjaan",
  accountPayments: "Bayaran dihantar / diterima",
  accountPaymentSent: "Dihantar",
  accountPaymentReceived: "Diterima",
  accountAdjustments: "Pelarasan wakil",
  accountDetailsUnavailable:
    "Butiran bayaran tidak disertakan dalam perkongsian ini. Baki menggunakan hasil pengiraan kumpulan.",
  accountRepresentedBy: (values: MessageValues) =>
    interpolate(
      "{name} membuat penyelesaian bagi ahli ini. Baki sifar tidak bermakna ahli ini telah membuat bayaran.",
      values,
    ),
  visaSettlementTitle: "Penyelesaian berdasarkan Visa",
  visaSettlementCurrency: "Mata wang penyelesaian",
  visaSettlementEnable:
    "Tukar semua perbelanjaan menggunakan kadar Visa mengikut tarikh dan selesaikan dalam mata wang yang dipilih",
  visaSettlementHelp:
    "Dimatikan secara lalai. Amaun asal tidak berubah. Apabila diaktifkan, kadar Visa disimpan untuk setiap tarikh perbelanjaan dan mata wang pilihan anda digunakan untuk baki dan penyelesaian. Terpakai kepada semua perbelanjaan, termasuk tunai, tanpa fi bank. Kadar Visa ialah anggaran; bil kad mungkin berbeza. Bayaran sedia ada mesti menggunakan mata wang yang dipilih sebelum pengaktifan atau penukaran mata wang.",
  visaSettlementSaved: "Tetapan penyelesaian Visa disimpan",
  visaSettlementOn: (values: MessageValues) =>
    interpolate("Aktif · {currency}", values),
  visaSettlementOff: "Tidak aktif",
  visaRateLabel: "Visa",
  visaSettingInvalid: "Tetapan penyelesaian Visa tidak sah",
  visaIncompatiblePayments:
    "Rekod bayaran sedia ada mesti menggunakan mata wang penyelesaian yang dipilih",
  visaSettingUnavailable:
    "Kadar Visa tidak tersedia. Tetapan tidak diubah. Cuba lagi kemudian.",
  visaPaymentCurrency:
    "Bayaran penyelesaian Visa mesti menggunakan mata wang yang dipilih",
  visaRateUnavailable: (values: MessageValues) =>
    interpolate(
      "Kadar Visa {currency}/{target} untuk {date} tidak tersedia. Cuba lagi kemudian.",
      values,
    ),
  offlineQueueBanner:
    "Luar talian: data yang dimuatkan masih tersedia. Perbelanjaan baharu boleh disimpan pada peranti ini; suntingan lain memerlukan sambungan.",
  queueSave: "Simpan pada peranti ini",
  queueSaved:
    "Disimpan pada peranti ini. Belum termasuk dalam baki; kadar pertukaran ditetapkan semasa penyegerakan.",
  queueStorageError:
    "Tidak dapat menyimpan pada peranti ini. Biarkan halaman ini terbuka dan cuba lagi.",
  queueTitle: "Perbelanjaan belum disegerakkan",
  queueNotice:
    "Hanya pada peranti ini. Tidak termasuk dalam baki. Kadar pertukaran ditetapkan semasa penyegerakan. Memadam data pelayar akan menghilangkan draf ini.",
  queuePending: "Menunggu penyegerakan",
  queueAttempted:
    "Penyegerakan menunggu pengesahan; jangan ubah permintaan asal",
  queueConflict:
    "Penyegerakan dihentikan. Semak akses dan peserta sebelum mencuba semula; permintaan asal dikekalkan.",
  queueInvalid: "Belum direkodkan. Sunting draf dan cuba semula.",
  queueEdit: "Sunting draf",
  queueRetry: "Cuba semula permintaan asal",
  queueDelete: "Padam draf setempat",
  queueDeleteConfirm:
    "Padam draf setempat ini? Permintaan yang telah dihantar mungkin sudah direkodkan pada pelayan. Semak kumpulan dahulu.",
  queueCount: (values: MessageValues) =>
    interpolate(
      "{count} perbelanjaan belum disegerakkan pada peranti ini",
      values,
    ),
  queueSyncPricing:
    "Pratonton hanya menunjukkan mata wang asal. Pelayan menetapkan kadar pertukaran semasa penyegerakan.",
  queueOrphanTitle: "Draf daripada kumpulan yang tidak tersedia",
  queueOrphanNotice:
    "Kumpulan ini tidak lagi boleh diakses. Permintaan yang dihantar mungkin sudah direkodkan; semak sebelum memadam salinan setempatnya.",
  queueOrphanTrip: (values: MessageValues) =>
    interpolate("ID kumpulan: {id}", values),
  accountSettings: "Tetapan akaun",
  manageYourUsernameAndPasskeys:
    "Urus penampilan, bahasa, nama pengguna, Passkey dan token API anda.",
  appearance: "Penampilan",
  chooseHowOtterLooksOnThisBrowser:
    "Pilih penampilan Otter. Perubahan digunakan serta-merta dan disimpan dalam pelayar ini.",
  colorTheme: "Tema warna",
  forestTheme: "Hutan",
  oceanTheme: "Lautan",
  lavenderTheme: "Lavender",
  sunsetTheme: "Matahari terbenam",
  roseTheme: "Mawar",
  displayMode: "Mod paparan",
  systemMode: "Sistem",
  lightMode: "Cerah",
  darkMode: "Gelap",
  useTheNewUsernameTheNextTimeYouSignInYourCurrentSessionWillContinue:
    "Gunakan nama pengguna baharu apabila anda log masuk pada masa akan datang. Sesi semasa anda akan diteruskan.",
  passkeys: "Passkey",
  useAPasskeyToSignInWithoutYourPassword:
    "Gunakan kaedah buka kunci peranti anda untuk log masuk tanpa memasukkan kata laluan.",
  unableToLoadPasskeys: "Tidak dapat memuatkan Passkey",
  unableToAddPasskey:
    "Tidak dapat menambah Passkey. Jika anda membatalkan, cuba lagi.",
  unableToRemovePasskey: "Tidak dapat membuang Passkey",
  passkeyAdded: "Passkey ditambah",
  passkeyRemoved: "Passkey dibuang",
  passkeyNumber: (values: MessageValues) =>
    interpolate("Passkey {number}", values),
  addedOnDate: (values: MessageValues) =>
    interpolate("Ditambah pada {date}", values),
  removePasskeyNumber: (values: MessageValues) =>
    interpolate("Buang Passkey {number}", values),
  noPasskeysAdded: "Belum ada Passkey ditambah.",
  addingPasskey: "Menambah Passkey…",
  addPasskey: "Tambah Passkey",
  thisBrowserDoesNotSupportPasskeys: "Pelayar ini tidak menyokong Passkey.",
  apiTokens: "Token API",
  useApiTokensWithTheOtterCli:
    "Cipta token Bearer untuk Otter CLI atau alat automasi.",
  loadingApiTokens: "Memuatkan token API…",
  unableToLoadApiTokens: "Tidak dapat memuatkan token API",
  unableToCreateApiToken: "Tidak dapat mencipta token API",
  apiTokenCreationUncertain:
    "Hasil permintaan token tidak diketahui. Cuba semula permintaan ini sebelum mencipta token lain.",
  retryApiTokenCreation: "Cuba semula penciptaan token",
  unableToRevokeApiToken: "Tidak dapat membatalkan token API",
  unableToCopyApiToken: "Tidak dapat menyalin token API",
  apiTokenRevoked: "Token API dibatalkan",
  apiTokenCopied: "Token API disalin",
  enterATokenName: "Masukkan nama token",
  newApiToken: "Token API baharu",
  copyYourApiTokenNow: "Salin token API anda sekarang",
  apiTokenShownOnce:
    "Token ini dipaparkan sekali sahaja. Anda tidak boleh melihatnya semula selepas meninggalkan halaman ini.",
  copyToken: "Salin token",
  done: "Selesai",
  tokenName: "Nama token",
  tokenNameExample: "Contohnya: Automasi perjalanan",
  creatingApiToken: "Mencipta token…",
  createApiToken: "Cipta token API",
  apiTokenDates: (values: MessageValues) =>
    interpolate("Dicipta {created} · Tamat tempoh {expires}", values),
  revokeNamedApiToken: (values: MessageValues) =>
    interpolate('Batalkan token API "{name}"', values),
  noActiveApiTokens: "Tiada token API aktif.",
  apiTokensExpireAfter90Days:
    "Token tamat tempoh selepas 90 hari. Untuk menggunakannya dengan CLI, tetapkan sebagai",
  welcomeBackEyebrow: "SELAMAT KEMBALI",
  startNewJourneyEyebrow: "MULAKAN PERJALANAN BAHARU",
  parchmentTheme: "Kertas kulit",
  expenseTotalLabel: "Jumlah",
  expenseSplitSection: "Bahagikan antara peserta",
  expenseSplitHelp:
    "Pilih siapa yang akan berkongsi perbelanjaan ini, pilih kaedah dan lihat hasilnya.",
  expenseTagPlaceholder: "Tambah tag…",
  addShort: "Tambah",
  settingsShort: "Tetapan",
  close: "Tutup",
  groupDetails: "Butiran kumpulan",
  filters: "Penapis",
  viewAll: "Lihat semua",
  personLabel: "Orang",
  preferencesLabel: "Keutamaan",
  profileLabel: "Profil",
  securityLabel: "Keselamatan",
  backToGroups: "Kembali ke kumpulan",
  createdLabel: "Dicipta",
  statusLabel: "Status",
  peopleDeletionHelp:
    "Orang yang digunakan dalam lejar tidak boleh dipadam. Semak sekatan individu dengan butang maklumat, atau gabungkan orang yang berganda.",
  personRestriction: (values: MessageValues) =>
    interpolate("Sekatan pemadaman untuk {name}", values),
  representsPeople: (values: MessageValues) =>
    interpolate("Mewakili {names}", values),
  expenseRateForName: (values: MessageValues) =>
    interpolate("Lihat amaun dan kadar pertukaran untuk {name}", values),
  rateUnavailable: "Kadar tidak tersedia (data versi lama)",
  expenseHistory: "Sejarah perubahan",
  expenseHistoryDescription:
    "Suntingan, pemadaman dan pemulihan perbelanjaan; bukan sejarah bayaran atau baki terdahulu.",
  expenseHistoryEmpty: "Tiada perubahan direkodkan",
  expenseHistoryMore: "Muatkan lebih banyak perubahan",
  expenseHistoryCreated: "Dicipta",
  expenseHistoryUpdated: "Dikemas kini",
  expenseHistoryDeleted: "Dipadam",
  expenseHistoryRestored: "Dipulihkan",
  expenseHistoryBaseline: "Gambaran awal",
  expenseHistorySystem: "Sistem",
  expenseHistoryBaselineNotice:
    "Keadaan semasa sejarah diaktifkan; perubahan terdahulu dan pengarang asal tidak diketahui.",
  expenseHistoryReceiptNotice:
    "Hanya metadata resit dikekalkan. Imej terdahulu tidak tersedia.",
  expenseHistoryShares: "Amaun bahagian",
  expenseHistoryRate: "Gambaran kadar pertukaran",
  expenseHistoryRateBank: "Bank of Taiwan",
  expenseHistoryRateCustom: "Tersuai untuk kumpulan",
  expenseHistoryRateFixed: "Kadar tetap terbina dalam",
  expenseHistoryRateLegacy: "Anggaran versi lama",
  expenseHistoryRateTimeUnavailable: "Masa sebut harga tidak tersedia",
  expenseHistoryRateUnavailable: "Versi lama: tiada kadar direkodkan",
  expenseHistoryBefore: "Sebelum",
  expenseHistoryAfter: "Selepas",
  expenseHistorySourceExpense: "Tindakan perbelanjaan",
  expenseHistorySourceCsv: "Import CSV",
  expenseHistorySourceRestore: "Pemulihan sandaran",
  expenseHistorySourceMerge: "Penggabungan peserta",
  expenseHistorySourceReceipt: "Tindakan resit",
  expenseHistorySourceSeed: "Data ujian pembangunan",
  expenseHistorySourceMigration: "Migrasi",
  expenseHistorySourceVersionRestore: "Pemulihan versi",
  expenseRestoreVersion: (values: MessageValues) =>
    interpolate("Pulihkan v{version}", values),
  expenseRestoreTitle: "Pulihkan versi perbelanjaan",
  expenseRestoreDescription:
    "Semak perbelanjaan semasa dan versi yang akan dipulihkan. Pemulihan menambah versi baharu; sejarah selepas versi itu masih tersedia.",
  expenseRestoreKeepsReceipt:
    "Resit semasa kekal dilampirkan. Imej resit lama tidak dipulihkan.",
  expenseRestoreNoReceipt:
    "Perbelanjaan yang dipadam dikembalikan tanpa resit. Imej resit lama tidak dipulihkan.",
  expenseRestoreMissingPerson:
    "Versi ini merujuk kepada seseorang yang tidak lagi berada dalam kumpulan. Sunting perbelanjaan secara manual.",
  expenseRestoreUnavailable:
    "Perbelanjaan ini tidak dapat dipulihkan. Muat semula dan cuba lagi.",
  expenseRestoreConflict:
    "Perbelanjaan telah berubah. Semak keadaan terkini sebelum mengesahkan semula.",
  expenseRestoreConfirm: "Pulihkan versi ini",
  expenseRestored: "Versi perbelanjaan dipulihkan",
  expenseConflictParticipantsChanged:
    "Peserta telah berubah. Pengesahan menggantikan pilihan pembayar atau pembahagian yang tidak tersedia dengan tetapan perbelanjaan terkini. Medan draf lain dikekalkan; semak amaun bahagian sebelum menyimpan.",
  expenseVersionConflict:
    "Perbelanjaan ini telah berubah. Semak versi terkini sebelum mengesahkan semula.",
  expenseVersionMissing:
    "Sertakan versi perbelanjaan. Muat semula dan cuba lagi.",
  expenseVersionInvalid: "Versi perbelanjaan tidak sah",
  reviewLatestExpense: "Semak perbelanjaan terkini",
  confirmLatestExpenseVersion:
    "Versi terkini telah disemak; kekalkan draf saya dan teruskan menyunting",
  latestExpenseMissing:
    "Perbelanjaan ini telah dipadam atau tidak lagi boleh diakses. Draf anda dikekalkan tetapi tidak dapat disimpan.",
  deleteExpenseHistoryRetained:
    "Perbelanjaan akan dikeluarkan daripada lejar semasa dan baki akan dikira semula. Sejarah perubahan dikekalkan; anda boleh memulihkan versi terdahulu tanpa imej resit lamanya.",
  expenseHistoryForName: (values: MessageValues) =>
    interpolate("Sejarah perubahan: {name}", values),
};
