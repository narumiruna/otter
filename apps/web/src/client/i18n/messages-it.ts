import {
  type CatalogShape,
  interpolate,
  type MessageValues,
  pluralForm,
} from "./message-types.js";
import { itAi } from "./messages-ai.js";
import { itAiAuth } from "./messages-ai-auth.js";
import { automaticRateMessages } from "./messages-automatic-rates.js";
import { itAccount } from "./messages-it-account.js";
import { itExpenses } from "./messages-it-expenses.js";
import { itSettings } from "./messages-it-settings.js";
import type { zhTW } from "./messages-zh-tw.js";

export const it = {
  ...automaticRateMessages("it"),
  ...itAi,
  ...itAiAuth,
  backToExpenseList: "Torna all’elenco delle spese",
  expenseEditorUnavailable:
    "Questa spesa non può essere modificata. Potrebbe non esistere, oppure il gruppo potrebbe essere di sola lettura o archiviato.",
  ...itAccount,
  ...itExpenses,
  ...itSettings,
  expenseHistory: "Cronologia delle modifiche",
  expenseHistoryDescription:
    "Modifiche, eliminazioni e ripristini delle spese; non la cronologia dei pagamenti o dei saldi.",
  expenseHistoryEmpty: "Nessuna modifica registrata",
  expenseHistoryMore: "Carica altre modifiche",
  expenseHistoryCreated: "Creata",
  expenseHistoryUpdated: "Aggiornata",
  expenseHistoryDeleted: "Eliminata",
  expenseHistoryRestored: "Ripristinata",
  expenseHistoryBaseline: "Stato iniziale",
  expenseHistorySystem: "Sistema",
  expenseHistoryBaselineNotice:
    "Stato al momento dell'attivazione della cronologia; le modifiche precedenti e l'autore originale sono sconosciuti.",
  expenseHistoryReceiptNotice:
    "Vengono conservati solo i metadati delle ricevute. Le immagini precedenti non sono disponibili.",
  expenseHistoryShares: "Importi delle quote",
  expenseHistoryRate: "Tasso di cambio salvato",
  expenseHistoryRateBank: "Bank of Taiwan",
  expenseHistoryRateCustom: "Personalizzato per il gruppo",
  expenseHistoryRateFixed: "Fisso predefinito",
  expenseHistoryRateLegacy: "Stima della versione precedente",
  expenseHistoryRateTimeUnavailable: "Ora della quotazione non disponibile",
  expenseHistoryRateUnavailable: "Versione precedente: nessun tasso registrato",
  expenseHistoryBefore: "Prima",
  expenseHistoryAfter: "Dopo",
  expenseHistorySourceExpense: "Operazione sulla spesa",
  expenseHistorySourceCsv: "Importazione CSV",
  expenseHistorySourceRestore: "Ripristino del backup",
  expenseHistorySourceMerge: "Unione dei partecipanti",
  expenseHistorySourceReceipt: "Operazione sulla ricevuta",
  expenseHistorySourceSeed: "Dati di prova per lo sviluppo",
  expenseHistorySourceMigration: "Migrazione",
  expenseHistorySourceVersionRestore: "Ripristino di una versione",
  expenseRestoreVersion: (values: MessageValues) =>
    interpolate("Ripristina v{version}", values),
  expenseRestoreTitle: "Ripristina versione della spesa",
  expenseRestoreDescription:
    "Controlla la spesa attuale e la versione da ripristinare. Il ripristino aggiunge una nuova versione; la cronologia successiva resta disponibile.",
  expenseRestoreKeepsReceipt:
    "La ricevuta attuale resta allegata. Le vecchie immagini delle ricevute non vengono ripristinate.",
  expenseRestoreNoReceipt:
    "Una spesa eliminata viene ripristinata senza ricevuta. Le vecchie immagini delle ricevute non vengono ripristinate.",
  expenseRestoreMissingPerson:
    "Questa versione fa riferimento a una persona non più presente nel gruppo. Modifica invece la spesa manualmente.",
  expenseRestoreUnavailable:
    "Questa spesa non può essere ripristinata. Ricarica e riprova.",
  expenseRestoreConflict:
    "La spesa è cambiata. Controlla lo stato più recente prima di confermare di nuovo.",
  expenseRestoreConfirm: "Ripristina questa versione",
  expenseRestored: "Versione della spesa ripristinata",
  expenseConflictParticipantsChanged:
    "Le persone sono cambiate. La conferma sostituisce le selezioni non disponibili di pagatore o ripartizione con le impostazioni più recenti della spesa. Gli altri campi della bozza vengono conservati; controlla gli importi delle quote prima di salvare.",
  expenseVersionConflict:
    "Questa spesa è cambiata. Controlla la versione più recente prima di confermare di nuovo.",
  expenseVersionMissing:
    "Specifica la versione della spesa. Ricarica e riprova.",
  expenseVersionInvalid: "Versione della spesa non valida",
  reviewLatestExpense: "Controlla la spesa più recente",
  confirmLatestExpenseVersion:
    "Ho controllato l'ultima versione; mantieni la mia bozza e continua a modificare",
  latestExpenseMissing:
    "Questa spesa è stata eliminata o non è più accessibile. La tua bozza viene conservata, ma non può essere salvata.",
  deleteExpenseHistoryRetained:
    "La spesa verrà rimossa dal registro attuale e i saldi verranno ricalcolati. La cronologia delle modifiche viene conservata; puoi ripristinare una versione precedente senza la vecchia immagine della ricevuta.",
  expenseHistoryForName: (values: MessageValues) =>
    interpolate("Cronologia delle modifiche: {name}", values),
  usernameMustBe332LettersNumbersUnderscoresOrHyphens:
    "Il nome utente deve contenere da 3 a 32 lettere, numeri, trattini bassi o trattini",
  travelTogetherSplitExpensesEasily:
    "Viaggiate insieme, dividete le spese facilmente",
  goodFriendsSplitExpensesWell: "Tra buoni amici, le spese si dividono bene.",
  skipToMainContent: "Vai al contenuto principale",
  otterHome: "Pagina iniziale di otter",
  loading: "Caricamento",
  unableToLoadOtter: "Impossibile caricare otter",
  loadingFailed: "Caricamento non riuscito",
  reload: "Ricarica",
  signedIn: "Accesso effettuato",
  accountCreated: "Account creato",
  unableToAuthenticate: "Impossibile autenticarsi",
  authenticationRequestsTooFrequentTryAgainLater:
    "Troppe richieste di autenticazione. Riprova più tardi.",
  usernameUpdated: "Nome utente aggiornato",
  signedOut: "Disconnessione effettuata",
  signOutFailedMessage: (values: MessageValues) =>
    interpolate("Disconnessione non riuscita: {message}", values),
  pleaseTryAgainLater: "Riprova più tardi",
  signingOut: "Disconnessione…",
  signOut: "Esci",
  authorizeCli: "Collega CLI",
  authorizeCliDescription:
    "Inserisci il codice dispositivo mostrato nel terminale per autorizzare questa CLI ad accedere ai tuoi dati Otter.",
  deviceCode: "Codice dispositivo",
  checkDeviceCode: "Continua",
  checkingDeviceCode: "Verifica…",
  cliAccessRequest: "Richiesta di accesso CLI",
  cliAccessRequestedBy: "Richiesto da",
  approveCliAccess: "Autorizza accesso",
  approvingCliAccess: "Autorizzazione…",
  cliAccessApproved: "CLI collegata",
  cliAccessApprovedDescription:
    "Puoi chiudere questa pagina e tornare al terminale.",
  deviceCodeNotFoundOrExpired: "Codice dispositivo non trovato o scaduto",
  enterAValidDeviceCode: "Inserisci un codice dispositivo valido",
  youAreOfflineLoadedDataIsAvailableButEditingRequiresAConnection:
    "Sei offline. I dati caricati sono disponibili, ma le modifiche richiedono una connessione.",
  travelTogetherSplitWithEase: "Viaggiate insieme, dividete con facilità",
  spendYourTimeOnTheJourney: "Dedica il tuo tempo al viaggio,",
  andLeaveTheSplittingToOtter: "e lascia a otter la divisione delle spese.",
  fromDinnerToAFullTripRecordEverySharedExpenseAndKeepGroupFinancesSimpleAndClear:
    "Da una cena a un intero viaggio, registra ogni spesa condivisa e mantieni semplici e chiare le finanze del gruppo.",
  splitExampleAWeekendTripDinnerCostsTwd1800ForThreePeopleOrTwd600Each:
    "Esempio di ripartizione: una cena durante un viaggio nel fine settimana costa TWD 1.800 per tre persone, ovvero TWD 600 a testa.",
  weekendTrip: "Viaggio nel fine settimana",
  splitExample: "Esempio di ripartizione",
  dinnerTogether: "Cena insieme",
  you: "Tu",
  a: "A",
  y: "T",
  splitEquallyAmong3: "Diviso in parti uguali tra 3",
  each: "a testa",
  quicklyRecordSharedExpenses: "Registra rapidamente le spese condivise",
  seeWhoOwesAndWhoIsOwedAtAGlance:
    "Vedi subito chi deve pagare e chi deve ricevere",
  settleUpWithClearSuggestions: "Salda i conti con suggerimenti chiari",
  signIn: "Accedi",
  createAccount: "Crea account",
  welcomeBackContinueYourJourney: "Bentornato. Continua il tuo viaggio.",
  createYourFirstGroupAndStartSplittingWithEase:
    "Crea il tuo primo gruppo e inizia a dividere le spese con facilità.",
  username: "Nome utente",
  enterAUsername: "Inserisci un nome utente",
  password: "Password",
  enterAPassword: "Inserisci una password",
  developmentCredentialsHaveBeenFilledIn:
    "Le credenziali di sviluppo sono state inserite.",
  signingIn: "Accesso…",
  or: "oppure",
  signInWithAPasskey: "Accedi con una Passkey",
  signingInWithAPasskey: "Accesso con una Passkey…",
  unableToSignInWithAPasskey:
    "Impossibile accedere con una Passkey. Riprova o usa la password.",
  needAnAccount: "Ti serve un account?",
  usernameIsNotCaseSensitive:
    "Il nome utente non distingue tra maiuscole e minuscole.",
  passwordMustBeAtLeast8Characters:
    "La password deve contenere almeno 8 caratteri",
  passwordMustBeAtLeast8Characters2:
    "La password deve contenere almeno 8 caratteri.",
  creating: "Creazione…",
  createAccountWithAPasskey: "Crea account con una Passkey",
  creatingAccountWithAPasskey: "Creazione dell'account con una Passkey…",
  unableToCreateAccountWithAPasskey:
    "Impossibile creare un account con una Passkey. Riprova.",
  alreadyHaveAnAccount: "Hai già un account?",
  backToSignIn: "Torna all'accesso",
  expenseParticipantsDoNotNeedAccountsToBeIncludedInAGroup:
    "I partecipanti alle spese non hanno bisogno di un account per essere inclusi in un gruppo.",
  changeNameSUsername: (values: MessageValues) =>
    interpolate("Cambia il nome utente di {name}", values),
  nameSAccountMenu: (values: MessageValues) =>
    interpolate("Menu dell'account di {name}", values),
  unableToUpdateUsername: "Impossibile aggiornare il nome utente",
  changeUsername: "Cambia nome utente",
  passkeyRegistrationRequestsTooFrequent:
    "Troppe richieste di registrazione di Passkey. Riprova più tardi.",
  passkeyRegistrationResponseIsInvalid:
    "La risposta di registrazione della Passkey non è valida",
  passkeyRegistrationRequestExpired:
    "La richiesta di registrazione della Passkey è scaduta. Riprova.",
  unableToVerifyPasskey: "Impossibile verificare la Passkey. Riprova.",
  passkeyAlreadyRegistered: "Questa Passkey è già registrata",
  passkeyNotFound: "Passkey non trovata",
  cannotRemoveOnlyPasskey:
    "Non puoi rimuovere la tua unica Passkey senza perdere l'accesso all'account",
  passkeyLoginResponseIsInvalid:
    "La risposta di accesso con Passkey non è valida",
  passkeyLoginRequestExpired:
    "La richiesta di accesso con Passkey è scaduta. Riprova.",
  unableToUsePasskeyToSignIn: "Impossibile accedere con questa Passkey",
  cancel: "Annulla",
  saving: "Salvataggio…",
  save: "Salva",
  connectionFailedPleaseTryAgainLater:
    "Connessione non riuscita. Riprova più tardi.",
  theServerReturnedAnInvalidResponse:
    "Il server ha restituito una risposta non valida.",
  everyone: "Tutti",
  unknown: "Sconosciuto",
  atLeastOneParticipantIsRequired: "È necessario almeno un partecipante",
  usedByAnExpense: "Usato in una spesa",
  youAreOfflineReconnectAndTryAgain: "Sei offline. Riconnettiti e riprova.",
  working: "Operazione in corso…",
  unableToApplyChanges: "Impossibile applicare le modifiche",
  applying: "Applicazione…",
  noBalancesYet: "Nessun saldo ancora disponibile.",
  settled: "Saldato",
  getsBack: "Deve ricevere",
  owes: "Deve pagare",
  newTaiwanDollar: "Nuovo dollaro taiwanese",
  japaneseYen: "Yen giapponese",
  usDollar: "Dollaro statunitense",
  euro: "Euro",
  singaporeDollar: "Dollaro di Singapore",
  poundSterling: "Sterlina britannica",
  australianDollar: "Dollaro australiano",
  canadianDollar: "Dollaro canadese",
  southKoreanWon: "Won sudcoreano",
  food: "Cibo",
  transport: "Trasporti",
  lodging: "Alloggio",
  tickets: "Biglietti",
  shopping: "Acquisti",
  other: "Altro",
  unsavedChangesWillBeLostDiscardTheDraft:
    "Le modifiche non salvate andranno perse. Scartare la bozza?",
  unableToSwitchGroups: "Impossibile cambiare gruppo",
  loadingGroup: "Caricamento del gruppo",
  yourSelectionWillAppearAfterItsDataLoads:
    "La selezione apparirà dopo il caricamento dei dati.",
  unableToLoadGroup: "Impossibile caricare il gruppo",
  groupSwitcher: "Selettore del gruppo",
  groups: "Gruppi",
  countActiveGroups: (values: MessageValues) =>
    interpolate(
      pluralForm("it", values.count, {
        one: "{count} gruppo attivo",
        other: "{count} gruppi attivi",
      }),
      values,
    ),
  everyTripAddsUpToSomethingWonderful:
    "Ogni viaggio crea qualcosa di meraviglioso.",
  recordSharedExpensesAndFocusOnThePeopleBesideYou:
    "Registra le spese condivise e dedica la tua attenzione alle persone accanto a te.",
  archivedAndReadOnlyDataIsPreservedTheOwnerCanRestoreItUnderMore:
    "Archiviato e di sola lettura. I dati sono conservati; il proprietario può ripristinarlo in Impostazioni gruppo.",
  addTravelCompanionsFirst: "Aggiungi prima i compagni di viaggio",
  thereIsOnlyOneParticipantAddSomeoneToSplitWithBeforeRecordingTheFirstExpense:
    "C'è un solo partecipante. Aggiungi qualcuno con cui dividere le spese prima di registrare la prima spesa.",
  addExpenseParticipant: "Aggiungi partecipante alle spese",
  switchGroups: "Cambia gruppo",
  youWillLeaveTheCurrentGroupOnlyAfterTheNewOneLoads:
    "Lascerai il gruppo attuale solo dopo il caricamento di quello nuovo.",
  participantsPeopleExpensesExpensesCurrency: (values: MessageValues) =>
    interpolate(
      "Persone: {participants} · Spese: {expenses} · {currency}",
      values,
    ),
  archived: "Archiviato",
  everydayMomentsTogether: "Momenti quotidiani insieme",
  collaborator: "Collaboratore",
  owner: "Proprietario",
  baseCurrencyCurrency: (values: MessageValues) =>
    interpolate("Valuta base {currency}", values),
  usingCustomExchangeRates: "In uso tassi di cambio personalizzati",
  usingBankOfTaiwanExchangeRates: "In uso tassi predefiniti di Bank of Taiwan",
  usingFixedFallbackRates:
    "Bank of Taiwan non è disponibile; in uso tassi fissi di riserva",
  loadingGroup2: "Caricamento del gruppo…",
  people: "Persone",
  expenses: "Spese",
  base: "Base",
  overview: "Panoramica",
  more: "Altro",
  groupWorkspace: "Area di lavoro del gruppo",
  addExpense: "Aggiungi spesa",
  archivedGroups: "Gruppi archiviati",
  unableToCreateGroup: "Impossibile creare il gruppo",
  createGroup: "Crea gruppo",
  addCompanionsAfterCreatingTheGroupThenRecordSharedExpenses:
    "Dopo aver creato il gruppo, aggiungi i compagni e registra le spese condivise.",
  groupName: "Nome del gruppo",
  fiveDaysInTokyo: "Cinque giorni a Tokyo",
  baseCurrency: "Valuta base",
} satisfies CatalogShape<typeof zhTW>;
