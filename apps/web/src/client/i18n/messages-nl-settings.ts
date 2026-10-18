import {
  interpolate,
  type MessageValues,
  pluralForm,
} from "./message-types.js";

export const nlSettings = {
  groupSettings: "Groepsinstellingen",
  manageSharingGroupPreferencesAndDataToolsHighImpactActionsRequireConfirmation:
    "Beheer delen, groepsvoorkeuren en gegevensfuncties. Ingrijpende acties vereisen bevestiging.",
  youAreACollaboratorAndCanUseDataToolsOnlyTheOwnerCanManageAccessAndGroupSettings:
    "Je bent medewerker en kunt gegevensfuncties gebruiken. Alleen de eigenaar kan toegang en groepsinstellingen beheren.",
  sharingAndAccess: "Delen en toegang",
  linksActiveLinksCollaboratorsCollaborators: (values: MessageValues) =>
    interpolate(
      `${pluralForm("nl", values.links, { one: "{links} actieve link", other: "{links} actieve links" })} · ${pluralForm("nl", values.collaborators, { one: "{collaborators} medewerker", other: "{collaborators} medewerkers" })}`,
      values,
    ),
  shareLinkCreated: "Deellink aangemaakt",
  shareLinkCreatedAndCopied: "Deellink aangemaakt en gekopieerd",
  shareLinks: "Deellinks",
  chooseWhoCanEditThroughTheShareLink:
    "Kies wie via deze link kan bekijken of bewerken.",
  linkPermission: "Linkrechten",
  readOnlyLink: "Alleen-lezen (zonder aanmelden)",
  signedInEditLink: "Bewerken na aanmelden",
  anyoneEditLink: "Iedereen met de link kan bewerken",
  signedInEditLinkDescription:
    "Na aanmelden of registreren worden bezoekers medewerkers. Het intrekken van de link verwijdert geen personen die al zijn toegetreden.",
  anyoneEditLinkDescription:
    "Iedereen met de link kan uitgaven en deelnemers bewerken zonder zich aan te melden. Deel de link alleen met mensen die je vertrouwt; intrekken werkt direct.",
  revokingSignedInLinkDoesNotRemoveExistingCollaborators:
    "Intrekken voorkomt nieuwe toetredingen. Bestaande medewerkers kunnen nog steeds bewerken; verwijder hun toegang apart.",
  signInToEditSharedGroup: (values: MessageValues) =>
    interpolate(
      "Meld je aan of maak een account aan om {name} te bewerken.",
      values,
    ),
  readOnlyShareLinkCreated: "Deellink voor alleen-lezen aangemaakt",
  readOnlyShareLinkCreatedAndCopied:
    "Deellink voor alleen-lezen aangemaakt en gekopieerd",
  shareLinkCreatedYourBrowserBlockedAutomaticCopyingCopyItManually:
    "Deellink aangemaakt. Je browser heeft automatisch kopiëren geblokkeerd; kopieer de link handmatig.",
  unableToCreateLink: "Link aanmaken is mislukt",
  shareLinkCopied: "Deellink gekopieerd",
  yourBrowserBlockedCopyingOpenTheLinkAndCopyItFromTheAddressBar:
    "Je browser heeft kopiëren geblokkeerd. Open de link en kopieer deze uit de adresbalk.",
  anyoneWithTheLinkCanViewExpensesBalancesAndSettlementsWithoutSigningInButCannotEdit:
    "Iedereen met de link kan uitgaven, saldi en verrekeningen bekijken zonder zich aan te melden, maar kan niet bewerken.",
  readOnlyShareLinks: "Deellinks voor alleen-lezen",
  createReadOnlyLink: "Link voor alleen-lezen aanmaken",
  anyoneWithTheLinkCanViewThisGroupsExpensesBalancesAndSettlementSuggestionsButCannotAddOrChangeData:
    "Iedereen met de link kan uitgaven, saldi en verrekenvoorstellen van deze groep bekijken, maar kan geen gegevens toevoegen of wijzigen.",
  createAShareLink: "Een deellink aanmaken?",
  createShareLink: "Deellink aanmaken",
  revoked: "Ingetrokken",
  active: "Actief",
  openLink: "Link openen",
  copy: "Kopiëren",
  revokeLink: "Link intrekken",
  afterRevocationTheOldLinkWillImmediatelyStopWorking:
    "Na intrekken werkt de oude link direct niet meer.",
  shareLinkRevoked: "Deellink ingetrokken",
  revokeThisShareLink: "Deze deellink intrekken?",
  revoke: "Intrekken",
  noShareLinksYet: "Nog geen deellinks.",
  collaboratorAdded: "Medewerker toegevoegd",
  unableToAddCollaborator: "Medewerker toevoegen is mislukt",
  collaboratorsMustBeExistingUsersTheyCanManageExpensesAndParticipantsButNotOwnerSettings:
    "Medewerkers moeten bestaande gebruikers zijn. Ze kunnen uitgaven en deelnemers beheren, maar geen eigenaarsinstellingen.",
  existingUsersUsername: "Gebruikersnaam van bestaande gebruiker",
  addCollaborator: "Medewerker toevoegen",
  removeName: (values: MessageValues) =>
    interpolate("{name} verwijderen", values),
  thisAccountWillNoLongerBeAbleToManageTheGroupExistingExpenseDataWillRemain:
    "Dit account kan de groep niet meer beheren. Bestaande uitgavengegevens blijven bewaard.",
  collaboratorRemoved: "Medewerker verwijderd",
  removeCollaborator: "Medewerker verwijderen?",
  remove: "Verwijderen",
  dataAndExport: "Gegevens en export",
  csvPrintBackupAndRestore: "CSV, afdrukken, back-up en herstel",
  exportingDoesNotChangeGroupData:
    "Exporteren verandert de groepsgegevens niet.",
  exportAndPrint: "Exporteren en afdrukken",
  expenseCsvExported: "Uitgaven-CSV geëxporteerd",
  exportExpenseCsv: "Uitgaven-CSV exporteren",
  settlementCsvExported: "Verrekenings-CSV geëxporteerd",
  exportSettlementCsv: "Verrekenings-CSV exporteren",
  print: "Afdrukken",
  completeBackupDownloaded: "Volledige back-up gedownload",
  downloadFailed: "Downloaden mislukt",
  downloadCompleteBackup: "Volledige back-up downloaden",
  expenseCsvImported: "Uitgaven-CSV geïmporteerd",
  importFailed: "Importeren mislukt",
  allRowsAreCheckedFirstNoDataIsWrittenIfAnyRowHasAnError:
    "Alle rijen worden eerst gecontroleerd. Er worden geen gegevens opgeslagen als een rij een fout bevat.",
  importExpenseCsv: "Uitgaven-CSV importeren",
  chooseCsv: "CSV kiezen",
  importPreview: "Importvoorbeeld",
  rowsRowsCanBeImportedErrorsErrors: (values: MessageValues) =>
    interpolate(
      `${pluralForm("nl", values.rows, { one: "{rows} rij kan worden geïmporteerd", other: "{rows} rijen kunnen worden geïmporteerd" })}; ${pluralForm("nl", values.errors, { one: "{errors} fout", other: "{errors} fouten" })}.`,
      values,
    ),
  rowRowMessage: (values: MessageValues) =>
    interpolate("Rij {row}: {message}", values),
  importCountExpenses: (values: MessageValues) =>
    interpolate(
      pluralForm("nl", values.count, {
        one: "{count} uitgave importeren",
        other: "{count} uitgaven importeren",
      }),
      values,
    ),
  thisWillAddCountExpensesAtOnceAndRecalculateBalances: (
    values: MessageValues,
  ) =>
    interpolate(
      pluralForm("nl", values.count, {
        one: "Dit voegt {count} uitgave in één keer toe en berekent saldi opnieuw.",
        other:
          "Dit voegt {count} uitgaven in één keer toe en berekent saldi opnieuw.",
      }),
      values,
    ),
  applyCsvImport: "CSV-import toepassen?",
  applyImport: "Import toepassen",
  invalidBackupFormat: "Ongeldig back-upformaat",
  backupRestoredAsANewGroup: "Back-up hersteld als nieuwe groep",
  restoreFailed: "Herstellen mislukt",
  restoringCreatesANewGroupAndDoesNotOverwriteCurrentData:
    "Herstellen maakt een nieuwe groep aan en overschrijft geen huidige gegevens.",
  restoreJsonBackup: "JSON-back-up herstellen",
  chooseJsonBackup: "JSON-back-up kiezen",
  restorePreviewName: (values: MessageValues) =>
    interpolate("Herstelvoorbeeld: {name}", values),
  peoplePeopleExpensesExpensesPaymentsPaymentsBaseCurrency: (
    values: MessageValues,
  ) =>
    interpolate(
      `${pluralForm("nl", values.people, { one: "{people} persoon", other: "{people} personen" })} · ${pluralForm("nl", values.expenses, { one: "{expenses} uitgave", other: "{expenses} uitgaven" })} · ${pluralForm("nl", values.payments, { one: "{payments} betaling", other: "{payments} betalingen" })} · basis {currency}`,
      values,
    ),
  createNewGroup: "Nieuwe groep aanmaken",
  aNewGroupNamedNameWillBeCreatedWithoutChangingExistingGroups: (
    values: MessageValues,
  ) =>
    interpolate(
      "Er wordt een nieuwe groep met de naam ‘{name}’ aangemaakt zonder bestaande groepen te wijzigen.",
      values,
    ),
  restoreThisBackup: "Deze back-up herstellen?",
  createNewGroup2: "Nieuwe groep aanmaken",
  copyGroup: "Groep dupliceren",
  copyThisGroup: "Deze groep dupliceren?",
  copyGroupDescription:
    "Kopieer personen, basisvaluta en aangepaste koersen naar een nieuwe groep. Uitgaven, verrekenbetalingen, medewerkers en deellinks worden niet gekopieerd. De oorspronkelijke groep blijft ongewijzigd.",
  groupCopied: "Groep gedupliceerd",
  groupPreferences: "Groepsvoorkeuren",
  changingTheBaseCurrencyRecalculatesDisplayedAmountsAndClearsCustomExchangeRates:
    "Bij het wijzigen van de basisvaluta worden weergegeven bedragen opnieuw berekend en aangepaste wisselkoersen gewist.",
  nameAndBaseCurrency: "Naam en basisvaluta",
  totalSpendingWillDisplayAsAmountBalancesAndSettlementsBelowWillBeConverted: (
    values: MessageValues,
  ) =>
    interpolate(
      "De totale uitgaven worden weergegeven als {amount}; onderstaande saldi en verrekeningen worden omgerekend.",
      values,
    ),
  expectCountSettlementSuggestionsCustomRatesWillResetToBuiltInValues: (
    values: MessageValues,
  ) =>
    interpolate(
      pluralForm("nl", values.count, {
        one: "Verwacht {count} verrekenvoorstel; aangepaste koersen worden teruggezet naar de standaardkoersen van Bank of Taiwan.",
        other:
          "Verwacht {count} verrekenvoorstellen; aangepaste koersen worden teruggezet naar de standaardkoersen van Bank of Taiwan.",
      }),
      values,
    ),
  cancelChanges: "Wijzigingen annuleren",
  applyGroupPreferences: "Groepsvoorkeuren toepassen",
  changeTheBaseCurrencyToCurrencyRecalculateAllResultsAndClearCustomRates: (
    values: MessageValues,
  ) =>
    interpolate(
      "Wijzig de basisvaluta naar {currency}, bereken alle resultaten opnieuw en wis aangepaste koersen.",
      values,
    ),
  renameTheGroupToName: (values: MessageValues) =>
    interpolate("Wijzig de groepsnaam naar ‘{name}’.", values),
  applyTheseChanges: "Deze wijzigingen toepassen?",
  applyChanges: "Wijzigingen toepassen",
  groupPreferencesApplied: "Groepsvoorkeuren toegepast",
  saveFailed: "Opslaan mislukt",
  customExchangeRatesApplied: "Aangepaste wisselkoersen toegepast",
  unableToSaveExchangeRates: "Wisselkoersen opslaan is mislukt",
  currencyConversion: "Valuta omrekenen",
  countCustomRates: (values: MessageValues) =>
    interpolate(
      pluralForm("nl", values.count, {
        one: "{count} aangepaste koers",
        other: "{count} aangepaste koersen",
      }),
      values,
    ),
  setHowMuch1UnitOfEachCurrencyEqualsInCurrencyLeaveBlankToUseTheBuiltInFixedRate:
    (values: MessageValues) =>
      interpolate(
        "Stel in hoeveel 1 eenheid van elke valuta waard is in {currency}. Niet-ingestelde koersen gebruiken automatisch de middenkoersen voor spottransacties van Bank of Taiwan.",
        values,
      ),
  customExchangeRates: "Aangepaste wisselkoersen",
  bankOfTaiwanSpotMidRateDescription:
    "Nieuwe uitgaven zonder aangepaste koers gebruiken de middenkoers voor spottransacties van Bank of Taiwan en behouden die koers. Het wissen van aangepaste koersen geldt voor toekomstige uitgaven; betalingen gebruiken nog steeds de huidige koersen.",
  loadBankOfTaiwanSpotMidRates: "Standaardkoersen van Bank of Taiwan laden",
  loadingBankExchangeRates: "Bankwisselkoersen laden…",
  bankOfTaiwanSpotMidRatesLoadedAtTime: (values: MessageValues) =>
    interpolate(
      "Middenkoersen voor spottransacties van Bank of Taiwan geladen ({time}).",
      values,
    ),
  bankOfTaiwanDefaultRatesApplied:
    "Standaardkoersen van Bank of Taiwan hersteld",
  unableToLoadBankExchangeRates:
    "Bankwisselkoersen zijn momenteel niet beschikbaar. Probeer het later opnieuw.",
  conversionPreview: "Omrekenvoorbeeld",
  totalSpendingAmountCountSettlementSuggestions: (values: MessageValues) =>
    interpolate(
      pluralForm("nl", values.count, {
        one: "Totale uitgaven: {amount} · {count} verrekenvoorstel.",
        other: "Totale uitgaven: {amount} · {count} verrekenvoorstellen.",
      }),
      values,
    ),
  applyRates: "Koersen toepassen",
  allTotalsBalancesAndSettlementSuggestionsWillBeRecalculatedWithTheseRates:
    "Bestaande uitgaven behouden hun koersen. Nieuwe of opnieuw omgerekende uitgaven en bestaande betalingen gebruiken de bijgewerkte koersen.",
  applyCustomExchangeRates: "Aangepaste wisselkoersen toepassen?",
  restoreBankOfTaiwanDefaultRates:
    "Standaardkoersen van Bank of Taiwan herstellen?",
  apiWriteSettings: "API-schrijftoegang",
  apiWritesAllowed: "Toegestaan",
  apiWritesBlocked: "Niet toegestaan",
  apiWriteSettingsDescription:
    "API-tokens en de CLI kunnen deze groep standaard niet wijzigen. Na inschakelen kunnen leden met API-tokens bewerken volgens hun rechten. Browseracties blijven ongewijzigd.",
  allowApiWrites: "Wijzigingen via API-token toestaan",
  apiWriteSettingSaved: "API-schrijftoegang bijgewerkt",
  groupLifecycle: "Groepslevenscyclus",
  archivedReadOnly: "Gearchiveerd · alleen-lezen",
  active2: "Actief",
  afterRestoringDataCanBeAddedAndChangedAgain:
    "Na herstel kunnen gegevens weer worden toegevoegd en gewijzigd.",
  archivingPreservesAllDataButMakesTheGroupReadOnly:
    "Archiveren bewaart alle gegevens, maar maakt de groep alleen-lezen.",
  restoreGroup: "Groep herstellen",
  archiveGroup: "Groep archiveren",
  afterRestoringTheOwnerAndCollaboratorsCanEditDataAgain:
    "Na herstel kunnen de eigenaar en medewerkers de gegevens weer bewerken.",
  expensesPeopleAndPaymentRecordsArePreservedAndCannotBeChangedWhileArchived:
    "Uitgaven, personen en betalingsgegevens blijven bewaard en kunnen tijdens archivering niet worden gewijzigd.",
  groupRestored: "Groep hersteld",
  groupArchived: "Groep gearchiveerd",
  restoreThisGroup: "Deze groep herstellen?",
  archiveThisGroup: "Deze groep archiveren?",
  thisPermanentlyDeletesAllPeopleExpensesReceiptsAndSettlementRecordsAndCannotBeUndone:
    "Dit verwijdert alle personen, uitgaven, bonnen en verrekeningsgegevens definitief en kan niet ongedaan worden gemaakt.",
  deleteGroup: "Groep verwijderen",
  enterNameToConfirm: (values: MessageValues) =>
    interpolate("Voer ‘{name}’ in om te bevestigen", values),
  permanentlyDeleteName: (values: MessageValues) =>
    interpolate("‘{name}’ definitief verwijderen", values),
  thisCannotBeUndoneCancelingMakesNoChanges:
    "Dit kan niet ongedaan worden gemaakt. Annuleren brengt geen wijzigingen aan.",
  permanentlyDeleteThisGroup: "Deze groep definitief verwijderen?",
  permanentlyDeleteGroup: "Groep definitief verwijderen",
  groupDeleted: "Groep verwijderd",
  readOnlyShare: "Gedeelde weergave voor alleen-lezen",
  youCanViewExpensesBalancesAndSettlementSuggestionsButCannotEditData:
    "Je kunt uitgaven, saldi en verrekenvoorstellen bekijken, maar geen gegevens bewerken.",
  completeExpenseHistory: "Volledige uitgavengeschiedenis",
  manageGroupSettings: "Groepsinstellingen beheren",
};
