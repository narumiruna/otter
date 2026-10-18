import {
  interpolate,
  type MessageValues,
  pluralForm,
} from "./message-types.js";

export const deExpenses = {
  showingShownOfTotalExpenses: (values: MessageValues) =>
    interpolate("Angezeigte Ausgaben: {shown} von {total}", values),
  searchDescriptions: "Beschreibungen durchsuchen",
  searchExpenseDescriptions: "Ausgabenbeschreibungen durchsuchen",
  sort: "Sortieren",
  groupBy: "Gruppieren nach",
  noGrouping: "Keine Gruppierung",
  groupByDate: "Nach Datum gruppieren",
  groupByPayer: "Nach zahlender Person gruppieren",
  dateNewestFirst: "Datum: neueste zuerst",
  dateOldestFirst: "Datum: älteste zuerst",
  amountHighToLow: "Betrag: absteigend",
  amountLowToHigh: "Betrag: aufsteigend",
  moreFilters: "Weitere Filter",
  countApplied: (values: MessageValues) =>
    interpolate("{count} angewendet", values),
  datePersonCurrencyCategoryAndTag:
    "Datum, Person, Währung, Kategorie und Schlagwort",
  from: "Von",
  to: "Bis",
  paidBy: "Bezahlt von",
  splitWith: "Geteilt mit",
  expenseParticipants: "Teilnehmende an Ausgaben",
  currency: "Währung",
  allCurrencies: "Alle Währungen",
  category: "Kategorie",
  allCategories: "Alle Kategorien",
  tag: "Schlagwort",
  exactTag: "Genaues Schlagwort",
  applied: "Angewendet:",
  clearAll: "Alle löschen",
  allPeople: "Alle Personen",
  categoryValue: (values: MessageValues) =>
    interpolate("Kategorie: {value}", values),
  currencyValue: (values: MessageValues) =>
    interpolate("Währung: {value}", values),
  fromValue: (values: MessageValues) => interpolate("Von: {value}", values),
  toValue: (values: MessageValues) => interpolate("Bis: {value}", values),
  tagValue: (values: MessageValues) =>
    interpolate("Schlagwort: {value}", values),
  aCompleteHistoryWillAppearHereAfterTheFirstSharedExpense:
    "Nach der ersten gemeinsamen Ausgabe erscheint hier ein vollständiger Verlauf.",
  recordFirstExpense: "Erste Ausgabe erfassen",
  noMatchingExpenses: "Keine passenden Ausgaben",
  adjustOrClearTheFiltersToSeeAllExpenses:
    "Passe die Filter an oder lösche sie, um alle Ausgaben zu sehen.",
  clearFilters: "Filter löschen",
  filteredExpenses: "Gefilterte Ausgaben",
  allExpenses: "Alle Ausgaben",
  columns: "Spalten",
  chooseExpenseColumns: "Ausgabenspalten wählen",
  expenseName: "Ausgabe",
  splitParticipants: "Aufteilung",
  receipt: "Beleg",
  tags: "Schlagwörter",
  restoreDefaults: "Standardwerte wiederherstellen",
  actions: "Aktionen",
  expenseGroupSummary: (values: MessageValues) =>
    interpolate(
      pluralForm("de", values.count, {
        one: "{count} Ausgabe · {total}",
        other: "{count} Ausgaben · {total}",
      }),
      values,
    ),
  countPeople: (values: MessageValues) =>
    interpolate(
      pluralForm("de", values.count, {
        one: "{count} Person",
        other: "{count} Personen",
      }),
      values,
    ),
  viewReceiptForName: (values: MessageValues) =>
    interpolate("Beleg für {name} ansehen", values),
  receiptPreviewForName: (values: MessageValues) =>
    interpolate("Beleg für „{name}“", values),
  receiptImageForName: (values: MessageValues) =>
    interpolate("Belegbild für {name}", values),
  closeReceiptPreviewHint:
    "Zum Schließen auf das Bild klicken oder Esc drücken.",
  closeReceiptPreview: "Belegvorschau schließen",
  openOriginalReceipt: "Originalbild öffnen",
  moreActionsForName: (values: MessageValues) =>
    interpolate("Weitere Aktionen für {name}", values),
  datePaidByName: (values: MessageValues) =>
    interpolate("{date} · bezahlt von {name}", values),
  splitWithSplit: (values: MessageValues) =>
    interpolate("Geteilt mit {split}", values),
  edit: "Bearbeiten",
  receiptUploadFailed: "Beleg konnte nicht hochgeladen werden",
  receiptUploaded: "Beleg hochgeladen",
  uploading: "Wird hochgeladen…",
  uploadReceipt: "Beleg hochladen",
  receiptFileRequirements: "JPEG, PNG oder WebP · Bis zu 5 MB",
  selectReceiptPhoto: "Foto hochladen",
  takeReceiptPhoto: "Foto aufnehmen",
  removeReceiptPhoto: "Foto entfernen",
  receiptOnlineOnly:
    "Fotos erfordern eine Verbindung. Offline-Entwürfe speichern keine Fotos. Entferne zuerst das Foto oder stelle die Verbindung wieder her.",
  receiptFileTooLarge: "Fotos dürfen höchstens 5 MB groß sein",
  expenseSavedReceiptFailed:
    "Ausgabe erstellt, aber der Beleg konnte nicht hochgeladen werden. Versuche es jetzt erneut oder füge ihn später über die Ausgabenliste hinzu.",
  retryReceiptUpload: "Beleg erneut hochladen",
  receiptAlreadyAttached:
    "Diese Ausgabe hat bereits einen Beleg. Prüfe ihn über die Ausgabenliste. Er wird nicht automatisch überschrieben",
  uploadReceiptLater: "Später hochladen",
  expenseCreationUncertain:
    "Wir können nicht bestätigen, ob die Ausgabe erstellt wurde. Prüfe vor dem erneuten Hinzufügen die Ausgabenliste. Versuche es nicht sofort erneut.",
  viewReceipt: "Beleg ansehen",
  noReceipt: "Kein Beleg",
  deleteReceipt: "Beleg löschen",
  youCanUploadAnotherReceiptLaterTheExpenseWillNotBeDeleted:
    "Du kannst später einen anderen Beleg hochladen. Die Ausgabe wird nicht gelöscht.",
  receiptDeleted: "Beleg gelöscht",
  deleteThisReceipt: "Diesen Beleg löschen?",
  deleteName: (values: MessageValues) =>
    interpolate("„{name}“ löschen", values),
  thisCannotBeUndoneAllBalancesAndSettlementSuggestionsWillBeRecalculated:
    "Dies kann nicht rückgängig gemacht werden. Alle Salden und Ausgleichsvorschläge werden neu berechnet.",
  expenseDeleted: "Ausgabe gelöscht",
  deleteThisExpense: "Diese Ausgabe löschen?",
  invalidSplitFormat: "Ungültiges Aufteilungsformat",
  selectAtLeastOnePersonToSplitWith:
    "Wähle mindestens eine Person zum Teilen aus",
  expenseChangesSaved: "Ausgabenänderungen gespeichert",
  expenseRecorded: "Ausgabe erfasst",
  unableToSaveExpense: "Ausgabe konnte nicht gespeichert werden",
  reviewTheSplitPreviewBeforeSavingChanges:
    "Prüfe vor dem Speichern der Änderungen die Aufteilungsvorschau.",
  enterTheRequiredDetailsFirstCustomSplitsAndTagsAreAvailableBelow:
    "Gib zuerst die erforderlichen Angaben ein. Benutzerdefinierte Aufteilungen und Schlagwörter sind unten verfügbar.",
  editExpense: "Ausgabe bearbeiten",
  addExpense2: "Ausgabe hinzufügen",
  discardDraft: "Entwurf verwerfen",
  unsavedChangesWillBeLostExistingDataWillNotChange:
    "Nicht gespeicherte Änderungen gehen verloren. Vorhandene Daten bleiben unverändert.",
  discardThisDraft: "Diesen Entwurf verwerfen?",
  description: "Beschreibung",
  dinnerHotelTrainTickets: "Abendessen, Hotel, Zugtickets",
  enterAnExpenseDescription: "Gib eine Ausgabenbeschreibung ein",
  amount: "Betrag",
  enterAnExpenseAmount: "Gib einen Ausgabenbetrag ein",
  date: "Datum",
  currency2: "Währung",
  splitPreview: "Aufteilungsvorschau",
  enterAnAmountToPreviewEachPersonsShare:
    "Gib einen Betrag ein, um den Anteil jeder Person zu sehen.",
  namePaidAmount: (values: MessageValues) =>
    interpolate("{name} hat {amount} bezahlt", values),
  changePeopleAndSplitMethod: "Personen und Aufteilungsmethode ändern",
  selectedSelectedOfTotal: (values: MessageValues) =>
    interpolate("{selected} von {total} ausgewählt", values),
  selectAll: "Alle auswählen",
  clear: "Leeren",
  splitMethod: "Aufteilungsmethode",
  splitEqually: "Gleichmäßig aufteilen",
  exactAmounts: "Genaue Beträge",
  percentages: "Prozentsätze",
  shares: "Anteile",
  nameSKind: (values: MessageValues) =>
    interpolate("{kind} für {name}", values),
  moreDetails: "Weitere Details",
  categoryAndTags: "Kategorie und Schlagwörter",
  separateWithCommasForExampleBreakfastTransport:
    "Durch Kommas trennen, zum Beispiel Frühstück, Verkehr",
  unsavedChangesWillBeLost: "Nicht gespeicherte Änderungen gehen verloren.",
  cancelEditing: "Bearbeitung abbrechen?",
  saveChanges: "Änderungen speichern",
  recordExpense: "Ausgabe erfassen",
  settlementRepresentative: "Ausgleich übernommen von",
  settledByName: (values: MessageValues) =>
    interpolate("Ausgleich übernommen von {name}", values),
  settleSeparately: "Selbst (getrennt ausgleichen)",
  settlementRepresentativeHelp:
    "Ausgaben werden pro Person aufgeteilt. Salden und Ausgleichsvorschläge führen den Nettosaldo einer Person bei ihrer Vertretung. Vertretungen können nicht selbst einer anderen Person zugeordnet werden.",
  representativeHasDependents:
    "Andere Mitglieder sind dieser Person zugeordnet. Entferne zuerst diese Zuordnungen.",
  settlementRepresentativeUpdated: "Ausgleichsvertretung aktualisiert",
  unableToUpdateSettlementRepresentative:
    "Ausgleichsvertretung konnte nicht aktualisiert werden",
  provideParticipantChanges:
    "Gib die zu ändernden Angaben der teilnehmenden Person an",
  invalidSettlementRepresentative: "Ungültige Ausgleichsvertretung",
  settlementRepresentativeMustBeAnotherGroupMember:
    "Die Ausgleichsvertretung muss ein anderes Mitglied dieser Gruppe sein",
  settlementRepresentativeCannotBeAssignedOrHaveDependents:
    "Die Ausgleichsvertretung darf nicht über jemand anderen ausgleichen. Dieser Person dürfen keine Mitglieder zugeordnet sein, deren Ausgleich sie übernimmt",
  invalidBackupSettlementRepresentative:
    "Ungültige Ausgleichsvertretung in der Sicherung",
  expenseParticipantAdded: "Teilnehmende Person für Ausgaben hinzugefügt",
  unableToAddPerson: "Person konnte nicht hinzugefügt werden",
  expenseParticipantsDoNotNeedToSignInManageAccountsWithAccessUnderMoreSharingAndAccess:
    "Teilnehmende an Ausgaben müssen sich nicht anmelden. Verwalte Konten mit Zugriff unter Gruppeneinstellungen → Freigabe und Zugriff.",
  personsName: "Name der Person",
  friendsName: "Name eines Freundes",
  enterAName: "Gib einen Namen ein",
  archivedGroupsAreReadOnlyRestoreThisGroupToChangeParticipants:
    "Archivierte Gruppen sind schreibgeschützt. Stelle diese Gruppe wieder her, um die Teilnehmenden zu ändern.",
  usedByAPayment: "In einer Zahlung verwendet",
  cannotDeleteReasonUpdateRelatedExpensesFirstOrUseTheMergeToolBelow: (
    values: MessageValues,
  ) =>
    interpolate(
      "Löschen nicht möglich: {reason}. Aktualisiere zuerst die zugehörigen Ausgaben oder verwende das Zusammenführungswerkzeug unten.",
      values,
    ),
  deleteName2: (values: MessageValues) => interpolate("{name} löschen", values),
  thisPersonHasNoExpensesOrPaymentsDeletionCannotBeUndone:
    "Diese Person hat keine Ausgaben oder Zahlungen. Das Löschen kann nicht rückgängig gemacht werden.",
  expenseParticipantDeleted: "Teilnehmende Person für Ausgaben gelöscht",
  deleteThisExpenseParticipant:
    "Diese teilnehmende Person für Ausgaben löschen?",
  nameUpdated: "Name aktualisiert",
  unableToUpdateName: "Name konnte nicht aktualisiert werden",
  rename: "Umbenennen",
  renameName: (values: MessageValues) =>
    interpolate("{name} umbenennen", values),
  existingExpensesAndPaymentsWillRemainLinkedToThisPerson:
    "Vorhandene Ausgaben und Zahlungen bleiben mit dieser Person verknüpft.",
  newName: "Neuer Name",
  saveName: "Namen speichern",
  advancedPeopleTools: "Erweiterte Personenwerkzeuge",
  mergeDuplicatePeople: "Doppelte Personen zusammenführen",
  sourcePerson: "Quellperson",
  targetPerson: "Zielperson",
  mergeInto: "Zusammenführen mit",
  changePreview: "Änderungsvorschau",
  expensesRelatedExpensesAndPaymentsPaymentsForSourceWillMoveToTargetThenTheSourcePersonWillBeDeleted:
    (values: MessageValues) =>
      interpolate(
        "Zugehörige Ausgaben ({expenses}) und Zahlungen ({payments}) von {source} werden auf {target} übertragen. Danach wird die Quellperson gelöscht.",
        values,
      ),
  mergePeople: "Personen zusammenführen",
  sourceWillBeDeletedAndRelatedDataWillBeTransferredToTargetAtomically: (
    values: MessageValues,
  ) =>
    interpolate(
      "{source} wird gelöscht und zugehörige Daten werden in einem unteilbaren Vorgang auf {target} übertragen.",
      values,
    ),
  expenseParticipantsMerged: "Teilnehmende an Ausgaben zusammengeführt",
  mergeFailed: "Zusammenführung fehlgeschlagen",
  applyMerge: "Zusammenführung anwenden?",
  previewAndMerge: "Prüfen und zusammenführen",
};
