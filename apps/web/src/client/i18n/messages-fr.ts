import {
  type CatalogShape,
  interpolate,
  type MessageValues,
  pluralForm,
} from "./message-types.js";
import { frAi } from "./messages-ai.js";
import { frAiAuth } from "./messages-ai-auth.js";
import { automaticRateMessages } from "./messages-automatic-rates.js";
import { frAccount } from "./messages-fr-account.js";
import { frExpenses } from "./messages-fr-expenses.js";
import { frSettings } from "./messages-fr-settings.js";
import { spendingMessages } from "./messages-spending.js";
import type { zhTW } from "./messages-zh-tw.js";

export const fr = {
  ...automaticRateMessages("fr"),
  ...spendingMessages("fr"),
  ...frAi,
  ...frAiAuth,
  ...frAccount,
  ...frExpenses,
  ...frSettings,
  expenseTotalLabel: "Total",
  expenseSplitSection: "Répartir entre les personnes",
  expenseSplitHelp:
    "Sélectionnez les personnes qui partagent cette dépense, choisissez une méthode et consultez le résultat.",
  expenseTagPlaceholder: "Ajouter une étiquette…",
  addShort: "Ajouter",
  settingsShort: "Paramètres",
  close: "Fermer",
  groupDetails: "Détails du groupe",
  filters: "Filtres",
  viewAll: "Tout voir",
  personLabel: "Personne",
  preferencesLabel: "Préférences",
  profileLabel: "Profil",
  securityLabel: "Sécurité",
  backToGroups: "Retour aux groupes",
  backToExpenseList: "Retour à la liste des dépenses",
  expenseEditorUnavailable:
    "Cette dépense ne peut pas être modifiée. Elle est peut-être introuvable, ou le groupe est en lecture seule ou archivé.",
  createdLabel: "Création",
  statusLabel: "Statut",
  peopleDeletionHelp:
    "Les personnes utilisées dans le registre ne peuvent pas être supprimées. Consultez les restrictions individuelles avec le bouton d’information ou fusionnez les doublons.",
  personRestriction: (values: MessageValues) =>
    interpolate("Restrictions de suppression pour {name}", values),
  representsPeople: (values: MessageValues) =>
    interpolate("Représente {names}", values),
  expenseRateForName: (values: MessageValues) =>
    interpolate("Voir le montant et le taux de change pour {name}", values),
  rateUnavailable: "Taux indisponible (anciennes données)",
  expenseHistory: "Historique des modifications",
  expenseHistoryDescription:
    "Modifications, suppressions et restaurations des dépenses ; ne contient pas l’historique des paiements ni les anciens soldes.",
  expenseHistoryEmpty: "Aucune modification enregistrée",
  expenseHistoryMore: "Charger plus de modifications",
  expenseHistoryCreated: "Création",
  expenseHistoryUpdated: "Modification",
  expenseHistoryDeleted: "Suppression",
  expenseHistoryRestored: "Restauration",
  expenseHistoryBaseline: "État initial",
  expenseHistorySystem: "Système",
  expenseHistoryBaselineNotice:
    "État lors de l’activation de l’historique ; les modifications antérieures et l’auteur d’origine sont inconnus.",
  expenseHistoryReceiptNotice:
    "Seules les métadonnées des justificatifs sont conservées. Les images précédentes sont indisponibles.",
  expenseHistoryShares: "Montants répartis",
  expenseHistoryRate: "Taux de change enregistré",
  expenseHistoryRateBank: "Bank of Taiwan",
  expenseHistoryRateCustom: "Personnalisé pour le groupe",
  expenseHistoryRateFixed: "Fixe intégré",
  expenseHistoryRateLegacy: "Ancienne estimation",
  expenseHistoryRateTimeUnavailable: "Heure de cotation indisponible",
  expenseHistoryRateUnavailable: "Ancienne version : aucun taux enregistré",
  expenseHistoryBefore: "Avant",
  expenseHistoryAfter: "Après",
  expenseHistorySourceExpense: "Action sur la dépense",
  expenseHistorySourceCsv: "Importation CSV",
  expenseHistorySourceRestore: "Restauration de sauvegarde",
  expenseHistorySourceMerge: "Fusion de participants",
  expenseHistorySourceReceipt: "Action sur le justificatif",
  expenseHistorySourceSeed: "Données de test de développement",
  expenseHistorySourceMigration: "Migration",
  expenseHistorySourceVersionRestore: "Restauration de version",
  expenseRestoreVersion: (values: MessageValues) =>
    interpolate("Restaurer la v{version}", values),
  expenseRestoreTitle: "Restaurer une version de la dépense",
  expenseRestoreDescription:
    "Comparez la dépense actuelle et la version à restaurer. La restauration ajoute une nouvelle version ; l’historique ultérieur reste disponible.",
  expenseRestoreKeepsReceipt:
    "Le justificatif actuel reste joint. Les anciennes images de justificatifs ne sont pas restaurées.",
  expenseRestoreNoReceipt:
    "Une dépense supprimée est restaurée sans justificatif. Les anciennes images de justificatifs ne sont pas restaurées.",
  expenseRestoreMissingPerson:
    "Cette version fait référence à une personne qui n’est plus dans le groupe. Modifiez plutôt la dépense manuellement.",
  expenseRestoreUnavailable:
    "Cette dépense ne peut pas être restaurée. Rechargez la page et réessayez.",
  expenseRestoreConflict:
    "La dépense a changé. Vérifiez le dernier état avant de confirmer à nouveau.",
  expenseRestoreConfirm: "Restaurer cette version",
  expenseRestored: "Version de la dépense restaurée",
  expenseConflictParticipantsChanged:
    "Les personnes ont changé. La confirmation remplace les sélections indisponibles de payeur ou de répartition par les paramètres de la dernière dépense. Les autres champs du brouillon sont conservés ; vérifiez les montants répartis avant d’enregistrer.",
  expenseVersionConflict:
    "Cette dépense a changé. Vérifiez la dernière version avant de confirmer à nouveau.",
  expenseVersionMissing:
    "Indiquez la version de la dépense. Rechargez la page et réessayez.",
  expenseVersionInvalid: "Version de dépense non valide",
  reviewLatestExpense: "Vérifier la dernière dépense",
  confirmLatestExpenseVersion:
    "Dernière version vérifiée ; conserver mon brouillon et poursuivre la modification",
  latestExpenseMissing:
    "Cette dépense a été supprimée ou n’est plus accessible. Votre brouillon est conservé, mais ne peut pas être enregistré.",
  deleteExpenseHistoryRetained:
    "La dépense sera retirée du registre actuel et les soldes seront recalculés. L’historique des modifications est conservé ; vous pouvez restaurer une version antérieure sans son ancienne image de justificatif.",
  expenseHistoryForName: (values: MessageValues) =>
    interpolate("Historique des modifications : {name}", values),
  usernameMustBe332LettersNumbersUnderscoresOrHyphens:
    "Le nom d’utilisateur doit contenir de 3 à 32 lettres, chiffres, traits de soulignement ou traits d’union",
  travelTogetherSplitExpensesEasily:
    "Voyagez ensemble, partagez les dépenses simplement",
  goodFriendsSplitExpensesWell: "Entre amis, les dépenses se partagent bien.",
  skipToMainContent: "Aller au contenu principal",
  otterHome: "Accueil otter",
  loading: "Chargement",
  unableToLoadOtter: "Impossible de charger otter",
  loadingFailed: "Échec du chargement",
  reload: "Recharger",
  signedIn: "Connexion réussie",
  accountCreated: "Compte créé",
  unableToAuthenticate: "Impossible de s’authentifier",
  authenticationRequestsTooFrequentTryAgainLater:
    "Trop de demandes d’authentification. Réessayez plus tard.",
  usernameUpdated: "Nom d’utilisateur mis à jour",
  signedOut: "Déconnexion réussie",
  signOutFailedMessage: (values: MessageValues) =>
    interpolate("Échec de la déconnexion : {message}", values),
  pleaseTryAgainLater: "Veuillez réessayer plus tard",
  signingOut: "Déconnexion…",
  signOut: "Se déconnecter",
  authorizeCli: "Connecter la CLI",
  authorizeCliDescription:
    "Saisissez le code d’appareil affiché dans votre terminal pour autoriser cette CLI à accéder à vos données Otter.",
  deviceCode: "Code d’appareil",
  checkDeviceCode: "Continuer",
  checkingDeviceCode: "Vérification…",
  cliAccessRequest: "Demande d’accès de la CLI",
  cliAccessRequestedBy: "Demande de",
  approveCliAccess: "Autoriser l’accès",
  approvingCliAccess: "Autorisation…",
  cliAccessApproved: "CLI connectée",
  cliAccessApprovedDescription:
    "Vous pouvez fermer cette page et revenir à votre terminal.",
  deviceCodeNotFoundOrExpired: "Code d’appareil introuvable ou expiré",
  enterAValidDeviceCode: "Saisissez un code d’appareil valide",
  youAreOfflineLoadedDataIsAvailableButEditingRequiresAConnection:
    "Vous êtes hors connexion. Les données chargées sont disponibles, mais les modifications nécessitent une connexion.",
  travelTogetherSplitWithEase: "Voyagez ensemble, partagez simplement",
  spendYourTimeOnTheJourney: "Profitez de votre voyage,",
  andLeaveTheSplittingToOtter: "et laissez otter répartir les dépenses.",
  fromDinnerToAFullTripRecordEverySharedExpenseAndKeepGroupFinancesSimpleAndClear:
    "D’un dîner à un voyage complet, enregistrez chaque dépense partagée et gardez les finances du groupe simples et claires.",
  splitExampleAWeekendTripDinnerCostsTwd1800ForThreePeopleOrTwd600Each:
    "Exemple de répartition : un dîner lors d’un week-end coûte 1 800 TWD pour trois personnes, soit 600 TWD par personne.",
  weekendTrip: "Voyage de week-end",
  splitExample: "Exemple de répartition",
  dinnerTogether: "Dîner ensemble",
  you: "Vous",
  a: "A",
  y: "Y",
  splitEquallyAmong3: "Réparti également entre 3 personnes",
  each: "par personne",
  quicklyRecordSharedExpenses: "Enregistrez rapidement les dépenses partagées",
  seeWhoOwesAndWhoIsOwedAtAGlance:
    "Voyez en un coup d’œil qui doit payer et qui doit recevoir",
  settleUpWithClearSuggestions:
    "Soldez les comptes avec des suggestions claires",
  signIn: "Se connecter",
  createAccount: "Créer un compte",
  welcomeBackContinueYourJourney: "Bon retour. Poursuivez votre voyage.",
  createYourFirstGroupAndStartSplittingWithEase:
    "Créez votre premier groupe et partagez les dépenses simplement.",
  username: "Nom d’utilisateur",
  enterAUsername: "Saisissez un nom d’utilisateur",
  password: "Mot de passe",
  enterAPassword: "Saisissez un mot de passe",
  developmentCredentialsHaveBeenFilledIn:
    "Les identifiants de développement ont été renseignés.",
  signingIn: "Connexion…",
  or: "ou",
  signInWithAPasskey: "Se connecter avec une Passkey",
  signingInWithAPasskey: "Connexion avec une Passkey…",
  unableToSignInWithAPasskey:
    "Impossible de se connecter avec une Passkey. Réessayez ou utilisez votre mot de passe.",
  needAnAccount: "Besoin d’un compte ?",
  usernameIsNotCaseSensitive:
    "Le nom d’utilisateur ne distingue pas les majuscules des minuscules.",
  passwordMustBeAtLeast8Characters:
    "Le mot de passe doit contenir au moins 8 caractères",
  passwordMustBeAtLeast8Characters2:
    "Le mot de passe doit contenir au moins 8 caractères.",
  creating: "Création…",
  createAccountWithAPasskey: "Créer un compte avec une Passkey",
  creatingAccountWithAPasskey: "Création du compte avec une Passkey…",
  unableToCreateAccountWithAPasskey:
    "Impossible de créer un compte avec une Passkey. Réessayez.",
  alreadyHaveAnAccount: "Vous avez déjà un compte ?",
  backToSignIn: "Retour à la connexion",
  expenseParticipantsDoNotNeedAccountsToBeIncludedInAGroup:
    "Les participants aux dépenses n’ont pas besoin de compte pour faire partie d’un groupe.",
  changeNameSUsername: (values: MessageValues) =>
    interpolate("Modifier le nom d’utilisateur de {name}", values),
  nameSAccountMenu: (values: MessageValues) =>
    interpolate("Menu du compte de {name}", values),
  unableToUpdateUsername: "Impossible de mettre à jour le nom d’utilisateur",
  changeUsername: "Modifier le nom d’utilisateur",
  passkeyRegistrationRequestsTooFrequent:
    "Trop de demandes d’enregistrement de Passkey. Réessayez plus tard.",
  passkeyRegistrationResponseIsInvalid:
    "La réponse d’enregistrement de la Passkey n’est pas valide",
  passkeyRegistrationRequestExpired:
    "La demande d’enregistrement de la Passkey a expiré. Réessayez.",
  unableToVerifyPasskey: "Impossible de vérifier la Passkey. Réessayez.",
  passkeyAlreadyRegistered: "Cette Passkey est déjà enregistrée",
  passkeyNotFound: "Passkey introuvable",
  cannotRemoveOnlyPasskey:
    "Vous ne pouvez pas supprimer votre seule Passkey sans perdre l’accès au compte",
  passkeyLoginResponseIsInvalid:
    "La réponse de connexion par Passkey n’est pas valide",
  passkeyLoginRequestExpired:
    "La demande de connexion par Passkey a expiré. Réessayez.",
  unableToUsePasskeyToSignIn: "Impossible de se connecter avec cette Passkey",
  cancel: "Annuler",
  saving: "Enregistrement…",
  save: "Enregistrer",
  connectionFailedPleaseTryAgainLater:
    "Échec de la connexion. Veuillez réessayer plus tard.",
  theServerReturnedAnInvalidResponse:
    "Le serveur a renvoyé une réponse non valide.",
  everyone: "Tout le monde",
  unknown: "Inconnu",
  atLeastOneParticipantIsRequired: "Au moins un participant est nécessaire",
  usedByAnExpense: "Utilisé dans une dépense",
  youAreOfflineReconnectAndTryAgain:
    "Vous êtes hors connexion. Reconnectez-vous et réessayez.",
  working: "Traitement…",
  unableToApplyChanges: "Impossible d’appliquer les modifications",
  applying: "Application…",
  noBalancesYet: "Aucun solde pour le moment.",
  settled: "Soldé",
  getsBack: "À recevoir",
  owes: "À payer",
  newTaiwanDollar: "Nouveau dollar de Taïwan",
  japaneseYen: "Yen japonais",
  usDollar: "Dollar américain",
  euro: "Euro",
  singaporeDollar: "Dollar de Singapour",
  poundSterling: "Livre sterling",
  australianDollar: "Dollar australien",
  canadianDollar: "Dollar canadien",
  southKoreanWon: "Won sud-coréen",
  food: "Alimentation",
  transport: "Transport",
  lodging: "Hébergement",
  tickets: "Billets",
  shopping: "Achats",
  other: "Autres",
  unsavedChangesWillBeLostDiscardTheDraft:
    "Les modifications non enregistrées seront perdues. Abandonner le brouillon ?",
  unableToSwitchGroups: "Impossible de changer de groupe",
  loadingGroup: "Chargement du groupe",
  yourSelectionWillAppearAfterItsDataLoads:
    "Votre sélection s’affichera après le chargement de ses données.",
  unableToLoadGroup: "Impossible de charger le groupe",
  groupSwitcher: "Sélecteur de groupe",
  groups: "Groupes",
  countActiveGroups: (values: MessageValues) =>
    interpolate(
      pluralForm("fr", values.count, {
        one: "{count} groupe actif",
        other: "{count} groupes actifs",
      }),
      values,
    ),
  everyTripAddsUpToSomethingWonderful: "Chaque voyage crée de beaux souvenirs.",
  recordSharedExpensesAndFocusOnThePeopleBesideYou:
    "Enregistrez les dépenses partagées et profitez des personnes qui vous accompagnent.",
  archivedAndReadOnlyDataIsPreservedTheOwnerCanRestoreItUnderMore:
    "Archivé et en lecture seule. Les données sont conservées ; le propriétaire peut restaurer le groupe dans les paramètres du groupe.",
  addTravelCompanionsFirst: "Ajoutez d’abord vos compagnons de voyage",
  thereIsOnlyOneParticipantAddSomeoneToSplitWithBeforeRecordingTheFirstExpense:
    "Il n’y a qu’un participant. Ajoutez une personne avec qui partager avant d’enregistrer la première dépense.",
  addExpenseParticipant: "Ajouter un participant aux dépenses",
  switchGroups: "Changer de groupe",
  youWillLeaveTheCurrentGroupOnlyAfterTheNewOneLoads:
    "Vous ne quitterez le groupe actuel qu’une fois le nouveau groupe chargé.",
  participantsPeopleExpensesExpensesCurrency: (values: MessageValues) =>
    interpolate(
      "Personnes : {participants} · Dépenses : {expenses} · {currency}",
      values,
    ),
  archived: "Archivé",
  everydayMomentsTogether: "Les moments du quotidien ensemble",
  collaborator: "Collaborateur",
  owner: "Propriétaire",
  baseCurrencyCurrency: (values: MessageValues) =>
    interpolate("Devise de base : {currency}", values),
  usingCustomExchangeRates: "Taux de change personnalisés utilisés",
  usingBankOfTaiwanExchangeRates: "Taux par défaut de Bank of Taiwan utilisés",
  usingFixedFallbackRates:
    "Bank of Taiwan est indisponible ; taux fixes de secours utilisés",
  loadingGroup2: "Chargement du groupe…",
  people: "Personnes",
  expenses: "Dépenses",
  base: "Base",
  overview: "Vue d’ensemble",
  more: "Plus",
  groupWorkspace: "Espace du groupe",
  addExpense: "Ajouter une dépense",
  archivedGroups: "Groupes archivés",
  unableToCreateGroup: "Impossible de créer le groupe",
  createGroup: "Créer un groupe",
  addCompanionsAfterCreatingTheGroupThenRecordSharedExpenses:
    "Ajoutez des compagnons après la création du groupe, puis enregistrez les dépenses partagées.",
  groupName: "Nom du groupe",
  fiveDaysInTokyo: "Cinq jours à Tokyo",
  baseCurrency: "Devise de base",
  createYourFirstGroup: "Créez votre premier groupe",
  addATripOrEventGroupOrCreateOneFromAnExistingJsonBackup:
    "Ajoutez un groupe pour un voyage ou un événement, ou créez-en un à partir d’une sauvegarde JSON existante.",
  groupExpenseSummary: "Résumé des dépenses du groupe",
  totalSharedExpenses: "Total des dépenses partagées",
  convertedToBaseCurrency: "Converti en devise de base",
  outstanding: "À régler",
  countSuggestedPaymentsToSettleUp: (values: MessageValues) =>
    interpolate(
      pluralForm("fr", values.count, {
        one: "{count} paiement suggéré pour solder les comptes",
        other: "{count} paiements suggérés pour solder les comptes",
      }),
      values,
    ),
  nothingIsCurrentlyOutstanding: "Aucun montant à régler actuellement",
  settlementSuggestionsAppearAfterExpensesAreAdded:
    "Les suggestions de règlement apparaissent après l’ajout de dépenses",
  expenseRecords: "Dépenses enregistrées",
  sharedAmongCountPeople: (values: MessageValues) =>
    interpolate(
      pluralForm("fr", values.count, {
        one: "Réparti entre {count} personne",
        other: "Réparti entre {count} personnes",
      }),
      values,
    ),
  calculatedFromCurrentExpensesAndRecordedPayments:
    "Calculé à partir des dépenses actuelles et des paiements enregistrés.",
  settleUp: "Solder les comptes",
  countEntries: (values: MessageValues) =>
    interpolate(
      pluralForm("fr", values.count, {
        one: "{count} écriture",
        other: "{count} écritures",
      }),
      values,
    ),
  entries: "écritures",
  seePaymentsAndSharesAtAGlance:
    "Consultez les paiements et les parts en un coup d’œil.",
  balances: "Soldes",
  recentExpenses: "Dépenses récentes",
  noExpensesYet: "Aucune dépense pour le moment",
  thisGroupHasNotRecordedAnySharedExpenses:
    "Ce groupe n’a encore enregistré aucune dépense partagée.",
  recordTheFirstSharedExpense: "Enregistrer la première dépense partagée",
  addThePeopleSplittingExpensesToCalculateEachBalance:
    "Ajoutez d’abord les personnes qui partagent les dépenses, puis enregistrez votre première dépense. Les soldes et les suggestions de règlement apparaîtront automatiquement.",
  balancesAndSettlementSuggestionsWillAppearHereAfterYouAddExpenses:
    "Les soldes et les suggestions de règlement apparaîtront ici après l’ajout de dépenses.",
  addPerson: "Ajouter une personne",
  managePeople: "Gérer les personnes",
  everythingIsSettled: "Tout est soldé",
  thereAreNoOutstandingPayments: "Il ne reste aucun paiement à effectuer.",
  paymentRecorded: "Paiement enregistré",
  unableToRecordPayment: "Impossible d’enregistrer le paiement",
  recordPayment: "Enregistrer un paiement",
  recordSettlementPayment: "Enregistrer un paiement de règlement",
  fromPaysToTheFullSuggestedAmountIsPrefilled: (values: MessageValues) =>
    interpolate(
      "{from} paie {to} ; le montant total suggéré est prérempli.",
      values,
    ),
  paymentAmountCurrency: (values: MessageValues) =>
    interpolate("Montant du paiement ({currency})", values),
  enterAPaymentAmount: "Saisissez un montant de paiement",
  thePaymentMustBeGreaterThan0AndNoMoreThanTheSuggestedAmount:
    "Le paiement doit être supérieur à 0 et ne pas dépasser le montant suggéré",
  expectedRemainder: "Reste prévu : ",
  paymentDate: "Date du paiement",
  noteOptional: "Note (facultative)",
  recordPayment2: "Enregistrer le paiement",
  paymentHistory: "Historique des paiements",
  dateFromPaidTo: (values: MessageValues) =>
    interpolate("{date} · {from} a payé {to}", values),
  deletePayment: "Supprimer le paiement",
  remainingSettlementSuggestionsWillBeRecalculated:
    "Les suggestions de règlement restantes seront recalculées.",
  paymentDeleted: "Paiement supprimé",
  deleteFailed: "Échec de la suppression",
  deleteThisPayment: "Supprimer ce paiement ?",
  delete: "Supprimer",
  datePaidByNameSplitWithSplit: (values: MessageValues) =>
    interpolate("{date} · payé par {name} · partagé avec {split}", values),
  dailySpending: "Dépenses par jour",
  paidByPerson: "Montants payés par personne",
  byCategory: "Par catégorie",
  spendingAnalysis: "Analyse des dépenses",
  totalAmount: (values: MessageValues) =>
    interpolate("Total : {amount}", values),
  noDataYet: "Aucune donnée pour le moment.",
} satisfies CatalogShape<typeof zhTW>;
