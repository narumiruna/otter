import {
  type CatalogShape,
  interpolate,
  type MessageValues,
  pluralForm,
} from "./message-types.js";
import { nlErrors } from "./messages-nl-errors.js";
import { nlFeatures } from "./messages-nl-features.js";
import { nlSettings } from "./messages-nl-settings.js";
import type { zhTW } from "./messages-zh-tw.js";

export const nl = {
  backToExpenseList: "Terug naar de uitgavenlijst",
  expenseEditorUnavailable:
    "Deze uitgave kan niet worden bewerkt. De uitgave bestaat mogelijk niet, of de groep is alleen-lezen of gearchiveerd.",
  ...nlFeatures,
  ...nlSettings,
  ...nlErrors,
  usernameMustBe332LettersNumbersUnderscoresOrHyphens:
    "De gebruikersnaam moet uit 3–32 letters, cijfers, onderstrepingstekens of koppeltekens bestaan",
  travelTogetherSplitExpensesEasily: "Samen reizen, eenvoudig uitgaven delen",
  goodFriendsSplitExpensesWell: "Goede vrienden verdelen uitgaven eerlijk.",
  skipToMainContent: "Naar hoofdinhoud",
  otterHome: "otter-startpagina",
  loading: "Laden",
  unableToLoadOtter: "otter laden is mislukt",
  loadingFailed: "Laden mislukt",
  reload: "Opnieuw laden",
  signedIn: "Aangemeld",
  accountCreated: "Account aangemaakt",
  unableToAuthenticate: "Identiteit verifiëren is mislukt",
  authenticationRequestsTooFrequentTryAgainLater:
    "Te veel verificatieverzoeken. Probeer het later opnieuw.",
  usernameUpdated: "Gebruikersnaam bijgewerkt",
  signedOut: "Afgemeld",
  signOutFailedMessage: (values: MessageValues) =>
    interpolate("Afmelden mislukt: {message}", values),
  pleaseTryAgainLater: "Probeer het later opnieuw",
  signingOut: "Afmelden…",
  signOut: "Afmelden",
  authorizeCli: "CLI verbinden",
  authorizeCliDescription:
    "Voer de apparaatcode uit je terminal in om deze CLI toegang te geven tot je Otter-gegevens.",
  deviceCode: "Apparaatcode",
  checkDeviceCode: "Doorgaan",
  checkingDeviceCode: "Controleren…",
  cliAccessRequest: "CLI-toegangsverzoek",
  cliAccessRequestedBy: "Aangevraagd door",
  approveCliAccess: "Toegang goedkeuren",
  approvingCliAccess: "Goedkeuren…",
  cliAccessApproved: "CLI verbonden",
  cliAccessApprovedDescription:
    "Je kunt deze pagina sluiten en teruggaan naar je terminal.",
  deviceCodeNotFoundOrExpired: "Apparaatcode niet gevonden of verlopen",
  enterAValidDeviceCode: "Voer een geldige apparaatcode in",
  youAreOfflineLoadedDataIsAvailableButEditingRequiresAConnection:
    "Je bent offline. Geladen gegevens zijn beschikbaar, maar bewerken vereist een verbinding.",
  travelTogetherSplitWithEase: "Samen reizen, eenvoudig verdelen",
  spendYourTimeOnTheJourney: "Besteed je tijd aan de reis,",
  andLeaveTheSplittingToOtter: "en laat het verdelen aan otter over.",
  fromDinnerToAFullTripRecordEverySharedExpenseAndKeepGroupFinancesSimpleAndClear:
    "Van een etentje tot een hele reis: leg elke gedeelde uitgave vast en houd de groepsfinanciën eenvoudig en duidelijk.",
  splitExampleAWeekendTripDinnerCostsTwd1800ForThreePeopleOrTwd600Each:
    "Verdeelvoorbeeld: tijdens een weekendje weg kost een etentje TWD 1.800 voor drie personen, dus TWD 600 per persoon.",
  weekendTrip: "Weekendje weg",
  splitExample: "Verdeelvoorbeeld",
  dinnerTogether: "Samen eten",
  you: "Jij",
  a: "A",
  y: "Y",
  splitEquallyAmong3: "Gelijk verdelen over 3 personen",
  each: "per persoon",
  quicklyRecordSharedExpenses: "Gedeelde uitgaven snel vastleggen",
  seeWhoOwesAndWhoIsOwedAtAGlance:
    "In één oogopslag zien wie moet betalen en wie geld krijgt",
  settleUpWithClearSuggestions: "Verrekenen met duidelijke voorstellen",
  signIn: "Aanmelden",
  createAccount: "Account aanmaken",
  welcomeBackContinueYourJourney: "Welkom terug. Ga verder met je reis.",
  createYourFirstGroupAndStartSplittingWithEase:
    "Maak je eerste groep aan en begin eenvoudig met verdelen.",
  username: "Gebruikersnaam",
  enterAUsername: "Voer een gebruikersnaam in",
  password: "Wachtwoord",
  enterAPassword: "Voer een wachtwoord in",
  developmentCredentialsHaveBeenFilledIn:
    "De inloggegevens voor ontwikkeling zijn ingevuld.",
  signingIn: "Aanmelden…",
  or: "of",
  signInWithAPasskey: "Aanmelden met een Passkey",
  signingInWithAPasskey: "Aanmelden met een Passkey…",
  unableToSignInWithAPasskey:
    "Aanmelden met een Passkey is mislukt. Probeer het opnieuw of gebruik je wachtwoord.",
  needAnAccount: "Een account nodig?",
  usernameIsNotCaseSensitive: "De gebruikersnaam is niet hoofdlettergevoelig.",
  passwordMustBeAtLeast8Characters:
    "Het wachtwoord moet minstens 8 tekens bevatten",
  passwordMustBeAtLeast8Characters2:
    "Het wachtwoord moet minstens 8 tekens bevatten.",
  creating: "Aanmaken…",
  createAccountWithAPasskey: "Account aanmaken met een Passkey",
  creatingAccountWithAPasskey: "Account aanmaken met een Passkey…",
  unableToCreateAccountWithAPasskey:
    "Account aanmaken met een Passkey is mislukt. Probeer het opnieuw.",
  alreadyHaveAnAccount: "Heb je al een account?",
  backToSignIn: "Terug naar aanmelden",
  expenseParticipantsDoNotNeedAccountsToBeIncludedInAGroup:
    "Deelnemers aan uitgaven hebben geen account nodig om in een groep te worden opgenomen.",
  changeNameSUsername: (values: MessageValues) =>
    interpolate("Gebruikersnaam van {name} wijzigen", values),
  nameSAccountMenu: (values: MessageValues) =>
    interpolate("Accountmenu van {name}", values),
  unableToUpdateUsername: "Gebruikersnaam bijwerken is mislukt",
  changeUsername: "Gebruikersnaam wijzigen",
  passkeyRegistrationRequestsTooFrequent:
    "Te veel registratieverzoeken voor Passkeys. Probeer het later opnieuw.",
  passkeyRegistrationResponseIsInvalid:
    "Het antwoord op de Passkey-registratie is ongeldig",
  passkeyRegistrationRequestExpired:
    "Het registratieverzoek voor de Passkey is verlopen. Probeer het opnieuw.",
  unableToVerifyPasskey: "Passkey verifiëren is mislukt. Probeer het opnieuw.",
  passkeyAlreadyRegistered: "Deze Passkey is al geregistreerd",
  passkeyNotFound: "Passkey niet gevonden",
  cannotRemoveOnlyPasskey:
    "Je kunt je enige Passkey niet verwijderen zonder de toegang tot je account te verliezen",
  passkeyLoginResponseIsInvalid:
    "Het antwoord op de Passkey-aanmelding is ongeldig",
  passkeyLoginRequestExpired:
    "Het aanmeldverzoek voor de Passkey is verlopen. Probeer het opnieuw.",
  unableToUsePasskeyToSignIn: "Aanmelden met deze Passkey is mislukt",
  cancel: "Annuleren",
  saving: "Opslaan…",
  save: "Opslaan",
  connectionFailedPleaseTryAgainLater:
    "Verbinding mislukt. Probeer het later opnieuw.",
  theServerReturnedAnInvalidResponse:
    "De server heeft een ongeldig antwoord teruggestuurd.",
  everyone: "Iedereen",
  unknown: "Onbekend",
  atLeastOneParticipantIsRequired: "Er is minstens één deelnemer nodig",
  usedByAnExpense: "Gebruikt door een uitgave",
  youAreOfflineReconnectAndTryAgain:
    "Je bent offline. Maak opnieuw verbinding en probeer het nogmaals.",
  working: "Bezig…",
  unableToApplyChanges: "Wijzigingen toepassen is mislukt",
  applying: "Toepassen…",
  noBalancesYet: "Nog geen saldi.",
  settled: "Verrekend",
  getsBack: "Krijgt terug",
  owes: "Moet betalen",
  newTaiwanDollar: "Nieuwe Taiwanese dollar",
  japaneseYen: "Japanse yen",
  usDollar: "Amerikaanse dollar",
  euro: "Euro",
  singaporeDollar: "Singaporese dollar",
  poundSterling: "Brits pond",
  australianDollar: "Australische dollar",
  canadianDollar: "Canadese dollar",
  southKoreanWon: "Zuid-Koreaanse won",
  food: "Eten",
  transport: "Vervoer",
  lodging: "Verblijf",
  tickets: "Toegangskaarten",
  shopping: "Winkelen",
  other: "Overig",
  unsavedChangesWillBeLostDiscardTheDraft:
    "Niet-opgeslagen wijzigingen gaan verloren. Het concept weggooien?",
  unableToSwitchGroups: "Van groep wisselen is mislukt",
  loadingGroup: "Groep laden",
  yourSelectionWillAppearAfterItsDataLoads:
    "Je selectie verschijnt zodra de gegevens zijn geladen.",
  unableToLoadGroup: "Groep laden is mislukt",
  groupSwitcher: "Groepskiezer",
  groups: "Groepen",
  countActiveGroups: (values: MessageValues) =>
    interpolate(
      pluralForm("nl", values.count, {
        one: "{count} actieve groep",
        other: "{count} actieve groepen",
      }),
      values,
    ),
  everyTripAddsUpToSomethingWonderful: "Elke reis levert iets moois op.",
  recordSharedExpensesAndFocusOnThePeopleBesideYou:
    "Leg gedeelde uitgaven vast en richt je op de mensen om je heen.",
  archivedAndReadOnlyDataIsPreservedTheOwnerCanRestoreItUnderMore:
    "Gearchiveerd en alleen-lezen. De gegevens blijven bewaard; de eigenaar kan de groep herstellen onder Groepsinstellingen.",
  addTravelCompanionsFirst: "Voeg eerst reisgenoten toe",
  thereIsOnlyOneParticipantAddSomeoneToSplitWithBeforeRecordingTheFirstExpense:
    "Er is maar één deelnemer. Voeg iemand toe om mee te delen voordat je de eerste uitgave vastlegt.",
  addExpenseParticipant: "Uitgavendeelnemer toevoegen",
  switchGroups: "Van groep wisselen",
  youWillLeaveTheCurrentGroupOnlyAfterTheNewOneLoads:
    "Je verlaat de huidige groep pas als de nieuwe groep is geladen.",
  participantsPeopleExpensesExpensesCurrency: (values: MessageValues) =>
    interpolate(
      `${pluralForm("nl", values.participants, { one: "{participants} persoon", other: "{participants} personen" })} · ${pluralForm("nl", values.expenses, { one: "{expenses} uitgave", other: "{expenses} uitgaven" })} · {currency}`,
      values,
    ),
  archived: "Gearchiveerd",
  everydayMomentsTogether: "Samen alledaagse momenten beleven",
  collaborator: "Medewerker",
  owner: "Eigenaar",
  baseCurrencyCurrency: (values: MessageValues) =>
    interpolate("Basisvaluta {currency}", values),
  usingCustomExchangeRates: "Aangepaste wisselkoersen in gebruik",
  usingBankOfTaiwanExchangeRates:
    "Standaardkoersen van Bank of Taiwan in gebruik",
  usingFixedFallbackRates:
    "Bank of Taiwan is niet beschikbaar; vaste terugvalkoersen in gebruik",
  loadingGroup2: "Groep laden…",
  people: "Personen",
  expenses: "Uitgaven",
  base: "Basis",
  overview: "Overzicht",
  more: "Meer",
  groupWorkspace: "Groepswerkruimte",
  addExpense: "Uitgave toevoegen",
  archivedGroups: "Gearchiveerde groepen",
  unableToCreateGroup: "Groep aanmaken is mislukt",
  createGroup: "Groep aanmaken",
  addCompanionsAfterCreatingTheGroupThenRecordSharedExpenses:
    "Voeg na het aanmaken van de groep reisgenoten toe en leg daarna gedeelde uitgaven vast.",
  groupName: "Groepsnaam",
  fiveDaysInTokyo: "Vijf dagen in Tokyo",
  baseCurrency: "Basisvaluta",
  createYourFirstGroup: "Maak je eerste groep aan",
  addATripOrEventGroupOrCreateOneFromAnExistingJsonBackup:
    "Voeg een groep voor een reis of evenement toe, of maak er een aan vanuit een bestaande JSON-back-up.",
  groupExpenseSummary: "Overzicht van groepsuitgaven",
  totalSharedExpenses: "Totaal gedeelde uitgaven",
  convertedToBaseCurrency: "Omgerekend naar basisvaluta",
  outstanding: "Openstaand",
  countSuggestedPaymentsToSettleUp: (values: MessageValues) =>
    interpolate(
      pluralForm("nl", values.count, {
        one: "{count} voorgestelde betaling om te verrekenen",
        other: "{count} voorgestelde betalingen om te verrekenen",
      }),
      values,
    ),
  nothingIsCurrentlyOutstanding: "Er staat momenteel niets open",
  settlementSuggestionsAppearAfterExpensesAreAdded:
    "Verrekenvoorstellen verschijnen nadat uitgaven zijn toegevoegd",
  expenseRecords: "Uitgavenregistraties",
  sharedAmongCountPeople: (values: MessageValues) =>
    interpolate(
      pluralForm("nl", values.count, {
        one: "Verdeeld over {count} persoon",
        other: "Verdeeld over {count} personen",
      }),
      values,
    ),
  calculatedFromCurrentExpensesAndRecordedPayments:
    "Berekend op basis van huidige uitgaven en vastgelegde betalingen.",
  settleUp: "Verrekenen",
  countEntries: (values: MessageValues) =>
    interpolate(
      pluralForm("nl", values.count, {
        one: "{count} registratie",
        other: "{count} registraties",
      }),
      values,
    ),
  entries: "registraties",
  seePaymentsAndSharesAtAGlance:
    "Bekijk betalingen en ieders aandeel in één oogopslag.",
  balances: "Saldi",
  recentExpenses: "Recente uitgaven",
  noExpensesYet: "Nog geen uitgaven",
  thisGroupHasNotRecordedAnySharedExpenses:
    "Deze groep heeft nog geen gedeelde uitgaven vastgelegd.",
  recordTheFirstSharedExpense: "De eerste gedeelde uitgave vastleggen",
  addThePeopleSplittingExpensesToCalculateEachBalance:
    "Voeg eerst de personen toe die de uitgaven delen en leg dan je eerste uitgave vast. Saldi en verrekenvoorstellen verschijnen automatisch.",
  balancesAndSettlementSuggestionsWillAppearHereAfterYouAddExpenses:
    "Saldi en verrekenvoorstellen verschijnen hier nadat je uitgaven hebt toegevoegd.",
  addPerson: "Persoon toevoegen",
  managePeople: "Personen beheren",
  everythingIsSettled: "Alles is verrekend",
  thereAreNoOutstandingPayments: "Er zijn geen openstaande betalingen.",
  paymentRecorded: "Betaling vastgelegd",
  unableToRecordPayment: "Betaling vastleggen is mislukt",
  recordPayment: "Betaling vastleggen",
  recordSettlementPayment: "Verrekenbetaling vastleggen",
  fromPaysToTheFullSuggestedAmountIsPrefilled: (values: MessageValues) =>
    interpolate(
      "{from} betaalt aan {to}; het volledige voorgestelde bedrag is ingevuld.",
      values,
    ),
  paymentAmountCurrency: (values: MessageValues) =>
    interpolate("Betalingsbedrag ({currency})", values),
  enterAPaymentAmount: "Voer een betalingsbedrag in",
  thePaymentMustBeGreaterThan0AndNoMoreThanTheSuggestedAmount:
    "De betaling moet groter zijn dan 0 en mag niet hoger zijn dan het voorgestelde bedrag",
  expectedRemainder: "Verwacht restant: ",
  paymentDate: "Betalingsdatum",
  noteOptional: "Notitie (optioneel)",
  recordPayment2: "Betaling vastleggen",
  paymentHistory: "Betalingsgeschiedenis",
  dateFromPaidTo: (values: MessageValues) =>
    interpolate("{date} · {from} betaalde aan {to}", values),
  deletePayment: "Betaling verwijderen",
  remainingSettlementSuggestionsWillBeRecalculated:
    "De resterende verrekenvoorstellen worden opnieuw berekend.",
  paymentDeleted: "Betaling verwijderd",
  deleteFailed: "Verwijderen mislukt",
  deleteThisPayment: "Deze betaling verwijderen?",
  delete: "Verwijderen",
  datePaidByNameSplitWithSplit: (values: MessageValues) =>
    interpolate("{date} · betaald door {name} · gedeeld met {split}", values),
  dailySpending: "Dagelijkse uitgaven",
  paidByPerson: "Betaald per persoon",
  byCategory: "Per categorie",
  spendingAnalysis: "Uitgavenanalyse",
  totalAmount: (values: MessageValues) =>
    interpolate("Totaal {amount}", values),
  noDataYet: "Nog geen gegevens.",
  showingShownOfTotalExpenses: (values: MessageValues) =>
    interpolate(
      pluralForm("nl", values.total, {
        one: "{shown} van {total} uitgave weergegeven",
        other: "{shown} van {total} uitgaven weergegeven",
      }),
      values,
    ),
  searchDescriptions: "Omschrijvingen zoeken",
  searchExpenseDescriptions: "Uitgavenomschrijvingen zoeken",
  sort: "Sorteren",
  groupBy: "Groeperen op",
  noGrouping: "Geen groepering",
  groupByDate: "Groeperen op datum",
  groupByPayer: "Groeperen op betaler",
  dateNewestFirst: "Datum: nieuwste eerst",
  dateOldestFirst: "Datum: oudste eerst",
  amountHighToLow: "Bedrag: hoog naar laag",
  amountLowToHigh: "Bedrag: laag naar hoog",
  moreFilters: "Meer filters",
  countApplied: (values: MessageValues) =>
    interpolate("{count} toegepast", values),
  datePersonCurrencyCategoryAndTag:
    "Datum, persoon, valuta, categorie en label",
  from: "Van",
  to: "Tot",
  paidBy: "Betaald door",
  splitWith: "Gedeeld met",
  expenseParticipants: "Uitgavendeelnemers",
  currency: "Valuta",
  allCurrencies: "Alle valuta's",
  category: "Categorie",
  allCategories: "Alle categorieën",
  tag: "Label",
  exactTag: "Exact label",
  applied: "Toegepast:",
  clearAll: "Alles wissen",
  allPeople: "Alle personen",
  categoryValue: (values: MessageValues) =>
    interpolate("Categorie: {value}", values),
  currencyValue: (values: MessageValues) =>
    interpolate("Valuta: {value}", values),
  fromValue: (values: MessageValues) => interpolate("Van: {value}", values),
  toValue: (values: MessageValues) => interpolate("Tot: {value}", values),
  tagValue: (values: MessageValues) => interpolate("Label: {value}", values),
  aCompleteHistoryWillAppearHereAfterTheFirstSharedExpense:
    "Een volledige geschiedenis verschijnt hier na de eerste gedeelde uitgave.",
  recordFirstExpense: "Eerste uitgave vastleggen",
  noMatchingExpenses: "Geen overeenkomende uitgaven",
  adjustOrClearTheFiltersToSeeAllExpenses:
    "Pas de filters aan of wis ze om alle uitgaven te zien.",
  clearFilters: "Filters wissen",
  filteredExpenses: "Gefilterde uitgaven",
  allExpenses: "Alle uitgaven",
  columns: "Kolommen",
  chooseExpenseColumns: "Uitgavenkolommen kiezen",
  expenseName: "Uitgave",
  splitParticipants: "Verdeling",
  receipt: "Bon",
  tags: "Labels",
  restoreDefaults: "Standaardinstellingen herstellen",
  actions: "Acties",
  expenseGroupSummary: (values: MessageValues) =>
    interpolate(
      pluralForm("nl", values.count, {
        one: "{count} uitgave · {total}",
        other: "{count} uitgaven · {total}",
      }),
      values,
    ),
  countPeople: (values: MessageValues) =>
    interpolate(
      pluralForm("nl", values.count, {
        one: "{count} persoon",
        other: "{count} personen",
      }),
      values,
    ),
  viewReceiptForName: (values: MessageValues) =>
    interpolate("Bon voor {name} bekijken", values),
  receiptPreviewForName: (values: MessageValues) =>
    interpolate("Bon voor ‘{name}’", values),
  receiptImageForName: (values: MessageValues) =>
    interpolate("Bonafbeelding voor {name}", values),
  closeReceiptPreviewHint:
    "Klik op de afbeelding of druk op Esc om te sluiten.",
  closeReceiptPreview: "Bonvoorbeeld sluiten",
  openOriginalReceipt: "Oorspronkelijke afbeelding openen",
  moreActionsForName: (values: MessageValues) =>
    interpolate("Meer acties voor {name}", values),
  datePaidByName: (values: MessageValues) =>
    interpolate("{date} · betaald door {name}", values),
  splitWithSplit: (values: MessageValues) =>
    interpolate("Gedeeld met {split}", values),
  edit: "Bewerken",
  receiptUploadFailed: "Bon uploaden mislukt",
  receiptUploaded: "Bon geüpload",
  uploading: "Uploaden…",
  uploadReceipt: "Bon uploaden",
  receiptFileRequirements: "JPEG, PNG of WebP · Maximaal 5 MB",
  selectReceiptPhoto: "Foto uploaden",
  takeReceiptPhoto: "Foto maken",
  removeReceiptPhoto: "Foto verwijderen",
  receiptOnlineOnly:
    "Foto's vereisen een verbinding; offlineconcepten slaan geen foto's op. Verwijder de foto of maak eerst opnieuw verbinding.",
  receiptFileTooLarge: "Foto's mogen niet groter zijn dan 5 MB",
  expenseSavedReceiptFailed:
    "Uitgave aangemaakt, maar bon uploaden is mislukt. Probeer het nu opnieuw of voeg de bon later toe vanuit de uitgavenlijst.",
  retryReceiptUpload: "Bon opnieuw uploaden",
  receiptAlreadyAttached:
    "Deze uitgave heeft al een bon. Bekijk die in de uitgavenlijst; de bon wordt niet automatisch overschreven",
  uploadReceiptLater: "Later uploaden",
  expenseCreationUncertain:
    "We kunnen niet bevestigen of de uitgave is aangemaakt. Controleer de uitgavenlijst voordat je de uitgave opnieuw toevoegt; probeer het niet direct opnieuw.",
  viewReceipt: "Bon bekijken",
  noReceipt: "Geen bon",
  deleteReceipt: "Bon verwijderen",
  youCanUploadAnotherReceiptLaterTheExpenseWillNotBeDeleted:
    "Je kunt later een andere bon uploaden; de uitgave wordt niet verwijderd.",
  receiptDeleted: "Bon verwijderd",
  deleteThisReceipt: "Deze bon verwijderen?",
  deleteName: (values: MessageValues) =>
    interpolate("‘{name}’ verwijderen", values),
  thisCannotBeUndoneAllBalancesAndSettlementSuggestionsWillBeRecalculated:
    "Dit kan niet ongedaan worden gemaakt. Alle saldi en verrekenvoorstellen worden opnieuw berekend.",
  expenseDeleted: "Uitgave verwijderd",
  deleteThisExpense: "Deze uitgave verwijderen?",
  invalidSplitFormat: "Ongeldig verdeelformaat",
  selectAtLeastOnePersonToSplitWith:
    "Selecteer minstens één persoon om mee te delen",
  expenseChangesSaved: "Uitgavenwijzigingen opgeslagen",
  expenseRecorded: "Uitgave vastgelegd",
  unableToSaveExpense: "Uitgave opslaan is mislukt",
  reviewTheSplitPreviewBeforeSavingChanges:
    "Controleer het verdeelvoorbeeld voordat je wijzigingen opslaat.",
  enterTheRequiredDetailsFirstCustomSplitsAndTagsAreAvailableBelow:
    "Voer eerst de vereiste gegevens in. Aangepaste verdelingen en labels zijn hieronder beschikbaar.",
  editExpense: "Uitgave bewerken",
  addExpense2: "Uitgave toevoegen",
  discardDraft: "Concept weggooien",
  unsavedChangesWillBeLostExistingDataWillNotChange:
    "Niet-opgeslagen wijzigingen gaan verloren. Bestaande gegevens veranderen niet.",
  discardThisDraft: "Dit concept weggooien?",
  description: "Omschrijving",
  dinnerHotelTrainTickets: "Etentje, hotel, treinkaartjes",
  enterAnExpenseDescription: "Voer een uitgavenomschrijving in",
  amount: "Bedrag",
  enterAnExpenseAmount: "Voer een uitgavenbedrag in",
  date: "Datum",
  currency2: "Valuta",
  splitPreview: "Verdeelvoorbeeld",
  enterAnAmountToPreviewEachPersonsShare:
    "Voer een bedrag in om ieders aandeel te bekijken.",
  namePaidAmount: (values: MessageValues) =>
    interpolate("{name} betaalde {amount}", values),
  changePeopleAndSplitMethod: "Personen en verdeelmethode wijzigen",
  selectedSelectedOfTotal: (values: MessageValues) =>
    interpolate("{selected} van {total} geselecteerd", values),
  selectAll: "Alles selecteren",
  clear: "Wissen",
  splitMethod: "Verdeelmethode",
  splitEqually: "Gelijk verdelen",
  exactAmounts: "Exacte bedragen",
  percentages: "Percentages",
  shares: "Verdeeleenheden",
  nameSKind: (values: MessageValues) =>
    interpolate("{kind} van {name}", values),
  moreDetails: "Meer details",
  categoryAndTags: "Categorie en labels",
  separateWithCommasForExampleBreakfastTransport:
    "Scheid met komma's, bijvoorbeeld ontbijt, vervoer",
  unsavedChangesWillBeLost: "Niet-opgeslagen wijzigingen gaan verloren.",
  cancelEditing: "Bewerken annuleren?",
  saveChanges: "Wijzigingen opslaan",
  recordExpense: "Uitgave vastleggen",
  settlementRepresentative: "Verrekening toegewezen aan",
  settledByName: (values: MessageValues) =>
    interpolate("Verrekening toegewezen aan {name}", values),
  settleSeparately: "Zelf (apart verrekenen)",
  settlementRepresentativeHelp:
    "Uitgaven worden per persoon verdeeld; saldi en verrekenvoorstellen tellen het nettosaldo van een persoon mee bij de vertegenwoordiger. Vertegenwoordigers kunnen zelf niet aan iemand anders worden toegewezen.",
  representativeHasDependents:
    "Andere leden zijn aan deze persoon toegewezen. Verwijder eerst die toewijzingen.",
  settlementRepresentativeUpdated: "Verrekenvertegenwoordiger bijgewerkt",
  unableToUpdateSettlementRepresentative:
    "Verrekenvertegenwoordiger bijwerken is mislukt",
  provideParticipantChanges: "Geef de bij te werken deelnemergegevens op",
  invalidSettlementRepresentative: "Ongeldige verrekenvertegenwoordiger",
  settlementRepresentativeMustBeAnotherGroupMember:
    "De verrekenvertegenwoordiger moet een ander lid van deze groep zijn",
  settlementRepresentativeCannotBeAssignedOrHaveDependents:
    "De verrekenvertegenwoordiger kan niet via iemand anders verrekenen, en deze persoon mag geen leden hebben die via hen verrekenen",
  invalidBackupSettlementRepresentative:
    "Ongeldige verrekenvertegenwoordiger in back-up",
  expenseParticipantAdded: "Uitgavendeelnemer toegevoegd",
  unableToAddPerson: "Persoon toevoegen is mislukt",
  expenseParticipantsDoNotNeedToSignInManageAccountsWithAccessUnderMoreSharingAndAccess:
    "Uitgavendeelnemers hoeven zich niet aan te melden. Beheer accounts met toegang onder Groepsinstellingen → Delen en toegang.",
  personsName: "Naam van de persoon",
  friendsName: "Naam van een vriend",
  enterAName: "Voer een naam in",
  archivedGroupsAreReadOnlyRestoreThisGroupToChangeParticipants:
    "Gearchiveerde groepen zijn alleen-lezen. Herstel deze groep om deelnemers te wijzigen.",
  usedByAPayment: "Gebruikt door een betaling",
  cannotDeleteReasonUpdateRelatedExpensesFirstOrUseTheMergeToolBelow: (
    values: MessageValues,
  ) =>
    interpolate(
      "Verwijderen niet mogelijk: {reason}. Werk eerst de bijbehorende uitgaven bij of gebruik de onderstaande samenvoegfunctie.",
      values,
    ),
  deleteName2: (values: MessageValues) =>
    interpolate("{name} verwijderen", values),
  thisPersonHasNoExpensesOrPaymentsDeletionCannotBeUndone:
    "Deze persoon heeft geen uitgaven of betalingen. Verwijderen kan niet ongedaan worden gemaakt.",
  expenseParticipantDeleted: "Uitgavendeelnemer verwijderd",
  deleteThisExpenseParticipant: "Deze uitgavendeelnemer verwijderen?",
  nameUpdated: "Naam bijgewerkt",
  unableToUpdateName: "Naam bijwerken is mislukt",
  rename: "Naam wijzigen",
  renameName: (values: MessageValues) =>
    interpolate("Naam van {name} wijzigen", values),
  existingExpensesAndPaymentsWillRemainLinkedToThisPerson:
    "Bestaande uitgaven en betalingen blijven aan deze persoon gekoppeld.",
  newName: "Nieuwe naam",
  saveName: "Naam opslaan",
  advancedPeopleTools: "Geavanceerde functies voor personen",
  mergeDuplicatePeople: "Dubbele personen samenvoegen",
  sourcePerson: "Bronpersoon",
  targetPerson: "Doelpersoon",
  mergeInto: "Samenvoegen met",
  changePreview: "Wijzigingsvoorbeeld",
  expensesRelatedExpensesAndPaymentsPaymentsForSourceWillMoveToTargetThenTheSourcePersonWillBeDeleted:
    (values: MessageValues) =>
      interpolate(
        `${pluralForm("nl", values.expenses, { one: "{expenses} bijbehorende uitgave", other: "{expenses} bijbehorende uitgaven" })} en ${pluralForm("nl", values.payments, { one: "{payments} betaling", other: "{payments} betalingen" })} van {source} worden overgezet naar {target}; daarna wordt de bronpersoon verwijderd.`,
        values,
      ),
  mergePeople: "Personen samenvoegen",
  sourceWillBeDeletedAndRelatedDataWillBeTransferredToTargetAtomically: (
    values: MessageValues,
  ) =>
    interpolate(
      "{source} wordt verwijderd en de bijbehorende gegevens worden in één ondeelbare bewerking naar {target} overgezet.",
      values,
    ),
  expenseParticipantsMerged: "Uitgavendeelnemers samengevoegd",
  mergeFailed: "Samenvoegen mislukt",
  applyMerge: "Samenvoeging toepassen?",
  previewAndMerge: "Voorbeeld bekijken en samenvoegen",
} satisfies CatalogShape<typeof zhTW>;
