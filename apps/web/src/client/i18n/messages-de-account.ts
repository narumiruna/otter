import {
  interpolate,
  type MessageValues,
  pluralForm,
} from "./message-types.js";

export const deAccount = {
  browserExpenseDefaults: "Ausgabenvorgaben in diesem Browser",
  browserExpenseDefaultsHelp:
    "Löscht nur die Währungs- und Aufteilungsvorgaben dieses Kontos für diese Gruppe. Konten, Anmeldung und Berechtigungen bleiben unverändert.",
  clearPersonalPreferences: "Ausgabenvorgaben für diese Gruppe löschen",
  expenseDefaultsCleared: "Ausgabenvorgaben für diese Gruppe gelöscht.",
  personalPreferencesChanged:
    "Deine Aufteilungseinstellungen sind nicht mehr verfügbar. Gültige Vorgaben werden verwendet. Wähle die Einstellungen erneut aus.",
  personalStorageFailed:
    "Die Ausgabenvorgaben konnten nicht gespeichert werden. Die aktuellen Einstellungen bleiben verfügbar, können beim erneuten Öffnen der Seite aber verloren gehen.",
  rememberExpenseDefaults: "Währung und Aufteilungseinstellungen merken",
  expenseDefaultsRemembered:
    "Währung und Aufteilungseinstellungen für diese Gruppe gespeichert.",
  deleteExpense: "Ausgabe löschen",
  copyExpense: "Als neue Ausgabe kopieren",
  copyExpenseNamed: (values: MessageValues) =>
    interpolate("{name} als neue Ausgabe kopieren", values),
  memberAccounts: "Mitgliederkonten",
  accountPaid: "Bezahlt",
  accountShared: "Anteil",
  accountBalance: "Zu erhalten / zu zahlen",
  accountReceivable: "Zu erhalten",
  accountPayable: "Zu zahlen",
  accountSettled: "Ausgeglichen",
  accountPaidHelp:
    "Bezahlt ist der an Geschäfte und andere Anbieter gezahlte Betrag. Ausgleichszahlungen zwischen Mitgliedern sind nicht enthalten.",
  accountTotalsHelp:
    "Der Anteil ist der Ausgabenbetrag, den jedes Mitglied schuldet. Salden enthalten auch erfasste Zahlungen und Anpassungen durch Vertretungen. Nicht synchronisierte Entwürfe sind ausgeschlossen.",
  accountDetails: "Details ansehen",
  accountPaidExpenses: "Für die Gruppe bezahlte Ausgaben",
  accountSharedExpenses: "Gemeinsame Ausgaben",
  accountExpenseTotal: "Gesamtbetrag der Ausgabe",
  accountPayments: "Gesendete / erhaltene Zahlungen",
  accountPaymentSent: "Gesendet",
  accountPaymentReceived: "Erhalten",
  accountAdjustments: "Anpassungen durch Vertretungen",
  accountDetailsUnavailable:
    "Zahlungsdetails sind in dieser Freigabe nicht enthalten. Die Salden verwenden die Berechnungsergebnisse der Gruppe.",
  accountRepresentedBy: (values: MessageValues) =>
    interpolate(
      "{name} übernimmt den Ausgleich für dieses Mitglied. Ein Saldo von null bedeutet nicht, dass dieses Mitglied eine Zahlung geleistet hat.",
      values,
    ),
  visaSettlementTitle: "Ausgleich mit Visa-Kursen",
  visaSettlementCurrency: "Ausgleichswährung",
  visaSettlementEnable:
    "Alle Ausgaben mit datierten Visa-Kursen umrechnen und in der gewählten Währung ausgleichen",
  visaSettlementHelp:
    "Standardmäßig deaktiviert. Ursprüngliche Beträge bleiben unverändert. Bei Aktivierung wird für jedes Ausgabedatum ein Visa-Kurs gespeichert. Salden und Ausgleichszahlungen verwenden die gewählte Währung. Gilt für alle Ausgaben, auch Barzahlungen, ohne Bankgebühren. Visa-Kurse sind Schätzwerte; Kartenabrechnungen können abweichen. Vor der Aktivierung oder einem Währungswechsel müssen vorhandene Zahlungen die gewählte Währung verwenden.",
  visaSettlementSaved: "Visa-Ausgleichseinstellung gespeichert",
  visaSettlementOn: (values: MessageValues) =>
    interpolate("Aktiviert · {currency}", values),
  visaSettlementOff: "Deaktiviert",
  visaRateLabel: "Visa",
  visaSettingInvalid: "Ungültige Visa-Ausgleichseinstellung",
  visaIncompatiblePayments:
    "Vorhandene Zahlungseinträge müssen die gewählte Ausgleichswährung verwenden",
  visaSettingUnavailable:
    "Visa-Kurse sind nicht verfügbar. Die Einstellung wurde nicht geändert. Versuche es später erneut.",
  visaPaymentCurrency:
    "Visa-Ausgleichszahlungen müssen die gewählte Währung verwenden",
  visaRateUnavailable: (values: MessageValues) =>
    interpolate(
      "Der Visa-Kurs {currency}/{target} für {date} ist nicht verfügbar. Versuche es später erneut.",
      values,
    ),
  offlineQueueBanner:
    "Offline: Geladene Daten bleiben verfügbar. Neue Ausgaben können auf diesem Gerät gespeichert werden. Andere Änderungen erfordern eine Verbindung.",
  queueSave: "Auf diesem Gerät speichern",
  queueSaved:
    "Auf diesem Gerät gespeichert. Noch nicht in den Salden enthalten; Wechselkurse werden bei der Synchronisierung festgelegt.",
  queueStorageError:
    "Speichern auf diesem Gerät nicht möglich. Lass diese Seite geöffnet und versuche es erneut.",
  queueTitle: "Nicht synchronisierte Ausgaben",
  queueNotice:
    "Nur auf diesem Gerät. Nicht in den Salden enthalten. Wechselkurse werden bei der Synchronisierung festgelegt. Beim Löschen der Browserdaten gehen diese Entwürfe verloren.",
  queuePending: "Wartet auf Synchronisierung",
  queueAttempted:
    "Synchronisierung wartet auf Bestätigung; ursprüngliche Anfrage unverändert lassen",
  queueConflict:
    "Synchronisierung angehalten. Prüfe vor einem erneuten Versuch den Zugriff und die Teilnehmenden. Die ursprüngliche Anfrage bleibt erhalten.",
  queueInvalid: "Nicht erfasst. Bearbeite den Entwurf und versuche es erneut.",
  queueEdit: "Entwurf bearbeiten",
  queueRetry: "Ursprüngliche Anfrage erneut senden",
  queueDelete: "Lokalen Entwurf löschen",
  queueDeleteConfirm:
    "Diesen lokalen Entwurf löschen? Eine bereits gesendete Anfrage könnte auf dem Server erfasst worden sein. Prüfe zuerst die Gruppe.",
  queueCount: (values: MessageValues) =>
    interpolate(
      pluralForm("de", values.count, {
        one: "{count} nicht synchronisierte Ausgabe auf diesem Gerät",
        other: "{count} nicht synchronisierte Ausgaben auf diesem Gerät",
      }),
      values,
    ),
  queueSyncPricing:
    "Die Vorschau zeigt nur die ursprüngliche Währung. Der Server legt den Wechselkurs bei der Synchronisierung fest.",
  queueOrphanTitle: "Entwürfe aus nicht verfügbaren Gruppen",
  queueOrphanNotice:
    "Diese Gruppen sind nicht mehr zugänglich. Eine gesendete Anfrage könnte erfasst worden sein. Prüfe dies, bevor du ihre lokale Kopie löschst.",
  queueOrphanTrip: (values: MessageValues) =>
    interpolate("Gruppen-ID: {id}", values),
  accountSettings: "Kontoeinstellungen",
  manageYourUsernameAndPasskeys:
    "Verwalte Darstellung, Sprache, Benutzername, Passkeys und API-Tokens.",
  appearance: "Darstellung",
  chooseHowOtterLooksOnThisBrowser:
    "Wähle das Aussehen von Otter. Änderungen werden sofort angewendet und in diesem Browser gespeichert.",
  colorTheme: "Farbthema",
  forestTheme: "Wald",
  oceanTheme: "Ozean",
  lavenderTheme: "Lavendel",
  sunsetTheme: "Sonnenuntergang",
  roseTheme: "Rose",
  displayMode: "Anzeigemodus",
  systemMode: "System",
  lightMode: "Hell",
  darkMode: "Dunkel",
  useTheNewUsernameTheNextTimeYouSignInYourCurrentSessionWillContinue:
    "Verwende bei der nächsten Anmeldung den neuen Benutzernamen. Deine aktuelle Sitzung bleibt bestehen.",
  passkeys: "Passkeys",
  useAPasskeyToSignInWithoutYourPassword:
    "Melde dich durch Entsperren deines Geräts an, ohne dein Passwort einzugeben.",
  unableToLoadPasskeys: "Passkeys konnten nicht geladen werden",
  unableToAddPasskey:
    "Passkey konnte nicht hinzugefügt werden. Falls du abgebrochen hast, versuche es erneut.",
  unableToRemovePasskey: "Passkey konnte nicht entfernt werden",
  passkeyAdded: "Passkey hinzugefügt",
  passkeyRemoved: "Passkey entfernt",
  passkeyNumber: (values: MessageValues) =>
    interpolate("Passkey {number}", values),
  addedOnDate: (values: MessageValues) =>
    interpolate("Hinzugefügt am {date}", values),
  removePasskeyNumber: (values: MessageValues) =>
    interpolate("Passkey {number} entfernen", values),
  noPasskeysAdded: "Noch keine Passkeys hinzugefügt.",
  addingPasskey: "Passkey wird hinzugefügt…",
  addPasskey: "Passkey hinzufügen",
  thisBrowserDoesNotSupportPasskeys:
    "Dieser Browser unterstützt keine Passkeys.",
  apiTokens: "API-Tokens",
  useApiTokensWithTheOtterCli:
    "Erstelle Bearer-Tokens für die Otter-CLI oder Automatisierungswerkzeuge.",
  loadingApiTokens: "API-Tokens werden geladen…",
  unableToLoadApiTokens: "API-Tokens konnten nicht geladen werden",
  unableToCreateApiToken: "API-Token konnte nicht erstellt werden",
  apiTokenCreationUncertain:
    "Das Ergebnis der Token-Anfrage ist unbekannt. Wiederhole diese Anfrage, bevor du eine weitere erstellst.",
  retryApiTokenCreation: "Token-Erstellung erneut versuchen",
  unableToRevokeApiToken: "API-Token konnte nicht widerrufen werden",
  unableToCopyApiToken: "API-Token konnte nicht kopiert werden",
  apiTokenRevoked: "API-Token widerrufen",
  apiTokenCopied: "API-Token kopiert",
  enterATokenName: "Gib einen Token-Namen ein",
  newApiToken: "Neues API-Token",
  copyYourApiTokenNow: "Kopiere dein API-Token jetzt",
  apiTokenShownOnce:
    "Dieses Token wird nur einmal angezeigt. Nach dem Verlassen kannst du es nicht erneut ansehen.",
  copyToken: "Token kopieren",
  done: "Fertig",
  tokenName: "Token-Name",
  tokenNameExample: "Zum Beispiel: Reiseautomatisierung",
  creatingApiToken: "Token wird erstellt…",
  createApiToken: "API-Token erstellen",
  apiTokenDates: (values: MessageValues) =>
    interpolate("Erstellt am {created} · Läuft ab am {expires}", values),
  revokeNamedApiToken: (values: MessageValues) =>
    interpolate("API-Token „{name}“ widerrufen", values),
  noActiveApiTokens: "Keine aktiven API-Tokens.",
  apiTokensExpireAfter90Days:
    "Tokens laufen nach 90 Tagen ab. Für die Verwendung mit der CLI lege das Token fest als",
  welcomeBackEyebrow: "WILLKOMMEN ZURÜCK",
  startNewJourneyEyebrow: "STARTE EINE NEUE REISE",
  parchmentTheme: "Pergament",
};
