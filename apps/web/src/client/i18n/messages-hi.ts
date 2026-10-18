import {
  type CatalogShape,
  interpolate,
  type MessageValues,
  pluralForm,
} from "./message-types.js";
import { hiAccount } from "./messages-hi-account.js";
import { hiSettings } from "./messages-hi-settings.js";
import type { zhTW } from "./messages-zh-tw.js";

// Provisional machine-authored translations; fluent review is pending.
export const hi = {
  ...hiAccount,
  ...hiSettings,
  usernameMustBe332LettersNumbersUnderscoresOrHyphens:
    "उपयोगकर्ता नाम में 3–32 अक्षर, अंक, अंडरस्कोर या हाइफ़न होने चाहिए",
  travelTogetherSplitExpensesEasily: "साथ यात्रा करें, खर्च आसानी से बाँटें",
  goodFriendsSplitExpensesWell: "अच्छे दोस्त खर्च का सही बँटवारा करते हैं।",
  skipToMainContent: "मुख्य सामग्री पर जाएँ",
  otterHome: "otter का होम पेज",
  loading: "लोड हो रहा है",
  unableToLoadOtter: "otter लोड नहीं हो सका",
  loadingFailed: "लोड नहीं हो सका",
  reload: "फिर से लोड करें",
  signedIn: "साइन इन हो गया",
  accountCreated: "खाता बनाया गया",
  unableToAuthenticate: "पहचान सत्यापित नहीं हो सकी",
  authenticationRequestsTooFrequentTryAgainLater:
    "पहचान सत्यापन के बहुत अधिक अनुरोध हैं। बाद में फिर कोशिश करें।",
  usernameUpdated: "उपयोगकर्ता नाम अपडेट किया गया",
  signedOut: "साइन आउट हो गया",
  signOutFailedMessage: (values: MessageValues) =>
    interpolate("साइन आउट नहीं हो सका: {message}", values),
  pleaseTryAgainLater: "बाद में फिर कोशिश करें",
  signingOut: "साइन आउट हो रहा है…",
  signOut: "साइन आउट करें",
  authorizeCli: "CLI कनेक्ट करें",
  authorizeCliDescription:
    "इस CLI को अपने Otter डेटा तक पहुँच की अनुमति देने के लिए अपने टर्मिनल में दिखाया गया डिवाइस कोड डालें।",
  deviceCode: "डिवाइस कोड",
  checkDeviceCode: "जारी रखें",
  checkingDeviceCode: "जाँच हो रही है…",
  cliAccessRequest: "CLI पहुँच का अनुरोध",
  cliAccessRequestedBy: "अनुरोधकर्ता",
  approveCliAccess: "पहुँच की अनुमति दें",
  approvingCliAccess: "अनुमति दी जा रही है…",
  cliAccessApproved: "CLI कनेक्ट हो गया",
  cliAccessApprovedDescription: "आप यह पृष्ठ बंद करके अपने टर्मिनल पर वापस जा सकते हैं।",
  deviceCodeNotFoundOrExpired: "डिवाइस कोड नहीं मिला या उसकी अवधि समाप्त हो गई",
  enterAValidDeviceCode: "मान्य डिवाइस कोड डालें",
  youAreOfflineLoadedDataIsAvailableButEditingRequiresAConnection:
    "आप ऑफ़लाइन हैं। लोड किया गया डेटा उपलब्ध है, लेकिन बदलाव करने के लिए कनेक्शन चाहिए।",
  travelTogetherSplitWithEase: "साथ यात्रा करें, आसानी से बाँटें",
  spendYourTimeOnTheJourney: "अपना समय यात्रा में बिताएँ,",
  andLeaveTheSplittingToOtter: "और बँटवारा otter पर छोड़ दें।",
  fromDinnerToAFullTripRecordEverySharedExpenseAndKeepGroupFinancesSimpleAndClear:
    "रात के खाने से पूरी यात्रा तक, हर साझा खर्च दर्ज करें और समूह का हिसाब सरल और स्पष्ट रखें।",
  splitExampleAWeekendTripDinnerCostsTwd1800ForThreePeopleOrTwd600Each:
    "बँटवारे का उदाहरण: सप्ताहांत की यात्रा में तीन लोगों के रात के खाने का खर्च TWD 1,800 है, यानी प्रत्येक का TWD 600।",
  weekendTrip: "सप्ताहांत की यात्रा",
  splitExample: "बँटवारे का उदाहरण",
  dinnerTogether: "साथ में रात का खाना",
  you: "आप",
  a: "अ",
  y: "आ",
  splitEquallyAmong3: "3 लोगों में बराबर बाँटें",
  each: "प्रत्येक",
  quicklyRecordSharedExpenses: "साझा खर्च तुरंत दर्ज करें",
  seeWhoOwesAndWhoIsOwedAtAGlance: "एक नज़र में देखें कि किसे देना है और किसे लेना है",
  settleUpWithClearSuggestions: "स्पष्ट सुझावों के साथ हिसाब चुकाएँ",
  signIn: "साइन इन करें",
  createAccount: "खाता बनाएँ",
  welcomeBackContinueYourJourney: "फिर स्वागत है। अपनी यात्रा जारी रखें।",
  createYourFirstGroupAndStartSplittingWithEase:
    "अपना पहला समूह बनाएँ और आसानी से खर्च बाँटना शुरू करें।",
  username: "उपयोगकर्ता नाम",
  enterAUsername: "उपयोगकर्ता नाम डालें",
  password: "पासवर्ड",
  enterAPassword: "पासवर्ड डालें",
  developmentCredentialsHaveBeenFilledIn:
    "डेवलपमेंट के लिए साइन इन विवरण भर दिया गया है।",
  signingIn: "साइन इन हो रहा है…",
  or: "या",
  signInWithAPasskey: "Passkey से साइन इन करें",
  signingInWithAPasskey: "Passkey से साइन इन हो रहा है…",
  unableToSignInWithAPasskey:
    "Passkey से साइन इन नहीं हो सका। फिर कोशिश करें या अपना पासवर्ड उपयोग करें।",
  needAnAccount: "खाता चाहिए?",
  usernameIsNotCaseSensitive:
    "उपयोगकर्ता नाम में बड़े और छोटे अक्षरों का अंतर नहीं होता।",
  passwordMustBeAtLeast8Characters: "पासवर्ड में कम से कम 8 वर्ण होने चाहिए",
  passwordMustBeAtLeast8Characters2: "पासवर्ड में कम से कम 8 वर्ण होने चाहिए।",
  creating: "बनाया जा रहा है…",
  createAccountWithAPasskey: "Passkey से खाता बनाएँ",
  creatingAccountWithAPasskey: "Passkey से खाता बनाया जा रहा है…",
  unableToCreateAccountWithAPasskey:
    "Passkey से खाता नहीं बनाया जा सका। फिर कोशिश करें।",
  alreadyHaveAnAccount: "पहले से खाता है?",
  backToSignIn: "साइन इन पर वापस जाएँ",
  expenseParticipantsDoNotNeedAccountsToBeIncludedInAGroup:
    "समूह में शामिल होने के लिए खर्च के प्रतिभागियों को खाते की आवश्यकता नहीं है।",
  changeNameSUsername: (values: MessageValues) =>
    interpolate("{name} का उपयोगकर्ता नाम बदलें", values),
  nameSAccountMenu: (values: MessageValues) =>
    interpolate("{name} के खाते का मेनू", values),
  unableToUpdateUsername: "उपयोगकर्ता नाम अपडेट नहीं हो सका",
  changeUsername: "उपयोगकर्ता नाम बदलें",
  passkeyRegistrationRequestsTooFrequent:
    "Passkey पंजीकरण के बहुत अधिक अनुरोध हैं। बाद में फिर कोशिश करें।",
  passkeyRegistrationResponseIsInvalid: "Passkey पंजीकरण का उत्तर अमान्य है",
  passkeyRegistrationRequestExpired:
    "Passkey पंजीकरण के अनुरोध की अवधि समाप्त हो गई। फिर कोशिश करें।",
  unableToVerifyPasskey: "Passkey सत्यापित नहीं हो सकी। फिर कोशिश करें।",
  passkeyAlreadyRegistered: "यह Passkey पहले से पंजीकृत है",
  passkeyNotFound: "Passkey नहीं मिली",
  cannotRemoveOnlyPasskey: "अपनी एकमात्र Passkey हटाने से आप खाते की पहुँच खो देंगे",
  passkeyLoginResponseIsInvalid: "Passkey से साइन इन का उत्तर अमान्य है",
  passkeyLoginRequestExpired:
    "Passkey से साइन इन के अनुरोध की अवधि समाप्त हो गई। फिर कोशिश करें।",
  unableToUsePasskeyToSignIn: "इस Passkey से साइन इन नहीं हो सका",
  cancel: "रद्द करें",
  saving: "सहेजा जा रहा है…",
  save: "सहेजें",
  connectionFailedPleaseTryAgainLater: "कनेक्शन विफल हुआ। बाद में फिर कोशिश करें।",
  theServerReturnedAnInvalidResponse: "सर्वर ने अमान्य उत्तर दिया।",
  everyone: "सभी",
  unknown: "अज्ञात",
  atLeastOneParticipantIsRequired: "कम से कम एक प्रतिभागी आवश्यक है",
  usedByAnExpense: "एक खर्च में उपयोग किया गया है",
  youAreOfflineReconnectAndTryAgain: "आप ऑफ़लाइन हैं। फिर से कनेक्ट करके कोशिश करें।",
  working: "काम जारी है…",
  unableToApplyChanges: "बदलाव लागू नहीं हो सके",
  applying: "लागू किया जा रहा है…",
  noBalancesYet: "अभी कोई शेष राशि नहीं है।",
  settled: "हिसाब चुकता",
  getsBack: "वापस लेना है",
  owes: "देना है",
  newTaiwanDollar: "नया ताइवानी डॉलर",
  japaneseYen: "जापानी येन",
  usDollar: "अमेरिकी डॉलर",
  euro: "यूरो",
  singaporeDollar: "सिंगापुर डॉलर",
  poundSterling: "पाउंड स्टर्लिंग",
  australianDollar: "ऑस्ट्रेलियाई डॉलर",
  canadianDollar: "कनाडाई डॉलर",
  southKoreanWon: "दक्षिण कोरियाई वॉन",
  food: "भोजन",
  transport: "परिवहन",
  lodging: "ठहरना",
  tickets: "टिकट",
  shopping: "खरीदारी",
  other: "अन्य",
  unsavedChangesWillBeLostDiscardTheDraft:
    "बिना सहेजे बदलाव खो जाएँगे। ड्राफ़्ट छोड़ दें?",
  unableToSwitchGroups: "समूह बदला नहीं जा सका",
  loadingGroup: "समूह लोड हो रहा है",
  yourSelectionWillAppearAfterItsDataLoads:
    "डेटा लोड होने के बाद आपका चयन दिखाई देगा।",
  unableToLoadGroup: "समूह लोड नहीं हो सका",
  groupSwitcher: "समूह बदलने का विकल्प",
  groups: "समूह",
  countActiveGroups: (values: MessageValues) =>
    interpolate("{count} सक्रिय समूह", values),
  everyTripAddsUpToSomethingWonderful: "हर यात्रा कुछ अद्भुत यादें जोड़ती है।",
  recordSharedExpensesAndFocusOnThePeopleBesideYou:
    "साझा खर्च दर्ज करें और अपने साथ के लोगों पर ध्यान दें।",
  archivedAndReadOnlyDataIsPreservedTheOwnerCanRestoreItUnderMore:
    "संग्रहीत है और केवल पढ़ा जा सकता है। डेटा सुरक्षित है; मालिक समूह सेटिंग से इसे बहाल कर सकते हैं।",
  addTravelCompanionsFirst: "पहले यात्रा के साथी जोड़ें",
  thereIsOnlyOneParticipantAddSomeoneToSplitWithBeforeRecordingTheFirstExpense:
    "केवल एक प्रतिभागी है। पहला खर्च दर्ज करने से पहले बँटवारे के लिए कोई और व्यक्ति जोड़ें।",
  addExpenseParticipant: "खर्च का प्रतिभागी जोड़ें",
  switchGroups: "समूह बदलें",
  youWillLeaveTheCurrentGroupOnlyAfterTheNewOneLoads:
    "नया समूह लोड होने के बाद ही आप मौजूदा समूह से बाहर जाएँगे।",
  participantsPeopleExpensesExpensesCurrency: (values: MessageValues) =>
    interpolate("लोग: {participants} · खर्च: {expenses} · {currency}", values),
  archived: "संग्रहीत",
  everydayMomentsTogether: "हर दिन के पल साथ में",
  collaborator: "सहयोगी",
  owner: "मालिक",
  baseCurrencyCurrency: (values: MessageValues) =>
    interpolate("मूल मुद्रा {currency}", values),
  usingCustomExchangeRates: "कस्टम विनिमय दरों का उपयोग हो रहा है",
  usingBankOfTaiwanExchangeRates:
    "Bank of Taiwan की डिफ़ॉल्ट दरों का उपयोग हो रहा है",
  usingFixedFallbackRates:
    "Bank of Taiwan उपलब्ध नहीं है; वैकल्पिक स्थिर दरों का उपयोग हो रहा है",
  loadingGroup2: "समूह लोड हो रहा है…",
  people: "लोग",
  expenses: "खर्च",
  base: "मूल",
  overview: "अवलोकन",
  more: "और",
  groupWorkspace: "समूह का कार्यक्षेत्र",
  addExpense: "खर्च जोड़ें",
  archivedGroups: "संग्रहीत समूह",
  unableToCreateGroup: "समूह बनाया नहीं जा सका",
  createGroup: "समूह बनाएँ",
  addCompanionsAfterCreatingTheGroupThenRecordSharedExpenses:
    "समूह बनाने के बाद साथी जोड़ें, फिर साझा खर्च दर्ज करें।",
  groupName: "समूह का नाम",
  fiveDaysInTokyo: "Tokyo में पाँच दिन",
  baseCurrency: "मूल मुद्रा",
  createYourFirstGroup: "अपना पहला समूह बनाएँ",
  addATripOrEventGroupOrCreateOneFromAnExistingJsonBackup:
    "यात्रा या कार्यक्रम का समूह जोड़ें, या मौजूदा JSON बैकअप से बनाएँ।",
  groupExpenseSummary: "समूह के खर्च का सारांश",
  totalSharedExpenses: "कुल साझा खर्च",
  convertedToBaseCurrency: "मूल मुद्रा में बदला गया",
  outstanding: "बकाया",
  countSuggestedPaymentsToSettleUp: (values: MessageValues) =>
    interpolate("हिसाब चुकाने के लिए सुझाए गए भुगतान: {count}", values),
  nothingIsCurrentlyOutstanding: "अभी कुछ भी बकाया नहीं है",
  settlementSuggestionsAppearAfterExpensesAreAdded:
    "खर्च जोड़ने के बाद हिसाब चुकाने के सुझाव दिखेंगे",
  expenseRecords: "खर्च के रिकॉर्ड",
  sharedAmongCountPeople: (values: MessageValues) =>
    interpolate(
      pluralForm("hi", values.count, {
        one: "{count} व्यक्ति के साथ साझा किया गया",
        other: "{count} लोगों के साथ साझा किया गया",
      }),
      values,
    ),
  calculatedFromCurrentExpensesAndRecordedPayments:
    "मौजूदा खर्च और दर्ज भुगतान से गणना की गई।",
  settleUp: "हिसाब चुकाएँ",
  countEntries: (values: MessageValues) =>
    interpolate(
      pluralForm("hi", values.count, {
        one: "{count} प्रविष्टि",
        other: "{count} प्रविष्टियाँ",
      }),
      values,
    ),
  entries: "प्रविष्टियाँ",
  seePaymentsAndSharesAtAGlance: "भुगतान और हिस्से एक नज़र में देखें।",
  balances: "शेष राशियाँ",
  recentExpenses: "हाल के खर्च",
  noExpensesYet: "अभी कोई खर्च नहीं है",
  thisGroupHasNotRecordedAnySharedExpenses:
    "इस समूह ने अभी कोई साझा खर्च दर्ज नहीं किया है।",
  recordTheFirstSharedExpense: "पहला साझा खर्च दर्ज करें",
  addThePeopleSplittingExpensesToCalculateEachBalance:
    "पहले खर्च बाँटने वाले लोग जोड़ें, फिर अपना पहला खर्च दर्ज करें। शेष राशियाँ और हिसाब चुकाने के सुझाव अपने आप दिखेंगे।",
  balancesAndSettlementSuggestionsWillAppearHereAfterYouAddExpenses:
    "खर्च जोड़ने के बाद यहाँ शेष राशियाँ और हिसाब चुकाने के सुझाव दिखेंगे।",
  addPerson: "व्यक्ति जोड़ें",
  managePeople: "लोगों को प्रबंधित करें",
  everythingIsSettled: "सारा हिसाब चुकता है",
  thereAreNoOutstandingPayments: "कोई भुगतान बकाया नहीं है।",
  paymentRecorded: "भुगतान दर्ज किया गया",
  unableToRecordPayment: "भुगतान दर्ज नहीं हो सका",
  recordPayment: "भुगतान दर्ज करें",
  recordSettlementPayment: "हिसाब चुकाने का भुगतान दर्ज करें",
  fromPaysToTheFullSuggestedAmountIsPrefilled: (values: MessageValues) =>
    interpolate(
      "{from}, {to} को भुगतान करते हैं; सुझाई गई पूरी राशि पहले से भरी है।",
      values,
    ),
  paymentAmountCurrency: (values: MessageValues) =>
    interpolate("भुगतान की राशि ({currency})", values),
  enterAPaymentAmount: "भुगतान की राशि डालें",
  thePaymentMustBeGreaterThan0AndNoMoreThanTheSuggestedAmount:
    "भुगतान 0 से अधिक और सुझाई गई राशि से ज़्यादा नहीं होना चाहिए",
  expectedRemainder: "अनुमानित बाकी राशि: ",
  paymentDate: "भुगतान की तारीख",
  noteOptional: "नोट (वैकल्पिक)",
  recordPayment2: "भुगतान दर्ज करें",
  paymentHistory: "भुगतान का इतिहास",
  dateFromPaidTo: (values: MessageValues) =>
    interpolate("{date} · {from} ने {to} को भुगतान किया", values),
  deletePayment: "भुगतान हटाएँ",
  remainingSettlementSuggestionsWillBeRecalculated:
    "हिसाब चुकाने के बाकी सुझावों की फिर गणना होगी।",
  paymentDeleted: "भुगतान हटाया गया",
  deleteFailed: "हटाया नहीं जा सका",
  deleteThisPayment: "यह भुगतान हटाएँ?",
  delete: "हटाएँ",
  datePaidByNameSplitWithSplit: (values: MessageValues) =>
    interpolate("{date} · भुगतानकर्ता: {name} · बँटवारे में: {split}", values),
  dailySpending: "दैनिक खर्च",
  paidByPerson: "व्यक्ति के अनुसार भुगतान",
  byCategory: "श्रेणी के अनुसार",
  spendingAnalysis: "खर्च का विश्लेषण",
  totalAmount: (values: MessageValues) => interpolate("कुल {amount}", values),
  noDataYet: "अभी कोई डेटा नहीं है।",
  showingShownOfTotalExpenses: (values: MessageValues) =>
    interpolate("दिखाए गए खर्च: {total} में से {shown}", values),
  searchDescriptions: "विवरण खोजें",
  searchExpenseDescriptions: "खर्च के विवरण खोजें",
  sort: "क्रमबद्ध करें",
  groupBy: "इसके अनुसार समूह बनाएँ",
  noGrouping: "बिना समूह के",
  groupByDate: "तारीख के अनुसार समूह बनाएँ",
  groupByPayer: "भुगतानकर्ता के अनुसार समूह बनाएँ",
  dateNewestFirst: "तारीख: सबसे नई पहले",
  dateOldestFirst: "तारीख: सबसे पुरानी पहले",
  amountHighToLow: "राशि: अधिक से कम",
  amountLowToHigh: "राशि: कम से अधिक",
  moreFilters: "और फ़िल्टर",
  countApplied: (values: MessageValues) =>
    interpolate("लागू फ़िल्टर: {count}", values),
  datePersonCurrencyCategoryAndTag: "तारीख, व्यक्ति, मुद्रा, श्रेणी और टैग",
  from: "से",
  to: "तक",
  paidBy: "भुगतानकर्ता",
  splitWith: "बँटवारे में शामिल",
  expenseParticipants: "खर्च के प्रतिभागी",
  currency: "मुद्रा",
  allCurrencies: "सभी मुद्राएँ",
  category: "श्रेणी",
  allCategories: "सभी श्रेणियाँ",
  tag: "टैग",
  exactTag: "सटीक टैग",
  applied: "लागू:",
  clearAll: "सभी हटाएँ",
  allPeople: "सभी लोग",
  categoryValue: (values: MessageValues) =>
    interpolate("श्रेणी: {value}", values),
  currencyValue: (values: MessageValues) =>
    interpolate("मुद्रा: {value}", values),
  fromValue: (values: MessageValues) => interpolate("से: {value}", values),
  toValue: (values: MessageValues) => interpolate("तक: {value}", values),
  tagValue: (values: MessageValues) => interpolate("टैग: {value}", values),
  aCompleteHistoryWillAppearHereAfterTheFirstSharedExpense:
    "पहले साझा खर्च के बाद यहाँ पूरा इतिहास दिखेगा।",
  recordFirstExpense: "पहला खर्च दर्ज करें",
  noMatchingExpenses: "कोई मेल खाता खर्च नहीं है",
  adjustOrClearTheFiltersToSeeAllExpenses:
    "सभी खर्च देखने के लिए फ़िल्टर बदलें या हटाएँ।",
  clearFilters: "फ़िल्टर हटाएँ",
  filteredExpenses: "फ़िल्टर किए गए खर्च",
  allExpenses: "सभी खर्च",
  columns: "कॉलम",
  chooseExpenseColumns: "खर्च के कॉलम चुनें",
  expenseName: "खर्च",
  splitParticipants: "बँटवारा",
  receipt: "रसीद",
  tags: "टैग",
  restoreDefaults: "डिफ़ॉल्ट बहाल करें",
  actions: "कार्रवाइयाँ",
  expenseGroupSummary: (values: MessageValues) =>
    interpolate("खर्च: {count} · {total}", values),
  countPeople: (values: MessageValues) => interpolate("{count} व्यक्ति", values),
  viewReceiptForName: (values: MessageValues) =>
    interpolate("{name} की रसीद देखें", values),
  receiptPreviewForName: (values: MessageValues) =>
    interpolate("“{name}” की रसीद", values),
  receiptImageForName: (values: MessageValues) =>
    interpolate("{name} की रसीद का चित्र", values),
  closeReceiptPreviewHint: "बंद करने के लिए चित्र पर क्लिक करें या Esc दबाएँ।",
  closeReceiptPreview: "रसीद का पूर्वावलोकन बंद करें",
  openOriginalReceipt: "मूल चित्र खोलें",
  moreActionsForName: (values: MessageValues) =>
    interpolate("{name} के लिए और कार्रवाइयाँ", values),
  datePaidByName: (values: MessageValues) =>
    interpolate("{date} · भुगतानकर्ता: {name}", values),
  splitWithSplit: (values: MessageValues) =>
    interpolate("बँटवारे में: {split}", values),
  edit: "बदलें",
  receiptUploadFailed: "रसीद अपलोड नहीं हो सकी",
  receiptUploaded: "रसीद अपलोड की गई",
  uploading: "अपलोड हो रहा है…",
  uploadReceipt: "रसीद अपलोड करें",
  receiptFileRequirements: "JPEG, PNG या WebP · अधिकतम 5 MB",
  selectReceiptPhoto: "फ़ोटो अपलोड करें",
  takeReceiptPhoto: "फ़ोटो लें",
  removeReceiptPhoto: "फ़ोटो हटाएँ",
  receiptOnlineOnly:
    "फ़ोटो के लिए कनेक्शन चाहिए; ऑफ़लाइन ड्राफ़्ट में फ़ोटो सहेजी नहीं जातीं। पहले फ़ोटो हटाएँ या फिर से कनेक्ट करें।",
  receiptFileTooLarge: "फ़ोटो 5 MB या उससे छोटी होनी चाहिए",
  expenseSavedReceiptFailed:
    "खर्च बनाया गया, लेकिन रसीद अपलोड नहीं हो सकी। अभी फिर कोशिश करें या बाद में खर्च की सूची से जोड़ें।",
  retryReceiptUpload: "रसीद अपलोड की फिर कोशिश करें",
  receiptAlreadyAttached:
    "इस खर्च में पहले से रसीद है। खर्च की सूची से उसकी जाँच करें; उसे अपने आप बदला नहीं जाएगा",
  uploadReceiptLater: "बाद में अपलोड करें",
  expenseCreationUncertain:
    "खर्च बना या नहीं, इसकी पुष्टि नहीं हो सकी। फिर जोड़ने से पहले खर्च की सूची देखें; तुरंत दोबारा कोशिश न करें।",
  viewReceipt: "रसीद देखें",
  noReceipt: "कोई रसीद नहीं",
  deleteReceipt: "रसीद हटाएँ",
  youCanUploadAnotherReceiptLaterTheExpenseWillNotBeDeleted:
    "आप बाद में दूसरी रसीद अपलोड कर सकते हैं; खर्च नहीं हटेगा।",
  receiptDeleted: "रसीद हटाई गई",
  deleteThisReceipt: "यह रसीद हटाएँ?",
  deleteName: (values: MessageValues) => interpolate("“{name}” हटाएँ", values),
  thisCannotBeUndoneAllBalancesAndSettlementSuggestionsWillBeRecalculated:
    "इसे वापस नहीं किया जा सकता। सभी शेष राशियों और हिसाब चुकाने के सुझावों की फिर गणना होगी।",
  expenseDeleted: "खर्च हटाया गया",
  deleteThisExpense: "यह खर्च हटाएँ?",
  invalidSplitFormat: "बँटवारे का फ़ॉर्मैट अमान्य है",
  selectAtLeastOnePersonToSplitWith: "बँटवारे के लिए कम से कम एक व्यक्ति चुनें",
  expenseChangesSaved: "खर्च के बदलाव सहेजे गए",
  expenseRecorded: "खर्च दर्ज किया गया",
  unableToSaveExpense: "खर्च सहेजा नहीं जा सका",
  reviewTheSplitPreviewBeforeSavingChanges:
    "बदलाव सहेजने से पहले बँटवारे का पूर्वावलोकन जाँचें।",
  enterTheRequiredDetailsFirstCustomSplitsAndTagsAreAvailableBelow:
    "पहले आवश्यक विवरण डालें। कस्टम बँटवारा और टैग नीचे उपलब्ध हैं।",
  editExpense: "खर्च बदलें",
  addExpense2: "खर्च जोड़ें",
  discardDraft: "ड्राफ़्ट छोड़ दें",
  unsavedChangesWillBeLostExistingDataWillNotChange:
    "बिना सहेजे बदलाव खो जाएँगे। मौजूदा डेटा नहीं बदलेगा।",
  discardThisDraft: "यह ड्राफ़्ट छोड़ दें?",
  description: "विवरण",
  dinnerHotelTrainTickets: "रात का खाना, होटल, ट्रेन टिकट",
  enterAnExpenseDescription: "खर्च का विवरण डालें",
  amount: "राशि",
  enterAnExpenseAmount: "खर्च की राशि डालें",
  date: "तारीख",
  currency2: "मुद्रा",
  splitPreview: "बँटवारे का पूर्वावलोकन",
  enterAnAmountToPreviewEachPersonsShare:
    "हर व्यक्ति के हिस्से का पूर्वावलोकन देखने के लिए राशि डालें।",
  namePaidAmount: (values: MessageValues) =>
    interpolate("{name} ने {amount} का भुगतान किया", values),
  changePeopleAndSplitMethod: "लोग और बँटवारे का तरीका बदलें",
  selectedSelectedOfTotal: (values: MessageValues) =>
    interpolate("चयन: {total} में से {selected}", values),
  selectAll: "सभी चुनें",
  clear: "साफ़ करें",
  splitMethod: "बँटवारे का तरीका",
  splitEqually: "बराबर बाँटें",
  exactAmounts: "सटीक राशियाँ",
  percentages: "प्रतिशत",
  shares: "अनुपात के हिस्से",
  nameSKind: (values: MessageValues) => interpolate("{name}: {kind}", values),
  moreDetails: "और विवरण",
  categoryAndTags: "श्रेणी और टैग",
  separateWithCommasForExampleBreakfastTransport:
    "कॉमा से अलग करें, जैसे नाश्ता, परिवहन",
  unsavedChangesWillBeLost: "बिना सहेजे बदलाव खो जाएँगे।",
  cancelEditing: "संपादन रद्द करें?",
  saveChanges: "बदलाव सहेजें",
  recordExpense: "खर्च दर्ज करें",
  settlementRepresentative: "हिसाब चुकाने का प्रतिनिधि",
  settledByName: (values: MessageValues) =>
    interpolate("हिसाब चुकाने का प्रतिनिधि: {name}", values),
  settleSeparately: "स्वयं (अलग हिसाब चुकाएँ)",
  settlementRepresentativeHelp:
    "खर्च प्रति व्यक्ति बाँटे जाते हैं; शेष राशि और हिसाब चुकाने के सुझावों में व्यक्ति की शुद्ध शेष राशि उसके प्रतिनिधि के अंतर्गत शामिल होती है। प्रतिनिधि को किसी अन्य व्यक्ति के अंतर्गत नहीं रखा जा सकता।",
  representativeHasDependents:
    "अन्य सदस्यों के प्रतिनिधि के रूप में यह व्यक्ति चुना गया है। पहले वे चयन हटाएँ।",
  settlementRepresentativeUpdated: "हिसाब चुकाने का प्रतिनिधि अपडेट किया गया",
  unableToUpdateSettlementRepresentative:
    "हिसाब चुकाने का प्रतिनिधि अपडेट नहीं हो सका",
  provideParticipantChanges: "अपडेट करने के लिए प्रतिभागी का विवरण दें",
  invalidSettlementRepresentative: "हिसाब चुकाने का प्रतिनिधि अमान्य है",
  settlementRepresentativeMustBeAnotherGroupMember:
    "हिसाब चुकाने का प्रतिनिधि इस समूह का कोई दूसरा सदस्य होना चाहिए",
  settlementRepresentativeCannotBeAssignedOrHaveDependents:
    "हिसाब चुकाने का प्रतिनिधि किसी और के माध्यम से हिसाब नहीं चुका सकता, और इस व्यक्ति के माध्यम से अन्य सदस्य हिसाब नहीं चुका रहे होने चाहिए",
  invalidBackupSettlementRepresentative:
    "बैकअप में हिसाब चुकाने का प्रतिनिधि अमान्य है",
  expenseParticipantAdded: "खर्च का प्रतिभागी जोड़ा गया",
  unableToAddPerson: "व्यक्ति जोड़ा नहीं जा सका",
  expenseParticipantsDoNotNeedToSignInManageAccountsWithAccessUnderMoreSharingAndAccess:
    "खर्च के प्रतिभागियों को साइन इन करने की आवश्यकता नहीं है। पहुँच वाले खातों को समूह सेटिंग → साझा करना और पहुँच में प्रबंधित करें।",
  personsName: "व्यक्ति का नाम",
  friendsName: "दोस्त का नाम",
  enterAName: "नाम डालें",
  archivedGroupsAreReadOnlyRestoreThisGroupToChangeParticipants:
    "संग्रहीत समूह केवल पढ़े जा सकते हैं। प्रतिभागी बदलने के लिए यह समूह बहाल करें।",
  usedByAPayment: "एक भुगतान में उपयोग किया गया है",
  cannotDeleteReasonUpdateRelatedExpensesFirstOrUseTheMergeToolBelow: (
    values: MessageValues,
  ) =>
    interpolate(
      "हटाया नहीं जा सकता: {reason}। पहले संबंधित खर्च अपडेट करें, या नीचे विलय उपकरण का उपयोग करें।",
      values,
    ),
  deleteName2: (values: MessageValues) => interpolate("{name} हटाएँ", values),
  thisPersonHasNoExpensesOrPaymentsDeletionCannotBeUndone:
    "इस व्यक्ति के कोई खर्च या भुगतान नहीं हैं। हटाने को वापस नहीं किया जा सकता।",
  expenseParticipantDeleted: "खर्च का प्रतिभागी हटाया गया",
  deleteThisExpenseParticipant: "खर्च के इस प्रतिभागी को हटाएँ?",
  nameUpdated: "नाम अपडेट किया गया",
  unableToUpdateName: "नाम अपडेट नहीं हो सका",
  rename: "नाम बदलें",
  renameName: (values: MessageValues) =>
    interpolate("{name} का नाम बदलें", values),
  existingExpensesAndPaymentsWillRemainLinkedToThisPerson:
    "मौजूदा खर्च और भुगतान इस व्यक्ति से जुड़े रहेंगे।",
  newName: "नया नाम",
  saveName: "नाम सहेजें",
  advancedPeopleTools: "लोगों के लिए उन्नत उपकरण",
  mergeDuplicatePeople: "एक ही व्यक्ति की दो प्रविष्टियाँ मिलाएँ",
  sourcePerson: "मूल व्यक्ति",
  targetPerson: "लक्ष्य व्यक्ति",
  mergeInto: "इसमें मिलाएँ",
  changePreview: "बदलाव का पूर्वावलोकन",
  expensesRelatedExpensesAndPaymentsPaymentsForSourceWillMoveToTargetThenTheSourcePersonWillBeDeleted:
    (values: MessageValues) =>
      interpolate(
        "{source} के {expenses} संबंधित खर्च और {payments} भुगतान {target} में जाएँगे, फिर मूल व्यक्ति हटाया जाएगा।",
        values,
      ),
  mergePeople: "लोगों की प्रविष्टियाँ मिलाएँ",
  sourceWillBeDeletedAndRelatedDataWillBeTransferredToTargetAtomically: (
    values: MessageValues,
  ) =>
    interpolate(
      "{source} को हटाना और संबंधित डेटा को {target} में भेजना एक अविभाज्य कार्रवाई में होगा।",
      values,
    ),
  expenseParticipantsMerged: "खर्च के प्रतिभागी मिला दिए गए",
  mergeFailed: "विलय नहीं हो सका",
  applyMerge: "विलय लागू करें?",
  previewAndMerge: "पूर्वावलोकन देखें और मिलाएँ",
} satisfies CatalogShape<typeof zhTW>;
