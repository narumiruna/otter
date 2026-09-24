import {
  type CatalogShape,
  interpolate,
  type MessageValues,
  pluralize,
} from "./message-types.js";
import type { zhTW } from "./messages-zh-tw.js";

type Messages = CatalogShape<typeof zhTW>;

export const en = {
  expenseHistory: "Change history",
  expenseHistoryDescription:
    "Expense edits and deletions, not payment history or historical balances.",
  expenseHistoryEmpty: "No changes recorded",
  expenseHistoryMore: "Load more changes",
  expenseHistoryCreated: "Created",
  expenseHistoryUpdated: "Updated",
  expenseHistoryDeleted: "Deleted",
  expenseHistoryBaseline: "Initial snapshot",
  expenseHistorySystem: "System",
  expenseHistoryBaselineNotice:
    "State when history was enabled; earlier changes and the original author are unknown.",
  expenseHistoryReceiptNotice:
    "Only receipt metadata is retained. Previous images are unavailable.",
  expenseHistoryShares: "Split amounts",
  expenseHistoryBefore: "Before",
  expenseHistoryAfter: "After",
  expenseHistorySourceExpense: "Expense action",
  expenseHistorySourceCsv: "CSV import",
  expenseHistorySourceRestore: "Backup restore",
  expenseHistorySourceMerge: "Participant merge",
  expenseHistorySourceReceipt: "Receipt action",
  expenseHistorySourceSeed: "Development fixture",
  expenseHistorySourceMigration: "Migration",
  expenseConflictParticipantsChanged:
    "People have changed. Confirming replaces unavailable payer or split selections with the latest expense's settings. Other draft fields are kept; review split amounts before saving.",
  expenseVersionConflict:
    "This expense has changed. Review the latest version before confirming again.",
  expenseVersionMissing: "Provide the expense version. Reload and try again.",
  expenseVersionInvalid: "Invalid expense version",
  reviewLatestExpense: "Review latest expense",
  confirmLatestExpenseVersion:
    "Reviewed latest version; keep my draft and continue editing",
  latestExpenseMissing:
    "This expense was deleted or is no longer accessible. Your draft is retained but cannot be saved.",
  deleteExpenseHistoryRetained:
    "The expense will leave the current ledger and balances will be recalculated. Change history is retained. Restore is not supported yet.",
  expenseHistoryForName: (values: MessageValues) =>
    interpolate("Change history: {name}", values),
  usernameMustBe332LettersNumbersUnderscoresOrHyphens:
    "Username must be 3–32 letters, numbers, underscores, or hyphens",
  travelTogetherSplitExpensesEasily: "Travel together, split expenses easily",
  goodFriendsSplitExpensesWell: "Good friends split expenses well.",
  skipToMainContent: "Skip to main content",
  otterHome: "otter home",
  loading: "Loading",
  unableToLoadOtter: "Unable to load otter",
  loadingFailed: "Loading failed",
  reload: "Reload",
  signedIn: "Signed in",
  accountCreated: "Account created",
  unableToAuthenticate: "Unable to authenticate",
  authenticationRequestsTooFrequentTryAgainLater:
    "Too many authentication requests. Try again later.",
  usernameUpdated: "Username updated",
  signedOut: "Signed out",
  signOutFailedMessage: (values: MessageValues) =>
    interpolate("Sign out failed: {message}", values),
  pleaseTryAgainLater: "Please try again later",
  signingOut: "Signing out…",
  signOut: "Sign out",
  authorizeCli: "Connect CLI",
  authorizeCliDescription:
    "Enter the device code shown in your terminal to approve this CLI's access to your Otter data.",
  deviceCode: "Device code",
  checkDeviceCode: "Continue",
  checkingDeviceCode: "Checking…",
  cliAccessRequest: "CLI access request",
  cliAccessRequestedBy: "Requested by",
  approveCliAccess: "Approve access",
  approvingCliAccess: "Approving…",
  cliAccessApproved: "CLI connected",
  cliAccessApprovedDescription:
    "You can close this page and return to your terminal.",
  deviceCodeNotFoundOrExpired: "Device code not found or expired",
  enterAValidDeviceCode: "Enter a valid device code",
  youAreOfflineLoadedDataIsAvailableButEditingRequiresAConnection:
    "You are offline. Loaded data is available, but editing requires a connection.",
  travelTogetherSplitWithEase: "Travel together, split with ease",
  spendYourTimeOnTheJourney: "Spend your time on the journey,",
  andLeaveTheSplittingToOtter: "and leave the splitting to otter.",
  fromDinnerToAFullTripRecordEverySharedExpenseAndKeepGroupFinancesSimpleAndClear:
    "From dinner to a full trip, record every shared expense and keep group finances simple and clear.",
  splitExampleAWeekendTripDinnerCostsTwd1800ForThreePeopleOrTwd600Each:
    "Split example: a weekend trip dinner costs TWD 1,800 for three people, or TWD 600 each.",
  weekendTrip: "Weekend trip",
  splitExample: "Split example",
  dinnerTogether: "Dinner together",
  you: "You",
  a: "A",
  y: "Y",
  splitEquallyAmong3: "Split equally among 3",
  each: "each",
  quicklyRecordSharedExpenses: "Quickly record shared expenses",
  seeWhoOwesAndWhoIsOwedAtAGlance: "See who owes and who is owed at a glance",
  settleUpWithClearSuggestions: "Settle up with clear suggestions",
  signIn: "Sign in",
  createAccount: "Create account",
  welcomeBackContinueYourJourney: "Welcome back. Continue your journey.",
  createYourFirstGroupAndStartSplittingWithEase:
    "Create your first group and start splitting with ease.",
  username: "Username",
  enterAUsername: "Enter a username",
  password: "Password",
  enterAPassword: "Enter a password",
  developmentCredentialsHaveBeenFilledIn:
    "Development credentials have been filled in.",
  signingIn: "Signing in…",
  or: "or",
  signInWithAPasskey: "Sign in with a passkey",
  signingInWithAPasskey: "Signing in with a passkey…",
  unableToSignInWithAPasskey:
    "Unable to sign in with a passkey. Try again or use your password.",
  needAnAccount: "Need an account?",
  usernameIsNotCaseSensitive: "Username is not case-sensitive.",
  passwordMustBeAtLeast8Characters: "Password must be at least 8 characters",
  passwordMustBeAtLeast8Characters2: "Password must be at least 8 characters.",
  creating: "Creating…",
  createAccountWithAPasskey: "Create account with a passkey",
  creatingAccountWithAPasskey: "Creating account with a passkey…",
  unableToCreateAccountWithAPasskey:
    "Unable to create account with a passkey. Try again.",
  alreadyHaveAnAccount: "Already have an account?",
  backToSignIn: "Back to sign in",
  expenseParticipantsDoNotNeedAccountsToBeIncludedInAGroup:
    "Expense participants do not need accounts to be included in a group.",
  changeNameSUsername: (values: MessageValues) =>
    interpolate("Change {name}'s username", values),
  nameSAccountMenu: (values: MessageValues) =>
    interpolate("{name}'s account menu", values),
  unableToUpdateUsername: "Unable to update username",
  changeUsername: "Change username",
  accountSettings: "Account settings",
  manageYourUsernameAndPasskeys:
    "Manage your appearance, language, username, passkeys, and API tokens.",
  appearance: "Appearance",
  chooseHowOtterLooksOnThisBrowser:
    "Choose how Otter looks. Changes apply immediately and are saved in this browser.",
  colorTheme: "Color theme",
  forestTheme: "Forest",
  oceanTheme: "Ocean",
  lavenderTheme: "Lavender",
  sunsetTheme: "Sunset",
  roseTheme: "Rose",
  displayMode: "Display mode",
  systemMode: "System",
  lightMode: "Light",
  darkMode: "Dark",
  useTheNewUsernameTheNextTimeYouSignInYourCurrentSessionWillContinue:
    "Use the new username the next time you sign in. Your current session will continue.",
  passkeys: "Passkeys",
  useAPasskeyToSignInWithoutYourPassword:
    "Use your device unlock to sign in without entering your password.",
  unableToLoadPasskeys: "Unable to load passkeys",
  unableToAddPasskey: "Unable to add a passkey. If you canceled, try again.",
  unableToRemovePasskey: "Unable to remove the passkey",
  passkeyAdded: "Passkey added",
  passkeyRemoved: "Passkey removed",
  passkeyNumber: (values: MessageValues) =>
    interpolate("Passkey {number}", values),
  addedOnDate: (values: MessageValues) => interpolate("Added {date}", values),
  removePasskeyNumber: (values: MessageValues) =>
    interpolate("Remove passkey {number}", values),
  noPasskeysAdded: "No passkeys added yet.",
  addingPasskey: "Adding passkey…",
  addPasskey: "Add passkey",
  thisBrowserDoesNotSupportPasskeys: "This browser does not support passkeys.",
  apiTokens: "API tokens",
  useApiTokensWithTheOtterCli:
    "Create Bearer tokens for the Otter CLI or automation tools.",
  loadingApiTokens: "Loading API tokens…",
  unableToLoadApiTokens: "Unable to load API tokens",
  unableToCreateApiToken: "Unable to create the API token",
  apiTokenCreationUncertain:
    "The token request outcome is unknown. Retry this request before creating another.",
  retryApiTokenCreation: "Retry token creation",
  unableToRevokeApiToken: "Unable to revoke the API token",
  unableToCopyApiToken: "Unable to copy the API token",
  apiTokenRevoked: "API token revoked",
  apiTokenCopied: "API token copied",
  enterATokenName: "Enter a token name",
  newApiToken: "New API token",
  copyYourApiTokenNow: "Copy your API token now",
  apiTokenShownOnce:
    "This token is shown only once. You cannot view it again after leaving.",
  copyToken: "Copy token",
  done: "Done",
  tokenName: "Token name",
  tokenNameExample: "For example: Travel automation",
  creatingApiToken: "Creating token…",
  createApiToken: "Create API token",
  apiTokenDates: (values: MessageValues) =>
    interpolate("Created {created} · Expires {expires}", values),
  revokeNamedApiToken: (values: MessageValues) =>
    interpolate('Revoke API token "{name}"', values),
  noActiveApiTokens: "No active API tokens.",
  apiTokensExpireAfter90Days:
    "Tokens expire after 90 days. To use one with the CLI, set it as",
  passkeyRegistrationRequestsTooFrequent:
    "Too many passkey registration requests. Try again later.",
  passkeyRegistrationResponseIsInvalid:
    "The passkey registration response is invalid",
  passkeyRegistrationRequestExpired:
    "The passkey registration request expired. Try again.",
  unableToVerifyPasskey: "Unable to verify the passkey. Try again.",
  passkeyAlreadyRegistered: "This passkey is already registered",
  passkeyNotFound: "Passkey not found",
  cannotRemoveOnlyPasskey:
    "You cannot remove your only passkey without losing account access",
  passkeyLoginResponseIsInvalid: "The passkey sign-in response is invalid",
  passkeyLoginRequestExpired: "The passkey sign-in request expired. Try again.",
  unableToUsePasskeyToSignIn: "Unable to sign in with this passkey",
  cancel: "Cancel",
  saving: "Saving…",
  save: "Save",
  connectionFailedPleaseTryAgainLater:
    "Connection failed. Please try again later.",
  theServerReturnedAnInvalidResponse:
    "The server returned an invalid response.",
  everyone: "Everyone",
  unknown: "Unknown",
  atLeastOneParticipantIsRequired: "At least one participant is required",
  usedByAnExpense: "Used by an expense",
  youAreOfflineReconnectAndTryAgain:
    "You are offline. Reconnect and try again.",
  working: "Working…",
  unableToApplyChanges: "Unable to apply changes",
  applying: "Applying…",
  noBalancesYet: "No balances yet.",
  settled: "Settled",
  getsBack: "Gets back",
  owes: "Owes",
  newTaiwanDollar: "New Taiwan dollar",
  japaneseYen: "Japanese yen",
  usDollar: "US dollar",
  euro: "Euro",
  food: "Food",
  transport: "Transport",
  lodging: "Lodging",
  tickets: "Tickets",
  shopping: "Shopping",
  other: "Other",
  unsavedChangesWillBeLostDiscardTheDraft:
    "Unsaved changes will be lost. Discard the draft?",
  unableToSwitchGroups: "Unable to switch groups",
  loadingGroup: "Loading group",
  yourSelectionWillAppearAfterItsDataLoads:
    "Your selection will appear after its data loads.",
  unableToLoadGroup: "Unable to load group",
  groupSwitcher: "Group switcher",
  groups: "Groups",
  countActiveGroups: (values: MessageValues) =>
    interpolate(`{count} active ${pluralize(values.count, "group")}`, values),
  everyTripAddsUpToSomethingWonderful:
    "Every trip adds up to something wonderful.",
  recordSharedExpensesAndFocusOnThePeopleBesideYou:
    "Record shared expenses and focus on the people beside you.",
  archivedAndReadOnlyDataIsPreservedTheOwnerCanRestoreItUnderMore:
    "Archived and read-only. Data is preserved; the owner can restore it under Group settings.",
  addTravelCompanionsFirst: "Add travel companions first",
  thereIsOnlyOneParticipantAddSomeoneToSplitWithBeforeRecordingTheFirstExpense:
    "There is only one participant. Add someone to split with before recording the first expense.",
  addExpenseParticipant: "Add expense participant",
  switchGroups: "Switch groups",
  youWillLeaveTheCurrentGroupOnlyAfterTheNewOneLoads:
    "You will leave the current group only after the new one loads.",
  participantsPeopleExpensesExpensesCurrency: (values: MessageValues) =>
    interpolate(
      `{participants} ${pluralize(values.participants, "person", "people")} · {expenses} ${pluralize(values.expenses, "expense")} · {currency}`,
      values,
    ),
  archived: "Archived",
  everydayMomentsTogether: "Everyday moments together",
  collaborator: "Collaborator",
  owner: "Owner",
  baseCurrencyCurrency: (values: MessageValues) =>
    interpolate("Base currency {currency}", values),
  usingCustomExchangeRates: "Using custom exchange rates",
  usingBankOfTaiwanExchangeRates: "Using Bank of Taiwan default rates",
  usingFixedFallbackRates:
    "Bank of Taiwan is unavailable; using fixed fallback rates",
  loadingGroup2: "Loading group…",
  people: "People",
  expenses: "Expenses",
  base: "Base",
  overview: "Overview",
  more: "More",
  groupWorkspace: "Group workspace",
  addExpense: "Add expense",
  archivedGroups: "Archived groups",
  unableToCreateGroup: "Unable to create group",
  createGroup: "Create group",
  addCompanionsAfterCreatingTheGroupThenRecordSharedExpenses:
    "Add companions after creating the group, then record shared expenses.",
  groupName: "Group name",
  fiveDaysInTokyo: "Five days in Tokyo",
  baseCurrency: "Base currency",
  createYourFirstGroup: "Create your first group",
  addATripOrEventGroupOrCreateOneFromAnExistingJsonBackup:
    "Add a trip or event group, or create one from an existing JSON backup.",
  groupExpenseSummary: "Group expense summary",
  totalSharedExpenses: "Total shared expenses",
  convertedToBaseCurrency: "Converted to base currency",
  outstanding: "Outstanding",
  countSuggestedPaymentsToSettleUp: (values: MessageValues) =>
    interpolate(
      `{count} suggested ${pluralize(values.count, "payment")} to settle up`,
      values,
    ),
  nothingIsCurrentlyOutstanding: "Nothing is currently outstanding",
  settlementSuggestionsAppearAfterExpensesAreAdded:
    "Settlement suggestions appear after expenses are added",
  expenseRecords: "Expense records",
  sharedAmongCountPeople: (values: MessageValues) =>
    interpolate(
      `Shared among {count} ${pluralize(values.count, "person", "people")}`,
      values,
    ),
  calculatedFromCurrentExpensesAndRecordedPayments:
    "Calculated from current expenses and recorded payments.",
  settleUp: "Settle up",
  countEntries: (values: MessageValues) =>
    interpolate(
      `{count} ${pluralize(values.count, "entry", "entries")}`,
      values,
    ),
  entries: "entries",
  seePaymentsAndSharesAtAGlance: "See payments and shares at a glance.",
  balances: "Balances",
  recentExpenses: "Recent expenses",
  noExpensesYet: "No expenses yet",
  thisGroupHasNotRecordedAnySharedExpenses:
    "This group has not recorded any shared expenses.",
  recordTheFirstSharedExpense: "Record the first shared expense",
  addThePeopleSplittingExpensesToCalculateEachBalance:
    "First add the people splitting expenses, then record your first expense. Balances and settlement suggestions will appear automatically.",
  balancesAndSettlementSuggestionsWillAppearHereAfterYouAddExpenses:
    "Balances and settlement suggestions will appear here after you add expenses.",
  addPerson: "Add person",
  managePeople: "Manage people",
  everythingIsSettled: "Everything is settled",
  thereAreNoOutstandingPayments: "There are no outstanding payments.",
  paymentRecorded: "Payment recorded",
  unableToRecordPayment: "Unable to record payment",
  recordPayment: "Record payment",
  recordSettlementPayment: "Record settlement payment",
  fromPaysToTheFullSuggestedAmountIsPrefilled: (values: MessageValues) =>
    interpolate(
      "{from} pays {to}; the full suggested amount is prefilled.",
      values,
    ),
  paymentAmountCurrency: (values: MessageValues) =>
    interpolate("Payment amount ({currency})", values),
  enterAPaymentAmount: "Enter a payment amount",
  thePaymentMustBeGreaterThan0AndNoMoreThanTheSuggestedAmount:
    "The payment must be greater than 0 and no more than the suggested amount",
  expectedRemainder: "Expected remainder: ",
  paymentDate: "Payment date",
  noteOptional: "Note (optional)",
  recordPayment2: "Record payment",
  paymentHistory: "Payment history",
  dateFromPaidTo: (values: MessageValues) =>
    interpolate("{date} · {from} paid {to}", values),
  deletePayment: "Delete payment",
  remainingSettlementSuggestionsWillBeRecalculated:
    "Remaining settlement suggestions will be recalculated.",
  paymentDeleted: "Payment deleted",
  deleteFailed: "Delete failed",
  deleteThisPayment: "Delete this payment?",
  delete: "Delete",
  datePaidByNameSplitWithSplit: (values: MessageValues) =>
    interpolate("{date} · paid by {name} · split with {split}", values),
  dailySpending: "Daily spending",
  paidByPerson: "Paid by person",
  byCategory: "By category",
  spendingAnalysis: "Spending analysis",
  totalAmount: (values: MessageValues) => interpolate("Total {amount}", values),
  noDataYet: "No data yet.",
  showingShownOfTotalExpenses: (values: MessageValues) =>
    interpolate(
      `Showing {shown} of {total} ${pluralize(values.total, "expense")}`,
      values,
    ),
  searchDescriptions: "Search descriptions",
  searchExpenseDescriptions: "Search expense descriptions",
  sort: "Sort",
  groupBy: "Group by",
  noGrouping: "No grouping",
  groupByDate: "Group by date",
  groupByPayer: "Group by payer",
  dateNewestFirst: "Date: newest first",
  dateOldestFirst: "Date: oldest first",
  amountHighToLow: "Amount: high to low",
  amountLowToHigh: "Amount: low to high",
  moreFilters: "More filters",
  countApplied: (values: MessageValues) =>
    interpolate("{count} applied", values),
  datePersonCurrencyCategoryAndTag: "Date, person, currency, category, and tag",
  from: "From",
  to: "To",
  paidBy: "Paid by",
  splitWith: "Split with",
  expenseParticipants: "Expense participants",
  currency: "Currency",
  allCurrencies: "All currencies",
  category: "Category",
  allCategories: "All categories",
  tag: "Tag",
  exactTag: "Exact tag",
  applied: "Applied:",
  clearAll: "Clear all",
  allPeople: "All people",
  categoryValue: (values: MessageValues) =>
    interpolate("Category: {value}", values),
  currencyValue: (values: MessageValues) =>
    interpolate("Currency: {value}", values),
  fromValue: (values: MessageValues) => interpolate("From: {value}", values),
  toValue: (values: MessageValues) => interpolate("To: {value}", values),
  tagValue: (values: MessageValues) => interpolate("Tag: {value}", values),
  aCompleteHistoryWillAppearHereAfterTheFirstSharedExpense:
    "A complete history will appear here after the first shared expense.",
  recordFirstExpense: "Record first expense",
  noMatchingExpenses: "No matching expenses",
  adjustOrClearTheFiltersToSeeAllExpenses:
    "Adjust or clear the filters to see all expenses.",
  clearFilters: "Clear filters",
  filteredExpenses: "Filtered expenses",
  allExpenses: "All expenses",
  columns: "Columns",
  chooseExpenseColumns: "Choose expense columns",
  expenseName: "Expense",
  splitParticipants: "Split",
  receipt: "Receipt",
  tags: "Tags",
  restoreDefaults: "Restore defaults",
  actions: "Actions",
  expenseGroupSummary: (values: MessageValues) =>
    interpolate(
      `{count} ${pluralize(values.count, "expense")} · {total}`,
      values,
    ),
  countPeople: (values: MessageValues) =>
    interpolate(
      `{count} ${pluralize(values.count, "person", "people")}`,
      values,
    ),
  viewReceiptForName: (values: MessageValues) =>
    interpolate("View receipt for {name}", values),
  receiptPreviewForName: (values: MessageValues) =>
    interpolate("Receipt for “{name}”", values),
  receiptImageForName: (values: MessageValues) =>
    interpolate("Receipt image for {name}", values),
  closeReceiptPreviewHint: "Click the image or press Esc to close.",
  closeReceiptPreview: "Close receipt preview",
  openOriginalReceipt: "Open original image",
  moreActionsForName: (values: MessageValues) =>
    interpolate("More actions for {name}", values),
  datePaidByName: (values: MessageValues) =>
    interpolate("{date} · paid by {name}", values),
  splitWithSplit: (values: MessageValues) =>
    interpolate("Split with {split}", values),
  edit: "Edit",
  receiptUploadFailed: "Receipt upload failed",
  receiptUploaded: "Receipt uploaded",
  uploading: "Uploading…",
  uploadReceipt: "Upload receipt",
  receiptFileRequirements: "JPEG, PNG, or WebP · Up to 5 MB",
  viewReceipt: "View receipt",
  noReceipt: "No receipt",
  deleteReceipt: "Delete receipt",
  youCanUploadAnotherReceiptLaterTheExpenseWillNotBeDeleted:
    "You can upload another receipt later; the expense will not be deleted.",
  receiptDeleted: "Receipt deleted",
  deleteThisReceipt: "Delete this receipt?",
  deleteName: (values: MessageValues) => interpolate("Delete “{name}”", values),
  thisCannotBeUndoneAllBalancesAndSettlementSuggestionsWillBeRecalculated:
    "This cannot be undone. All balances and settlement suggestions will be recalculated.",
  expenseDeleted: "Expense deleted",
  deleteThisExpense: "Delete this expense?",
  invalidSplitFormat: "Invalid split format",
  selectAtLeastOnePersonToSplitWith: "Select at least one person to split with",
  expenseChangesSaved: "Expense changes saved",
  expenseRecorded: "Expense recorded",
  unableToSaveExpense: "Unable to save expense",
  reviewTheSplitPreviewBeforeSavingChanges:
    "Review the split preview before saving changes.",
  enterTheRequiredDetailsFirstCustomSplitsAndTagsAreAvailableBelow:
    "Enter the required details first. Custom splits and tags are available below.",
  editExpense: "Edit expense",
  addExpense2: "Add expense",
  discardDraft: "Discard draft",
  unsavedChangesWillBeLostExistingDataWillNotChange:
    "Unsaved changes will be lost. Existing data will not change.",
  discardThisDraft: "Discard this draft?",
  description: "Description",
  dinnerHotelTrainTickets: "Dinner, hotel, train tickets",
  enterAnExpenseDescription: "Enter an expense description",
  amount: "Amount",
  enterAnExpenseAmount: "Enter an expense amount",
  date: "Date",
  currency2: "Currency",
  splitPreview: "Split preview",
  enterAnAmountToPreviewEachPersonsShare:
    "Enter an amount to preview each person's share.",
  namePaidAmount: (values: MessageValues) =>
    interpolate("{name} paid {amount}", values),
  changePeopleAndSplitMethod: "Change people and split method",
  selectedSelectedOfTotal: (values: MessageValues) =>
    interpolate("Selected {selected} of {total}", values),
  selectAll: "Select all",
  clear: "Clear",
  splitMethod: "Split method",
  splitEqually: "Split equally",
  exactAmounts: "Exact amounts",
  percentages: "Percentages",
  shares: "Shares",
  nameSKind: (values: MessageValues) => interpolate("{name}'s {kind}", values),
  moreDetails: "More details",
  categoryAndTags: "Category and tags",
  separateWithCommasForExampleBreakfastTransport:
    "Separate with commas, for example breakfast, transport",
  unsavedChangesWillBeLost: "Unsaved changes will be lost.",
  cancelEditing: "Cancel editing?",
  saveChanges: "Save changes",
  recordExpense: "Record expense",
  expenseParticipantAdded: "Expense participant added",
  unableToAddPerson: "Unable to add person",
  expenseParticipantsDoNotNeedToSignInManageAccountsWithAccessUnderMoreSharingAndAccess:
    "Expense participants do not need to sign in. Manage accounts with access under Group settings → Sharing and access.",
  personsName: "Person's name",
  friendsName: "Friend's name",
  enterAName: "Enter a name",
  archivedGroupsAreReadOnlyRestoreThisGroupToChangeParticipants:
    "Archived groups are read-only. Restore this group to change participants.",
  usedByAPayment: "Used by a payment",
  cannotDeleteReasonUpdateRelatedExpensesFirstOrUseTheMergeToolBelow: (
    values: MessageValues,
  ) =>
    interpolate(
      "Cannot delete: {reason}. Update related expenses first, or use the merge tool below.",
      values,
    ),
  deleteName2: (values: MessageValues) => interpolate("Delete {name}", values),
  thisPersonHasNoExpensesOrPaymentsDeletionCannotBeUndone:
    "This person has no expenses or payments. Deletion cannot be undone.",
  expenseParticipantDeleted: "Expense participant deleted",
  deleteThisExpenseParticipant: "Delete this expense participant?",
  nameUpdated: "Name updated",
  unableToUpdateName: "Unable to update name",
  rename: "Rename",
  renameName: (values: MessageValues) => interpolate("Rename {name}", values),
  existingExpensesAndPaymentsWillRemainLinkedToThisPerson:
    "Existing expenses and payments will remain linked to this person.",
  newName: "New name",
  saveName: "Save name",
  advancedPeopleTools: "Advanced people tools",
  mergeDuplicatePeople: "Merge duplicate people",
  sourcePerson: "Source person",
  targetPerson: "Target person",
  mergeInto: "Merge into",
  changePreview: "Change preview",
  expensesRelatedExpensesAndPaymentsPaymentsForSourceWillMoveToTargetThenTheSourcePersonWillBeDeleted:
    (values: MessageValues) =>
      interpolate(
        `{expenses} related ${pluralize(values.expenses, "expense")} and {payments} ${pluralize(values.payments, "payment")} for {source} will move to {target}, then the source person will be deleted.`,
        values,
      ),
  mergePeople: "Merge people",
  sourceWillBeDeletedAndRelatedDataWillBeTransferredToTargetAtomically: (
    values: MessageValues,
  ) =>
    interpolate(
      "{source} will be deleted and related data will be transferred to {target} atomically.",
      values,
    ),
  expenseParticipantsMerged: "Expense participants merged",
  mergeFailed: "Merge failed",
  applyMerge: "Apply merge?",
  previewAndMerge: "Preview and merge",
  groupSettings: "Group settings",
  manageSharingGroupPreferencesAndDataToolsHighImpactActionsRequireConfirmation:
    "Manage sharing, group preferences, and data tools. High-impact actions require confirmation.",
  youAreACollaboratorAndCanUseDataToolsOnlyTheOwnerCanManageAccessAndGroupSettings:
    "You are a collaborator and can use data tools. Only the owner can manage access and group settings.",
  sharingAndAccess: "Sharing and access",
  linksActiveLinksCollaboratorsCollaborators: (values: MessageValues) =>
    interpolate(
      `{links} active ${pluralize(values.links, "link")} · {collaborators} ${pluralize(values.collaborators, "collaborator")}`,
      values,
    ),
  shareLinkCreated: "Share link created",
  shareLinkCreatedAndCopied: "Share link created and copied",
  shareLinks: "Share links",
  chooseWhoCanEditThroughTheShareLink:
    "Choose who can view or edit using this link.",
  linkPermission: "Link permission",
  readOnlyLink: "Read-only (no sign-in)",
  signedInEditLink: "Edit after signing in",
  anyoneEditLink: "Anyone with the link can edit",
  signedInEditLinkDescription:
    "After signing in or registering, visitors become collaborators. Revoking the link does not remove people who already joined.",
  anyoneEditLinkDescription:
    "Anyone with the link can edit expenses and participants without signing in. Share it only with people you trust; revocation takes effect immediately.",
  revokingSignedInLinkDoesNotRemoveExistingCollaborators:
    "Revoking prevents new joins. Existing collaborators can still edit; remove their access separately.",
  signInToEditSharedGroup: (values: MessageValues) =>
    interpolate("Sign in or create an account to edit {name}.", values),
  readOnlyShareLinkCreated: "Read-only share link created",
  readOnlyShareLinkCreatedAndCopied: "Read-only share link created and copied",
  shareLinkCreatedYourBrowserBlockedAutomaticCopyingCopyItManually:
    "Share link created. Your browser blocked automatic copying; copy it manually.",
  unableToCreateLink: "Unable to create link",
  shareLinkCopied: "Share link copied",
  yourBrowserBlockedCopyingOpenTheLinkAndCopyItFromTheAddressBar:
    "Your browser blocked copying. Open the link and copy it from the address bar.",
  anyoneWithTheLinkCanViewExpensesBalancesAndSettlementsWithoutSigningInButCannotEdit:
    "Anyone with the link can view expenses, balances, and settlements without signing in, but cannot edit.",
  readOnlyShareLinks: "Read-only share links",
  createReadOnlyLink: "Create read-only link",
  anyoneWithTheLinkCanViewThisGroupsExpensesBalancesAndSettlementSuggestionsButCannotAddOrChangeData:
    "Anyone with the link can view this group's expenses, balances, and settlement suggestions, but cannot add or change data.",
  createAShareLink: "Create a share link?",
  createShareLink: "Create share link",
  revoked: "Revoked",
  active: "Active",
  openLink: "Open link",
  copy: "Copy",
  revokeLink: "Revoke link",
  afterRevocationTheOldLinkWillImmediatelyStopWorking:
    "After revocation, the old link will immediately stop working.",
  shareLinkRevoked: "Share link revoked",
  revokeThisShareLink: "Revoke this share link?",
  revoke: "Revoke",
  noShareLinksYet: "No share links yet.",
  collaboratorAdded: "Collaborator added",
  unableToAddCollaborator: "Unable to add collaborator",
  collaboratorsMustBeExistingUsersTheyCanManageExpensesAndParticipantsButNotOwnerSettings:
    "Collaborators must be existing users. They can manage expenses and participants, but not owner settings.",
  existingUsersUsername: "Existing user's username",
  addCollaborator: "Add collaborator",
  removeName: (values: MessageValues) => interpolate("Remove {name}", values),
  thisAccountWillNoLongerBeAbleToManageTheGroupExistingExpenseDataWillRemain:
    "This account will no longer be able to manage the group. Existing expense data will remain.",
  collaboratorRemoved: "Collaborator removed",
  removeCollaborator: "Remove collaborator?",
  remove: "Remove",
  dataAndExport: "Data and export",
  csvPrintBackupAndRestore: "CSV, print, backup, and restore",
  exportingDoesNotChangeGroupData: "Exporting does not change group data.",
  exportAndPrint: "Export and print",
  expenseCsvExported: "Expense CSV exported",
  exportExpenseCsv: "Export expense CSV",
  settlementCsvExported: "Settlement CSV exported",
  exportSettlementCsv: "Export settlement CSV",
  print: "Print",
  completeBackupDownloaded: "Complete backup downloaded",
  downloadFailed: "Download failed",
  downloadCompleteBackup: "Download complete backup",
  expenseCsvImported: "Expense CSV imported",
  importFailed: "Import failed",
  allRowsAreCheckedFirstNoDataIsWrittenIfAnyRowHasAnError:
    "All rows are checked first. No data is written if any row has an error.",
  importExpenseCsv: "Import expense CSV",
  chooseCsv: "Choose CSV",
  importPreview: "Import preview",
  rowsRowsCanBeImportedErrorsErrors: (values: MessageValues) =>
    interpolate(
      `{rows} ${pluralize(values.rows, "row")} can be imported; {errors} ${pluralize(values.errors, "error")}.`,
      values,
    ),
  rowRowMessage: (values: MessageValues) =>
    interpolate("Row {row}: {message}", values),
  importCountExpenses: (values: MessageValues) =>
    interpolate(`Import {count} ${pluralize(values.count, "expense")}`, values),
  thisWillAddCountExpensesAtOnceAndRecalculateBalances: (
    values: MessageValues,
  ) =>
    interpolate(
      `This will add {count} ${pluralize(values.count, "expense")} at once and recalculate balances.`,
      values,
    ),
  applyCsvImport: "Apply CSV import?",
  applyImport: "Apply import",
  invalidBackupFormat: "Invalid backup format",
  backupRestoredAsANewGroup: "Backup restored as a new group",
  restoreFailed: "Restore failed",
  restoringCreatesANewGroupAndDoesNotOverwriteCurrentData:
    "Restoring creates a new group and does not overwrite current data.",
  restoreJsonBackup: "Restore JSON backup",
  chooseJsonBackup: "Choose JSON backup",
  restorePreviewName: (values: MessageValues) =>
    interpolate("Restore preview: {name}", values),
  peoplePeopleExpensesExpensesPaymentsPaymentsBaseCurrency: (
    values: MessageValues,
  ) =>
    interpolate(
      `{people} ${pluralize(values.people, "person", "people")} · {expenses} ${pluralize(values.expenses, "expense")} · {payments} ${pluralize(values.payments, "payment")} · base {currency}`,
      values,
    ),
  createNewGroup: "Create new group",
  aNewGroupNamedNameWillBeCreatedWithoutChangingExistingGroups: (
    values: MessageValues,
  ) =>
    interpolate(
      "A new group named “{name}” will be created without changing existing groups.",
      values,
    ),
  restoreThisBackup: "Restore this backup?",
  createNewGroup2: "Create new group",
  groupPreferences: "Group preferences",
  changingTheBaseCurrencyRecalculatesDisplayedAmountsAndClearsCustomExchangeRates:
    "Changing the base currency recalculates displayed amounts and clears custom exchange rates.",
  nameAndBaseCurrency: "Name and base currency",
  totalSpendingWillDisplayAsAmountBalancesAndSettlementsBelowWillBeConverted: (
    values: MessageValues,
  ) =>
    interpolate(
      "Total spending will display as {amount}; balances and settlements below will be converted.",
      values,
    ),
  expectCountSettlementSuggestionsCustomRatesWillResetToBuiltInValues: (
    values: MessageValues,
  ) =>
    interpolate(
      `Expect {count} settlement ${pluralize(values.count, "suggestion")}; custom rates will reset to Bank of Taiwan defaults.`,
      values,
    ),
  cancelChanges: "Cancel changes",
  applyGroupPreferences: "Apply group preferences",
  changeTheBaseCurrencyToCurrencyRecalculateAllResultsAndClearCustomRates: (
    values: MessageValues,
  ) =>
    interpolate(
      "Change the base currency to {currency}, recalculate all results, and clear custom rates.",
      values,
    ),
  renameTheGroupToName: (values: MessageValues) =>
    interpolate("Rename the group to “{name}”.", values),
  applyTheseChanges: "Apply these changes?",
  applyChanges: "Apply changes",
  groupPreferencesApplied: "Group preferences applied",
  saveFailed: "Save failed",
  customExchangeRatesApplied: "Custom exchange rates applied",
  unableToSaveExchangeRates: "Unable to save exchange rates",
  currencyConversion: "Currency conversion",
  countCustomRates: (values: MessageValues) =>
    interpolate(`{count} custom ${pluralize(values.count, "rate")}`, values),
  setHowMuch1UnitOfEachCurrencyEqualsInCurrencyLeaveBlankToUseTheBuiltInFixedRate:
    (values: MessageValues) =>
      interpolate(
        "Set how much 1 unit of each currency equals in {currency}. Unset rates automatically use Bank of Taiwan spot mid-rates.",
        values,
      ),
  customExchangeRates: "Custom exchange rates",
  bankOfTaiwanSpotMidRateDescription:
    "When no custom rates are set, Otter automatically uses the midpoint of Bank of Taiwan's spot buy and sell rates. Load and apply these defaults to clear custom values and resume automatic updates.",
  loadBankOfTaiwanSpotMidRates: "Load Bank of Taiwan default rates",
  loadingBankExchangeRates: "Loading bank exchange rates…",
  bankOfTaiwanSpotMidRatesLoadedAtTime: (values: MessageValues) =>
    interpolate("Loaded Bank of Taiwan spot mid-rates ({time}).", values),
  bankOfTaiwanDefaultRatesApplied: "Bank of Taiwan default rates restored",
  unableToLoadBankExchangeRates:
    "Bank exchange rates are currently unavailable. Try again later.",
  conversionPreview: "Conversion preview",
  totalSpendingAmountCountSettlementSuggestions: (values: MessageValues) =>
    interpolate(
      `Total spending: {amount} · {count} settlement ${pluralize(values.count, "suggestion")}.`,
      values,
    ),
  applyRates: "Apply rates",
  allTotalsBalancesAndSettlementSuggestionsWillBeRecalculatedWithTheseRates:
    "All totals, balances, and settlement suggestions will be recalculated with these rates.",
  applyCustomExchangeRates: "Apply custom exchange rates?",
  restoreBankOfTaiwanDefaultRates: "Restore Bank of Taiwan default rates?",
  groupLifecycle: "Group lifecycle",
  archivedReadOnly: "Archived · read-only",
  active2: "Active",
  afterRestoringDataCanBeAddedAndChangedAgain:
    "After restoring, data can be added and changed again.",
  archivingPreservesAllDataButMakesTheGroupReadOnly:
    "Archiving preserves all data but makes the group read-only.",
  restoreGroup: "Restore group",
  archiveGroup: "Archive group",
  afterRestoringTheOwnerAndCollaboratorsCanEditDataAgain:
    "After restoring, the owner and collaborators can edit data again.",
  expensesPeopleAndPaymentRecordsArePreservedAndCannotBeChangedWhileArchived:
    "Expenses, people, and payment records are preserved and cannot be changed while archived.",
  groupRestored: "Group restored",
  groupArchived: "Group archived",
  restoreThisGroup: "Restore this group?",
  archiveThisGroup: "Archive this group?",
  thisPermanentlyDeletesAllPeopleExpensesReceiptsAndSettlementRecordsAndCannotBeUndone:
    "This permanently deletes all people, expenses, receipts, and settlement records and cannot be undone.",
  deleteGroup: "Delete group",
  enterNameToConfirm: (values: MessageValues) =>
    interpolate("Enter “{name}” to confirm", values),
  permanentlyDeleteName: (values: MessageValues) =>
    interpolate("Permanently delete “{name}”", values),
  thisCannotBeUndoneCancelingMakesNoChanges:
    "This cannot be undone. Canceling makes no changes.",
  permanentlyDeleteThisGroup: "Permanently delete this group?",
  permanentlyDeleteGroup: "Permanently delete group",
  groupDeleted: "Group deleted",
  readOnlyShare: "Read-only share",
  youCanViewExpensesBalancesAndSettlementSuggestionsButCannotEditData:
    "You can view expenses, balances, and settlement suggestions, but cannot edit data.",
  completeExpenseHistory: "Complete expense history",
  manageGroupSettings: "Manage group settings",
  csvImportFailed: "CSV import failed",
  theCsvHasNoData: "The CSV has no data",
  missingColumnsColumns: (values: MessageValues) =>
    interpolate("Missing columns: {columns}", values),
  participantNotFoundName: (values: MessageValues) =>
    interpolate("Participant not found: {name}", values),
  invalidJsonFormat: "Invalid JSON format",
  incorrectUsernameOrPassword: "Incorrect username or password",
  everyPersonNeedsAnAmountForACustomSplit:
    "Every person needs an amount for a custom split",
  unsupportedBackupVersion: "Unsupported backup version",
  unsupportedSplitMethod: "Unsupported split method",
  unsupportedExchangeRateCurrency: "Unsupported exchange-rate currency",
  unsupportedBaseCurrency: "Unsupported base currency",
  unsupportedCurrency: "Unsupported currency",
  aParticipantCannotBeMergedIntoThemselves:
    "A participant cannot be merged into themselves",
  theOwnerCannotBeRemoved: "The owner cannot be removed",
  thePayerAndRecipientMustBeDifferent:
    "The payer and recipient must be different",
  payerIsRequired: "Payer is required",
  thePayerMustBeAParticipant: "The payer must be a participant",
  serverError: "Server error",
  invalidPaymentRecordsInBackup: "Invalid payment records in backup",
  splitTotalsInBackupAreInvalid: "Split totals in backup are invalid",
  invalidSplitDataInBackup: "Invalid split data in backup",
  invalidExchangeRatesInBackup: "Invalid exchange rates in backup",
  invalidParticipantDataInBackup: "Invalid participant data in backup",
  backupContainsDuplicateParticipants: "Backup contains duplicate participants",
  invalidBaseCurrencyInBackup: "Invalid base currency in backup",
  invalidExpenseCategoryInBackup: "Invalid expense category in backup",
  anExpenseParticipantInTheBackupDoesNotExist:
    "An expense participant in the backup does not exist",
  anExpenseInTheBackupHasDuplicateParticipants:
    "An expense in the backup has duplicate participants",
  invalidExpenseDataInBackup: "Invalid expense data in backup",
  invalidExpenseTagsInBackup: "Invalid expense tags in backup",
  invalidTripNameInBackup: "Invalid trip name in backup",
  backupIsMissingItsTrip: "Backup is missing its trip",
  backupIsMissingParticipants: "Backup is missing participants",
  backupIsMissingExpenses: "Backup is missing expenses",
  notesCanBeUpTo160Characters: "Notes can be up to 160 characters",
  theShareLinkIsInvalidOrHasBeenRevoked:
    "The share link is invalid or has been revoked",
  atLeastOneSplitParticipantIsRequired:
    "At least one split participant is required",
  splitParticipantsMustBelongToTheTrip:
    "Split participants must belong to the trip",
  splitAmountsMustAddUpToTheExpenseAmount:
    "Split amounts must add up to the expense amount",
  splitAmountsMustBeGreaterThan0: "Split amounts must be greater than 0",
  invalidSplitAmount: "Invalid split amount",
  invalidCategoryOrTagFormat: "Invalid category or tag format",
  exchangeRatesMustBeGreaterThan0: "Exchange rates must be greater than 0",
  invalidExchangeRateFormat: "Invalid exchange-rate format",
  aParticipantWithThisNameAlreadyExists:
    "A participant with this name already exists",
  thisParticipantHasPaymentRecordsAndCannotBeDeleted:
    "This participant has payment records and cannot be deleted",
  thisParticipantHasExpensesAndCannotBeDeleted:
    "This participant has expenses and cannot be deleted",
  onlyTheOwnerCanDownloadACompleteBackup:
    "Only the owner can download a complete backup",
  onlyTheOwnerCanManageShareLinks: "Only the owner can manage share links",
  onlyTheOwnerCanManageCollaborators: "Only the owner can manage collaborators",
  onlyTheOwnerCanManageTripSettings: "Only the owner can manage trip settings",
  namesCanBeUpTo80Characters: "Names can be up to 80 characters",
  passwordMustBeAtLeast8Characters3: "Password must be at least 8 characters",
  invalidArchiveStatus: "Invalid archive status",
  apiEndpointNotFound: "API endpoint not found",
  paymentRecordNotFound: "Payment record not found",
  collaboratorNotFound: "Collaborator not found",
  participantNotFound: "Participant not found",
  noActiveShareLinkWasFound: "No active share link was found",
  expenseNotFound: "Expense not found",
  receiptNotFound: "Receipt not found",
  tripNotFound: "Trip not found",
  userNotFound: "User not found",
  descriptionMustBe1120Characters: "Description must be 1–120 characters",
  theOwnerIsAlreadyInTheCollaboratorList:
    "The owner is already in the collaborator list",
  thisGroupIsArchivedRestoreItBeforeEditing:
    "This group is archived. Restore it before editing.",
  receiptsMustBeJpegPngOrWebpImages:
    "Receipts must be JPEG, PNG, or WebP images",
  theRecipientMustBeAParticipant: "The recipient must be a participant",
  aTripWithThisNameAlreadyExists: "A trip with this name already exists",
  dateMustUseTheYyyyMmDdFormat: "Date must use the YYYY-MM-DD format",
  upTo10TagsAreAllowed: "Up to 10 tags are allowed",
  tagsCanBeUpTo24Characters: "Tags can be up to 24 characters",
  invalidTagFormat: "Invalid tag format",
  theTargetParticipantMustBelongToTheTrip:
    "The target participant must belong to the trip",
  signInFirst: "Sign in first",
  provideExpenseChanges: "Provide expense changes",
  provideTripChanges: "Provide trip changes",
  requestBodyIsTooLarge: "Request body is too large",
  selectAtLeastOneSplitParticipant: "Select at least one split participant",
  enterATripNameOf1100Characters: "Enter a trip name of 1–100 characters",
  enterAnExpenseDescriptionOf1120Characters:
    "Enter an expense description of 1–120 characters",
  enterAParticipantNameOf180Characters:
    "Enter a participant name of 1–80 characters",
  enterAUsernameAndPassword: "Enter a username and password",
  enterSplitValues: "Enter split values",
  enterAValidPaymentDate: "Enter a valid payment date",
  enterValidSplitShares: "Enter valid split shares",
  enterValidSplitPercentages: "Enter valid split percentages",
  enterValidSplitAmounts: "Enter valid split amounts",
  enterAValidExpenseDate: "Enter a valid expense date",
  chooseACsvFile: "Choose a CSV file",
  selectSplitParticipants: "Select split participants",
  chooseAReceiptImage: "Choose a receipt image",
  thisUserIsAlreadyACollaborator: "This user is already a collaborator",
  thisUsernameIsAlreadyRegistered: "This username is already registered",
  usernameIsBeingRegisteredOrAlreadyRegistered:
    "This username is being registered or is already taken",
  usernameIsBeingRegistered: "This username is being registered",
  usernameOrPasskeyAlreadyRegistered:
    "This username or passkey is already registered",
  invalidAmount: "Invalid amount",
  theDefaultDevelopmentAccountsUsernameCannotBeChanged:
    "The default development account's username cannot be changed",
  language: "Language",
  english: "English",
  traditionalChinese: "Traditional Chinese",
} satisfies Messages;
