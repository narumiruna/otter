import {
  interpolate,
  type MessageValues,
  pluralForm,
} from "./message-types.js";

// Provisional machine-authored translations; fluent review is pending.
export const hiSettings = {
  groupSettings: "समूह सेटिंग",
  manageSharingGroupPreferencesAndDataToolsHighImpactActionsRequireConfirmation:
    "साझा करना, समूह की प्राथमिकताएँ और डेटा उपकरण प्रबंधित करें। बड़े असर वाली कार्रवाइयों के लिए पुष्टि आवश्यक है।",
  youAreACollaboratorAndCanUseDataToolsOnlyTheOwnerCanManageAccessAndGroupSettings:
    "आप सहयोगी हैं और डेटा उपकरण उपयोग कर सकते हैं। केवल मालिक पहुँच और समूह सेटिंग प्रबंधित कर सकते हैं।",
  sharingAndAccess: "साझा करना और पहुँच",
  linksActiveLinksCollaboratorsCollaborators: (values: MessageValues) =>
    interpolate("सक्रिय लिंक: {links} · सहयोगी: {collaborators}", values),
  shareLinkCreated: "साझा लिंक बनाया गया",
  shareLinkCreatedAndCopied: "साझा लिंक बनाया और कॉपी किया गया",
  shareLinks: "साझा लिंक",
  chooseWhoCanEditThroughTheShareLink: "चुनें कि इस लिंक से कौन देख या बदल सकता है।",
  linkPermission: "लिंक की अनुमति",
  readOnlyLink: "केवल पढ़ने के लिए (साइन इन के बिना)",
  signedInEditLink: "साइन इन करने के बाद बदलें",
  anyoneEditLink: "लिंक वाला कोई भी व्यक्ति बदल सकता है",
  signedInEditLinkDescription:
    "साइन इन या पंजीकरण के बाद आगंतुक सहयोगी बन जाते हैं। लिंक रद्द करने से पहले से जुड़े लोग नहीं हटते।",
  anyoneEditLinkDescription:
    "लिंक वाला कोई भी व्यक्ति साइन इन किए बिना खर्च और प्रतिभागी बदल सकता है। केवल भरोसेमंद लोगों से साझा करें; लिंक रद्द करना तुरंत लागू होता है।",
  revokingSignedInLinkDoesNotRemoveExistingCollaborators:
    "लिंक रद्द करने से नए लोग नहीं जुड़ सकते। मौजूदा सहयोगी अब भी बदलाव कर सकते हैं; उनकी पहुँच अलग से हटाएँ।",
  signInToEditSharedGroup: (values: MessageValues) =>
    interpolate("{name} में बदलाव करने के लिए साइन इन करें या खाता बनाएँ।", values),
  readOnlyShareLinkCreated: "केवल पढ़ने वाला साझा लिंक बनाया गया",
  readOnlyShareLinkCreatedAndCopied:
    "केवल पढ़ने वाला साझा लिंक बनाया और कॉपी किया गया",
  shareLinkCreatedYourBrowserBlockedAutomaticCopyingCopyItManually:
    "साझा लिंक बनाया गया। आपके ब्राउज़र ने अपने आप कॉपी करने से रोक दिया; इसे स्वयं कॉपी करें।",
  unableToCreateLink: "लिंक बनाया नहीं जा सका",
  shareLinkCopied: "साझा लिंक कॉपी किया गया",
  yourBrowserBlockedCopyingOpenTheLinkAndCopyItFromTheAddressBar:
    "आपके ब्राउज़र ने कॉपी करने से रोक दिया। लिंक खोलें और पता बार से कॉपी करें।",
  anyoneWithTheLinkCanViewExpensesBalancesAndSettlementsWithoutSigningInButCannotEdit:
    "लिंक वाला कोई भी व्यक्ति साइन इन किए बिना खर्च, शेष राशियाँ और हिसाब देख सकता है, लेकिन बदल नहीं सकता।",
  readOnlyShareLinks: "केवल पढ़ने वाले साझा लिंक",
  createReadOnlyLink: "केवल पढ़ने वाला लिंक बनाएँ",
  anyoneWithTheLinkCanViewThisGroupsExpensesBalancesAndSettlementSuggestionsButCannotAddOrChangeData:
    "लिंक वाला कोई भी व्यक्ति इस समूह के खर्च, शेष राशियाँ और हिसाब चुकाने के सुझाव देख सकता है, लेकिन डेटा जोड़ या बदल नहीं सकता।",
  createAShareLink: "साझा लिंक बनाएँ?",
  createShareLink: "साझा लिंक बनाएँ",
  revoked: "रद्द",
  active: "सक्रिय",
  openLink: "लिंक खोलें",
  copy: "कॉपी करें",
  revokeLink: "लिंक रद्द करें",
  afterRevocationTheOldLinkWillImmediatelyStopWorking:
    "रद्द करने के बाद पुराना लिंक तुरंत काम करना बंद कर देगा।",
  shareLinkRevoked: "साझा लिंक रद्द किया गया",
  revokeThisShareLink: "यह साझा लिंक रद्द करें?",
  revoke: "रद्द करें",
  noShareLinksYet: "अभी कोई साझा लिंक नहीं है।",
  collaboratorAdded: "सहयोगी जोड़ा गया",
  unableToAddCollaborator: "सहयोगी जोड़ा नहीं जा सका",
  collaboratorsMustBeExistingUsersTheyCanManageExpensesAndParticipantsButNotOwnerSettings:
    "सहयोगी मौजूदा उपयोगकर्ता होने चाहिए। वे खर्च और प्रतिभागी प्रबंधित कर सकते हैं, लेकिन मालिक की सेटिंग नहीं।",
  existingUsersUsername: "मौजूदा उपयोगकर्ता का उपयोगकर्ता नाम",
  addCollaborator: "सहयोगी जोड़ें",
  removeName: (values: MessageValues) => interpolate("{name} को हटाएँ", values),
  thisAccountWillNoLongerBeAbleToManageTheGroupExistingExpenseDataWillRemain:
    "यह खाता अब समूह प्रबंधित नहीं कर सकेगा। मौजूदा खर्च का डेटा बना रहेगा।",
  collaboratorRemoved: "सहयोगी हटाया गया",
  removeCollaborator: "सहयोगी हटाएँ?",
  remove: "हटाएँ",
  dataAndExport: "डेटा और निर्यात",
  csvPrintBackupAndRestore: "CSV, प्रिंट, बैकअप और बहाली",
  exportingDoesNotChangeGroupData: "निर्यात करने से समूह का डेटा नहीं बदलता।",
  exportAndPrint: "निर्यात और प्रिंट",
  expenseCsvExported: "खर्च की CSV निर्यात की गई",
  exportExpenseCsv: "खर्च की CSV निर्यात करें",
  settlementCsvExported: "हिसाब की CSV निर्यात की गई",
  exportSettlementCsv: "हिसाब की CSV निर्यात करें",
  print: "प्रिंट करें",
  completeBackupDownloaded: "पूरा बैकअप डाउनलोड किया गया",
  downloadFailed: "डाउनलोड नहीं हो सका",
  downloadCompleteBackup: "पूरा बैकअप डाउनलोड करें",
  expenseCsvImported: "खर्च की CSV आयात की गई",
  importFailed: "आयात नहीं हो सका",
  allRowsAreCheckedFirstNoDataIsWrittenIfAnyRowHasAnError:
    "पहले सभी पंक्तियों की जाँच होती है। किसी भी पंक्ति में त्रुटि होने पर कोई डेटा नहीं लिखा जाता।",
  importExpenseCsv: "खर्च की CSV आयात करें",
  chooseCsv: "CSV चुनें",
  importPreview: "आयात का पूर्वावलोकन",
  rowsRowsCanBeImportedErrorsErrors: (values: MessageValues) =>
    interpolate("आयात योग्य पंक्तियाँ: {rows}; त्रुटियाँ: {errors}।", values),
  rowRowMessage: (values: MessageValues) =>
    interpolate("पंक्ति {row}: {message}", values),
  importCountExpenses: (values: MessageValues) =>
    interpolate("खर्च आयात करें: {count}", values),
  thisWillAddCountExpensesAtOnceAndRecalculateBalances: (
    values: MessageValues,
  ) =>
    interpolate(
      pluralForm("hi", values.count, {
        one: "इससे एक साथ {count} खर्च जुड़ेगा और शेष राशियों की फिर गणना होगी।",
        other: "इससे एक साथ {count} खर्च जुड़ेंगे और शेष राशियों की फिर गणना होगी।",
      }),
      values,
    ),
  applyCsvImport: "CSV आयात लागू करें?",
  applyImport: "आयात लागू करें",
  invalidBackupFormat: "बैकअप का फ़ॉर्मैट अमान्य है",
  backupRestoredAsANewGroup: "बैकअप नए समूह के रूप में बहाल किया गया",
  restoreFailed: "बहाल नहीं हो सका",
  restoringCreatesANewGroupAndDoesNotOverwriteCurrentData:
    "बहाल करने से नया समूह बनता है और मौजूदा डेटा नहीं बदला जाता।",
  restoreJsonBackup: "JSON बैकअप बहाल करें",
  chooseJsonBackup: "JSON बैकअप चुनें",
  restorePreviewName: (values: MessageValues) =>
    interpolate("बहाली का पूर्वावलोकन: {name}", values),
  peoplePeopleExpensesExpensesPaymentsPaymentsBaseCurrency: (
    values: MessageValues,
  ) =>
    interpolate(
      "लोग: {people} · खर्च: {expenses} · भुगतान: {payments} · मूल मुद्रा: {currency}",
      values,
    ),
  createNewGroup: "नया समूह बनाएँ",
  aNewGroupNamedNameWillBeCreatedWithoutChangingExistingGroups: (
    values: MessageValues,
  ) =>
    interpolate(
      "मौजूदा समूहों को बदले बिना “{name}” नाम का नया समूह बनाया जाएगा।",
      values,
    ),
  restoreThisBackup: "यह बैकअप बहाल करें?",
  createNewGroup2: "नया समूह बनाएँ",
  copyGroup: "समूह की कॉपी बनाएँ",
  copyThisGroup: "इस समूह की कॉपी बनाएँ?",
  copyGroupDescription:
    "लोगों, मूल मुद्रा और कस्टम दरों को नए समूह में कॉपी करें। खर्च, हिसाब चुकाने के भुगतान, सहयोगी और साझा लिंक कॉपी नहीं होते। मूल समूह नहीं बदलता।",
  groupCopied: "समूह की कॉपी बनाई गई",
  groupPreferences: "समूह की प्राथमिकताएँ",
  changingTheBaseCurrencyRecalculatesDisplayedAmountsAndClearsCustomExchangeRates:
    "मूल मुद्रा बदलने से दिखाई गई राशियों की फिर गणना होती है और कस्टम विनिमय दरें हटती हैं।",
  nameAndBaseCurrency: "नाम और मूल मुद्रा",
  totalSpendingWillDisplayAsAmountBalancesAndSettlementsBelowWillBeConverted: (
    values: MessageValues,
  ) =>
    interpolate(
      "कुल खर्च {amount} दिखेगा; नीचे की शेष राशियाँ और हिसाब बदले जाएँगे।",
      values,
    ),
  expectCountSettlementSuggestionsCustomRatesWillResetToBuiltInValues: (
    values: MessageValues,
  ) =>
    interpolate(
      "हिसाब चुकाने के अनुमानित सुझाव: {count}; कस्टम दरें Bank of Taiwan की डिफ़ॉल्ट दरों पर रीसेट होंगी।",
      values,
    ),
  cancelChanges: "बदलाव रद्द करें",
  applyGroupPreferences: "समूह की प्राथमिकताएँ लागू करें",
  changeTheBaseCurrencyToCurrencyRecalculateAllResultsAndClearCustomRates: (
    values: MessageValues,
  ) =>
    interpolate(
      "मूल मुद्रा {currency} करें, सभी परिणामों की फिर गणना करें और कस्टम दरें हटाएँ।",
      values,
    ),
  renameTheGroupToName: (values: MessageValues) =>
    interpolate("समूह का नाम “{name}” करें।", values),
  applyTheseChanges: "ये बदलाव लागू करें?",
  applyChanges: "बदलाव लागू करें",
  groupPreferencesApplied: "समूह की प्राथमिकताएँ लागू की गईं",
  saveFailed: "सहेजा नहीं जा सका",
  customExchangeRatesApplied: "कस्टम विनिमय दरें लागू की गईं",
  unableToSaveExchangeRates: "विनिमय दरें सहेजी नहीं जा सकीं",
  currencyConversion: "मुद्रा परिवर्तन",
  countCustomRates: (values: MessageValues) =>
    interpolate("कस्टम दरें: {count}", values),
  setHowMuch1UnitOfEachCurrencyEqualsInCurrencyLeaveBlankToUseTheBuiltInFixedRate:
    (values: MessageValues) =>
      interpolate(
        "तय करें कि हर मुद्रा की 1 इकाई {currency} में कितनी है। दर तय न होने पर Bank of Taiwan की हाज़िर मध्य दरें अपने आप लागू होती हैं।",
        values,
      ),
  customExchangeRates: "कस्टम विनिमय दरें",
  bankOfTaiwanSpotMidRateDescription:
    "बिना कस्टम दर के नए खर्च Bank of Taiwan की हाज़िर मध्य दर उपयोग करते हैं और उसी दर को रखते हैं। कस्टम दरें हटाने से भविष्य के खर्च प्रभावित होते हैं; भुगतान अब भी वर्तमान दरें उपयोग करते हैं।",
  loadBankOfTaiwanSpotMidRates: "Bank of Taiwan की डिफ़ॉल्ट दरें लोड करें",
  loadingBankExchangeRates: "बैंक की विनिमय दरें लोड हो रही हैं…",
  bankOfTaiwanSpotMidRatesLoadedAtTime: (values: MessageValues) =>
    interpolate("Bank of Taiwan की हाज़िर मध्य दरें लोड की गईं ({time})।", values),
  bankOfTaiwanDefaultRatesApplied: "Bank of Taiwan की डिफ़ॉल्ट दरें बहाल की गईं",
  unableToLoadBankExchangeRates:
    "बैंक की विनिमय दरें अभी उपलब्ध नहीं हैं। बाद में फिर कोशिश करें।",
  conversionPreview: "मुद्रा परिवर्तन का पूर्वावलोकन",
  totalSpendingAmountCountSettlementSuggestions: (values: MessageValues) =>
    interpolate("कुल खर्च: {amount} · हिसाब चुकाने के सुझाव: {count}।", values),
  applyRates: "दरें लागू करें",
  allTotalsBalancesAndSettlementSuggestionsWillBeRecalculatedWithTheseRates:
    "मौजूदा खर्च अपनी दरें रखते हैं। नए या फिर से मूल्यांकित खर्च और मौजूदा भुगतान अपडेट की गई दरें उपयोग करते हैं।",
  applyCustomExchangeRates: "कस्टम विनिमय दरें लागू करें?",
  restoreBankOfTaiwanDefaultRates: "Bank of Taiwan की डिफ़ॉल्ट दरें बहाल करें?",
  apiWriteSettings: "API से लिखने की पहुँच",
  apiWritesAllowed: "अनुमति है",
  apiWritesBlocked: "अनुमति नहीं है",
  apiWriteSettingsDescription:
    "डिफ़ॉल्ट रूप से API टोकन और CLI इस समूह को बदल नहीं सकते। चालू होने पर API टोकन वाले सदस्य अपनी अनुमतियों के अनुसार बदलाव कर सकते हैं। ब्राउज़र की कार्रवाइयाँ प्रभावित नहीं होतीं।",
  allowApiWrites: "API टोकन से बदलाव की अनुमति दें",
  apiWriteSettingSaved: "API से लिखने की पहुँच अपडेट की गई",
  groupLifecycle: "समूह का जीवनचक्र",
  archivedReadOnly: "संग्रहीत · केवल पढ़ने के लिए",
  active2: "सक्रिय",
  afterRestoringDataCanBeAddedAndChangedAgain:
    "बहाल करने के बाद फिर से डेटा जोड़ा और बदला जा सकता है।",
  archivingPreservesAllDataButMakesTheGroupReadOnly:
    "संग्रहीत करने पर सारा डेटा सुरक्षित रहता है, लेकिन समूह केवल पढ़ने के लिए हो जाता है।",
  restoreGroup: "समूह बहाल करें",
  archiveGroup: "समूह संग्रहीत करें",
  afterRestoringTheOwnerAndCollaboratorsCanEditDataAgain:
    "बहाल करने के बाद मालिक और सहयोगी फिर से डेटा बदल सकते हैं।",
  expensesPeopleAndPaymentRecordsArePreservedAndCannotBeChangedWhileArchived:
    "खर्च, लोग और भुगतान रिकॉर्ड सुरक्षित रहते हैं और संग्रहीत रहने तक बदले नहीं जा सकते।",
  groupRestored: "समूह बहाल किया गया",
  groupArchived: "समूह संग्रहीत किया गया",
  restoreThisGroup: "यह समूह बहाल करें?",
  archiveThisGroup: "यह समूह संग्रहीत करें?",
  thisPermanentlyDeletesAllPeopleExpensesReceiptsAndSettlementRecordsAndCannotBeUndone:
    "इससे सभी लोग, खर्च, रसीदें और हिसाब चुकाने के रिकॉर्ड हमेशा के लिए हट जाते हैं। इसे वापस नहीं किया जा सकता।",
  deleteGroup: "समूह हटाएँ",
  enterNameToConfirm: (values: MessageValues) =>
    interpolate("पुष्टि के लिए “{name}” डालें", values),
  permanentlyDeleteName: (values: MessageValues) =>
    interpolate("“{name}” हमेशा के लिए हटाएँ", values),
  thisCannotBeUndoneCancelingMakesNoChanges:
    "इसे वापस नहीं किया जा सकता। रद्द करने से कोई बदलाव नहीं होता।",
  permanentlyDeleteThisGroup: "यह समूह हमेशा के लिए हटाएँ?",
  permanentlyDeleteGroup: "समूह हमेशा के लिए हटाएँ",
  groupDeleted: "समूह हटाया गया",
  readOnlyShare: "केवल पढ़ने वाला साझा दृश्य",
  youCanViewExpensesBalancesAndSettlementSuggestionsButCannotEditData:
    "आप खर्च, शेष राशियाँ और हिसाब चुकाने के सुझाव देख सकते हैं, लेकिन डेटा बदल नहीं सकते।",
  completeExpenseHistory: "खर्च का पूरा इतिहास",
  manageGroupSettings: "समूह सेटिंग प्रबंधित करें",
  csvImportFailed: "CSV आयात नहीं हो सका",
  theCsvHasNoData: "CSV में कोई डेटा नहीं है",
  missingColumnsColumns: (values: MessageValues) =>
    interpolate("अनुपस्थित कॉलम: {columns}", values),
  participantNotFoundName: (values: MessageValues) =>
    interpolate("प्रतिभागी नहीं मिला: {name}", values),
  invalidJsonFormat: "JSON फ़ॉर्मैट अमान्य है",
  incorrectUsernameOrPassword: "उपयोगकर्ता नाम या पासवर्ड गलत है",
  everyPersonNeedsAnAmountForACustomSplit:
    "कस्टम बँटवारे के लिए हर व्यक्ति की राशि आवश्यक है",
  unsupportedBackupVersion: "बैकअप का संस्करण समर्थित नहीं है",
  unsupportedSplitMethod: "बँटवारे का तरीका समर्थित नहीं है",
  unsupportedExchangeRateCurrency: "विनिमय दर की मुद्रा समर्थित नहीं है",
  unsupportedBaseCurrency: "मूल मुद्रा समर्थित नहीं है",
  unsupportedCurrency: "मुद्रा समर्थित नहीं है",
  aParticipantCannotBeMergedIntoThemselves:
    "प्रतिभागी का विलय उसी में नहीं किया जा सकता",
  theOwnerCannotBeRemoved: "मालिक को हटाया नहीं जा सकता",
  thePayerAndRecipientMustBeDifferent: "भुगतानकर्ता और प्राप्तकर्ता अलग होने चाहिए",
  payerIsRequired: "भुगतानकर्ता आवश्यक है",
  thePayerMustBeAParticipant: "भुगतानकर्ता प्रतिभागी होना चाहिए",
  serverError: "सर्वर की त्रुटि",
  invalidPaymentRecordsInBackup: "बैकअप में भुगतान रिकॉर्ड अमान्य हैं",
  splitTotalsInBackupAreInvalid: "बैकअप में बँटवारे के कुल योग अमान्य हैं",
  invalidSplitDataInBackup: "बैकअप में बँटवारे का डेटा अमान्य है",
  invalidExchangeRatesInBackup: "बैकअप में विनिमय दरें अमान्य हैं",
  invalidParticipantDataInBackup: "बैकअप में प्रतिभागियों का डेटा अमान्य है",
  backupContainsDuplicateParticipants:
    "बैकअप में एक ही प्रतिभागी की दोहराई गई प्रविष्टियाँ हैं",
  invalidBaseCurrencyInBackup: "बैकअप में मूल मुद्रा अमान्य है",
  invalidExpenseCategoryInBackup: "बैकअप में खर्च की श्रेणी अमान्य है",
  anExpenseParticipantInTheBackupDoesNotExist:
    "बैकअप में खर्च का एक प्रतिभागी मौजूद नहीं है",
  anExpenseInTheBackupHasDuplicateParticipants:
    "बैकअप के एक खर्च में प्रतिभागी दोहराए गए हैं",
  invalidExpenseDataInBackup: "बैकअप में खर्च का डेटा अमान्य है",
  invalidExpenseTagsInBackup: "बैकअप में खर्च के टैग अमान्य हैं",
  invalidTripNameInBackup: "बैकअप में यात्रा का नाम अमान्य है",
  backupIsMissingItsTrip: "बैकअप में यात्रा नहीं है",
  backupIsMissingParticipants: "बैकअप में प्रतिभागी नहीं हैं",
  backupIsMissingExpenses: "बैकअप में खर्च नहीं हैं",
  notesCanBeUpTo160Characters: "नोट में अधिकतम 160 वर्ण हो सकते हैं",
  theShareLinkIsInvalidOrHasBeenRevoked: "साझा लिंक अमान्य है या रद्द किया गया है",
  atLeastOneSplitParticipantIsRequired:
    "बँटवारे के लिए कम से कम एक प्रतिभागी आवश्यक है",
  splitParticipantsMustBelongToTheTrip:
    "बँटवारे के प्रतिभागी यात्रा का हिस्सा होने चाहिए",
  splitAmountsMustAddUpToTheExpenseAmount:
    "बँटवारे की राशियों का योग खर्च की राशि के बराबर होना चाहिए",
  splitAmountsMustBeGreaterThan0: "बँटवारे की राशियाँ 0 से अधिक होनी चाहिए",
  invalidSplitAmount: "बँटवारे की राशि अमान्य है",
  invalidCategoryOrTagFormat: "श्रेणी या टैग का फ़ॉर्मैट अमान्य है",
  exchangeRatesMustBeGreaterThan0: "विनिमय दरें 0 से अधिक होनी चाहिए",
  invalidExchangeRateFormat: "विनिमय दर का फ़ॉर्मैट अमान्य है",
  aParticipantWithThisNameAlreadyExists: "इस नाम का प्रतिभागी पहले से है",
  thisParticipantHasPaymentRecordsAndCannotBeDeleted:
    "इस प्रतिभागी के भुगतान रिकॉर्ड हैं, इसलिए इसे हटाया नहीं जा सकता",
  thisParticipantHasExpensesAndCannotBeDeleted:
    "इस प्रतिभागी के खर्च हैं, इसलिए इसे हटाया नहीं जा सकता",
  onlyTheOwnerCanDownloadACompleteBackup: "केवल मालिक पूरा बैकअप डाउनलोड कर सकते हैं",
  onlyTheOwnerCanManageShareLinks: "केवल मालिक साझा लिंक प्रबंधित कर सकते हैं",
  onlyTheOwnerCanManageCollaborators: "केवल मालिक सहयोगी प्रबंधित कर सकते हैं",
  onlyTheOwnerCanManageTripSettings: "केवल मालिक यात्रा की सेटिंग प्रबंधित कर सकते हैं",
  namesCanBeUpTo80Characters: "नाम में अधिकतम 80 वर्ण हो सकते हैं",
  passwordMustBeAtLeast8Characters3: "पासवर्ड में कम से कम 8 वर्ण होने चाहिए",
  invalidArchiveStatus: "संग्रह की स्थिति अमान्य है",
  invalidApiWriteSetting: "API से लिखने की पहुँच की सेटिंग अमान्य है",
  onlyBrowserSessionsCanManageApiWrites:
    "केवल ब्राउज़र सत्र API से लिखने की पहुँच प्रबंधित कर सकते हैं",
  apiWritesDisabledForThisGroup: "यह समूह API टोकन से बदलाव की अनुमति नहीं देता",
  apiEndpointNotFound: "API एंडपॉइंट नहीं मिला",
  paymentRecordNotFound: "भुगतान रिकॉर्ड नहीं मिला",
  collaboratorNotFound: "सहयोगी नहीं मिला",
  participantNotFound: "प्रतिभागी नहीं मिला",
  noActiveShareLinkWasFound: "कोई सक्रिय साझा लिंक नहीं मिला",
  expenseNotFound: "खर्च नहीं मिला",
  receiptNotFound: "रसीद नहीं मिली",
  tripNotFound: "यात्रा नहीं मिली",
  userNotFound: "उपयोगकर्ता नहीं मिला",
  descriptionMustBe1120Characters: "विवरण में 1–120 वर्ण होने चाहिए",
  theOwnerIsAlreadyInTheCollaboratorList: "मालिक पहले से सहयोगियों की सूची में हैं",
  thisGroupIsArchivedRestoreItBeforeEditing:
    "यह समूह संग्रहीत है। बदलाव करने से पहले इसे बहाल करें।",
  receiptsMustBeJpegPngOrWebpImages: "रसीद JPEG, PNG या WebP चित्र होनी चाहिए",
  theRecipientMustBeAParticipant: "प्राप्तकर्ता प्रतिभागी होना चाहिए",
  aTripWithThisNameAlreadyExists: "इस नाम की यात्रा पहले से है",
  dateMustUseTheYyyyMmDdFormat: "तारीख YYYY-MM-DD फ़ॉर्मैट में होनी चाहिए",
  upTo10TagsAreAllowed: "अधिकतम 10 टैग की अनुमति है",
  tagsCanBeUpTo24Characters: "टैग में अधिकतम 24 वर्ण हो सकते हैं",
  invalidTagFormat: "टैग का फ़ॉर्मैट अमान्य है",
  theTargetParticipantMustBelongToTheTrip:
    "लक्ष्य प्रतिभागी यात्रा का हिस्सा होना चाहिए",
  signInFirst: "पहले साइन इन करें",
  provideExpenseChanges: "खर्च के बदलाव दें",
  provideTripChanges: "यात्रा के बदलाव दें",
  requestBodyIsTooLarge: "अनुरोध का डेटा बहुत बड़ा है",
  selectAtLeastOneSplitParticipant: "बँटवारे के लिए कम से कम एक प्रतिभागी चुनें",
  enterATripNameOf1100Characters: "1–100 वर्णों का यात्रा का नाम डालें",
  enterAnExpenseDescriptionOf1120Characters: "1–120 वर्णों का खर्च का विवरण डालें",
  enterAParticipantNameOf180Characters: "1–80 वर्णों का प्रतिभागी का नाम डालें",
  enterAUsernameAndPassword: "उपयोगकर्ता नाम और पासवर्ड डालें",
  enterSplitValues: "बँटवारे के मान डालें",
  enterAValidPaymentDate: "भुगतान की मान्य तारीख डालें",
  enterValidSplitShares: "बँटवारे के मान्य अनुपात डालें",
  enterValidSplitPercentages: "बँटवारे के मान्य प्रतिशत डालें",
  enterValidSplitAmounts: "बँटवारे की मान्य राशियाँ डालें",
  enterAValidExpenseDate: "खर्च की मान्य तारीख डालें",
  chooseACsvFile: "CSV फ़ाइल चुनें",
  selectSplitParticipants: "बँटवारे के प्रतिभागी चुनें",
  chooseAReceiptImage: "रसीद का चित्र चुनें",
  thisUserIsAlreadyACollaborator: "यह उपयोगकर्ता पहले से सहयोगी है",
  thisUsernameIsAlreadyRegistered: "यह उपयोगकर्ता नाम पहले से पंजीकृत है",
  usernameIsBeingRegisteredOrAlreadyRegistered:
    "यह उपयोगकर्ता नाम पंजीकृत किया जा रहा है या पहले से लिया जा चुका है",
  usernameIsBeingRegistered: "यह उपयोगकर्ता नाम पंजीकृत किया जा रहा है",
  usernameOrPasskeyAlreadyRegistered:
    "यह उपयोगकर्ता नाम या Passkey पहले से पंजीकृत है",
  invalidAmount: "राशि अमान्य है",
  theDefaultDevelopmentAccountsUsernameCannotBeChanged:
    "डिफ़ॉल्ट डेवलपमेंट खाते का उपयोगकर्ता नाम बदला नहीं जा सकता",
  language: "भाषा",
  english: "अंग्रेज़ी",
  traditionalChinese: "पारंपरिक चीनी",
};
