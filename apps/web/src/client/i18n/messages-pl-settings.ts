import {
  interpolate,
  type MessageValues,
  pluralForm,
} from "./message-types.js";

export const plSettings = {
  groupSettings: "Ustawienia grupy",
  manageSharingGroupPreferencesAndDataToolsHighImpactActionsRequireConfirmation:
    "Zarządzaj udostępnianiem, preferencjami grupy i narzędziami danych. Operacje o dużym wpływie wymagają potwierdzenia.",
  youAreACollaboratorAndCanUseDataToolsOnlyTheOwnerCanManageAccessAndGroupSettings:
    "Jesteś współpracownikiem i możesz korzystać z narzędzi danych. Tylko właściciel może zarządzać dostępem i ustawieniami grupy.",
  sharingAndAccess: "Udostępnianie i dostęp",
  linksActiveLinksCollaboratorsCollaborators: (values: MessageValues) =>
    interpolate(
      "Aktywne linki: {links} · Współpracownicy: {collaborators}",
      values,
    ),
  shareLinkCreated: "Utworzono link udostępniania",
  shareLinkCreatedAndCopied: "Utworzono i skopiowano link udostępniania",
  shareLinks: "Linki udostępniania",
  chooseWhoCanEditThroughTheShareLink:
    "Wybierz, kto może wyświetlać lub edytować za pomocą tego linku.",
  linkPermission: "Uprawnienia linku",
  readOnlyLink: "Tylko do odczytu (bez logowania)",
  signedInEditLink: "Edycja po zalogowaniu",
  anyoneEditLink: "Każdy z linkiem może edytować",
  signedInEditLinkDescription:
    "Po zalogowaniu lub rejestracji odwiedzający stają się współpracownikami. Unieważnienie linku nie usuwa osób, które już dołączyły.",
  anyoneEditLinkDescription:
    "Każdy z linkiem może edytować wydatki i uczestników bez logowania. Udostępniaj go tylko zaufanym osobom; unieważnienie działa natychmiast.",
  revokingSignedInLinkDoesNotRemoveExistingCollaborators:
    "Unieważnienie uniemożliwia dołączanie nowych osób. Obecni współpracownicy nadal mogą edytować; usuń ich dostęp osobno.",
  signInToEditSharedGroup: (values: MessageValues) =>
    interpolate("Zaloguj się lub utwórz konto, aby edytować {name}.", values),
  readOnlyShareLinkCreated: "Utworzono link udostępniania tylko do odczytu",
  readOnlyShareLinkCreatedAndCopied:
    "Utworzono i skopiowano link udostępniania tylko do odczytu",
  shareLinkCreatedYourBrowserBlockedAutomaticCopyingCopyItManually:
    "Utworzono link udostępniania. Przeglądarka zablokowała automatyczne kopiowanie; skopiuj go ręcznie.",
  unableToCreateLink: "Nie można utworzyć linku",
  shareLinkCopied: "Skopiowano link udostępniania",
  yourBrowserBlockedCopyingOpenTheLinkAndCopyItFromTheAddressBar:
    "Przeglądarka zablokowała kopiowanie. Otwórz link i skopiuj go z paska adresu.",
  anyoneWithTheLinkCanViewExpensesBalancesAndSettlementsWithoutSigningInButCannotEdit:
    "Każdy z linkiem może przeglądać wydatki, salda i rozliczenia bez logowania, ale nie może ich edytować.",
  readOnlyShareLinks: "Linki udostępniania tylko do odczytu",
  createReadOnlyLink: "Utwórz link tylko do odczytu",
  anyoneWithTheLinkCanViewThisGroupsExpensesBalancesAndSettlementSuggestionsButCannotAddOrChangeData:
    "Każdy z linkiem może przeglądać wydatki, salda i propozycje rozliczenia tej grupy, ale nie może dodawać ani zmieniać danych.",
  createAShareLink: "Utworzyć link udostępniania?",
  createShareLink: "Utwórz link udostępniania",
  revoked: "Unieważniony",
  active: "Aktywny",
  openLink: "Otwórz link",
  copy: "Kopiuj",
  revokeLink: "Unieważnij link",
  afterRevocationTheOldLinkWillImmediatelyStopWorking:
    "Po unieważnieniu stary link natychmiast przestanie działać.",
  shareLinkRevoked: "Unieważniono link udostępniania",
  revokeThisShareLink: "Unieważnić ten link udostępniania?",
  revoke: "Unieważnij",
  noShareLinksYet: "Brak linków udostępniania.",
  collaboratorAdded: "Dodano współpracownika",
  unableToAddCollaborator: "Nie można dodać współpracownika",
  collaboratorsMustBeExistingUsersTheyCanManageExpensesAndParticipantsButNotOwnerSettings:
    "Współpracownicy muszą być istniejącymi użytkownikami. Mogą zarządzać wydatkami i uczestnikami, ale nie ustawieniami właściciela.",
  existingUsersUsername: "Nazwa istniejącego użytkownika",
  addCollaborator: "Dodaj współpracownika",
  removeName: (values: MessageValues) => interpolate("Usuń {name}", values),
  thisAccountWillNoLongerBeAbleToManageTheGroupExistingExpenseDataWillRemain:
    "To konto nie będzie już mogło zarządzać grupą. Istniejące dane wydatków pozostaną.",
  collaboratorRemoved: "Usunięto współpracownika",
  removeCollaborator: "Usunąć współpracownika?",
  remove: "Usuń",
  dataAndExport: "Dane i eksport",
  csvPrintBackupAndRestore: "CSV, drukowanie, kopia zapasowa i przywracanie",
  exportingDoesNotChangeGroupData: "Eksport nie zmienia danych grupy.",
  exportAndPrint: "Eksport i drukowanie",
  expenseCsvExported: "Wyeksportowano CSV wydatków",
  exportExpenseCsv: "Eksportuj CSV wydatków",
  settlementCsvExported: "Wyeksportowano CSV rozliczeń",
  exportSettlementCsv: "Eksportuj CSV rozliczeń",
  print: "Drukuj",
  completeBackupDownloaded: "Pobrano pełną kopię zapasową",
  downloadFailed: "Pobieranie nie powiodło się",
  downloadCompleteBackup: "Pobierz pełną kopię zapasową",
  expenseCsvImported: "Zaimportowano CSV wydatków",
  importFailed: "Import nie powiódł się",
  allRowsAreCheckedFirstNoDataIsWrittenIfAnyRowHasAnError:
    "Najpierw sprawdzane są wszystkie wiersze. Jeśli jakikolwiek wiersz zawiera błąd, żadne dane nie zostaną zapisane.",
  importExpenseCsv: "Importuj CSV wydatków",
  chooseCsv: "Wybierz CSV",
  importPreview: "Podgląd importu",
  rowsRowsCanBeImportedErrorsErrors: (values: MessageValues) =>
    interpolate("Wiersze do zaimportowania: {rows}; błędy: {errors}.", values),
  rowRowMessage: (values: MessageValues) =>
    interpolate("Wiersz {row}: {message}", values),
  importCountExpenses: (values: MessageValues) =>
    interpolate(
      pluralForm("pl", values.count, {
        one: "Importuj {count} wydatek",
        few: "Importuj {count} wydatki",
        many: "Importuj {count} wydatków",
        other: "Importuj {count} wydatku",
      }),
      values,
    ),
  thisWillAddCountExpensesAtOnceAndRecalculateBalances: (
    values: MessageValues,
  ) =>
    interpolate(
      pluralForm("pl", values.count, {
        one: "Spowoduje to dodanie {count} wydatku naraz i przeliczenie sald.",
        few: "Spowoduje to dodanie {count} wydatków naraz i przeliczenie sald.",
        many: "Spowoduje to dodanie {count} wydatków naraz i przeliczenie sald.",
        other:
          "Spowoduje to dodanie {count} wydatku naraz i przeliczenie sald.",
      }),
      values,
    ),
  applyCsvImport: "Zastosować import CSV?",
  applyImport: "Zastosuj import",
  invalidBackupFormat: "Nieprawidłowy format kopii zapasowej",
  backupRestoredAsANewGroup: "Przywrócono kopię zapasową jako nową grupę",
  restoreFailed: "Przywracanie nie powiodło się",
  restoringCreatesANewGroupAndDoesNotOverwriteCurrentData:
    "Przywracanie tworzy nową grupę i nie nadpisuje bieżących danych.",
  restoreJsonBackup: "Przywróć kopię zapasową JSON",
  chooseJsonBackup: "Wybierz kopię zapasową JSON",
  restorePreviewName: (values: MessageValues) =>
    interpolate("Podgląd przywracania: {name}", values),
  peoplePeopleExpensesExpensesPaymentsPaymentsBaseCurrency: (
    values: MessageValues,
  ) =>
    interpolate(
      "Osoby: {people} · Wydatki: {expenses} · Płatności: {payments} · Waluta bazowa: {currency}",
      values,
    ),
  createNewGroup: "Utwórz nową grupę",
  aNewGroupNamedNameWillBeCreatedWithoutChangingExistingGroups: (
    values: MessageValues,
  ) =>
    interpolate(
      "Zostanie utworzona nowa grupa o nazwie „{name}” bez zmiany istniejących grup.",
      values,
    ),
  restoreThisBackup: "Przywrócić tę kopię zapasową?",
  createNewGroup2: "Utwórz nową grupę",
  copyGroup: "Duplikuj grupę",
  copyThisGroup: "Zduplikować tę grupę?",
  copyGroupDescription:
    "Skopiuj osoby, walutę bazową i własne kursy do nowej grupy. Wydatki, płatności rozliczeniowe, współpracownicy i linki udostępniania nie są kopiowane. Pierwotna grupa pozostanie bez zmian.",
  groupCopied: "Zduplikowano grupę",
  groupPreferences: "Preferencje grupy",
  changingTheBaseCurrencyRecalculatesDisplayedAmountsAndClearsCustomExchangeRates:
    "Zmiana waluty bazowej przelicza wyświetlane kwoty i usuwa własne kursy walut.",
  nameAndBaseCurrency: "Nazwa i waluta bazowa",
  totalSpendingWillDisplayAsAmountBalancesAndSettlementsBelowWillBeConverted: (
    values: MessageValues,
  ) =>
    interpolate(
      "Suma wydatków będzie wyświetlana jako {amount}; poniższe salda i rozliczenia zostaną przeliczone.",
      values,
    ),
  expectCountSettlementSuggestionsCustomRatesWillResetToBuiltInValues: (
    values: MessageValues,
  ) =>
    interpolate(
      "Przewidywane propozycje rozliczenia: {count}; własne kursy zostaną zastąpione domyślnymi kursami Bank of Taiwan.",
      values,
    ),
  cancelChanges: "Anuluj zmiany",
  applyGroupPreferences: "Zastosuj preferencje grupy",
  changeTheBaseCurrencyToCurrencyRecalculateAllResultsAndClearCustomRates: (
    values: MessageValues,
  ) =>
    interpolate(
      "Zmień walutę bazową na {currency}, przelicz wszystkie wyniki i usuń własne kursy.",
      values,
    ),
  renameTheGroupToName: (values: MessageValues) =>
    interpolate("Zmień nazwę grupy na „{name}”.", values),
  applyTheseChanges: "Zastosować te zmiany?",
  applyChanges: "Zastosuj zmiany",
  groupPreferencesApplied: "Zastosowano preferencje grupy",
  saveFailed: "Zapisywanie nie powiodło się",
  customExchangeRatesApplied: "Zastosowano własne kursy walut",
  unableToSaveExchangeRates: "Nie można zapisać kursów walut",
  currencyConversion: "Przeliczanie walut",
  countCustomRates: (values: MessageValues) =>
    interpolate(
      pluralForm("pl", values.count, {
        one: "{count} własny kurs",
        few: "{count} własne kursy",
        many: "{count} własnych kursów",
        other: "{count} własnego kursu",
      }),
      values,
    ),
  setHowMuch1UnitOfEachCurrencyEqualsInCurrencyLeaveBlankToUseTheBuiltInFixedRate:
    (values: MessageValues) =>
      interpolate(
        "Ustaw wartość 1 jednostki każdej waluty w {currency}. Nieustawione kursy automatycznie korzystają ze średnich kursów spot Bank of Taiwan.",
        values,
      ),
  customExchangeRates: "Własne kursy walut",
  bankOfTaiwanSpotMidRateDescription:
    "Nowe wydatki bez własnych kursów używają średniego kursu spot Bank of Taiwan i zachowują to notowanie. Usunięcie własnych kursów wpływa na przyszłe wydatki; płatności nadal używają bieżących kursów.",
  loadBankOfTaiwanSpotMidRates: "Wczytaj domyślne kursy Bank of Taiwan",
  loadingBankExchangeRates: "Wczytywanie bankowych kursów walut…",
  bankOfTaiwanSpotMidRatesLoadedAtTime: (values: MessageValues) =>
    interpolate("Wczytano średnie kursy spot Bank of Taiwan ({time}).", values),
  bankOfTaiwanDefaultRatesApplied: "Przywrócono domyślne kursy Bank of Taiwan",
  unableToLoadBankExchangeRates:
    "Bankowe kursy walut są obecnie niedostępne. Spróbuj ponownie później.",
  conversionPreview: "Podgląd przeliczenia",
  totalSpendingAmountCountSettlementSuggestions: (values: MessageValues) =>
    interpolate(
      "Suma wydatków: {amount} · Propozycje rozliczenia: {count}.",
      values,
    ),
  applyRates: "Zastosuj kursy",
  allTotalsBalancesAndSettlementSuggestionsWillBeRecalculatedWithTheseRates:
    "Istniejące wydatki zachowują swoje kursy. Nowe lub ponownie przeliczane wydatki i istniejące płatności używają zaktualizowanych kursów.",
  applyCustomExchangeRates: "Zastosować własne kursy walut?",
  restoreBankOfTaiwanDefaultRates: "Przywrócić domyślne kursy Bank of Taiwan?",
  apiWriteSettings: "Dostęp do zapisu przez API",
  apiWritesAllowed: "Dozwolony",
  apiWritesBlocked: "Niedozwolony",
  apiWriteSettingsDescription:
    "Domyślnie tokeny API i CLI nie mogą zmieniać tej grupy. Po włączeniu członkowie z tokenami API mogą edytować zgodnie ze swoimi uprawnieniami. Działania w przeglądarce pozostają bez zmian.",
  allowApiWrites: "Zezwól na zmiany przez token API",
  apiWriteSettingSaved: "Zaktualizowano dostęp do zapisu przez API",
  groupLifecycle: "Cykl życia grupy",
  archivedReadOnly: "Zarchiwizowana · tylko do odczytu",
  active2: "Aktywna",
  afterRestoringDataCanBeAddedAndChangedAgain:
    "Po przywróceniu będzie można ponownie dodawać i zmieniać dane.",
  archivingPreservesAllDataButMakesTheGroupReadOnly:
    "Archiwizacja zachowuje wszystkie dane, ale ustawia grupę jako tylko do odczytu.",
  restoreGroup: "Przywróć grupę",
  archiveGroup: "Archiwizuj grupę",
  afterRestoringTheOwnerAndCollaboratorsCanEditDataAgain:
    "Po przywróceniu właściciel i współpracownicy będą mogli ponownie edytować dane.",
  expensesPeopleAndPaymentRecordsArePreservedAndCannotBeChangedWhileArchived:
    "Wydatki, osoby i zapisane płatności są zachowane i nie można ich zmieniać podczas archiwizacji.",
  groupRestored: "Przywrócono grupę",
  groupArchived: "Zarchiwizowano grupę",
  restoreThisGroup: "Przywrócić tę grupę?",
  archiveThisGroup: "Zarchiwizować tę grupę?",
  thisPermanentlyDeletesAllPeopleExpensesReceiptsAndSettlementRecordsAndCannotBeUndone:
    "Spowoduje to trwałe usunięcie wszystkich osób, wydatków, potwierdzeń i zapisów rozliczeń. Tej operacji nie można cofnąć.",
  deleteGroup: "Usuń grupę",
  enterNameToConfirm: (values: MessageValues) =>
    interpolate("Wpisz „{name}”, aby potwierdzić", values),
  permanentlyDeleteName: (values: MessageValues) =>
    interpolate("Trwale usuń „{name}”", values),
  thisCannotBeUndoneCancelingMakesNoChanges:
    "Tej operacji nie można cofnąć. Anulowanie nie wprowadzi żadnych zmian.",
  permanentlyDeleteThisGroup: "Trwale usunąć tę grupę?",
  permanentlyDeleteGroup: "Trwale usuń grupę",
  groupDeleted: "Usunięto grupę",
  readOnlyShare: "Udostępnienie tylko do odczytu",
  youCanViewExpensesBalancesAndSettlementSuggestionsButCannotEditData:
    "Możesz przeglądać wydatki, salda i propozycje rozliczenia, ale nie możesz edytować danych.",
  completeExpenseHistory: "Pełna historia wydatków",
  manageGroupSettings: "Zarządzaj ustawieniami grupy",
  csvImportFailed: "Import CSV nie powiódł się",
  theCsvHasNoData: "CSV nie zawiera danych",
  missingColumnsColumns: (values: MessageValues) =>
    interpolate("Brakujące kolumny: {columns}", values),
  participantNotFoundName: (values: MessageValues) =>
    interpolate("Nie znaleziono uczestnika: {name}", values),
  invalidJsonFormat: "Nieprawidłowy format JSON",
  incorrectUsernameOrPassword: "Nieprawidłowa nazwa użytkownika lub hasło",
  everyPersonNeedsAnAmountForACustomSplit:
    "Każda osoba musi mieć kwotę dla własnego podziału",
  unsupportedBackupVersion: "Nieobsługiwana wersja kopii zapasowej",
  unsupportedSplitMethod: "Nieobsługiwana metoda podziału",
  unsupportedExchangeRateCurrency: "Nieobsługiwana waluta kursu wymiany",
  unsupportedBaseCurrency: "Nieobsługiwana waluta bazowa",
  unsupportedCurrency: "Nieobsługiwana waluta",
  aParticipantCannotBeMergedIntoThemselves:
    "Nie można scalić uczestnika z nim samym",
  theOwnerCannotBeRemoved: "Nie można usunąć właściciela",
  thePayerAndRecipientMustBeDifferent:
    "Płatnik i odbiorca muszą być różnymi osobami",
  payerIsRequired: "Płatnik jest wymagany",
  thePayerMustBeAParticipant: "Płatnik musi być uczestnikiem",
  serverError: "Błąd serwera",
  invalidPaymentRecordsInBackup:
    "Nieprawidłowe zapisy płatności w kopii zapasowej",
  splitTotalsInBackupAreInvalid:
    "Nieprawidłowe sumy podziału w kopii zapasowej",
  invalidSplitDataInBackup: "Nieprawidłowe dane podziału w kopii zapasowej",
  invalidExchangeRatesInBackup: "Nieprawidłowe kursy walut w kopii zapasowej",
  invalidParticipantDataInBackup:
    "Nieprawidłowe dane uczestników w kopii zapasowej",
  backupContainsDuplicateParticipants:
    "Kopia zapasowa zawiera zduplikowanych uczestników",
  invalidBaseCurrencyInBackup: "Nieprawidłowa waluta bazowa w kopii zapasowej",
  invalidExpenseCategoryInBackup:
    "Nieprawidłowa kategoria wydatku w kopii zapasowej",
  anExpenseParticipantInTheBackupDoesNotExist:
    "Uczestnik wydatku w kopii zapasowej nie istnieje",
  anExpenseInTheBackupHasDuplicateParticipants:
    "Wydatek w kopii zapasowej zawiera zduplikowanych uczestników",
  invalidExpenseDataInBackup: "Nieprawidłowe dane wydatków w kopii zapasowej",
  invalidExpenseTagsInBackup:
    "Nieprawidłowe etykiety wydatków w kopii zapasowej",
  invalidTripNameInBackup: "Nieprawidłowa nazwa podróży w kopii zapasowej",
  backupIsMissingItsTrip: "W kopii zapasowej brakuje podróży",
  backupIsMissingParticipants: "W kopii zapasowej brakuje uczestników",
  backupIsMissingExpenses: "W kopii zapasowej brakuje wydatków",
  notesCanBeUpTo160Characters: "Notatki mogą mieć do 160 znaków",
  theShareLinkIsInvalidOrHasBeenRevoked:
    "Link udostępniania jest nieprawidłowy lub został unieważniony",
  atLeastOneSplitParticipantIsRequired:
    "Wymagany jest co najmniej jeden uczestnik podziału",
  splitParticipantsMustBelongToTheTrip:
    "Uczestnicy podziału muszą należeć do podróży",
  splitAmountsMustAddUpToTheExpenseAmount:
    "Suma kwot podziału musi być równa kwocie wydatku",
  splitAmountsMustBeGreaterThan0: "Kwoty podziału muszą być większe od 0",
  invalidSplitAmount: "Nieprawidłowa kwota podziału",
  invalidCategoryOrTagFormat: "Nieprawidłowy format kategorii lub etykiety",
  exchangeRatesMustBeGreaterThan0: "Kursy walut muszą być większe od 0",
  invalidExchangeRateFormat: "Nieprawidłowy format kursu walutowego",
  aParticipantWithThisNameAlreadyExists: "Uczestnik o tym imieniu już istnieje",
  thisParticipantHasPaymentRecordsAndCannotBeDeleted:
    "Ten uczestnik ma zapisane płatności i nie można go usunąć",
  thisParticipantHasExpensesAndCannotBeDeleted:
    "Ten uczestnik ma wydatki i nie można go usunąć",
  onlyTheOwnerCanDownloadACompleteBackup:
    "Tylko właściciel może pobrać pełną kopię zapasową",
  onlyTheOwnerCanManageShareLinks:
    "Tylko właściciel może zarządzać linkami udostępniania",
  onlyTheOwnerCanManageCollaborators:
    "Tylko właściciel może zarządzać współpracownikami",
  onlyTheOwnerCanManageTripSettings:
    "Tylko właściciel może zarządzać ustawieniami podróży",
  namesCanBeUpTo80Characters: "Imiona mogą mieć do 80 znaków",
  passwordMustBeAtLeast8Characters3: "Hasło musi mieć co najmniej 8 znaków",
  invalidArchiveStatus: "Nieprawidłowy stan archiwizacji",
  invalidApiWriteSetting:
    "Nieprawidłowe ustawienie dostępu do zapisu przez API",
  onlyBrowserSessionsCanManageApiWrites:
    "Tylko sesje przeglądarki mogą zarządzać dostępem do zapisu przez API",
  apiWritesDisabledForThisGroup:
    "Ta grupa nie zezwala na zmiany przez token API",
  apiEndpointNotFound: "Nie znaleziono punktu końcowego API",
  paymentRecordNotFound: "Nie znaleziono zapisu płatności",
  collaboratorNotFound: "Nie znaleziono współpracownika",
  participantNotFound: "Nie znaleziono uczestnika",
  noActiveShareLinkWasFound: "Nie znaleziono aktywnego linku udostępniania",
  expenseNotFound: "Nie znaleziono wydatku",
  receiptNotFound: "Nie znaleziono potwierdzenia",
  tripNotFound: "Nie znaleziono podróży",
  userNotFound: "Nie znaleziono użytkownika",
  descriptionMustBe1120Characters: "Opis musi mieć od 1 do 120 znaków",
  theOwnerIsAlreadyInTheCollaboratorList:
    "Właściciel jest już na liście współpracowników",
  thisGroupIsArchivedRestoreItBeforeEditing:
    "Ta grupa jest zarchiwizowana. Przywróć ją przed edycją.",
  receiptsMustBeJpegPngOrWebpImages:
    "Potwierdzenia muszą być obrazami JPEG, PNG lub WebP",
  theRecipientMustBeAParticipant: "Odbiorca musi być uczestnikiem",
  aTripWithThisNameAlreadyExists: "Podróż o tej nazwie już istnieje",
  dateMustUseTheYyyyMmDdFormat: "Data musi mieć format YYYY-MM-DD",
  upTo10TagsAreAllowed: "Dozwolonych jest maksymalnie 10 etykiet",
  tagsCanBeUpTo24Characters: "Etykiety mogą mieć do 24 znaków",
  invalidTagFormat: "Nieprawidłowy format etykiety",
  theTargetParticipantMustBelongToTheTrip:
    "Uczestnik docelowy musi należeć do podróży",
  signInFirst: "Najpierw się zaloguj",
  provideExpenseChanges: "Podaj zmiany wydatku",
  provideTripChanges: "Podaj zmiany podróży",
  requestBodyIsTooLarge: "Treść żądania jest zbyt duża",
  selectAtLeastOneSplitParticipant:
    "Wybierz co najmniej jednego uczestnika podziału",
  enterATripNameOf1100Characters:
    "Wpisz nazwę podróży o długości od 1 do 100 znaków",
  enterAnExpenseDescriptionOf1120Characters:
    "Wpisz opis wydatku o długości od 1 do 120 znaków",
  enterAParticipantNameOf180Characters:
    "Wpisz imię uczestnika o długości od 1 do 80 znaków",
  enterAUsernameAndPassword: "Wpisz nazwę użytkownika i hasło",
  enterSplitValues: "Wpisz wartości podziału",
  enterAValidPaymentDate: "Wpisz prawidłową datę płatności",
  enterValidSplitShares: "Wpisz prawidłowe udziały podziału",
  enterValidSplitPercentages: "Wpisz prawidłowe procenty podziału",
  enterValidSplitAmounts: "Wpisz prawidłowe kwoty podziału",
  enterAValidExpenseDate: "Wpisz prawidłową datę wydatku",
  chooseACsvFile: "Wybierz plik CSV",
  selectSplitParticipants: "Wybierz uczestników podziału",
  chooseAReceiptImage: "Wybierz obraz potwierdzenia",
  thisUserIsAlreadyACollaborator: "Ten użytkownik jest już współpracownikiem",
  thisUsernameIsAlreadyRegistered:
    "Ta nazwa użytkownika jest już zarejestrowana",
  usernameIsBeingRegisteredOrAlreadyRegistered:
    "Ta nazwa użytkownika jest rejestrowana lub jest już zajęta",
  usernameIsBeingRegistered: "Ta nazwa użytkownika jest rejestrowana",
  usernameOrPasskeyAlreadyRegistered:
    "Ta nazwa użytkownika lub klucz Passkey są już zarejestrowane",
  invalidAmount: "Nieprawidłowa kwota",
  theDefaultDevelopmentAccountsUsernameCannotBeChanged:
    "Nie można zmienić nazwy domyślnego konta programistycznego",
  language: "Język",
  english: "Angielski",
  traditionalChinese: "Chiński tradycyjny",
};
