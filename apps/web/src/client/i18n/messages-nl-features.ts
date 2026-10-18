import {
  interpolate,
  type MessageValues,
  pluralForm,
} from "./message-types.js";

export const nlFeatures = {
  browserExpenseDefaults: "Standaardinstellingen voor uitgaven in deze browser",
  browserExpenseDefaultsHelp:
    "Wis alleen de standaardvaluta en verdeelinstellingen van dit account voor deze groep. Accounts, aanmelding en rechten veranderen niet.",
  clearPersonalPreferences:
    "Standaardinstellingen voor uitgaven in deze groep wissen",
  expenseDefaultsCleared:
    "Standaardinstellingen voor uitgaven in deze groep gewist.",
  personalPreferencesChanged:
    "Je verdeelinstellingen zijn niet meer beschikbaar. Geldige standaardinstellingen zijn nu in gebruik; selecteer opnieuw.",
  personalStorageFailed:
    "De standaardinstellingen voor uitgaven konden niet worden opgeslagen. De huidige instellingen blijven beschikbaar, maar kunnen verloren gaan als je de pagina opnieuw opent.",
  rememberExpenseDefaults: "Valuta en verdeelinstellingen onthouden",
  expenseDefaultsRemembered:
    "Valuta en verdeelinstellingen voor deze groep opgeslagen.",
  deleteExpense: "Uitgave verwijderen",
  copyExpense: "Kopiëren als nieuwe uitgave",
  copyExpenseNamed: (values: MessageValues) =>
    interpolate("{name} kopiëren als nieuwe uitgave", values),
  memberAccounts: "Overzicht per lid",
  accountPaid: "Betaald",
  accountShared: "Aandeel",
  accountBalance: "Te ontvangen / betalen",
  accountReceivable: "Te ontvangen",
  accountPayable: "Te betalen",
  accountSettled: "Verrekend",
  accountPaidHelp:
    "Betaald is het bedrag dat aan winkels en andere leveranciers is betaald. Verrekenbetalingen tussen leden tellen niet mee.",
  accountTotalsHelp:
    "Aandeel is het uitgavenbedrag dat elk lid moet dragen. Saldi bevatten ook vastgelegde betalingen en correcties voor vertegenwoordigers. Niet-gesynchroniseerde concepten tellen niet mee.",
  accountDetails: "Details bekijken",
  accountPaidExpenses: "Uitgaven betaald voor de groep",
  accountSharedExpenses: "Gedeelde uitgaven",
  accountExpenseTotal: "Volledig uitgavenbedrag",
  accountPayments: "Verzonden / ontvangen betalingen",
  accountPaymentSent: "Verzonden",
  accountPaymentReceived: "Ontvangen",
  accountAdjustments: "Correcties voor vertegenwoordigers",
  accountDetailsUnavailable:
    "Betalingsdetails zijn niet opgenomen in deze gedeelde weergave. Saldi gebruiken de berekende groepsresultaten.",
  accountRepresentedBy: (values: MessageValues) =>
    interpolate(
      "{name} verrekent namens dit lid. Een saldo van nul betekent niet dat dit lid een betaling heeft gedaan.",
      values,
    ),
  visaSettlementTitle: "Verrekenen met Visa-koersen",
  visaSettlementCurrency: "Verrekenvaluta",
  visaSettlementEnable:
    "Alle uitgaven omrekenen met Visa-koersen van de uitgavendatum en verrekenen in de gekozen valuta",
  visaSettlementHelp:
    "Standaard uitgeschakeld. Oorspronkelijke bedragen blijven ongewijzigd. Bij inschakelen wordt voor elke uitgavendatum een Visa-koers opgeslagen en wordt de gekozen valuta gebruikt voor saldi en verrekeningen. Geldt voor alle uitgaven, ook contante, zonder bankkosten. Visa-koersen zijn schattingen; kaartafschriften kunnen afwijken. Bestaande betalingen moeten de gekozen valuta gebruiken voordat je dit inschakelt of van valuta verandert.",
  visaSettlementSaved: "Instelling voor verrekenen met Visa opgeslagen",
  visaSettlementOn: (values: MessageValues) =>
    interpolate("Aan · {currency}", values),
  visaSettlementOff: "Uit",
  visaRateLabel: "Visa",
  visaSettingInvalid: "Ongeldige instelling voor verrekenen met Visa",
  visaIncompatiblePayments:
    "Bestaande betalingsgegevens moeten de gekozen verrekenvaluta gebruiken",
  visaSettingUnavailable:
    "Visa-koersen zijn niet beschikbaar. De instelling is niet gewijzigd. Probeer het later opnieuw.",
  visaPaymentCurrency:
    "Verrekenbetalingen met Visa moeten de gekozen valuta gebruiken",
  visaRateUnavailable: (values: MessageValues) =>
    interpolate(
      "De Visa-koers {currency}/{target} voor {date} is niet beschikbaar. Probeer het later opnieuw.",
      values,
    ),
  offlineQueueBanner:
    "Offline: geladen gegevens blijven beschikbaar. Nieuwe uitgaven kun je op dit apparaat opslaan; andere wijzigingen vereisen een verbinding.",
  queueSave: "Op dit apparaat opslaan",
  queueSaved:
    "Op dit apparaat opgeslagen. Telt nog niet mee in saldi; wisselkoersen worden bij synchronisatie bepaald.",
  queueStorageError:
    "Opslaan op dit apparaat is mislukt. Houd deze pagina open en probeer het opnieuw.",
  queueTitle: "Niet-gesynchroniseerde uitgaven",
  queueNotice:
    "Alleen op dit apparaat. Tellen niet mee in saldi. Wisselkoersen worden bij synchronisatie bepaald. Als je browsergegevens wist, gaan deze concepten verloren.",
  queuePending: "Wachten op synchronisatie",
  queueAttempted:
    "Synchronisatie wacht op bevestiging; laat het oorspronkelijke verzoek ongewijzigd",
  queueConflict:
    "Synchronisatie gestopt. Controleer toegang en deelnemers voordat je het opnieuw probeert; het oorspronkelijke verzoek blijft bewaard.",
  queueInvalid: "Niet vastgelegd. Bewerk het concept en probeer het opnieuw.",
  queueEdit: "Concept bewerken",
  queueRetry: "Oorspronkelijk verzoek opnieuw proberen",
  queueDelete: "Lokaal concept verwijderen",
  queueDeleteConfirm:
    "Dit lokale concept verwijderen? Een al verzonden verzoek kan toch op de server zijn vastgelegd. Controleer eerst de groep.",
  queueCount: (values: MessageValues) =>
    interpolate(
      pluralForm("nl", values.count, {
        one: "{count} niet-gesynchroniseerde uitgave op dit apparaat",
        other: "{count} niet-gesynchroniseerde uitgaven op dit apparaat",
      }),
      values,
    ),
  queueSyncPricing:
    "Het voorbeeld toont alleen de oorspronkelijke valuta. De server bepaalt de wisselkoers bij synchronisatie.",
  queueOrphanTitle: "Concepten van niet-beschikbare groepen",
  queueOrphanNotice:
    "Deze groepen zijn niet meer toegankelijk. Een verzonden verzoek kan al zijn vastgelegd; controleer dit voordat je de lokale kopie verwijdert.",
  queueOrphanTrip: (values: MessageValues) =>
    interpolate("Groeps-ID: {id}", values),
  accountSettings: "Accountinstellingen",
  manageYourUsernameAndPasskeys:
    "Beheer je weergave, taal, gebruikersnaam, Passkeys en API-tokens.",
  appearance: "Weergave",
  chooseHowOtterLooksOnThisBrowser:
    "Kies hoe Otter eruitziet. Wijzigingen worden direct toegepast en in deze browser opgeslagen.",
  colorTheme: "Kleurthema",
  forestTheme: "Bos",
  oceanTheme: "Oceaan",
  lavenderTheme: "Lavendel",
  sunsetTheme: "Zonsondergang",
  roseTheme: "Roos",
  displayMode: "Weergavemodus",
  systemMode: "Systeem",
  lightMode: "Licht",
  darkMode: "Donker",
  useTheNewUsernameTheNextTimeYouSignInYourCurrentSessionWillContinue:
    "Gebruik de nieuwe gebruikersnaam wanneer je je de volgende keer aanmeldt. Je huidige sessie blijft actief.",
  passkeys: "Passkeys",
  useAPasskeyToSignInWithoutYourPassword:
    "Gebruik de ontgrendeling van je apparaat om je zonder wachtwoord aan te melden.",
  unableToLoadPasskeys: "Passkeys laden is mislukt",
  unableToAddPasskey:
    "Passkey toevoegen is mislukt. Probeer het opnieuw als je hebt geannuleerd.",
  unableToRemovePasskey: "Passkey verwijderen is mislukt",
  passkeyAdded: "Passkey toegevoegd",
  passkeyRemoved: "Passkey verwijderd",
  passkeyNumber: (values: MessageValues) =>
    interpolate("Passkey {number}", values),
  addedOnDate: (values: MessageValues) =>
    interpolate("Toegevoegd op {date}", values),
  removePasskeyNumber: (values: MessageValues) =>
    interpolate("Passkey {number} verwijderen", values),
  noPasskeysAdded: "Nog geen Passkeys toegevoegd.",
  addingPasskey: "Passkey toevoegen…",
  addPasskey: "Passkey toevoegen",
  thisBrowserDoesNotSupportPasskeys: "Deze browser ondersteunt geen Passkeys.",
  apiTokens: "API-tokens",
  useApiTokensWithTheOtterCli:
    "Maak Bearer-tokens voor de Otter CLI of automatiseringstools.",
  loadingApiTokens: "API-tokens laden…",
  unableToLoadApiTokens: "API-tokens laden is mislukt",
  unableToCreateApiToken: "API-token aanmaken is mislukt",
  apiTokenCreationUncertain:
    "Het resultaat van het tokenverzoek is onbekend. Probeer dit verzoek opnieuw voordat je een ander token aanmaakt.",
  retryApiTokenCreation: "Token opnieuw aanmaken",
  unableToRevokeApiToken: "API-token intrekken is mislukt",
  unableToCopyApiToken: "API-token kopiëren is mislukt",
  apiTokenRevoked: "API-token ingetrokken",
  apiTokenCopied: "API-token gekopieerd",
  enterATokenName: "Voer een tokennaam in",
  newApiToken: "Nieuw API-token",
  copyYourApiTokenNow: "Kopieer je API-token nu",
  apiTokenShownOnce:
    "Dit token wordt maar één keer getoond. Na het verlaten van deze pagina kun je het niet opnieuw bekijken.",
  copyToken: "Token kopiëren",
  done: "Klaar",
  tokenName: "Tokennaam",
  tokenNameExample: "Bijvoorbeeld: Reisautomatisering",
  creatingApiToken: "Token aanmaken…",
  createApiToken: "API-token aanmaken",
  apiTokenDates: (values: MessageValues) =>
    interpolate("Aangemaakt {created} · Verloopt {expires}", values),
  revokeNamedApiToken: (values: MessageValues) =>
    interpolate('API-token "{name}" intrekken', values),
  noActiveApiTokens: "Geen actieve API-tokens.",
  apiTokensExpireAfter90Days:
    "Tokens verlopen na 90 dagen. Voor gebruik met de CLI stel je het in als",
  welcomeBackEyebrow: "WELKOM TERUG",
  startNewJourneyEyebrow: "BEGIN EEN NIEUWE REIS",
  parchmentTheme: "Perkament",
  expenseTotalLabel: "Totaal",
  expenseSplitSection: "Verdelen over personen",
  expenseSplitHelp:
    "Selecteer wie deze uitgave deelt, kies een methode en bekijk het resultaat.",
  expenseTagPlaceholder: "Label toevoegen…",
  addShort: "Toevoegen",
  settingsShort: "Instellingen",
  close: "Sluiten",
  groupDetails: "Groepsdetails",
  filters: "Filters",
  viewAll: "Alles bekijken",
  personLabel: "Persoon",
  preferencesLabel: "Voorkeuren",
  profileLabel: "Profiel",
  securityLabel: "Beveiliging",
  backToGroups: "Terug naar groepen",
  createdLabel: "Aangemaakt",
  statusLabel: "Status",
  peopleDeletionHelp:
    "Personen die in het grootboek worden gebruikt, kun je niet verwijderen. Controleer individuele beperkingen met de informatieknop of voeg dubbele personen samen.",
  personRestriction: (values: MessageValues) =>
    interpolate("Verwijderbeperkingen voor {name}", values),
  representsPeople: (values: MessageValues) =>
    interpolate("Vertegenwoordigt {names}", values),
  expenseRateForName: (values: MessageValues) =>
    interpolate("Bedrag en wisselkoers voor {name} bekijken", values),
  rateUnavailable: "Koers niet beschikbaar (oudere gegevens)",
  expenseHistory: "Wijzigingsgeschiedenis",
  expenseHistoryDescription:
    "Bewerkingen, verwijderingen en herstelacties van uitgaven; geen betalingsgeschiedenis of historische saldi.",
  expenseHistoryEmpty: "Geen wijzigingen vastgelegd",
  expenseHistoryMore: "Meer wijzigingen laden",
  expenseHistoryCreated: "Aangemaakt",
  expenseHistoryUpdated: "Bijgewerkt",
  expenseHistoryDeleted: "Verwijderd",
  expenseHistoryRestored: "Hersteld",
  expenseHistoryBaseline: "Beginsituatie",
  expenseHistorySystem: "Systeem",
  expenseHistoryBaselineNotice:
    "Situatie bij het inschakelen van de geschiedenis; eerdere wijzigingen en de oorspronkelijke auteur zijn onbekend.",
  expenseHistoryReceiptNotice:
    "Alleen metadata van bonnen blijft bewaard. Eerdere afbeeldingen zijn niet beschikbaar.",
  expenseHistoryShares: "Verdeelde bedragen",
  expenseHistoryRate: "Vastgelegde wisselkoers",
  expenseHistoryRateBank: "Bank of Taiwan",
  expenseHistoryRateCustom: "Aangepast voor de groep",
  expenseHistoryRateFixed: "Ingebouwde vaste koers",
  expenseHistoryRateLegacy: "Oude schatting",
  expenseHistoryRateTimeUnavailable: "Koerstijdstip niet beschikbaar",
  expenseHistoryRateUnavailable: "Oude versie: geen koers vastgelegd",
  expenseHistoryBefore: "Voor",
  expenseHistoryAfter: "Na",
  expenseHistorySourceExpense: "Uitgavenactie",
  expenseHistorySourceCsv: "CSV-import",
  expenseHistorySourceRestore: "Back-upherstel",
  expenseHistorySourceMerge: "Samenvoeging van deelnemers",
  expenseHistorySourceReceipt: "Bonactie",
  expenseHistorySourceSeed: "Ontwikkeltestgegevens",
  expenseHistorySourceMigration: "Migratie",
  expenseHistorySourceVersionRestore: "Versieherstel",
  expenseRestoreVersion: (values: MessageValues) =>
    interpolate("v{version} herstellen", values),
  expenseRestoreTitle: "Uitgavenversie herstellen",
  expenseRestoreDescription:
    "Controleer de huidige uitgave en de te herstellen versie. Herstellen voegt een nieuwe versie toe; latere geschiedenis blijft beschikbaar.",
  expenseRestoreKeepsReceipt:
    "De huidige bon blijft gekoppeld. Oude bonafbeeldingen worden niet hersteld.",
  expenseRestoreNoReceipt:
    "Een verwijderde uitgave komt terug zonder bon. Oude bonafbeeldingen worden niet hersteld.",
  expenseRestoreMissingPerson:
    "Deze versie verwijst naar iemand die niet meer in de groep zit. Bewerk de uitgave in plaats daarvan handmatig.",
  expenseRestoreUnavailable:
    "Deze uitgave kan niet worden hersteld. Laad opnieuw en probeer het nogmaals.",
  expenseRestoreConflict:
    "De uitgave is gewijzigd. Controleer de nieuwste situatie voordat je opnieuw bevestigt.",
  expenseRestoreConfirm: "Deze versie herstellen",
  expenseRestored: "Uitgavenversie hersteld",
  expenseConflictParticipantsChanged:
    "De personen zijn gewijzigd. Bij bevestiging worden niet-beschikbare keuzes voor betaler of verdeling vervangen door de instellingen van de nieuwste uitgave. Andere conceptvelden blijven bewaard; controleer de verdeelde bedragen voordat je opslaat.",
  expenseVersionConflict:
    "Deze uitgave is gewijzigd. Controleer de nieuwste versie voordat je opnieuw bevestigt.",
  expenseVersionMissing:
    "Geef de uitgavenversie op. Laad opnieuw en probeer het nogmaals.",
  expenseVersionInvalid: "Ongeldige uitgavenversie",
  reviewLatestExpense: "Nieuwste uitgave controleren",
  confirmLatestExpenseVersion:
    "Nieuwste versie gecontroleerd; mijn concept behouden en verder bewerken",
  latestExpenseMissing:
    "Deze uitgave is verwijderd of niet meer toegankelijk. Je concept blijft bewaard, maar kan niet worden opgeslagen.",
  deleteExpenseHistoryRetained:
    "De uitgave wordt uit het huidige grootboek verwijderd en saldi worden opnieuw berekend. De wijzigingsgeschiedenis blijft bewaard; je kunt een eerdere versie herstellen zonder de oude bonafbeelding.",
  expenseHistoryForName: (values: MessageValues) =>
    interpolate("Wijzigingsgeschiedenis: {name}", values),
};
