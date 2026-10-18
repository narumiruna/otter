import { interpolate, type MessageValues } from "./message-types.js";

export const nlErrors = {
  csvImportFailed: "CSV-import mislukt",
  theCsvHasNoData: "De CSV bevat geen gegevens",
  missingColumnsColumns: (values: MessageValues) =>
    interpolate("Ontbrekende kolommen: {columns}", values),
  participantNotFoundName: (values: MessageValues) =>
    interpolate("Deelnemer niet gevonden: {name}", values),
  invalidJsonFormat: "Ongeldig JSON-formaat",
  incorrectUsernameOrPassword: "Onjuiste gebruikersnaam of onjuist wachtwoord",
  everyPersonNeedsAnAmountForACustomSplit:
    "Voor een aangepaste verdeling is voor elke persoon een bedrag nodig",
  unsupportedBackupVersion: "Niet-ondersteunde back-upversie",
  unsupportedSplitMethod: "Niet-ondersteunde verdeelmethode",
  unsupportedExchangeRateCurrency: "Niet-ondersteunde valuta voor wisselkoers",
  unsupportedBaseCurrency: "Niet-ondersteunde basisvaluta",
  unsupportedCurrency: "Niet-ondersteunde valuta",
  aParticipantCannotBeMergedIntoThemselves:
    "Een deelnemer kan niet met zichzelf worden samengevoegd",
  theOwnerCannotBeRemoved: "De eigenaar kan niet worden verwijderd",
  thePayerAndRecipientMustBeDifferent:
    "De betaler en ontvanger moeten verschillend zijn",
  payerIsRequired: "Een betaler is verplicht",
  thePayerMustBeAParticipant: "De betaler moet een deelnemer zijn",
  serverError: "Serverfout",
  invalidPaymentRecordsInBackup: "Ongeldige betalingsgegevens in back-up",
  splitTotalsInBackupAreInvalid:
    "De verdeeltotalen in de back-up zijn ongeldig",
  invalidSplitDataInBackup: "Ongeldige verdeelgegevens in back-up",
  invalidExchangeRatesInBackup: "Ongeldige wisselkoersen in back-up",
  invalidParticipantDataInBackup: "Ongeldige deelnemergegevens in back-up",
  backupContainsDuplicateParticipants: "De back-up bevat dubbele deelnemers",
  invalidBaseCurrencyInBackup: "Ongeldige basisvaluta in back-up",
  invalidExpenseCategoryInBackup: "Ongeldige uitgavencategorie in back-up",
  anExpenseParticipantInTheBackupDoesNotExist:
    "Een uitgavendeelnemer in de back-up bestaat niet",
  anExpenseInTheBackupHasDuplicateParticipants:
    "Een uitgave in de back-up heeft dubbele deelnemers",
  invalidExpenseDataInBackup: "Ongeldige uitgavengegevens in back-up",
  invalidExpenseTagsInBackup: "Ongeldige uitgavenlabels in back-up",
  invalidTripNameInBackup: "Ongeldige reisnaam in back-up",
  backupIsMissingItsTrip: "De reis ontbreekt in de back-up",
  backupIsMissingParticipants: "Deelnemers ontbreken in de back-up",
  backupIsMissingExpenses: "Uitgaven ontbreken in de back-up",
  notesCanBeUpTo160Characters: "Notities mogen maximaal 160 tekens bevatten",
  theShareLinkIsInvalidOrHasBeenRevoked:
    "De deellink is ongeldig of ingetrokken",
  atLeastOneSplitParticipantIsRequired:
    "Er is minstens één deelnemer aan de verdeling nodig",
  splitParticipantsMustBelongToTheTrip:
    "Deelnemers aan de verdeling moeten bij de reis horen",
  splitAmountsMustAddUpToTheExpenseAmount:
    "De verdeelde bedragen moeten samen gelijk zijn aan het uitgavenbedrag",
  splitAmountsMustBeGreaterThan0: "Verdeelde bedragen moeten groter zijn dan 0",
  invalidSplitAmount: "Ongeldig verdeeld bedrag",
  invalidCategoryOrTagFormat: "Ongeldig categorie- of labelformaat",
  exchangeRatesMustBeGreaterThan0: "Wisselkoersen moeten groter zijn dan 0",
  invalidExchangeRateFormat: "Ongeldig wisselkoersformaat",
  aParticipantWithThisNameAlreadyExists:
    "Er bestaat al een deelnemer met deze naam",
  thisParticipantHasPaymentRecordsAndCannotBeDeleted:
    "Deze deelnemer heeft betalingsgegevens en kan niet worden verwijderd",
  thisParticipantHasExpensesAndCannotBeDeleted:
    "Deze deelnemer heeft uitgaven en kan niet worden verwijderd",
  onlyTheOwnerCanDownloadACompleteBackup:
    "Alleen de eigenaar kan een volledige back-up downloaden",
  onlyTheOwnerCanManageShareLinks: "Alleen de eigenaar kan deellinks beheren",
  onlyTheOwnerCanManageCollaborators:
    "Alleen de eigenaar kan medewerkers beheren",
  onlyTheOwnerCanManageTripSettings:
    "Alleen de eigenaar kan reisinstellingen beheren",
  namesCanBeUpTo80Characters: "Namen mogen maximaal 80 tekens bevatten",
  passwordMustBeAtLeast8Characters3:
    "Het wachtwoord moet minstens 8 tekens bevatten",
  invalidArchiveStatus: "Ongeldige archiefstatus",
  invalidApiWriteSetting: "Ongeldige instelling voor API-schrijftoegang",
  onlyBrowserSessionsCanManageApiWrites:
    "Alleen browsersessies kunnen API-schrijftoegang beheren",
  apiWritesDisabledForThisGroup:
    "Deze groep staat geen wijzigingen via API-token toe",
  apiEndpointNotFound: "API-eindpunt niet gevonden",
  paymentRecordNotFound: "Betalingsregistratie niet gevonden",
  collaboratorNotFound: "Medewerker niet gevonden",
  participantNotFound: "Deelnemer niet gevonden",
  noActiveShareLinkWasFound: "Geen actieve deellink gevonden",
  expenseNotFound: "Uitgave niet gevonden",
  receiptNotFound: "Bon niet gevonden",
  tripNotFound: "Reis niet gevonden",
  userNotFound: "Gebruiker niet gevonden",
  descriptionMustBe1120Characters: "De omschrijving moet 1–120 tekens bevatten",
  theOwnerIsAlreadyInTheCollaboratorList:
    "De eigenaar staat al in de medewerkerslijst",
  thisGroupIsArchivedRestoreItBeforeEditing:
    "Deze groep is gearchiveerd. Herstel de groep voordat je gaat bewerken.",
  receiptsMustBeJpegPngOrWebpImages:
    "Bonnen moeten JPEG-, PNG- of WebP-afbeeldingen zijn",
  theRecipientMustBeAParticipant: "De ontvanger moet een deelnemer zijn",
  aTripWithThisNameAlreadyExists: "Er bestaat al een reis met deze naam",
  dateMustUseTheYyyyMmDdFormat:
    "De datum moet het formaat YYYY-MM-DD gebruiken",
  upTo10TagsAreAllowed: "Er zijn maximaal 10 labels toegestaan",
  tagsCanBeUpTo24Characters: "Labels mogen maximaal 24 tekens bevatten",
  invalidTagFormat: "Ongeldig labelformaat",
  theTargetParticipantMustBelongToTheTrip:
    "De doeldeelnemer moet bij de reis horen",
  signInFirst: "Meld je eerst aan",
  provideExpenseChanges: "Geef uitgavenwijzigingen op",
  provideTripChanges: "Geef reiswijzigingen op",
  requestBodyIsTooLarge: "De verzoekinhoud is te groot",
  selectAtLeastOneSplitParticipant:
    "Selecteer minstens één deelnemer aan de verdeling",
  enterATripNameOf1100Characters: "Voer een reisnaam van 1–100 tekens in",
  enterAnExpenseDescriptionOf1120Characters:
    "Voer een uitgavenomschrijving van 1–120 tekens in",
  enterAParticipantNameOf180Characters:
    "Voer een deelnemersnaam van 1–80 tekens in",
  enterAUsernameAndPassword: "Voer een gebruikersnaam en wachtwoord in",
  enterSplitValues: "Voer verdeelwaarden in",
  enterAValidPaymentDate: "Voer een geldige betalingsdatum in",
  enterValidSplitShares: "Voer geldige verdeeleenheden in",
  enterValidSplitPercentages: "Voer geldige verdeelpercentages in",
  enterValidSplitAmounts: "Voer geldige verdeelde bedragen in",
  enterAValidExpenseDate: "Voer een geldige uitgavendatum in",
  chooseACsvFile: "Kies een CSV-bestand",
  selectSplitParticipants: "Selecteer deelnemers aan de verdeling",
  chooseAReceiptImage: "Kies een bonafbeelding",
  thisUserIsAlreadyACollaborator: "Deze gebruiker is al medewerker",
  thisUsernameIsAlreadyRegistered: "Deze gebruikersnaam is al geregistreerd",
  usernameIsBeingRegisteredOrAlreadyRegistered:
    "Deze gebruikersnaam wordt geregistreerd of is al in gebruik",
  usernameIsBeingRegistered: "Deze gebruikersnaam wordt geregistreerd",
  usernameOrPasskeyAlreadyRegistered:
    "Deze gebruikersnaam of Passkey is al geregistreerd",
  invalidAmount: "Ongeldig bedrag",
  theDefaultDevelopmentAccountsUsernameCannotBeChanged:
    "De gebruikersnaam van het standaardontwikkelaccount kan niet worden gewijzigd",
  language: "Taal",
  english: "Engels",
  traditionalChinese: "Traditioneel Chinees",
};
