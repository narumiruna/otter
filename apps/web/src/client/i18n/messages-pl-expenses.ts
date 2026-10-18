import {
  interpolate,
  type MessageValues,
  pluralForm,
} from "./message-types.js";

export const plExpenses = {
  createYourFirstGroup: "Utwórz pierwszą grupę",
  addATripOrEventGroupOrCreateOneFromAnExistingJsonBackup:
    "Dodaj grupę na podróż lub wydarzenie albo utwórz ją z istniejącej kopii zapasowej JSON.",
  groupExpenseSummary: "Podsumowanie wydatków grupy",
  totalSharedExpenses: "Suma wspólnych wydatków",
  convertedToBaseCurrency: "Przeliczono na walutę bazową",
  outstanding: "Do rozliczenia",
  countSuggestedPaymentsToSettleUp: (values: MessageValues) =>
    interpolate(
      pluralForm("pl", values.count, {
        one: "{count} proponowana płatność do rozliczenia",
        few: "{count} proponowane płatności do rozliczenia",
        many: "{count} proponowanych płatności do rozliczenia",
        other: "{count} proponowanej płatności do rozliczenia",
      }),
      values,
    ),
  nothingIsCurrentlyOutstanding: "Obecnie nie ma nic do rozliczenia",
  settlementSuggestionsAppearAfterExpensesAreAdded:
    "Propozycje rozliczenia pojawią się po dodaniu wydatków",
  expenseRecords: "Zapisane wydatki",
  sharedAmongCountPeople: (values: MessageValues) =>
    interpolate(
      pluralForm("pl", values.count, {
        one: "Podział między {count} osobę",
        few: "Podział między {count} osoby",
        many: "Podział między {count} osób",
        other: "Podział między {count} osoby",
      }),
      values,
    ),
  calculatedFromCurrentExpensesAndRecordedPayments:
    "Obliczono na podstawie bieżących wydatków i zapisanych płatności.",
  settleUp: "Rozlicz się",
  countEntries: (values: MessageValues) =>
    interpolate(
      pluralForm("pl", values.count, {
        one: "{count} wpis",
        few: "{count} wpisy",
        many: "{count} wpisów",
        other: "{count} wpisu",
      }),
      values,
    ),
  entries: "wpisy",
  seePaymentsAndSharesAtAGlance:
    "Zobacz od razu płatności i udziały w kosztach.",
  balances: "Salda",
  recentExpenses: "Ostatnie wydatki",
  noExpensesYet: "Brak wydatków",
  thisGroupHasNotRecordedAnySharedExpenses:
    "Ta grupa nie zapisała jeszcze żadnych wspólnych wydatków.",
  recordTheFirstSharedExpense: "Zapisz pierwszy wspólny wydatek",
  addThePeopleSplittingExpensesToCalculateEachBalance:
    "Najpierw dodaj osoby dzielące wydatki, a następnie zapisz pierwszy wydatek. Salda i propozycje rozliczenia pojawią się automatycznie.",
  balancesAndSettlementSuggestionsWillAppearHereAfterYouAddExpenses:
    "Salda i propozycje rozliczenia pojawią się tutaj po dodaniu wydatków.",
  addPerson: "Dodaj osobę",
  managePeople: "Zarządzaj osobami",
  everythingIsSettled: "Wszystko rozliczone",
  thereAreNoOutstandingPayments: "Nie ma zaległych płatności.",
  paymentRecorded: "Zapisano płatność",
  unableToRecordPayment: "Nie można zapisać płatności",
  recordPayment: "Zapisz płatność",
  recordSettlementPayment: "Zapisz płatność rozliczeniową",
  fromPaysToTheFullSuggestedAmountIsPrefilled: (values: MessageValues) =>
    interpolate(
      "{from} płaci na rzecz {to}; pełna proponowana kwota jest już wpisana.",
      values,
    ),
  paymentAmountCurrency: (values: MessageValues) =>
    interpolate("Kwota płatności ({currency})", values),
  enterAPaymentAmount: "Wpisz kwotę płatności",
  thePaymentMustBeGreaterThan0AndNoMoreThanTheSuggestedAmount:
    "Płatność musi być większa od 0 i nie może przekraczać proponowanej kwoty",
  expectedRemainder: "Przewidywana pozostała kwota: ",
  paymentDate: "Data płatności",
  noteOptional: "Notatka (opcjonalnie)",
  recordPayment2: "Zapisz płatność",
  paymentHistory: "Historia płatności",
  dateFromPaidTo: (values: MessageValues) =>
    interpolate("{date} · {from}: płatność na rzecz {to}", values),
  deletePayment: "Usuń płatność",
  remainingSettlementSuggestionsWillBeRecalculated:
    "Pozostałe propozycje rozliczenia zostaną przeliczone.",
  paymentDeleted: "Usunięto płatność",
  deleteFailed: "Usuwanie nie powiodło się",
  deleteThisPayment: "Usunąć tę płatność?",
  delete: "Usuń",
  datePaidByNameSplitWithSplit: (values: MessageValues) =>
    interpolate("{date} · płatnik: {name} · podział z: {split}", values),
  dailySpending: "Wydatki dzienne",
  paidByPerson: "Kwoty zapłacone według osób",
  byCategory: "Według kategorii",
  spendingAnalysis: "Analiza wydatków",
  totalAmount: (values: MessageValues) => interpolate("Suma {amount}", values),
  noDataYet: "Brak danych.",
  showingShownOfTotalExpenses: (values: MessageValues) =>
    interpolate("Wyświetlane wydatki: {shown} z {total}", values),
  searchDescriptions: "Szukaj w opisach",
  searchExpenseDescriptions: "Szukaj w opisach wydatków",
  sort: "Sortuj",
  groupBy: "Grupuj według",
  noGrouping: "Bez grupowania",
  groupByDate: "Grupuj według daty",
  groupByPayer: "Grupuj według płatnika",
  dateNewestFirst: "Data: od najnowszych",
  dateOldestFirst: "Data: od najstarszych",
  amountHighToLow: "Kwota: malejąco",
  amountLowToHigh: "Kwota: rosnąco",
  moreFilters: "Więcej filtrów",
  countApplied: (values: MessageValues) =>
    interpolate("Zastosowane filtry: {count}", values),
  datePersonCurrencyCategoryAndTag: "Data, osoba, waluta, kategoria i etykieta",
  from: "Od",
  to: "Do",
  paidBy: "Płatnik",
  splitWith: "Podział z",
  expenseParticipants: "Uczestnicy wydatków",
  currency: "Waluta",
  allCurrencies: "Wszystkie waluty",
  category: "Kategoria",
  allCategories: "Wszystkie kategorie",
  tag: "Etykieta",
  exactTag: "Dokładna etykieta",
  applied: "Zastosowano:",
  clearAll: "Wyczyść wszystko",
  allPeople: "Wszystkie osoby",
  categoryValue: (values: MessageValues) =>
    interpolate("Kategoria: {value}", values),
  currencyValue: (values: MessageValues) =>
    interpolate("Waluta: {value}", values),
  fromValue: (values: MessageValues) => interpolate("Od: {value}", values),
  toValue: (values: MessageValues) => interpolate("Do: {value}", values),
  tagValue: (values: MessageValues) => interpolate("Etykieta: {value}", values),
  aCompleteHistoryWillAppearHereAfterTheFirstSharedExpense:
    "Pełna historia pojawi się tutaj po pierwszym wspólnym wydatku.",
  recordFirstExpense: "Zapisz pierwszy wydatek",
  noMatchingExpenses: "Brak pasujących wydatków",
  adjustOrClearTheFiltersToSeeAllExpenses:
    "Zmień lub wyczyść filtry, aby zobaczyć wszystkie wydatki.",
  clearFilters: "Wyczyść filtry",
  filteredExpenses: "Filtrowane wydatki",
  allExpenses: "Wszystkie wydatki",
  columns: "Kolumny",
  chooseExpenseColumns: "Wybierz kolumny wydatków",
  expenseName: "Wydatek",
  splitParticipants: "Podział",
  receipt: "Potwierdzenie",
  tags: "Etykiety",
  restoreDefaults: "Przywróć domyślne",
  actions: "Działania",
  expenseGroupSummary: (values: MessageValues) =>
    interpolate(
      pluralForm("pl", values.count, {
        one: "{count} wydatek · {total}",
        few: "{count} wydatki · {total}",
        many: "{count} wydatków · {total}",
        other: "{count} wydatku · {total}",
      }),
      values,
    ),
  countPeople: (values: MessageValues) =>
    interpolate(
      pluralForm("pl", values.count, {
        one: "{count} osoba",
        few: "{count} osoby",
        many: "{count} osób",
        other: "{count} osoby",
      }),
      values,
    ),
  viewReceiptForName: (values: MessageValues) =>
    interpolate("Pokaż potwierdzenie: {name}", values),
  receiptPreviewForName: (values: MessageValues) =>
    interpolate("Potwierdzenie dla „{name}”", values),
  receiptImageForName: (values: MessageValues) =>
    interpolate("Obraz potwierdzenia: {name}", values),
  closeReceiptPreviewHint: "Kliknij obraz lub naciśnij Esc, aby zamknąć.",
  closeReceiptPreview: "Zamknij podgląd potwierdzenia",
  openOriginalReceipt: "Otwórz oryginalny obraz",
  moreActionsForName: (values: MessageValues) =>
    interpolate("Więcej działań dla {name}", values),
  datePaidByName: (values: MessageValues) =>
    interpolate("{date} · płatnik: {name}", values),
  splitWithSplit: (values: MessageValues) =>
    interpolate("Podział z: {split}", values),
  edit: "Edytuj",
  receiptUploadFailed: "Przesyłanie potwierdzenia nie powiodło się",
  receiptUploaded: "Przesłano potwierdzenie",
  uploading: "Przesyłanie…",
  uploadReceipt: "Prześlij potwierdzenie",
  receiptFileRequirements: "JPEG, PNG lub WebP · Do 5 MB",
  selectReceiptPhoto: "Prześlij zdjęcie",
  takeReceiptPhoto: "Zrób zdjęcie",
  removeReceiptPhoto: "Usuń zdjęcie",
  receiptOnlineOnly:
    "Zdjęcia wymagają połączenia; wersje robocze offline nie przechowują zdjęć. Najpierw usuń zdjęcie lub połącz się ponownie.",
  receiptFileTooLarge: "Zdjęcia nie mogą przekraczać 5 MB",
  expenseSavedReceiptFailed:
    "Wydatek został utworzony, ale przesyłanie potwierdzenia nie powiodło się. Spróbuj teraz ponownie lub dodaj je później z listy wydatków.",
  retryReceiptUpload: "Ponów przesyłanie potwierdzenia",
  receiptAlreadyAttached:
    "Ten wydatek ma już potwierdzenie. Sprawdź je na liście wydatków; nie zostanie automatycznie nadpisane",
  uploadReceiptLater: "Prześlij później",
  expenseCreationUncertain:
    "Nie możemy potwierdzić, czy wydatek został utworzony. Sprawdź listę wydatków przed ponownym dodaniem; nie ponawiaj od razu.",
  viewReceipt: "Pokaż potwierdzenie",
  noReceipt: "Brak potwierdzenia",
  deleteReceipt: "Usuń potwierdzenie",
  youCanUploadAnotherReceiptLaterTheExpenseWillNotBeDeleted:
    "Możesz później przesłać inne potwierdzenie; wydatek nie zostanie usunięty.",
  receiptDeleted: "Usunięto potwierdzenie",
  deleteThisReceipt: "Usunąć to potwierdzenie?",
  deleteName: (values: MessageValues) => interpolate("Usuń „{name}”", values),
  thisCannotBeUndoneAllBalancesAndSettlementSuggestionsWillBeRecalculated:
    "Tej operacji nie można cofnąć. Wszystkie salda i propozycje rozliczenia zostaną przeliczone.",
  expenseDeleted: "Usunięto wydatek",
  deleteThisExpense: "Usunąć ten wydatek?",
  invalidSplitFormat: "Nieprawidłowy format podziału",
  selectAtLeastOnePersonToSplitWith:
    "Wybierz co najmniej jedną osobę do podziału kosztów",
  expenseChangesSaved: "Zapisano zmiany wydatku",
  expenseRecorded: "Zapisano wydatek",
  unableToSaveExpense: "Nie można zapisać wydatku",
  reviewTheSplitPreviewBeforeSavingChanges:
    "Sprawdź podgląd podziału przed zapisaniem zmian.",
  enterTheRequiredDetailsFirstCustomSplitsAndTagsAreAvailableBelow:
    "Najpierw wpisz wymagane dane. Własne podziały i etykiety są dostępne poniżej.",
  editExpense: "Edytuj wydatek",
  addExpense2: "Dodaj wydatek",
  discardDraft: "Odrzuć wersję roboczą",
  unsavedChangesWillBeLostExistingDataWillNotChange:
    "Niezapisane zmiany zostaną utracone. Istniejące dane nie zmienią się.",
  discardThisDraft: "Odrzucić tę wersję roboczą?",
  description: "Opis",
  dinnerHotelTrainTickets: "Kolacja, hotel, bilety kolejowe",
  enterAnExpenseDescription: "Wpisz opis wydatku",
  amount: "Kwota",
  enterAnExpenseAmount: "Wpisz kwotę wydatku",
  date: "Data",
  currency2: "Waluta",
  splitPreview: "Podgląd podziału",
  enterAnAmountToPreviewEachPersonsShare:
    "Wpisz kwotę, aby zobaczyć udział każdej osoby w kosztach.",
  namePaidAmount: (values: MessageValues) =>
    interpolate("{name}: zapłacona kwota {amount}", values),
  changePeopleAndSplitMethod: "Zmień osoby i metodę podziału",
  selectedSelectedOfTotal: (values: MessageValues) =>
    interpolate("Wybrano {selected} z {total}", values),
  selectAll: "Zaznacz wszystko",
  clear: "Wyczyść",
  splitMethod: "Metoda podziału",
  splitEqually: "Po równo",
  exactAmounts: "Dokładne kwoty",
  percentages: "Procenty",
  shares: "Udziały",
  nameSKind: (values: MessageValues) => interpolate("{name}: {kind}", values),
  moreDetails: "Więcej szczegółów",
  categoryAndTags: "Kategoria i etykiety",
  separateWithCommasForExampleBreakfastTransport:
    "Oddziel przecinkami, na przykład śniadanie, transport",
  unsavedChangesWillBeLost: "Niezapisane zmiany zostaną utracone.",
  cancelEditing: "Anulować edycję?",
  saveChanges: "Zapisz zmiany",
  recordExpense: "Zapisz wydatek",
  settlementRepresentative: "Rozliczenie przypisane do",
  settledByName: (values: MessageValues) =>
    interpolate("Rozliczenie przypisane do: {name}", values),
  settleSeparately: "Samodzielnie (osobne rozliczenie)",
  settlementRepresentativeHelp:
    "Wydatki są dzielone na osoby; salda i propozycje rozliczenia uwzględniają saldo netto osoby u jej przedstawiciela. Przedstawicieli nie można przypisać do innej osoby.",
  representativeHasDependents:
    "Inni członkowie są przypisani do tej osoby. Najpierw usuń te przypisania.",
  settlementRepresentativeUpdated:
    "Zaktualizowano przedstawiciela do rozliczeń",
  unableToUpdateSettlementRepresentative:
    "Nie można zaktualizować przedstawiciela do rozliczeń",
  provideParticipantChanges: "Podaj dane uczestnika do aktualizacji",
  invalidSettlementRepresentative: "Nieprawidłowy przedstawiciel do rozliczeń",
  settlementRepresentativeMustBeAnotherGroupMember:
    "Przedstawicielem do rozliczeń musi być inny członek tej grupy",
  settlementRepresentativeCannotBeAssignedOrHaveDependents:
    "Przedstawiciel do rozliczeń nie może rozliczać się przez inną osobę, a ta osoba nie może mieć członków rozliczających się przez nią",
  invalidBackupSettlementRepresentative:
    "Nieprawidłowy przedstawiciel do rozliczeń w kopii zapasowej",
  expenseParticipantAdded: "Dodano uczestnika wydatków",
  unableToAddPerson: "Nie można dodać osoby",
  expenseParticipantsDoNotNeedToSignInManageAccountsWithAccessUnderMoreSharingAndAccess:
    "Uczestnicy wydatków nie muszą się logować. Zarządzaj kontami z dostępem w Ustawieniach grupy → Udostępnianie i dostęp.",
  personsName: "Imię osoby",
  friendsName: "Imię znajomego",
  enterAName: "Wpisz imię",
  archivedGroupsAreReadOnlyRestoreThisGroupToChangeParticipants:
    "Zarchiwizowane grupy są tylko do odczytu. Przywróć tę grupę, aby zmienić uczestników.",
  usedByAPayment: "Osoba użyta w płatności",
  cannotDeleteReasonUpdateRelatedExpensesFirstOrUseTheMergeToolBelow: (
    values: MessageValues,
  ) =>
    interpolate(
      "Nie można usunąć: {reason}. Najpierw zaktualizuj powiązane wydatki lub użyj poniższego narzędzia scalania.",
      values,
    ),
  deleteName2: (values: MessageValues) => interpolate("Usuń {name}", values),
  thisPersonHasNoExpensesOrPaymentsDeletionCannotBeUndone:
    "Ta osoba nie ma wydatków ani płatności. Usunięcia nie można cofnąć.",
  expenseParticipantDeleted: "Usunięto uczestnika wydatków",
  deleteThisExpenseParticipant: "Usunąć tego uczestnika wydatków?",
  nameUpdated: "Zaktualizowano imię",
  unableToUpdateName: "Nie można zaktualizować imienia",
  rename: "Zmień imię",
  renameName: (values: MessageValues) =>
    interpolate("Zmień imię: {name}", values),
  existingExpensesAndPaymentsWillRemainLinkedToThisPerson:
    "Istniejące wydatki i płatności pozostaną powiązane z tą osobą.",
  newName: "Nowe imię",
  saveName: "Zapisz imię",
  advancedPeopleTools: "Zaawansowane narzędzia osób",
  mergeDuplicatePeople: "Scal zduplikowane osoby",
  sourcePerson: "Osoba źródłowa",
  targetPerson: "Osoba docelowa",
  mergeInto: "Scal z",
  changePreview: "Podgląd zmian",
  expensesRelatedExpensesAndPaymentsPaymentsForSourceWillMoveToTargetThenTheSourcePersonWillBeDeleted:
    (values: MessageValues) =>
      interpolate(
        "Powiązane wydatki ({expenses}) i płatności ({payments}) osoby {source} zostaną przeniesione do {target}, a następnie osoba źródłowa zostanie usunięta.",
        values,
      ),
  mergePeople: "Scal osoby",
  sourceWillBeDeletedAndRelatedDataWillBeTransferredToTargetAtomically: (
    values: MessageValues,
  ) =>
    interpolate(
      "Osoba {source} zostanie usunięta, a powiązane dane zostaną przeniesione do {target} w jednej niepodzielnej operacji.",
      values,
    ),
  expenseParticipantsMerged: "Scalono uczestników wydatków",
  mergeFailed: "Scalanie nie powiodło się",
  applyMerge: "Zastosować scalenie?",
  previewAndMerge: "Podgląd i scalenie",
};
