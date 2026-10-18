import {
  type CatalogShape,
  interpolate,
  type MessageValues,
} from "./message-types.js";
import { msErrors } from "./messages-ms-errors.js";
import { msFeatures } from "./messages-ms-features.js";
import { msSettings } from "./messages-ms-settings.js";
import type { zhTW } from "./messages-zh-tw.js";

export const ms = {
  backToExpenseList: "Kembali ke senarai perbelanjaan",
  expenseEditorUnavailable:
    "Perbelanjaan ini tidak boleh diedit. Perbelanjaan mungkin tidak wujud, atau kumpulan mungkin baca sahaja atau telah diarkibkan.",
  ...msFeatures,
  ...msSettings,
  ...msErrors,
  usernameMustBe332LettersNumbersUnderscoresOrHyphens:
    "Nama pengguna mesti terdiri daripada 3–32 huruf, nombor, garis bawah atau tanda sempang",
  travelTogetherSplitExpensesEasily:
    "Mengembara bersama, bahagikan perbelanjaan dengan mudah",
  goodFriendsSplitExpensesWell:
    "Sahabat baik membahagikan perbelanjaan dengan baik.",
  skipToMainContent: "Langkau ke kandungan utama",
  otterHome: "Laman utama otter",
  loading: "Memuatkan",
  unableToLoadOtter: "Tidak dapat memuatkan otter",
  loadingFailed: "Pemuatan gagal",
  reload: "Muat semula",
  signedIn: "Telah log masuk",
  accountCreated: "Akaun dicipta",
  unableToAuthenticate: "Tidak dapat mengesahkan identiti",
  authenticationRequestsTooFrequentTryAgainLater:
    "Terlalu banyak permintaan pengesahan identiti. Cuba lagi kemudian.",
  usernameUpdated: "Nama pengguna dikemas kini",
  signedOut: "Telah log keluar",
  signOutFailedMessage: (values: MessageValues) =>
    interpolate("Log keluar gagal: {message}", values),
  pleaseTryAgainLater: "Sila cuba lagi kemudian",
  signingOut: "Sedang log keluar…",
  signOut: "Log keluar",
  authorizeCli: "Sambungkan CLI",
  authorizeCliDescription:
    "Masukkan kod peranti yang ditunjukkan dalam terminal anda untuk meluluskan akses CLI ini kepada data Otter anda.",
  deviceCode: "Kod peranti",
  checkDeviceCode: "Teruskan",
  checkingDeviceCode: "Menyemak…",
  cliAccessRequest: "Permintaan akses CLI",
  cliAccessRequestedBy: "Diminta oleh",
  approveCliAccess: "Luluskan akses",
  approvingCliAccess: "Meluluskan…",
  cliAccessApproved: "CLI disambungkan",
  cliAccessApprovedDescription:
    "Anda boleh menutup halaman ini dan kembali ke terminal anda.",
  deviceCodeNotFoundOrExpired:
    "Kod peranti tidak ditemui atau telah tamat tempoh",
  enterAValidDeviceCode: "Masukkan kod peranti yang sah",
  youAreOfflineLoadedDataIsAvailableButEditingRequiresAConnection:
    "Anda berada di luar talian. Data yang dimuatkan tersedia, tetapi penyuntingan memerlukan sambungan.",
  travelTogetherSplitWithEase: "Mengembara bersama, bahagikan dengan mudah",
  spendYourTimeOnTheJourney: "Luangkan masa anda untuk perjalanan,",
  andLeaveTheSplittingToOtter: "dan serahkan pembahagian kepada otter.",
  fromDinnerToAFullTripRecordEverySharedExpenseAndKeepGroupFinancesSimpleAndClear:
    "Daripada makan malam hingga seluruh perjalanan, rekodkan setiap perbelanjaan bersama dan pastikan kewangan kumpulan mudah dan jelas.",
  splitExampleAWeekendTripDinnerCostsTwd1800ForThreePeopleOrTwd600Each:
    "Contoh pembahagian: makan malam semasa perjalanan hujung minggu berharga TWD 1,800 untuk tiga orang, atau TWD 600 seorang.",
  weekendTrip: "Perjalanan hujung minggu",
  splitExample: "Contoh pembahagian",
  dinnerTogether: "Makan malam bersama",
  you: "Anda",
  a: "A",
  y: "Y",
  splitEquallyAmong3: "Bahagikan sama rata antara 3 orang",
  each: "seorang",
  quicklyRecordSharedExpenses: "Rekodkan perbelanjaan bersama dengan cepat",
  seeWhoOwesAndWhoIsOwedAtAGlance:
    "Lihat siapa perlu membayar dan siapa perlu menerima sekali imbas",
  settleUpWithClearSuggestions: "Selesaikan bayaran dengan cadangan yang jelas",
  signIn: "Log masuk",
  createAccount: "Cipta akaun",
  welcomeBackContinueYourJourney: "Selamat kembali. Teruskan perjalanan anda.",
  createYourFirstGroupAndStartSplittingWithEase:
    "Cipta kumpulan pertama anda dan mula membahagikan perbelanjaan dengan mudah.",
  username: "Nama pengguna",
  enterAUsername: "Masukkan nama pengguna",
  password: "Kata laluan",
  enterAPassword: "Masukkan kata laluan",
  developmentCredentialsHaveBeenFilledIn:
    "Butiran log masuk pembangunan telah diisi.",
  signingIn: "Sedang log masuk…",
  or: "atau",
  signInWithAPasskey: "Log masuk dengan Passkey",
  signingInWithAPasskey: "Sedang log masuk dengan Passkey…",
  unableToSignInWithAPasskey:
    "Tidak dapat log masuk dengan Passkey. Cuba lagi atau gunakan kata laluan anda.",
  needAnAccount: "Perlukan akaun?",
  usernameIsNotCaseSensitive:
    "Nama pengguna tidak membezakan huruf besar dan huruf kecil.",
  passwordMustBeAtLeast8Characters:
    "Kata laluan mesti sekurang-kurangnya 8 aksara",
  passwordMustBeAtLeast8Characters2:
    "Kata laluan mesti sekurang-kurangnya 8 aksara.",
  creating: "Mencipta…",
  createAccountWithAPasskey: "Cipta akaun dengan Passkey",
  creatingAccountWithAPasskey: "Mencipta akaun dengan Passkey…",
  unableToCreateAccountWithAPasskey:
    "Tidak dapat mencipta akaun dengan Passkey. Cuba lagi.",
  alreadyHaveAnAccount: "Sudah mempunyai akaun?",
  backToSignIn: "Kembali ke log masuk",
  expenseParticipantsDoNotNeedAccountsToBeIncludedInAGroup:
    "Peserta perbelanjaan tidak memerlukan akaun untuk disertakan dalam kumpulan.",
  changeNameSUsername: (values: MessageValues) =>
    interpolate("Tukar nama pengguna {name}", values),
  nameSAccountMenu: (values: MessageValues) =>
    interpolate("Menu akaun {name}", values),
  unableToUpdateUsername: "Tidak dapat mengemas kini nama pengguna",
  changeUsername: "Tukar nama pengguna",
  passkeyRegistrationRequestsTooFrequent:
    "Terlalu banyak permintaan pendaftaran Passkey. Cuba lagi kemudian.",
  passkeyRegistrationResponseIsInvalid: "Respons pendaftaran Passkey tidak sah",
  passkeyRegistrationRequestExpired:
    "Permintaan pendaftaran Passkey telah tamat tempoh. Cuba lagi.",
  unableToVerifyPasskey: "Tidak dapat mengesahkan Passkey. Cuba lagi.",
  passkeyAlreadyRegistered: "Passkey ini telah didaftarkan",
  passkeyNotFound: "Passkey tidak ditemui",
  cannotRemoveOnlyPasskey:
    "Membuang satu-satunya Passkey anda akan menyebabkan anda kehilangan akses akaun",
  passkeyLoginResponseIsInvalid: "Respons log masuk Passkey tidak sah",
  passkeyLoginRequestExpired:
    "Permintaan log masuk Passkey telah tamat tempoh. Cuba lagi.",
  unableToUsePasskeyToSignIn: "Tidak dapat log masuk dengan Passkey ini",
  cancel: "Batal",
  saving: "Menyimpan…",
  save: "Simpan",
  connectionFailedPleaseTryAgainLater:
    "Sambungan gagal. Sila cuba lagi kemudian.",
  theServerReturnedAnInvalidResponse:
    "Pelayan mengembalikan respons yang tidak sah.",
  everyone: "Semua orang",
  unknown: "Tidak diketahui",
  atLeastOneParticipantIsRequired:
    "Sekurang-kurangnya seorang peserta diperlukan",
  usedByAnExpense: "Digunakan oleh perbelanjaan",
  youAreOfflineReconnectAndTryAgain:
    "Anda berada di luar talian. Sambung semula dan cuba lagi.",
  working: "Memproses…",
  unableToApplyChanges: "Tidak dapat menggunakan perubahan",
  applying: "Menggunakan perubahan…",
  noBalancesYet: "Belum ada baki.",
  settled: "Selesai",
  getsBack: "Akan menerima",
  owes: "Perlu membayar",
  newTaiwanDollar: "Dolar Taiwan baharu",
  japaneseYen: "Yen Jepun",
  usDollar: "Dolar AS",
  euro: "Euro",
  singaporeDollar: "Dolar Singapura",
  poundSterling: "Paun sterling",
  australianDollar: "Dolar Australia",
  canadianDollar: "Dolar Kanada",
  southKoreanWon: "Won Korea Selatan",
  food: "Makanan",
  transport: "Pengangkutan",
  lodging: "Penginapan",
  tickets: "Tiket",
  shopping: "Membeli-belah",
  other: "Lain-lain",
  unsavedChangesWillBeLostDiscardTheDraft:
    "Perubahan yang belum disimpan akan hilang. Buang draf?",
  unableToSwitchGroups: "Tidak dapat menukar kumpulan",
  loadingGroup: "Memuatkan kumpulan",
  yourSelectionWillAppearAfterItsDataLoads:
    "Pilihan anda akan dipaparkan selepas datanya dimuatkan.",
  unableToLoadGroup: "Tidak dapat memuatkan kumpulan",
  groupSwitcher: "Penukar kumpulan",
  groups: "Kumpulan",
  countActiveGroups: (values: MessageValues) =>
    interpolate("{count} kumpulan aktif", values),
  everyTripAddsUpToSomethingWonderful:
    "Setiap perjalanan membawa pengalaman yang indah.",
  recordSharedExpensesAndFocusOnThePeopleBesideYou:
    "Rekodkan perbelanjaan bersama dan tumpukan perhatian kepada orang di sisi anda.",
  archivedAndReadOnlyDataIsPreservedTheOwnerCanRestoreItUnderMore:
    "Diarkibkan dan baca sahaja. Data dikekalkan; pemilik boleh memulihkannya dalam Tetapan kumpulan.",
  addTravelCompanionsFirst: "Tambah rakan perjalanan dahulu",
  thereIsOnlyOneParticipantAddSomeoneToSplitWithBeforeRecordingTheFirstExpense:
    "Hanya ada seorang peserta. Tambah seseorang untuk berkongsi perbelanjaan sebelum merekodkan perbelanjaan pertama.",
  addExpenseParticipant: "Tambah peserta perbelanjaan",
  switchGroups: "Tukar kumpulan",
  youWillLeaveTheCurrentGroupOnlyAfterTheNewOneLoads:
    "Anda hanya akan meninggalkan kumpulan semasa selepas kumpulan baharu dimuatkan.",
  participantsPeopleExpensesExpensesCurrency: (values: MessageValues) =>
    interpolate(
      "{participants} orang · {expenses} perbelanjaan · {currency}",
      values,
    ),
  archived: "Diarkibkan",
  everydayMomentsTogether: "Detik harian bersama",
  collaborator: "Rakan kerjasama",
  owner: "Pemilik",
  baseCurrencyCurrency: (values: MessageValues) =>
    interpolate("Mata wang asas {currency}", values),
  usingCustomExchangeRates: "Menggunakan kadar pertukaran tersuai",
  usingBankOfTaiwanExchangeRates: "Menggunakan kadar lalai Bank of Taiwan",
  usingFixedFallbackRates:
    "Bank of Taiwan tidak tersedia; menggunakan kadar gantian tetap",
  loadingGroup2: "Memuatkan kumpulan…",
  people: "Orang",
  expenses: "Perbelanjaan",
  base: "Asas",
  overview: "Gambaran keseluruhan",
  more: "Lagi",
  groupWorkspace: "Ruang kerja kumpulan",
  addExpense: "Tambah perbelanjaan",
  archivedGroups: "Kumpulan diarkibkan",
  unableToCreateGroup: "Tidak dapat mencipta kumpulan",
  createGroup: "Cipta kumpulan",
  addCompanionsAfterCreatingTheGroupThenRecordSharedExpenses:
    "Tambah rakan selepas mencipta kumpulan, kemudian rekodkan perbelanjaan bersama.",
  groupName: "Nama kumpulan",
  fiveDaysInTokyo: "Lima hari di Tokyo",
  baseCurrency: "Mata wang asas",
  createYourFirstGroup: "Cipta kumpulan pertama anda",
  addATripOrEventGroupOrCreateOneFromAnExistingJsonBackup:
    "Tambah kumpulan perjalanan atau acara, atau cipta kumpulan daripada sandaran JSON sedia ada.",
  groupExpenseSummary: "Ringkasan perbelanjaan kumpulan",
  totalSharedExpenses: "Jumlah perbelanjaan bersama",
  convertedToBaseCurrency: "Ditukar kepada mata wang asas",
  outstanding: "Belum selesai",
  countSuggestedPaymentsToSettleUp: (values: MessageValues) =>
    interpolate("{count} bayaran dicadangkan untuk penyelesaian", values),
  nothingIsCurrentlyOutstanding: "Tiada bayaran tertunggak pada masa ini",
  settlementSuggestionsAppearAfterExpensesAreAdded:
    "Cadangan penyelesaian dipaparkan selepas perbelanjaan ditambah",
  expenseRecords: "Rekod perbelanjaan",
  sharedAmongCountPeople: (values: MessageValues) =>
    interpolate("Dikongsi antara {count} orang", values),
  calculatedFromCurrentExpensesAndRecordedPayments:
    "Dikira daripada perbelanjaan semasa dan bayaran yang direkodkan.",
  settleUp: "Selesaikan bayaran",
  countEntries: (values: MessageValues) => interpolate("{count} entri", values),
  entries: "entri",
  seePaymentsAndSharesAtAGlance: "Lihat bayaran dan bahagian sekali imbas.",
  balances: "Baki",
  recentExpenses: "Perbelanjaan terkini",
  noExpensesYet: "Belum ada perbelanjaan",
  thisGroupHasNotRecordedAnySharedExpenses:
    "Kumpulan ini belum merekodkan sebarang perbelanjaan bersama.",
  recordTheFirstSharedExpense: "Rekodkan perbelanjaan bersama pertama",
  addThePeopleSplittingExpensesToCalculateEachBalance:
    "Tambah orang yang berkongsi perbelanjaan dahulu, kemudian rekodkan perbelanjaan pertama anda. Baki dan cadangan penyelesaian akan dipaparkan secara automatik.",
  balancesAndSettlementSuggestionsWillAppearHereAfterYouAddExpenses:
    "Baki dan cadangan penyelesaian akan dipaparkan di sini selepas anda menambah perbelanjaan.",
  addPerson: "Tambah orang",
  managePeople: "Urus orang",
  everythingIsSettled: "Semua bayaran telah selesai",
  thereAreNoOutstandingPayments: "Tiada bayaran tertunggak.",
  paymentRecorded: "Bayaran direkodkan",
  unableToRecordPayment: "Tidak dapat merekodkan bayaran",
  recordPayment: "Rekodkan bayaran",
  recordSettlementPayment: "Rekodkan bayaran penyelesaian",
  fromPaysToTheFullSuggestedAmountIsPrefilled: (values: MessageValues) =>
    interpolate(
      "{from} membayar kepada {to}; amaun penuh yang dicadangkan telah diisi.",
      values,
    ),
  paymentAmountCurrency: (values: MessageValues) =>
    interpolate("Amaun bayaran ({currency})", values),
  enterAPaymentAmount: "Masukkan amaun bayaran",
  thePaymentMustBeGreaterThan0AndNoMoreThanTheSuggestedAmount:
    "Bayaran mesti lebih daripada 0 dan tidak melebihi amaun yang dicadangkan",
  expectedRemainder: "Baki dijangka: ",
  paymentDate: "Tarikh bayaran",
  noteOptional: "Nota (pilihan)",
  recordPayment2: "Rekodkan bayaran",
  paymentHistory: "Sejarah bayaran",
  dateFromPaidTo: (values: MessageValues) =>
    interpolate("{date} · {from} membayar kepada {to}", values),
  deletePayment: "Padam bayaran",
  remainingSettlementSuggestionsWillBeRecalculated:
    "Cadangan penyelesaian yang berbaki akan dikira semula.",
  paymentDeleted: "Bayaran dipadam",
  deleteFailed: "Pemadaman gagal",
  deleteThisPayment: "Padam bayaran ini?",
  delete: "Padam",
  datePaidByNameSplitWithSplit: (values: MessageValues) =>
    interpolate(
      "{date} · dibayar oleh {name} · dikongsi dengan {split}",
      values,
    ),
  dailySpending: "Perbelanjaan harian",
  paidByPerson: "Dibayar mengikut orang",
  byCategory: "Mengikut kategori",
  spendingAnalysis: "Analisis perbelanjaan",
  totalAmount: (values: MessageValues) =>
    interpolate("Jumlah {amount}", values),
  noDataYet: "Belum ada data.",
  showingShownOfTotalExpenses: (values: MessageValues) =>
    interpolate("Memaparkan {shown} daripada {total} perbelanjaan", values),
  searchDescriptions: "Cari huraian",
  searchExpenseDescriptions: "Cari huraian perbelanjaan",
  sort: "Isih",
  groupBy: "Kumpulkan mengikut",
  noGrouping: "Tiada pengumpulan",
  groupByDate: "Kumpulkan mengikut tarikh",
  groupByPayer: "Kumpulkan mengikut pembayar",
  dateNewestFirst: "Tarikh: terkini dahulu",
  dateOldestFirst: "Tarikh: terlama dahulu",
  amountHighToLow: "Amaun: tinggi ke rendah",
  amountLowToHigh: "Amaun: rendah ke tinggi",
  moreFilters: "Lagi penapis",
  countApplied: (values: MessageValues) =>
    interpolate("{count} digunakan", values),
  datePersonCurrencyCategoryAndTag:
    "Tarikh, orang, mata wang, kategori dan tag",
  from: "Dari",
  to: "Hingga",
  paidBy: "Dibayar oleh",
  splitWith: "Dikongsi dengan",
  expenseParticipants: "Peserta perbelanjaan",
  currency: "Mata wang",
  allCurrencies: "Semua mata wang",
  category: "Kategori",
  allCategories: "Semua kategori",
  tag: "Tag",
  exactTag: "Tag tepat",
  applied: "Digunakan:",
  clearAll: "Kosongkan semua",
  allPeople: "Semua orang",
  categoryValue: (values: MessageValues) =>
    interpolate("Kategori: {value}", values),
  currencyValue: (values: MessageValues) =>
    interpolate("Mata wang: {value}", values),
  fromValue: (values: MessageValues) => interpolate("Dari: {value}", values),
  toValue: (values: MessageValues) => interpolate("Hingga: {value}", values),
  tagValue: (values: MessageValues) => interpolate("Tag: {value}", values),
  aCompleteHistoryWillAppearHereAfterTheFirstSharedExpense:
    "Sejarah lengkap akan dipaparkan di sini selepas perbelanjaan bersama pertama.",
  recordFirstExpense: "Rekodkan perbelanjaan pertama",
  noMatchingExpenses: "Tiada perbelanjaan yang sepadan",
  adjustOrClearTheFiltersToSeeAllExpenses:
    "Laraskan atau kosongkan penapis untuk melihat semua perbelanjaan.",
  clearFilters: "Kosongkan penapis",
  filteredExpenses: "Perbelanjaan ditapis",
  allExpenses: "Semua perbelanjaan",
  columns: "Lajur",
  chooseExpenseColumns: "Pilih lajur perbelanjaan",
  expenseName: "Perbelanjaan",
  splitParticipants: "Pembahagian",
  receipt: "Resit",
  tags: "Tag",
  restoreDefaults: "Pulihkan tetapan lalai",
  actions: "Tindakan",
  expenseGroupSummary: (values: MessageValues) =>
    interpolate("{count} perbelanjaan · {total}", values),
  countPeople: (values: MessageValues) => interpolate("{count} orang", values),
  viewReceiptForName: (values: MessageValues) =>
    interpolate("Lihat resit untuk {name}", values),
  receiptPreviewForName: (values: MessageValues) =>
    interpolate("Resit untuk “{name}”", values),
  receiptImageForName: (values: MessageValues) =>
    interpolate("Imej resit untuk {name}", values),
  closeReceiptPreviewHint: "Klik imej atau tekan Esc untuk menutup.",
  closeReceiptPreview: "Tutup pratonton resit",
  openOriginalReceipt: "Buka imej asal",
  moreActionsForName: (values: MessageValues) =>
    interpolate("Lagi tindakan untuk {name}", values),
  datePaidByName: (values: MessageValues) =>
    interpolate("{date} · dibayar oleh {name}", values),
  splitWithSplit: (values: MessageValues) =>
    interpolate("Dikongsi dengan {split}", values),
  edit: "Sunting",
  receiptUploadFailed: "Muat naik resit gagal",
  receiptUploaded: "Resit dimuat naik",
  uploading: "Memuat naik…",
  uploadReceipt: "Muat naik resit",
  receiptFileRequirements: "JPEG, PNG atau WebP · Sehingga 5 MB",
  selectReceiptPhoto: "Muat naik foto",
  takeReceiptPhoto: "Ambil foto",
  removeReceiptPhoto: "Buang foto",
  receiptOnlineOnly:
    "Foto memerlukan sambungan; draf luar talian tidak menyimpan foto. Buang foto atau sambung semula dahulu.",
  receiptFileTooLarge: "Saiz foto mesti 5 MB atau lebih kecil",
  expenseSavedReceiptFailed:
    "Perbelanjaan dicipta, tetapi muat naik resit gagal. Cuba semula sekarang atau tambah kemudian daripada senarai perbelanjaan.",
  retryReceiptUpload: "Cuba semula muat naik resit",
  receiptAlreadyAttached:
    "Perbelanjaan ini sudah mempunyai resit. Semak daripada senarai perbelanjaan; resit tidak akan ditulis ganti secara automatik",
  uploadReceiptLater: "Muat naik kemudian",
  expenseCreationUncertain:
    "Kami tidak dapat mengesahkan sama ada perbelanjaan telah dicipta. Semak senarai perbelanjaan sebelum menambahnya semula; jangan terus mencuba semula.",
  viewReceipt: "Lihat resit",
  noReceipt: "Tiada resit",
  deleteReceipt: "Padam resit",
  youCanUploadAnotherReceiptLaterTheExpenseWillNotBeDeleted:
    "Anda boleh memuat naik resit lain kemudian; perbelanjaan tidak akan dipadam.",
  receiptDeleted: "Resit dipadam",
  deleteThisReceipt: "Padam resit ini?",
  deleteName: (values: MessageValues) => interpolate("Padam “{name}”", values),
  thisCannotBeUndoneAllBalancesAndSettlementSuggestionsWillBeRecalculated:
    "Tindakan ini tidak boleh dibuat asal. Semua baki dan cadangan penyelesaian akan dikira semula.",
  expenseDeleted: "Perbelanjaan dipadam",
  deleteThisExpense: "Padam perbelanjaan ini?",
  invalidSplitFormat: "Format pembahagian tidak sah",
  selectAtLeastOnePersonToSplitWith:
    "Pilih sekurang-kurangnya seorang untuk berkongsi perbelanjaan",
  expenseChangesSaved: "Perubahan perbelanjaan disimpan",
  expenseRecorded: "Perbelanjaan direkodkan",
  unableToSaveExpense: "Tidak dapat menyimpan perbelanjaan",
  reviewTheSplitPreviewBeforeSavingChanges:
    "Semak pratonton pembahagian sebelum menyimpan perubahan.",
  enterTheRequiredDetailsFirstCustomSplitsAndTagsAreAvailableBelow:
    "Masukkan butiran yang diperlukan dahulu. Pembahagian tersuai dan tag tersedia di bawah.",
  editExpense: "Sunting perbelanjaan",
  addExpense2: "Tambah perbelanjaan",
  discardDraft: "Buang draf",
  unsavedChangesWillBeLostExistingDataWillNotChange:
    "Perubahan yang belum disimpan akan hilang. Data sedia ada tidak akan berubah.",
  discardThisDraft: "Buang draf ini?",
  description: "Huraian",
  dinnerHotelTrainTickets: "Makan malam, hotel, tiket kereta api",
  enterAnExpenseDescription: "Masukkan huraian perbelanjaan",
  amount: "Amaun",
  enterAnExpenseAmount: "Masukkan amaun perbelanjaan",
  date: "Tarikh",
  currency2: "Mata wang",
  splitPreview: "Pratonton pembahagian",
  enterAnAmountToPreviewEachPersonsShare:
    "Masukkan amaun untuk melihat pratonton bahagian setiap orang.",
  namePaidAmount: (values: MessageValues) =>
    interpolate("{name} membayar {amount}", values),
  changePeopleAndSplitMethod: "Tukar orang dan kaedah pembahagian",
  selectedSelectedOfTotal: (values: MessageValues) =>
    interpolate("{selected} daripada {total} dipilih", values),
  selectAll: "Pilih semua",
  clear: "Kosongkan",
  splitMethod: "Kaedah pembahagian",
  splitEqually: "Bahagikan sama rata",
  exactAmounts: "Amaun tepat",
  percentages: "Peratusan",
  shares: "Unit bahagian",
  nameSKind: (values: MessageValues) =>
    interpolate("{kind} untuk {name}", values),
  moreDetails: "Lagi butiran",
  categoryAndTags: "Kategori dan tag",
  separateWithCommasForExampleBreakfastTransport:
    "Pisahkan dengan koma, contohnya sarapan, pengangkutan",
  unsavedChangesWillBeLost: "Perubahan yang belum disimpan akan hilang.",
  cancelEditing: "Batalkan penyuntingan?",
  saveChanges: "Simpan perubahan",
  recordExpense: "Rekodkan perbelanjaan",
  settlementRepresentative: "Penyelesaian ditugaskan kepada",
  settledByName: (values: MessageValues) =>
    interpolate("Penyelesaian ditugaskan kepada {name}", values),
  settleSeparately: "Sendiri (selesaikan secara berasingan)",
  settlementRepresentativeHelp:
    "Perbelanjaan dibahagikan mengikut orang; baki dan cadangan penyelesaian merangkumi baki bersih seseorang di bawah wakilnya. Wakil tidak boleh ditugaskan kepada orang lain.",
  representativeHasDependents:
    "Ahli lain ditugaskan kepada orang ini. Buang tugasan tersebut dahulu.",
  settlementRepresentativeUpdated: "Wakil penyelesaian dikemas kini",
  unableToUpdateSettlementRepresentative:
    "Tidak dapat mengemas kini wakil penyelesaian",
  provideParticipantChanges: "Sertakan butiran peserta untuk dikemas kini",
  invalidSettlementRepresentative: "Wakil penyelesaian tidak sah",
  settlementRepresentativeMustBeAnotherGroupMember:
    "Wakil penyelesaian mestilah ahli lain dalam kumpulan ini",
  settlementRepresentativeCannotBeAssignedOrHaveDependents:
    "Wakil penyelesaian tidak boleh membuat penyelesaian melalui orang lain, dan orang ini tidak boleh mempunyai ahli yang membuat penyelesaian melaluinya",
  invalidBackupSettlementRepresentative:
    "Wakil penyelesaian dalam sandaran tidak sah",
  expenseParticipantAdded: "Peserta perbelanjaan ditambah",
  unableToAddPerson: "Tidak dapat menambah orang",
  expenseParticipantsDoNotNeedToSignInManageAccountsWithAccessUnderMoreSharingAndAccess:
    "Peserta perbelanjaan tidak perlu log masuk. Urus akaun yang mempunyai akses dalam Tetapan kumpulan → Perkongsian dan akses.",
  personsName: "Nama orang",
  friendsName: "Nama rakan",
  enterAName: "Masukkan nama",
  archivedGroupsAreReadOnlyRestoreThisGroupToChangeParticipants:
    "Kumpulan diarkibkan adalah baca sahaja. Pulihkan kumpulan ini untuk menukar peserta.",
  usedByAPayment: "Digunakan oleh bayaran",
  cannotDeleteReasonUpdateRelatedExpensesFirstOrUseTheMergeToolBelow: (
    values: MessageValues,
  ) =>
    interpolate(
      "Tidak dapat memadam: {reason}. Kemas kini perbelanjaan berkaitan dahulu, atau gunakan alat penggabungan di bawah.",
      values,
    ),
  deleteName2: (values: MessageValues) => interpolate("Padam {name}", values),
  thisPersonHasNoExpensesOrPaymentsDeletionCannotBeUndone:
    "Orang ini tidak mempunyai perbelanjaan atau bayaran. Pemadaman tidak boleh dibuat asal.",
  expenseParticipantDeleted: "Peserta perbelanjaan dipadam",
  deleteThisExpenseParticipant: "Padam peserta perbelanjaan ini?",
  nameUpdated: "Nama dikemas kini",
  unableToUpdateName: "Tidak dapat mengemas kini nama",
  rename: "Namakan semula",
  renameName: (values: MessageValues) =>
    interpolate("Namakan semula {name}", values),
  existingExpensesAndPaymentsWillRemainLinkedToThisPerson:
    "Perbelanjaan dan bayaran sedia ada akan kekal dipautkan kepada orang ini.",
  newName: "Nama baharu",
  saveName: "Simpan nama",
  advancedPeopleTools: "Alat lanjutan untuk orang",
  mergeDuplicatePeople: "Gabungkan orang yang berganda",
  sourcePerson: "Orang sumber",
  targetPerson: "Orang sasaran",
  mergeInto: "Gabungkan ke dalam",
  changePreview: "Pratonton perubahan",
  expensesRelatedExpensesAndPaymentsPaymentsForSourceWillMoveToTargetThenTheSourcePersonWillBeDeleted:
    (values: MessageValues) =>
      interpolate(
        "{expenses} perbelanjaan berkaitan dan {payments} bayaran untuk {source} akan dipindahkan kepada {target}, kemudian orang sumber akan dipadam.",
        values,
      ),
  mergePeople: "Gabungkan orang",
  sourceWillBeDeletedAndRelatedDataWillBeTransferredToTargetAtomically: (
    values: MessageValues,
  ) =>
    interpolate(
      "{source} akan dipadam dan data berkaitan akan dipindahkan kepada {target} dalam satu operasi yang tidak boleh dipisahkan.",
      values,
    ),
  expenseParticipantsMerged: "Peserta perbelanjaan digabungkan",
  mergeFailed: "Penggabungan gagal",
  applyMerge: "Gunakan penggabungan?",
  previewAndMerge: "Pratonton dan gabungkan",
} satisfies CatalogShape<typeof zhTW>;
