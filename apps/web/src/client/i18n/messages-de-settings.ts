import {
  interpolate,
  type MessageValues,
  pluralForm,
} from "./message-types.js";

export const deSettings = {
  groupSettings: "Gruppeneinstellungen",
  manageSharingGroupPreferencesAndDataToolsHighImpactActionsRequireConfirmation:
    "Verwalte Freigaben, Gruppenvorgaben und Datenwerkzeuge. Aktionen mit großen Auswirkungen erfordern eine Bestätigung.",
  youAreACollaboratorAndCanUseDataToolsOnlyTheOwnerCanManageAccessAndGroupSettings:
    "Du bist Mitbearbeiter und kannst Datenwerkzeuge verwenden. Nur der Eigentümer kann den Zugriff und die Gruppeneinstellungen verwalten.",
  sharingAndAccess: "Freigabe und Zugriff",
  linksActiveLinksCollaboratorsCollaborators: (values: MessageValues) =>
    interpolate(
      "Aktive Links: {links} · Mitbearbeiter: {collaborators}",
      values,
    ),
  shareLinkCreated: "Freigabelink erstellt",
  shareLinkCreatedAndCopied: "Freigabelink erstellt und kopiert",
  shareLinks: "Freigabelinks",
  chooseWhoCanEditThroughTheShareLink:
    "Wähle, wer über diesen Link Daten ansehen oder bearbeiten kann.",
  linkPermission: "Linkberechtigung",
  readOnlyLink: "Nur lesen (ohne Anmeldung)",
  signedInEditLink: "Nach Anmeldung bearbeiten",
  anyoneEditLink: "Alle mit dem Link können bearbeiten",
  signedInEditLinkDescription:
    "Nach der Anmeldung oder Registrierung werden Besucher zu Mitbearbeitern. Der Widerruf des Links entfernt keine Personen, die bereits beigetreten sind.",
  anyoneEditLinkDescription:
    "Alle mit dem Link können Ausgaben und Teilnehmende ohne Anmeldung bearbeiten. Teile ihn nur mit Personen, denen du vertraust. Ein Widerruf wirkt sofort.",
  revokingSignedInLinkDoesNotRemoveExistingCollaborators:
    "Der Widerruf verhindert neue Beitritte. Vorhandene Mitbearbeiter können weiterhin bearbeiten. Entferne ihren Zugriff getrennt.",
  signInToEditSharedGroup: (values: MessageValues) =>
    interpolate(
      "Melde dich an oder erstelle ein Konto, um {name} zu bearbeiten.",
      values,
    ),
  readOnlyShareLinkCreated: "Freigabelink mit Lesezugriff erstellt",
  readOnlyShareLinkCreatedAndCopied:
    "Freigabelink mit Lesezugriff erstellt und kopiert",
  shareLinkCreatedYourBrowserBlockedAutomaticCopyingCopyItManually:
    "Freigabelink erstellt. Dein Browser hat das automatische Kopieren blockiert. Kopiere ihn manuell.",
  unableToCreateLink: "Link konnte nicht erstellt werden",
  shareLinkCopied: "Freigabelink kopiert",
  yourBrowserBlockedCopyingOpenTheLinkAndCopyItFromTheAddressBar:
    "Dein Browser hat das Kopieren blockiert. Öffne den Link und kopiere ihn aus der Adressleiste.",
  anyoneWithTheLinkCanViewExpensesBalancesAndSettlementsWithoutSigningInButCannotEdit:
    "Alle mit dem Link können Ausgaben, Salden und Ausgleichszahlungen ohne Anmeldung ansehen, aber nicht bearbeiten.",
  readOnlyShareLinks: "Freigabelinks mit Lesezugriff",
  createReadOnlyLink: "Link mit Lesezugriff erstellen",
  anyoneWithTheLinkCanViewThisGroupsExpensesBalancesAndSettlementSuggestionsButCannotAddOrChangeData:
    "Alle mit dem Link können Ausgaben, Salden und Ausgleichsvorschläge dieser Gruppe ansehen, aber keine Daten hinzufügen oder ändern.",
  createAShareLink: "Freigabelink erstellen?",
  createShareLink: "Freigabelink erstellen",
  revoked: "Widerrufen",
  active: "Aktiv",
  openLink: "Link öffnen",
  copy: "Kopieren",
  revokeLink: "Link widerrufen",
  afterRevocationTheOldLinkWillImmediatelyStopWorking:
    "Nach dem Widerruf funktioniert der alte Link sofort nicht mehr.",
  shareLinkRevoked: "Freigabelink widerrufen",
  revokeThisShareLink: "Diesen Freigabelink widerrufen?",
  revoke: "Widerrufen",
  noShareLinksYet: "Noch keine Freigabelinks.",
  collaboratorAdded: "Mitbearbeiter hinzugefügt",
  unableToAddCollaborator: "Mitbearbeiter konnte nicht hinzugefügt werden",
  collaboratorsMustBeExistingUsersTheyCanManageExpensesAndParticipantsButNotOwnerSettings:
    "Mitbearbeiter müssen bereits registrierte Nutzer sein. Sie können Ausgaben und Teilnehmende verwalten, aber keine Eigentümereinstellungen.",
  existingUsersUsername: "Benutzername eines registrierten Nutzers",
  addCollaborator: "Mitbearbeiter hinzufügen",
  removeName: (values: MessageValues) =>
    interpolate("{name} entfernen", values),
  thisAccountWillNoLongerBeAbleToManageTheGroupExistingExpenseDataWillRemain:
    "Dieses Konto kann die Gruppe nicht mehr verwalten. Vorhandene Ausgabendaten bleiben erhalten.",
  collaboratorRemoved: "Mitbearbeiter entfernt",
  removeCollaborator: "Mitbearbeiter entfernen?",
  remove: "Entfernen",
  dataAndExport: "Daten und Export",
  csvPrintBackupAndRestore: "CSV, Druck, Sicherung und Wiederherstellung",
  exportingDoesNotChangeGroupData: "Der Export ändert keine Gruppendaten.",
  exportAndPrint: "Exportieren und drucken",
  expenseCsvExported: "Ausgaben-CSV exportiert",
  exportExpenseCsv: "Ausgaben-CSV exportieren",
  settlementCsvExported: "Ausgleichs-CSV exportiert",
  exportSettlementCsv: "Ausgleichs-CSV exportieren",
  print: "Drucken",
  completeBackupDownloaded: "Vollständige Sicherung heruntergeladen",
  downloadFailed: "Herunterladen fehlgeschlagen",
  downloadCompleteBackup: "Vollständige Sicherung herunterladen",
  expenseCsvImported: "Ausgaben-CSV importiert",
  importFailed: "Import fehlgeschlagen",
  allRowsAreCheckedFirstNoDataIsWrittenIfAnyRowHasAnError:
    "Zuerst werden alle Zeilen geprüft. Enthält eine Zeile einen Fehler, werden keine Daten geschrieben.",
  importExpenseCsv: "Ausgaben-CSV importieren",
  chooseCsv: "CSV auswählen",
  importPreview: "Importvorschau",
  rowsRowsCanBeImportedErrorsErrors: (values: MessageValues) =>
    interpolate("Importierbare Zeilen: {rows}; Fehler: {errors}.", values),
  rowRowMessage: (values: MessageValues) =>
    interpolate("Zeile {row}: {message}", values),
  importCountExpenses: (values: MessageValues) =>
    interpolate(
      pluralForm("de", values.count, {
        one: "{count} Ausgabe importieren",
        other: "{count} Ausgaben importieren",
      }),
      values,
    ),
  thisWillAddCountExpensesAtOnceAndRecalculateBalances: (
    values: MessageValues,
  ) =>
    interpolate(
      pluralForm("de", values.count, {
        one: "Dies fügt {count} Ausgabe auf einmal hinzu und berechnet die Salden neu.",
        other:
          "Dies fügt {count} Ausgaben auf einmal hinzu und berechnet die Salden neu.",
      }),
      values,
    ),
  applyCsvImport: "CSV-Import anwenden?",
  applyImport: "Import anwenden",
  invalidBackupFormat: "Ungültiges Sicherungsformat",
  backupRestoredAsANewGroup: "Sicherung als neue Gruppe wiederhergestellt",
  restoreFailed: "Wiederherstellung fehlgeschlagen",
  restoringCreatesANewGroupAndDoesNotOverwriteCurrentData:
    "Die Wiederherstellung erstellt eine neue Gruppe und überschreibt keine aktuellen Daten.",
  restoreJsonBackup: "JSON-Sicherung wiederherstellen",
  chooseJsonBackup: "JSON-Sicherung auswählen",
  restorePreviewName: (values: MessageValues) =>
    interpolate("Wiederherstellungsvorschau: {name}", values),
  peoplePeopleExpensesExpensesPaymentsPaymentsBaseCurrency: (
    values: MessageValues,
  ) =>
    interpolate(
      "Personen: {people} · Ausgaben: {expenses} · Zahlungen: {payments} · Basiswährung: {currency}",
      values,
    ),
  createNewGroup: "Neue Gruppe erstellen",
  aNewGroupNamedNameWillBeCreatedWithoutChangingExistingGroups: (
    values: MessageValues,
  ) =>
    interpolate(
      "Eine neue Gruppe namens „{name}“ wird erstellt, ohne vorhandene Gruppen zu ändern.",
      values,
    ),
  restoreThisBackup: "Diese Sicherung wiederherstellen?",
  createNewGroup2: "Neue Gruppe erstellen",
  copyGroup: "Gruppe duplizieren",
  copyThisGroup: "Diese Gruppe duplizieren?",
  copyGroupDescription:
    "Kopiere Personen, Basiswährung und benutzerdefinierte Kurse in eine neue Gruppe. Ausgaben, Ausgleichszahlungen, Mitbearbeiter und Freigabelinks werden nicht kopiert. Die ursprüngliche Gruppe bleibt unverändert.",
  groupCopied: "Gruppe dupliziert",
  groupPreferences: "Gruppenvorgaben",
  changingTheBaseCurrencyRecalculatesDisplayedAmountsAndClearsCustomExchangeRates:
    "Eine Änderung der Basiswährung berechnet angezeigte Beträge neu und löscht benutzerdefinierte Wechselkurse.",
  nameAndBaseCurrency: "Name und Basiswährung",
  totalSpendingWillDisplayAsAmountBalancesAndSettlementsBelowWillBeConverted: (
    values: MessageValues,
  ) =>
    interpolate(
      "Die Gesamtausgaben werden als {amount} angezeigt. Die Salden und Ausgleichszahlungen unten werden umgerechnet.",
      values,
    ),
  expectCountSettlementSuggestionsCustomRatesWillResetToBuiltInValues: (
    values: MessageValues,
  ) =>
    interpolate(
      pluralForm("de", values.count, {
        one: "{count} Ausgleichsvorschlag zu erwarten; benutzerdefinierte Kurse werden auf die Standardkurse der Bank of Taiwan zurückgesetzt.",
        other:
          "{count} Ausgleichsvorschläge zu erwarten; benutzerdefinierte Kurse werden auf die Standardkurse der Bank of Taiwan zurückgesetzt.",
      }),
      values,
    ),
  cancelChanges: "Änderungen verwerfen",
  applyGroupPreferences: "Gruppenvorgaben anwenden",
  changeTheBaseCurrencyToCurrencyRecalculateAllResultsAndClearCustomRates: (
    values: MessageValues,
  ) =>
    interpolate(
      "Basiswährung auf {currency} ändern, alle Ergebnisse neu berechnen und benutzerdefinierte Kurse löschen.",
      values,
    ),
  renameTheGroupToName: (values: MessageValues) =>
    interpolate("Gruppe in „{name}“ umbenennen.", values),
  applyTheseChanges: "Diese Änderungen anwenden?",
  applyChanges: "Änderungen anwenden",
  groupPreferencesApplied: "Gruppenvorgaben angewendet",
  saveFailed: "Speichern fehlgeschlagen",
  customExchangeRatesApplied: "Benutzerdefinierte Wechselkurse angewendet",
  unableToSaveExchangeRates: "Wechselkurse konnten nicht gespeichert werden",
  currencyConversion: "Währungsumrechnung",
  countCustomRates: (values: MessageValues) =>
    interpolate(
      pluralForm("de", values.count, {
        one: "{count} benutzerdefinierter Kurs",
        other: "{count} benutzerdefinierte Kurse",
      }),
      values,
    ),
  setHowMuch1UnitOfEachCurrencyEqualsInCurrencyLeaveBlankToUseTheBuiltInFixedRate:
    (values: MessageValues) =>
      interpolate(
        "Lege fest, wie viel eine Einheit jeder Währung in {currency} wert ist. Nicht festgelegte Kurse verwenden automatisch die Devisenkassamittelkurse der Bank of Taiwan.",
        values,
      ),
  customExchangeRates: "Benutzerdefinierte Wechselkurse",
  bankOfTaiwanSpotMidRateDescription:
    "Neue Ausgaben ohne benutzerdefinierten Kurs verwenden den Devisenkassamittelkurs der Bank of Taiwan und behalten diesen Kurs. Das Löschen benutzerdefinierter Kurse betrifft künftige Ausgaben. Zahlungen verwenden weiterhin aktuelle Kurse.",
  loadBankOfTaiwanSpotMidRates: "Standardkurse der Bank of Taiwan laden",
  loadingBankExchangeRates: "Bankwechselkurse werden geladen…",
  bankOfTaiwanSpotMidRatesLoadedAtTime: (values: MessageValues) =>
    interpolate(
      "Devisenkassamittelkurse der Bank of Taiwan geladen ({time}).",
      values,
    ),
  bankOfTaiwanDefaultRatesApplied:
    "Standardkurse der Bank of Taiwan wiederhergestellt",
  unableToLoadBankExchangeRates:
    "Bankwechselkurse sind derzeit nicht verfügbar. Versuche es später erneut.",
  conversionPreview: "Umrechnungsvorschau",
  totalSpendingAmountCountSettlementSuggestions: (values: MessageValues) =>
    interpolate(
      pluralForm("de", values.count, {
        one: "Gesamtausgaben: {amount} · {count} Ausgleichsvorschlag.",
        other: "Gesamtausgaben: {amount} · {count} Ausgleichsvorschläge.",
      }),
      values,
    ),
  applyRates: "Kurse anwenden",
  allTotalsBalancesAndSettlementSuggestionsWillBeRecalculatedWithTheseRates:
    "Vorhandene Ausgaben behalten ihre Kurse. Neue Ausgaben, Ausgaben mit neu festgelegtem Kurs und vorhandene Zahlungen verwenden die aktualisierten Kurse.",
  applyCustomExchangeRates: "Benutzerdefinierte Wechselkurse anwenden?",
  restoreBankOfTaiwanDefaultRates:
    "Standardkurse der Bank of Taiwan wiederherstellen?",
  apiWriteSettings: "API-Schreibzugriff",
  apiWritesAllowed: "Erlaubt",
  apiWritesBlocked: "Nicht erlaubt",
  apiWriteSettingsDescription:
    "API-Tokens und die CLI können diese Gruppe standardmäßig nicht ändern. Bei Aktivierung können Mitglieder mit API-Tokens gemäß ihren Berechtigungen bearbeiten. Browseraktionen bleiben unverändert.",
  allowApiWrites: "Änderungen über API-Token erlauben",
  apiWriteSettingSaved: "API-Schreibzugriff aktualisiert",
  groupLifecycle: "Gruppenlebenszyklus",
  archivedReadOnly: "Archiviert · schreibgeschützt",
  active2: "Aktiv",
  afterRestoringDataCanBeAddedAndChangedAgain:
    "Nach der Wiederherstellung können Daten wieder hinzugefügt und geändert werden.",
  archivingPreservesAllDataButMakesTheGroupReadOnly:
    "Die Archivierung erhält alle Daten, macht die Gruppe aber schreibgeschützt.",
  restoreGroup: "Gruppe wiederherstellen",
  archiveGroup: "Gruppe archivieren",
  afterRestoringTheOwnerAndCollaboratorsCanEditDataAgain:
    "Nach der Wiederherstellung können der Eigentümer und die Mitbearbeiter Daten wieder bearbeiten.",
  expensesPeopleAndPaymentRecordsArePreservedAndCannotBeChangedWhileArchived:
    "Ausgaben, Personen und Zahlungseinträge bleiben erhalten und können während der Archivierung nicht geändert werden.",
  groupRestored: "Gruppe wiederhergestellt",
  groupArchived: "Gruppe archiviert",
  restoreThisGroup: "Diese Gruppe wiederherstellen?",
  archiveThisGroup: "Diese Gruppe archivieren?",
  thisPermanentlyDeletesAllPeopleExpensesReceiptsAndSettlementRecordsAndCannotBeUndone:
    "Dies löscht alle Personen, Ausgaben, Belege und Ausgleichseinträge dauerhaft und kann nicht rückgängig gemacht werden.",
  deleteGroup: "Gruppe löschen",
  enterNameToConfirm: (values: MessageValues) =>
    interpolate("Gib zur Bestätigung „{name}“ ein", values),
  permanentlyDeleteName: (values: MessageValues) =>
    interpolate("„{name}“ dauerhaft löschen", values),
  thisCannotBeUndoneCancelingMakesNoChanges:
    "Dies kann nicht rückgängig gemacht werden. Beim Abbrechen wird nichts geändert.",
  permanentlyDeleteThisGroup: "Diese Gruppe dauerhaft löschen?",
  permanentlyDeleteGroup: "Gruppe dauerhaft löschen",
  groupDeleted: "Gruppe gelöscht",
  readOnlyShare: "Freigabe mit Lesezugriff",
  youCanViewExpensesBalancesAndSettlementSuggestionsButCannotEditData:
    "Du kannst Ausgaben, Salden und Ausgleichsvorschläge ansehen, aber keine Daten bearbeiten.",
  completeExpenseHistory: "Vollständiger Ausgabenverlauf",
  manageGroupSettings: "Gruppeneinstellungen verwalten",
  csvImportFailed: "CSV-Import fehlgeschlagen",
  theCsvHasNoData: "Die CSV-Datei enthält keine Daten",
  missingColumnsColumns: (values: MessageValues) =>
    interpolate("Fehlende Spalten: {columns}", values),
  participantNotFoundName: (values: MessageValues) =>
    interpolate("Teilnehmende Person nicht gefunden: {name}", values),
  invalidJsonFormat: "Ungültiges JSON-Format",
  incorrectUsernameOrPassword: "Falscher Benutzername oder falsches Passwort",
  everyPersonNeedsAnAmountForACustomSplit:
    "Für eine benutzerdefinierte Aufteilung benötigt jede Person einen Betrag",
  unsupportedBackupVersion: "Nicht unterstützte Sicherungsversion",
  unsupportedSplitMethod: "Nicht unterstützte Aufteilungsmethode",
  unsupportedExchangeRateCurrency: "Nicht unterstützte Wechselkurswährung",
  unsupportedBaseCurrency: "Nicht unterstützte Basiswährung",
  unsupportedCurrency: "Nicht unterstützte Währung",
  aParticipantCannotBeMergedIntoThemselves:
    "Eine teilnehmende Person kann nicht mit sich selbst zusammengeführt werden",
  theOwnerCannotBeRemoved: "Der Eigentümer kann nicht entfernt werden",
  thePayerAndRecipientMustBeDifferent:
    "Zahlende und empfangende Person müssen verschieden sein",
  payerIsRequired: "Eine zahlende Person ist erforderlich",
  thePayerMustBeAParticipant:
    "Die zahlende Person muss zu den Teilnehmenden gehören",
  serverError: "Serverfehler",
  invalidPaymentRecordsInBackup: "Ungültige Zahlungseinträge in der Sicherung",
  splitTotalsInBackupAreInvalid:
    "Die Aufteilungssummen in der Sicherung sind ungültig",
  invalidSplitDataInBackup: "Ungültige Aufteilungsdaten in der Sicherung",
  invalidExchangeRatesInBackup: "Ungültige Wechselkurse in der Sicherung",
  invalidParticipantDataInBackup:
    "Ungültige Teilnehmendendaten in der Sicherung",
  backupContainsDuplicateParticipants:
    "Die Sicherung enthält doppelte Teilnehmende",
  invalidBaseCurrencyInBackup: "Ungültige Basiswährung in der Sicherung",
  invalidExpenseCategoryInBackup:
    "Ungültige Ausgabenkategorie in der Sicherung",
  anExpenseParticipantInTheBackupDoesNotExist:
    "Eine an Ausgaben teilnehmende Person in der Sicherung existiert nicht",
  anExpenseInTheBackupHasDuplicateParticipants:
    "Eine Ausgabe in der Sicherung enthält doppelte Teilnehmende",
  invalidExpenseDataInBackup: "Ungültige Ausgabendaten in der Sicherung",
  invalidExpenseTagsInBackup: "Ungültige Ausgabenschlagwörter in der Sicherung",
  invalidTripNameInBackup: "Ungültiger Reisename in der Sicherung",
  backupIsMissingItsTrip: "In der Sicherung fehlt die Reise",
  backupIsMissingParticipants: "In der Sicherung fehlen Teilnehmende",
  backupIsMissingExpenses: "In der Sicherung fehlen Ausgaben",
  notesCanBeUpTo160Characters: "Notizen dürfen höchstens 160 Zeichen lang sein",
  theShareLinkIsInvalidOrHasBeenRevoked:
    "Der Freigabelink ist ungültig oder wurde widerrufen",
  atLeastOneSplitParticipantIsRequired:
    "Mindestens eine Person für die Aufteilung ist erforderlich",
  splitParticipantsMustBelongToTheTrip:
    "Personen in der Aufteilung müssen zur Reise gehören",
  splitAmountsMustAddUpToTheExpenseAmount:
    "Die aufgeteilten Beträge müssen zusammen dem Ausgabenbetrag entsprechen",
  splitAmountsMustBeGreaterThan0:
    "Aufgeteilte Beträge müssen größer als 0 sein",
  invalidSplitAmount: "Ungültiger Aufteilungsbetrag",
  invalidCategoryOrTagFormat: "Ungültiges Kategorie- oder Schlagwortformat",
  exchangeRatesMustBeGreaterThan0: "Wechselkurse müssen größer als 0 sein",
  invalidExchangeRateFormat: "Ungültiges Wechselkursformat",
  aParticipantWithThisNameAlreadyExists:
    "Eine teilnehmende Person mit diesem Namen existiert bereits",
  thisParticipantHasPaymentRecordsAndCannotBeDeleted:
    "Diese teilnehmende Person hat Zahlungseinträge und kann nicht gelöscht werden",
  thisParticipantHasExpensesAndCannotBeDeleted:
    "Diese teilnehmende Person hat Ausgaben und kann nicht gelöscht werden",
  onlyTheOwnerCanDownloadACompleteBackup:
    "Nur der Eigentümer kann eine vollständige Sicherung herunterladen",
  onlyTheOwnerCanManageShareLinks:
    "Nur der Eigentümer kann Freigabelinks verwalten",
  onlyTheOwnerCanManageCollaborators:
    "Nur der Eigentümer kann Mitbearbeiter verwalten",
  onlyTheOwnerCanManageTripSettings:
    "Nur der Eigentümer kann Reiseeinstellungen verwalten",
  namesCanBeUpTo80Characters: "Namen dürfen höchstens 80 Zeichen lang sein",
  passwordMustBeAtLeast8Characters3:
    "Das Passwort muss mindestens 8 Zeichen lang sein",
  invalidArchiveStatus: "Ungültiger Archivierungsstatus",
  invalidApiWriteSetting: "Ungültige Einstellung für API-Schreibzugriff",
  onlyBrowserSessionsCanManageApiWrites:
    "Nur Browsersitzungen können den API-Schreibzugriff verwalten",
  apiWritesDisabledForThisGroup:
    "Diese Gruppe erlaubt keine Änderungen über API-Token",
  apiEndpointNotFound: "API-Endpunkt nicht gefunden",
  paymentRecordNotFound: "Zahlungseintrag nicht gefunden",
  collaboratorNotFound: "Mitbearbeiter nicht gefunden",
  participantNotFound: "Teilnehmende Person nicht gefunden",
  noActiveShareLinkWasFound: "Kein aktiver Freigabelink gefunden",
  expenseNotFound: "Ausgabe nicht gefunden",
  receiptNotFound: "Beleg nicht gefunden",
  tripNotFound: "Reise nicht gefunden",
  userNotFound: "Nutzer nicht gefunden",
  descriptionMustBe1120Characters:
    "Die Beschreibung muss 1–120 Zeichen lang sein",
  theOwnerIsAlreadyInTheCollaboratorList:
    "Der Eigentümer ist bereits in der Mitbearbeiterliste",
  thisGroupIsArchivedRestoreItBeforeEditing:
    "Diese Gruppe ist archiviert. Stelle sie vor dem Bearbeiten wieder her.",
  receiptsMustBeJpegPngOrWebpImages:
    "Belege müssen JPEG-, PNG- oder WebP-Bilder sein",
  theRecipientMustBeAParticipant:
    "Die empfangende Person muss zu den Teilnehmenden gehören",
  aTripWithThisNameAlreadyExists:
    "Eine Reise mit diesem Namen existiert bereits",
  dateMustUseTheYyyyMmDdFormat:
    "Das Datum muss das Format YYYY-MM-DD verwenden",
  upTo10TagsAreAllowed: "Bis zu 10 Schlagwörter sind erlaubt",
  tagsCanBeUpTo24Characters:
    "Schlagwörter dürfen höchstens 24 Zeichen lang sein",
  invalidTagFormat: "Ungültiges Schlagwortformat",
  theTargetParticipantMustBelongToTheTrip:
    "Die Zielperson muss zur Reise gehören",
  signInFirst: "Zuerst anmelden",
  provideExpenseChanges: "Gib die Ausgabenänderungen an",
  provideTripChanges: "Gib die Reiseänderungen an",
  requestBodyIsTooLarge: "Der Anfrageinhalt ist zu groß",
  selectAtLeastOneSplitParticipant:
    "Wähle mindestens eine Person für die Aufteilung aus",
  enterATripNameOf1100Characters: "Gib einen Reisenamen mit 1–100 Zeichen ein",
  enterAnExpenseDescriptionOf1120Characters:
    "Gib eine Ausgabenbeschreibung mit 1–120 Zeichen ein",
  enterAParticipantNameOf180Characters:
    "Gib einen Teilnehmendennamen mit 1–80 Zeichen ein",
  enterAUsernameAndPassword: "Gib einen Benutzernamen und ein Passwort ein",
  enterSplitValues: "Gib Aufteilungswerte ein",
  enterAValidPaymentDate: "Gib ein gültiges Zahlungsdatum ein",
  enterValidSplitShares: "Gib gültige Aufteilungsanteile ein",
  enterValidSplitPercentages: "Gib gültige Aufteilungsprozentsätze ein",
  enterValidSplitAmounts: "Gib gültige Aufteilungsbeträge ein",
  enterAValidExpenseDate: "Gib ein gültiges Ausgabedatum ein",
  chooseACsvFile: "Wähle eine CSV-Datei aus",
  selectSplitParticipants: "Wähle die Personen für die Aufteilung aus",
  chooseAReceiptImage: "Wähle ein Belegbild aus",
  thisUserIsAlreadyACollaborator: "Dieser Nutzer ist bereits Mitbearbeiter",
  thisUsernameIsAlreadyRegistered:
    "Dieser Benutzername ist bereits registriert",
  usernameIsBeingRegisteredOrAlreadyRegistered:
    "Dieser Benutzername wird gerade registriert oder ist bereits vergeben",
  usernameIsBeingRegistered: "Dieser Benutzername wird gerade registriert",
  usernameOrPasskeyAlreadyRegistered:
    "Dieser Benutzername oder Passkey ist bereits registriert",
  invalidAmount: "Ungültiger Betrag",
  theDefaultDevelopmentAccountsUsernameCannotBeChanged:
    "Der Benutzername des Standardentwicklungskontos kann nicht geändert werden",
  language: "Sprache",
  english: "Englisch",
  traditionalChinese: "Traditionelles Chinesisch",
};
