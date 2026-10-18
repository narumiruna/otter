import {
  interpolate,
  type MessageValues,
  pluralForm,
} from "./message-types.js";

export const frAccount = {
  browserExpenseDefaults: "Valeurs par défaut des dépenses dans ce navigateur",
  browserExpenseDefaultsHelp:
    "Efface uniquement les valeurs par défaut de devise et de répartition de ce compte pour ce groupe. Les comptes, la connexion et les autorisations ne changent pas.",
  clearPersonalPreferences:
    "Effacer les valeurs par défaut des dépenses pour ce groupe",
  expenseDefaultsCleared:
    "Valeurs par défaut des dépenses effacées pour ce groupe.",
  personalPreferencesChanged:
    "Vos paramètres de répartition ne sont plus disponibles. Des valeurs par défaut valides sont utilisées ; sélectionnez à nouveau vos paramètres.",
  personalStorageFailed:
    "Impossible d’enregistrer les valeurs par défaut des dépenses. Les paramètres actuels restent disponibles, mais peuvent être perdus à la réouverture de la page.",
  rememberExpenseDefaults:
    "Mémoriser la devise et les paramètres de répartition",
  expenseDefaultsRemembered:
    "Devise et paramètres de répartition enregistrés pour ce groupe.",
  deleteExpense: "Supprimer la dépense",
  copyExpense: "Copier comme nouvelle dépense",
  copyExpenseNamed: (values: MessageValues) =>
    interpolate("Copier {name} comme nouvelle dépense", values),
  memberAccounts: "Comptes des membres",
  accountPaid: "Payé",
  accountShared: "Part",
  accountBalance: "À recevoir / à payer",
  accountReceivable: "À recevoir",
  accountPayable: "À payer",
  accountSettled: "Soldé",
  accountPaidHelp:
    "Le montant payé correspond aux paiements aux commerces et autres fournisseurs de dépenses. Il exclut les remboursements entre membres.",
  accountTotalsHelp:
    "La part est le montant des dépenses dû par chaque membre. Les soldes incluent aussi les paiements enregistrés et les ajustements liés aux représentants. Les brouillons non synchronisés sont exclus.",
  accountDetails: "Voir les détails",
  accountPaidExpenses: "Dépenses payées pour le groupe",
  accountSharedExpenses: "Dépenses partagées",
  accountExpenseTotal: "Montant total de la dépense",
  accountPayments: "Paiements envoyés / reçus",
  accountPaymentSent: "Envoyé",
  accountPaymentReceived: "Reçu",
  accountAdjustments: "Ajustements liés aux représentants",
  accountDetailsUnavailable:
    "Les détails des paiements ne sont pas inclus dans ce partage. Les soldes utilisent les résultats du calcul du groupe.",
  accountRepresentedBy: (values: MessageValues) =>
    interpolate(
      "{name} règle pour ce membre. Un solde nul ne signifie pas que ce membre a effectué un paiement.",
      values,
    ),
  visaSettlementTitle: "Règlements selon les taux Visa",
  visaSettlementCurrency: "Devise de règlement",
  visaSettlementEnable:
    "Convertir toutes les dépenses avec les taux Visa datés et régler dans la devise sélectionnée",
  visaSettlementHelp:
    "Désactivé par défaut. Les montants d’origine restent inchangés. L’activation enregistre un taux Visa pour chaque date de dépense et utilise la devise sélectionnée pour les soldes et les règlements. S’applique à toutes les dépenses, y compris en espèces, sans frais bancaires. Les taux Visa sont indicatifs ; les relevés de carte peuvent différer. Les paiements existants doivent utiliser la devise sélectionnée avant l’activation ou le changement de devise.",
  visaSettlementSaved: "Paramètre de règlement Visa enregistré",
  visaSettlementOn: (values: MessageValues) =>
    interpolate("Activé · {currency}", values),
  visaSettlementOff: "Désactivé",
  visaRateLabel: "Visa",
  visaSettingInvalid: "Paramètre de règlement Visa non valide",
  visaIncompatiblePayments:
    "Les paiements existants doivent utiliser la devise de règlement sélectionnée",
  visaSettingUnavailable:
    "Les taux Visa sont indisponibles. Le paramètre n’a pas été modifié. Réessayez plus tard.",
  visaPaymentCurrency:
    "Les paiements de règlement Visa doivent utiliser la devise sélectionnée",
  visaRateUnavailable: (values: MessageValues) =>
    interpolate(
      "Le taux Visa {currency}/{target} du {date} est indisponible. Réessayez plus tard.",
      values,
    ),
  offlineQueueBanner:
    "Hors connexion : les données chargées restent disponibles. Vous pouvez enregistrer de nouvelles dépenses sur cet appareil ; les autres modifications nécessitent une connexion.",
  queueSave: "Enregistrer sur cet appareil",
  queueSaved:
    "Enregistré sur cet appareil. Pas encore inclus dans les soldes ; les taux de change seront fixés lors de la synchronisation.",
  queueStorageError:
    "Impossible d’enregistrer sur cet appareil. Gardez cette page ouverte et réessayez.",
  queueTitle: "Dépenses non synchronisées",
  queueNotice:
    "Uniquement sur cet appareil. Non incluses dans les soldes. Les taux de change sont fixés lors de la synchronisation. Effacer les données du navigateur fait perdre ces brouillons.",
  queuePending: "En attente de synchronisation",
  queueAttempted:
    "Synchronisation en attente de confirmation ; conservez la demande d’origine sans modification",
  queueConflict:
    "Synchronisation arrêtée. Vérifiez l’accès et les participants avant de réessayer ; la demande d’origine est conservée.",
  queueInvalid: "Non enregistré. Modifiez le brouillon et réessayez.",
  queueEdit: "Modifier le brouillon",
  queueRetry: "Réessayer la demande d’origine",
  queueDelete: "Supprimer le brouillon local",
  queueDeleteConfirm:
    "Supprimer ce brouillon local ? Une demande déjà envoyée peut avoir été enregistrée sur le serveur. Vérifiez d’abord le groupe.",
  queueCount: (values: MessageValues) =>
    interpolate(
      pluralForm("fr", values.count, {
        one: "{count} dépense non synchronisée sur cet appareil",
        other: "{count} dépenses non synchronisées sur cet appareil",
      }),
      values,
    ),
  queueSyncPricing:
    "L’aperçu affiche uniquement la devise d’origine. Le serveur fixe le taux de change lors de la synchronisation.",
  queueOrphanTitle: "Brouillons de groupes indisponibles",
  queueOrphanNotice:
    "Ces groupes ne sont plus accessibles. Une demande envoyée peut avoir été enregistrée ; vérifiez avant de supprimer sa copie locale.",
  queueOrphanTrip: (values: MessageValues) =>
    interpolate("Identifiant du groupe : {id}", values),
  accountSettings: "Paramètres du compte",
  manageYourUsernameAndPasskeys:
    "Gérez l’apparence, la langue, le nom d’utilisateur, les Passkeys et les jetons API.",
  appearance: "Apparence",
  chooseHowOtterLooksOnThisBrowser:
    "Choisissez l’apparence d’Otter. Les modifications s’appliquent immédiatement et sont enregistrées dans ce navigateur.",
  colorTheme: "Thème de couleurs",
  forestTheme: "Forêt",
  oceanTheme: "Océan",
  lavenderTheme: "Lavande",
  sunsetTheme: "Coucher de soleil",
  roseTheme: "Rose",
  displayMode: "Mode d’affichage",
  systemMode: "Système",
  lightMode: "Clair",
  darkMode: "Sombre",
  useTheNewUsernameTheNextTimeYouSignInYourCurrentSessionWillContinue:
    "Utilisez le nouveau nom d’utilisateur lors de votre prochaine connexion. Votre session actuelle reste ouverte.",
  passkeys: "Passkeys",
  useAPasskeyToSignInWithoutYourPassword:
    "Utilisez le déverrouillage de votre appareil pour vous connecter sans saisir votre mot de passe.",
  unableToLoadPasskeys: "Impossible de charger les Passkeys",
  unableToAddPasskey:
    "Impossible d’ajouter une Passkey. Si vous avez annulé, réessayez.",
  unableToRemovePasskey: "Impossible de supprimer la Passkey",
  passkeyAdded: "Passkey ajoutée",
  passkeyRemoved: "Passkey supprimée",
  passkeyNumber: (values: MessageValues) =>
    interpolate("Passkey {number}", values),
  addedOnDate: (values: MessageValues) =>
    interpolate("Ajoutée le {date}", values),
  removePasskeyNumber: (values: MessageValues) =>
    interpolate("Supprimer la Passkey {number}", values),
  noPasskeysAdded: "Aucune Passkey ajoutée pour le moment.",
  addingPasskey: "Ajout de la Passkey…",
  addPasskey: "Ajouter une Passkey",
  thisBrowserDoesNotSupportPasskeys:
    "Ce navigateur ne prend pas en charge les Passkeys.",
  apiTokens: "Jetons API",
  useApiTokensWithTheOtterCli:
    "Créez des jetons Bearer pour la CLI Otter ou les outils d’automatisation.",
  loadingApiTokens: "Chargement des jetons API…",
  unableToLoadApiTokens: "Impossible de charger les jetons API",
  unableToCreateApiToken: "Impossible de créer le jeton API",
  apiTokenCreationUncertain:
    "Le résultat de la demande de jeton est inconnu. Réessayez cette demande avant d’en créer une autre.",
  retryApiTokenCreation: "Réessayer la création du jeton",
  unableToRevokeApiToken: "Impossible de révoquer le jeton API",
  unableToCopyApiToken: "Impossible de copier le jeton API",
  apiTokenRevoked: "Jeton API révoqué",
  apiTokenCopied: "Jeton API copié",
  enterATokenName: "Saisissez un nom de jeton",
  newApiToken: "Nouveau jeton API",
  copyYourApiTokenNow: "Copiez votre jeton API maintenant",
  apiTokenShownOnce:
    "Ce jeton n’est affiché qu’une seule fois. Vous ne pourrez plus le consulter après avoir quitté cette page.",
  copyToken: "Copier le jeton",
  done: "Terminé",
  tokenName: "Nom du jeton",
  tokenNameExample: "Par exemple : Automatisation des voyages",
  creatingApiToken: "Création du jeton…",
  createApiToken: "Créer un jeton API",
  apiTokenDates: (values: MessageValues) =>
    interpolate("Créé le {created} · Expire le {expires}", values),
  revokeNamedApiToken: (values: MessageValues) =>
    interpolate("Révoquer le jeton API « {name} »", values),
  noActiveApiTokens: "Aucun jeton API actif.",
  apiTokensExpireAfter90Days:
    "Les jetons expirent après 90 jours. Pour en utiliser un avec la CLI, définissez-le comme",
  welcomeBackEyebrow: "BON RETOUR",
  startNewJourneyEyebrow: "COMMENCEZ UN NOUVEAU VOYAGE",
  parchmentTheme: "Parchemin",
};
