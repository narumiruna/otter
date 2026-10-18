import {
  interpolate,
  type MessageValues,
  pluralForm,
} from "./message-types.js";

export const itSettings = {
  groupSettings: "Impostazioni gruppo",
  manageSharingGroupPreferencesAndDataToolsHighImpactActionsRequireConfirmation:
    "Gestisci condivisione, preferenze del gruppo e strumenti per i dati. Le operazioni con effetti importanti richiedono conferma.",
  youAreACollaboratorAndCanUseDataToolsOnlyTheOwnerCanManageAccessAndGroupSettings:
    "Sei un collaboratore e puoi usare gli strumenti per i dati. Solo il proprietario può gestire l'accesso e le impostazioni del gruppo.",
  sharingAndAccess: "Condivisione e accesso",
  linksActiveLinksCollaboratorsCollaborators: (values: MessageValues) =>
    interpolate(
      "Link attivi: {links} · Collaboratori: {collaborators}",
      values,
    ),
  shareLinkCreated: "Link di condivisione creato",
  shareLinkCreatedAndCopied: "Link di condivisione creato e copiato",
  shareLinks: "Link di condivisione",
  chooseWhoCanEditThroughTheShareLink:
    "Scegli chi può visualizzare o modificare tramite questo link.",
  linkPermission: "Autorizzazione del link",
  readOnlyLink: "Sola lettura (senza accesso)",
  signedInEditLink: "Modifica dopo l'accesso",
  anyoneEditLink: "Chiunque abbia il link può modificare",
  signedInEditLinkDescription:
    "Dopo l'accesso o la registrazione, i visitatori diventano collaboratori. La revoca del link non rimuove le persone già entrate.",
  anyoneEditLinkDescription:
    "Chiunque abbia il link può modificare spese e partecipanti senza accedere. Condividilo solo con persone fidate; la revoca ha effetto immediato.",
  revokingSignedInLinkDoesNotRemoveExistingCollaborators:
    "La revoca impedisce nuovi ingressi. I collaboratori esistenti possono ancora modificare; rimuovi il loro accesso separatamente.",
  signInToEditSharedGroup: (values: MessageValues) =>
    interpolate("Accedi o crea un account per modificare {name}.", values),
  readOnlyShareLinkCreated: "Link di condivisione di sola lettura creato",
  readOnlyShareLinkCreatedAndCopied:
    "Link di condivisione di sola lettura creato e copiato",
  shareLinkCreatedYourBrowserBlockedAutomaticCopyingCopyItManually:
    "Link di condivisione creato. Il browser ha bloccato la copia automatica; copialo manualmente.",
  unableToCreateLink: "Impossibile creare il link",
  shareLinkCopied: "Link di condivisione copiato",
  yourBrowserBlockedCopyingOpenTheLinkAndCopyItFromTheAddressBar:
    "Il browser ha bloccato la copia. Apri il link e copialo dalla barra degli indirizzi.",
  anyoneWithTheLinkCanViewExpensesBalancesAndSettlementsWithoutSigningInButCannotEdit:
    "Chiunque abbia il link può visualizzare spese, saldi e pagamenti di saldo senza accedere, ma non può modificare.",
  readOnlyShareLinks: "Link di condivisione di sola lettura",
  createReadOnlyLink: "Crea link di sola lettura",
  anyoneWithTheLinkCanViewThisGroupsExpensesBalancesAndSettlementSuggestionsButCannotAddOrChangeData:
    "Chiunque abbia il link può visualizzare spese, saldi e suggerimenti di saldo di questo gruppo, ma non può aggiungere o modificare dati.",
  createAShareLink: "Creare un link di condivisione?",
  createShareLink: "Crea link di condivisione",
  revoked: "Revocato",
  active: "Attivo",
  openLink: "Apri link",
  copy: "Copia",
  revokeLink: "Revoca link",
  afterRevocationTheOldLinkWillImmediatelyStopWorking:
    "Dopo la revoca, il vecchio link smetterà immediatamente di funzionare.",
  shareLinkRevoked: "Link di condivisione revocato",
  revokeThisShareLink: "Revocare questo link di condivisione?",
  revoke: "Revoca",
  noShareLinksYet: "Nessun link di condivisione ancora creato.",
  collaboratorAdded: "Collaboratore aggiunto",
  unableToAddCollaborator: "Impossibile aggiungere il collaboratore",
  collaboratorsMustBeExistingUsersTheyCanManageExpensesAndParticipantsButNotOwnerSettings:
    "I collaboratori devono essere utenti esistenti. Possono gestire spese e partecipanti, ma non le impostazioni del proprietario.",
  existingUsersUsername: "Nome utente di un utente esistente",
  addCollaborator: "Aggiungi collaboratore",
  removeName: (values: MessageValues) => interpolate("Rimuovi {name}", values),
  thisAccountWillNoLongerBeAbleToManageTheGroupExistingExpenseDataWillRemain:
    "Questo account non potrà più gestire il gruppo. I dati delle spese esistenti resteranno.",
  collaboratorRemoved: "Collaboratore rimosso",
  removeCollaborator: "Rimuovere il collaboratore?",
  remove: "Rimuovi",
  dataAndExport: "Dati ed esportazione",
  csvPrintBackupAndRestore: "CSV, stampa, backup e ripristino",
  exportingDoesNotChangeGroupData:
    "L'esportazione non modifica i dati del gruppo.",
  exportAndPrint: "Esporta e stampa",
  expenseCsvExported: "CSV delle spese esportato",
  exportExpenseCsv: "Esporta CSV delle spese",
  settlementCsvExported: "CSV dei saldi esportato",
  exportSettlementCsv: "Esporta CSV dei saldi",
  print: "Stampa",
  completeBackupDownloaded: "Backup completo scaricato",
  downloadFailed: "Download non riuscito",
  downloadCompleteBackup: "Scarica backup completo",
  expenseCsvImported: "CSV delle spese importato",
  importFailed: "Importazione non riuscita",
  allRowsAreCheckedFirstNoDataIsWrittenIfAnyRowHasAnError:
    "Tutte le righe vengono controllate prima. Nessun dato viene scritto se una riga contiene un errore.",
  importExpenseCsv: "Importa CSV delle spese",
  chooseCsv: "Scegli CSV",
  importPreview: "Anteprima dell'importazione",
  rowsRowsCanBeImportedErrorsErrors: (values: MessageValues) =>
    interpolate("Righe importabili: {rows}; errori: {errors}.", values),
  rowRowMessage: (values: MessageValues) =>
    interpolate("Riga {row}: {message}", values),
  importCountExpenses: (values: MessageValues) =>
    interpolate(
      pluralForm("it", values.count, {
        one: "Importa {count} spesa",
        other: "Importa {count} spese",
      }),
      values,
    ),
  thisWillAddCountExpensesAtOnceAndRecalculateBalances: (
    values: MessageValues,
  ) =>
    interpolate(
      pluralForm("it", values.count, {
        one: "Verrà aggiunta {count} spesa in un'unica operazione e i saldi verranno ricalcolati.",
        other:
          "Verranno aggiunte {count} spese in un'unica operazione e i saldi verranno ricalcolati.",
      }),
      values,
    ),
  applyCsvImport: "Applicare l'importazione CSV?",
  applyImport: "Applica importazione",
  invalidBackupFormat: "Formato del backup non valido",
  backupRestoredAsANewGroup: "Backup ripristinato come nuovo gruppo",
  restoreFailed: "Ripristino non riuscito",
  restoringCreatesANewGroupAndDoesNotOverwriteCurrentData:
    "Il ripristino crea un nuovo gruppo e non sovrascrive i dati attuali.",
  restoreJsonBackup: "Ripristina backup JSON",
  chooseJsonBackup: "Scegli backup JSON",
  restorePreviewName: (values: MessageValues) =>
    interpolate("Anteprima del ripristino: {name}", values),
  peoplePeopleExpensesExpensesPaymentsPaymentsBaseCurrency: (
    values: MessageValues,
  ) =>
    interpolate(
      "Persone: {people} · Spese: {expenses} · Pagamenti: {payments} · Valuta base: {currency}",
      values,
    ),
  createNewGroup: "Crea nuovo gruppo",
  aNewGroupNamedNameWillBeCreatedWithoutChangingExistingGroups: (
    values: MessageValues,
  ) =>
    interpolate(
      "Verrà creato un nuovo gruppo chiamato «{name}» senza modificare i gruppi esistenti.",
      values,
    ),
  restoreThisBackup: "Ripristinare questo backup?",
  createNewGroup2: "Crea nuovo gruppo",
  copyGroup: "Duplica gruppo",
  copyThisGroup: "Duplicare questo gruppo?",
  copyGroupDescription:
    "Copia persone, valuta base e tassi personalizzati in un nuovo gruppo. Spese, pagamenti di saldo, collaboratori e link di condivisione non vengono copiati. Il gruppo originale resta invariato.",
  groupCopied: "Gruppo duplicato",
  groupPreferences: "Preferenze del gruppo",
  changingTheBaseCurrencyRecalculatesDisplayedAmountsAndClearsCustomExchangeRates:
    "Cambiare la valuta base ricalcola gli importi visualizzati e cancella i tassi di cambio personalizzati.",
  nameAndBaseCurrency: "Nome e valuta base",
  totalSpendingWillDisplayAsAmountBalancesAndSettlementsBelowWillBeConverted: (
    values: MessageValues,
  ) =>
    interpolate(
      "La spesa totale verrà visualizzata come {amount}; i saldi e i pagamenti di saldo sottostanti verranno convertiti.",
      values,
    ),
  expectCountSettlementSuggestionsCustomRatesWillResetToBuiltInValues: (
    values: MessageValues,
  ) =>
    interpolate(
      "Suggerimenti di saldo previsti: {count}; i tassi personalizzati verranno ripristinati ai valori predefiniti di Bank of Taiwan.",
      values,
    ),
  cancelChanges: "Annulla modifiche",
  applyGroupPreferences: "Applica preferenze del gruppo",
  changeTheBaseCurrencyToCurrencyRecalculateAllResultsAndClearCustomRates: (
    values: MessageValues,
  ) =>
    interpolate(
      "Cambia la valuta base in {currency}, ricalcola tutti i risultati e cancella i tassi personalizzati.",
      values,
    ),
  renameTheGroupToName: (values: MessageValues) =>
    interpolate("Rinomina il gruppo in «{name}».", values),
  applyTheseChanges: "Applicare queste modifiche?",
  applyChanges: "Applica modifiche",
  groupPreferencesApplied: "Preferenze del gruppo applicate",
  saveFailed: "Salvataggio non riuscito",
  customExchangeRatesApplied: "Tassi di cambio personalizzati applicati",
  unableToSaveExchangeRates: "Impossibile salvare i tassi di cambio",
  currencyConversion: "Conversione di valuta",
  countCustomRates: (values: MessageValues) =>
    interpolate(
      pluralForm("it", values.count, {
        one: "{count} tasso personalizzato",
        other: "{count} tassi personalizzati",
      }),
      values,
    ),
  setHowMuch1UnitOfEachCurrencyEqualsInCurrencyLeaveBlankToUseTheBuiltInFixedRate:
    (values: MessageValues) =>
      interpolate(
        "Imposta il valore di 1 unità di ciascuna valuta in {currency}. I tassi non impostati usano automaticamente i tassi medi a pronti di Bank of Taiwan.",
        values,
      ),
  customExchangeRates: "Tassi di cambio personalizzati",
  bankOfTaiwanSpotMidRateDescription:
    "Le nuove spese senza tassi personalizzati usano il tasso medio a pronti di Bank of Taiwan e conservano quella quotazione. Cancellare i tassi personalizzati influisce sulle spese future; i pagamenti usano comunque i tassi attuali.",
  loadBankOfTaiwanSpotMidRates: "Carica i tassi predefiniti di Bank of Taiwan",
  loadingBankExchangeRates: "Caricamento dei tassi di cambio bancari…",
  bankOfTaiwanSpotMidRatesLoadedAtTime: (values: MessageValues) =>
    interpolate(
      "Tassi medi a pronti di Bank of Taiwan caricati ({time}).",
      values,
    ),
  bankOfTaiwanDefaultRatesApplied:
    "Tassi predefiniti di Bank of Taiwan ripristinati",
  unableToLoadBankExchangeRates:
    "I tassi di cambio bancari non sono attualmente disponibili. Riprova più tardi.",
  conversionPreview: "Anteprima della conversione",
  totalSpendingAmountCountSettlementSuggestions: (values: MessageValues) =>
    interpolate(
      "Spesa totale: {amount} · Suggerimenti di saldo: {count}.",
      values,
    ),
  applyRates: "Applica tassi",
  allTotalsBalancesAndSettlementSuggestionsWillBeRecalculatedWithTheseRates:
    "Le spese esistenti conservano i propri tassi. Le spese nuove o ricalcolate e i pagamenti esistenti usano i tassi aggiornati.",
  applyCustomExchangeRates: "Applicare i tassi di cambio personalizzati?",
  restoreBankOfTaiwanDefaultRates:
    "Ripristinare i tassi predefiniti di Bank of Taiwan?",
  apiWriteSettings: "Accesso in scrittura API",
  apiWritesAllowed: "Consentito",
  apiWritesBlocked: "Non consentito",
  apiWriteSettingsDescription:
    "Per impostazione predefinita, i token API e la CLI non possono modificare questo gruppo. Se abilitato, i membri con token API possono modificare secondo le proprie autorizzazioni. Le operazioni nel browser non cambiano.",
  allowApiWrites: "Consenti modifiche tramite token API",
  apiWriteSettingSaved: "Accesso in scrittura API aggiornato",
  groupLifecycle: "Ciclo di vita del gruppo",
  archivedReadOnly: "Archiviato · sola lettura",
  active2: "Attivo",
  afterRestoringDataCanBeAddedAndChangedAgain:
    "Dopo il ripristino sarà di nuovo possibile aggiungere e modificare dati.",
  archivingPreservesAllDataButMakesTheGroupReadOnly:
    "L'archiviazione conserva tutti i dati, ma rende il gruppo di sola lettura.",
  restoreGroup: "Ripristina gruppo",
  archiveGroup: "Archivia gruppo",
  afterRestoringTheOwnerAndCollaboratorsCanEditDataAgain:
    "Dopo il ripristino, il proprietario e i collaboratori potranno di nuovo modificare i dati.",
  expensesPeopleAndPaymentRecordsArePreservedAndCannotBeChangedWhileArchived:
    "Spese, persone e pagamenti registrati vengono conservati e non possono essere modificati durante l'archiviazione.",
  groupRestored: "Gruppo ripristinato",
  groupArchived: "Gruppo archiviato",
  restoreThisGroup: "Ripristinare questo gruppo?",
  archiveThisGroup: "Archiviare questo gruppo?",
  thisPermanentlyDeletesAllPeopleExpensesReceiptsAndSettlementRecordsAndCannotBeUndone:
    "Questa operazione elimina definitivamente tutte le persone, le spese, le ricevute e le registrazioni dei saldi e non può essere annullata.",
  deleteGroup: "Elimina gruppo",
  enterNameToConfirm: (values: MessageValues) =>
    interpolate("Inserisci «{name}» per confermare", values),
  permanentlyDeleteName: (values: MessageValues) =>
    interpolate("Elimina definitivamente «{name}»", values),
  thisCannotBeUndoneCancelingMakesNoChanges:
    "Questa operazione non può essere annullata. Annullando non verrà apportata alcuna modifica.",
  permanentlyDeleteThisGroup: "Eliminare definitivamente questo gruppo?",
  permanentlyDeleteGroup: "Elimina definitivamente il gruppo",
  groupDeleted: "Gruppo eliminato",
  readOnlyShare: "Condivisione di sola lettura",
  youCanViewExpensesBalancesAndSettlementSuggestionsButCannotEditData:
    "Puoi visualizzare spese, saldi e suggerimenti di saldo, ma non puoi modificare i dati.",
  completeExpenseHistory: "Cronologia completa delle spese",
  manageGroupSettings: "Gestisci impostazioni gruppo",
  csvImportFailed: "Importazione CSV non riuscita",
  theCsvHasNoData: "Il CSV non contiene dati",
  missingColumnsColumns: (values: MessageValues) =>
    interpolate("Colonne mancanti: {columns}", values),
  participantNotFoundName: (values: MessageValues) =>
    interpolate("Partecipante non trovato: {name}", values),
  invalidJsonFormat: "Formato JSON non valido",
  incorrectUsernameOrPassword: "Nome utente o password errati",
  everyPersonNeedsAnAmountForACustomSplit:
    "Ogni persona deve avere un importo per una ripartizione personalizzata",
  unsupportedBackupVersion: "Versione del backup non supportata",
  unsupportedSplitMethod: "Metodo di ripartizione non supportato",
  unsupportedExchangeRateCurrency: "Valuta del tasso di cambio non supportata",
  unsupportedBaseCurrency: "Valuta base non supportata",
  unsupportedCurrency: "Valuta non supportata",
  aParticipantCannotBeMergedIntoThemselves:
    "Un partecipante non può essere unito a se stesso",
  theOwnerCannotBeRemoved: "Il proprietario non può essere rimosso",
  thePayerAndRecipientMustBeDifferent:
    "Il pagatore e il destinatario devono essere diversi",
  payerIsRequired: "È necessario specificare il pagatore",
  thePayerMustBeAParticipant: "Il pagatore deve essere un partecipante",
  serverError: "Errore del server",
  invalidPaymentRecordsInBackup:
    "Registrazioni dei pagamenti non valide nel backup",
  splitTotalsInBackupAreInvalid:
    "Totali della ripartizione non validi nel backup",
  invalidSplitDataInBackup: "Dati di ripartizione non validi nel backup",
  invalidExchangeRatesInBackup: "Tassi di cambio non validi nel backup",
  invalidParticipantDataInBackup: "Dati dei partecipanti non validi nel backup",
  backupContainsDuplicateParticipants:
    "Il backup contiene partecipanti duplicati",
  invalidBaseCurrencyInBackup: "Valuta base non valida nel backup",
  invalidExpenseCategoryInBackup: "Categoria della spesa non valida nel backup",
  anExpenseParticipantInTheBackupDoesNotExist:
    "Un partecipante alle spese nel backup non esiste",
  anExpenseInTheBackupHasDuplicateParticipants:
    "Una spesa nel backup contiene partecipanti duplicati",
  invalidExpenseDataInBackup: "Dati delle spese non validi nel backup",
  invalidExpenseTagsInBackup: "Etichette delle spese non valide nel backup",
  invalidTripNameInBackup: "Nome del viaggio non valido nel backup",
  backupIsMissingItsTrip: "Il backup non contiene il viaggio",
  backupIsMissingParticipants: "Il backup non contiene i partecipanti",
  backupIsMissingExpenses: "Il backup non contiene le spese",
  notesCanBeUpTo160Characters:
    "Le note possono contenere al massimo 160 caratteri",
  theShareLinkIsInvalidOrHasBeenRevoked:
    "Il link di condivisione non è valido o è stato revocato",
  atLeastOneSplitParticipantIsRequired:
    "È necessario almeno un partecipante alla ripartizione",
  splitParticipantsMustBelongToTheTrip:
    "I partecipanti alla ripartizione devono appartenere al viaggio",
  splitAmountsMustAddUpToTheExpenseAmount:
    "La somma delle quote deve corrispondere all'importo della spesa",
  splitAmountsMustBeGreaterThan0:
    "Gli importi delle quote devono essere maggiori di 0",
  invalidSplitAmount: "Importo della quota non valido",
  invalidCategoryOrTagFormat: "Formato di categoria o etichetta non valido",
  exchangeRatesMustBeGreaterThan0:
    "I tassi di cambio devono essere maggiori di 0",
  invalidExchangeRateFormat: "Formato del tasso di cambio non valido",
  aParticipantWithThisNameAlreadyExists:
    "Esiste già un partecipante con questo nome",
  thisParticipantHasPaymentRecordsAndCannotBeDeleted:
    "Questo partecipante ha pagamenti registrati e non può essere eliminato",
  thisParticipantHasExpensesAndCannotBeDeleted:
    "Questo partecipante ha spese e non può essere eliminato",
  onlyTheOwnerCanDownloadACompleteBackup:
    "Solo il proprietario può scaricare un backup completo",
  onlyTheOwnerCanManageShareLinks:
    "Solo il proprietario può gestire i link di condivisione",
  onlyTheOwnerCanManageCollaborators:
    "Solo il proprietario può gestire i collaboratori",
  onlyTheOwnerCanManageTripSettings:
    "Solo il proprietario può gestire le impostazioni del viaggio",
  namesCanBeUpTo80Characters:
    "I nomi possono contenere al massimo 80 caratteri",
  passwordMustBeAtLeast8Characters3:
    "La password deve contenere almeno 8 caratteri",
  invalidArchiveStatus: "Stato di archiviazione non valido",
  invalidApiWriteSetting:
    "Impostazione dell'accesso in scrittura API non valida",
  onlyBrowserSessionsCanManageApiWrites:
    "Solo le sessioni del browser possono gestire l'accesso in scrittura API",
  apiWritesDisabledForThisGroup:
    "Questo gruppo non consente modifiche tramite token API",
  apiEndpointNotFound: "Endpoint API non trovato",
  paymentRecordNotFound: "Registrazione del pagamento non trovata",
  collaboratorNotFound: "Collaboratore non trovato",
  participantNotFound: "Partecipante non trovato",
  noActiveShareLinkWasFound: "Nessun link di condivisione attivo trovato",
  expenseNotFound: "Spesa non trovata",
  receiptNotFound: "Ricevuta non trovata",
  tripNotFound: "Viaggio non trovato",
  userNotFound: "Utente non trovato",
  descriptionMustBe1120Characters:
    "La descrizione deve contenere da 1 a 120 caratteri",
  theOwnerIsAlreadyInTheCollaboratorList:
    "Il proprietario è già nell'elenco dei collaboratori",
  thisGroupIsArchivedRestoreItBeforeEditing:
    "Questo gruppo è archiviato. Ripristinalo prima di modificarlo.",
  receiptsMustBeJpegPngOrWebpImages:
    "Le ricevute devono essere immagini JPEG, PNG o WebP",
  theRecipientMustBeAParticipant: "Il destinatario deve essere un partecipante",
  aTripWithThisNameAlreadyExists: "Esiste già un viaggio con questo nome",
  dateMustUseTheYyyyMmDdFormat: "La data deve usare il formato YYYY-MM-DD",
  upTo10TagsAreAllowed: "Sono consentite al massimo 10 etichette",
  tagsCanBeUpTo24Characters:
    "Le etichette possono contenere al massimo 24 caratteri",
  invalidTagFormat: "Formato dell'etichetta non valido",
  theTargetParticipantMustBelongToTheTrip:
    "Il partecipante di destinazione deve appartenere al viaggio",
  signInFirst: "Accedi prima",
  provideExpenseChanges: "Specifica le modifiche alla spesa",
  provideTripChanges: "Specifica le modifiche al viaggio",
  requestBodyIsTooLarge: "Il corpo della richiesta è troppo grande",
  selectAtLeastOneSplitParticipant:
    "Seleziona almeno un partecipante alla ripartizione",
  enterATripNameOf1100Characters:
    "Inserisci un nome per il viaggio da 1 a 100 caratteri",
  enterAnExpenseDescriptionOf1120Characters:
    "Inserisci una descrizione della spesa da 1 a 120 caratteri",
  enterAParticipantNameOf180Characters:
    "Inserisci un nome del partecipante da 1 a 80 caratteri",
  enterAUsernameAndPassword: "Inserisci nome utente e password",
  enterSplitValues: "Inserisci i valori di ripartizione",
  enterAValidPaymentDate: "Inserisci una data di pagamento valida",
  enterValidSplitShares: "Inserisci quote di ripartizione valide",
  enterValidSplitPercentages: "Inserisci percentuali di ripartizione valide",
  enterValidSplitAmounts: "Inserisci importi di ripartizione validi",
  enterAValidExpenseDate: "Inserisci una data della spesa valida",
  chooseACsvFile: "Scegli un file CSV",
  selectSplitParticipants: "Seleziona i partecipanti alla ripartizione",
  chooseAReceiptImage: "Scegli un'immagine della ricevuta",
  thisUserIsAlreadyACollaborator: "Questo utente è già un collaboratore",
  thisUsernameIsAlreadyRegistered: "Questo nome utente è già registrato",
  usernameIsBeingRegisteredOrAlreadyRegistered:
    "Questo nome utente è in fase di registrazione o è già utilizzato",
  usernameIsBeingRegistered: "Questo nome utente è in fase di registrazione",
  usernameOrPasskeyAlreadyRegistered:
    "Questo nome utente o questa Passkey sono già registrati",
  invalidAmount: "Importo non valido",
  theDefaultDevelopmentAccountsUsernameCannotBeChanged:
    "Il nome utente dell'account di sviluppo predefinito non può essere modificato",
  language: "Lingua",
  english: "Inglese",
  traditionalChinese: "Cinese tradizionale",
};
