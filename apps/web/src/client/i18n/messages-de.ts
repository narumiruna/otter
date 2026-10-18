import {
  type CatalogShape,
  interpolate,
  type MessageValues,
  pluralForm,
} from "./message-types.js";
import { deAccount } from "./messages-de-account.js";
import { deExpenses } from "./messages-de-expenses.js";
import { deSettings } from "./messages-de-settings.js";
import type { zhTW } from "./messages-zh-tw.js";

export const de = {
  ...deAccount,
  ...deExpenses,
  ...deSettings,
  expenseTotalLabel: "Gesamt",
  expenseSplitSection: "Auf Personen aufteilen",
  expenseSplitHelp:
    "Wähle die Personen, die diese Ausgabe teilen, wähle eine Methode und prüfe das Ergebnis.",
  expenseTagPlaceholder: "Schlagwort hinzufügen…",
  addShort: "Hinzufügen",
  settingsShort: "Einstellungen",
  close: "Schließen",
  groupDetails: "Gruppendetails",
  filters: "Filter",
  viewAll: "Alle ansehen",
  personLabel: "Person",
  preferencesLabel: "Vorgaben",
  profileLabel: "Profil",
  securityLabel: "Sicherheit",
  backToGroups: "Zurück zu den Gruppen",
  backToExpenseList: "Zurück zur Ausgabenliste",
  expenseEditorUnavailable:
    "Diese Ausgabe kann nicht bearbeitet werden. Sie ist möglicherweise nicht vorhanden, oder die Gruppe ist schreibgeschützt oder archiviert.",
  createdLabel: "Erstellt",
  statusLabel: "Status",
  peopleDeletionHelp:
    "Personen, die im Ausgabenbuch verwendet werden, können nicht gelöscht werden. Prüfe einzelne Einschränkungen über die Info-Schaltfläche oder führe doppelte Personen zusammen.",
  personRestriction: (values: MessageValues) =>
    interpolate("Löschbeschränkungen für {name}", values),
  representsPeople: (values: MessageValues) =>
    interpolate("Vertritt {names}", values),
  expenseRateForName: (values: MessageValues) =>
    interpolate("Betrag und Wechselkurs für {name} ansehen", values),
  rateUnavailable: "Kurs nicht verfügbar (ältere Daten)",
  expenseHistory: "Änderungsverlauf",
  expenseHistoryDescription:
    "Bearbeitungen, Löschungen und Wiederherstellungen von Ausgaben; kein Zahlungsverlauf und keine historischen Salden.",
  expenseHistoryEmpty: "Keine Änderungen erfasst",
  expenseHistoryMore: "Weitere Änderungen laden",
  expenseHistoryCreated: "Erstellt",
  expenseHistoryUpdated: "Aktualisiert",
  expenseHistoryDeleted: "Gelöscht",
  expenseHistoryRestored: "Wiederhergestellt",
  expenseHistoryBaseline: "Anfangsstand",
  expenseHistorySystem: "System",
  expenseHistoryBaselineNotice:
    "Stand bei Aktivierung des Verlaufs. Frühere Änderungen und die ursprüngliche verfassende Person sind unbekannt.",
  expenseHistoryReceiptNotice:
    "Nur Belegmetadaten werden aufbewahrt. Frühere Bilder sind nicht verfügbar.",
  expenseHistoryShares: "Aufgeteilte Beträge",
  expenseHistoryRate: "Gespeicherter Wechselkurs",
  expenseHistoryRateBank: "Bank of Taiwan",
  expenseHistoryRateCustom: "Gruppenspezifisch",
  expenseHistoryRateFixed: "Integrierter Festkurs",
  expenseHistoryRateLegacy: "Frühere Schätzung",
  expenseHistoryRateTimeUnavailable: "Kurszeitpunkt nicht verfügbar",
  expenseHistoryRateUnavailable: "Ältere Version: kein Kurs erfasst",
  expenseHistoryBefore: "Vorher",
  expenseHistoryAfter: "Nachher",
  expenseHistorySourceExpense: "Ausgabenaktion",
  expenseHistorySourceCsv: "CSV-Import",
  expenseHistorySourceRestore: "Sicherungswiederherstellung",
  expenseHistorySourceMerge: "Zusammenführung von Teilnehmenden",
  expenseHistorySourceReceipt: "Belegaktion",
  expenseHistorySourceSeed: "Entwicklungstestdaten",
  expenseHistorySourceMigration: "Migration",
  expenseHistorySourceVersionRestore: "Versionswiederherstellung",
  expenseRestoreVersion: (values: MessageValues) =>
    interpolate("v{version} wiederherstellen", values),
  expenseRestoreTitle: "Ausgabenversion wiederherstellen",
  expenseRestoreDescription:
    "Prüfe die aktuelle Ausgabe und die wiederherzustellende Version. Die Wiederherstellung fügt eine neue Version hinzu. Der spätere Verlauf bleibt verfügbar.",
  expenseRestoreKeepsReceipt:
    "Der aktuelle Beleg bleibt angehängt. Alte Belegbilder werden nicht wiederhergestellt.",
  expenseRestoreNoReceipt:
    "Eine gelöschte Ausgabe wird ohne Beleg wiederhergestellt. Alte Belegbilder werden nicht wiederhergestellt.",
  expenseRestoreMissingPerson:
    "Diese Version verweist auf eine Person, die nicht mehr in der Gruppe ist. Bearbeite die Ausgabe stattdessen manuell.",
  expenseRestoreUnavailable:
    "Diese Ausgabe kann nicht wiederhergestellt werden. Lade die Seite neu und versuche es erneut.",
  expenseRestoreConflict:
    "Die Ausgabe wurde geändert. Prüfe vor einer erneuten Bestätigung den aktuellen Stand.",
  expenseRestoreConfirm: "Diese Version wiederherstellen",
  expenseRestored: "Ausgabenversion wiederhergestellt",
  expenseConflictParticipantsChanged:
    "Die Personen haben sich geändert. Bei der Bestätigung werden nicht mehr verfügbare Auswahlen zur zahlenden Person oder zur Aufteilung durch die Einstellungen der neuesten Ausgabe ersetzt. Andere Entwurfsfelder bleiben erhalten. Prüfe vor dem Speichern die aufgeteilten Beträge.",
  expenseVersionConflict:
    "Diese Ausgabe wurde geändert. Prüfe vor einer erneuten Bestätigung die neueste Version.",
  expenseVersionMissing:
    "Gib die Ausgabenversion an. Lade die Seite neu und versuche es erneut.",
  expenseVersionInvalid: "Ungültige Ausgabenversion",
  reviewLatestExpense: "Neueste Ausgabe prüfen",
  confirmLatestExpenseVersion:
    "Neueste Version geprüft; meinen Entwurf behalten und weiter bearbeiten",
  latestExpenseMissing:
    "Diese Ausgabe wurde gelöscht oder ist nicht mehr zugänglich. Dein Entwurf bleibt erhalten, kann aber nicht gespeichert werden.",
  deleteExpenseHistoryRetained:
    "Die Ausgabe wird aus dem aktuellen Ausgabenbuch entfernt und die Salden werden neu berechnet. Der Änderungsverlauf bleibt erhalten. Du kannst eine frühere Version ohne ihr altes Belegbild wiederherstellen.",
  expenseHistoryForName: (values: MessageValues) =>
    interpolate("Änderungsverlauf: {name}", values),
  usernameMustBe332LettersNumbersUnderscoresOrHyphens:
    "Der Benutzername muss aus 3–32 Buchstaben, Zahlen, Unterstrichen oder Bindestrichen bestehen",
  travelTogetherSplitExpensesEasily:
    "Gemeinsam reisen, Ausgaben einfach teilen",
  goodFriendsSplitExpensesWell: "Gute Freunde teilen Ausgaben fair.",
  skipToMainContent: "Zum Hauptinhalt springen",
  otterHome: "otter-Startseite",
  loading: "Wird geladen",
  unableToLoadOtter: "otter konnte nicht geladen werden",
  loadingFailed: "Laden fehlgeschlagen",
  reload: "Neu laden",
  signedIn: "Angemeldet",
  accountCreated: "Konto erstellt",
  unableToAuthenticate: "Authentifizierung nicht möglich",
  authenticationRequestsTooFrequentTryAgainLater:
    "Zu viele Authentifizierungsanfragen. Versuche es später erneut.",
  usernameUpdated: "Benutzername aktualisiert",
  signedOut: "Abgemeldet",
  signOutFailedMessage: (values: MessageValues) =>
    interpolate("Abmeldung fehlgeschlagen: {message}", values),
  pleaseTryAgainLater: "Bitte versuche es später erneut",
  signingOut: "Abmeldung läuft…",
  signOut: "Abmelden",
  authorizeCli: "CLI verbinden",
  authorizeCliDescription:
    "Gib den Gerätecode aus deinem Terminal ein, um dieser CLI Zugriff auf deine Otter-Daten zu erlauben.",
  deviceCode: "Gerätecode",
  checkDeviceCode: "Weiter",
  checkingDeviceCode: "Wird geprüft…",
  cliAccessRequest: "CLI-Zugriffsanfrage",
  cliAccessRequestedBy: "Angefragt von",
  approveCliAccess: "Zugriff erlauben",
  approvingCliAccess: "Zugriff wird erlaubt…",
  cliAccessApproved: "CLI verbunden",
  cliAccessApprovedDescription:
    "Du kannst diese Seite schließen und zum Terminal zurückkehren.",
  deviceCodeNotFoundOrExpired: "Gerätecode nicht gefunden oder abgelaufen",
  enterAValidDeviceCode: "Gib einen gültigen Gerätecode ein",
  youAreOfflineLoadedDataIsAvailableButEditingRequiresAConnection:
    "Du bist offline. Geladene Daten sind verfügbar, aber Änderungen erfordern eine Verbindung.",
  travelTogetherSplitWithEase: "Gemeinsam reisen, einfach teilen",
  spendYourTimeOnTheJourney: "Genieße deine Reise,",
  andLeaveTheSplittingToOtter: "und überlasse otter die Aufteilung.",
  fromDinnerToAFullTripRecordEverySharedExpenseAndKeepGroupFinancesSimpleAndClear:
    "Vom Abendessen bis zur ganzen Reise: Erfasse jede gemeinsame Ausgabe und halte die Gruppenfinanzen einfach und übersichtlich.",
  splitExampleAWeekendTripDinnerCostsTwd1800ForThreePeopleOrTwd600Each:
    "Aufteilungsbeispiel: Ein Abendessen auf einer Wochenendreise kostet 1.800 TWD für drei Personen, also 600 TWD pro Person.",
  weekendTrip: "Wochenendreise",
  splitExample: "Aufteilungsbeispiel",
  dinnerTogether: "Gemeinsames Abendessen",
  you: "Du",
  a: "A",
  y: "Y",
  splitEquallyAmong3: "Gleichmäßig auf 3 aufgeteilt",
  each: "pro Person",
  quicklyRecordSharedExpenses: "Gemeinsame Ausgaben schnell erfassen",
  seeWhoOwesAndWhoIsOwedAtAGlance:
    "Auf einen Blick sehen, wer zahlt und wer Geld erhält",
  settleUpWithClearSuggestions: "Mit klaren Vorschlägen ausgleichen",
  signIn: "Anmelden",
  createAccount: "Konto erstellen",
  welcomeBackContinueYourJourney: "Willkommen zurück. Setze deine Reise fort.",
  createYourFirstGroupAndStartSplittingWithEase:
    "Erstelle deine erste Gruppe und teile Ausgaben ganz einfach.",
  username: "Benutzername",
  enterAUsername: "Gib einen Benutzernamen ein",
  password: "Passwort",
  enterAPassword: "Gib ein Passwort ein",
  developmentCredentialsHaveBeenFilledIn:
    "Die Entwicklungszugangsdaten wurden eingetragen.",
  signingIn: "Anmeldung läuft…",
  or: "oder",
  signInWithAPasskey: "Mit Passkey anmelden",
  signingInWithAPasskey: "Anmeldung mit Passkey läuft…",
  unableToSignInWithAPasskey:
    "Anmeldung mit Passkey nicht möglich. Versuche es erneut oder verwende dein Passwort.",
  needAnAccount: "Noch kein Konto?",
  usernameIsNotCaseSensitive:
    "Beim Benutzernamen wird Groß- und Kleinschreibung nicht unterschieden.",
  passwordMustBeAtLeast8Characters:
    "Das Passwort muss mindestens 8 Zeichen lang sein",
  passwordMustBeAtLeast8Characters2:
    "Das Passwort muss mindestens 8 Zeichen lang sein.",
  creating: "Wird erstellt…",
  createAccountWithAPasskey: "Konto mit Passkey erstellen",
  creatingAccountWithAPasskey: "Konto mit Passkey wird erstellt…",
  unableToCreateAccountWithAPasskey:
    "Konto konnte nicht mit Passkey erstellt werden. Versuche es erneut.",
  alreadyHaveAnAccount: "Bereits ein Konto?",
  backToSignIn: "Zurück zur Anmeldung",
  expenseParticipantsDoNotNeedAccountsToBeIncludedInAGroup:
    "Teilnehmende an Ausgaben benötigen kein Konto, um einer Gruppe anzugehören.",
  changeNameSUsername: (values: MessageValues) =>
    interpolate("Benutzernamen von {name} ändern", values),
  nameSAccountMenu: (values: MessageValues) =>
    interpolate("Kontomenü von {name}", values),
  unableToUpdateUsername: "Benutzername konnte nicht aktualisiert werden",
  changeUsername: "Benutzernamen ändern",
  passkeyRegistrationRequestsTooFrequent:
    "Zu viele Passkey-Registrierungsanfragen. Versuche es später erneut.",
  passkeyRegistrationResponseIsInvalid:
    "Die Antwort zur Passkey-Registrierung ist ungültig",
  passkeyRegistrationRequestExpired:
    "Die Passkey-Registrierungsanfrage ist abgelaufen. Versuche es erneut.",
  unableToVerifyPasskey:
    "Passkey konnte nicht überprüft werden. Versuche es erneut.",
  passkeyAlreadyRegistered: "Dieser Passkey ist bereits registriert",
  passkeyNotFound: "Passkey nicht gefunden",
  cannotRemoveOnlyPasskey:
    "Du kannst deinen einzigen Passkey nicht entfernen, ohne den Kontozugriff zu verlieren",
  passkeyLoginResponseIsInvalid:
    "Die Antwort zur Passkey-Anmeldung ist ungültig",
  passkeyLoginRequestExpired:
    "Die Passkey-Anmeldeanfrage ist abgelaufen. Versuche es erneut.",
  unableToUsePasskeyToSignIn: "Anmeldung mit diesem Passkey nicht möglich",
  cancel: "Abbrechen",
  saving: "Wird gespeichert…",
  save: "Speichern",
  connectionFailedPleaseTryAgainLater:
    "Verbindung fehlgeschlagen. Bitte versuche es später erneut.",
  theServerReturnedAnInvalidResponse:
    "Der Server hat eine ungültige Antwort zurückgegeben.",
  everyone: "Alle",
  unknown: "Unbekannt",
  atLeastOneParticipantIsRequired:
    "Mindestens eine teilnehmende Person ist erforderlich",
  usedByAnExpense: "In einer Ausgabe verwendet",
  youAreOfflineReconnectAndTryAgain:
    "Du bist offline. Stelle die Verbindung wieder her und versuche es erneut.",
  working: "Wird verarbeitet…",
  unableToApplyChanges: "Änderungen konnten nicht angewendet werden",
  applying: "Wird angewendet…",
  noBalancesYet: "Noch keine Salden.",
  settled: "Ausgeglichen",
  getsBack: "Erhält zurück",
  owes: "Schuldet",
  newTaiwanDollar: "Neuer Taiwan-Dollar",
  japaneseYen: "Japanischer Yen",
  usDollar: "US-Dollar",
  euro: "Euro",
  singaporeDollar: "Singapur-Dollar",
  poundSterling: "Pfund Sterling",
  australianDollar: "Australischer Dollar",
  canadianDollar: "Kanadischer Dollar",
  southKoreanWon: "Südkoreanischer Won",
  food: "Essen",
  transport: "Verkehr",
  lodging: "Unterkunft",
  tickets: "Eintrittskarten",
  shopping: "Einkäufe",
  other: "Sonstiges",
  unsavedChangesWillBeLostDiscardTheDraft:
    "Nicht gespeicherte Änderungen gehen verloren. Entwurf verwerfen?",
  unableToSwitchGroups: "Gruppenwechsel nicht möglich",
  loadingGroup: "Gruppe wird geladen",
  yourSelectionWillAppearAfterItsDataLoads:
    "Deine Auswahl erscheint, sobald ihre Daten geladen sind.",
  unableToLoadGroup: "Gruppe konnte nicht geladen werden",
  groupSwitcher: "Gruppenauswahl",
  groups: "Gruppen",
  countActiveGroups: (values: MessageValues) =>
    interpolate(
      pluralForm("de", values.count, {
        one: "{count} aktive Gruppe",
        other: "{count} aktive Gruppen",
      }),
      values,
    ),
  everyTripAddsUpToSomethingWonderful:
    "Jede Reise schafft wunderbare Erinnerungen.",
  recordSharedExpensesAndFocusOnThePeopleBesideYou:
    "Erfasse gemeinsame Ausgaben und konzentriere dich auf die Menschen an deiner Seite.",
  archivedAndReadOnlyDataIsPreservedTheOwnerCanRestoreItUnderMore:
    "Archiviert und schreibgeschützt. Die Daten bleiben erhalten. Der Eigentümer kann die Gruppe in den Gruppeneinstellungen wiederherstellen.",
  addTravelCompanionsFirst: "Füge zuerst Reisebegleitungen hinzu",
  thereIsOnlyOneParticipantAddSomeoneToSplitWithBeforeRecordingTheFirstExpense:
    "Es gibt nur eine teilnehmende Person. Füge vor der ersten Ausgabe jemanden zum Teilen hinzu.",
  addExpenseParticipant: "Teilnehmende Person für Ausgaben hinzufügen",
  switchGroups: "Gruppe wechseln",
  youWillLeaveTheCurrentGroupOnlyAfterTheNewOneLoads:
    "Du verlässt die aktuelle Gruppe erst, wenn die neue geladen ist.",
  participantsPeopleExpensesExpensesCurrency: (values: MessageValues) =>
    interpolate(
      "Personen: {participants} · Ausgaben: {expenses} · {currency}",
      values,
    ),
  archived: "Archiviert",
  everydayMomentsTogether: "Alltägliche Momente gemeinsam erleben",
  collaborator: "Mitbearbeiter",
  owner: "Eigentümer",
  baseCurrencyCurrency: (values: MessageValues) =>
    interpolate("Basiswährung {currency}", values),
  usingCustomExchangeRates: "Benutzerdefinierte Wechselkurse werden verwendet",
  usingBankOfTaiwanExchangeRates:
    "Standardkurse der Bank of Taiwan werden verwendet",
  usingFixedFallbackRates:
    "Bank of Taiwan nicht verfügbar; feste Ersatzkurse werden verwendet",
  loadingGroup2: "Gruppe wird geladen…",
  people: "Personen",
  expenses: "Ausgaben",
  base: "Basis",
  overview: "Übersicht",
  more: "Mehr",
  groupWorkspace: "Gruppenarbeitsbereich",
  addExpense: "Ausgabe hinzufügen",
  archivedGroups: "Archivierte Gruppen",
  unableToCreateGroup: "Gruppe konnte nicht erstellt werden",
  createGroup: "Gruppe erstellen",
  addCompanionsAfterCreatingTheGroupThenRecordSharedExpenses:
    "Füge nach dem Erstellen der Gruppe Begleitungen hinzu und erfasse dann gemeinsame Ausgaben.",
  groupName: "Gruppenname",
  fiveDaysInTokyo: "Fünf Tage in Tokyo",
  baseCurrency: "Basiswährung",
  createYourFirstGroup: "Erstelle deine erste Gruppe",
  addATripOrEventGroupOrCreateOneFromAnExistingJsonBackup:
    "Füge eine Reise- oder Veranstaltungsgruppe hinzu oder erstelle eine aus einer vorhandenen JSON-Sicherung.",
  groupExpenseSummary: "Ausgabenübersicht der Gruppe",
  totalSharedExpenses: "Gemeinsame Ausgaben gesamt",
  convertedToBaseCurrency: "In die Basiswährung umgerechnet",
  outstanding: "Offen",
  countSuggestedPaymentsToSettleUp: (values: MessageValues) =>
    interpolate(
      pluralForm("de", values.count, {
        one: "{count} vorgeschlagene Ausgleichszahlung",
        other: "{count} vorgeschlagene Ausgleichszahlungen",
      }),
      values,
    ),
  nothingIsCurrentlyOutstanding: "Derzeit ist nichts offen",
  settlementSuggestionsAppearAfterExpensesAreAdded:
    "Ausgleichsvorschläge erscheinen nach dem Hinzufügen von Ausgaben",
  expenseRecords: "Ausgabeneinträge",
  sharedAmongCountPeople: (values: MessageValues) =>
    interpolate(
      pluralForm("de", values.count, {
        one: "Auf {count} Person aufgeteilt",
        other: "Auf {count} Personen aufgeteilt",
      }),
      values,
    ),
  calculatedFromCurrentExpensesAndRecordedPayments:
    "Aus aktuellen Ausgaben und erfassten Zahlungen berechnet.",
  settleUp: "Ausgleichen",
  countEntries: (values: MessageValues) =>
    interpolate(
      pluralForm("de", values.count, {
        one: "{count} Eintrag",
        other: "{count} Einträge",
      }),
      values,
    ),
  entries: "Einträge",
  seePaymentsAndSharesAtAGlance: "Zahlungen und Anteile auf einen Blick sehen.",
  balances: "Salden",
  recentExpenses: "Letzte Ausgaben",
  noExpensesYet: "Noch keine Ausgaben",
  thisGroupHasNotRecordedAnySharedExpenses:
    "Diese Gruppe hat noch keine gemeinsamen Ausgaben erfasst.",
  recordTheFirstSharedExpense: "Erste gemeinsame Ausgabe erfassen",
  addThePeopleSplittingExpensesToCalculateEachBalance:
    "Füge zuerst die Personen hinzu, die Ausgaben teilen, und erfasse dann die erste Ausgabe. Salden und Ausgleichsvorschläge erscheinen automatisch.",
  balancesAndSettlementSuggestionsWillAppearHereAfterYouAddExpenses:
    "Salden und Ausgleichsvorschläge erscheinen hier, sobald du Ausgaben hinzufügst.",
  addPerson: "Person hinzufügen",
  managePeople: "Personen verwalten",
  everythingIsSettled: "Alles ist ausgeglichen",
  thereAreNoOutstandingPayments: "Es gibt keine offenen Zahlungen.",
  paymentRecorded: "Zahlung erfasst",
  unableToRecordPayment: "Zahlung konnte nicht erfasst werden",
  recordPayment: "Zahlung erfassen",
  recordSettlementPayment: "Ausgleichszahlung erfassen",
  fromPaysToTheFullSuggestedAmountIsPrefilled: (values: MessageValues) =>
    interpolate(
      "{from} zahlt an {to}; der volle vorgeschlagene Betrag ist vorausgefüllt.",
      values,
    ),
  paymentAmountCurrency: (values: MessageValues) =>
    interpolate("Zahlungsbetrag ({currency})", values),
  enterAPaymentAmount: "Gib einen Zahlungsbetrag ein",
  thePaymentMustBeGreaterThan0AndNoMoreThanTheSuggestedAmount:
    "Die Zahlung muss größer als 0 sein und darf den vorgeschlagenen Betrag nicht überschreiten",
  expectedRemainder: "Voraussichtlicher Restbetrag: ",
  paymentDate: "Zahlungsdatum",
  noteOptional: "Notiz (optional)",
  recordPayment2: "Zahlung erfassen",
  paymentHistory: "Zahlungsverlauf",
  dateFromPaidTo: (values: MessageValues) =>
    interpolate("{date} · {from} hat an {to} gezahlt", values),
  deletePayment: "Zahlung löschen",
  remainingSettlementSuggestionsWillBeRecalculated:
    "Verbleibende Ausgleichsvorschläge werden neu berechnet.",
  paymentDeleted: "Zahlung gelöscht",
  deleteFailed: "Löschen fehlgeschlagen",
  deleteThisPayment: "Diese Zahlung löschen?",
  delete: "Löschen",
  datePaidByNameSplitWithSplit: (values: MessageValues) =>
    interpolate("{date} · bezahlt von {name} · geteilt mit {split}", values),
  dailySpending: "Tägliche Ausgaben",
  paidByPerson: "Bezahlt nach Person",
  byCategory: "Nach Kategorie",
  spendingAnalysis: "Ausgabenanalyse",
  totalAmount: (values: MessageValues) =>
    interpolate("Gesamt {amount}", values),
  noDataYet: "Noch keine Daten.",
} satisfies CatalogShape<typeof zhTW>;
