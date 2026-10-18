import { interpolate, type MessageValues } from "./message-types.js";

export const filAuth = {
  usernameMustBe332LettersNumbersUnderscoresOrHyphens:
    "Dapat 3–32 character ang username at mga titik, numero, underscore, o gitling lamang ang gamitin",
  travelTogetherSplitExpensesEasily:
    "Maglakbay nang sama-sama, madaling hatiin ang mga gastos",
  goodFriendsSplitExpensesWell:
    "Maayos maghati ng gastos ang mabubuting kaibigan.",
  skipToMainContent: "Lumaktaw sa pangunahing nilalaman",
  otterHome: "Pangunahing pahina ng otter",
  loading: "Nilo-load",
  unableToLoadOtter: "Hindi ma-load ang otter",
  loadingFailed: "Hindi na-load",
  reload: "I-reload",
  signedIn: "Naka-sign in na",
  accountCreated: "Nagawa ang account",
  unableToAuthenticate: "Hindi mapatunayan ang pagkakakilanlan",
  authenticationRequestsTooFrequentTryAgainLater:
    "Masyadong maraming request sa pagpapatunay ng pagkakakilanlan. Subukan muli mamaya.",
  usernameUpdated: "Nabago ang username",
  signedOut: "Naka-sign out na",
  signOutFailedMessage: (values: MessageValues) =>
    interpolate("Hindi nakapag-sign out: {message}", values),
  pleaseTryAgainLater: "Subukan muli mamaya",
  signingOut: "Nagsa-sign out…",
  signOut: "Mag-sign out",
  authorizeCli: "Ikonekta ang CLI",
  authorizeCliDescription:
    "Ilagay ang device code na ipinapakita sa iyong terminal upang pahintulutan ang CLI na ito na ma-access ang iyong datos sa Otter.",
  deviceCode: "Code ng device",
  checkDeviceCode: "Magpatuloy",
  checkingDeviceCode: "Sinusuri…",
  cliAccessRequest: "Request para sa access ng CLI",
  cliAccessRequestedBy: "Humiling",
  approveCliAccess: "Pahintulutan ang access",
  approvingCliAccess: "Pinapahintulutan…",
  cliAccessApproved: "Nakakonekta na ang CLI",
  cliAccessApprovedDescription:
    "Maaari mo nang isara ang pahinang ito at bumalik sa iyong terminal.",
  deviceCodeNotFoundOrExpired:
    "Hindi makita ang device code o wala na itong bisa",
  enterAValidDeviceCode: "Maglagay ng wastong device code",
  youAreOfflineLoadedDataIsAvailableButEditingRequiresAConnection:
    "Offline ka. Magagamit ang na-load na datos, ngunit kailangan ng koneksyon para mag-edit.",
  travelTogetherSplitWithEase: "Maglakbay nang sama-sama, madaling maghati",
  spendYourTimeOnTheJourney: "Ilaan ang iyong oras sa paglalakbay,",
  andLeaveTheSplittingToOtter: "at ipaubaya sa otter ang paghahati.",
  fromDinnerToAFullTripRecordEverySharedExpenseAndKeepGroupFinancesSimpleAndClear:
    "Mula sa hapunan hanggang sa buong biyahe, itala ang bawat pinaghatiang gastos at panatilihing simple at malinaw ang pananalapi ng grupo.",
  splitExampleAWeekendTripDinnerCostsTwd1800ForThreePeopleOrTwd600Each:
    "Halimbawa ng paghahati: ang hapunan sa biyahe sa katapusan ng linggo ay TWD 1,800 para sa tatlong tao, o TWD 600 bawat isa.",
  weekendTrip: "Biyahe sa katapusan ng linggo",
  splitExample: "Halimbawa ng paghahati",
  dinnerTogether: "Sama-samang hapunan",
  you: "Ikaw",
  a: "A",
  y: "Y",
  splitEquallyAmong3: "Hatiin nang pantay sa 3",
  each: "bawat isa",
  quicklyRecordSharedExpenses: "Mabilis na itala ang mga pinaghatiang gastos",
  seeWhoOwesAndWhoIsOwedAtAGlance:
    "Makita agad kung sino ang may utang at sino ang dapat bayaran",
  settleUpWithClearSuggestions:
    "Ayusin ang utang gamit ang malinaw na mga mungkahi",
  signIn: "Mag-sign in",
  createAccount: "Gumawa ng account",
  welcomeBackContinueYourJourney:
    "Maligayang pagbabalik. Ipagpatuloy ang iyong paglalakbay.",
  createYourFirstGroupAndStartSplittingWithEase:
    "Gumawa ng iyong unang grupo at simulang hatiin nang madali ang mga gastos.",
  username: "Username",
  enterAUsername: "Maglagay ng username",
  password: "Password",
  enterAPassword: "Maglagay ng password",
  developmentCredentialsHaveBeenFilledIn:
    "Nailagay na ang mga kredensyal para sa development.",
  signingIn: "Nagsa-sign in…",
  or: "o",
  signInWithAPasskey: "Mag-sign in gamit ang Passkey",
  signingInWithAPasskey: "Nagsa-sign in gamit ang Passkey…",
  unableToSignInWithAPasskey:
    "Hindi makapag-sign in gamit ang Passkey. Subukan muli o gamitin ang iyong password.",
  needAnAccount: "Kailangan ng account?",
  usernameIsNotCaseSensitive:
    "Walang pagkakaiba ang malaki at maliit na titik sa username.",
  passwordMustBeAtLeast8Characters:
    "Dapat may hindi bababa sa 8 character ang password",
  passwordMustBeAtLeast8Characters2:
    "Dapat may hindi bababa sa 8 character ang password.",
  creating: "Ginagawa…",
  createAccountWithAPasskey: "Gumawa ng account gamit ang Passkey",
  creatingAccountWithAPasskey: "Gumagawa ng account gamit ang Passkey…",
  unableToCreateAccountWithAPasskey:
    "Hindi makagawa ng account gamit ang Passkey. Subukan muli.",
  alreadyHaveAnAccount: "May account ka na?",
  backToSignIn: "Bumalik sa pag-sign in",
  expenseParticipantsDoNotNeedAccountsToBeIncludedInAGroup:
    "Hindi kailangan ng account ng mga kalahok sa gastos upang maisama sa isang grupo.",
  changeNameSUsername: (values: MessageValues) =>
    interpolate("Palitan ang username ni {name}", values),
  nameSAccountMenu: (values: MessageValues) =>
    interpolate("Menu ng account ni {name}", values),
  unableToUpdateUsername: "Hindi mabago ang username",
  changeUsername: "Palitan ang username",
  passkeyRegistrationRequestsTooFrequent:
    "Masyadong maraming request sa pagpaparehistro ng Passkey. Subukan muli mamaya.",
  passkeyRegistrationResponseIsInvalid:
    "Hindi wasto ang tugon sa pagpaparehistro ng Passkey",
  passkeyRegistrationRequestExpired:
    "Wala nang bisa ang request sa pagpaparehistro ng Passkey. Subukan muli.",
  unableToVerifyPasskey: "Hindi mapatunayan ang Passkey. Subukan muli.",
  passkeyAlreadyRegistered: "Nakarehistro na ang Passkey na ito",
  passkeyNotFound: "Hindi makita ang Passkey",
  cannotRemoveOnlyPasskey:
    "Kung aalisin mo ang nag-iisa mong Passkey, mawawala ang access mo sa account",
  passkeyLoginResponseIsInvalid:
    "Hindi wasto ang tugon sa pag-sign in gamit ang Passkey",
  passkeyLoginRequestExpired:
    "Wala nang bisa ang request sa pag-sign in gamit ang Passkey. Subukan muli.",
  unableToUsePasskeyToSignIn: "Hindi makapag-sign in gamit ang Passkey na ito",
  cancel: "Kanselahin",
  saving: "Sine-save…",
  save: "I-save",
  connectionFailedPleaseTryAgainLater:
    "Hindi makakonekta. Subukan muli mamaya.",
  theServerReturnedAnInvalidResponse:
    "Nagbalik ang server ng hindi wastong tugon.",
  everyone: "Lahat",
  unknown: "Hindi alam",
  atLeastOneParticipantIsRequired: "Kailangan ng hindi bababa sa isang kalahok",
  usedByAnExpense: "Ginagamit sa isang gastos",
  youAreOfflineReconnectAndTryAgain:
    "Offline ka. Kumonekta muli at subukan ulit.",
  working: "Pinoproseso…",
  unableToApplyChanges: "Hindi mailapat ang mga pagbabago",
  applying: "Inilalapat…",
};
