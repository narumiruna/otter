import {
  type CatalogShape,
  interpolate,
  type MessageValues,
} from "./message-types.js";
import { trAi } from "./messages-ai.js";
import { trAiAuth } from "./messages-ai-auth.js";
import { trErrors } from "./messages-tr-errors.js";
import { trExpenses } from "./messages-tr-expenses.js";
import { trSettings } from "./messages-tr-settings.js";
import type { zhTW } from "./messages-zh-tw.js";

export const tr = {
  ...trAi,
  ...trAiAuth,
  ...trErrors,
  ...trExpenses,
  ...trSettings,
  browserExpenseDefaults: "Bu tarayıcıdaki gider varsayılanları",
  browserExpenseDefaultsHelp:
    "Bu hesap için yalnızca bu grubun para birimi ve paylaşım varsayılanlarını temizleyin. Hesaplar, oturum açma ve izinler değişmez.",
  clearPersonalPreferences: "Bu grubun gider varsayılanlarını temizle",
  expenseDefaultsCleared: "Bu grubun gider varsayılanları temizlendi.",
  personalPreferencesChanged:
    "Paylaşım ayarlarınız artık kullanılamıyor. Geçerli varsayılanlar kullanılıyor; yeniden seçin.",
  personalStorageFailed:
    "Gider varsayılanları kaydedilemedi. Mevcut ayarlar kullanılabilir ancak sayfayı yeniden açtığınızda kaybolabilir.",
  rememberExpenseDefaults: "Para birimi ve paylaşım ayarlarını hatırla",
  expenseDefaultsRemembered:
    "Bu grup için para birimi ve paylaşım ayarları kaydedildi.",
  deleteExpense: "Gideri sil",
  copyExpense: "Yeni gider olarak kopyala",
  copyExpenseNamed: (values: MessageValues) =>
    interpolate("{name} giderini yeni gider olarak kopyala", values),
  memberAccounts: "Üye hesapları",
  accountPaid: "Ödenen",
  accountShared: "Pay",
  accountBalance: "Alacak / borç",
  accountReceivable: "Alacak",
  accountPayable: "Borç",
  accountSettled: "Hesap kapandı",
  accountPaidHelp:
    "Ödenen, mağazalara ve giderin karşılığı olan mal veya hizmeti sağlayan diğer taraflara ödenen tutardır. Üyeler arasındaki hesap kapatma ödemelerini içermez.",
  accountTotalsHelp:
    "Pay, her üyenin üstlenmesi gereken gider tutarıdır. Bakiyeler kayıtlı ödemeleri ve temsilci düzeltmelerini de içerir. Eşitlenmemiş taslaklar dahil edilmez.",
  accountDetails: "Ayrıntıları görüntüle",
  accountPaidExpenses: "Grup için ödenen giderler",
  accountSharedExpenses: "Ortak giderler",
  accountExpenseTotal: "Giderin tam tutarı",
  accountPayments: "Gönderilen / alınan ödemeler",
  accountPaymentSent: "Gönderilen",
  accountPaymentReceived: "Alınan",
  accountAdjustments: "Temsilci düzeltmeleri",
  accountDetailsUnavailable:
    "Bu paylaşım ödeme ayrıntılarını içermiyor. Bakiyeler grup hesaplama sonuçlarını kullanır.",
  accountRepresentedBy: (values: MessageValues) =>
    interpolate(
      "Bu üyenin hesabını {name} kapatır. Sıfır bakiye bu üyenin ödeme yaptığı anlamına gelmez.",
      values,
    ),
  visaSettlementTitle: "Visa tabanlı hesap kapatma",
  visaSettlementCurrency: "Hesap kapatma para birimi",
  visaSettlementEnable:
    "Tüm giderleri tarihli Visa kurlarıyla dönüştür ve hesabı seçilen para biriminde kapat",
  visaSettlementHelp:
    "Varsayılan olarak kapalıdır. Orijinal tutarlar değişmez. Etkinleştirme, her gider tarihi için bir Visa kuru kaydeder ve bakiyeler ile hesap kapatma ödemelerinde seçtiğiniz para birimini kullanır. Nakit dahil tüm giderlere banka ücreti olmadan uygulanır. Visa kurları tahminidir; kart ekstreleri farklı olabilir. Etkinleştirmeden veya para birimini değiştirmeden önce mevcut ödemeler seçilen para birimini kullanmalıdır.",
  visaSettlementSaved: "Visa hesap kapatma ayarı kaydedildi",
  visaSettlementOn: (values: MessageValues) =>
    interpolate("Açık · {currency}", values),
  visaSettlementOff: "Kapalı",
  visaRateLabel: "Visa",
  visaSettingInvalid: "Geçersiz Visa hesap kapatma ayarı",
  visaIncompatiblePayments:
    "Mevcut ödeme kayıtları seçilen hesap kapatma para birimini kullanmalıdır",
  visaSettingUnavailable:
    "Visa kurları kullanılamıyor. Ayar değiştirilmedi. Daha sonra tekrar deneyin.",
  visaPaymentCurrency:
    "Visa hesap kapatma ödemeleri seçilen para birimini kullanmalıdır",
  visaRateUnavailable: (values: MessageValues) =>
    interpolate(
      "{date} tarihi için Visa {currency}/{target} kuru kullanılamıyor. Daha sonra tekrar deneyin.",
      values,
    ),
  offlineQueueBanner:
    "Çevrimdışı: yüklenen veriler kullanılabilir. Yeni giderler bu cihaza kaydedilebilir; diğer düzenlemeler bağlantı gerektirir.",
  queueSave: "Bu cihaza kaydet",
  queueSaved:
    "Bu cihaza kaydedildi. Henüz bakiyelere dahil değil; döviz kurları eşitleme sırasında belirlenir.",
  queueStorageError:
    "Bu cihaza kaydedilemedi. Bu sayfayı açık tutun ve tekrar deneyin.",
  queueTitle: "Eşitlenmemiş giderler",
  queueNotice:
    "Yalnızca bu cihazda. Bakiyelere dahil değil. Döviz kurları eşitleme sırasında belirlenir. Tarayıcı verilerini temizlemek bu taslakları kaybettirir.",
  queuePending: "Eşitleme bekleniyor",
  queueAttempted: "Eşitleme onayı bekleniyor; orijinal isteği değiştirmeyin",
  queueConflict:
    "Eşitleme durduruldu. Tekrar denemeden önce erişimi ve katılımcıları kontrol edin; orijinal istek korunur.",
  queueInvalid: "Kaydedilmedi. Taslağı düzenleyip tekrar deneyin.",
  queueEdit: "Taslağı düzenle",
  queueRetry: "Orijinal isteği tekrar dene",
  queueDelete: "Yerel taslağı sil",
  queueDeleteConfirm:
    "Bu yerel taslak silinsin mi? Gönderilmiş bir istek sunucuda kaydedilmiş olabilir. Önce grubu kontrol edin.",
  queueCount: (values: MessageValues) =>
    interpolate("Bu cihazda {count} eşitlenmemiş gider", values),
  queueSyncPricing:
    "Önizleme yalnızca orijinal para birimini gösterir. Sunucu döviz kurunu eşitleme sırasında belirler.",
  queueOrphanTitle: "Erişilemeyen grupların taslakları",
  queueOrphanNotice:
    "Bu gruplara artık erişilemiyor. Gönderilen bir istek kaydedilmiş olabilir; yerel kopyasını silmeden önce doğrulayın.",
  queueOrphanTrip: (values: MessageValues) =>
    interpolate("Grup kimliği: {id}", values),
  welcomeBackEyebrow: "TEKRAR HOŞ GELDİNİZ",
  startNewJourneyEyebrow: "YENİ BİR YOLCULUĞA BAŞLAYIN",
  parchmentTheme: "Parşömen",
  expenseTotalLabel: "Toplam",
  expenseSplitSection: "Kişiler arasında paylaş",
  expenseSplitHelp:
    "Bu gideri paylaşacak kişileri seçin, bir yöntem belirleyin ve sonucu görün.",
  expenseTagPlaceholder: "Etiket ekle…",
  addShort: "Ekle",
  settingsShort: "Ayarlar",
  close: "Kapat",
  groupDetails: "Grup ayrıntıları",
  filters: "Filtreler",
  viewAll: "Tümünü görüntüle",
  personLabel: "Kişi",
  preferencesLabel: "Tercihler",
  profileLabel: "Profil",
  securityLabel: "Güvenlik",
  backToGroups: "Gruplara dön",
  backToExpenseList: "Gider listesine dön",
  expenseEditorUnavailable:
    "Bu gider düzenlenemiyor. Gider mevcut olmayabilir veya grup salt okunur ya da arşivlenmiş olabilir.",
  createdLabel: "Oluşturuldu",
  statusLabel: "Durum",
  peopleDeletionHelp:
    "Hesap defterinde kullanılan kişiler silinemez. Bilgi düğmesiyle kişilerin kısıtlamalarını kontrol edin veya yinelenen kişileri birleştirin.",
  personRestriction: (values: MessageValues) =>
    interpolate("{name} için silme kısıtlamaları", values),
  representsPeople: (values: MessageValues) =>
    interpolate("Temsil edilen kişiler: {names}", values),
  expenseRateForName: (values: MessageValues) =>
    interpolate("{name} için tutarı ve döviz kurunu görüntüle", values),
  rateUnavailable: "Kur kullanılamıyor (eski veri biçimi)",
  usernameMustBe332LettersNumbersUnderscoresOrHyphens:
    "Kullanıcı adı 3–32 harf, rakam, alt çizgi veya kısa çizgiden oluşmalıdır",
  travelTogetherSplitExpensesEasily:
    "Birlikte seyahat edin, giderleri kolayca paylaşın",
  goodFriendsSplitExpensesWell: "İyi arkadaşlar giderleri iyi paylaşır.",
  skipToMainContent: "Ana içeriğe geç",
  otterHome: "otter ana sayfası",
  loading: "Yükleniyor",
  unableToLoadOtter: "otter yüklenemedi",
  loadingFailed: "Yükleme başarısız",
  reload: "Yenile",
  signedIn: "Oturum açıldı",
  accountCreated: "Hesap oluşturuldu",
  unableToAuthenticate: "Kimlik doğrulanamadı",
  authenticationRequestsTooFrequentTryAgainLater:
    "Çok fazla kimlik doğrulama isteği. Daha sonra tekrar deneyin.",
  usernameUpdated: "Kullanıcı adı güncellendi",
  signedOut: "Oturum kapatıldı",
  signOutFailedMessage: (values: MessageValues) =>
    interpolate("Oturum kapatılamadı: {message}", values),
  pleaseTryAgainLater: "Lütfen daha sonra tekrar deneyin",
  signingOut: "Oturum kapatılıyor…",
  signOut: "Oturumu kapat",
  authorizeCli: "CLI bağla",
  authorizeCliDescription:
    "Bu CLI'ın Otter verilerinize erişimini onaylamak için terminalinizde gösterilen cihaz kodunu girin.",
  deviceCode: "Cihaz kodu",
  checkDeviceCode: "Devam et",
  checkingDeviceCode: "Kontrol ediliyor…",
  cliAccessRequest: "CLI erişim isteği",
  cliAccessRequestedBy: "İstekte bulunan",
  approveCliAccess: "Erişimi onayla",
  approvingCliAccess: "Onaylanıyor…",
  cliAccessApproved: "CLI bağlandı",
  cliAccessApprovedDescription:
    "Bu sayfayı kapatıp terminalinize dönebilirsiniz.",
  deviceCodeNotFoundOrExpired: "Cihaz kodu bulunamadı veya süresi doldu",
  enterAValidDeviceCode: "Geçerli bir cihaz kodu girin",
  youAreOfflineLoadedDataIsAvailableButEditingRequiresAConnection:
    "Çevrimdışısınız. Yüklenen veriler kullanılabilir ancak düzenleme bağlantı gerektirir.",
  travelTogetherSplitWithEase: "Birlikte seyahat edin, kolayca paylaşın",
  spendYourTimeOnTheJourney: "Zamanınızı yolculuğa ayırın,",
  andLeaveTheSplittingToOtter: "gider paylaşımını otter'a bırakın.",
  fromDinnerToAFullTripRecordEverySharedExpenseAndKeepGroupFinancesSimpleAndClear:
    "Akşam yemeğinden tüm seyahate kadar her ortak gideri kaydedin; grup hesaplarını basit ve anlaşılır tutun.",
  splitExampleAWeekendTripDinnerCostsTwd1800ForThreePeopleOrTwd600Each:
    "Paylaşım örneği: hafta sonu gezisinde üç kişilik akşam yemeği 1.800 TWD, kişi başı 600 TWD tutar.",
  weekendTrip: "Hafta sonu gezisi",
  splitExample: "Paylaşım örneği",
  dinnerTogether: "Birlikte akşam yemeği",
  you: "Siz",
  a: "A",
  y: "Y",
  splitEquallyAmong3: "3 kişi arasında eşit paylaş",
  each: "kişi başı",
  quicklyRecordSharedExpenses: "Ortak giderleri hızlıca kaydedin",
  seeWhoOwesAndWhoIsOwedAtAGlance:
    "Kimin borçlu, kimin alacaklı olduğunu bir bakışta görün",
  settleUpWithClearSuggestions: "Açık önerilerle hesabı kapatın",
  signIn: "Oturum aç",
  createAccount: "Hesap oluştur",
  welcomeBackContinueYourJourney:
    "Tekrar hoş geldiniz. Yolculuğunuza devam edin.",
  createYourFirstGroupAndStartSplittingWithEase:
    "İlk grubunuzu oluşturun ve giderleri kolayca paylaşmaya başlayın.",
  username: "Kullanıcı adı",
  enterAUsername: "Bir kullanıcı adı girin",
  password: "Parola",
  enterAPassword: "Bir parola girin",
  developmentCredentialsHaveBeenFilledIn:
    "Geliştirme ortamı giriş bilgileri dolduruldu.",
  signingIn: "Oturum açılıyor…",
  or: "veya",
  signInWithAPasskey: "Passkey ile oturum aç",
  signingInWithAPasskey: "Passkey ile oturum açılıyor…",
  unableToSignInWithAPasskey:
    "Passkey ile oturum açılamadı. Tekrar deneyin veya parolanızı kullanın.",
  needAnAccount: "Hesaba mı ihtiyacınız var?",
  usernameIsNotCaseSensitive:
    "Kullanıcı adı büyük/küçük harfe duyarlı değildir.",
  passwordMustBeAtLeast8Characters: "Parola en az 8 karakter olmalıdır",
  passwordMustBeAtLeast8Characters2: "Parola en az 8 karakter olmalıdır.",
  creating: "Oluşturuluyor…",
  createAccountWithAPasskey: "Passkey ile hesap oluştur",
  creatingAccountWithAPasskey: "Passkey ile hesap oluşturuluyor…",
  unableToCreateAccountWithAPasskey:
    "Passkey ile hesap oluşturulamadı. Tekrar deneyin.",
  alreadyHaveAnAccount: "Zaten hesabınız var mı?",
  backToSignIn: "Oturum açmaya dön",
  expenseParticipantsDoNotNeedAccountsToBeIncludedInAGroup:
    "Gider katılımcılarının gruba dahil olmak için hesaba ihtiyacı yoktur.",
  changeNameSUsername: (values: MessageValues) =>
    interpolate("{name} için kullanıcı adını değiştir", values),
  nameSAccountMenu: (values: MessageValues) =>
    interpolate("{name} için hesap menüsü", values),
  unableToUpdateUsername: "Kullanıcı adı güncellenemedi",
  changeUsername: "Kullanıcı adını değiştir",
  passkeyRegistrationRequestsTooFrequent:
    "Çok fazla Passkey kayıt isteği. Daha sonra tekrar deneyin.",
  passkeyRegistrationResponseIsInvalid: "Passkey kayıt yanıtı geçersiz",
  passkeyRegistrationRequestExpired:
    "Passkey kayıt isteğinin süresi doldu. Tekrar deneyin.",
  unableToVerifyPasskey: "Passkey doğrulanamadı. Tekrar deneyin.",
  passkeyAlreadyRegistered: "Bu Passkey zaten kayıtlı",
  passkeyNotFound: "Passkey bulunamadı",
  cannotRemoveOnlyPasskey:
    "Hesap erişiminizi kaybetmeden tek Passkey'inizi kaldıramazsınız",
  passkeyLoginResponseIsInvalid: "Passkey oturum açma yanıtı geçersiz",
  passkeyLoginRequestExpired:
    "Passkey oturum açma isteğinin süresi doldu. Tekrar deneyin.",
  unableToUsePasskeyToSignIn: "Bu Passkey ile oturum açılamadı",
  cancel: "İptal",
  saving: "Kaydediliyor…",
  save: "Kaydet",
  connectionFailedPleaseTryAgainLater:
    "Bağlantı başarısız. Lütfen daha sonra tekrar deneyin.",
  theServerReturnedAnInvalidResponse: "Sunucu geçersiz bir yanıt döndürdü.",
  everyone: "Herkes",
  unknown: "Bilinmiyor",
  atLeastOneParticipantIsRequired: "En az bir katılımcı gereklidir",
  usedByAnExpense: "Bir giderde kullanılıyor",
  youAreOfflineReconnectAndTryAgain:
    "Çevrimdışısınız. Yeniden bağlanıp tekrar deneyin.",
  working: "İşleniyor…",
  unableToApplyChanges: "Değişiklikler uygulanamadı",
  applying: "Uygulanıyor…",
  noBalancesYet: "Henüz bakiye yok.",
  settled: "Hesap kapandı",
  getsBack: "Alacaklı",
  owes: "Borçlu",
  newTaiwanDollar: "Yeni Tayvan doları",
  japaneseYen: "Japon yeni",
  usDollar: "ABD doları",
  euro: "Avro",
  singaporeDollar: "Singapur doları",
  poundSterling: "İngiliz sterlini",
  australianDollar: "Avustralya doları",
  canadianDollar: "Kanada doları",
  southKoreanWon: "Güney Kore wonu",
  food: "Yemek",
  transport: "Ulaşım",
  lodging: "Konaklama",
  tickets: "Biletler",
  shopping: "Alışveriş",
  other: "Diğer",
  unsavedChangesWillBeLostDiscardTheDraft:
    "Kaydedilmemiş değişiklikler kaybolur. Taslak silinsin mi?",
  unableToSwitchGroups: "Grup değiştirilemedi",
  loadingGroup: "Grup yükleniyor",
  yourSelectionWillAppearAfterItsDataLoads:
    "Seçiminiz verileri yüklendikten sonra görünür.",
  unableToLoadGroup: "Grup yüklenemedi",
  groupSwitcher: "Grup değiştirici",
  groups: "Gruplar",
  countActiveGroups: (values: MessageValues) =>
    interpolate("{count} etkin grup", values),
  everyTripAddsUpToSomethingWonderful: "Her yolculuk güzel anılar biriktirir.",
  recordSharedExpensesAndFocusOnThePeopleBesideYou:
    "Ortak giderleri kaydedin ve yanınızdaki insanlara odaklanın.",
  archivedAndReadOnlyDataIsPreservedTheOwnerCanRestoreItUnderMore:
    "Arşivlenmiş ve salt okunur. Veriler korunur; grup sahibi Grup ayarları bölümünden geri yükleyebilir.",
  addTravelCompanionsFirst: "Önce yol arkadaşlarını ekleyin",
  thereIsOnlyOneParticipantAddSomeoneToSplitWithBeforeRecordingTheFirstExpense:
    "Yalnızca bir katılımcı var. İlk gideri kaydetmeden önce paylaşacağınız birini ekleyin.",
  addExpenseParticipant: "Gider katılımcısı ekle",
  switchGroups: "Grup değiştir",
  youWillLeaveTheCurrentGroupOnlyAfterTheNewOneLoads:
    "Mevcut gruptan yalnızca yeni grup yüklendikten sonra ayrılırsınız.",
  participantsPeopleExpensesExpensesCurrency: (values: MessageValues) =>
    interpolate("{participants} kişi · {expenses} gider · {currency}", values),
  archived: "Arşivlendi",
  everydayMomentsTogether: "Birlikte günlük anlar",
  collaborator: "Ortak düzenleyici",
  owner: "Grup sahibi",
  baseCurrencyCurrency: (values: MessageValues) =>
    interpolate("Temel para birimi {currency}", values),
  usingCustomExchangeRates: "Özel döviz kurları kullanılıyor",
  usingBankOfTaiwanExchangeRates:
    "Bank of Taiwan varsayılan kurları kullanılıyor",
  usingFixedFallbackRates:
    "Bank of Taiwan kullanılamıyor; sabit yedek kurlar kullanılıyor",
  loadingGroup2: "Grup yükleniyor…",
  people: "Kişiler",
  expenses: "Giderler",
  base: "Temel",
  overview: "Genel bakış",
  more: "Diğer",
  groupWorkspace: "Grup çalışma alanı",
  addExpense: "Gider ekle",
  archivedGroups: "Arşivlenen gruplar",
  unableToCreateGroup: "Grup oluşturulamadı",
  createGroup: "Grup oluştur",
  addCompanionsAfterCreatingTheGroupThenRecordSharedExpenses:
    "Grubu oluşturduktan sonra yol arkadaşlarını ekleyin, ardından ortak giderleri kaydedin.",
  groupName: "Grup adı",
  fiveDaysInTokyo: "Tokyo'da beş gün",
  baseCurrency: "Temel para birimi",
  createYourFirstGroup: "İlk grubunuzu oluşturun",
  addATripOrEventGroupOrCreateOneFromAnExistingJsonBackup:
    "Bir seyahat veya etkinlik grubu ekleyin ya da mevcut bir JSON yedeğinden grup oluşturun.",
  groupExpenseSummary: "Grup gider özeti",
  totalSharedExpenses: "Toplam ortak giderler",
  convertedToBaseCurrency: "Temel para birimine dönüştürüldü",
  outstanding: "Ödenmemiş",
  countSuggestedPaymentsToSettleUp: (values: MessageValues) =>
    interpolate("Hesabı kapatmak için {count} önerilen ödeme", values),
  nothingIsCurrentlyOutstanding: "Şu anda ödenmemiş tutar yok",
  settlementSuggestionsAppearAfterExpensesAreAdded:
    "Giderler eklendikten sonra hesap kapatma önerileri görünür",
  expenseRecords: "Gider kayıtları",
  sharedAmongCountPeople: (values: MessageValues) =>
    interpolate("{count} kişi arasında paylaşıldı", values),
  calculatedFromCurrentExpensesAndRecordedPayments:
    "Mevcut giderlerden ve kayıtlı ödemelerden hesaplanır.",
  settleUp: "Hesabı kapat",
  countEntries: (values: MessageValues) => interpolate("{count} kayıt", values),
  entries: "kayıt",
  seePaymentsAndSharesAtAGlance:
    "Ödenen tutarları ve payları bir bakışta görün.",
  balances: "Bakiyeler",
  recentExpenses: "Son giderler",
  noExpensesYet: "Henüz gider yok",
  thisGroupHasNotRecordedAnySharedExpenses:
    "Bu grupta henüz ortak gider kaydedilmedi.",
  recordTheFirstSharedExpense: "İlk ortak gideri kaydet",
  addThePeopleSplittingExpensesToCalculateEachBalance:
    "Önce giderleri paylaşan kişileri ekleyin, ardından ilk giderinizi kaydedin. Bakiyeler ve hesap kapatma önerileri otomatik olarak görünür.",
  balancesAndSettlementSuggestionsWillAppearHereAfterYouAddExpenses:
    "Gider ekledikten sonra bakiyeler ve hesap kapatma önerileri burada görünür.",
  addPerson: "Kişi ekle",
  managePeople: "Kişileri yönet",
  everythingIsSettled: "Tüm hesaplar kapandı",
  thereAreNoOutstandingPayments: "Ödenmemiş ödeme yok.",
  paymentRecorded: "Ödeme kaydedildi",
  unableToRecordPayment: "Ödeme kaydedilemedi",
  recordPayment: "Ödeme kaydet",
  recordSettlementPayment: "Hesap kapatma ödemesi kaydet",
  fromPaysToTheFullSuggestedAmountIsPrefilled: (values: MessageValues) =>
    interpolate(
      "{from}, {to} kişisine ödeme yapar; önerilen tutarın tamamı önceden dolduruldu.",
      values,
    ),
  paymentAmountCurrency: (values: MessageValues) =>
    interpolate("Ödeme tutarı ({currency})", values),
  enterAPaymentAmount: "Bir ödeme tutarı girin",
  thePaymentMustBeGreaterThan0AndNoMoreThanTheSuggestedAmount:
    "Ödeme 0'dan büyük olmalı ve önerilen tutarı aşmamalıdır",
  expectedRemainder: "Beklenen kalan tutar: ",
  paymentDate: "Ödeme tarihi",
  noteOptional: "Not (isteğe bağlı)",
  recordPayment2: "Ödeme kaydet",
  paymentHistory: "Ödeme geçmişi",
  dateFromPaidTo: (values: MessageValues) =>
    interpolate("{date} · {from}, {to} kişisine ödeme yaptı", values),
  deletePayment: "Ödemeyi sil",
  remainingSettlementSuggestionsWillBeRecalculated:
    "Kalan hesap kapatma önerileri yeniden hesaplanır.",
  paymentDeleted: "Ödeme silindi",
  deleteFailed: "Silme başarısız",
  deleteThisPayment: "Bu ödeme silinsin mi?",
  delete: "Sil",
  datePaidByNameSplitWithSplit: (values: MessageValues) =>
    interpolate("{date} · ödeyen: {name} · paylaşanlar: {split}", values),
  settlementRepresentative: "Hesabı kapatacak kişi",
  settledByName: (values: MessageValues) =>
    interpolate("Hesabı kapatacak kişi: {name}", values),
  settleSeparately: "Kendisi (ayrı hesap kapatma)",
  settlementRepresentativeHelp:
    "Giderler kişi başına paylaşılır; bakiyeler ve hesap kapatma önerileri kişinin net bakiyesini temsilcisinin altında toplar. Temsilciler başka bir kişiye atanamaz.",
  representativeHasDependents:
    "Bu kişiye atanmış başka üyeler var. Önce bu atamaları kaldırın.",
  settlementRepresentativeUpdated: "Hesap kapatma temsilcisi güncellendi",
  unableToUpdateSettlementRepresentative:
    "Hesap kapatma temsilcisi güncellenemedi",
  provideParticipantChanges: "Güncellenecek katılımcı bilgilerini belirtin",
  invalidSettlementRepresentative: "Geçersiz hesap kapatma temsilcisi",
  settlementRepresentativeMustBeAnotherGroupMember:
    "Hesap kapatma temsilcisi bu grubun başka bir üyesi olmalıdır",
  settlementRepresentativeCannotBeAssignedOrHaveDependents:
    "Temsilci hesabını başka biri aracılığıyla kapatamaz ve bu kişinin aracılığıyla hesabını kapatan üyeleri olamaz",
  invalidBackupSettlementRepresentative:
    "Yedekteki hesap kapatma temsilcisi geçersiz",
  expenseParticipantAdded: "Gider katılımcısı eklendi",
  unableToAddPerson: "Kişi eklenemedi",
  expenseParticipantsDoNotNeedToSignInManageAccountsWithAccessUnderMoreSharingAndAccess:
    "Gider katılımcılarının oturum açmasına gerek yoktur. Erişimi olan hesapları Grup ayarları → Paylaşım ve erişim bölümünden yönetin.",
  personsName: "Kişinin adı",
  friendsName: "Arkadaşın adı",
  enterAName: "Bir ad girin",
  archivedGroupsAreReadOnlyRestoreThisGroupToChangeParticipants:
    "Arşivlenen gruplar salt okunurdur. Katılımcıları değiştirmek için bu grubu geri yükleyin.",
  usedByAPayment: "Bir ödemede kullanılıyor",
  cannotDeleteReasonUpdateRelatedExpensesFirstOrUseTheMergeToolBelow: (
    values: MessageValues,
  ) =>
    interpolate(
      "Silinemiyor: {reason}. Önce ilgili giderleri güncelleyin veya aşağıdaki birleştirme aracını kullanın.",
      values,
    ),
  deleteName2: (values: MessageValues) =>
    interpolate("{name} kişisini sil", values),
  thisPersonHasNoExpensesOrPaymentsDeletionCannotBeUndone:
    "Bu kişinin gideri veya ödemesi yok. Silme işlemi geri alınamaz.",
  expenseParticipantDeleted: "Gider katılımcısı silindi",
  deleteThisExpenseParticipant: "Bu gider katılımcısı silinsin mi?",
  nameUpdated: "Ad güncellendi",
  unableToUpdateName: "Ad güncellenemedi",
  rename: "Yeniden adlandır",
  renameName: (values: MessageValues) =>
    interpolate("{name} kişisini yeniden adlandır", values),
  existingExpensesAndPaymentsWillRemainLinkedToThisPerson:
    "Mevcut giderler ve ödemeler bu kişiye bağlı kalır.",
  newName: "Yeni ad",
  saveName: "Adı kaydet",
  advancedPeopleTools: "Gelişmiş kişi araçları",
  mergeDuplicatePeople: "Yinelenen kişileri birleştir",
  sourcePerson: "Kaynak kişi",
  targetPerson: "Hedef kişi",
  mergeInto: "Birleştirilecek kişi",
  changePreview: "Değişiklik önizlemesi",
  expensesRelatedExpensesAndPaymentsPaymentsForSourceWillMoveToTargetThenTheSourcePersonWillBeDeleted:
    (values: MessageValues) =>
      interpolate(
        "{source} kişisine ait {expenses} ilgili gider ve {payments} ödeme, {target} kişisine aktarılır; ardından kaynak kişi silinir.",
        values,
      ),
  mergePeople: "Kişileri birleştir",
  sourceWillBeDeletedAndRelatedDataWillBeTransferredToTargetAtomically: (
    values: MessageValues,
  ) =>
    interpolate(
      "{source} silinir ve ilgili veriler bölünmez tek bir işlemde {target} kişisine aktarılır.",
      values,
    ),
  expenseParticipantsMerged: "Gider katılımcıları birleştirildi",
  mergeFailed: "Birleştirme başarısız",
  applyMerge: "Birleştirme uygulansın mı?",
  previewAndMerge: "Önizle ve birleştir",
  language: "Dil",
  english: "İngilizce",
  traditionalChinese: "Geleneksel Çince",
} satisfies CatalogShape<typeof zhTW>;
