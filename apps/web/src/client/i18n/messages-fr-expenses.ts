import {
  interpolate,
  type MessageValues,
  pluralForm,
} from "./message-types.js";

export const frExpenses = {
  showingShownOfTotalExpenses: (values: MessageValues) =>
    interpolate("Dépenses affichées : {shown} sur {total}", values),
  searchDescriptions: "Rechercher dans les descriptions",
  searchExpenseDescriptions: "Rechercher dans les descriptions des dépenses",
  sort: "Trier",
  groupBy: "Regrouper par",
  noGrouping: "Aucun regroupement",
  groupByDate: "Regrouper par date",
  groupByPayer: "Regrouper par payeur",
  dateNewestFirst: "Date : la plus récente d’abord",
  dateOldestFirst: "Date : la plus ancienne d’abord",
  amountHighToLow: "Montant : décroissant",
  amountLowToHigh: "Montant : croissant",
  moreFilters: "Plus de filtres",
  countApplied: (values: MessageValues) =>
    interpolate(
      pluralForm("fr", values.count, {
        one: "{count} appliqué",
        other: "{count} appliqués",
      }),
      values,
    ),
  datePersonCurrencyCategoryAndTag:
    "Date, personne, devise, catégorie et étiquette",
  from: "Du",
  to: "Au",
  paidBy: "Payé par",
  splitWith: "Partagé avec",
  expenseParticipants: "Participants aux dépenses",
  currency: "Devise",
  allCurrencies: "Toutes les devises",
  category: "Catégorie",
  allCategories: "Toutes les catégories",
  tag: "Étiquette",
  exactTag: "Étiquette exacte",
  applied: "Appliqués :",
  clearAll: "Tout effacer",
  allPeople: "Toutes les personnes",
  categoryValue: (values: MessageValues) =>
    interpolate("Catégorie : {value}", values),
  currencyValue: (values: MessageValues) =>
    interpolate("Devise : {value}", values),
  fromValue: (values: MessageValues) => interpolate("Du : {value}", values),
  toValue: (values: MessageValues) => interpolate("Au : {value}", values),
  tagValue: (values: MessageValues) =>
    interpolate("Étiquette : {value}", values),
  aCompleteHistoryWillAppearHereAfterTheFirstSharedExpense:
    "Un historique complet apparaîtra ici après la première dépense partagée.",
  recordFirstExpense: "Enregistrer la première dépense",
  noMatchingExpenses: "Aucune dépense correspondante",
  adjustOrClearTheFiltersToSeeAllExpenses:
    "Modifiez ou effacez les filtres pour voir toutes les dépenses.",
  clearFilters: "Effacer les filtres",
  filteredExpenses: "Dépenses filtrées",
  allExpenses: "Toutes les dépenses",
  columns: "Colonnes",
  chooseExpenseColumns: "Choisir les colonnes des dépenses",
  expenseName: "Dépense",
  splitParticipants: "Répartition",
  receipt: "Justificatif",
  tags: "Étiquettes",
  restoreDefaults: "Rétablir les valeurs par défaut",
  actions: "Actions",
  expenseGroupSummary: (values: MessageValues) =>
    interpolate(
      pluralForm("fr", values.count, {
        one: "{count} dépense · {total}",
        other: "{count} dépenses · {total}",
      }),
      values,
    ),
  countPeople: (values: MessageValues) =>
    interpolate(
      pluralForm("fr", values.count, {
        one: "{count} personne",
        other: "{count} personnes",
      }),
      values,
    ),
  viewReceiptForName: (values: MessageValues) =>
    interpolate("Voir le justificatif de {name}", values),
  receiptPreviewForName: (values: MessageValues) =>
    interpolate("Justificatif de « {name} »", values),
  receiptImageForName: (values: MessageValues) =>
    interpolate("Image du justificatif de {name}", values),
  closeReceiptPreviewHint:
    "Cliquez sur l’image ou appuyez sur Échap pour fermer.",
  closeReceiptPreview: "Fermer l’aperçu du justificatif",
  openOriginalReceipt: "Ouvrir l’image d’origine",
  moreActionsForName: (values: MessageValues) =>
    interpolate("Plus d’actions pour {name}", values),
  datePaidByName: (values: MessageValues) =>
    interpolate("{date} · payé par {name}", values),
  splitWithSplit: (values: MessageValues) =>
    interpolate("Partagé avec {split}", values),
  edit: "Modifier",
  receiptUploadFailed: "Échec de l’envoi du justificatif",
  receiptUploaded: "Justificatif envoyé",
  uploading: "Envoi…",
  uploadReceipt: "Envoyer un justificatif",
  receiptFileRequirements: "JPEG, PNG ou WebP · Jusqu’à 5 Mo",
  selectReceiptPhoto: "Envoyer une photo",
  takeReceiptPhoto: "Prendre une photo",
  removeReceiptPhoto: "Retirer la photo",
  receiptOnlineOnly:
    "Les photos nécessitent une connexion ; les brouillons hors connexion ne conservent pas les photos. Retirez la photo ou reconnectez-vous d’abord.",
  receiptFileTooLarge: "Les photos ne doivent pas dépasser 5 Mo",
  expenseSavedReceiptFailed:
    "Dépense créée, mais l’envoi du justificatif a échoué. Réessayez maintenant ou ajoutez-le plus tard depuis la liste des dépenses.",
  retryReceiptUpload: "Réessayer l’envoi du justificatif",
  receiptAlreadyAttached:
    "Cette dépense a déjà un justificatif. Consultez-le depuis la liste des dépenses ; il ne sera pas remplacé automatiquement",
  uploadReceiptLater: "Envoyer plus tard",
  expenseCreationUncertain:
    "Nous ne pouvons pas confirmer la création de la dépense. Vérifiez la liste des dépenses avant de l’ajouter à nouveau ; ne réessayez pas immédiatement.",
  viewReceipt: "Voir le justificatif",
  noReceipt: "Aucun justificatif",
  deleteReceipt: "Supprimer le justificatif",
  youCanUploadAnotherReceiptLaterTheExpenseWillNotBeDeleted:
    "Vous pourrez envoyer un autre justificatif plus tard ; la dépense ne sera pas supprimée.",
  receiptDeleted: "Justificatif supprimé",
  deleteThisReceipt: "Supprimer ce justificatif ?",
  deleteName: (values: MessageValues) =>
    interpolate("Supprimer « {name} »", values),
  thisCannotBeUndoneAllBalancesAndSettlementSuggestionsWillBeRecalculated:
    "Cette action est irréversible. Tous les soldes et toutes les suggestions de règlement seront recalculés.",
  expenseDeleted: "Dépense supprimée",
  deleteThisExpense: "Supprimer cette dépense ?",
  invalidSplitFormat: "Format de répartition non valide",
  selectAtLeastOnePersonToSplitWith:
    "Sélectionnez au moins une personne avec qui partager",
  expenseChangesSaved: "Modifications de la dépense enregistrées",
  expenseRecorded: "Dépense enregistrée",
  unableToSaveExpense: "Impossible d’enregistrer la dépense",
  reviewTheSplitPreviewBeforeSavingChanges:
    "Vérifiez l’aperçu de la répartition avant d’enregistrer les modifications.",
  enterTheRequiredDetailsFirstCustomSplitsAndTagsAreAvailableBelow:
    "Renseignez d’abord les informations obligatoires. Les répartitions personnalisées et les étiquettes sont disponibles ci-dessous.",
  editExpense: "Modifier la dépense",
  addExpense2: "Ajouter une dépense",
  discardDraft: "Abandonner le brouillon",
  unsavedChangesWillBeLostExistingDataWillNotChange:
    "Les modifications non enregistrées seront perdues. Les données existantes ne changeront pas.",
  discardThisDraft: "Abandonner ce brouillon ?",
  description: "Description",
  dinnerHotelTrainTickets: "Dîner, hôtel, billets de train",
  enterAnExpenseDescription: "Saisissez une description de dépense",
  amount: "Montant",
  enterAnExpenseAmount: "Saisissez un montant de dépense",
  date: "Date",
  currency2: "Devise",
  splitPreview: "Aperçu de la répartition",
  enterAnAmountToPreviewEachPersonsShare:
    "Saisissez un montant pour voir la part de chaque personne.",
  namePaidAmount: (values: MessageValues) =>
    interpolate("{name} a payé {amount}", values),
  changePeopleAndSplitMethod:
    "Modifier les personnes et la méthode de répartition",
  selectedSelectedOfTotal: (values: MessageValues) =>
    interpolate("Sélection : {selected} sur {total}", values),
  selectAll: "Tout sélectionner",
  clear: "Effacer",
  splitMethod: "Méthode de répartition",
  splitEqually: "Répartir également",
  exactAmounts: "Montants exacts",
  percentages: "Pourcentages",
  shares: "Parts",
  nameSKind: (values: MessageValues) => interpolate("{kind} de {name}", values),
  moreDetails: "Plus de détails",
  categoryAndTags: "Catégorie et étiquettes",
  separateWithCommasForExampleBreakfastTransport:
    "Séparez par des virgules, par exemple petit-déjeuner, transport",
  unsavedChangesWillBeLost:
    "Les modifications non enregistrées seront perdues.",
  cancelEditing: "Annuler la modification ?",
  saveChanges: "Enregistrer les modifications",
  recordExpense: "Enregistrer la dépense",
  settlementRepresentative: "Règlement confié à",
  settledByName: (values: MessageValues) =>
    interpolate("Règlement confié à {name}", values),
  settleSeparately: "Soi-même (régler séparément)",
  settlementRepresentativeHelp:
    "Les dépenses sont réparties par personne ; les soldes et les suggestions de règlement incluent le solde net d’une personne dans celui de son représentant. Un représentant ne peut pas lui-même être confié à une autre personne.",
  representativeHasDependents:
    "D’autres membres sont confiés à cette personne. Supprimez d’abord ces affectations.",
  settlementRepresentativeUpdated:
    "Représentant pour les règlements mis à jour",
  unableToUpdateSettlementRepresentative:
    "Impossible de mettre à jour le représentant pour les règlements",
  provideParticipantChanges:
    "Indiquez les informations du participant à modifier",
  invalidSettlementRepresentative:
    "Représentant pour les règlements non valide",
  settlementRepresentativeMustBeAnotherGroupMember:
    "Le représentant pour les règlements doit être un autre membre de ce groupe",
  settlementRepresentativeCannotBeAssignedOrHaveDependents:
    "Le représentant ne peut pas régler par l’intermédiaire d’une autre personne, et cette personne ne peut pas avoir de membres réglant par son intermédiaire",
  invalidBackupSettlementRepresentative:
    "Représentant pour les règlements non valide dans la sauvegarde",
  expenseParticipantAdded: "Participant aux dépenses ajouté",
  unableToAddPerson: "Impossible d’ajouter la personne",
  expenseParticipantsDoNotNeedToSignInManageAccountsWithAccessUnderMoreSharingAndAccess:
    "Les participants aux dépenses n’ont pas besoin de se connecter. Gérez les comptes ayant accès dans Paramètres du groupe → Partage et accès.",
  personsName: "Nom de la personne",
  friendsName: "Nom d’un ami",
  enterAName: "Saisissez un nom",
  archivedGroupsAreReadOnlyRestoreThisGroupToChangeParticipants:
    "Les groupes archivés sont en lecture seule. Restaurez ce groupe pour modifier les participants.",
  usedByAPayment: "Utilisé dans un paiement",
  cannotDeleteReasonUpdateRelatedExpensesFirstOrUseTheMergeToolBelow: (
    values: MessageValues,
  ) =>
    interpolate(
      "Suppression impossible : {reason}. Modifiez d’abord les dépenses concernées ou utilisez l’outil de fusion ci-dessous.",
      values,
    ),
  deleteName2: (values: MessageValues) =>
    interpolate("Supprimer {name}", values),
  thisPersonHasNoExpensesOrPaymentsDeletionCannotBeUndone:
    "Cette personne n’a ni dépense ni paiement. La suppression est irréversible.",
  expenseParticipantDeleted: "Participant aux dépenses supprimé",
  deleteThisExpenseParticipant: "Supprimer ce participant aux dépenses ?",
  nameUpdated: "Nom mis à jour",
  unableToUpdateName: "Impossible de mettre à jour le nom",
  rename: "Renommer",
  renameName: (values: MessageValues) => interpolate("Renommer {name}", values),
  existingExpensesAndPaymentsWillRemainLinkedToThisPerson:
    "Les dépenses et les paiements existants resteront liés à cette personne.",
  newName: "Nouveau nom",
  saveName: "Enregistrer le nom",
  advancedPeopleTools: "Outils avancés de gestion des personnes",
  mergeDuplicatePeople: "Fusionner les personnes en double",
  sourcePerson: "Personne source",
  targetPerson: "Personne cible",
  mergeInto: "Fusionner dans",
  changePreview: "Aperçu des modifications",
  expensesRelatedExpensesAndPaymentsPaymentsForSourceWillMoveToTargetThenTheSourcePersonWillBeDeleted:
    (values: MessageValues) =>
      interpolate(
        "Les dépenses liées ({expenses}) et les paiements ({payments}) de {source} seront transférés à {target}, puis la personne source sera supprimée.",
        values,
      ),
  mergePeople: "Fusionner les personnes",
  sourceWillBeDeletedAndRelatedDataWillBeTransferredToTargetAtomically: (
    values: MessageValues,
  ) =>
    interpolate(
      "{source} sera supprimé et les données associées seront transférées à {target} en une seule opération indivisible.",
      values,
    ),
  expenseParticipantsMerged: "Participants aux dépenses fusionnés",
  mergeFailed: "Échec de la fusion",
  applyMerge: "Appliquer la fusion ?",
  previewAndMerge: "Vérifier et fusionner",
};
