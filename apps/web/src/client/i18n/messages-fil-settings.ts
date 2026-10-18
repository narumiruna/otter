import { interpolate, type MessageValues } from "./message-types.js";

export const filSettings = {
  groupSettings: "Mga setting ng grupo",
  manageSharingGroupPreferencesAndDataToolsHighImpactActionsRequireConfirmation:
    "Pamahalaan ang pagbabahagi, mga kagustuhan ng grupo, at mga tool sa datos. Kailangan ng kumpirmasyon para sa mga aksyong may malaking epekto.",
  youAreACollaboratorAndCanUseDataToolsOnlyTheOwnerCanManageAccessAndGroupSettings:
    "Isa kang katuwang at maaari mong gamitin ang mga tool sa datos. Ang may-ari lamang ang maaaring mamahala ng access at mga setting ng grupo.",
  sharingAndAccess: "Pagbabahagi at access",
  linksActiveLinksCollaboratorsCollaborators: (values: MessageValues) =>
    interpolate(
      "Mga aktibong link: {links} · Mga katuwang: {collaborators}",
      values,
    ),
  shareLinkCreated: "Nagawa ang link sa pagbabahagi",
  shareLinkCreatedAndCopied: "Nagawa at nakopya ang link sa pagbabahagi",
  shareLinks: "Mga link sa pagbabahagi",
  chooseWhoCanEditThroughTheShareLink:
    "Piliin kung sino ang maaaring tumingin o mag-edit gamit ang link na ito.",
  linkPermission: "Pahintulot ng link",
  readOnlyLink: "Mababasa lamang (walang pag-sign in)",
  signedInEditLink: "Mag-edit pagkatapos mag-sign in",
  anyoneEditLink: "Maaaring mag-edit ang sinumang may link",
  signedInEditLinkDescription:
    "Pagkatapos mag-sign in o magparehistro, magiging katuwang ang mga bisita. Hindi maaalis ang mga sumali na kapag pinawalang-bisa ang link.",
  anyoneEditLinkDescription:
    "Maaaring mag-edit ng mga gastos at kalahok ang sinumang may link nang hindi nagsa-sign in. Ibahagi lamang ito sa mga taong pinagkakatiwalaan mo; agad na magkakabisa ang pagpapawalang-bisa.",
  revokingSignedInLinkDoesNotRemoveExistingCollaborators:
    "Pipigilan ng pagpapawalang-bisa ang mga bagong pagsali. Makakapag-edit pa rin ang mga kasalukuyang katuwang; alisin nang hiwalay ang kanilang access.",
  signInToEditSharedGroup: (values: MessageValues) =>
    interpolate(
      "Mag-sign in o gumawa ng account upang i-edit ang {name}.",
      values,
    ),
  readOnlyShareLinkCreated: "Nagawa ang link sa pagbabahaging mababasa lamang",
  readOnlyShareLinkCreatedAndCopied:
    "Nagawa at nakopya ang link sa pagbabahaging mababasa lamang",
  shareLinkCreatedYourBrowserBlockedAutomaticCopyingCopyItManually:
    "Nagawa ang link sa pagbabahagi. Hinarang ng iyong browser ang awtomatikong pagkopya; kopyahin ito nang manu-mano.",
  unableToCreateLink: "Hindi magawa ang link",
  shareLinkCopied: "Nakopya ang link sa pagbabahagi",
  yourBrowserBlockedCopyingOpenTheLinkAndCopyItFromTheAddressBar:
    "Hinarang ng iyong browser ang pagkopya. Buksan ang link at kopyahin ito mula sa address bar.",
  anyoneWithTheLinkCanViewExpensesBalancesAndSettlementsWithoutSigningInButCannotEdit:
    "Maaaring tingnan ng sinumang may link ang mga gastos, balanse, at pag-aayos ng utang nang hindi nagsa-sign in, ngunit hindi sila makakapag-edit.",
  readOnlyShareLinks: "Mga link sa pagbabahaging mababasa lamang",
  createReadOnlyLink: "Gumawa ng link na mababasa lamang",
  anyoneWithTheLinkCanViewThisGroupsExpensesBalancesAndSettlementSuggestionsButCannotAddOrChangeData:
    "Maaaring tingnan ng sinumang may link ang mga gastos, balanse, at mungkahi sa pag-aayos ng utang ng grupong ito, ngunit hindi sila makakapagdagdag o makakapagbago ng datos.",
  createAShareLink: "Gumawa ng link sa pagbabahagi?",
  createShareLink: "Gumawa ng link sa pagbabahagi",
  revoked: "Pinawalang-bisa",
  active: "Aktibo",
  openLink: "Buksan ang link",
  copy: "Kopyahin",
  revokeLink: "Pawalang-bisa ang link",
  afterRevocationTheOldLinkWillImmediatelyStopWorking:
    "Agad na hindi gagana ang lumang link pagkatapos itong pawalang-bisa.",
  shareLinkRevoked: "Napawalang-bisa ang link sa pagbabahagi",
  revokeThisShareLink: "Pawalang-bisa ang link sa pagbabahaging ito?",
  revoke: "Pawalang-bisa",
  noShareLinksYet: "Wala pang mga link sa pagbabahagi.",
  collaboratorAdded: "Naidagdag ang katuwang",
  unableToAddCollaborator: "Hindi maidagdag ang katuwang",
  collaboratorsMustBeExistingUsersTheyCanManageExpensesAndParticipantsButNotOwnerSettings:
    "Dapat mga kasalukuyang user ang mga katuwang. Maaari nilang pamahalaan ang mga gastos at kalahok, ngunit hindi ang mga setting ng may-ari.",
  existingUsersUsername: "Username ng kasalukuyang user",
  addCollaborator: "Magdagdag ng katuwang",
  removeName: (values: MessageValues) =>
    interpolate("Alisin si {name}", values),
  thisAccountWillNoLongerBeAbleToManageTheGroupExistingExpenseDataWillRemain:
    "Hindi na mapapamahalaan ng account na ito ang grupo. Mananatili ang kasalukuyang datos ng gastos.",
  collaboratorRemoved: "Naalis ang katuwang",
  removeCollaborator: "Alisin ang katuwang?",
  remove: "Alisin",
  dataAndExport: "Datos at pag-export",
  csvPrintBackupAndRestore: "CSV, pag-print, backup, at pagpapanumbalik",
  exportingDoesNotChangeGroupData:
    "Hindi binabago ng pag-export ang datos ng grupo.",
  exportAndPrint: "I-export at i-print",
  expenseCsvExported: "Na-export ang CSV ng gastos",
  exportExpenseCsv: "I-export ang CSV ng gastos",
  settlementCsvExported: "Na-export ang CSV ng pag-aayos ng utang",
  exportSettlementCsv: "I-export ang CSV ng pag-aayos ng utang",
  print: "I-print",
  completeBackupDownloaded: "Na-download ang kumpletong backup",
  downloadFailed: "Hindi na-download",
  downloadCompleteBackup: "I-download ang kumpletong backup",
  expenseCsvImported: "Na-import ang CSV ng gastos",
  importFailed: "Hindi na-import",
  allRowsAreCheckedFirstNoDataIsWrittenIfAnyRowHasAnError:
    "Sinusuri muna ang lahat ng row. Walang datos na isusulat kung may error sa kahit isang row.",
  importExpenseCsv: "I-import ang CSV ng gastos",
  chooseCsv: "Pumili ng CSV",
  importPreview: "Preview ng pag-import",
  rowsRowsCanBeImportedErrorsErrors: (values: MessageValues) =>
    interpolate(
      "Mga row na maaaring i-import: {rows}; mga error: {errors}.",
      values,
    ),
  rowRowMessage: (values: MessageValues) =>
    interpolate("Hilera {row}: {message}", values),
  importCountExpenses: (values: MessageValues) =>
    interpolate("I-import ang mga gastos: {count}", values),
  thisWillAddCountExpensesAtOnceAndRecalculateBalances: (
    values: MessageValues,
  ) =>
    interpolate(
      "Sabay-sabay nitong idaragdag ang mga gastos ({count}) at muling kakalkulahin ang mga balanse.",
      values,
    ),
  applyCsvImport: "Ilapat ang pag-import ng CSV?",
  applyImport: "Ilapat ang pag-import",
  invalidBackupFormat: "Hindi wastong format ng backup",
  backupRestoredAsANewGroup: "Naibalik ang backup bilang bagong grupo",
  restoreFailed: "Hindi naibalik",
  restoringCreatesANewGroupAndDoesNotOverwriteCurrentData:
    "Gumagawa ng bagong grupo ang pagpapanumbalik at hindi pinapatungan ang kasalukuyang datos.",
  restoreJsonBackup: "Ibalik ang JSON backup",
  chooseJsonBackup: "Pumili ng JSON backup",
  restorePreviewName: (values: MessageValues) =>
    interpolate("Preview ng pagpapanumbalik: {name}", values),
  peoplePeopleExpensesExpensesPaymentsPaymentsBaseCurrency: (
    values: MessageValues,
  ) =>
    interpolate(
      "Mga tao: {people} · Mga gastos: {expenses} · Mga bayad: {payments} · Batayang pera {currency}",
      values,
    ),
  createNewGroup: "Gumawa ng bagong grupo",
  aNewGroupNamedNameWillBeCreatedWithoutChangingExistingGroups: (
    values: MessageValues,
  ) =>
    interpolate(
      "Gagawa ng bagong grupong “{name}” nang hindi binabago ang mga kasalukuyang grupo.",
      values,
    ),
  restoreThisBackup: "Ibalik ang backup na ito?",
  createNewGroup2: "Gumawa ng bagong grupo",
  copyGroup: "Kopyahin ang grupo",
  copyThisGroup: "Kopyahin ang grupong ito?",
  copyGroupDescription:
    "Kopyahin ang mga tao, batayang pera, at pasadyang rate sa bagong grupo. Hindi kokopyahin ang mga gastos, bayad sa pag-aayos ng utang, katuwang, at link sa pagbabahagi. Hindi magbabago ang orihinal na grupo.",
  groupCopied: "Nakopya ang grupo",
  groupPreferences: "Mga kagustuhan ng grupo",
  changingTheBaseCurrencyRecalculatesDisplayedAmountsAndClearsCustomExchangeRates:
    "Muling kakalkulahin ang mga ipinapakitang halaga at buburahin ang mga pasadyang exchange rate kapag binago ang batayang pera.",
  nameAndBaseCurrency: "Pangalan at batayang pera",
  totalSpendingWillDisplayAsAmountBalancesAndSettlementsBelowWillBeConverted: (
    values: MessageValues,
  ) =>
    interpolate(
      "Ipapakita ang kabuuang paggastos bilang {amount}; iko-convert ang mga balanse at pag-aayos ng utang sa ibaba.",
      values,
    ),
  expectCountSettlementSuggestionsCustomRatesWillResetToBuiltInValues: (
    values: MessageValues,
  ) =>
    interpolate(
      "Mga inaasahang mungkahi sa pag-aayos ng utang: {count}; ibabalik ang mga pasadyang rate sa mga default ng Bank of Taiwan.",
      values,
    ),
  cancelChanges: "Kanselahin ang mga pagbabago",
  applyGroupPreferences: "Ilapat ang mga kagustuhan ng grupo",
  changeTheBaseCurrencyToCurrencyRecalculateAllResultsAndClearCustomRates: (
    values: MessageValues,
  ) =>
    interpolate(
      "Palitan ang batayang pera ng {currency}, muling kalkulahin ang lahat ng resulta, at burahin ang mga pasadyang rate.",
      values,
    ),
  renameTheGroupToName: (values: MessageValues) =>
    interpolate("Palitan ang pangalan ng grupo ng “{name}”.", values),
  applyTheseChanges: "Ilapat ang mga pagbabagong ito?",
  applyChanges: "Ilapat ang mga pagbabago",
  groupPreferencesApplied: "Nailapat ang mga kagustuhan ng grupo",
  saveFailed: "Hindi na-save",
  customExchangeRatesApplied: "Nailapat ang mga pasadyang exchange rate",
  unableToSaveExchangeRates: "Hindi ma-save ang mga exchange rate",
  currencyConversion: "Pag-convert ng pera",
  countCustomRates: (values: MessageValues) =>
    interpolate("Mga pasadyang rate: {count}", values),
  setHowMuch1UnitOfEachCurrencyEqualsInCurrencyLeaveBlankToUseTheBuiltInFixedRate:
    (values: MessageValues) =>
      interpolate(
        "Itakda ang katumbas ng 1 yunit ng bawat pera sa {currency}. Awtomatikong gagamitin ng mga hindi itinakdang rate ang mga spot mid-rate ng Bank of Taiwan.",
        values,
      ),
  customExchangeRates: "Mga pasadyang exchange rate",
  bankOfTaiwanSpotMidRateDescription:
    "Ginagamit ng mga bagong gastos na walang pasadyang rate ang spot midpoint ng Bank of Taiwan at pinananatili ang rate na iyon. Maaapektuhan ng pagbura ng mga pasadyang rate ang mga susunod na gastos; gagamit pa rin ng mga kasalukuyang rate ang mga bayad.",
  loadBankOfTaiwanSpotMidRates:
    "I-load ang mga default na rate ng Bank of Taiwan",
  loadingBankExchangeRates: "Nilo-load ang mga exchange rate ng bangko…",
  bankOfTaiwanSpotMidRatesLoadedAtTime: (values: MessageValues) =>
    interpolate(
      "Na-load ang mga spot mid-rate ng Bank of Taiwan ({time}).",
      values,
    ),
  bankOfTaiwanDefaultRatesApplied:
    "Naibalik ang mga default na rate ng Bank of Taiwan",
  unableToLoadBankExchangeRates:
    "Hindi makuha sa ngayon ang mga exchange rate ng bangko. Subukan muli mamaya.",
  conversionPreview: "Preview ng pag-convert",
  totalSpendingAmountCountSettlementSuggestions: (values: MessageValues) =>
    interpolate(
      "Kabuuang paggastos: {amount} · Mga mungkahi sa pag-aayos ng utang: {count}.",
      values,
    ),
  applyRates: "Ilapat ang mga rate",
  allTotalsBalancesAndSettlementSuggestionsWillBeRecalculatedWithTheseRates:
    "Pananatilihin ng mga kasalukuyang gastos ang kanilang mga rate. Gagamitin ng mga bago o muling pinresyuhang gastos at kasalukuyang bayad ang mga binagong rate.",
  applyCustomExchangeRates: "Ilapat ang mga pasadyang exchange rate?",
  restoreBankOfTaiwanDefaultRates:
    "Ibalik ang mga default na rate ng Bank of Taiwan?",
  apiWriteSettings: "Access sa pagsulat gamit ang API",
  apiWritesAllowed: "Pinapayagan",
  apiWritesBlocked: "Hindi pinapayagan",
  apiWriteSettingsDescription:
    "Bilang default, hindi mababago ng mga API token at CLI ang grupong ito. Kapag pinagana, maaaring mag-edit ang mga miyembrong may API token ayon sa kanilang mga pahintulot. Hindi maaapektuhan ang mga aksyon sa browser.",
  allowApiWrites: "Payagan ang mga pagbabago gamit ang API token",
  apiWriteSettingSaved: "Nabago ang access sa pagsulat gamit ang API",
  groupLifecycle: "Siklo ng buhay ng grupo",
  archivedReadOnly: "Naka-archive · mababasa lamang",
  active2: "Aktibo",
  afterRestoringDataCanBeAddedAndChangedAgain:
    "Pagkatapos maibalik, maaari nang magdagdag at magbago muli ng datos.",
  archivingPreservesAllDataButMakesTheGroupReadOnly:
    "Pinananatili ng pag-archive ang lahat ng datos ngunit ginagawang mababasa lamang ang grupo.",
  restoreGroup: "Ibalik ang grupo",
  archiveGroup: "I-archive ang grupo",
  afterRestoringTheOwnerAndCollaboratorsCanEditDataAgain:
    "Pagkatapos maibalik, makakapag-edit muli ng datos ang may-ari at mga katuwang.",
  expensesPeopleAndPaymentRecordsArePreservedAndCannotBeChangedWhileArchived:
    "Pinananatili ang mga gastos, tao, at tala ng bayad at hindi mababago habang naka-archive.",
  groupRestored: "Naibalik ang grupo",
  groupArchived: "Na-archive ang grupo",
  restoreThisGroup: "Ibalik ang grupong ito?",
  archiveThisGroup: "I-archive ang grupong ito?",
  thisPermanentlyDeletesAllPeopleExpensesReceiptsAndSettlementRecordsAndCannotBeUndone:
    "Permanenteng buburahin nito ang lahat ng tao, gastos, resibo, at tala ng pag-aayos ng utang at hindi ito maibabalik.",
  deleteGroup: "Burahin ang grupo",
  enterNameToConfirm: (values: MessageValues) =>
    interpolate("Ilagay ang “{name}” upang kumpirmahin", values),
  permanentlyDeleteName: (values: MessageValues) =>
    interpolate("Permanenteng burahin ang “{name}”", values),
  thisCannotBeUndoneCancelingMakesNoChanges:
    "Hindi ito maibabalik. Walang mababago kung kakanselahin.",
  permanentlyDeleteThisGroup: "Permanenteng burahin ang grupong ito?",
  permanentlyDeleteGroup: "Permanenteng burahin ang grupo",
  groupDeleted: "Nabura ang grupo",
  readOnlyShare: "Pagbabahaging mababasa lamang",
  youCanViewExpensesBalancesAndSettlementSuggestionsButCannotEditData:
    "Maaari mong tingnan ang mga gastos, balanse, at mungkahi sa pag-aayos ng utang, ngunit hindi ka makakapag-edit ng datos.",
  completeExpenseHistory: "Kumpletong kasaysayan ng gastos",
  manageGroupSettings: "Pamahalaan ang mga setting ng grupo",
  csvImportFailed: "Hindi na-import ang CSV",
  theCsvHasNoData: "Walang datos ang CSV",
  missingColumnsColumns: (values: MessageValues) =>
    interpolate("Mga nawawalang column: {columns}", values),
  participantNotFoundName: (values: MessageValues) =>
    interpolate("Hindi makita ang kalahok: {name}", values),
  invalidJsonFormat: "Hindi wastong format ng JSON",
  incorrectUsernameOrPassword: "Maling username o password",
  everyPersonNeedsAnAmountForACustomSplit:
    "Kailangan ng halaga para sa bawat tao sa pasadyang paghahati",
  unsupportedBackupVersion: "Hindi sinusuportahang bersyon ng backup",
  unsupportedSplitMethod: "Hindi sinusuportahang paraan ng paghahati",
  unsupportedExchangeRateCurrency:
    "Hindi sinusuportahang pera para sa exchange rate",
  unsupportedBaseCurrency: "Hindi sinusuportahang batayang pera",
  unsupportedCurrency: "Hindi sinusuportahang pera",
  aParticipantCannotBeMergedIntoThemselves:
    "Hindi maaaring isama ang isang kalahok sa kanyang sarili",
  theOwnerCannotBeRemoved: "Hindi maaaring alisin ang may-ari",
  thePayerAndRecipientMustBeDifferent:
    "Dapat magkaiba ang nagbabayad at tumatanggap",
  payerIsRequired: "Kailangan ang nagbabayad",
  thePayerMustBeAParticipant: "Dapat kalahok ang nagbabayad",
  serverError: "Error sa server",
  invalidPaymentRecordsInBackup: "Hindi wastong mga tala ng bayad sa backup",
  splitTotalsInBackupAreInvalid:
    "Hindi wasto ang mga kabuuan ng paghahati sa backup",
  invalidSplitDataInBackup: "Hindi wastong datos ng paghahati sa backup",
  invalidExchangeRatesInBackup: "Hindi wastong mga exchange rate sa backup",
  invalidParticipantDataInBackup: "Hindi wastong datos ng kalahok sa backup",
  backupContainsDuplicateParticipants: "May mga dobleng kalahok sa backup",
  invalidBaseCurrencyInBackup: "Hindi wastong batayang pera sa backup",
  invalidExpenseCategoryInBackup: "Hindi wastong kategorya ng gastos sa backup",
  anExpenseParticipantInTheBackupDoesNotExist:
    "Wala ang isang kalahok sa gastos na nasa backup",
  anExpenseInTheBackupHasDuplicateParticipants:
    "May mga dobleng kalahok ang isang gastos sa backup",
  invalidExpenseDataInBackup: "Hindi wastong datos ng gastos sa backup",
  invalidExpenseTagsInBackup: "Hindi wastong mga tag ng gastos sa backup",
  invalidTripNameInBackup: "Hindi wastong pangalan ng biyahe sa backup",
  backupIsMissingItsTrip: "Wala ang biyahe sa backup",
  backupIsMissingParticipants: "Walang mga kalahok sa backup",
  backupIsMissingExpenses: "Walang mga gastos sa backup",
  notesCanBeUpTo160Characters: "Maaaring hanggang 160 character ang mga tala",
  theShareLinkIsInvalidOrHasBeenRevoked:
    "Hindi wasto o pinawalang-bisa na ang link sa pagbabahagi",
  atLeastOneSplitParticipantIsRequired:
    "Kailangan ng hindi bababa sa isang kalahok sa paghahati",
  splitParticipantsMustBelongToTheTrip:
    "Dapat kabilang sa biyahe ang mga kalahok sa paghahati",
  splitAmountsMustAddUpToTheExpenseAmount:
    "Dapat katumbas ng halaga ng gastos ang kabuuan ng mga halagang hinati",
  splitAmountsMustBeGreaterThan0: "Dapat higit sa 0 ang mga halagang hinati",
  invalidSplitAmount: "Hindi wastong halaga ng paghahati",
  invalidCategoryOrTagFormat: "Hindi wastong format ng kategorya o tag",
  exchangeRatesMustBeGreaterThan0: "Dapat higit sa 0 ang mga exchange rate",
  invalidExchangeRateFormat: "Hindi wastong format ng exchange rate",
  aParticipantWithThisNameAlreadyExists:
    "May kalahok nang may ganitong pangalan",
  thisParticipantHasPaymentRecordsAndCannotBeDeleted:
    "May mga tala ng bayad ang kalahok na ito at hindi siya mabubura",
  thisParticipantHasExpensesAndCannotBeDeleted:
    "May mga gastos ang kalahok na ito at hindi siya mabubura",
  onlyTheOwnerCanDownloadACompleteBackup:
    "Ang may-ari lamang ang maaaring mag-download ng kumpletong backup",
  onlyTheOwnerCanManageShareLinks:
    "Ang may-ari lamang ang maaaring mamahala ng mga link sa pagbabahagi",
  onlyTheOwnerCanManageCollaborators:
    "Ang may-ari lamang ang maaaring mamahala ng mga katuwang",
  onlyTheOwnerCanManageTripSettings:
    "Ang may-ari lamang ang maaaring mamahala ng mga setting ng biyahe",
  namesCanBeUpTo80Characters: "Maaaring hanggang 80 character ang mga pangalan",
  passwordMustBeAtLeast8Characters3:
    "Dapat may hindi bababa sa 8 character ang password",
  invalidArchiveStatus: "Hindi wastong katayuan ng pag-archive",
  invalidApiWriteSetting:
    "Hindi wastong setting ng access sa pagsulat gamit ang API",
  onlyBrowserSessionsCanManageApiWrites:
    "Mga session sa browser lamang ang maaaring mamahala ng access sa pagsulat gamit ang API",
  apiWritesDisabledForThisGroup:
    "Hindi pinapayagan ng grupong ito ang mga pagbabago gamit ang API token",
  apiEndpointNotFound: "Hindi makita ang API endpoint",
  paymentRecordNotFound: "Hindi makita ang tala ng bayad",
  collaboratorNotFound: "Hindi makita ang katuwang",
  participantNotFound: "Hindi makita ang kalahok",
  noActiveShareLinkWasFound: "Walang nakitang aktibong link sa pagbabahagi",
  expenseNotFound: "Hindi makita ang gastos",
  receiptNotFound: "Hindi makita ang resibo",
  tripNotFound: "Hindi makita ang biyahe",
  userNotFound: "Hindi makita ang user",
  descriptionMustBe1120Characters: "Dapat may 1–120 character ang paglalarawan",
  theOwnerIsAlreadyInTheCollaboratorList:
    "Nasa listahan na ng mga katuwang ang may-ari",
  thisGroupIsArchivedRestoreItBeforeEditing:
    "Naka-archive ang grupong ito. Ibalik ito bago mag-edit.",
  receiptsMustBeJpegPngOrWebpImages:
    "Dapat mga larawang JPEG, PNG, o WebP ang mga resibo",
  theRecipientMustBeAParticipant: "Dapat kalahok ang tumatanggap",
  aTripWithThisNameAlreadyExists: "May biyahe nang may ganitong pangalan",
  dateMustUseTheYyyyMmDdFormat:
    "Dapat gamitin ng petsa ang format na YYYY-MM-DD",
  upTo10TagsAreAllowed: "Hanggang 10 tag ang pinapayagan",
  tagsCanBeUpTo24Characters: "Maaaring hanggang 24 character ang mga tag",
  invalidTagFormat: "Hindi wastong format ng tag",
  theTargetParticipantMustBelongToTheTrip:
    "Dapat kabilang sa biyahe ang kalahok na paglilipatan",
  signInFirst: "Mag-sign in muna",
  provideExpenseChanges: "Ibigay ang mga pagbabago sa gastos",
  provideTripChanges: "Ibigay ang mga pagbabago sa biyahe",
  requestBodyIsTooLarge: "Masyadong malaki ang nilalaman ng request",
  selectAtLeastOneSplitParticipant:
    "Pumili ng hindi bababa sa isang kalahok sa paghahati",
  enterATripNameOf1100Characters:
    "Maglagay ng pangalan ng biyahe na may 1–100 character",
  enterAnExpenseDescriptionOf1120Characters:
    "Maglagay ng paglalarawan ng gastos na may 1–120 character",
  enterAParticipantNameOf180Characters:
    "Maglagay ng pangalan ng kalahok na may 1–80 character",
  enterAUsernameAndPassword: "Maglagay ng username at password",
  enterSplitValues: "Maglagay ng mga halaga para sa paghahati",
  enterAValidPaymentDate: "Maglagay ng wastong petsa ng bayad",
  enterValidSplitShares: "Maglagay ng mga wastong bahagi para sa paghahati",
  enterValidSplitPercentages:
    "Maglagay ng mga wastong porsyento para sa paghahati",
  enterValidSplitAmounts: "Maglagay ng mga wastong halaga para sa paghahati",
  enterAValidExpenseDate: "Maglagay ng wastong petsa ng gastos",
  chooseACsvFile: "Pumili ng CSV file",
  selectSplitParticipants: "Piliin ang mga kalahok sa paghahati",
  chooseAReceiptImage: "Pumili ng larawan ng resibo",
  thisUserIsAlreadyACollaborator: "Katuwang na ang user na ito",
  thisUsernameIsAlreadyRegistered: "Nakarehistro na ang username na ito",
  usernameIsBeingRegisteredOrAlreadyRegistered:
    "Kasalukuyang ipinaparehistro o ginagamit na ang username na ito",
  usernameIsBeingRegistered: "Kasalukuyang ipinaparehistro ang username na ito",
  usernameOrPasskeyAlreadyRegistered:
    "Nakarehistro na ang username o Passkey na ito",
  invalidAmount: "Hindi wastong halaga",
  theDefaultDevelopmentAccountsUsernameCannotBeChanged:
    "Hindi mababago ang username ng default na account para sa development",
  language: "Wika",
  english: "Ingles",
  traditionalChinese: "Tradisyonal na Tsino",
};
