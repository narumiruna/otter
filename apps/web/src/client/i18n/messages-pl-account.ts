import {
  interpolate,
  type MessageValues,
  pluralForm,
} from "./message-types.js";

export const plAccount = {
  browserExpenseDefaults: "Domyślne ustawienia wydatków w tej przeglądarce",
  browserExpenseDefaultsHelp:
    "Usuń tylko domyślną walutę i ustawienia podziału tego konta dla tej grupy. Konta, logowanie i uprawnienia nie zmienią się.",
  clearPersonalPreferences: "Usuń domyślne ustawienia wydatków dla tej grupy",
  expenseDefaultsCleared:
    "Usunięto domyślne ustawienia wydatków dla tej grupy.",
  personalPreferencesChanged:
    "Twoje ustawienia podziału nie są już dostępne. Używane są prawidłowe ustawienia domyślne; wybierz ponownie.",
  personalStorageFailed:
    "Nie udało się zapisać domyślnych ustawień wydatków. Obecne ustawienia pozostają dostępne, ale mogą zostać utracone po ponownym otwarciu strony.",
  rememberExpenseDefaults: "Zapamiętaj walutę i ustawienia podziału",
  expenseDefaultsRemembered:
    "Zapisano walutę i ustawienia podziału dla tej grupy.",
  deleteExpense: "Usuń wydatek",
  copyExpense: "Kopiuj jako nowy wydatek",
  copyExpenseNamed: (values: MessageValues) =>
    interpolate("Kopiuj {name} jako nowy wydatek", values),
  memberAccounts: "Rozliczenia członków",
  accountPaid: "Zapłacono",
  accountShared: "Udział w kosztach",
  accountBalance: "Do otrzymania / zapłaty",
  accountReceivable: "Do otrzymania",
  accountPayable: "Do zapłaty",
  accountSettled: "Rozliczono",
  accountPaidHelp:
    "Zapłacono to kwota przekazana sklepom i innym dostawcom. Nie obejmuje płatności rozliczeniowych między członkami.",
  accountTotalsHelp:
    "Udział w kosztach to kwota wydatków przypadająca na każdego członka. Salda obejmują też zapisane płatności i korekty przedstawicieli. Niezsynchronizowane wersje robocze są pomijane.",
  accountDetails: "Pokaż szczegóły",
  accountPaidExpenses: "Wydatki opłacone za grupę",
  accountSharedExpenses: "Wspólne wydatki",
  accountExpenseTotal: "Pełna kwota wydatku",
  accountPayments: "Płatności wysłane / otrzymane",
  accountPaymentSent: "Wysłano",
  accountPaymentReceived: "Otrzymano",
  accountAdjustments: "Korekty przedstawicieli",
  accountDetailsUnavailable:
    "To udostępnienie nie zawiera szczegółów płatności. Salda korzystają z wyników obliczeń grupy.",
  accountRepresentedBy: (values: MessageValues) =>
    interpolate(
      "{name} rozlicza się za tego członka. Saldo zerowe nie oznacza, że ten członek dokonał płatności.",
      values,
    ),
  visaSettlementTitle: "Rozliczenia według kursów Visa",
  visaSettlementCurrency: "Waluta rozliczenia",
  visaSettlementEnable:
    "Przelicz wszystkie wydatki według kursów Visa z odpowiednich dat i rozlicz w wybranej walucie",
  visaSettlementHelp:
    "Domyślnie wyłączone. Pierwotne kwoty pozostają bez zmian. Włączenie zapisuje kurs Visa z daty każdego wydatku i używa wybranej waluty do sald i rozliczeń. Dotyczy wszystkich wydatków, także gotówkowych, bez opłat bankowych. Kursy Visa są szacunkowe; obciążenia karty mogą się różnić. Przed włączeniem lub zmianą waluty istniejące płatności muszą używać wybranej waluty.",
  visaSettlementSaved: "Zapisano ustawienie rozliczeń Visa",
  visaSettlementOn: (values: MessageValues) =>
    interpolate("Włączone · {currency}", values),
  visaSettlementOff: "Wyłączone",
  visaRateLabel: "Visa",
  visaSettingInvalid: "Nieprawidłowe ustawienie rozliczeń Visa",
  visaIncompatiblePayments:
    "Istniejące płatności muszą używać wybranej waluty rozliczenia",
  visaSettingUnavailable:
    "Kursy Visa są niedostępne. Ustawienie nie zostało zmienione. Spróbuj ponownie później.",
  visaPaymentCurrency:
    "Płatności rozliczeniowe Visa muszą używać wybranej waluty",
  visaRateUnavailable: (values: MessageValues) =>
    interpolate(
      "Kurs Visa {currency}/{target} z dnia {date} jest niedostępny. Spróbuj ponownie później.",
      values,
    ),
  offlineQueueBanner:
    "Tryb offline: wczytane dane pozostają dostępne. Nowe wydatki można zapisać na tym urządzeniu; pozostałe zmiany wymagają połączenia.",
  queueSave: "Zapisz na tym urządzeniu",
  queueSaved:
    "Zapisano na tym urządzeniu. Jeszcze nie uwzględniono w saldach; kursy walut zostaną ustalone podczas synchronizacji.",
  queueStorageError:
    "Nie udało się zapisać na tym urządzeniu. Nie zamykaj tej strony i spróbuj ponownie.",
  queueTitle: "Niezsynchronizowane wydatki",
  queueNotice:
    "Tylko na tym urządzeniu. Nieuwzględnione w saldach. Kursy walut zostaną ustalone podczas synchronizacji. Wyczyszczenie danych przeglądarki spowoduje utratę tych wersji roboczych.",
  queuePending: "Oczekiwanie na synchronizację",
  queueAttempted:
    "Synchronizacja oczekuje na potwierdzenie; zachowaj pierwotne żądanie bez zmian",
  queueConflict:
    "Synchronizacja zatrzymana. Sprawdź dostęp i uczestników przed ponowieniem; pierwotne żądanie zostało zachowane.",
  queueInvalid: "Nie zapisano. Zmień wersję roboczą i spróbuj ponownie.",
  queueEdit: "Edytuj wersję roboczą",
  queueRetry: "Ponów pierwotne żądanie",
  queueDelete: "Usuń lokalną wersję roboczą",
  queueDeleteConfirm:
    "Usunąć tę lokalną wersję roboczą? Wysłane żądanie mogło już zostać zapisane na serwerze. Najpierw sprawdź grupę.",
  queueCount: (values: MessageValues) =>
    interpolate(
      pluralForm("pl", values.count, {
        one: "{count} niezsynchronizowany wydatek na tym urządzeniu",
        few: "{count} niezsynchronizowane wydatki na tym urządzeniu",
        many: "{count} niezsynchronizowanych wydatków na tym urządzeniu",
        other: "{count} niezsynchronizowanego wydatku na tym urządzeniu",
      }),
      values,
    ),
  queueSyncPricing:
    "Podgląd pokazuje tylko pierwotną walutę. Serwer ustala kurs podczas synchronizacji.",
  queueOrphanTitle: "Wersje robocze z niedostępnych grup",
  queueOrphanNotice:
    "Te grupy nie są już dostępne. Wysłane żądanie mogło zostać zapisane; sprawdź to przed usunięciem lokalnej kopii.",
  queueOrphanTrip: (values: MessageValues) =>
    interpolate("ID grupy: {id}", values),
  accountSettings: "Ustawienia konta",
  manageYourUsernameAndPasskeys:
    "Zarządzaj wyglądem, językiem, nazwą użytkownika, kluczami Passkey i tokenami API.",
  appearance: "Wygląd",
  chooseHowOtterLooksOnThisBrowser:
    "Wybierz wygląd Otter. Zmiany są stosowane od razu i zapisywane w tej przeglądarce.",
  colorTheme: "Motyw kolorystyczny",
  forestTheme: "Las",
  oceanTheme: "Ocean",
  lavenderTheme: "Lawenda",
  sunsetTheme: "Zachód słońca",
  roseTheme: "Róża",
  displayMode: "Tryb wyświetlania",
  systemMode: "Systemowy",
  lightMode: "Jasny",
  darkMode: "Ciemny",
  useTheNewUsernameTheNextTimeYouSignInYourCurrentSessionWillContinue:
    "Użyj nowej nazwy użytkownika przy następnym logowaniu. Obecna sesja będzie kontynuowana.",
  passkeys: "Klucze Passkey",
  useAPasskeyToSignInWithoutYourPassword:
    "Użyj odblokowania urządzenia, aby zalogować się bez podawania hasła.",
  unableToLoadPasskeys: "Nie można wczytać kluczy Passkey",
  unableToAddPasskey:
    "Nie można dodać klucza Passkey. Jeśli operacja została anulowana, spróbuj ponownie.",
  unableToRemovePasskey: "Nie można usunąć klucza Passkey",
  passkeyAdded: "Dodano klucz Passkey",
  passkeyRemoved: "Usunięto klucz Passkey",
  passkeyNumber: (values: MessageValues) =>
    interpolate("Passkey {number}", values),
  addedOnDate: (values: MessageValues) => interpolate("Dodano {date}", values),
  removePasskeyNumber: (values: MessageValues) =>
    interpolate("Usuń klucz Passkey {number}", values),
  noPasskeysAdded: "Nie dodano jeszcze kluczy Passkey.",
  addingPasskey: "Dodawanie klucza Passkey…",
  addPasskey: "Dodaj klucz Passkey",
  thisBrowserDoesNotSupportPasskeys:
    "Ta przeglądarka nie obsługuje kluczy Passkey.",
  apiTokens: "Tokeny API",
  useApiTokensWithTheOtterCli:
    "Twórz tokeny Bearer dla CLI Otter lub narzędzi automatyzacji.",
  loadingApiTokens: "Wczytywanie tokenów API…",
  unableToLoadApiTokens: "Nie można wczytać tokenów API",
  unableToCreateApiToken: "Nie można utworzyć tokena API",
  apiTokenCreationUncertain:
    "Wynik żądania tokena jest nieznany. Ponów to żądanie przed utworzeniem kolejnego tokena.",
  retryApiTokenCreation: "Ponów tworzenie tokena",
  unableToRevokeApiToken: "Nie można unieważnić tokena API",
  unableToCopyApiToken: "Nie można skopiować tokena API",
  apiTokenRevoked: "Unieważniono token API",
  apiTokenCopied: "Skopiowano token API",
  enterATokenName: "Wpisz nazwę tokena",
  newApiToken: "Nowy token API",
  copyYourApiTokenNow: "Skopiuj teraz swój token API",
  apiTokenShownOnce:
    "Ten token jest pokazywany tylko raz. Po opuszczeniu strony nie będzie można go ponownie wyświetlić.",
  copyToken: "Kopiuj token",
  done: "Gotowe",
  tokenName: "Nazwa tokena",
  tokenNameExample: "Na przykład: Automatyzacja podróży",
  creatingApiToken: "Tworzenie tokena…",
  createApiToken: "Utwórz token API",
  apiTokenDates: (values: MessageValues) =>
    interpolate("Utworzono {created} · Wygasa {expires}", values),
  revokeNamedApiToken: (values: MessageValues) =>
    interpolate('Unieważnij token API "{name}"', values),
  noActiveApiTokens: "Brak aktywnych tokenów API.",
  apiTokensExpireAfter90Days:
    "Tokeny wygasają po 90 dniach. Aby użyć tokena w CLI, ustaw go jako",
  welcomeBackEyebrow: "WITAJ PONOWNIE",
  startNewJourneyEyebrow: "ROZPOCZNIJ NOWĄ PODRÓŻ",
  parchmentTheme: "Pergamin",
  expenseTotalLabel: "Suma",
  expenseSplitSection: "Podział między osoby",
  expenseSplitHelp:
    "Wybierz osoby dzielące ten wydatek, wybierz metodę i zobacz wynik.",
  expenseTagPlaceholder: "Dodaj etykietę…",
  addShort: "Dodaj",
  settingsShort: "Ustawienia",
  close: "Zamknij",
  groupDetails: "Szczegóły grupy",
  filters: "Filtry",
  viewAll: "Pokaż wszystko",
  personLabel: "Osoba",
  preferencesLabel: "Preferencje",
  profileLabel: "Profil",
  securityLabel: "Bezpieczeństwo",
  backToGroups: "Wróć do grup",
  createdLabel: "Utworzono",
  statusLabel: "Stan",
  peopleDeletionHelp:
    "Nie można usunąć osób użytych w rejestrze. Sprawdź ograniczenia danej osoby przyciskiem informacji lub scal zduplikowane osoby.",
  personRestriction: (values: MessageValues) =>
    interpolate("Ograniczenia usuwania: {name}", values),
  representsPeople: (values: MessageValues) =>
    interpolate("Reprezentuje: {names}", values),
  expenseRateForName: (values: MessageValues) =>
    interpolate("Pokaż kwotę i kurs dla {name}", values),
  rateUnavailable: "Kurs niedostępny (starsze dane)",
};
