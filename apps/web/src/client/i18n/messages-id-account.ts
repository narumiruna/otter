import { interpolate, type MessageValues } from "./message-types.js";

// Provisional machine-authored translations; fluent review is pending.
export const idAccount = {
  browserExpenseDefaults: "Pengaturan awal pengeluaran di browser ini",
  browserExpenseDefaultsHelp:
    "Hapus hanya pengaturan awal mata uang dan pembagian akun ini untuk grup ini. Akun, proses masuk, dan izin tidak berubah.",
  clearPersonalPreferences: "Hapus pengaturan awal pengeluaran grup ini",
  expenseDefaultsCleared: "Pengaturan awal pengeluaran grup ini dihapus.",
  personalPreferencesChanged:
    "Pengaturan pembagian Anda tidak lagi tersedia. Pengaturan awal yang valid digunakan; pilih kembali.",
  personalStorageFailed:
    "Pengaturan awal pengeluaran tidak dapat disimpan. Pengaturan saat ini masih tersedia, tetapi dapat hilang saat halaman dibuka kembali.",
  rememberExpenseDefaults: "Ingat pengaturan mata uang dan pembagian",
  expenseDefaultsRemembered:
    "Pengaturan mata uang dan pembagian disimpan untuk grup ini.",
  deleteExpense: "Hapus pengeluaran",
  copyExpense: "Salin sebagai pengeluaran baru",
  copyExpenseNamed: (values: MessageValues) =>
    interpolate("Salin {name} sebagai pengeluaran baru", values),
  memberAccounts: "Rincian keuangan anggota",
  accountPaid: "Dibayar",
  accountShared: "Bagian",
  accountBalance: "Harus diterima / dibayar",
  accountReceivable: "Harus diterima",
  accountPayable: "Harus dibayar",
  accountSettled: "Lunas",
  accountPaidHelp:
    "Dibayar adalah jumlah yang dibayarkan kepada toko dan penyedia pengeluaran lainnya. Tidak termasuk pembayaran pelunasan antaranggota.",
  accountTotalsHelp:
    "Bagian adalah jumlah pengeluaran yang menjadi tanggungan tiap anggota. Saldo juga mencakup pembayaran tercatat dan penyesuaian perwakilan. Draf yang belum disinkronkan tidak disertakan.",
  accountDetails: "Lihat rincian",
  accountPaidExpenses: "Pengeluaran yang dibayarkan untuk grup",
  accountSharedExpenses: "Pengeluaran bersama",
  accountExpenseTotal: "Jumlah pengeluaran penuh",
  accountPayments: "Pembayaran dikirim / diterima",
  accountPaymentSent: "Dikirim",
  accountPaymentReceived: "Diterima",
  accountAdjustments: "Penyesuaian perwakilan",
  accountDetailsUnavailable:
    "Rincian pembayaran tidak disertakan dalam tampilan bersama ini. Saldo menggunakan hasil perhitungan grup.",
  accountRepresentedBy: (values: MessageValues) =>
    interpolate(
      "{name} melunasi untuk anggota ini. Saldo nol tidak berarti anggota ini telah melakukan pembayaran.",
      values,
    ),
  visaSettlementTitle: "Pelunasan berdasarkan Visa",
  visaSettlementCurrency: "Mata uang pelunasan",
  visaSettlementEnable:
    "Konversi semua pengeluaran dengan kurs Visa sesuai tanggal dan lunasi dalam mata uang yang dipilih",
  visaSettlementHelp:
    "Nonaktif secara bawaan. Jumlah asli tidak berubah. Jika diaktifkan, kurs Visa disimpan untuk setiap tanggal pengeluaran, dan mata uang pilihan Anda digunakan untuk saldo dan pelunasan. Berlaku untuk semua pengeluaran, termasuk tunai, tanpa biaya bank. Kurs Visa adalah perkiraan; tagihan kartu dapat berbeda. Pembayaran yang ada harus menggunakan mata uang pilihan sebelum mengaktifkan atau mengganti mata uang.",
  visaSettlementSaved: "Pengaturan pelunasan Visa disimpan",
  visaSettlementOn: (values: MessageValues) =>
    interpolate("Aktif · {currency}", values),
  visaSettlementOff: "Nonaktif",
  visaRateLabel: "Visa",
  visaSettingInvalid: "Pengaturan pelunasan Visa tidak valid",
  visaIncompatiblePayments:
    "Catatan pembayaran yang ada harus menggunakan mata uang pelunasan yang dipilih",
  visaSettingUnavailable:
    "Kurs Visa tidak tersedia. Pengaturan tidak diubah. Coba lagi nanti.",
  visaPaymentCurrency:
    "Pembayaran pelunasan Visa harus menggunakan mata uang yang dipilih",
  visaRateUnavailable: (values: MessageValues) =>
    interpolate(
      "Kurs Visa {currency}/{target} untuk {date} tidak tersedia. Coba lagi nanti.",
      values,
    ),
  offlineQueueBanner:
    "Offline: data yang telah dimuat tetap tersedia. Pengeluaran baru dapat disimpan di perangkat ini; perubahan lain memerlukan koneksi.",
  queueSave: "Simpan di perangkat ini",
  queueSaved:
    "Disimpan di perangkat ini. Belum disertakan dalam saldo; kurs ditetapkan saat sinkronisasi.",
  queueStorageError:
    "Tidak dapat menyimpan di perangkat ini. Biarkan halaman ini terbuka dan coba lagi.",
  queueTitle: "Pengeluaran belum disinkronkan",
  queueNotice:
    "Hanya di perangkat ini. Tidak disertakan dalam saldo. Kurs ditetapkan saat sinkronisasi. Menghapus data browser akan menghilangkan draf ini.",
  queuePending: "Menunggu sinkronisasi",
  queueAttempted:
    "Sinkronisasi menunggu konfirmasi; jangan ubah permintaan asli",
  queueConflict:
    "Sinkronisasi dihentikan. Periksa akses dan peserta sebelum mencoba lagi; permintaan asli disimpan.",
  queueInvalid: "Belum dicatat. Edit draf dan coba lagi.",
  queueEdit: "Edit draf",
  queueRetry: "Ulangi permintaan asli",
  queueDelete: "Hapus draf lokal",
  queueDeleteConfirm:
    "Hapus draf lokal ini? Permintaan yang sudah dikirim mungkin telah dicatat di server. Periksa grup terlebih dahulu.",
  queueCount: (values: MessageValues) =>
    interpolate(
      "{count} pengeluaran belum disinkronkan di perangkat ini",
      values,
    ),
  queueSyncPricing:
    "Pratinjau hanya menampilkan mata uang asli. Server menetapkan kurs saat sinkronisasi.",
  queueOrphanTitle: "Draf dari grup yang tidak tersedia",
  queueOrphanNotice:
    "Grup ini tidak lagi dapat diakses. Permintaan yang dikirim mungkin telah dicatat; periksa sebelum menghapus salinan lokalnya.",
  queueOrphanTrip: (values: MessageValues) =>
    interpolate("ID grup: {id}", values),
  accountSettings: "Pengaturan akun",
  manageYourUsernameAndPasskeys:
    "Kelola tampilan, bahasa, nama pengguna, Passkey, dan token API Anda.",
  appearance: "Tampilan",
  chooseHowOtterLooksOnThisBrowser:
    "Pilih tampilan Otter. Perubahan langsung berlaku dan disimpan di browser ini.",
  colorTheme: "Tema warna",
  forestTheme: "Hutan",
  oceanTheme: "Samudra",
  lavenderTheme: "Lavender",
  sunsetTheme: "Senja",
  roseTheme: "Mawar",
  displayMode: "Mode tampilan",
  systemMode: "Sistem",
  lightMode: "Terang",
  darkMode: "Gelap",
  useTheNewUsernameTheNextTimeYouSignInYourCurrentSessionWillContinue:
    "Gunakan nama pengguna baru saat masuk berikutnya. Sesi Anda saat ini tetap berlanjut.",
  passkeys: "Passkey",
  useAPasskeyToSignInWithoutYourPassword:
    "Gunakan fitur buka kunci perangkat untuk masuk tanpa memasukkan kata sandi.",
  unableToLoadPasskeys: "Tidak dapat memuat Passkey",
  unableToAddPasskey:
    "Tidak dapat menambahkan Passkey. Jika Anda membatalkannya, coba lagi.",
  unableToRemovePasskey: "Tidak dapat menghapus Passkey",
  passkeyAdded: "Passkey ditambahkan",
  passkeyRemoved: "Passkey dihapus",
  passkeyNumber: (values: MessageValues) =>
    interpolate("Passkey {number}", values),
  addedOnDate: (values: MessageValues) =>
    interpolate("Ditambahkan {date}", values),
  removePasskeyNumber: (values: MessageValues) =>
    interpolate("Hapus Passkey {number}", values),
  noPasskeysAdded: "Belum ada Passkey yang ditambahkan.",
  addingPasskey: "Menambahkan Passkey…",
  addPasskey: "Tambah Passkey",
  thisBrowserDoesNotSupportPasskeys: "Browser ini tidak mendukung Passkey.",
  apiTokens: "Token API",
  useApiTokensWithTheOtterCli:
    "Buat token Bearer untuk Otter CLI atau alat otomatisasi.",
  loadingApiTokens: "Memuat token API…",
  unableToLoadApiTokens: "Tidak dapat memuat token API",
  unableToCreateApiToken: "Tidak dapat membuat token API",
  apiTokenCreationUncertain:
    "Hasil permintaan token tidak diketahui. Ulangi permintaan ini sebelum membuat yang lain.",
  retryApiTokenCreation: "Coba lagi pembuatan token",
  unableToRevokeApiToken: "Tidak dapat mencabut token API",
  unableToCopyApiToken: "Tidak dapat menyalin token API",
  apiTokenRevoked: "Token API dicabut",
  apiTokenCopied: "Token API disalin",
  enterATokenName: "Masukkan nama token",
  newApiToken: "Token API baru",
  copyYourApiTokenNow: "Salin token API Anda sekarang",
  apiTokenShownOnce:
    "Token ini hanya ditampilkan sekali. Anda tidak dapat melihatnya lagi setelah meninggalkan halaman ini.",
  copyToken: "Salin token",
  done: "Selesai",
  tokenName: "Nama token",
  tokenNameExample: "Misalnya: Otomatisasi perjalanan",
  creatingApiToken: "Membuat token…",
  createApiToken: "Buat token API",
  apiTokenDates: (values: MessageValues) =>
    interpolate("Dibuat {created} · Kedaluwarsa {expires}", values),
  revokeNamedApiToken: (values: MessageValues) =>
    interpolate('Cabut token API "{name}"', values),
  noActiveApiTokens: "Tidak ada token API aktif.",
  apiTokensExpireAfter90Days:
    "Token kedaluwarsa setelah 90 hari. Untuk menggunakannya dengan CLI, tetapkan sebagai",
  welcomeBackEyebrow: "SELAMAT DATANG KEMBALI",
  startNewJourneyEyebrow: "MULAI PERJALANAN BARU",
  parchmentTheme: "Perkamen",
  expenseTotalLabel: "Total",
  expenseSplitSection: "Bagi antarorang",
  expenseSplitHelp:
    "Pilih siapa yang menanggung pengeluaran ini, pilih metode, dan lihat hasilnya.",
  expenseTagPlaceholder: "Tambah tag…",
  addShort: "Tambah",
  settingsShort: "Pengaturan",
  close: "Tutup",
  groupDetails: "Rincian grup",
  filters: "Filter",
  viewAll: "Lihat semua",
  personLabel: "Orang",
  preferencesLabel: "Preferensi",
  profileLabel: "Profil",
  securityLabel: "Keamanan",
  backToGroups: "Kembali ke grup",
  createdLabel: "Dibuat",
  statusLabel: "Status",
  peopleDeletionHelp:
    "Orang yang digunakan dalam buku catatan tidak dapat dihapus. Periksa batasan masing-masing dengan tombol info, atau gabungkan orang yang duplikat.",
  personRestriction: (values: MessageValues) =>
    interpolate("Batasan penghapusan untuk {name}", values),
  representsPeople: (values: MessageValues) =>
    interpolate("Mewakili {names}", values),
  expenseRateForName: (values: MessageValues) =>
    interpolate("Lihat jumlah dan kurs untuk {name}", values),
  rateUnavailable: "Kurs tidak tersedia (data versi lama)",
  expenseHistory: "Riwayat perubahan",
  expenseHistoryDescription:
    "Pengeditan, penghapusan, dan pemulihan pengeluaran; bukan riwayat pembayaran atau saldo sebelumnya.",
  expenseHistoryEmpty: "Tidak ada perubahan tercatat",
  expenseHistoryMore: "Muat perubahan lainnya",
  expenseHistoryCreated: "Dibuat",
  expenseHistoryUpdated: "Diperbarui",
  expenseHistoryDeleted: "Dihapus",
  expenseHistoryRestored: "Dipulihkan",
  expenseHistoryBaseline: "Kondisi awal",
  expenseHistorySystem: "Sistem",
  expenseHistoryBaselineNotice:
    "Kondisi saat riwayat diaktifkan; perubahan sebelumnya dan pembuat asli tidak diketahui.",
  expenseHistoryReceiptNotice:
    "Hanya metadata struk yang disimpan. Gambar sebelumnya tidak tersedia.",
  expenseHistoryShares: "Jumlah pembagian",
  expenseHistoryRate: "Rekaman kurs",
  expenseHistoryRateBank: "Bank of Taiwan",
  expenseHistoryRateCustom: "Khusus grup",
  expenseHistoryRateFixed: "Tetap bawaan",
  expenseHistoryRateLegacy: "Perkiraan versi lama",
  expenseHistoryRateTimeUnavailable: "Waktu kutipan kurs tidak tersedia",
  expenseHistoryRateUnavailable: "Versi lama: tidak ada kurs tercatat",
  expenseHistoryBefore: "Sebelum",
  expenseHistoryAfter: "Sesudah",
  expenseHistorySourceExpense: "Tindakan pengeluaran",
  expenseHistorySourceCsv: "Impor CSV",
  expenseHistorySourceRestore: "Pemulihan cadangan",
  expenseHistorySourceMerge: "Penggabungan peserta",
  expenseHistorySourceReceipt: "Tindakan struk",
  expenseHistorySourceSeed: "Data uji pengembangan",
  expenseHistorySourceMigration: "Migrasi",
  expenseHistorySourceVersionRestore: "Pemulihan versi",
  expenseRestoreVersion: (values: MessageValues) =>
    interpolate("Pulihkan v{version}", values),
  expenseRestoreTitle: "Pulihkan versi pengeluaran",
  expenseRestoreDescription:
    "Periksa pengeluaran saat ini dan versi yang akan dipulihkan. Pemulihan menambah versi baru; riwayat sesudahnya tetap tersedia.",
  expenseRestoreKeepsReceipt:
    "Struk saat ini tetap terlampir. Gambar struk lama tidak dipulihkan.",
  expenseRestoreNoReceipt:
    "Pengeluaran yang dihapus kembali tanpa struk. Gambar struk lama tidak dipulihkan.",
  expenseRestoreMissingPerson:
    "Versi ini merujuk pada seseorang yang tidak lagi ada di grup. Edit pengeluaran secara manual.",
  expenseRestoreUnavailable:
    "Pengeluaran ini tidak dapat dipulihkan. Muat ulang dan coba lagi.",
  expenseRestoreConflict:
    "Pengeluaran telah berubah. Periksa kondisi terbaru sebelum mengonfirmasi lagi.",
  expenseRestoreConfirm: "Pulihkan versi ini",
  expenseRestored: "Versi pengeluaran dipulihkan",
  expenseConflictParticipantsChanged:
    "Orang telah berubah. Konfirmasi akan mengganti pilihan pembayar atau pembagian yang tidak tersedia dengan pengaturan pengeluaran terbaru. Kolom draf lain tetap disimpan; periksa jumlah pembagian sebelum menyimpan.",
  expenseVersionConflict:
    "Pengeluaran ini telah berubah. Periksa versi terbaru sebelum mengonfirmasi lagi.",
  expenseVersionMissing: "Berikan versi pengeluaran. Muat ulang dan coba lagi.",
  expenseVersionInvalid: "Versi pengeluaran tidak valid",
  reviewLatestExpense: "Periksa pengeluaran terbaru",
  confirmLatestExpenseVersion:
    "Versi terbaru sudah diperiksa; simpan draf saya dan lanjutkan mengedit",
  latestExpenseMissing:
    "Pengeluaran ini dihapus atau tidak lagi dapat diakses. Draf Anda dipertahankan, tetapi tidak dapat disimpan.",
  deleteExpenseHistoryRetained:
    "Pengeluaran akan dihapus dari buku catatan saat ini dan saldo dihitung ulang. Riwayat perubahan dipertahankan; Anda dapat memulihkan versi sebelumnya tanpa gambar struk lamanya.",
  expenseHistoryForName: (values: MessageValues) =>
    interpolate("Riwayat perubahan: {name}", values),
};
