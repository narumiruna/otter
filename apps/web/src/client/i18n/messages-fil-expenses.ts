import { interpolate, type MessageValues } from "./message-types.js";

export const filExpenses = {
  allCurrencies: "Lahat ng pera",
  category: "Kategorya",
  allCategories: "Lahat ng kategorya",
  tag: "Tag",
  exactTag: "Eksaktong tag",
  applied: "Inilapat:",
  clearAll: "Burahin lahat",
  allPeople: "Lahat ng tao",
  categoryValue: (values: MessageValues) =>
    interpolate("Kategorya: {value}", values),
  currencyValue: (values: MessageValues) =>
    interpolate("Pera: {value}", values),
  fromValue: (values: MessageValues) => interpolate("Mula: {value}", values),
  toValue: (values: MessageValues) => interpolate("Hanggang: {value}", values),
  tagValue: (values: MessageValues) => interpolate("Tag: {value}", values),
  aCompleteHistoryWillAppearHereAfterTheFirstSharedExpense:
    "Lilitaw dito ang kumpletong kasaysayan pagkatapos ng unang pinaghatiang gastos.",
  recordFirstExpense: "Itala ang unang gastos",
  noMatchingExpenses: "Walang katugmang gastos",
  adjustOrClearTheFiltersToSeeAllExpenses:
    "Baguhin o burahin ang mga filter upang makita ang lahat ng gastos.",
  clearFilters: "Burahin ang mga filter",
  filteredExpenses: "Mga na-filter na gastos",
  allExpenses: "Lahat ng gastos",
  columns: "Mga column",
  chooseExpenseColumns: "Piliin ang mga column ng gastos",
  expenseName: "Gastos",
  splitParticipants: "Mga kahati",
  receipt: "Resibo",
  tags: "Mga tag",
  restoreDefaults: "Ibalik ang mga default",
  actions: "Mga aksyon",
  expenseGroupSummary: (values: MessageValues) =>
    interpolate("Mga gastos: {count} · {total}", values),
  countPeople: (values: MessageValues) =>
    interpolate("Mga tao: {count}", values),
  viewReceiptForName: (values: MessageValues) =>
    interpolate("Tingnan ang resibo para sa {name}", values),
  receiptPreviewForName: (values: MessageValues) =>
    interpolate("Resibo para sa “{name}”", values),
  receiptImageForName: (values: MessageValues) =>
    interpolate("Larawan ng resibo para sa {name}", values),
  closeReceiptPreviewHint:
    "I-click ang larawan o pindutin ang Esc upang isara.",
  closeReceiptPreview: "Isara ang preview ng resibo",
  openOriginalReceipt: "Buksan ang orihinal na larawan",
  moreActionsForName: (values: MessageValues) =>
    interpolate("Higit pang aksyon para sa {name}", values),
  datePaidByName: (values: MessageValues) =>
    interpolate("{date} · ibinayad ni {name}", values),
  splitWithSplit: (values: MessageValues) =>
    interpolate("Kahati: {split}", values),
  edit: "Baguhin",
  receiptUploadFailed: "Hindi na-upload ang resibo",
  receiptUploaded: "Na-upload ang resibo",
  uploading: "Ina-upload…",
  uploadReceipt: "Mag-upload ng resibo",
  receiptFileRequirements: "JPEG, PNG, o WebP · Hanggang 5 MB",
  selectReceiptPhoto: "Mag-upload ng larawan",
  takeReceiptPhoto: "Kumuha ng larawan",
  removeReceiptPhoto: "Alisin ang larawan",
  receiptOnlineOnly:
    "Kailangan ng koneksyon para sa mga larawan; hindi nag-iimbak ng larawan ang mga offline na draft. Alisin muna ang larawan o kumonekta muli.",
  receiptFileTooLarge: "Dapat 5 MB o mas maliit ang mga larawan",
  expenseSavedReceiptFailed:
    "Nagawa ang gastos, ngunit hindi na-upload ang resibo. Subukan muli ngayon o idagdag ito mamaya mula sa listahan ng gastos.",
  retryReceiptUpload: "Subukang i-upload muli ang resibo",
  receiptAlreadyAttached:
    "May resibo na ang gastos na ito. Suriin ito mula sa listahan ng gastos; hindi ito awtomatikong papalitan",
  uploadReceiptLater: "I-upload mamaya",
  expenseCreationUncertain:
    "Hindi namin makumpirma kung nagawa ang gastos. Suriin ang listahan ng gastos bago ito idagdag muli; huwag agad subukan ulit.",
  viewReceipt: "Tingnan ang resibo",
  noReceipt: "Walang resibo",
  deleteReceipt: "Burahin ang resibo",
  youCanUploadAnotherReceiptLaterTheExpenseWillNotBeDeleted:
    "Maaari kang mag-upload ng ibang resibo mamaya; hindi mabubura ang gastos.",
  receiptDeleted: "Nabura ang resibo",
  deleteThisReceipt: "Burahin ang resibong ito?",
  deleteName: (values: MessageValues) =>
    interpolate("Burahin ang “{name}”", values),
  thisCannotBeUndoneAllBalancesAndSettlementSuggestionsWillBeRecalculated:
    "Hindi ito maibabalik. Muling kakalkulahin ang lahat ng balanse at mungkahi sa pag-aayos ng utang.",
  expenseDeleted: "Nabura ang gastos",
  deleteThisExpense: "Burahin ang gastos na ito?",
  invalidSplitFormat: "Hindi wastong format ng paghahati",
  selectAtLeastOnePersonToSplitWith: "Pumili ng hindi bababa sa isang kahati",
  expenseChangesSaved: "Na-save ang mga pagbabago sa gastos",
  expenseRecorded: "Naitala ang gastos",
  unableToSaveExpense: "Hindi ma-save ang gastos",
  reviewTheSplitPreviewBeforeSavingChanges:
    "Suriin ang preview ng paghahati bago i-save ang mga pagbabago.",
  enterTheRequiredDetailsFirstCustomSplitsAndTagsAreAvailableBelow:
    "Ilagay muna ang mga kinakailangang detalye. Nasa ibaba ang mga pasadyang paghahati at tag.",
  editExpense: "Baguhin ang gastos",
  addExpense2: "Magdagdag ng gastos",
  discardDraft: "Itapon ang draft",
  unsavedChangesWillBeLostExistingDataWillNotChange:
    "Mawawala ang mga pagbabagong hindi na-save. Hindi magbabago ang kasalukuyang datos.",
  discardThisDraft: "Itapon ang draft na ito?",
  description: "Paglalarawan",
  dinnerHotelTrainTickets: "Hapunan, hotel, mga tiket sa tren",
  enterAnExpenseDescription: "Maglagay ng paglalarawan ng gastos",
  amount: "Halaga",
  enterAnExpenseAmount: "Maglagay ng halaga ng gastos",
  date: "Petsa",
  currency2: "Pera",
  splitPreview: "Preview ng paghahati",
  enterAnAmountToPreviewEachPersonsShare:
    "Maglagay ng halaga upang makita ang preview ng bahagi sa gastos ng bawat tao.",
  namePaidAmount: (values: MessageValues) =>
    interpolate("Nagbayad si {name} ng {amount}", values),
  changePeopleAndSplitMethod: "Baguhin ang mga tao at paraan ng paghahati",
  selectedSelectedOfTotal: (values: MessageValues) =>
    interpolate("Napili ang {selected} sa {total}", values),
  selectAll: "Piliin lahat",
  clear: "Burahin",
  splitMethod: "Paraan ng paghahati",
  splitEqually: "Hatiin nang pantay",
  exactAmounts: "Mga eksaktong halaga",
  percentages: "Mga porsyento",
  shares: "Mga bahagi",
  nameSKind: (values: MessageValues) => interpolate("{kind} ni {name}", values),
  moreDetails: "Higit pang detalye",
  categoryAndTags: "Kategorya at mga tag",
  separateWithCommasForExampleBreakfastTransport:
    "Paghiwalayin gamit ang kuwit, halimbawa almusal, transportasyon",
  unsavedChangesWillBeLost: "Mawawala ang mga pagbabagong hindi na-save.",
  cancelEditing: "Kanselahin ang pag-edit?",
  saveChanges: "I-save ang mga pagbabago",
  recordExpense: "Itala ang gastos",
  settlementRepresentative: "Itinalaga ang pag-aayos ng utang kay",
  settledByName: (values: MessageValues) =>
    interpolate("Itinalaga ang pag-aayos ng utang kay {name}", values),
  settleSeparately: "Sarili (hiwalay na pag-aayos ng utang)",
  settlementRepresentativeHelp:
    "Hinahati ang mga gastos sa bawat tao; isinasama sa mga balanse at mungkahi sa pag-aayos ng utang ang netong balanse ng isang tao sa ilalim ng kanyang kinatawan. Hindi maaaring italaga ang mga kinatawan sa ibang tao.",
  representativeHasDependents:
    "May ibang mga miyembrong itinalaga sa taong ito. Alisin muna ang mga pagtatalagang iyon.",
  settlementRepresentativeUpdated: "Nabago ang kinatawan sa pag-aayos ng utang",
  unableToUpdateSettlementRepresentative:
    "Hindi mabago ang kinatawan sa pag-aayos ng utang",
  provideParticipantChanges: "Ibigay ang mga detalye ng kalahok na babaguhin",
  invalidSettlementRepresentative:
    "Hindi wastong kinatawan sa pag-aayos ng utang",
  settlementRepresentativeMustBeAnotherGroupMember:
    "Dapat ibang miyembro ng grupong ito ang kinatawan sa pag-aayos ng utang",
  settlementRepresentativeCannotBeAssignedOrHaveDependents:
    "Hindi maaaring mag-ayos ng utang sa pamamagitan ng iba ang kinatawan, at hindi maaaring may mga miyembrong nag-aayos ng utang sa pamamagitan ng taong ito",
  invalidBackupSettlementRepresentative:
    "Hindi wastong kinatawan sa pag-aayos ng utang sa backup",
  expenseParticipantAdded: "Naidagdag ang kalahok sa gastos",
  unableToAddPerson: "Hindi maidagdag ang tao",
  expenseParticipantsDoNotNeedToSignInManageAccountsWithAccessUnderMoreSharingAndAccess:
    "Hindi kailangang mag-sign in ang mga kalahok sa gastos. Pamahalaan ang mga account na may access sa Mga setting ng grupo → Pagbabahagi at access.",
  personsName: "Pangalan ng tao",
  friendsName: "Pangalan ng kaibigan",
  enterAName: "Maglagay ng pangalan",
  archivedGroupsAreReadOnlyRestoreThisGroupToChangeParticipants:
    "Mababasa lamang ang mga naka-archive na grupo. Ibalik ang grupong ito upang baguhin ang mga kalahok.",
  usedByAPayment: "Ginagamit sa isang bayad",
  cannotDeleteReasonUpdateRelatedExpensesFirstOrUseTheMergeToolBelow: (
    values: MessageValues,
  ) =>
    interpolate(
      "Hindi mabura: {reason}. Baguhin muna ang mga kaugnay na gastos, o gamitin ang tool sa pagsasama sa ibaba.",
      values,
    ),
  deleteName2: (values: MessageValues) =>
    interpolate("Burahin si {name}", values),
  thisPersonHasNoExpensesOrPaymentsDeletionCannotBeUndone:
    "Walang gastos o bayad ang taong ito. Hindi maibabalik ang pagbura.",
  expenseParticipantDeleted: "Nabura ang kalahok sa gastos",
  deleteThisExpenseParticipant: "Burahin ang kalahok sa gastos na ito?",
  nameUpdated: "Nabago ang pangalan",
  unableToUpdateName: "Hindi mabago ang pangalan",
  rename: "Palitan ang pangalan",
  renameName: (values: MessageValues) =>
    interpolate("Palitan ang pangalan ni {name}", values),
  existingExpensesAndPaymentsWillRemainLinkedToThisPerson:
    "Mananatiling naka-link sa taong ito ang mga kasalukuyang gastos at bayad.",
  newName: "Bagong pangalan",
  saveName: "I-save ang pangalan",
  advancedPeopleTools: "Mga advanced na tool para sa mga tao",
  mergeDuplicatePeople: "Pagsamahin ang mga dobleng tao",
  sourcePerson: "Taong pagmumulan",
  targetPerson: "Taong paglilipatan",
  mergeInto: "Isama sa",
  changePreview: "Preview ng pagbabago",
  expensesRelatedExpensesAndPaymentsPaymentsForSourceWillMoveToTargetThenTheSourcePersonWillBeDeleted:
    (values: MessageValues) =>
      interpolate(
        "Ililipat mula kay {source} papunta kay {target} ang mga kaugnay na gastos ({expenses}) at bayad ({payments}), saka buburahin ang taong pinagmulan.",
        values,
      ),
  mergePeople: "Pagsamahin ang mga tao",
  sourceWillBeDeletedAndRelatedDataWillBeTransferredToTargetAtomically: (
    values: MessageValues,
  ) =>
    interpolate(
      "Buburahin si {source} at ililipat ang kaugnay na datos kay {target} bilang iisang buo at hindi mahahating operasyon.",
      values,
    ),
  expenseParticipantsMerged: "Napagsama ang mga kalahok sa gastos",
  mergeFailed: "Hindi napagsama",
  applyMerge: "Ilapat ang pagsasama?",
  previewAndMerge: "I-preview at pagsamahin",
};
