import {
  type CatalogShape,
  interpolate,
  type MessageValues,
} from "./message-types.js";
import { idAi } from "./messages-ai.js";
import { idAiAuth } from "./messages-ai-auth.js";
// Provisional machine-authored translations; fluent review is pending.
import { automaticRateMessages } from "./messages-automatic-rates.js";
import { idAccount } from "./messages-id-account.js";
import { idSettings } from "./messages-id-settings.js";
import type { zhTW } from "./messages-zh-tw.js";

export const id = {
  ...automaticRateMessages("id"),
  ...idAi,
  ...idAiAuth,
  backToExpenseList: "Kembali ke daftar pengeluaran",
  expenseEditorUnavailable:
    "Pengeluaran ini tidak dapat diedit. Pengeluaran mungkin tidak ada, atau grup hanya dapat dibaca atau telah diarsipkan.",
  ...idAccount,
  ...idSettings,
  usernameMustBe332LettersNumbersUnderscoresOrHyphens:
    "Nama pengguna harus terdiri dari 3–32 huruf, angka, garis bawah, atau tanda hubung",
  travelTogetherSplitExpensesEasily:
    "Bepergian bersama, bagi pengeluaran dengan mudah",
  goodFriendsSplitExpensesWell: "Teman baik membagi pengeluaran dengan baik.",
  skipToMainContent: "Langsung ke konten utama",
  otterHome: "Beranda otter",
  loading: "Memuat",
  unableToLoadOtter: "Tidak dapat memuat otter",
  loadingFailed: "Gagal memuat",
  reload: "Muat ulang",
  signedIn: "Berhasil masuk",
  accountCreated: "Akun dibuat",
  unableToAuthenticate: "Tidak dapat melakukan autentikasi",
  authenticationRequestsTooFrequentTryAgainLater:
    "Terlalu banyak permintaan autentikasi. Coba lagi nanti.",
  usernameUpdated: "Nama pengguna diperbarui",
  signedOut: "Berhasil keluar",
  signOutFailedMessage: (values: MessageValues) =>
    interpolate("Gagal keluar: {message}", values),
  pleaseTryAgainLater: "Silakan coba lagi nanti",
  signingOut: "Keluar…",
  signOut: "Keluar",
  authorizeCli: "Hubungkan CLI",
  authorizeCliDescription:
    "Masukkan kode perangkat yang ditampilkan di terminal Anda untuk menyetujui akses CLI ini ke data Otter Anda.",
  deviceCode: "Kode perangkat",
  checkDeviceCode: "Lanjutkan",
  checkingDeviceCode: "Memeriksa…",
  cliAccessRequest: "Permintaan akses CLI",
  cliAccessRequestedBy: "Diminta oleh",
  approveCliAccess: "Setujui akses",
  approvingCliAccess: "Menyetujui…",
  cliAccessApproved: "CLI terhubung",
  cliAccessApprovedDescription:
    "Anda dapat menutup halaman ini dan kembali ke terminal.",
  deviceCodeNotFoundOrExpired:
    "Kode perangkat tidak ditemukan atau kedaluwarsa",
  enterAValidDeviceCode: "Masukkan kode perangkat yang valid",
  youAreOfflineLoadedDataIsAvailableButEditingRequiresAConnection:
    "Anda sedang offline. Data yang telah dimuat tersedia, tetapi pengeditan memerlukan koneksi.",
  travelTogetherSplitWithEase: "Bepergian bersama, berbagi dengan mudah",
  spendYourTimeOnTheJourney: "Nikmati waktu dalam perjalanan,",
  andLeaveTheSplittingToOtter: "dan serahkan pembagiannya kepada otter.",
  fromDinnerToAFullTripRecordEverySharedExpenseAndKeepGroupFinancesSimpleAndClear:
    "Dari makan malam hingga seluruh perjalanan, catat setiap pengeluaran bersama agar keuangan grup tetap sederhana dan jelas.",
  splitExampleAWeekendTripDinnerCostsTwd1800ForThreePeopleOrTwd600Each:
    "Contoh pembagian: makan malam saat perjalanan akhir pekan berbiaya TWD 1.800 untuk tiga orang, atau TWD 600 per orang.",
  weekendTrip: "Perjalanan akhir pekan",
  splitExample: "Contoh pembagian",
  dinnerTogether: "Makan malam bersama",
  you: "Anda",
  a: "A",
  y: "Y",
  splitEquallyAmong3: "Bagi rata untuk 3 orang",
  each: "per orang",
  quicklyRecordSharedExpenses: "Catat pengeluaran bersama dengan cepat",
  seeWhoOwesAndWhoIsOwedAtAGlance:
    "Lihat sekilas siapa yang harus membayar dan menerima",
  settleUpWithClearSuggestions: "Lunasi dengan saran yang jelas",
  signIn: "Masuk",
  createAccount: "Buat akun",
  welcomeBackContinueYourJourney:
    "Selamat datang kembali. Lanjutkan perjalanan Anda.",
  createYourFirstGroupAndStartSplittingWithEase:
    "Buat grup pertama Anda dan mulai membagi pengeluaran dengan mudah.",
  username: "Nama pengguna",
  enterAUsername: "Masukkan nama pengguna",
  password: "Kata sandi",
  enterAPassword: "Masukkan kata sandi",
  developmentCredentialsHaveBeenFilledIn:
    "Kredensial pengembangan telah diisi.",
  signingIn: "Masuk…",
  or: "atau",
  signInWithAPasskey: "Masuk dengan Passkey",
  signingInWithAPasskey: "Masuk dengan Passkey…",
  unableToSignInWithAPasskey:
    "Tidak dapat masuk dengan Passkey. Coba lagi atau gunakan kata sandi Anda.",
  needAnAccount: "Perlu akun?",
  usernameIsNotCaseSensitive:
    "Nama pengguna tidak membedakan huruf besar dan kecil.",
  passwordMustBeAtLeast8Characters:
    "Kata sandi harus berisi minimal 8 karakter",
  passwordMustBeAtLeast8Characters2:
    "Kata sandi harus berisi minimal 8 karakter.",
  creating: "Membuat…",
  createAccountWithAPasskey: "Buat akun dengan Passkey",
  creatingAccountWithAPasskey: "Membuat akun dengan Passkey…",
  unableToCreateAccountWithAPasskey:
    "Tidak dapat membuat akun dengan Passkey. Coba lagi.",
  alreadyHaveAnAccount: "Sudah punya akun?",
  backToSignIn: "Kembali ke halaman masuk",
  expenseParticipantsDoNotNeedAccountsToBeIncludedInAGroup:
    "Peserta pengeluaran tidak memerlukan akun untuk disertakan dalam grup.",
  changeNameSUsername: (values: MessageValues) =>
    interpolate("Ubah nama pengguna {name}", values),
  nameSAccountMenu: (values: MessageValues) =>
    interpolate("Menu akun {name}", values),
  unableToUpdateUsername: "Tidak dapat memperbarui nama pengguna",
  changeUsername: "Ubah nama pengguna",
  passkeyRegistrationRequestsTooFrequent:
    "Terlalu banyak permintaan pendaftaran Passkey. Coba lagi nanti.",
  passkeyRegistrationResponseIsInvalid:
    "Respons pendaftaran Passkey tidak valid",
  passkeyRegistrationRequestExpired:
    "Permintaan pendaftaran Passkey kedaluwarsa. Coba lagi.",
  unableToVerifyPasskey: "Tidak dapat memverifikasi Passkey. Coba lagi.",
  passkeyAlreadyRegistered: "Passkey ini sudah terdaftar",
  passkeyNotFound: "Passkey tidak ditemukan",
  cannotRemoveOnlyPasskey:
    "Menghapus satu-satunya Passkey Anda akan menghilangkan akses ke akun",
  passkeyLoginResponseIsInvalid: "Respons masuk dengan Passkey tidak valid",
  passkeyLoginRequestExpired:
    "Permintaan masuk dengan Passkey kedaluwarsa. Coba lagi.",
  unableToUsePasskeyToSignIn: "Tidak dapat masuk dengan Passkey ini",
  cancel: "Batal",
  saving: "Menyimpan…",
  save: "Simpan",
  connectionFailedPleaseTryAgainLater:
    "Koneksi gagal. Silakan coba lagi nanti.",
  theServerReturnedAnInvalidResponse:
    "Server mengembalikan respons yang tidak valid.",
  everyone: "Semua orang",
  unknown: "Tidak diketahui",
  atLeastOneParticipantIsRequired: "Diperlukan minimal satu peserta",
  usedByAnExpense: "Digunakan dalam pengeluaran",
  youAreOfflineReconnectAndTryAgain:
    "Anda sedang offline. Hubungkan kembali dan coba lagi.",
  working: "Memproses…",
  unableToApplyChanges: "Tidak dapat menerapkan perubahan",
  applying: "Menerapkan…",
  noBalancesYet: "Belum ada saldo.",
  settled: "Lunas",
  getsBack: "Harus menerima",
  owes: "Harus membayar",
  newTaiwanDollar: "Dolar Taiwan baru",
  japaneseYen: "Yen Jepang",
  usDollar: "Dolar AS",
  euro: "Euro",
  singaporeDollar: "Dolar Singapura",
  poundSterling: "Pound sterling",
  australianDollar: "Dolar Australia",
  canadianDollar: "Dolar Kanada",
  southKoreanWon: "Won Korea Selatan",
  food: "Makanan",
  transport: "Transportasi",
  lodging: "Penginapan",
  tickets: "Tiket",
  shopping: "Belanja",
  other: "Lainnya",
  unsavedChangesWillBeLostDiscardTheDraft:
    "Perubahan yang belum disimpan akan hilang. Buang draf?",
  unableToSwitchGroups: "Tidak dapat beralih grup",
  loadingGroup: "Memuat grup",
  yourSelectionWillAppearAfterItsDataLoads:
    "Pilihan Anda akan muncul setelah datanya dimuat.",
  unableToLoadGroup: "Tidak dapat memuat grup",
  groupSwitcher: "Pemilih grup",
  groups: "Grup",
  countActiveGroups: (values: MessageValues) =>
    interpolate("{count} grup aktif", values),
  everyTripAddsUpToSomethingWonderful:
    "Setiap perjalanan menghadirkan kenangan indah.",
  recordSharedExpensesAndFocusOnThePeopleBesideYou:
    "Catat pengeluaran bersama dan fokus pada orang-orang di sisi Anda.",
  archivedAndReadOnlyDataIsPreservedTheOwnerCanRestoreItUnderMore:
    "Diarsipkan dan hanya baca. Data tetap disimpan; pemilik dapat memulihkannya di Pengaturan grup.",
  addTravelCompanionsFirst: "Tambahkan teman perjalanan terlebih dahulu",
  thereIsOnlyOneParticipantAddSomeoneToSplitWithBeforeRecordingTheFirstExpense:
    "Hanya ada satu peserta. Tambahkan orang untuk berbagi sebelum mencatat pengeluaran pertama.",
  addExpenseParticipant: "Tambah peserta pengeluaran",
  switchGroups: "Beralih grup",
  youWillLeaveTheCurrentGroupOnlyAfterTheNewOneLoads:
    "Anda baru akan meninggalkan grup saat ini setelah grup baru dimuat.",
  participantsPeopleExpensesExpensesCurrency: (values: MessageValues) =>
    interpolate(
      "{participants} orang · {expenses} pengeluaran · {currency}",
      values,
    ),
  archived: "Diarsipkan",
  everydayMomentsTogether: "Momen sehari-hari bersama",
  collaborator: "Kolaborator",
  owner: "Pemilik",
  baseCurrencyCurrency: (values: MessageValues) =>
    interpolate("Mata uang dasar {currency}", values),
  usingCustomExchangeRates: "Menggunakan kurs khusus",
  usingBankOfTaiwanExchangeRates: "Menggunakan kurs bawaan Bank of Taiwan",
  usingFixedFallbackRates:
    "Bank of Taiwan tidak tersedia; menggunakan kurs tetap cadangan",
  loadingGroup2: "Memuat grup…",
  people: "Orang",
  expenses: "Pengeluaran",
  base: "Dasar",
  overview: "Ringkasan",
  more: "Lainnya",
  groupWorkspace: "Ruang kerja grup",
  addExpense: "Tambah pengeluaran",
  archivedGroups: "Grup diarsipkan",
  unableToCreateGroup: "Tidak dapat membuat grup",
  createGroup: "Buat grup",
  addCompanionsAfterCreatingTheGroupThenRecordSharedExpenses:
    "Tambahkan teman setelah membuat grup, lalu catat pengeluaran bersama.",
  groupName: "Nama grup",
  fiveDaysInTokyo: "Lima hari di Tokyo",
  baseCurrency: "Mata uang dasar",
  createYourFirstGroup: "Buat grup pertama Anda",
  addATripOrEventGroupOrCreateOneFromAnExistingJsonBackup:
    "Tambahkan grup perjalanan atau acara, atau buat dari cadangan JSON yang ada.",
  groupExpenseSummary: "Ringkasan pengeluaran grup",
  totalSharedExpenses: "Total pengeluaran bersama",
  convertedToBaseCurrency: "Dikonversi ke mata uang dasar",
  outstanding: "Belum lunas",
  countSuggestedPaymentsToSettleUp: (values: MessageValues) =>
    interpolate("{count} pembayaran disarankan untuk pelunasan", values),
  nothingIsCurrentlyOutstanding: "Saat ini tidak ada yang belum lunas",
  settlementSuggestionsAppearAfterExpensesAreAdded:
    "Saran pelunasan muncul setelah pengeluaran ditambahkan",
  expenseRecords: "Catatan pengeluaran",
  sharedAmongCountPeople: (values: MessageValues) =>
    interpolate("Dibagi antara {count} orang", values),
  calculatedFromCurrentExpensesAndRecordedPayments:
    "Dihitung dari pengeluaran saat ini dan pembayaran tercatat.",
  settleUp: "Lunasi",
  countEntries: (values: MessageValues) => interpolate("{count} entri", values),
  entries: "entri",
  seePaymentsAndSharesAtAGlance: "Lihat pembayaran dan bagian sekilas.",
  balances: "Saldo",
  recentExpenses: "Pengeluaran terbaru",
  noExpensesYet: "Belum ada pengeluaran",
  thisGroupHasNotRecordedAnySharedExpenses:
    "Grup ini belum mencatat pengeluaran bersama.",
  recordTheFirstSharedExpense: "Catat pengeluaran bersama pertama",
  addThePeopleSplittingExpensesToCalculateEachBalance:
    "Tambahkan orang yang berbagi pengeluaran terlebih dahulu, lalu catat pengeluaran pertama Anda. Saldo dan saran pelunasan akan muncul secara otomatis.",
  balancesAndSettlementSuggestionsWillAppearHereAfterYouAddExpenses:
    "Saldo dan saran pelunasan akan muncul di sini setelah Anda menambahkan pengeluaran.",
  addPerson: "Tambah orang",
  managePeople: "Kelola orang",
  everythingIsSettled: "Semuanya sudah lunas",
  thereAreNoOutstandingPayments: "Tidak ada pembayaran yang belum lunas.",
  paymentRecorded: "Pembayaran dicatat",
  unableToRecordPayment: "Tidak dapat mencatat pembayaran",
  recordPayment: "Catat pembayaran",
  recordSettlementPayment: "Catat pembayaran pelunasan",
  fromPaysToTheFullSuggestedAmountIsPrefilled: (values: MessageValues) =>
    interpolate(
      "{from} membayar kepada {to}; seluruh jumlah yang disarankan telah diisi.",
      values,
    ),
  paymentAmountCurrency: (values: MessageValues) =>
    interpolate("Jumlah pembayaran ({currency})", values),
  enterAPaymentAmount: "Masukkan jumlah pembayaran",
  thePaymentMustBeGreaterThan0AndNoMoreThanTheSuggestedAmount:
    "Pembayaran harus lebih besar dari 0 dan tidak melebihi jumlah yang disarankan",
  expectedRemainder: "Perkiraan sisa: ",
  paymentDate: "Tanggal pembayaran",
  noteOptional: "Catatan (opsional)",
  recordPayment2: "Catat pembayaran",
  paymentHistory: "Riwayat pembayaran",
  dateFromPaidTo: (values: MessageValues) =>
    interpolate("{date} · {from} membayar kepada {to}", values),
  deletePayment: "Hapus pembayaran",
  remainingSettlementSuggestionsWillBeRecalculated:
    "Saran pelunasan yang tersisa akan dihitung ulang.",
  paymentDeleted: "Pembayaran dihapus",
  deleteFailed: "Gagal menghapus",
  deleteThisPayment: "Hapus pembayaran ini?",
  delete: "Hapus",
  datePaidByNameSplitWithSplit: (values: MessageValues) =>
    interpolate("{date} · dibayar oleh {name} · dibagi dengan {split}", values),
  dailySpending: "Pengeluaran harian",
  paidByPerson: "Dibayar per orang",
  byCategory: "Menurut kategori",
  spendingAnalysis: "Analisis pengeluaran",
  totalAmount: (values: MessageValues) => interpolate("Total {amount}", values),
  noDataYet: "Belum ada data.",
  showingShownOfTotalExpenses: (values: MessageValues) =>
    interpolate("Menampilkan {shown} dari {total} pengeluaran", values),
  searchDescriptions: "Cari deskripsi",
  searchExpenseDescriptions: "Cari deskripsi pengeluaran",
  sort: "Urutkan",
  groupBy: "Kelompokkan menurut",
  noGrouping: "Tanpa pengelompokan",
  groupByDate: "Kelompokkan menurut tanggal",
  groupByPayer: "Kelompokkan menurut pembayar",
  dateNewestFirst: "Tanggal: terbaru dahulu",
  dateOldestFirst: "Tanggal: terlama dahulu",
  amountHighToLow: "Jumlah: tertinggi ke terendah",
  amountLowToHigh: "Jumlah: terendah ke tertinggi",
  moreFilters: "Filter lainnya",
  countApplied: (values: MessageValues) =>
    interpolate("{count} diterapkan", values),
  datePersonCurrencyCategoryAndTag:
    "Tanggal, orang, mata uang, kategori, dan tag",
  from: "Dari",
  to: "Sampai",
  paidBy: "Dibayar oleh",
  splitWith: "Dibagi dengan",
  expenseParticipants: "Peserta pengeluaran",
  currency: "Mata uang",
  allCurrencies: "Semua mata uang",
  category: "Kategori",
  allCategories: "Semua kategori",
  tag: "Tag",
  exactTag: "Tag yang sama persis",
  applied: "Diterapkan:",
  clearAll: "Hapus semua",
  allPeople: "Semua orang",
  categoryValue: (values: MessageValues) =>
    interpolate("Kategori: {value}", values),
  currencyValue: (values: MessageValues) =>
    interpolate("Mata uang: {value}", values),
  fromValue: (values: MessageValues) => interpolate("Dari: {value}", values),
  toValue: (values: MessageValues) => interpolate("Sampai: {value}", values),
  tagValue: (values: MessageValues) => interpolate("Tag: {value}", values),
  aCompleteHistoryWillAppearHereAfterTheFirstSharedExpense:
    "Riwayat lengkap akan muncul di sini setelah pengeluaran bersama pertama.",
  recordFirstExpense: "Catat pengeluaran pertama",
  noMatchingExpenses: "Tidak ada pengeluaran yang cocok",
  adjustOrClearTheFiltersToSeeAllExpenses:
    "Sesuaikan atau hapus filter untuk melihat semua pengeluaran.",
  clearFilters: "Hapus filter",
  filteredExpenses: "Pengeluaran terfilter",
  allExpenses: "Semua pengeluaran",
  columns: "Kolom",
  chooseExpenseColumns: "Pilih kolom pengeluaran",
  expenseName: "Pengeluaran",
  splitParticipants: "Pembagian",
  receipt: "Struk",
  tags: "Tag",
  restoreDefaults: "Pulihkan pengaturan awal",
  actions: "Tindakan",
  expenseGroupSummary: (values: MessageValues) =>
    interpolate("{count} pengeluaran · {total}", values),
  countPeople: (values: MessageValues) => interpolate("{count} orang", values),
  viewReceiptForName: (values: MessageValues) =>
    interpolate("Lihat struk untuk {name}", values),
  receiptPreviewForName: (values: MessageValues) =>
    interpolate("Struk untuk “{name}”", values),
  receiptImageForName: (values: MessageValues) =>
    interpolate("Gambar struk untuk {name}", values),
  closeReceiptPreviewHint: "Klik gambar atau tekan Esc untuk menutup.",
  closeReceiptPreview: "Tutup pratinjau struk",
  openOriginalReceipt: "Buka gambar asli",
  moreActionsForName: (values: MessageValues) =>
    interpolate("Tindakan lainnya untuk {name}", values),
  datePaidByName: (values: MessageValues) =>
    interpolate("{date} · dibayar oleh {name}", values),
  splitWithSplit: (values: MessageValues) =>
    interpolate("Dibagi dengan {split}", values),
  edit: "Edit",
  receiptUploadFailed: "Gagal mengunggah struk",
  receiptUploaded: "Struk diunggah",
  uploading: "Mengunggah…",
  uploadReceipt: "Unggah struk",
  receiptFileRequirements: "JPEG, PNG, atau WebP · Maksimal 5 MB",
  selectReceiptPhoto: "Unggah foto",
  takeReceiptPhoto: "Ambil foto",
  removeReceiptPhoto: "Hapus foto",
  receiptOnlineOnly:
    "Foto memerlukan koneksi; draf offline tidak menyimpan foto. Hapus foto atau hubungkan kembali terlebih dahulu.",
  receiptFileTooLarge: "Ukuran foto harus 5 MB atau lebih kecil",
  expenseSavedReceiptFailed:
    "Pengeluaran dibuat, tetapi unggahan struk gagal. Coba lagi sekarang atau tambahkan nanti dari daftar pengeluaran.",
  retryReceiptUpload: "Coba unggah struk lagi",
  receiptAlreadyAttached:
    "Pengeluaran ini sudah memiliki struk. Periksa dari daftar pengeluaran; struk tidak akan ditimpa secara otomatis",
  uploadReceiptLater: "Unggah nanti",
  expenseCreationUncertain:
    "Kami tidak dapat memastikan apakah pengeluaran telah dibuat. Periksa daftar pengeluaran sebelum menambahkannya lagi; jangan langsung mencoba ulang.",
  viewReceipt: "Lihat struk",
  noReceipt: "Tidak ada struk",
  deleteReceipt: "Hapus struk",
  youCanUploadAnotherReceiptLaterTheExpenseWillNotBeDeleted:
    "Anda dapat mengunggah struk lain nanti; pengeluaran tidak akan dihapus.",
  receiptDeleted: "Struk dihapus",
  deleteThisReceipt: "Hapus struk ini?",
  deleteName: (values: MessageValues) => interpolate("Hapus “{name}”", values),
  thisCannotBeUndoneAllBalancesAndSettlementSuggestionsWillBeRecalculated:
    "Tindakan ini tidak dapat dibatalkan. Semua saldo dan saran pelunasan akan dihitung ulang.",
  expenseDeleted: "Pengeluaran dihapus",
  deleteThisExpense: "Hapus pengeluaran ini?",
  invalidSplitFormat: "Format pembagian tidak valid",
  selectAtLeastOnePersonToSplitWith: "Pilih minimal satu orang untuk berbagi",
  expenseChangesSaved: "Perubahan pengeluaran disimpan",
  expenseRecorded: "Pengeluaran dicatat",
  unableToSaveExpense: "Tidak dapat menyimpan pengeluaran",
  reviewTheSplitPreviewBeforeSavingChanges:
    "Periksa pratinjau pembagian sebelum menyimpan perubahan.",
  enterTheRequiredDetailsFirstCustomSplitsAndTagsAreAvailableBelow:
    "Masukkan rincian yang diperlukan terlebih dahulu. Pembagian khusus dan tag tersedia di bawah.",
  editExpense: "Edit pengeluaran",
  addExpense2: "Tambah pengeluaran",
  discardDraft: "Buang draf",
  unsavedChangesWillBeLostExistingDataWillNotChange:
    "Perubahan yang belum disimpan akan hilang. Data yang ada tidak akan berubah.",
  discardThisDraft: "Buang draf ini?",
  description: "Deskripsi",
  dinnerHotelTrainTickets: "Makan malam, hotel, tiket kereta",
  enterAnExpenseDescription: "Masukkan deskripsi pengeluaran",
  amount: "Jumlah",
  enterAnExpenseAmount: "Masukkan jumlah pengeluaran",
  date: "Tanggal",
  currency2: "Mata uang",
  splitPreview: "Pratinjau pembagian",
  enterAnAmountToPreviewEachPersonsShare:
    "Masukkan jumlah untuk melihat pratinjau bagian tiap orang.",
  namePaidAmount: (values: MessageValues) =>
    interpolate("{name} membayar {amount}", values),
  changePeopleAndSplitMethod: "Ubah orang dan metode pembagian",
  selectedSelectedOfTotal: (values: MessageValues) =>
    interpolate("Dipilih {selected} dari {total}", values),
  selectAll: "Pilih semua",
  clear: "Bersihkan",
  splitMethod: "Metode pembagian",
  splitEqually: "Bagi rata",
  exactAmounts: "Jumlah pasti",
  percentages: "Persentase",
  shares: "Bobot bagian",
  nameSKind: (values: MessageValues) =>
    interpolate("{kind} untuk {name}", values),
  moreDetails: "Rincian lainnya",
  categoryAndTags: "Kategori dan tag",
  separateWithCommasForExampleBreakfastTransport:
    "Pisahkan dengan koma, misalnya sarapan, transportasi",
  unsavedChangesWillBeLost: "Perubahan yang belum disimpan akan hilang.",
  cancelEditing: "Batalkan pengeditan?",
  saveChanges: "Simpan perubahan",
  recordExpense: "Catat pengeluaran",
  settlementRepresentative: "Pelunasan diwakilkan kepada",
  settledByName: (values: MessageValues) =>
    interpolate("Pelunasan diwakilkan kepada {name}", values),
  settleSeparately: "Sendiri (lunasi terpisah)",
  settlementRepresentativeHelp:
    "Pengeluaran dibagi per orang; saldo dan saran pelunasan menyertakan saldo bersih seseorang di bawah perwakilannya. Perwakilan tidak dapat diwakilkan kepada orang lain.",
  representativeHasDependents:
    "Anggota lain diwakilkan kepada orang ini. Hapus penugasan tersebut terlebih dahulu.",
  settlementRepresentativeUpdated: "Perwakilan pelunasan diperbarui",
  unableToUpdateSettlementRepresentative:
    "Tidak dapat memperbarui perwakilan pelunasan",
  provideParticipantChanges: "Berikan rincian peserta yang akan diperbarui",
  invalidSettlementRepresentative: "Perwakilan pelunasan tidak valid",
  settlementRepresentativeMustBeAnotherGroupMember:
    "Perwakilan pelunasan harus merupakan anggota lain dalam grup ini",
  settlementRepresentativeCannotBeAssignedOrHaveDependents:
    "Perwakilan pelunasan tidak boleh diwakilkan kepada orang lain, dan orang ini tidak boleh sedang mewakili anggota lain",
  invalidBackupSettlementRepresentative:
    "Perwakilan pelunasan dalam cadangan tidak valid",
  expenseParticipantAdded: "Peserta pengeluaran ditambahkan",
  unableToAddPerson: "Tidak dapat menambahkan orang",
  expenseParticipantsDoNotNeedToSignInManageAccountsWithAccessUnderMoreSharingAndAccess:
    "Peserta pengeluaran tidak perlu masuk. Kelola akun yang memiliki akses di Pengaturan grup → Berbagi dan akses.",
  personsName: "Nama orang",
  friendsName: "Nama teman",
  enterAName: "Masukkan nama",
  archivedGroupsAreReadOnlyRestoreThisGroupToChangeParticipants:
    "Grup yang diarsipkan hanya dapat dibaca. Pulihkan grup ini untuk mengubah peserta.",
  usedByAPayment: "Digunakan dalam pembayaran",
  cannotDeleteReasonUpdateRelatedExpensesFirstOrUseTheMergeToolBelow: (
    values: MessageValues,
  ) =>
    interpolate(
      "Tidak dapat menghapus: {reason}. Perbarui pengeluaran terkait terlebih dahulu, atau gunakan alat penggabungan di bawah.",
      values,
    ),
  deleteName2: (values: MessageValues) => interpolate("Hapus {name}", values),
  thisPersonHasNoExpensesOrPaymentsDeletionCannotBeUndone:
    "Orang ini tidak memiliki pengeluaran atau pembayaran. Penghapusan tidak dapat dibatalkan.",
  expenseParticipantDeleted: "Peserta pengeluaran dihapus",
  deleteThisExpenseParticipant: "Hapus peserta pengeluaran ini?",
  nameUpdated: "Nama diperbarui",
  unableToUpdateName: "Tidak dapat memperbarui nama",
  rename: "Ubah nama",
  renameName: (values: MessageValues) =>
    interpolate("Ubah nama {name}", values),
  existingExpensesAndPaymentsWillRemainLinkedToThisPerson:
    "Pengeluaran dan pembayaran yang ada tetap terhubung dengan orang ini.",
  newName: "Nama baru",
  saveName: "Simpan nama",
  advancedPeopleTools: "Alat lanjutan untuk orang",
  mergeDuplicatePeople: "Gabungkan orang yang duplikat",
  sourcePerson: "Orang asal",
  targetPerson: "Orang tujuan",
  mergeInto: "Gabungkan ke",
  changePreview: "Pratinjau perubahan",
  expensesRelatedExpensesAndPaymentsPaymentsForSourceWillMoveToTargetThenTheSourcePersonWillBeDeleted:
    (values: MessageValues) =>
      interpolate(
        "{expenses} pengeluaran terkait dan {payments} pembayaran milik {source} akan dipindahkan ke {target}, lalu orang asal akan dihapus.",
        values,
      ),
  mergePeople: "Gabungkan orang",
  sourceWillBeDeletedAndRelatedDataWillBeTransferredToTargetAtomically: (
    values: MessageValues,
  ) =>
    interpolate(
      "{source} akan dihapus dan data terkait dipindahkan ke {target} dalam satu operasi yang tidak terpisahkan.",
      values,
    ),
  expenseParticipantsMerged: "Peserta pengeluaran digabungkan",
  mergeFailed: "Gagal menggabungkan",
  applyMerge: "Terapkan penggabungan?",
  previewAndMerge: "Pratinjau dan gabungkan",
} satisfies CatalogShape<typeof zhTW>;
