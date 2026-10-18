import { interpolate, type MessageValues } from "./message-types.js";

export const filGroups = {
  noBalancesYet: "Wala pang mga balanse.",
  settled: "Bayad na",
  getsBack: "Tatanggapin",
  owes: "May utang na",
  newTaiwanDollar: "Bagong dolyar ng Taiwan",
  japaneseYen: "Yen ng Japan",
  usDollar: "Dolyar ng US",
  euro: "Euro",
  singaporeDollar: "Dolyar ng Singapore",
  poundSterling: "Pound sterling",
  australianDollar: "Dolyar ng Australia",
  canadianDollar: "Dolyar ng Canada",
  southKoreanWon: "Won ng South Korea",
  food: "Pagkain",
  transport: "Transportasyon",
  lodging: "Tirahan",
  tickets: "Mga tiket",
  shopping: "Pamimili",
  other: "Iba pa",
  unsavedChangesWillBeLostDiscardTheDraft:
    "Mawawala ang mga pagbabagong hindi na-save. Itapon ang draft?",
  unableToSwitchGroups: "Hindi makalipat ng grupo",
  loadingGroup: "Nilo-load ang grupo",
  yourSelectionWillAppearAfterItsDataLoads:
    "Lilitaw ang iyong napili pagkatapos ma-load ang datos nito.",
  unableToLoadGroup: "Hindi ma-load ang grupo",
  groupSwitcher: "Pampalit ng grupo",
  groups: "Mga grupo",
  countActiveGroups: (values: MessageValues) =>
    interpolate("Mga aktibong grupo: {count}", values),
  everyTripAddsUpToSomethingWonderful:
    "Bawat biyahe ay may dalang magandang karanasan.",
  recordSharedExpensesAndFocusOnThePeopleBesideYou:
    "Itala ang mga pinaghatiang gastos at ituon ang pansin sa mga kasama mo.",
  archivedAndReadOnlyDataIsPreservedTheOwnerCanRestoreItUnderMore:
    "Naka-archive at mababasa lamang. Pinanatili ang datos; maibabalik ito ng may-ari sa Mga setting ng grupo.",
  addTravelCompanionsFirst: "Magdagdag muna ng mga kasama sa biyahe",
  thereIsOnlyOneParticipantAddSomeoneToSplitWithBeforeRecordingTheFirstExpense:
    "Isa lamang ang kalahok. Magdagdag ng kahati bago itala ang unang gastos.",
  addExpenseParticipant: "Magdagdag ng kalahok sa gastos",
  switchGroups: "Lumipat ng grupo",
  youWillLeaveTheCurrentGroupOnlyAfterTheNewOneLoads:
    "Aalis ka lamang sa kasalukuyang grupo kapag na-load na ang bago.",
  participantsPeopleExpensesExpensesCurrency: (values: MessageValues) =>
    interpolate(
      "Mga tao: {participants} · Mga gastos: {expenses} · {currency}",
      values,
    ),
  archived: "Naka-archive",
  everydayMomentsTogether: "Mga pang-araw-araw na sandali nang sama-sama",
  collaborator: "Katuwang",
  owner: "May-ari",
  baseCurrencyCurrency: (values: MessageValues) =>
    interpolate("Batayang pera {currency}", values),
  usingCustomExchangeRates: "Gumagamit ng mga pasadyang exchange rate",
  usingBankOfTaiwanExchangeRates:
    "Gumagamit ng mga default na rate ng Bank of Taiwan",
  usingFixedFallbackRates:
    "Hindi magagamit ang Bank of Taiwan; ginagamit ang mga nakapirming pamalit na rate",
  loadingGroup2: "Nilo-load ang grupo…",
  people: "Mga tao",
  expenses: "Mga gastos",
  base: "Batayan",
  overview: "Pangkalahatang-ideya",
  more: "Higit pa",
  groupWorkspace: "Lugar ng paggawa ng grupo",
  addExpense: "Magdagdag ng gastos",
  archivedGroups: "Mga naka-archive na grupo",
  unableToCreateGroup: "Hindi makagawa ng grupo",
  createGroup: "Gumawa ng grupo",
  addCompanionsAfterCreatingTheGroupThenRecordSharedExpenses:
    "Magdagdag ng mga kasama pagkatapos gawin ang grupo, saka itala ang mga pinaghatiang gastos.",
  groupName: "Pangalan ng grupo",
  fiveDaysInTokyo: "Limang araw sa Tokyo",
  baseCurrency: "Batayang pera",
  createYourFirstGroup: "Gumawa ng iyong unang grupo",
  addATripOrEventGroupOrCreateOneFromAnExistingJsonBackup:
    "Magdagdag ng grupo para sa biyahe o kaganapan, o gumawa mula sa isang kasalukuyang JSON backup.",
  groupExpenseSummary: "Buod ng gastos ng grupo",
  totalSharedExpenses: "Kabuuang pinaghatiang gastos",
  convertedToBaseCurrency: "Na-convert sa batayang pera",
  outstanding: "Hindi pa bayad",
  countSuggestedPaymentsToSettleUp: (values: MessageValues) =>
    interpolate("Mga mungkahing bayad para maayos ang utang: {count}", values),
  nothingIsCurrentlyOutstanding: "Walang hindi pa bayad sa ngayon",
  settlementSuggestionsAppearAfterExpensesAreAdded:
    "Lilitaw ang mga mungkahi sa pag-aayos ng utang pagkatapos magdagdag ng mga gastos",
  expenseRecords: "Mga tala ng gastos",
  sharedAmongCountPeople: (values: MessageValues) =>
    interpolate("Hinati sa {count} tao", values),
  calculatedFromCurrentExpensesAndRecordedPayments:
    "Kinalkula mula sa mga kasalukuyang gastos at naitalang bayad.",
  settleUp: "Ayusin ang utang",
  countEntries: (values: MessageValues) =>
    interpolate("Mga tala: {count}", values),
  entries: "mga tala",
  seePaymentsAndSharesAtAGlance:
    "Makita agad ang mga ibinayad at bahagi sa gastos.",
  balances: "Mga balanse",
  recentExpenses: "Mga kamakailang gastos",
  noExpensesYet: "Wala pang gastos",
  thisGroupHasNotRecordedAnySharedExpenses:
    "Wala pang naitalang pinaghatiang gastos ang grupong ito.",
  recordTheFirstSharedExpense: "Itala ang unang pinaghatiang gastos",
  addThePeopleSplittingExpensesToCalculateEachBalance:
    "Idagdag muna ang mga taong maghahati ng gastos, saka itala ang iyong unang gastos. Awtomatikong lilitaw ang mga balanse at mungkahi sa pag-aayos ng utang.",
  balancesAndSettlementSuggestionsWillAppearHereAfterYouAddExpenses:
    "Lilitaw dito ang mga balanse at mungkahi sa pag-aayos ng utang pagkatapos mong magdagdag ng gastos.",
  addPerson: "Magdagdag ng tao",
  managePeople: "Pamahalaan ang mga tao",
  everythingIsSettled: "Bayad na ang lahat",
  thereAreNoOutstandingPayments: "Wala nang hindi pa bayad.",
  paymentRecorded: "Naitala ang bayad",
  unableToRecordPayment: "Hindi maitala ang bayad",
  recordPayment: "Itala ang bayad",
  recordSettlementPayment: "Itala ang bayad para sa pag-aayos ng utang",
  fromPaysToTheFullSuggestedAmountIsPrefilled: (values: MessageValues) =>
    interpolate(
      "Magbabayad si {from} kay {to}; nailagay na ang buong iminungkahing halaga.",
      values,
    ),
  paymentAmountCurrency: (values: MessageValues) =>
    interpolate("Halaga ng bayad ({currency})", values),
  enterAPaymentAmount: "Maglagay ng halaga ng bayad",
  thePaymentMustBeGreaterThan0AndNoMoreThanTheSuggestedAmount:
    "Dapat higit sa 0 ang bayad at hindi lalampas sa iminungkahing halaga",
  expectedRemainder: "Inaasahang matitira: ",
  paymentDate: "Petsa ng bayad",
  noteOptional: "Tala (opsyonal)",
  recordPayment2: "Itala ang bayad",
  paymentHistory: "Kasaysayan ng bayad",
  dateFromPaidTo: (values: MessageValues) =>
    interpolate("{date} · nagbayad si {from} kay {to}", values),
  deletePayment: "Burahin ang bayad",
  remainingSettlementSuggestionsWillBeRecalculated:
    "Muling kakalkulahin ang mga natitirang mungkahi sa pag-aayos ng utang.",
  paymentDeleted: "Nabura ang bayad",
  deleteFailed: "Hindi nabura",
  deleteThisPayment: "Burahin ang bayad na ito?",
  delete: "Burahin",
  datePaidByNameSplitWithSplit: (values: MessageValues) =>
    interpolate("{date} · ibinayad ni {name} · kahati: {split}", values),
  dailySpending: "Pang-araw-araw na paggastos",
  paidByPerson: "Ibinayad ng bawat tao",
  byCategory: "Ayon sa kategorya",
  spendingAnalysis: "Pagsusuri ng paggastos",
  totalAmount: (values: MessageValues) =>
    interpolate("Kabuuan {amount}", values),
  noDataYet: "Wala pang datos.",
  showingShownOfTotalExpenses: (values: MessageValues) =>
    interpolate("Ipinapakita ang {shown} sa {total} na gastos", values),
  searchDescriptions: "Maghanap sa mga paglalarawan",
  searchExpenseDescriptions: "Maghanap sa mga paglalarawan ng gastos",
  sort: "Ayusin",
  groupBy: "Pangkatin ayon sa",
  noGrouping: "Walang pagpapangkat",
  groupByDate: "Pangkatin ayon sa petsa",
  groupByPayer: "Pangkatin ayon sa nagbayad",
  dateNewestFirst: "Petsa: pinakabago muna",
  dateOldestFirst: "Petsa: pinakaluma muna",
  amountHighToLow: "Halaga: mataas pababa",
  amountLowToHigh: "Halaga: mababa pataas",
  moreFilters: "Higit pang filter",
  countApplied: (values: MessageValues) =>
    interpolate("Inilapat: {count}", values),
  datePersonCurrencyCategoryAndTag: "Petsa, tao, pera, kategorya, at tag",
  from: "Mula",
  to: "Hanggang",
  paidBy: "Ibinayad ni",
  splitWith: "Kahati",
  expenseParticipants: "Mga kalahok sa gastos",
  currency: "Pera",
};
