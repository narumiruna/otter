import { interpolate, type MessageValues } from "./message-types.js";

// Provisional machine-authored translations; fluent review is pending.
export const hiAccount = {
  browserExpenseDefaults: "इस ब्राउज़र में खर्च की डिफ़ॉल्ट सेटिंग",
  browserExpenseDefaultsHelp:
    "इस समूह के लिए केवल इस खाते की मुद्रा और बँटवारे की डिफ़ॉल्ट सेटिंग हटाएँ। खाते, साइन इन और अनुमतियाँ नहीं बदलती हैं।",
  clearPersonalPreferences: "इस समूह के खर्च की डिफ़ॉल्ट सेटिंग हटाएँ",
  expenseDefaultsCleared: "इस समूह के खर्च की डिफ़ॉल्ट सेटिंग हटा दी गई।",
  personalPreferencesChanged:
    "आपकी बँटवारे की सेटिंग अब उपलब्ध नहीं है। मान्य डिफ़ॉल्ट सेटिंग लागू है; फिर से चुनें।",
  personalStorageFailed:
    "खर्च की डिफ़ॉल्ट सेटिंग सहेजी नहीं जा सकी। मौजूदा सेटिंग उपलब्ध है, लेकिन पृष्ठ दोबारा खोलने पर खो सकती है।",
  rememberExpenseDefaults: "मुद्रा और बँटवारे की सेटिंग याद रखें",
  expenseDefaultsRemembered: "इस समूह के लिए मुद्रा और बँटवारे की सेटिंग सहेजी गई।",
  deleteExpense: "खर्च हटाएँ",
  copyExpense: "नए खर्च के रूप में कॉपी करें",
  copyExpenseNamed: (values: MessageValues) =>
    interpolate("{name} को नए खर्च के रूप में कॉपी करें", values),
  memberAccounts: "सदस्यों के हिसाब",
  accountPaid: "भुगतान किया",
  accountShared: "हिस्सा",
  accountBalance: "लेना / देना है",
  accountReceivable: "लेना है",
  accountPayable: "देना है",
  accountSettled: "हिसाब चुकता",
  accountPaidHelp:
    "भुगतान की गई राशि वह है जो दुकानों और खर्च से जुड़ी अन्य सेवाओं को दी गई है। इसमें सदस्यों के बीच हिसाब चुकाने के भुगतान शामिल नहीं हैं।",
  accountTotalsHelp:
    "हिस्सा खर्च की वह राशि है जो प्रत्येक सदस्य को देनी है। शेष राशि में दर्ज भुगतान और प्रतिनिधि के समायोजन भी शामिल हैं। सिंक नहीं हुए ड्राफ़्ट शामिल नहीं हैं।",
  accountDetails: "विवरण देखें",
  accountPaidExpenses: "समूह के लिए किए गए खर्च के भुगतान",
  accountSharedExpenses: "साझा खर्च",
  accountExpenseTotal: "खर्च की पूरी कुल राशि",
  accountPayments: "भेजे / प्राप्त किए गए भुगतान",
  accountPaymentSent: "भेजा गया",
  accountPaymentReceived: "प्राप्त हुआ",
  accountAdjustments: "प्रतिनिधि के समायोजन",
  accountDetailsUnavailable:
    "इस साझा दृश्य में भुगतान का विवरण शामिल नहीं है। शेष राशि समूह की गणना के परिणामों पर आधारित है।",
  accountRepresentedBy: (values: MessageValues) =>
    interpolate(
      "{name} इस सदस्य का हिसाब चुकाते हैं। शून्य शेष राशि का अर्थ यह नहीं है कि इस सदस्य ने भुगतान किया है।",
      values,
    ),
  visaSettlementTitle: "Visa दरों पर आधारित हिसाब",
  visaSettlementCurrency: "हिसाब चुकाने की मुद्रा",
  visaSettlementEnable:
    "खर्च की तारीखों की Visa दरों से सभी खर्च बदलें और चुनी गई मुद्रा में हिसाब चुकाएँ",
  visaSettlementHelp:
    "डिफ़ॉल्ट रूप से बंद है। मूल राशियाँ नहीं बदलती हैं। चालू करने पर हर खर्च की तारीख के लिए Visa दर सहेजी जाती है और शेष राशि व हिसाब के लिए चुनी गई मुद्रा का उपयोग होता है। यह नकद सहित सभी खर्च पर लागू है, बिना बैंक शुल्क के। Visa दरें अनुमान हैं; कार्ड के बिल अलग हो सकते हैं। चालू करने या मुद्रा बदलने से पहले मौजूदा भुगतान चुनी गई मुद्रा में होने चाहिए।",
  visaSettlementSaved: "Visa हिसाब की सेटिंग सहेजी गई",
  visaSettlementOn: (values: MessageValues) =>
    interpolate("चालू · {currency}", values),
  visaSettlementOff: "बंद",
  visaRateLabel: "Visa",
  visaSettingInvalid: "Visa हिसाब की सेटिंग अमान्य है",
  visaIncompatiblePayments:
    "मौजूदा भुगतान रिकॉर्ड चुनी गई हिसाब की मुद्रा में होने चाहिए",
  visaSettingUnavailable:
    "Visa दरें उपलब्ध नहीं हैं। सेटिंग नहीं बदली गई। बाद में फिर कोशिश करें।",
  visaPaymentCurrency: "Visa हिसाब के भुगतान चुनी गई मुद्रा में होने चाहिए",
  visaRateUnavailable: (values: MessageValues) =>
    interpolate(
      "{date} के लिए Visa की {currency}/{target} दर उपलब्ध नहीं है। बाद में फिर कोशिश करें।",
      values,
    ),
  offlineQueueBanner:
    "आप ऑफ़लाइन हैं: लोड किया गया डेटा उपलब्ध है। नए खर्च इस डिवाइस पर सहेजे जा सकते हैं; अन्य बदलावों के लिए कनेक्शन चाहिए।",
  queueSave: "इस डिवाइस पर सहेजें",
  queueSaved:
    "इस डिवाइस पर सहेजा गया। अभी शेष राशि में शामिल नहीं है; सिंक होने पर विनिमय दरें तय होती हैं।",
  queueStorageError:
    "इस डिवाइस पर सहेजा नहीं जा सका। यह पृष्ठ खुला रखें और फिर कोशिश करें।",
  queueTitle: "सिंक नहीं हुए खर्च",
  queueNotice:
    "केवल इस डिवाइस पर हैं। शेष राशि में शामिल नहीं हैं। सिंक होने पर विनिमय दरें तय होती हैं। ब्राउज़र का डेटा साफ़ करने से ये ड्राफ़्ट खो जाएँगे।",
  queuePending: "सिंक होने की प्रतीक्षा में",
  queueAttempted: "सिंक की पुष्टि बाकी है; मूल अनुरोध न बदलें",
  queueConflict:
    "सिंक रुक गया। फिर कोशिश करने से पहले पहुँच और प्रतिभागियों की जाँच करें; मूल अनुरोध सुरक्षित रखा गया है।",
  queueInvalid: "दर्ज नहीं हुआ। ड्राफ़्ट बदलें और फिर कोशिश करें।",
  queueEdit: "ड्राफ़्ट बदलें",
  queueRetry: "मूल अनुरोध फिर भेजें",
  queueDelete: "स्थानीय ड्राफ़्ट हटाएँ",
  queueDeleteConfirm:
    "यह स्थानीय ड्राफ़्ट हटाएँ? पहले भेजा गया अनुरोध सर्वर पर दर्ज हो चुका हो सकता है। पहले समूह की जाँच करें।",
  queueCount: (values: MessageValues) =>
    interpolate("इस डिवाइस पर सिंक नहीं हुए खर्च: {count}", values),
  queueSyncPricing:
    "पूर्वावलोकन में केवल मूल मुद्रा दिखाई जाती है। सिंक होने पर सर्वर विनिमय दर तय करता है।",
  queueOrphanTitle: "अनुपलब्ध समूहों के ड्राफ़्ट",
  queueOrphanNotice:
    "इन समूहों तक अब पहुँच नहीं है। भेजा गया अनुरोध दर्ज हो चुका हो सकता है; उसकी स्थानीय कॉपी हटाने से पहले जाँच करें।",
  queueOrphanTrip: (values: MessageValues) =>
    interpolate("समूह ID: {id}", values),
  accountSettings: "खाता सेटिंग",
  manageYourUsernameAndPasskeys:
    "दिखावट, भाषा, उपयोगकर्ता नाम, Passkey और API टोकन प्रबंधित करें।",
  appearance: "दिखावट",
  chooseHowOtterLooksOnThisBrowser:
    "Otter की दिखावट चुनें। बदलाव तुरंत लागू होते हैं और इस ब्राउज़र में सहेजे जाते हैं।",
  colorTheme: "रंग थीम",
  forestTheme: "वन",
  oceanTheme: "महासागर",
  lavenderTheme: "लैवेंडर",
  sunsetTheme: "सूर्यास्त",
  roseTheme: "गुलाब",
  displayMode: "प्रदर्शन मोड",
  systemMode: "सिस्टम के अनुसार",
  lightMode: "हल्का",
  darkMode: "गहरा",
  useTheNewUsernameTheNextTimeYouSignInYourCurrentSessionWillContinue:
    "अगली बार साइन इन करते समय नए उपयोगकर्ता नाम का उपयोग करें। आपका मौजूदा सत्र जारी रहेगा।",
  passkeys: "Passkey",
  useAPasskeyToSignInWithoutYourPassword:
    "पासवर्ड डाले बिना साइन इन करने के लिए अपने डिवाइस को अनलॉक करें।",
  unableToLoadPasskeys: "Passkey लोड नहीं हो सकीं",
  unableToAddPasskey:
    "Passkey जोड़ी नहीं जा सकी। यदि आपने रद्द किया था, तो फिर कोशिश करें।",
  unableToRemovePasskey: "Passkey हटाई नहीं जा सकी",
  passkeyAdded: "Passkey जोड़ी गई",
  passkeyRemoved: "Passkey हटाई गई",
  passkeyNumber: (values: MessageValues) =>
    interpolate("Passkey {number}", values),
  addedOnDate: (values: MessageValues) =>
    interpolate("{date} को जोड़ी गई", values),
  removePasskeyNumber: (values: MessageValues) =>
    interpolate("Passkey {number} हटाएँ", values),
  noPasskeysAdded: "अभी कोई Passkey नहीं जोड़ी गई है।",
  addingPasskey: "Passkey जोड़ी जा रही है…",
  addPasskey: "Passkey जोड़ें",
  thisBrowserDoesNotSupportPasskeys: "यह ब्राउज़र Passkey का समर्थन नहीं करता है।",
  apiTokens: "API टोकन",
  useApiTokensWithTheOtterCli:
    "Otter CLI या स्वचालन उपकरणों के लिए Bearer टोकन बनाएँ।",
  loadingApiTokens: "API टोकन लोड हो रहे हैं…",
  unableToLoadApiTokens: "API टोकन लोड नहीं हो सके",
  unableToCreateApiToken: "API टोकन बनाया नहीं जा सका",
  apiTokenCreationUncertain:
    "टोकन अनुरोध का परिणाम अज्ञात है। दूसरा टोकन बनाने से पहले इसी अनुरोध को फिर भेजें।",
  retryApiTokenCreation: "टोकन बनाने की फिर कोशिश करें",
  unableToRevokeApiToken: "API टोकन रद्द नहीं किया जा सका",
  unableToCopyApiToken: "API टोकन कॉपी नहीं किया जा सका",
  apiTokenRevoked: "API टोकन रद्द किया गया",
  apiTokenCopied: "API टोकन कॉपी किया गया",
  enterATokenName: "टोकन का नाम डालें",
  newApiToken: "नया API टोकन",
  copyYourApiTokenNow: "अपना API टोकन अभी कॉपी करें",
  apiTokenShownOnce:
    "यह टोकन केवल एक बार दिखाया जाता है। यहाँ से जाने के बाद आप इसे फिर नहीं देख सकते।",
  copyToken: "टोकन कॉपी करें",
  done: "हो गया",
  tokenName: "टोकन का नाम",
  tokenNameExample: "उदाहरण: यात्रा का स्वचालन",
  creatingApiToken: "टोकन बनाया जा रहा है…",
  createApiToken: "API टोकन बनाएँ",
  apiTokenDates: (values: MessageValues) =>
    interpolate("बनाया गया {created} · समाप्त होगा {expires}", values),
  revokeNamedApiToken: (values: MessageValues) =>
    interpolate('API टोकन "{name}" रद्द करें', values),
  noActiveApiTokens: "कोई सक्रिय API टोकन नहीं है।",
  apiTokensExpireAfter90Days:
    "टोकन 90 दिनों के बाद समाप्त होते हैं। CLI के साथ उपयोग करने के लिए इसे इस रूप में सेट करें:",
  welcomeBackEyebrow: "फिर स्वागत है",
  startNewJourneyEyebrow: "नई यात्रा शुरू करें",
  parchmentTheme: "चर्मपत्र",
  expenseTotalLabel: "कुल",
  expenseSplitSection: "लोगों के बीच बाँटें",
  expenseSplitHelp: "चुनें कि यह खर्च किन लोगों में बाँटना है, तरीका चुनें और परिणाम देखें।",
  expenseTagPlaceholder: "टैग जोड़ें…",
  addShort: "जोड़ें",
  settingsShort: "सेटिंग",
  close: "बंद करें",
  groupDetails: "समूह का विवरण",
  filters: "फ़िल्टर",
  viewAll: "सभी देखें",
  personLabel: "व्यक्ति",
  preferencesLabel: "प्राथमिकताएँ",
  profileLabel: "प्रोफ़ाइल",
  securityLabel: "सुरक्षा",
  backToGroups: "समूहों पर वापस जाएँ",
  createdLabel: "बनाया गया",
  statusLabel: "स्थिति",
  peopleDeletionHelp:
    "बही में उपयोग किए गए लोगों को हटाया नहीं जा सकता। जानकारी बटन से हर व्यक्ति की पाबंदियाँ देखें, या एक ही व्यक्ति की दो प्रविष्टियाँ मिलाएँ।",
  personRestriction: (values: MessageValues) =>
    interpolate("{name} को हटाने की पाबंदियाँ", values),
  representsPeople: (values: MessageValues) =>
    interpolate("{names} का प्रतिनिधित्व करते हैं", values),
  expenseRateForName: (values: MessageValues) =>
    interpolate("{name} की राशि और विनिमय दर देखें", values),
  rateUnavailable: "दर उपलब्ध नहीं है (पुराना डेटा)",
  expenseHistory: "बदलाव का इतिहास",
  expenseHistoryDescription:
    "खर्च में बदलाव, हटाना और बहाल करना; यह भुगतान या पुरानी शेष राशियों का इतिहास नहीं है।",
  expenseHistoryEmpty: "कोई बदलाव दर्ज नहीं है",
  expenseHistoryMore: "और बदलाव लोड करें",
  expenseHistoryCreated: "बनाया गया",
  expenseHistoryUpdated: "अपडेट किया गया",
  expenseHistoryDeleted: "हटाया गया",
  expenseHistoryRestored: "बहाल किया गया",
  expenseHistoryBaseline: "शुरुआती स्थिति",
  expenseHistorySystem: "सिस्टम",
  expenseHistoryBaselineNotice:
    "इतिहास चालू होने के समय की स्थिति; उससे पहले के बदलाव और मूल लेखक अज्ञात हैं।",
  expenseHistoryReceiptNotice:
    "केवल रसीद का मेटाडेटा रखा जाता है। पुराने चित्र उपलब्ध नहीं हैं।",
  expenseHistoryShares: "बँटवारे की राशियाँ",
  expenseHistoryRate: "सहेजी गई विनिमय दर",
  expenseHistoryRateBank: "Bank of Taiwan",
  expenseHistoryRateCustom: "समूह की कस्टम दर",
  expenseHistoryRateFixed: "अंतर्निहित स्थिर दर",
  expenseHistoryRateLegacy: "पुराना अनुमान",
  expenseHistoryRateTimeUnavailable: "दर का समय उपलब्ध नहीं है",
  expenseHistoryRateUnavailable: "पुराना संस्करण: कोई दर दर्ज नहीं है",
  expenseHistoryBefore: "पहले",
  expenseHistoryAfter: "बाद में",
  expenseHistorySourceExpense: "खर्च की कार्रवाई",
  expenseHistorySourceCsv: "CSV आयात",
  expenseHistorySourceRestore: "बैकअप बहाली",
  expenseHistorySourceMerge: "प्रतिभागियों का विलय",
  expenseHistorySourceReceipt: "रसीद की कार्रवाई",
  expenseHistorySourceSeed: "डेवलपमेंट परीक्षण डेटा",
  expenseHistorySourceMigration: "माइग्रेशन",
  expenseHistorySourceVersionRestore: "संस्करण बहाली",
  expenseRestoreVersion: (values: MessageValues) =>
    interpolate("संस्करण {version} बहाल करें", values),
  expenseRestoreTitle: "खर्च का संस्करण बहाल करें",
  expenseRestoreDescription:
    "मौजूदा खर्च और बहाल करने वाले संस्करण की जाँच करें। बहाल करने से एक नया संस्करण जुड़ता है; बाद का इतिहास उपलब्ध रहता है।",
  expenseRestoreKeepsReceipt:
    "मौजूदा रसीद जुड़ी रहती है। रसीद के पुराने चित्र बहाल नहीं होते।",
  expenseRestoreNoReceipt:
    "हटाया गया खर्च बिना रसीद के वापस आता है। रसीद के पुराने चित्र बहाल नहीं होते।",
  expenseRestoreMissingPerson:
    "इस संस्करण में ऐसा व्यक्ति है जो अब समूह में नहीं है। इसके बजाय खर्च को स्वयं बदलें।",
  expenseRestoreUnavailable:
    "यह खर्च बहाल नहीं किया जा सकता। फिर से लोड करके कोशिश करें।",
  expenseRestoreConflict:
    "खर्च बदल गया है। फिर पुष्टि करने से पहले नवीनतम स्थिति की जाँच करें।",
  expenseRestoreConfirm: "यह संस्करण बहाल करें",
  expenseRestored: "खर्च का संस्करण बहाल किया गया",
  expenseConflictParticipantsChanged:
    "लोग बदल गए हैं। पुष्टि करने पर अनुपलब्ध भुगतानकर्ता या बँटवारे के चयन की जगह नवीनतम खर्च की सेटिंग लागू होगी। ड्राफ़्ट के अन्य फ़ील्ड रखे जाएँगे; सहेजने से पहले बँटवारे की राशियाँ जाँचें।",
  expenseVersionConflict:
    "यह खर्च बदल गया है। फिर पुष्टि करने से पहले नवीनतम संस्करण की जाँच करें।",
  expenseVersionMissing: "खर्च का संस्करण दें। फिर से लोड करके कोशिश करें।",
  expenseVersionInvalid: "खर्च का संस्करण अमान्य है",
  reviewLatestExpense: "नवीनतम खर्च की जाँच करें",
  confirmLatestExpenseVersion:
    "नवीनतम संस्करण जाँच लिया; मेरा ड्राफ़्ट रखें और संपादन जारी रखें",
  latestExpenseMissing:
    "यह खर्च हटाया गया है या अब उपलब्ध नहीं है। आपका ड्राफ़्ट रखा गया है, लेकिन सहेजा नहीं जा सकता।",
  deleteExpenseHistoryRetained:
    "खर्च मौजूदा बही से हटेगा और शेष राशि फिर गणना की जाएगी। बदलाव का इतिहास रखा जाएगा; आप पुराने संस्करण को उसकी पुरानी रसीद के चित्र के बिना बहाल कर सकते हैं।",
  expenseHistoryForName: (values: MessageValues) =>
    interpolate("बदलाव का इतिहास: {name}", values),
};
