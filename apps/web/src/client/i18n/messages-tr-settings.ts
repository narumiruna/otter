import { interpolate, type MessageValues } from "./message-types.js";

export const trSettings = {
  accountSettings: "Hesap ayarları",
  manageYourUsernameAndPasskeys:
    "Görünümü, dili, kullanıcı adını, Passkey'leri ve API belirteçlerini yönetin.",
  appearance: "Görünüm",
  chooseHowOtterLooksOnThisBrowser:
    "Otter'ın görünümünü seçin. Değişiklikler hemen uygulanır ve bu tarayıcıda kaydedilir.",
  colorTheme: "Renk teması",
  forestTheme: "Orman",
  oceanTheme: "Okyanus",
  lavenderTheme: "Lavanta",
  sunsetTheme: "Gün batımı",
  roseTheme: "Gül",
  displayMode: "Görüntüleme modu",
  systemMode: "Sistem",
  lightMode: "Açık",
  darkMode: "Koyu",
  useTheNewUsernameTheNextTimeYouSignInYourCurrentSessionWillContinue:
    "Bir sonraki girişinizde yeni kullanıcı adını kullanın. Mevcut oturumunuz devam eder.",
  passkeys: "Passkey'ler",
  useAPasskeyToSignInWithoutYourPassword:
    "Parolanızı girmeden oturum açmak için cihazınızın kilit açma yöntemini kullanın.",
  unableToLoadPasskeys: "Passkey'ler yüklenemedi",
  unableToAddPasskey: "Passkey eklenemedi. İptal ettiyseniz tekrar deneyin.",
  unableToRemovePasskey: "Passkey kaldırılamadı",
  passkeyAdded: "Passkey eklendi",
  passkeyRemoved: "Passkey kaldırıldı",
  passkeyNumber: (values: MessageValues) =>
    interpolate("Passkey {number}", values),
  addedOnDate: (values: MessageValues) =>
    interpolate("Eklenme tarihi: {date}", values),
  removePasskeyNumber: (values: MessageValues) =>
    interpolate("Passkey {number} öğesini kaldır", values),
  noPasskeysAdded: "Henüz Passkey eklenmedi.",
  addingPasskey: "Passkey ekleniyor…",
  addPasskey: "Passkey ekle",
  thisBrowserDoesNotSupportPasskeys: "Bu tarayıcı Passkey'leri desteklemiyor.",
  apiTokens: "API belirteçleri",
  useApiTokensWithTheOtterCli:
    "Otter CLI veya otomasyon araçları için Bearer belirteçleri oluşturun.",
  loadingApiTokens: "API belirteçleri yükleniyor…",
  unableToLoadApiTokens: "API belirteçleri yüklenemedi",
  unableToCreateApiToken: "API belirteci oluşturulamadı",
  apiTokenCreationUncertain:
    "Belirteç isteğinin sonucu bilinmiyor. Başka bir belirteç oluşturmadan önce bu isteği tekrar deneyin.",
  retryApiTokenCreation: "Belirteç oluşturmayı tekrar dene",
  unableToRevokeApiToken: "API belirteci iptal edilemedi",
  unableToCopyApiToken: "API belirteci kopyalanamadı",
  apiTokenRevoked: "API belirteci iptal edildi",
  apiTokenCopied: "API belirteci kopyalandı",
  enterATokenName: "Bir belirteç adı girin",
  newApiToken: "Yeni API belirteci",
  copyYourApiTokenNow: "API belirtecinizi şimdi kopyalayın",
  apiTokenShownOnce:
    "Bu belirteç yalnızca bir kez gösterilir. Sayfadan ayrıldıktan sonra tekrar göremezsiniz.",
  copyToken: "Belirteci kopyala",
  done: "Bitti",
  tokenName: "Belirteç adı",
  tokenNameExample: "Örneğin: Seyahat otomasyonu",
  creatingApiToken: "Belirteç oluşturuluyor…",
  createApiToken: "API belirteci oluştur",
  apiTokenDates: (values: MessageValues) =>
    interpolate("Oluşturulma: {created} · Son kullanma: {expires}", values),
  revokeNamedApiToken: (values: MessageValues) =>
    interpolate("“{name}” API belirtecini iptal et", values),
  noActiveApiTokens: "Etkin API belirteci yok.",
  apiTokensExpireAfter90Days:
    "Belirteçler 90 gün sonra sona erer. CLI ile kullanmak için belirteci şu değişkene atayın:",
  groupSettings: "Grup ayarları",
  manageSharingGroupPreferencesAndDataToolsHighImpactActionsRequireConfirmation:
    "Paylaşımı, grup tercihlerini ve veri araçlarını yönetin. Önemli etkileri olan işlemler onay gerektirir.",
  youAreACollaboratorAndCanUseDataToolsOnlyTheOwnerCanManageAccessAndGroupSettings:
    "Ortak düzenleyici olarak veri araçlarını kullanabilirsiniz. Erişimi ve grup ayarlarını yalnızca grup sahibi yönetebilir.",
  sharingAndAccess: "Paylaşım ve erişim",
  linksActiveLinksCollaboratorsCollaborators: (values: MessageValues) =>
    interpolate(
      "{links} etkin bağlantı · {collaborators} ortak düzenleyici",
      values,
    ),
  shareLinkCreated: "Paylaşım bağlantısı oluşturuldu",
  shareLinkCreatedAndCopied: "Paylaşım bağlantısı oluşturuldu ve kopyalandı",
  shareLinks: "Paylaşım bağlantıları",
  chooseWhoCanEditThroughTheShareLink:
    "Bu bağlantıyla kimlerin görüntüleyebileceğini veya düzenleyebileceğini seçin.",
  linkPermission: "Bağlantı izni",
  readOnlyLink: "Salt okunur (oturum açmadan)",
  signedInEditLink: "Oturum açtıktan sonra düzenleme",
  anyoneEditLink: "Bağlantıya sahip herkes düzenleyebilir",
  signedInEditLinkDescription:
    "Ziyaretçiler oturum açtıktan veya kaydolduktan sonra ortak düzenleyici olur. Bağlantıyı iptal etmek daha önce katılan kişileri kaldırmaz.",
  anyoneEditLinkDescription:
    "Bağlantıya sahip herkes oturum açmadan giderleri ve katılımcıları düzenleyebilir. Yalnızca güvendiğiniz kişilerle paylaşın; iptal işlemi hemen geçerli olur.",
  revokingSignedInLinkDoesNotRemoveExistingCollaborators:
    "İptal etmek yeni katılımları engeller. Mevcut ortak düzenleyiciler düzenlemeye devam edebilir; erişimlerini ayrıca kaldırın.",
  signInToEditSharedGroup: (values: MessageValues) =>
    interpolate(
      "{name} grubunu düzenlemek için oturum açın veya hesap oluşturun.",
      values,
    ),
  readOnlyShareLinkCreated: "Salt okunur paylaşım bağlantısı oluşturuldu",
  readOnlyShareLinkCreatedAndCopied:
    "Salt okunur paylaşım bağlantısı oluşturuldu ve kopyalandı",
  shareLinkCreatedYourBrowserBlockedAutomaticCopyingCopyItManually:
    "Paylaşım bağlantısı oluşturuldu. Tarayıcınız otomatik kopyalamayı engelledi; elle kopyalayın.",
  unableToCreateLink: "Bağlantı oluşturulamadı",
  shareLinkCopied: "Paylaşım bağlantısı kopyalandı",
  yourBrowserBlockedCopyingOpenTheLinkAndCopyItFromTheAddressBar:
    "Tarayıcınız kopyalamayı engelledi. Bağlantıyı açın ve adres çubuğundan kopyalayın.",
  anyoneWithTheLinkCanViewExpensesBalancesAndSettlementsWithoutSigningInButCannotEdit:
    "Bağlantıya sahip herkes oturum açmadan giderleri, bakiyeleri ve hesap kapatma ödemelerini görebilir ancak düzenleyemez.",
  readOnlyShareLinks: "Salt okunur paylaşım bağlantıları",
  createReadOnlyLink: "Salt okunur bağlantı oluştur",
  anyoneWithTheLinkCanViewThisGroupsExpensesBalancesAndSettlementSuggestionsButCannotAddOrChangeData:
    "Bağlantıya sahip herkes bu grubun giderlerini, bakiyelerini ve hesap kapatma önerilerini görebilir ancak veri ekleyemez veya değiştiremez.",
  createAShareLink: "Paylaşım bağlantısı oluşturulsun mu?",
  createShareLink: "Paylaşım bağlantısı oluştur",
  revoked: "İptal edildi",
  active: "Etkin",
  openLink: "Bağlantıyı aç",
  copy: "Kopyala",
  revokeLink: "Bağlantıyı iptal et",
  afterRevocationTheOldLinkWillImmediatelyStopWorking:
    "İptal edildikten sonra eski bağlantı hemen çalışmayı durdurur.",
  shareLinkRevoked: "Paylaşım bağlantısı iptal edildi",
  revokeThisShareLink: "Bu paylaşım bağlantısı iptal edilsin mi?",
  revoke: "İptal et",
  noShareLinksYet: "Henüz paylaşım bağlantısı yok.",
  collaboratorAdded: "Ortak düzenleyici eklendi",
  unableToAddCollaborator: "Ortak düzenleyici eklenemedi",
  collaboratorsMustBeExistingUsersTheyCanManageExpensesAndParticipantsButNotOwnerSettings:
    "Ortak düzenleyiciler mevcut kullanıcılar olmalıdır. Giderleri ve katılımcıları yönetebilirler ancak grup sahibinin ayarlarını değiştiremezler.",
  existingUsersUsername: "Mevcut kullanıcının kullanıcı adı",
  addCollaborator: "Ortak düzenleyici ekle",
  removeName: (values: MessageValues) =>
    interpolate("{name} kişisini kaldır", values),
  thisAccountWillNoLongerBeAbleToManageTheGroupExistingExpenseDataWillRemain:
    "Bu hesap artık grubu yönetemeyecek. Mevcut gider verileri korunacak.",
  collaboratorRemoved: "Ortak düzenleyici kaldırıldı",
  removeCollaborator: "Ortak düzenleyici kaldırılsın mı?",
  remove: "Kaldır",
  dataAndExport: "Veriler ve dışa aktarma",
  csvPrintBackupAndRestore: "CSV, yazdırma, yedekleme ve geri yükleme",
  exportingDoesNotChangeGroupData: "Dışa aktarma grup verilerini değiştirmez.",
  exportAndPrint: "Dışa aktar ve yazdır",
  expenseCsvExported: "Gider CSV dosyası dışa aktarıldı",
  exportExpenseCsv: "Gider CSV dosyasını dışa aktar",
  settlementCsvExported: "Hesap kapatma CSV dosyası dışa aktarıldı",
  exportSettlementCsv: "Hesap kapatma CSV dosyasını dışa aktar",
  print: "Yazdır",
  completeBackupDownloaded: "Tam yedek indirildi",
  downloadFailed: "İndirme başarısız",
  downloadCompleteBackup: "Tam yedeği indir",
  expenseCsvImported: "Gider CSV dosyası içe aktarıldı",
  importFailed: "İçe aktarma başarısız",
  allRowsAreCheckedFirstNoDataIsWrittenIfAnyRowHasAnError:
    "Önce tüm satırlar kontrol edilir. Herhangi bir satırda hata varsa hiçbir veri yazılmaz.",
  importExpenseCsv: "Gider CSV dosyasını içe aktar",
  chooseCsv: "CSV seç",
  importPreview: "İçe aktarma önizlemesi",
  rowsRowsCanBeImportedErrorsErrors: (values: MessageValues) =>
    interpolate("{rows} satır içe aktarılabilir; {errors} hata.", values),
  rowRowMessage: (values: MessageValues) =>
    interpolate("Satır {row}: {message}", values),
  importCountExpenses: (values: MessageValues) =>
    interpolate("{count} gideri içe aktar", values),
  thisWillAddCountExpensesAtOnceAndRecalculateBalances: (
    values: MessageValues,
  ) =>
    interpolate(
      "Bu işlem tek seferde {count} gider ekler ve bakiyeleri yeniden hesaplar.",
      values,
    ),
  applyCsvImport: "CSV içe aktarma uygulansın mı?",
  applyImport: "İçe aktarmayı uygula",
  invalidBackupFormat: "Geçersiz yedek biçimi",
  backupRestoredAsANewGroup: "Yedek yeni bir grup olarak geri yüklendi",
  restoreFailed: "Geri yükleme başarısız",
  restoringCreatesANewGroupAndDoesNotOverwriteCurrentData:
    "Geri yükleme yeni bir grup oluşturur ve mevcut verilerin üzerine yazmaz.",
  restoreJsonBackup: "JSON yedeğini geri yükle",
  chooseJsonBackup: "JSON yedeği seç",
  restorePreviewName: (values: MessageValues) =>
    interpolate("Geri yükleme önizlemesi: {name}", values),
  peoplePeopleExpensesExpensesPaymentsPaymentsBaseCurrency: (
    values: MessageValues,
  ) =>
    interpolate(
      "{people} kişi · {expenses} gider · {payments} ödeme · temel para birimi {currency}",
      values,
    ),
  createNewGroup: "Yeni grup oluştur",
  aNewGroupNamedNameWillBeCreatedWithoutChangingExistingGroups: (
    values: MessageValues,
  ) =>
    interpolate(
      "Mevcut gruplar değiştirilmeden “{name}” adlı yeni bir grup oluşturulacak.",
      values,
    ),
  restoreThisBackup: "Bu yedek geri yüklensin mi?",
  createNewGroup2: "Yeni grup oluştur",
  copyGroup: "Grubu çoğalt",
  copyThisGroup: "Bu grup çoğaltılsın mı?",
  copyGroupDescription:
    "Kişileri, temel para birimini ve özel kurları yeni bir gruba kopyalayın. Giderler, hesap kapatma ödemeleri, ortak düzenleyiciler ve paylaşım bağlantıları kopyalanmaz. Asıl grup değişmez.",
  groupCopied: "Grup çoğaltıldı",
  groupPreferences: "Grup tercihleri",
  changingTheBaseCurrencyRecalculatesDisplayedAmountsAndClearsCustomExchangeRates:
    "Temel para birimini değiştirmek görüntülenen tutarları yeniden hesaplar ve özel döviz kurlarını temizler.",
  nameAndBaseCurrency: "Ad ve temel para birimi",
  totalSpendingWillDisplayAsAmountBalancesAndSettlementsBelowWillBeConverted: (
    values: MessageValues,
  ) =>
    interpolate(
      "Toplam harcama {amount} olarak gösterilecek; aşağıdaki bakiyeler ve hesap kapatma ödemeleri dönüştürülecek.",
      values,
    ),
  expectCountSettlementSuggestionsCustomRatesWillResetToBuiltInValues: (
    values: MessageValues,
  ) =>
    interpolate(
      "{count} hesap kapatma önerisi bekleniyor; özel kurlar Bank of Taiwan varsayılanlarına sıfırlanacak.",
      values,
    ),
  cancelChanges: "Değişiklikleri iptal et",
  applyGroupPreferences: "Grup tercihlerini uygula",
  changeTheBaseCurrencyToCurrencyRecalculateAllResultsAndClearCustomRates: (
    values: MessageValues,
  ) =>
    interpolate(
      "Temel para birimini {currency} olarak değiştir, tüm sonuçları yeniden hesapla ve özel kurları temizle.",
      values,
    ),
  renameTheGroupToName: (values: MessageValues) =>
    interpolate("Grubun adını “{name}” olarak değiştir.", values),
  applyTheseChanges: "Bu değişiklikler uygulansın mı?",
  applyChanges: "Değişiklikleri uygula",
  groupPreferencesApplied: "Grup tercihleri uygulandı",
  saveFailed: "Kaydetme başarısız",
  customExchangeRatesApplied: "Özel döviz kurları uygulandı",
  unableToSaveExchangeRates: "Döviz kurları kaydedilemedi",
  currencyConversion: "Para birimi dönüştürme",
  countCustomRates: (values: MessageValues) =>
    interpolate("{count} özel kur", values),
  setHowMuch1UnitOfEachCurrencyEqualsInCurrencyLeaveBlankToUseTheBuiltInFixedRate:
    (values: MessageValues) =>
      interpolate(
        "Her para biriminin 1 biriminin {currency} karşılığını belirleyin. Belirlenmeyen kurlarda otomatik olarak Bank of Taiwan spot alış-satış ortalaması kullanılır.",
        values,
      ),
  customExchangeRates: "Özel döviz kurları",
  bankOfTaiwanSpotMidRateDescription:
    "Özel kuru olmayan yeni giderler Bank of Taiwan spot alış-satış ortalamasını kullanır ve bu kuru korur. Özel kurları temizlemek sonraki giderleri etkiler; ödemeler güncel kurları kullanmaya devam eder.",
  loadBankOfTaiwanSpotMidRates: "Bank of Taiwan varsayılan kurlarını yükle",
  loadingBankExchangeRates: "Banka döviz kurları yükleniyor…",
  bankOfTaiwanSpotMidRatesLoadedAtTime: (values: MessageValues) =>
    interpolate(
      "Bank of Taiwan spot alış-satış ortalama kurları yüklendi ({time}).",
      values,
    ),
  bankOfTaiwanDefaultRatesApplied:
    "Bank of Taiwan varsayılan kurları geri yüklendi",
  unableToLoadBankExchangeRates:
    "Banka döviz kurları şu anda kullanılamıyor. Daha sonra tekrar deneyin.",
  conversionPreview: "Dönüştürme önizlemesi",
  totalSpendingAmountCountSettlementSuggestions: (values: MessageValues) =>
    interpolate(
      "Toplam harcama: {amount} · {count} hesap kapatma önerisi.",
      values,
    ),
  applyRates: "Kurları uygula",
  allTotalsBalancesAndSettlementSuggestionsWillBeRecalculatedWithTheseRates:
    "Mevcut giderler kurlarını korur. Yeni veya yeniden fiyatlandırılan giderler ve mevcut ödemeler güncellenen kurları kullanır.",
  applyCustomExchangeRates: "Özel döviz kurları uygulansın mı?",
  restoreBankOfTaiwanDefaultRates:
    "Bank of Taiwan varsayılan kurları geri yüklensin mi?",
  apiWriteSettings: "API yazma erişimi",
  apiWritesAllowed: "İzin veriliyor",
  apiWritesBlocked: "İzin verilmiyor",
  apiWriteSettingsDescription:
    "Varsayılan olarak API belirteçleri ve CLI bu grubu değiştiremez. Etkinleştirildiğinde API belirteci olan üyeler izinlerine göre düzenleme yapabilir. Tarayıcı işlemleri etkilenmez.",
  allowApiWrites: "API belirteciyle değişikliklere izin ver",
  apiWriteSettingSaved: "API yazma erişimi güncellendi",
  groupLifecycle: "Grup yaşam döngüsü",
  archivedReadOnly: "Arşivlendi · salt okunur",
  active2: "Etkin",
  afterRestoringDataCanBeAddedAndChangedAgain:
    "Geri yükledikten sonra veriler yeniden eklenebilir ve değiştirilebilir.",
  archivingPreservesAllDataButMakesTheGroupReadOnly:
    "Arşivleme tüm verileri korur ancak grubu salt okunur yapar.",
  restoreGroup: "Grubu geri yükle",
  archiveGroup: "Grubu arşivle",
  afterRestoringTheOwnerAndCollaboratorsCanEditDataAgain:
    "Geri yükledikten sonra grup sahibi ve ortak düzenleyiciler verileri yeniden düzenleyebilir.",
  expensesPeopleAndPaymentRecordsArePreservedAndCannotBeChangedWhileArchived:
    "Giderler, kişiler ve ödeme kayıtları korunur ve arşivliyken değiştirilemez.",
  groupRestored: "Grup geri yüklendi",
  groupArchived: "Grup arşivlendi",
  restoreThisGroup: "Bu grup geri yüklensin mi?",
  archiveThisGroup: "Bu grup arşivlensin mi?",
  thisPermanentlyDeletesAllPeopleExpensesReceiptsAndSettlementRecordsAndCannotBeUndone:
    "Bu işlem tüm kişileri, giderleri, makbuzları ve hesap kapatma kayıtlarını kalıcı olarak siler ve geri alınamaz.",
  deleteGroup: "Grubu sil",
  enterNameToConfirm: (values: MessageValues) =>
    interpolate("Onaylamak için “{name}” yazın", values),
  permanentlyDeleteName: (values: MessageValues) =>
    interpolate("“{name}” grubunu kalıcı olarak sil", values),
  thisCannotBeUndoneCancelingMakesNoChanges:
    "Bu işlem geri alınamaz. İptal etmek hiçbir değişiklik yapmaz.",
  permanentlyDeleteThisGroup: "Bu grup kalıcı olarak silinsin mi?",
  permanentlyDeleteGroup: "Grubu kalıcı olarak sil",
  groupDeleted: "Grup silindi",
  readOnlyShare: "Salt okunur paylaşım",
  youCanViewExpensesBalancesAndSettlementSuggestionsButCannotEditData:
    "Giderleri, bakiyeleri ve hesap kapatma önerilerini görebilirsiniz ancak verileri düzenleyemezsiniz.",
  completeExpenseHistory: "Tam gider geçmişi",
  manageGroupSettings: "Grup ayarlarını yönet",
};
