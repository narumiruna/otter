import {
  interpolate,
  type MessageValues,
  pluralForm,
} from "./message-types.js";

export const itExpenses = {
  createYourFirstGroup: "Crea il tuo primo gruppo",
  addATripOrEventGroupOrCreateOneFromAnExistingJsonBackup:
    "Aggiungi un gruppo per un viaggio o un evento, oppure creane uno da un backup JSON esistente.",
  groupExpenseSummary: "Riepilogo delle spese del gruppo",
  totalSharedExpenses: "Totale delle spese condivise",
  convertedToBaseCurrency: "Convertito nella valuta base",
  outstanding: "Da saldare",
  countSuggestedPaymentsToSettleUp: (values: MessageValues) =>
    interpolate(
      pluralForm("it", values.count, {
        one: "{count} pagamento suggerito per saldare i conti",
        other: "{count} pagamenti suggeriti per saldare i conti",
      }),
      values,
    ),
  nothingIsCurrentlyOutstanding: "Al momento non c'è nulla da saldare",
  settlementSuggestionsAppearAfterExpensesAreAdded:
    "I suggerimenti di saldo appaiono dopo l'aggiunta delle spese",
  expenseRecords: "Spese registrate",
  sharedAmongCountPeople: (values: MessageValues) =>
    interpolate(
      pluralForm("it", values.count, {
        one: "Ripartito tra {count} persona",
        other: "Ripartito tra {count} persone",
      }),
      values,
    ),
  calculatedFromCurrentExpensesAndRecordedPayments:
    "Calcolato dalle spese attuali e dai pagamenti registrati.",
  settleUp: "Salda i conti",
  countEntries: (values: MessageValues) =>
    interpolate(
      pluralForm("it", values.count, {
        one: "{count} voce",
        other: "{count} voci",
      }),
      values,
    ),
  entries: "voci",
  seePaymentsAndSharesAtAGlance: "Vedi subito pagamenti e quote.",
  balances: "Saldi",
  recentExpenses: "Spese recenti",
  noExpensesYet: "Nessuna spesa ancora registrata",
  thisGroupHasNotRecordedAnySharedExpenses:
    "Questo gruppo non ha ancora registrato spese condivise.",
  recordTheFirstSharedExpense: "Registra la prima spesa condivisa",
  addThePeopleSplittingExpensesToCalculateEachBalance:
    "Aggiungi prima le persone che dividono le spese, poi registra la prima spesa. I saldi e i suggerimenti di saldo appariranno automaticamente.",
  balancesAndSettlementSuggestionsWillAppearHereAfterYouAddExpenses:
    "I saldi e i suggerimenti di saldo appariranno qui dopo l'aggiunta delle spese.",
  addPerson: "Aggiungi persona",
  managePeople: "Gestisci persone",
  everythingIsSettled: "Tutto saldato",
  thereAreNoOutstandingPayments: "Non ci sono pagamenti in sospeso.",
  paymentRecorded: "Pagamento registrato",
  unableToRecordPayment: "Impossibile registrare il pagamento",
  recordPayment: "Registra pagamento",
  recordSettlementPayment: "Registra pagamento di saldo",
  fromPaysToTheFullSuggestedAmountIsPrefilled: (values: MessageValues) =>
    interpolate(
      "{from} paga a {to}; l'intero importo suggerito è già inserito.",
      values,
    ),
  paymentAmountCurrency: (values: MessageValues) =>
    interpolate("Importo del pagamento ({currency})", values),
  enterAPaymentAmount: "Inserisci l'importo del pagamento",
  thePaymentMustBeGreaterThan0AndNoMoreThanTheSuggestedAmount:
    "Il pagamento deve essere maggiore di 0 e non superiore all'importo suggerito",
  expectedRemainder: "Residuo previsto: ",
  paymentDate: "Data del pagamento",
  noteOptional: "Nota (facoltativa)",
  recordPayment2: "Registra pagamento",
  paymentHistory: "Cronologia dei pagamenti",
  dateFromPaidTo: (values: MessageValues) =>
    interpolate("{date} · {from} ha pagato {to}", values),
  deletePayment: "Elimina pagamento",
  remainingSettlementSuggestionsWillBeRecalculated:
    "I suggerimenti di saldo rimanenti verranno ricalcolati.",
  paymentDeleted: "Pagamento eliminato",
  deleteFailed: "Eliminazione non riuscita",
  deleteThisPayment: "Eliminare questo pagamento?",
  delete: "Elimina",
  datePaidByNameSplitWithSplit: (values: MessageValues) =>
    interpolate("{date} · pagato da {name} · diviso con {split}", values),
  dailySpending: "Spese giornaliere",
  paidByPerson: "Importi pagati per persona",
  byCategory: "Per categoria",
  spendingAnalysis: "Analisi delle spese",
  totalAmount: (values: MessageValues) =>
    interpolate("Totale {amount}", values),
  noDataYet: "Nessun dato ancora disponibile.",
  showingShownOfTotalExpenses: (values: MessageValues) =>
    interpolate("Spese visualizzate: {shown} su {total}", values),
  searchDescriptions: "Cerca nelle descrizioni",
  searchExpenseDescriptions: "Cerca nelle descrizioni delle spese",
  sort: "Ordina",
  groupBy: "Raggruppa per",
  noGrouping: "Nessun raggruppamento",
  groupByDate: "Raggruppa per data",
  groupByPayer: "Raggruppa per pagatore",
  dateNewestFirst: "Data: più recenti prima",
  dateOldestFirst: "Data: più vecchie prima",
  amountHighToLow: "Importo: dal maggiore al minore",
  amountLowToHigh: "Importo: dal minore al maggiore",
  moreFilters: "Altri filtri",
  countApplied: (values: MessageValues) =>
    interpolate("Filtri applicati: {count}", values),
  datePersonCurrencyCategoryAndTag:
    "Data, persona, valuta, categoria ed etichetta",
  from: "Da",
  to: "A",
  paidBy: "Pagato da",
  splitWith: "Diviso con",
  expenseParticipants: "Partecipanti alle spese",
  currency: "Valuta",
  allCurrencies: "Tutte le valute",
  category: "Categoria",
  allCategories: "Tutte le categorie",
  tag: "Etichetta",
  exactTag: "Etichetta esatta",
  applied: "Applicati:",
  clearAll: "Cancella tutto",
  allPeople: "Tutte le persone",
  categoryValue: (values: MessageValues) =>
    interpolate("Categoria: {value}", values),
  currencyValue: (values: MessageValues) =>
    interpolate("Valuta: {value}", values),
  fromValue: (values: MessageValues) => interpolate("Da: {value}", values),
  toValue: (values: MessageValues) => interpolate("A: {value}", values),
  tagValue: (values: MessageValues) =>
    interpolate("Etichetta: {value}", values),
  aCompleteHistoryWillAppearHereAfterTheFirstSharedExpense:
    "La cronologia completa apparirà qui dopo la prima spesa condivisa.",
  recordFirstExpense: "Registra la prima spesa",
  noMatchingExpenses: "Nessuna spesa corrispondente",
  adjustOrClearTheFiltersToSeeAllExpenses:
    "Modifica o cancella i filtri per vedere tutte le spese.",
  clearFilters: "Cancella filtri",
  filteredExpenses: "Spese filtrate",
  allExpenses: "Tutte le spese",
  columns: "Colonne",
  chooseExpenseColumns: "Scegli le colonne delle spese",
  expenseName: "Spesa",
  splitParticipants: "Ripartizione",
  receipt: "Ricevuta",
  tags: "Etichette",
  restoreDefaults: "Ripristina impostazioni predefinite",
  actions: "Azioni",
  expenseGroupSummary: (values: MessageValues) =>
    interpolate(
      pluralForm("it", values.count, {
        one: "{count} spesa · {total}",
        other: "{count} spese · {total}",
      }),
      values,
    ),
  countPeople: (values: MessageValues) =>
    interpolate(
      pluralForm("it", values.count, {
        one: "{count} persona",
        other: "{count} persone",
      }),
      values,
    ),
  viewReceiptForName: (values: MessageValues) =>
    interpolate("Visualizza la ricevuta di {name}", values),
  receiptPreviewForName: (values: MessageValues) =>
    interpolate("Ricevuta per «{name}»", values),
  receiptImageForName: (values: MessageValues) =>
    interpolate("Immagine della ricevuta di {name}", values),
  closeReceiptPreviewHint: "Fai clic sull'immagine o premi Esc per chiudere.",
  closeReceiptPreview: "Chiudi anteprima della ricevuta",
  openOriginalReceipt: "Apri immagine originale",
  moreActionsForName: (values: MessageValues) =>
    interpolate("Altre azioni per {name}", values),
  datePaidByName: (values: MessageValues) =>
    interpolate("{date} · pagato da {name}", values),
  splitWithSplit: (values: MessageValues) =>
    interpolate("Diviso con {split}", values),
  edit: "Modifica",
  receiptUploadFailed: "Caricamento della ricevuta non riuscito",
  receiptUploaded: "Ricevuta caricata",
  uploading: "Caricamento…",
  uploadReceipt: "Carica ricevuta",
  receiptFileRequirements: "JPEG, PNG o WebP · Fino a 5 MB",
  selectReceiptPhoto: "Carica foto",
  takeReceiptPhoto: "Scatta foto",
  removeReceiptPhoto: "Rimuovi foto",
  receiptOnlineOnly:
    "Le foto richiedono una connessione; le bozze offline non memorizzano foto. Rimuovi la foto o riconnettiti prima.",
  receiptFileTooLarge:
    "Le foto devono avere dimensioni pari o inferiori a 5 MB",
  expenseSavedReceiptFailed:
    "Spesa creata, ma caricamento della ricevuta non riuscito. Riprova ora o aggiungila più tardi dall'elenco delle spese.",
  retryReceiptUpload: "Riprova il caricamento della ricevuta",
  receiptAlreadyAttached:
    "Questa spesa ha già una ricevuta. Controllala dall'elenco delle spese; non verrà sovrascritta automaticamente",
  uploadReceiptLater: "Carica più tardi",
  expenseCreationUncertain:
    "Non possiamo confermare se la spesa è stata creata. Controlla l'elenco delle spese prima di aggiungerla di nuovo; non riprovare subito.",
  viewReceipt: "Visualizza ricevuta",
  noReceipt: "Nessuna ricevuta",
  deleteReceipt: "Elimina ricevuta",
  youCanUploadAnotherReceiptLaterTheExpenseWillNotBeDeleted:
    "Puoi caricare un'altra ricevuta più tardi; la spesa non verrà eliminata.",
  receiptDeleted: "Ricevuta eliminata",
  deleteThisReceipt: "Eliminare questa ricevuta?",
  deleteName: (values: MessageValues) =>
    interpolate("Elimina «{name}»", values),
  thisCannotBeUndoneAllBalancesAndSettlementSuggestionsWillBeRecalculated:
    "Questa operazione non può essere annullata. Tutti i saldi e i suggerimenti di saldo verranno ricalcolati.",
  expenseDeleted: "Spesa eliminata",
  deleteThisExpense: "Eliminare questa spesa?",
  invalidSplitFormat: "Formato di ripartizione non valido",
  selectAtLeastOnePersonToSplitWith:
    "Seleziona almeno una persona con cui dividere la spesa",
  expenseChangesSaved: "Modifiche alla spesa salvate",
  expenseRecorded: "Spesa registrata",
  unableToSaveExpense: "Impossibile salvare la spesa",
  reviewTheSplitPreviewBeforeSavingChanges:
    "Controlla l'anteprima della ripartizione prima di salvare le modifiche.",
  enterTheRequiredDetailsFirstCustomSplitsAndTagsAreAvailableBelow:
    "Inserisci prima i dettagli richiesti. Ripartizioni personalizzate ed etichette sono disponibili qui sotto.",
  editExpense: "Modifica spesa",
  addExpense2: "Aggiungi spesa",
  discardDraft: "Scarta bozza",
  unsavedChangesWillBeLostExistingDataWillNotChange:
    "Le modifiche non salvate andranno perse. I dati esistenti non cambieranno.",
  discardThisDraft: "Scartare questa bozza?",
  description: "Descrizione",
  dinnerHotelTrainTickets: "Cena, hotel, biglietti del treno",
  enterAnExpenseDescription: "Inserisci una descrizione della spesa",
  amount: "Importo",
  enterAnExpenseAmount: "Inserisci l'importo della spesa",
  date: "Data",
  currency2: "Valuta",
  splitPreview: "Anteprima della ripartizione",
  enterAnAmountToPreviewEachPersonsShare:
    "Inserisci un importo per visualizzare l'anteprima della quota di ogni persona.",
  namePaidAmount: (values: MessageValues) =>
    interpolate("{name} ha pagato {amount}", values),
  changePeopleAndSplitMethod: "Cambia persone e metodo di ripartizione",
  selectedSelectedOfTotal: (values: MessageValues) =>
    interpolate("Selezionati: {selected} su {total}", values),
  selectAll: "Seleziona tutto",
  clear: "Cancella",
  splitMethod: "Metodo di ripartizione",
  splitEqually: "In parti uguali",
  exactAmounts: "Importi esatti",
  percentages: "Percentuali",
  shares: "Quote",
  nameSKind: (values: MessageValues) => interpolate("{kind} di {name}", values),
  moreDetails: "Altri dettagli",
  categoryAndTags: "Categoria ed etichette",
  separateWithCommasForExampleBreakfastTransport:
    "Separa con virgole, ad esempio colazione, trasporti",
  unsavedChangesWillBeLost: "Le modifiche non salvate andranno perse.",
  cancelEditing: "Annullare la modifica?",
  saveChanges: "Salva modifiche",
  recordExpense: "Registra spesa",
  settlementRepresentative: "Saldo affidato a",
  settledByName: (values: MessageValues) =>
    interpolate("Saldo affidato a {name}", values),
  settleSeparately: "Personalmente (saldo separato)",
  settlementRepresentativeHelp:
    "Le spese sono divise per persona; nei saldi e nei suggerimenti di saldo, il saldo netto di una persona viene incluso sotto il suo rappresentante. I rappresentanti non possono a loro volta essere affidati a un'altra persona.",
  representativeHasDependents:
    "Altri membri sono affidati a questa persona. Rimuovi prima queste assegnazioni.",
  settlementRepresentativeUpdated: "Rappresentante per il saldo aggiornato",
  unableToUpdateSettlementRepresentative:
    "Impossibile aggiornare il rappresentante per il saldo",
  provideParticipantChanges:
    "Specifica i dettagli del partecipante da aggiornare",
  invalidSettlementRepresentative: "Rappresentante per il saldo non valido",
  settlementRepresentativeMustBeAnotherGroupMember:
    "Il rappresentante per il saldo deve essere un altro membro di questo gruppo",
  settlementRepresentativeCannotBeAssignedOrHaveDependents:
    "Il rappresentante per il saldo non può saldare tramite un'altra persona e questa persona non può avere membri che saldano tramite lei",
  invalidBackupSettlementRepresentative:
    "Rappresentante per il saldo non valido nel backup",
  expenseParticipantAdded: "Partecipante alle spese aggiunto",
  unableToAddPerson: "Impossibile aggiungere la persona",
  expenseParticipantsDoNotNeedToSignInManageAccountsWithAccessUnderMoreSharingAndAccess:
    "I partecipanti alle spese non devono accedere. Gestisci gli account con accesso in Impostazioni gruppo → Condivisione e accesso.",
  personsName: "Nome della persona",
  friendsName: "Nome dell'amico",
  enterAName: "Inserisci un nome",
  archivedGroupsAreReadOnlyRestoreThisGroupToChangeParticipants:
    "I gruppi archiviati sono di sola lettura. Ripristina questo gruppo per modificare i partecipanti.",
  usedByAPayment: "Usato in un pagamento",
  cannotDeleteReasonUpdateRelatedExpensesFirstOrUseTheMergeToolBelow: (
    values: MessageValues,
  ) =>
    interpolate(
      "Impossibile eliminare: {reason}. Aggiorna prima le spese collegate oppure usa lo strumento di unione qui sotto.",
      values,
    ),
  deleteName2: (values: MessageValues) => interpolate("Elimina {name}", values),
  thisPersonHasNoExpensesOrPaymentsDeletionCannotBeUndone:
    "Questa persona non ha spese né pagamenti. L'eliminazione non può essere annullata.",
  expenseParticipantDeleted: "Partecipante alle spese eliminato",
  deleteThisExpenseParticipant: "Eliminare questo partecipante alle spese?",
  nameUpdated: "Nome aggiornato",
  unableToUpdateName: "Impossibile aggiornare il nome",
  rename: "Rinomina",
  renameName: (values: MessageValues) => interpolate("Rinomina {name}", values),
  existingExpensesAndPaymentsWillRemainLinkedToThisPerson:
    "Le spese e i pagamenti esistenti resteranno collegati a questa persona.",
  newName: "Nuovo nome",
  saveName: "Salva nome",
  advancedPeopleTools: "Strumenti avanzati per le persone",
  mergeDuplicatePeople: "Unisci persone duplicate",
  sourcePerson: "Persona di origine",
  targetPerson: "Persona di destinazione",
  mergeInto: "Unisci in",
  changePreview: "Anteprima delle modifiche",
  expensesRelatedExpensesAndPaymentsPaymentsForSourceWillMoveToTargetThenTheSourcePersonWillBeDeleted:
    (values: MessageValues) =>
      interpolate(
        "Le spese collegate ({expenses}) e i pagamenti ({payments}) di {source} verranno trasferiti a {target}, poi la persona di origine verrà eliminata.",
        values,
      ),
  mergePeople: "Unisci persone",
  sourceWillBeDeletedAndRelatedDataWillBeTransferredToTargetAtomically: (
    values: MessageValues,
  ) =>
    interpolate(
      "{source} verrà eliminato e i dati collegati verranno trasferiti a {target} in un'unica operazione indivisibile.",
      values,
    ),
  expenseParticipantsMerged: "Partecipanti alle spese uniti",
  mergeFailed: "Unione non riuscita",
  applyMerge: "Applicare l'unione?",
  previewAndMerge: "Anteprima e unione",
};
