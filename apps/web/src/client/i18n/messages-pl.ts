import {
  type CatalogShape,
  interpolate,
  type MessageValues,
  pluralForm,
} from "./message-types.js";
import { plAccount } from "./messages-pl-account.js";
import { plExpenses } from "./messages-pl-expenses.js";
import { plSettings } from "./messages-pl-settings.js";
import type { zhTW } from "./messages-zh-tw.js";

export const pl = {
  backToExpenseList: "Wróć do listy wydatków",
  expenseEditorUnavailable:
    "Nie można edytować tego wydatku. Może nie istnieć albo grupa jest tylko do odczytu lub zarchiwizowana.",
  ...plAccount,
  ...plExpenses,
  ...plSettings,
  expenseHistory: "Historia zmian",
  expenseHistoryDescription:
    "Zmiany, usuwanie i przywracanie wydatków; nie historia płatności ani sald.",
  expenseHistoryEmpty: "Brak zapisanych zmian",
  expenseHistoryMore: "Wczytaj więcej zmian",
  expenseHistoryCreated: "Utworzono",
  expenseHistoryUpdated: "Zaktualizowano",
  expenseHistoryDeleted: "Usunięto",
  expenseHistoryRestored: "Przywrócono",
  expenseHistoryBaseline: "Stan początkowy",
  expenseHistorySystem: "System",
  expenseHistoryBaselineNotice:
    "Stan w chwili włączenia historii; wcześniejsze zmiany i pierwotny autor są nieznani.",
  expenseHistoryReceiptNotice:
    "Zachowywane są tylko metadane potwierdzeń. Poprzednie obrazy są niedostępne.",
  expenseHistoryShares: "Kwoty udziałów",
  expenseHistoryRate: "Zapisany kurs walutowy",
  expenseHistoryRateBank: "Bank of Taiwan",
  expenseHistoryRateCustom: "Własny kurs grupy",
  expenseHistoryRateFixed: "Wbudowany kurs stały",
  expenseHistoryRateLegacy: "Oszacowanie ze starszej wersji",
  expenseHistoryRateTimeUnavailable: "Czas notowania niedostępny",
  expenseHistoryRateUnavailable: "Starsza wersja: nie zapisano kursu",
  expenseHistoryBefore: "Przed",
  expenseHistoryAfter: "Po",
  expenseHistorySourceExpense: "Operacja na wydatku",
  expenseHistorySourceCsv: "Import CSV",
  expenseHistorySourceRestore: "Przywrócenie kopii zapasowej",
  expenseHistorySourceMerge: "Scalenie uczestników",
  expenseHistorySourceReceipt: "Operacja na potwierdzeniu",
  expenseHistorySourceSeed: "Dane testowe dla programistów",
  expenseHistorySourceMigration: "Migracja",
  expenseHistorySourceVersionRestore: "Przywrócenie wersji",
  expenseRestoreVersion: (values: MessageValues) =>
    interpolate("Przywróć v{version}", values),
  expenseRestoreTitle: "Przywróć wersję wydatku",
  expenseRestoreDescription:
    "Sprawdź obecny wydatek i wersję do przywrócenia. Przywrócenie dodaje nową wersję; późniejsza historia pozostaje dostępna.",
  expenseRestoreKeepsReceipt:
    "Obecne potwierdzenie pozostanie załączone. Stare obrazy potwierdzeń nie zostaną przywrócone.",
  expenseRestoreNoReceipt:
    "Usunięty wydatek zostanie przywrócony bez potwierdzenia. Stare obrazy potwierdzeń nie zostaną przywrócone.",
  expenseRestoreMissingPerson:
    "Ta wersja odwołuje się do osoby, której nie ma już w grupie. Zamiast tego zmień wydatek ręcznie.",
  expenseRestoreUnavailable:
    "Nie można przywrócić tego wydatku. Odśwież stronę i spróbuj ponownie.",
  expenseRestoreConflict:
    "Wydatek się zmienił. Sprawdź najnowszy stan przed ponownym potwierdzeniem.",
  expenseRestoreConfirm: "Przywróć tę wersję",
  expenseRestored: "Przywrócono wersję wydatku",
  expenseConflictParticipantsChanged:
    "Lista osób się zmieniła. Potwierdzenie zastąpi niedostępnego płatnika lub wybory podziału ustawieniami najnowszej wersji wydatku. Pozostałe pola wersji roboczej zostaną zachowane; sprawdź kwoty podziału przed zapisem.",
  expenseVersionConflict:
    "Ten wydatek się zmienił. Sprawdź najnowszą wersję przed ponownym potwierdzeniem.",
  expenseVersionMissing:
    "Podaj wersję wydatku. Odśwież stronę i spróbuj ponownie.",
  expenseVersionInvalid: "Nieprawidłowa wersja wydatku",
  reviewLatestExpense: "Sprawdź najnowszy wydatek",
  confirmLatestExpenseVersion:
    "Najnowsza wersja sprawdzona; zachowaj moją wersję roboczą i kontynuuj edycję",
  latestExpenseMissing:
    "Ten wydatek został usunięty lub nie jest już dostępny. Twoja wersja robocza została zachowana, ale nie można jej zapisać.",
  deleteExpenseHistoryRetained:
    "Wydatek zostanie usunięty z bieżącego rejestru, a salda zostaną przeliczone. Historia zmian zostanie zachowana; można przywrócić wcześniejszą wersję bez starego obrazu potwierdzenia.",
  expenseHistoryForName: (values: MessageValues) =>
    interpolate("Historia zmian: {name}", values),
  usernameMustBe332LettersNumbersUnderscoresOrHyphens:
    "Nazwa użytkownika musi zawierać od 3 do 32 liter, cyfr, podkreśleń lub łączników",
  travelTogetherSplitExpensesEasily:
    "Podróżujcie razem, łatwo dzielcie wydatki",
  goodFriendsSplitExpensesWell: "Dobrzy znajomi dobrze dzielą wydatki.",
  skipToMainContent: "Przejdź do głównej treści",
  otterHome: "Strona główna otter",
  loading: "Wczytywanie",
  unableToLoadOtter: "Nie można wczytać otter",
  loadingFailed: "Wczytywanie nie powiodło się",
  reload: "Odśwież",
  signedIn: "Zalogowano",
  accountCreated: "Utworzono konto",
  unableToAuthenticate: "Nie można uwierzytelnić",
  authenticationRequestsTooFrequentTryAgainLater:
    "Zbyt wiele żądań uwierzytelnienia. Spróbuj ponownie później.",
  usernameUpdated: "Zaktualizowano nazwę użytkownika",
  signedOut: "Wylogowano",
  signOutFailedMessage: (values: MessageValues) =>
    interpolate("Wylogowanie nie powiodło się: {message}", values),
  pleaseTryAgainLater: "Spróbuj ponownie później",
  signingOut: "Wylogowywanie…",
  signOut: "Wyloguj się",
  authorizeCli: "Połącz CLI",
  authorizeCliDescription:
    "Wpisz kod urządzenia wyświetlony w terminalu, aby zezwolić temu CLI na dostęp do Twoich danych Otter.",
  deviceCode: "Kod urządzenia",
  checkDeviceCode: "Kontynuuj",
  checkingDeviceCode: "Sprawdzanie…",
  cliAccessRequest: "Prośba o dostęp CLI",
  cliAccessRequestedBy: "Wnioskodawca",
  approveCliAccess: "Zatwierdź dostęp",
  approvingCliAccess: "Zatwierdzanie…",
  cliAccessApproved: "Połączono CLI",
  cliAccessApprovedDescription:
    "Możesz zamknąć tę stronę i wrócić do terminala.",
  deviceCodeNotFoundOrExpired: "Kod urządzenia nie istnieje lub wygasł",
  enterAValidDeviceCode: "Wpisz prawidłowy kod urządzenia",
  youAreOfflineLoadedDataIsAvailableButEditingRequiresAConnection:
    "Jesteś offline. Wczytane dane są dostępne, ale edycja wymaga połączenia.",
  travelTogetherSplitWithEase: "Podróżujcie razem, dzielcie bez trudu",
  spendYourTimeOnTheJourney: "Poświęć czas podróży,",
  andLeaveTheSplittingToOtter: "a podział wydatków zostaw otter.",
  fromDinnerToAFullTripRecordEverySharedExpenseAndKeepGroupFinancesSimpleAndClear:
    "Od kolacji po całą podróż: zapisuj każdy wspólny wydatek i utrzymuj proste, przejrzyste finanse grupy.",
  splitExampleAWeekendTripDinnerCostsTwd1800ForThreePeopleOrTwd600Each:
    "Przykład podziału: kolacja podczas weekendowego wyjazdu kosztuje 1800 TWD dla trzech osób, czyli po 600 TWD na osobę.",
  weekendTrip: "Weekendowy wyjazd",
  splitExample: "Przykład podziału",
  dinnerTogether: "Wspólna kolacja",
  you: "Ty",
  a: "A",
  y: "T",
  splitEquallyAmong3: "Podział po równo między 3 osoby",
  each: "na osobę",
  quicklyRecordSharedExpenses: "Szybko zapisuj wspólne wydatki",
  seeWhoOwesAndWhoIsOwedAtAGlance:
    "Od razu zobacz, kto ma zapłacić, a kto otrzymać pieniądze",
  settleUpWithClearSuggestions: "Rozliczaj się z jasnymi propozycjami",
  signIn: "Zaloguj się",
  createAccount: "Utwórz konto",
  welcomeBackContinueYourJourney: "Witaj ponownie. Kontynuuj podróż.",
  createYourFirstGroupAndStartSplittingWithEase:
    "Utwórz pierwszą grupę i zacznij łatwo dzielić wydatki.",
  username: "Nazwa użytkownika",
  enterAUsername: "Wpisz nazwę użytkownika",
  password: "Hasło",
  enterAPassword: "Wpisz hasło",
  developmentCredentialsHaveBeenFilledIn:
    "Uzupełniono dane logowania dla środowiska programistycznego.",
  signingIn: "Logowanie…",
  or: "lub",
  signInWithAPasskey: "Zaloguj się kluczem Passkey",
  signingInWithAPasskey: "Logowanie kluczem Passkey…",
  unableToSignInWithAPasskey:
    "Nie można zalogować się kluczem Passkey. Spróbuj ponownie lub użyj hasła.",
  needAnAccount: "Potrzebujesz konta?",
  usernameIsNotCaseSensitive:
    "Wielkość liter w nazwie użytkownika nie ma znaczenia.",
  passwordMustBeAtLeast8Characters: "Hasło musi mieć co najmniej 8 znaków",
  passwordMustBeAtLeast8Characters2: "Hasło musi mieć co najmniej 8 znaków.",
  creating: "Tworzenie…",
  createAccountWithAPasskey: "Utwórz konto z kluczem Passkey",
  creatingAccountWithAPasskey: "Tworzenie konta z kluczem Passkey…",
  unableToCreateAccountWithAPasskey:
    "Nie można utworzyć konta z kluczem Passkey. Spróbuj ponownie.",
  alreadyHaveAnAccount: "Masz już konto?",
  backToSignIn: "Wróć do logowania",
  expenseParticipantsDoNotNeedAccountsToBeIncludedInAGroup:
    "Uczestnicy wydatków nie potrzebują kont, aby należeć do grupy.",
  changeNameSUsername: (values: MessageValues) =>
    interpolate("Zmień nazwę użytkownika: {name}", values),
  nameSAccountMenu: (values: MessageValues) =>
    interpolate("Menu konta: {name}", values),
  unableToUpdateUsername: "Nie można zaktualizować nazwy użytkownika",
  changeUsername: "Zmień nazwę użytkownika",
  passkeyRegistrationRequestsTooFrequent:
    "Zbyt wiele żądań rejestracji klucza Passkey. Spróbuj ponownie później.",
  passkeyRegistrationResponseIsInvalid:
    "Nieprawidłowa odpowiedź rejestracji klucza Passkey",
  passkeyRegistrationRequestExpired:
    "Żądanie rejestracji klucza Passkey wygasło. Spróbuj ponownie.",
  unableToVerifyPasskey:
    "Nie można zweryfikować klucza Passkey. Spróbuj ponownie.",
  passkeyAlreadyRegistered: "Ten klucz Passkey jest już zarejestrowany",
  passkeyNotFound: "Nie znaleziono klucza Passkey",
  cannotRemoveOnlyPasskey:
    "Nie możesz usunąć jedynego klucza Passkey bez utraty dostępu do konta",
  passkeyLoginResponseIsInvalid:
    "Nieprawidłowa odpowiedź logowania kluczem Passkey",
  passkeyLoginRequestExpired:
    "Żądanie logowania kluczem Passkey wygasło. Spróbuj ponownie.",
  unableToUsePasskeyToSignIn: "Nie można zalogować się tym kluczem Passkey",
  cancel: "Anuluj",
  saving: "Zapisywanie…",
  save: "Zapisz",
  connectionFailedPleaseTryAgainLater:
    "Połączenie nie powiodło się. Spróbuj ponownie później.",
  theServerReturnedAnInvalidResponse: "Serwer zwrócił nieprawidłową odpowiedź.",
  everyone: "Wszyscy",
  unknown: "Nieznane",
  atLeastOneParticipantIsRequired: "Wymagany jest co najmniej jeden uczestnik",
  usedByAnExpense: "Osoba użyta w wydatku",
  youAreOfflineReconnectAndTryAgain:
    "Jesteś offline. Połącz się ponownie i spróbuj jeszcze raz.",
  working: "Przetwarzanie…",
  unableToApplyChanges: "Nie można zastosować zmian",
  applying: "Stosowanie…",
  noBalancesYet: "Brak sald.",
  settled: "Rozliczono",
  getsBack: "Do otrzymania",
  owes: "Do zapłaty",
  newTaiwanDollar: "Nowy dolar tajwański",
  japaneseYen: "Jen japoński",
  usDollar: "Dolar amerykański",
  euro: "Euro",
  singaporeDollar: "Dolar singapurski",
  poundSterling: "Funt szterling",
  australianDollar: "Dolar australijski",
  canadianDollar: "Dolar kanadyjski",
  southKoreanWon: "Won południowokoreański",
  food: "Jedzenie",
  transport: "Transport",
  lodging: "Noclegi",
  tickets: "Bilety",
  shopping: "Zakupy",
  other: "Inne",
  unsavedChangesWillBeLostDiscardTheDraft:
    "Niezapisane zmiany zostaną utracone. Odrzucić wersję roboczą?",
  unableToSwitchGroups: "Nie można przełączyć grupy",
  loadingGroup: "Wczytywanie grupy",
  yourSelectionWillAppearAfterItsDataLoads:
    "Wybrana grupa pojawi się po wczytaniu jej danych.",
  unableToLoadGroup: "Nie można wczytać grupy",
  groupSwitcher: "Wybór grupy",
  groups: "Grupy",
  countActiveGroups: (values: MessageValues) =>
    interpolate(
      pluralForm("pl", values.count, {
        one: "{count} aktywna grupa",
        few: "{count} aktywne grupy",
        many: "{count} aktywnych grup",
        other: "{count} aktywnej grupy",
      }),
      values,
    ),
  everyTripAddsUpToSomethingWonderful:
    "Każda podróż składa się na coś wspaniałego.",
  recordSharedExpensesAndFocusOnThePeopleBesideYou:
    "Zapisuj wspólne wydatki i skup się na osobach obok Ciebie.",
  archivedAndReadOnlyDataIsPreservedTheOwnerCanRestoreItUnderMore:
    "Zarchiwizowana, tylko do odczytu. Dane są zachowane; właściciel może ją przywrócić w Ustawieniach grupy.",
  addTravelCompanionsFirst: "Najpierw dodaj towarzyszy podróży",
  thereIsOnlyOneParticipantAddSomeoneToSplitWithBeforeRecordingTheFirstExpense:
    "Jest tylko jeden uczestnik. Dodaj kogoś do podziału kosztów przed zapisaniem pierwszego wydatku.",
  addExpenseParticipant: "Dodaj uczestnika wydatków",
  switchGroups: "Przełącz grupę",
  youWillLeaveTheCurrentGroupOnlyAfterTheNewOneLoads:
    "Opuścisz obecną grupę dopiero po wczytaniu nowej.",
  participantsPeopleExpensesExpensesCurrency: (values: MessageValues) =>
    interpolate(
      "Osoby: {participants} · Wydatki: {expenses} · {currency}",
      values,
    ),
  archived: "Zarchiwizowana",
  everydayMomentsTogether: "Codzienne chwile razem",
  collaborator: "Współpracownik",
  owner: "Właściciel",
  baseCurrencyCurrency: (values: MessageValues) =>
    interpolate("Waluta bazowa {currency}", values),
  usingCustomExchangeRates: "Używane są własne kursy walut",
  usingBankOfTaiwanExchangeRates: "Używane są domyślne kursy Bank of Taiwan",
  usingFixedFallbackRates:
    "Bank of Taiwan jest niedostępny; używane są zastępcze kursy stałe",
  loadingGroup2: "Wczytywanie grupy…",
  people: "Osoby",
  expenses: "Wydatki",
  base: "Bazowa",
  overview: "Przegląd",
  more: "Więcej",
  groupWorkspace: "Obszar roboczy grupy",
  addExpense: "Dodaj wydatek",
  archivedGroups: "Zarchiwizowane grupy",
  unableToCreateGroup: "Nie można utworzyć grupy",
  createGroup: "Utwórz grupę",
  addCompanionsAfterCreatingTheGroupThenRecordSharedExpenses:
    "Po utworzeniu grupy dodaj towarzyszy, a następnie zapisuj wspólne wydatki.",
  groupName: "Nazwa grupy",
  fiveDaysInTokyo: "Pięć dni w Tokyo",
  baseCurrency: "Waluta bazowa",
} satisfies CatalogShape<typeof zhTW>;
