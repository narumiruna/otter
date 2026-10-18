import {
  interpolate,
  type MessageValues,
  pluralForm,
} from "./message-types.js";

export const frSettings = {
  groupSettings: "Paramètres du groupe",
  manageSharingGroupPreferencesAndDataToolsHighImpactActionsRequireConfirmation:
    "Gérez le partage, les préférences du groupe et les outils de données. Les actions importantes nécessitent une confirmation.",
  youAreACollaboratorAndCanUseDataToolsOnlyTheOwnerCanManageAccessAndGroupSettings:
    "Vous êtes collaborateur et pouvez utiliser les outils de données. Seul le propriétaire peut gérer l’accès et les paramètres du groupe.",
  sharingAndAccess: "Partage et accès",
  linksActiveLinksCollaboratorsCollaborators: (values: MessageValues) =>
    interpolate(
      "Liens actifs : {links} · Collaborateurs : {collaborators}",
      values,
    ),
  shareLinkCreated: "Lien de partage créé",
  shareLinkCreatedAndCopied: "Lien de partage créé et copié",
  shareLinks: "Liens de partage",
  chooseWhoCanEditThroughTheShareLink:
    "Choisissez qui peut consulter ou modifier les données avec ce lien.",
  linkPermission: "Autorisation du lien",
  readOnlyLink: "Lecture seule (sans connexion)",
  signedInEditLink: "Modification après connexion",
  anyoneEditLink: "Toute personne disposant du lien peut modifier",
  signedInEditLinkDescription:
    "Après connexion ou inscription, les visiteurs deviennent collaborateurs. Révoquer le lien ne supprime pas les personnes qui ont déjà rejoint le groupe.",
  anyoneEditLinkDescription:
    "Toute personne disposant du lien peut modifier les dépenses et les participants sans se connecter. Partagez-le uniquement avec des personnes de confiance ; la révocation prend effet immédiatement.",
  revokingSignedInLinkDoesNotRemoveExistingCollaborators:
    "La révocation empêche de nouvelles personnes de rejoindre le groupe. Les collaborateurs existants peuvent toujours modifier les données ; retirez leur accès séparément.",
  signInToEditSharedGroup: (values: MessageValues) =>
    interpolate(
      "Connectez-vous ou créez un compte pour modifier {name}.",
      values,
    ),
  readOnlyShareLinkCreated: "Lien de partage en lecture seule créé",
  readOnlyShareLinkCreatedAndCopied:
    "Lien de partage en lecture seule créé et copié",
  shareLinkCreatedYourBrowserBlockedAutomaticCopyingCopyItManually:
    "Lien de partage créé. Votre navigateur a bloqué la copie automatique ; copiez-le manuellement.",
  unableToCreateLink: "Impossible de créer le lien",
  shareLinkCopied: "Lien de partage copié",
  yourBrowserBlockedCopyingOpenTheLinkAndCopyItFromTheAddressBar:
    "Votre navigateur a bloqué la copie. Ouvrez le lien et copiez-le depuis la barre d’adresse.",
  anyoneWithTheLinkCanViewExpensesBalancesAndSettlementsWithoutSigningInButCannotEdit:
    "Toute personne disposant du lien peut consulter les dépenses, les soldes et les règlements sans se connecter, mais ne peut pas les modifier.",
  readOnlyShareLinks: "Liens de partage en lecture seule",
  createReadOnlyLink: "Créer un lien en lecture seule",
  anyoneWithTheLinkCanViewThisGroupsExpensesBalancesAndSettlementSuggestionsButCannotAddOrChangeData:
    "Toute personne disposant du lien peut consulter les dépenses, les soldes et les suggestions de règlement de ce groupe, mais ne peut pas ajouter ni modifier de données.",
  createAShareLink: "Créer un lien de partage ?",
  createShareLink: "Créer un lien de partage",
  revoked: "Révoqué",
  active: "Actif",
  openLink: "Ouvrir le lien",
  copy: "Copier",
  revokeLink: "Révoquer le lien",
  afterRevocationTheOldLinkWillImmediatelyStopWorking:
    "Après révocation, l’ancien lien cessera immédiatement de fonctionner.",
  shareLinkRevoked: "Lien de partage révoqué",
  revokeThisShareLink: "Révoquer ce lien de partage ?",
  revoke: "Révoquer",
  noShareLinksYet: "Aucun lien de partage pour le moment.",
  collaboratorAdded: "Collaborateur ajouté",
  unableToAddCollaborator: "Impossible d’ajouter le collaborateur",
  collaboratorsMustBeExistingUsersTheyCanManageExpensesAndParticipantsButNotOwnerSettings:
    "Les collaborateurs doivent être des utilisateurs existants. Ils peuvent gérer les dépenses et les participants, mais pas les paramètres réservés au propriétaire.",
  existingUsersUsername: "Nom d’utilisateur d’un utilisateur existant",
  addCollaborator: "Ajouter un collaborateur",
  removeName: (values: MessageValues) => interpolate("Retirer {name}", values),
  thisAccountWillNoLongerBeAbleToManageTheGroupExistingExpenseDataWillRemain:
    "Ce compte ne pourra plus gérer le groupe. Les données des dépenses existantes seront conservées.",
  collaboratorRemoved: "Collaborateur retiré",
  removeCollaborator: "Retirer le collaborateur ?",
  remove: "Retirer",
  dataAndExport: "Données et exportation",
  csvPrintBackupAndRestore: "CSV, impression, sauvegarde et restauration",
  exportingDoesNotChangeGroupData:
    "L’exportation ne modifie pas les données du groupe.",
  exportAndPrint: "Exporter et imprimer",
  expenseCsvExported: "CSV des dépenses exporté",
  exportExpenseCsv: "Exporter le CSV des dépenses",
  settlementCsvExported: "CSV des règlements exporté",
  exportSettlementCsv: "Exporter le CSV des règlements",
  print: "Imprimer",
  completeBackupDownloaded: "Sauvegarde complète téléchargée",
  downloadFailed: "Échec du téléchargement",
  downloadCompleteBackup: "Télécharger la sauvegarde complète",
  expenseCsvImported: "CSV des dépenses importé",
  importFailed: "Échec de l’importation",
  allRowsAreCheckedFirstNoDataIsWrittenIfAnyRowHasAnError:
    "Toutes les lignes sont d’abord vérifiées. Aucune donnée n’est enregistrée si une ligne contient une erreur.",
  importExpenseCsv: "Importer un CSV de dépenses",
  chooseCsv: "Choisir un CSV",
  importPreview: "Aperçu de l’importation",
  rowsRowsCanBeImportedErrorsErrors: (values: MessageValues) =>
    interpolate("Lignes importables : {rows} ; erreurs : {errors}.", values),
  rowRowMessage: (values: MessageValues) =>
    interpolate("Ligne {row} : {message}", values),
  importCountExpenses: (values: MessageValues) =>
    interpolate(
      pluralForm("fr", values.count, {
        one: "Importer {count} dépense",
        other: "Importer {count} dépenses",
      }),
      values,
    ),
  thisWillAddCountExpensesAtOnceAndRecalculateBalances: (
    values: MessageValues,
  ) =>
    interpolate(
      pluralForm("fr", values.count, {
        one: "Cette action ajoutera {count} dépense en une fois et recalculera les soldes.",
        other:
          "Cette action ajoutera {count} dépenses en une fois et recalculera les soldes.",
      }),
      values,
    ),
  applyCsvImport: "Appliquer l’importation CSV ?",
  applyImport: "Appliquer l’importation",
  invalidBackupFormat: "Format de sauvegarde non valide",
  backupRestoredAsANewGroup: "Sauvegarde restaurée dans un nouveau groupe",
  restoreFailed: "Échec de la restauration",
  restoringCreatesANewGroupAndDoesNotOverwriteCurrentData:
    "La restauration crée un nouveau groupe et ne remplace pas les données actuelles.",
  restoreJsonBackup: "Restaurer une sauvegarde JSON",
  chooseJsonBackup: "Choisir une sauvegarde JSON",
  restorePreviewName: (values: MessageValues) =>
    interpolate("Aperçu de la restauration : {name}", values),
  peoplePeopleExpensesExpensesPaymentsPaymentsBaseCurrency: (
    values: MessageValues,
  ) =>
    interpolate(
      "Personnes : {people} · Dépenses : {expenses} · Paiements : {payments} · Devise de base : {currency}",
      values,
    ),
  createNewGroup: "Créer un nouveau groupe",
  aNewGroupNamedNameWillBeCreatedWithoutChangingExistingGroups: (
    values: MessageValues,
  ) =>
    interpolate(
      "Un nouveau groupe nommé « {name} » sera créé sans modifier les groupes existants.",
      values,
    ),
  restoreThisBackup: "Restaurer cette sauvegarde ?",
  createNewGroup2: "Créer un nouveau groupe",
  copyGroup: "Dupliquer le groupe",
  copyThisGroup: "Dupliquer ce groupe ?",
  copyGroupDescription:
    "Copiez les personnes, la devise de base et les taux personnalisés dans un nouveau groupe. Les dépenses, les paiements de règlement, les collaborateurs et les liens de partage ne sont pas copiés. Le groupe d’origine reste inchangé.",
  groupCopied: "Groupe dupliqué",
  groupPreferences: "Préférences du groupe",
  changingTheBaseCurrencyRecalculatesDisplayedAmountsAndClearsCustomExchangeRates:
    "Changer la devise de base recalcule les montants affichés et efface les taux de change personnalisés.",
  nameAndBaseCurrency: "Nom et devise de base",
  totalSpendingWillDisplayAsAmountBalancesAndSettlementsBelowWillBeConverted: (
    values: MessageValues,
  ) =>
    interpolate(
      "Le total des dépenses sera affiché à {amount} ; les soldes et les règlements ci-dessous seront convertis.",
      values,
    ),
  expectCountSettlementSuggestionsCustomRatesWillResetToBuiltInValues: (
    values: MessageValues,
  ) =>
    interpolate(
      pluralForm("fr", values.count, {
        one: "{count} suggestion de règlement prévue ; les taux personnalisés seront réinitialisés aux valeurs par défaut de Bank of Taiwan.",
        other:
          "{count} suggestions de règlement prévues ; les taux personnalisés seront réinitialisés aux valeurs par défaut de Bank of Taiwan.",
      }),
      values,
    ),
  cancelChanges: "Annuler les modifications",
  applyGroupPreferences: "Appliquer les préférences du groupe",
  changeTheBaseCurrencyToCurrencyRecalculateAllResultsAndClearCustomRates: (
    values: MessageValues,
  ) =>
    interpolate(
      "Passer la devise de base à {currency}, recalculer tous les résultats et effacer les taux personnalisés.",
      values,
    ),
  renameTheGroupToName: (values: MessageValues) =>
    interpolate("Renommer le groupe « {name} ».", values),
  applyTheseChanges: "Appliquer ces modifications ?",
  applyChanges: "Appliquer les modifications",
  groupPreferencesApplied: "Préférences du groupe appliquées",
  saveFailed: "Échec de l’enregistrement",
  customExchangeRatesApplied: "Taux de change personnalisés appliqués",
  unableToSaveExchangeRates: "Impossible d’enregistrer les taux de change",
  currencyConversion: "Conversion de devises",
  countCustomRates: (values: MessageValues) =>
    interpolate(
      pluralForm("fr", values.count, {
        one: "{count} taux personnalisé",
        other: "{count} taux personnalisés",
      }),
      values,
    ),
  setHowMuch1UnitOfEachCurrencyEqualsInCurrencyLeaveBlankToUseTheBuiltInFixedRate:
    (values: MessageValues) =>
      interpolate(
        "Indiquez la valeur d’une unité de chaque devise en {currency}. Les taux non définis utilisent automatiquement les taux moyens au comptant de Bank of Taiwan.",
        values,
      ),
  customExchangeRates: "Taux de change personnalisés",
  bankOfTaiwanSpotMidRateDescription:
    "Les nouvelles dépenses sans taux personnalisé utilisent le taux moyen au comptant de Bank of Taiwan et conservent cette cotation. Effacer les taux personnalisés affecte les dépenses futures ; les paiements utilisent toujours les taux actuels.",
  loadBankOfTaiwanSpotMidRates: "Charger les taux par défaut de Bank of Taiwan",
  loadingBankExchangeRates: "Chargement des taux de change bancaires…",
  bankOfTaiwanSpotMidRatesLoadedAtTime: (values: MessageValues) =>
    interpolate(
      "Taux moyens au comptant de Bank of Taiwan chargés ({time}).",
      values,
    ),
  bankOfTaiwanDefaultRatesApplied: "Taux par défaut de Bank of Taiwan rétablis",
  unableToLoadBankExchangeRates:
    "Les taux de change bancaires sont actuellement indisponibles. Réessayez plus tard.",
  conversionPreview: "Aperçu de la conversion",
  totalSpendingAmountCountSettlementSuggestions: (values: MessageValues) =>
    interpolate(
      pluralForm("fr", values.count, {
        one: "Total des dépenses : {amount} · {count} suggestion de règlement.",
        other:
          "Total des dépenses : {amount} · {count} suggestions de règlement.",
      }),
      values,
    ),
  applyRates: "Appliquer les taux",
  allTotalsBalancesAndSettlementSuggestionsWillBeRecalculatedWithTheseRates:
    "Les dépenses existantes conservent leurs taux. Les nouvelles dépenses, les dépenses dont le taux est recalculé et les paiements existants utilisent les taux mis à jour.",
  applyCustomExchangeRates: "Appliquer les taux de change personnalisés ?",
  restoreBankOfTaiwanDefaultRates:
    "Rétablir les taux par défaut de Bank of Taiwan ?",
  apiWriteSettings: "Accès en écriture par API",
  apiWritesAllowed: "Autorisé",
  apiWritesBlocked: "Non autorisé",
  apiWriteSettingsDescription:
    "Par défaut, les jetons API et la CLI ne peuvent pas modifier ce groupe. Une fois l’option activée, les membres disposant de jetons API peuvent modifier les données selon leurs autorisations. Les actions dans le navigateur ne sont pas affectées.",
  allowApiWrites: "Autoriser les modifications par jeton API",
  apiWriteSettingSaved: "Accès en écriture par API mis à jour",
  groupLifecycle: "Cycle de vie du groupe",
  archivedReadOnly: "Archivé · lecture seule",
  active2: "Actif",
  afterRestoringDataCanBeAddedAndChangedAgain:
    "Après la restauration, les données peuvent à nouveau être ajoutées et modifiées.",
  archivingPreservesAllDataButMakesTheGroupReadOnly:
    "L’archivage conserve toutes les données, mais rend le groupe accessible en lecture seule.",
  restoreGroup: "Restaurer le groupe",
  archiveGroup: "Archiver le groupe",
  afterRestoringTheOwnerAndCollaboratorsCanEditDataAgain:
    "Après la restauration, le propriétaire et les collaborateurs peuvent à nouveau modifier les données.",
  expensesPeopleAndPaymentRecordsArePreservedAndCannotBeChangedWhileArchived:
    "Les dépenses, les personnes et les paiements enregistrés sont conservés et ne peuvent pas être modifiés pendant l’archivage.",
  groupRestored: "Groupe restauré",
  groupArchived: "Groupe archivé",
  restoreThisGroup: "Restaurer ce groupe ?",
  archiveThisGroup: "Archiver ce groupe ?",
  thisPermanentlyDeletesAllPeopleExpensesReceiptsAndSettlementRecordsAndCannotBeUndone:
    "Cette action supprime définitivement toutes les personnes, les dépenses, les justificatifs et les règlements enregistrés. Elle est irréversible.",
  deleteGroup: "Supprimer le groupe",
  enterNameToConfirm: (values: MessageValues) =>
    interpolate("Saisissez « {name} » pour confirmer", values),
  permanentlyDeleteName: (values: MessageValues) =>
    interpolate("Supprimer définitivement « {name} »", values),
  thisCannotBeUndoneCancelingMakesNoChanges:
    "Cette action est irréversible. Annuler ne modifie rien.",
  permanentlyDeleteThisGroup: "Supprimer définitivement ce groupe ?",
  permanentlyDeleteGroup: "Supprimer définitivement le groupe",
  groupDeleted: "Groupe supprimé",
  readOnlyShare: "Partage en lecture seule",
  youCanViewExpensesBalancesAndSettlementSuggestionsButCannotEditData:
    "Vous pouvez consulter les dépenses, les soldes et les suggestions de règlement, mais ne pouvez pas modifier les données.",
  completeExpenseHistory: "Historique complet des dépenses",
  manageGroupSettings: "Gérer les paramètres du groupe",
  csvImportFailed: "Échec de l’importation CSV",
  theCsvHasNoData: "Le CSV ne contient aucune donnée",
  missingColumnsColumns: (values: MessageValues) =>
    interpolate("Colonnes manquantes : {columns}", values),
  participantNotFoundName: (values: MessageValues) =>
    interpolate("Participant introuvable : {name}", values),
  invalidJsonFormat: "Format JSON non valide",
  incorrectUsernameOrPassword: "Nom d’utilisateur ou mot de passe incorrect",
  everyPersonNeedsAnAmountForACustomSplit:
    "Un montant est nécessaire pour chaque personne dans une répartition personnalisée",
  unsupportedBackupVersion: "Version de sauvegarde non prise en charge",
  unsupportedSplitMethod: "Méthode de répartition non prise en charge",
  unsupportedExchangeRateCurrency:
    "Devise de taux de change non prise en charge",
  unsupportedBaseCurrency: "Devise de base non prise en charge",
  unsupportedCurrency: "Devise non prise en charge",
  aParticipantCannotBeMergedIntoThemselves:
    "Un participant ne peut pas être fusionné avec lui-même",
  theOwnerCannotBeRemoved: "Le propriétaire ne peut pas être retiré",
  thePayerAndRecipientMustBeDifferent:
    "Le payeur et le bénéficiaire doivent être différents",
  payerIsRequired: "Un payeur est nécessaire",
  thePayerMustBeAParticipant: "Le payeur doit être un participant",
  serverError: "Erreur du serveur",
  invalidPaymentRecordsInBackup:
    "Paiements enregistrés non valides dans la sauvegarde",
  splitTotalsInBackupAreInvalid:
    "Les totaux de répartition dans la sauvegarde ne sont pas valides",
  invalidSplitDataInBackup:
    "Données de répartition non valides dans la sauvegarde",
  invalidExchangeRatesInBackup: "Taux de change non valides dans la sauvegarde",
  invalidParticipantDataInBackup:
    "Données des participants non valides dans la sauvegarde",
  backupContainsDuplicateParticipants:
    "La sauvegarde contient des participants en double",
  invalidBaseCurrencyInBackup: "Devise de base non valide dans la sauvegarde",
  invalidExpenseCategoryInBackup:
    "Catégorie de dépense non valide dans la sauvegarde",
  anExpenseParticipantInTheBackupDoesNotExist:
    "Un participant aux dépenses dans la sauvegarde n’existe pas",
  anExpenseInTheBackupHasDuplicateParticipants:
    "Une dépense dans la sauvegarde contient des participants en double",
  invalidExpenseDataInBackup:
    "Données de dépenses non valides dans la sauvegarde",
  invalidExpenseTagsInBackup:
    "Étiquettes de dépenses non valides dans la sauvegarde",
  invalidTripNameInBackup: "Nom de voyage non valide dans la sauvegarde",
  backupIsMissingItsTrip: "Le voyage est absent de la sauvegarde",
  backupIsMissingParticipants: "Les participants sont absents de la sauvegarde",
  backupIsMissingExpenses: "Les dépenses sont absentes de la sauvegarde",
  notesCanBeUpTo160Characters:
    "Les notes peuvent contenir jusqu’à 160 caractères",
  theShareLinkIsInvalidOrHasBeenRevoked:
    "Le lien de partage n’est pas valide ou a été révoqué",
  atLeastOneSplitParticipantIsRequired:
    "Au moins un participant à la répartition est nécessaire",
  splitParticipantsMustBelongToTheTrip:
    "Les participants à la répartition doivent faire partie du voyage",
  splitAmountsMustAddUpToTheExpenseAmount:
    "La somme des montants répartis doit être égale au montant de la dépense",
  splitAmountsMustBeGreaterThan0:
    "Les montants répartis doivent être supérieurs à 0",
  invalidSplitAmount: "Montant de répartition non valide",
  invalidCategoryOrTagFormat: "Format de catégorie ou d’étiquette non valide",
  exchangeRatesMustBeGreaterThan0:
    "Les taux de change doivent être supérieurs à 0",
  invalidExchangeRateFormat: "Format de taux de change non valide",
  aParticipantWithThisNameAlreadyExists:
    "Un participant portant ce nom existe déjà",
  thisParticipantHasPaymentRecordsAndCannotBeDeleted:
    "Ce participant a des paiements enregistrés et ne peut pas être supprimé",
  thisParticipantHasExpensesAndCannotBeDeleted:
    "Ce participant a des dépenses et ne peut pas être supprimé",
  onlyTheOwnerCanDownloadACompleteBackup:
    "Seul le propriétaire peut télécharger une sauvegarde complète",
  onlyTheOwnerCanManageShareLinks:
    "Seul le propriétaire peut gérer les liens de partage",
  onlyTheOwnerCanManageCollaborators:
    "Seul le propriétaire peut gérer les collaborateurs",
  onlyTheOwnerCanManageTripSettings:
    "Seul le propriétaire peut gérer les paramètres du voyage",
  namesCanBeUpTo80Characters: "Les noms peuvent contenir jusqu’à 80 caractères",
  passwordMustBeAtLeast8Characters3:
    "Le mot de passe doit contenir au moins 8 caractères",
  invalidArchiveStatus: "Statut d’archivage non valide",
  invalidApiWriteSetting: "Paramètre d’accès en écriture par API non valide",
  onlyBrowserSessionsCanManageApiWrites:
    "Seules les sessions de navigateur peuvent gérer l’accès en écriture par API",
  apiWritesDisabledForThisGroup:
    "Ce groupe n’autorise pas les modifications par jeton API",
  apiEndpointNotFound: "Point d’accès API introuvable",
  paymentRecordNotFound: "Paiement enregistré introuvable",
  collaboratorNotFound: "Collaborateur introuvable",
  participantNotFound: "Participant introuvable",
  noActiveShareLinkWasFound: "Aucun lien de partage actif trouvé",
  expenseNotFound: "Dépense introuvable",
  receiptNotFound: "Justificatif introuvable",
  tripNotFound: "Voyage introuvable",
  userNotFound: "Utilisateur introuvable",
  descriptionMustBe1120Characters:
    "La description doit contenir de 1 à 120 caractères",
  theOwnerIsAlreadyInTheCollaboratorList:
    "Le propriétaire figure déjà dans la liste des collaborateurs",
  thisGroupIsArchivedRestoreItBeforeEditing:
    "Ce groupe est archivé. Restaurez-le avant de le modifier.",
  receiptsMustBeJpegPngOrWebpImages:
    "Les justificatifs doivent être des images JPEG, PNG ou WebP",
  theRecipientMustBeAParticipant: "Le bénéficiaire doit être un participant",
  aTripWithThisNameAlreadyExists: "Un voyage portant ce nom existe déjà",
  dateMustUseTheYyyyMmDdFormat: "La date doit utiliser le format YYYY-MM-DD",
  upTo10TagsAreAllowed: "Jusqu’à 10 étiquettes sont autorisées",
  tagsCanBeUpTo24Characters:
    "Les étiquettes peuvent contenir jusqu’à 24 caractères",
  invalidTagFormat: "Format d’étiquette non valide",
  theTargetParticipantMustBelongToTheTrip:
    "Le participant cible doit faire partie du voyage",
  signInFirst: "Connectez-vous d’abord",
  provideExpenseChanges: "Indiquez les modifications de la dépense",
  provideTripChanges: "Indiquez les modifications du voyage",
  requestBodyIsTooLarge: "Le corps de la requête est trop volumineux",
  selectAtLeastOneSplitParticipant:
    "Sélectionnez au moins un participant à la répartition",
  enterATripNameOf1100Characters:
    "Saisissez un nom de voyage de 1 à 100 caractères",
  enterAnExpenseDescriptionOf1120Characters:
    "Saisissez une description de dépense de 1 à 120 caractères",
  enterAParticipantNameOf180Characters:
    "Saisissez un nom de participant de 1 à 80 caractères",
  enterAUsernameAndPassword:
    "Saisissez un nom d’utilisateur et un mot de passe",
  enterSplitValues: "Saisissez les valeurs de répartition",
  enterAValidPaymentDate: "Saisissez une date de paiement valide",
  enterValidSplitShares: "Saisissez des parts de répartition valides",
  enterValidSplitPercentages:
    "Saisissez des pourcentages de répartition valides",
  enterValidSplitAmounts: "Saisissez des montants de répartition valides",
  enterAValidExpenseDate: "Saisissez une date de dépense valide",
  chooseACsvFile: "Choisissez un fichier CSV",
  selectSplitParticipants: "Sélectionnez les participants à la répartition",
  chooseAReceiptImage: "Choisissez une image de justificatif",
  thisUserIsAlreadyACollaborator: "Cet utilisateur est déjà collaborateur",
  thisUsernameIsAlreadyRegistered: "Ce nom d’utilisateur est déjà enregistré",
  usernameIsBeingRegisteredOrAlreadyRegistered:
    "Ce nom d’utilisateur est en cours d’enregistrement ou est déjà pris",
  usernameIsBeingRegistered:
    "Ce nom d’utilisateur est en cours d’enregistrement",
  usernameOrPasskeyAlreadyRegistered:
    "Ce nom d’utilisateur ou cette Passkey est déjà enregistré",
  invalidAmount: "Montant non valide",
  theDefaultDevelopmentAccountsUsernameCannotBeChanged:
    "Le nom d’utilisateur du compte de développement par défaut ne peut pas être modifié",
  language: "Langue",
  english: "Anglais",
  traditionalChinese: "Chinois traditionnel",
};
