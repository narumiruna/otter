import {
  interpolate,
  type MessageValues,
  pluralForm,
} from "./message-types.js";

export const itAccount = {
  browserExpenseDefaults:
    "Impostazioni predefinite delle spese in questo browser",
  browserExpenseDefaultsHelp:
    "Cancella solo le impostazioni predefinite di valuta e ripartizione di questo account per questo gruppo. Account, accesso e autorizzazioni non cambiano.",
  clearPersonalPreferences:
    "Cancella le impostazioni predefinite delle spese per questo gruppo",
  expenseDefaultsCleared:
    "Impostazioni predefinite delle spese cancellate per questo gruppo.",
  personalPreferencesChanged:
    "Le tue impostazioni di ripartizione non sono più disponibili. Sono in uso impostazioni predefinite valide; selezionale di nuovo.",
  personalStorageFailed:
    "Impossibile salvare le impostazioni predefinite delle spese. Le impostazioni attuali restano disponibili, ma potrebbero andare perse alla riapertura della pagina.",
  rememberExpenseDefaults: "Ricorda valuta e impostazioni di ripartizione",
  expenseDefaultsRemembered:
    "Valuta e impostazioni di ripartizione salvate per questo gruppo.",
  deleteExpense: "Elimina spesa",
  copyExpense: "Copia come nuova spesa",
  copyExpenseNamed: (values: MessageValues) =>
    interpolate("Copia {name} come nuova spesa", values),
  memberAccounts: "Conti dei membri",
  accountPaid: "Pagato",
  accountShared: "Quota",
  accountBalance: "Da ricevere / pagare",
  accountReceivable: "Da ricevere",
  accountPayable: "Da pagare",
  accountSettled: "Saldato",
  accountPaidHelp:
    "Pagato è l'importo versato a negozi e altri fornitori. Non include i pagamenti di saldo tra membri.",
  accountTotalsHelp:
    "La quota è l'importo delle spese dovuto da ciascun membro. I saldi includono anche i pagamenti registrati e le rettifiche dei rappresentanti. Le bozze non sincronizzate sono escluse.",
  accountDetails: "Visualizza dettagli",
  accountPaidExpenses: "Spese pagate per il gruppo",
  accountSharedExpenses: "Spese condivise",
  accountExpenseTotal: "Importo totale della spesa",
  accountPayments: "Pagamenti inviati / ricevuti",
  accountPaymentSent: "Inviato",
  accountPaymentReceived: "Ricevuto",
  accountAdjustments: "Rettifiche dei rappresentanti",
  accountDetailsUnavailable:
    "I dettagli dei pagamenti non sono inclusi in questa condivisione. I saldi usano i risultati dei calcoli del gruppo.",
  accountRepresentedBy: (values: MessageValues) =>
    interpolate(
      "{name} salda per questo membro. Un saldo pari a zero non significa che questo membro abbia effettuato un pagamento.",
      values,
    ),
  visaSettlementTitle: "Saldi con tassi Visa",
  visaSettlementCurrency: "Valuta di saldo",
  visaSettlementEnable:
    "Converti tutte le spese con i tassi Visa delle rispettive date e salda nella valuta selezionata",
  visaSettlementHelp:
    "Disattivato per impostazione predefinita. Gli importi originali restano invariati. L'attivazione salva un tasso Visa per la data di ogni spesa e usa la valuta selezionata per saldi e pagamenti di saldo. Si applica a tutte le spese, inclusi i contanti, senza commissioni bancarie. I tassi Visa sono stime; gli addebiti sulla carta possono essere diversi. Prima di attivare o cambiare valuta, i pagamenti esistenti devono usare la valuta selezionata.",
  visaSettlementSaved: "Impostazione dei saldi Visa salvata",
  visaSettlementOn: (values: MessageValues) =>
    interpolate("Attivo · {currency}", values),
  visaSettlementOff: "Disattivato",
  visaRateLabel: "Visa",
  visaSettingInvalid: "Impostazione dei saldi Visa non valida",
  visaIncompatiblePayments:
    "I pagamenti esistenti devono usare la valuta di saldo selezionata",
  visaSettingUnavailable:
    "I tassi Visa non sono disponibili. L'impostazione non è stata modificata. Riprova più tardi.",
  visaPaymentCurrency:
    "I pagamenti di saldo Visa devono usare la valuta selezionata",
  visaRateUnavailable: (values: MessageValues) =>
    interpolate(
      "Il tasso Visa {currency}/{target} del {date} non è disponibile. Riprova più tardi.",
      values,
    ),
  offlineQueueBanner:
    "Sei offline: i dati caricati restano disponibili. Le nuove spese possono essere salvate su questo dispositivo; le altre modifiche richiedono una connessione.",
  queueSave: "Salva su questo dispositivo",
  queueSaved:
    "Salvato su questo dispositivo. Non ancora incluso nei saldi; i tassi di cambio vengono impostati alla sincronizzazione.",
  queueStorageError:
    "Impossibile salvare su questo dispositivo. Tieni aperta questa pagina e riprova.",
  queueTitle: "Spese non sincronizzate",
  queueNotice:
    "Solo su questo dispositivo. Non incluse nei saldi. I tassi di cambio vengono impostati alla sincronizzazione. Cancellando i dati del browser perderai queste bozze.",
  queuePending: "In attesa di sincronizzazione",
  queueAttempted:
    "Sincronizzazione in attesa di conferma; mantieni invariata la richiesta originale",
  queueConflict:
    "Sincronizzazione interrotta. Controlla accesso e partecipanti prima di riprovare; la richiesta originale è conservata.",
  queueInvalid: "Non registrata. Modifica la bozza e riprova.",
  queueEdit: "Modifica bozza",
  queueRetry: "Riprova la richiesta originale",
  queueDelete: "Elimina bozza locale",
  queueDeleteConfirm:
    "Eliminare questa bozza locale? Una richiesta già inviata potrebbe essere stata registrata sul server. Controlla prima il gruppo.",
  queueCount: (values: MessageValues) =>
    interpolate(
      pluralForm("it", values.count, {
        one: "{count} spesa non sincronizzata su questo dispositivo",
        other: "{count} spese non sincronizzate su questo dispositivo",
      }),
      values,
    ),
  queueSyncPricing:
    "L'anteprima mostra solo la valuta originale. Il server imposta il tasso di cambio alla sincronizzazione.",
  queueOrphanTitle: "Bozze di gruppi non disponibili",
  queueOrphanNotice:
    "Questi gruppi non sono più accessibili. Una richiesta inviata potrebbe essere stata registrata; verifica prima di eliminare la copia locale.",
  queueOrphanTrip: (values: MessageValues) =>
    interpolate("ID gruppo: {id}", values),
  accountSettings: "Impostazioni account",
  manageYourUsernameAndPasskeys:
    "Gestisci aspetto, lingua, nome utente, Passkey e token API.",
  appearance: "Aspetto",
  chooseHowOtterLooksOnThisBrowser:
    "Scegli l'aspetto di Otter. Le modifiche si applicano subito e vengono salvate in questo browser.",
  colorTheme: "Tema cromatico",
  forestTheme: "Foresta",
  oceanTheme: "Oceano",
  lavenderTheme: "Lavanda",
  sunsetTheme: "Tramonto",
  roseTheme: "Rosa",
  displayMode: "Modalità di visualizzazione",
  systemMode: "Sistema",
  lightMode: "Chiaro",
  darkMode: "Scuro",
  useTheNewUsernameTheNextTimeYouSignInYourCurrentSessionWillContinue:
    "Usa il nuovo nome utente al prossimo accesso. La sessione attuale continuerà.",
  passkeys: "Passkey",
  useAPasskeyToSignInWithoutYourPassword:
    "Usa lo sblocco del dispositivo per accedere senza inserire la password.",
  unableToLoadPasskeys: "Impossibile caricare le Passkey",
  unableToAddPasskey:
    "Impossibile aggiungere una Passkey. Se hai annullato, riprova.",
  unableToRemovePasskey: "Impossibile rimuovere la Passkey",
  passkeyAdded: "Passkey aggiunta",
  passkeyRemoved: "Passkey rimossa",
  passkeyNumber: (values: MessageValues) =>
    interpolate("Passkey {number}", values),
  addedOnDate: (values: MessageValues) =>
    interpolate("Aggiunta il {date}", values),
  removePasskeyNumber: (values: MessageValues) =>
    interpolate("Rimuovi Passkey {number}", values),
  noPasskeysAdded: "Nessuna Passkey ancora aggiunta.",
  addingPasskey: "Aggiunta della Passkey…",
  addPasskey: "Aggiungi Passkey",
  thisBrowserDoesNotSupportPasskeys: "Questo browser non supporta le Passkey.",
  apiTokens: "Token API",
  useApiTokensWithTheOtterCli:
    "Crea token Bearer per la CLI di Otter o per strumenti di automazione.",
  loadingApiTokens: "Caricamento dei token API…",
  unableToLoadApiTokens: "Impossibile caricare i token API",
  unableToCreateApiToken: "Impossibile creare il token API",
  apiTokenCreationUncertain:
    "L'esito della richiesta del token è sconosciuto. Riprova questa richiesta prima di crearne un altro.",
  retryApiTokenCreation: "Riprova la creazione del token",
  unableToRevokeApiToken: "Impossibile revocare il token API",
  unableToCopyApiToken: "Impossibile copiare il token API",
  apiTokenRevoked: "Token API revocato",
  apiTokenCopied: "Token API copiato",
  enterATokenName: "Inserisci un nome per il token",
  newApiToken: "Nuovo token API",
  copyYourApiTokenNow: "Copia ora il tuo token API",
  apiTokenShownOnce:
    "Questo token viene mostrato una sola volta. Non potrai più visualizzarlo dopo aver lasciato la pagina.",
  copyToken: "Copia token",
  done: "Fine",
  tokenName: "Nome del token",
  tokenNameExample: "Ad esempio: Automazione viaggi",
  creatingApiToken: "Creazione del token…",
  createApiToken: "Crea token API",
  apiTokenDates: (values: MessageValues) =>
    interpolate("Creato il {created} · Scade il {expires}", values),
  revokeNamedApiToken: (values: MessageValues) =>
    interpolate('Revoca il token API "{name}"', values),
  noActiveApiTokens: "Nessun token API attivo.",
  apiTokensExpireAfter90Days:
    "I token scadono dopo 90 giorni. Per usarne uno con la CLI, impostalo come",
  welcomeBackEyebrow: "BENTORNATO",
  startNewJourneyEyebrow: "INIZIA UN NUOVO VIAGGIO",
  parchmentTheme: "Pergamena",
  expenseTotalLabel: "Totale",
  expenseSplitSection: "Ripartisci tra persone",
  expenseSplitHelp:
    "Seleziona chi dividerà questa spesa, scegli un metodo e visualizza il risultato.",
  expenseTagPlaceholder: "Aggiungi un'etichetta…",
  addShort: "Aggiungi",
  settingsShort: "Impostazioni",
  close: "Chiudi",
  groupDetails: "Dettagli del gruppo",
  filters: "Filtri",
  viewAll: "Visualizza tutto",
  personLabel: "Persona",
  preferencesLabel: "Preferenze",
  profileLabel: "Profilo",
  securityLabel: "Sicurezza",
  backToGroups: "Torna ai gruppi",
  createdLabel: "Creato",
  statusLabel: "Stato",
  peopleDeletionHelp:
    "Le persone presenti nel registro non possono essere eliminate. Controlla le restrizioni individuali con il pulsante informazioni oppure unisci le persone duplicate.",
  personRestriction: (values: MessageValues) =>
    interpolate("Restrizioni di eliminazione per {name}", values),
  representsPeople: (values: MessageValues) =>
    interpolate("Rappresenta {names}", values),
  expenseRateForName: (values: MessageValues) =>
    interpolate("Visualizza importo e tasso di cambio per {name}", values),
  rateUnavailable: "Tasso non disponibile (dati di una versione precedente)",
};
