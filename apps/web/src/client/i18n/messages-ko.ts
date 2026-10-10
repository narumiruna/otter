import {
  type CatalogShape,
  interpolate,
  type MessageValues,
} from "./message-types.js";
import { koSettings } from "./messages-ko-settings.js";
import type { zhTW } from "./messages-zh-tw.js";

export const ko = {
  ...koSettings,
  welcomeBackEyebrow: "다시 오신 것을 환영합니다",
  startNewJourneyEyebrow: "새로운 여행을 시작하세요",
  parchmentTheme: "양피지",
  expenseTotalLabel: "합계",
  expenseSplitSection: "분담 참여자",
  expenseSplitHelp: "분담할 참여자와 방식을 선택하고 분담 결과를 확인하세요.",
  expenseTagPlaceholder: "태그 추가…",
  addShort: "추가",
  settingsShort: "설정",
  close: "닫기",
  groupDetails: "그룹 상세 정보",
  filters: "필터",
  viewAll: "모두 보기",
  personLabel: "참여자",
  preferencesLabel: "환경 설정",
  profileLabel: "프로필",
  securityLabel: "보안",
  backToGroups: "그룹으로 돌아가기",
  createdLabel: "생성일",
  statusLabel: "상태",
  peopleDeletionHelp:
    "장부에 사용된 참여자는 삭제할 수 없습니다. 정보 버튼에서 개별 제한을 확인하거나 중복 참여자를 병합하세요.",
  personRestriction: (values: MessageValues) =>
    interpolate("{name}의 삭제 제한", values),
  representsPeople: (values: MessageValues) =>
    interpolate("정산 대리 대상: {names}", values),
  expenseRateForName: (values: MessageValues) =>
    interpolate('"{name}" 금액 및 환율 상세 보기', values),
  rateUnavailable: "이전 버전: 환율 없음",
  offlineQueueBanner:
    "오프라인입니다. 불러온 데이터는 볼 수 있습니다. 새 지출은 이 기기에 저장할 수 있지만 다른 수정에는 연결이 필요합니다.",
  queueSave: "이 기기에 저장",
  queueSaved:
    "이 기기에 저장했습니다. 아직 잔액에 반영되지 않으며 환율은 동기화할 때 결정됩니다.",
  queueStorageError:
    "이 기기에 저장할 수 없습니다. 페이지를 열어 둔 상태로 다시 시도하세요.",
  queueTitle: "동기화되지 않은 지출",
  queueNotice:
    "이 기기에만 저장되며 잔액에 반영되지 않습니다. 환율은 동기화할 때 결정됩니다. 브라우저 데이터를 지우면 초안이 사라집니다.",
  queuePending: "동기화 대기 중",
  queueAttempted: "동기화 결과 확인 중입니다. 원래 요청은 수정할 수 없습니다",
  queueConflict:
    "동기화가 중지되었습니다. 권한과 참여자를 확인하세요. 원래 요청은 보존됩니다.",
  queueInvalid: "아직 기록되지 않았습니다. 초안을 수정한 후 다시 시도하세요.",
  queueEdit: "초안 수정",
  queueRetry: "원래 요청으로 다시 시도",
  queueDelete: "기기의 초안 삭제",
  queueDeleteConfirm:
    "기기의 초안을 삭제할까요? 전송한 요청은 이미 기록되었을 수 있습니다. 먼저 그룹을 확인하세요.",
  queueCount: (values: MessageValues) =>
    interpolate("이 기기에 동기화되지 않은 지출이 {count}건 있습니다", values),
  queueSyncPricing:
    "미리 보기에는 원래 통화의 금액만 표시됩니다. 서버가 동기화 시 환율을 결정합니다.",
  queueOrphanTitle: "접근할 수 없는 그룹의 초안",
  queueOrphanNotice:
    "이 그룹에 접근할 수 없습니다. 전송한 요청은 이미 기록되었을 수 있습니다. 기기의 데이터를 삭제하기 전에 확인하세요.",
  queueOrphanTrip: (values: MessageValues) =>
    interpolate("그룹 ID: {id}", values),
  expenseHistory: "변경 내역",
  expenseHistoryDescription:
    "지출 수정, 삭제 및 버전 복원 내역입니다. 결제 내역이나 과거 잔액 기록이 아닙니다.",
  expenseHistoryEmpty: "변경 내역이 없습니다",
  expenseHistoryMore: "변경 내역 더 불러오기",
  expenseHistoryCreated: "생성",
  expenseHistoryUpdated: "수정",
  expenseHistoryDeleted: "삭제됨",
  expenseHistoryRestored: "복원됨",
  expenseHistoryBaseline: "초기 스냅샷",
  expenseHistorySystem: "시스템",
  expenseHistoryBaselineNotice:
    "내역 기록을 시작한 시점의 상태입니다. 이전 변경 사항과 최초 작성자는 알 수 없습니다.",
  expenseHistoryReceiptNotice:
    "영수증 메타데이터만 보존됩니다. 이전 이미지는 볼 수 없습니다.",
  expenseHistoryShares: "분담 금액",
  expenseHistoryRate: "환율 스냅샷",
  expenseHistoryRateBank: "Bank of Taiwan",
  expenseHistoryRateCustom: "그룹 사용자 지정",
  expenseHistoryRateFixed: "기본 고정",
  expenseHistoryRateLegacy: "이전 추정값",
  expenseHistoryRateTimeUnavailable: "환율 조회 시간 없음",
  expenseHistoryRateUnavailable: "이전 버전: 환율 기록 없음",
  expenseHistoryBefore: "변경 전",
  expenseHistoryAfter: "변경 후",
  expenseHistorySourceExpense: "지출 작업",
  expenseHistorySourceCsv: "CSV 가져오기",
  expenseHistorySourceRestore: "백업 복원",
  expenseHistorySourceMerge: "참여자 병합",
  expenseHistorySourceReceipt: "영수증 작업",
  expenseHistorySourceSeed: "개발용 예제",
  expenseHistorySourceMigration: "데이터 마이그레이션",
  expenseHistorySourceVersionRestore: "버전 복원",
  expenseRestoreVersion: (values: MessageValues) =>
    interpolate("버전 {version} 복원", values),
  expenseRestoreTitle: "지출 버전 복원",
  expenseRestoreDescription:
    "현재 지출과 복원할 버전을 확인하세요. 복원 시 새 버전이 추가되며 이후 변경 내역도 보존됩니다.",
  expenseRestoreKeepsReceipt:
    "현재 영수증은 유지됩니다. 이전 영수증 이미지는 복원되지 않습니다.",
  expenseRestoreNoReceipt:
    "삭제된 지출은 영수증 없이 복원됩니다. 이전 이미지는 복원되지 않습니다.",
  expenseRestoreMissingPerson:
    "이 버전의 결제자 또는 분담 참여자가 그룹에 없습니다. 지출을 직접 수정하세요.",
  expenseRestoreUnavailable:
    "이 지출은 복원할 수 없습니다. 새로고침 후 다시 시도하세요.",
  expenseRestoreConflict:
    "지출이 변경되었습니다. 최신 내용을 확인한 후 다시 확정하세요.",
  expenseRestoreConfirm: "이 버전 복원",
  expenseRestored: "지출 버전이 복원되었습니다",
  expenseConflictParticipantsChanged:
    "참여자가 변경되었습니다. 확인하면 유효하지 않은 결제자나 분담 설정은 최신 지출의 설정으로 바뀝니다. 다른 초안 항목은 유지됩니다. 저장 전에 분담 금액을 확인하세요.",
  expenseVersionConflict:
    "지출이 변경되었습니다. 최신 내용을 확인한 후 다시 확정하세요",
  expenseVersionMissing: "지출 버전이 필요합니다. 새로고침 후 다시 시도하세요",
  expenseVersionInvalid: "지출 버전이 잘못되었습니다",
  reviewLatestExpense: "최신 내용 확인",
  confirmLatestExpenseVersion:
    "최신 내용을 확인했습니다. 초안을 유지하고 수정 계속하기",
  latestExpenseMissing:
    "이 지출은 삭제되었거나 접근할 수 없습니다. 초안은 유지되지만 저장할 수 없습니다.",
  deleteExpenseHistoryRetained:
    "지출이 현재 장부에서 제거되고 잔액이 다시 계산됩니다. 변경 내역은 유지됩니다. 이전 버전은 복원할 수 있지만 이전 영수증 이미지는 복원할 수 없습니다.",
  expenseHistoryForName: (values: MessageValues) =>
    interpolate("변경 내역: {name}", values),
  usernameMustBe332LettersNumbersUnderscoresOrHyphens:
    "사용자 이름은 영문자, 숫자, 밑줄 또는 하이픈으로 3~32자여야 합니다",
  travelTogetherSplitExpensesEasily: "함께 여행하고 간편하게 정산하세요",
  goodFriendsSplitExpensesWell: "좋은 친구와 깔끔하게 정산하세요.",
  skipToMainContent: "본문으로 이동",
  otterHome: "otter 홈",
  loading: "불러오는 중",
  unableToLoadOtter: "otter를 불러올 수 없습니다",
  loadingFailed: "불러오기에 실패했습니다",
  reload: "새로고침",
  signedIn: "로그인되었습니다",
  accountCreated: "계정이 생성되었습니다",
  unableToAuthenticate: "인증할 수 없습니다",
  authenticationRequestsTooFrequentTryAgainLater:
    "인증 요청이 너무 많습니다. 잠시 후 다시 시도하세요",
  usernameUpdated: "사용자 이름이 변경되었습니다",
  signedOut: "로그아웃되었습니다",
  signOutFailedMessage: (values: MessageValues) =>
    interpolate("로그아웃 실패: {message}", values),
  pleaseTryAgainLater: "잠시 후 다시 시도하세요",
  signingOut: "로그아웃 중…",
  signOut: "로그아웃",
  authorizeCli: "CLI 연결",
  authorizeCliDescription:
    "터미널에 표시된 Device code를 입력하여 이 CLI의 Otter 데이터 접근을 승인하세요.",
  deviceCode: "Device code",
  checkDeviceCode: "계속",
  checkingDeviceCode: "확인 중…",
  cliAccessRequest: "CLI 접근 요청",
  cliAccessRequestedBy: "요청자",
  approveCliAccess: "접근 승인",
  approvingCliAccess: "승인 중…",
  cliAccessApproved: "CLI가 연결되었습니다",
  cliAccessApprovedDescription: "이 페이지를 닫고 터미널로 돌아가세요.",
  deviceCodeNotFoundOrExpired: "Device code가 없거나 만료되었습니다",
  enterAValidDeviceCode: "유효한 Device code를 입력하세요",
  youAreOfflineLoadedDataIsAvailableButEditingRequiresAConnection:
    "오프라인입니다. 불러온 데이터는 볼 수 있지만 수정하려면 연결이 필요합니다.",
  travelTogetherSplitWithEase: "함께 떠나고 간편하게 정산하세요",
  spendYourTimeOnTheJourney: "시간은 여행에 쓰고,",
  andLeaveTheSplittingToOtter: "정산은 otter에 맡기세요.",
  fromDinnerToAFullTripRecordEverySharedExpenseAndKeepGroupFinancesSimpleAndClear:
    "저녁 식사부터 여행까지, 공동 지출을 기록하고 친구들과의 정산을 간단하고 명확하게 관리하세요.",
  splitExampleAWeekendTripDinnerCostsTwd1800ForThreePeopleOrTwd600Each:
    "정산 예시: 주말 여행의 3인 저녁 식사 비용은 TWD 1,800으로, 1인당 TWD 600입니다.",
  weekendTrip: "주말 여행",
  splitExample: "정산 예시",
  dinnerTogether: "함께한 저녁 식사",
  you: "나",
  a: "A",
  y: "Y",
  splitEquallyAmong3: "3명이 균등 분담",
  each: "1인당",
  quicklyRecordSharedExpenses: "공동 지출을 빠르게 기록하세요",
  seeWhoOwesAndWhoIsOwedAtAGlance: "누가 내고 누가 받을지 한눈에 확인하세요",
  settleUpWithClearSuggestions: "명확한 제안으로 정산하세요",
  signIn: "로그인",
  createAccount: "계정 만들기",
  welcomeBackContinueYourJourney:
    "다시 오신 것을 환영합니다. 여행을 계속하세요.",
  createYourFirstGroupAndStartSplittingWithEase:
    "첫 그룹을 만들고 간편하게 정산을 시작하세요.",
  username: "사용자 이름",
  enterAUsername: "사용자 이름을 입력하세요",
  password: "비밀번호",
  enterAPassword: "비밀번호를 입력하세요",
  developmentCredentialsHaveBeenFilledIn:
    "개발용 로그인 정보가 입력되어 있습니다.",
  signingIn: "로그인 중…",
  or: "또는",
  signInWithAPasskey: "Passkey로 로그인",
  signingInWithAPasskey: "Passkey로 로그인 중…",
  unableToSignInWithAPasskey:
    "Passkey로 로그인할 수 없습니다. 다시 시도하거나 비밀번호를 사용하세요.",
  needAnAccount: "계정이 없으신가요?",
  usernameIsNotCaseSensitive: "대소문자를 구분하지 않습니다.",
  passwordMustBeAtLeast8Characters: "비밀번호는 8자 이상이어야 합니다",
  passwordMustBeAtLeast8Characters2: "비밀번호는 8자 이상이어야 합니다.",
  creating: "생성 중…",
  createAccountWithAPasskey: "Passkey로 계정 만들기",
  creatingAccountWithAPasskey: "Passkey로 계정 생성 중…",
  unableToCreateAccountWithAPasskey:
    "Passkey로 계정을 만들 수 없습니다. 다시 시도하세요.",
  alreadyHaveAnAccount: "이미 계정이 있으신가요?",
  backToSignIn: "로그인으로 돌아가기",
  expenseParticipantsDoNotNeedAccountsToBeIncludedInAGroup:
    "분담 참여자는 계정 없이도 그룹에 포함될 수 있습니다.",
  changeNameSUsername: (values: MessageValues) =>
    interpolate("{name}의 사용자 이름 변경", values),
  nameSAccountMenu: (values: MessageValues) =>
    interpolate("{name}의 계정 메뉴", values),
  unableToUpdateUsername: "사용자 이름을 변경할 수 없습니다",
  changeUsername: "사용자 이름 변경",
  accountSettings: "계정 설정",
  manageYourUsernameAndPasskeys:
    "화면 모양, 언어, 사용자 이름, Passkey 및 API token을 관리하세요.",
  appearance: "화면 모양",
  chooseHowOtterLooksOnThisBrowser:
    "Otter의 화면 모양을 선택하세요. 변경 사항은 즉시 적용되며 이 브라우저에 저장됩니다.",
  colorTheme: "색상 테마",
  forestTheme: "숲",
  oceanTheme: "바다",
  lavenderTheme: "라벤더",
  sunsetTheme: "노을",
  roseTheme: "장미",
  displayMode: "화면 모드",
  systemMode: "시스템 설정",
  lightMode: "라이트",
  darkMode: "다크",
  useTheNewUsernameTheNextTimeYouSignInYourCurrentSessionWillContinue:
    "다음 로그인부터 새 사용자 이름을 사용하세요. 현재 로그인 상태는 유지됩니다.",
  passkeys: "Passkey",
  useAPasskeyToSignInWithoutYourPassword:
    "기기 잠금 해제로 비밀번호 없이 로그인하세요.",
  unableToLoadPasskeys: "Passkey를 불러올 수 없습니다",
  unableToAddPasskey:
    "Passkey를 추가할 수 없습니다. 취소했다면 다시 시도하세요.",
  unableToRemovePasskey: "Passkey를 삭제할 수 없습니다",
  passkeyAdded: "Passkey가 추가되었습니다",
  passkeyRemoved: "Passkey가 삭제되었습니다",
  passkeyNumber: (values: MessageValues) =>
    interpolate("Passkey {number}", values),
  addedOnDate: (values: MessageValues) => interpolate("추가일 {date}", values),
  removePasskeyNumber: (values: MessageValues) =>
    interpolate("Passkey {number} 삭제", values),
  noPasskeysAdded: "아직 추가된 Passkey가 없습니다.",
  addingPasskey: "Passkey 추가 중…",
  addPasskey: "Passkey 추가",
  thisBrowserDoesNotSupportPasskeys:
    "이 브라우저는 Passkey를 지원하지 않습니다.",
  apiTokens: "API token",
  useApiTokensWithTheOtterCli:
    "Otter CLI 또는 자동화 도구용 Bearer token을 만드세요.",
  loadingApiTokens: "API token 불러오는 중…",
  unableToLoadApiTokens: "API token을 불러올 수 없습니다",
  unableToCreateApiToken: "API token을 만들 수 없습니다",
  apiTokenCreationUncertain:
    "Token 생성 결과를 확인할 수 없습니다. 다른 Token을 만들기 전에 이 요청을 다시 시도하세요.",
  retryApiTokenCreation: "Token 생성 다시 시도",
  unableToRevokeApiToken: "API token을 폐기할 수 없습니다",
  unableToCopyApiToken: "API token을 복사할 수 없습니다",
  apiTokenRevoked: "API token이 폐기되었습니다",
  apiTokenCopied: "API token이 복사되었습니다",
  enterATokenName: "Token 이름을 입력하세요",
  newApiToken: "새 API token",
  copyYourApiTokenNow: "지금 API token을 복사하세요",
  apiTokenShownOnce:
    "이 Token은 한 번만 표시됩니다. 페이지를 떠나면 다시 볼 수 없습니다.",
  copyToken: "Token 복사",
  done: "완료",
  tokenName: "Token 이름",
  tokenNameExample: "예: 여행 자동화",
  creatingApiToken: "Token 생성 중…",
  createApiToken: "API token 만들기",
  apiTokenDates: (values: MessageValues) =>
    interpolate("생성일 {created} · 만료일 {expires}", values),
  revokeNamedApiToken: (values: MessageValues) =>
    interpolate('API token "{name}" 폐기', values),
  noActiveApiTokens: "활성 API token이 없습니다.",
  apiTokensExpireAfter90Days:
    "Token은 90일 후 만료됩니다. CLI에서 사용하려면 다음 값으로 설정하세요:",
  passkeyRegistrationRequestsTooFrequent:
    "Passkey 등록 요청이 너무 많습니다. 잠시 후 다시 시도하세요",
  passkeyRegistrationResponseIsInvalid: "Passkey 등록 응답이 잘못되었습니다",
  passkeyRegistrationRequestExpired:
    "Passkey 등록 요청이 만료되었습니다. 다시 시도하세요",
  unableToVerifyPasskey: "Passkey를 검증할 수 없습니다. 다시 시도하세요",
  passkeyAlreadyRegistered: "이 Passkey는 이미 등록되어 있습니다",
  passkeyNotFound: "Passkey를 찾을 수 없습니다",
  cannotRemoveOnlyPasskey:
    "유일한 Passkey는 삭제할 수 없습니다. 계정에 로그인할 수 없게 됩니다",
  passkeyLoginResponseIsInvalid: "Passkey 로그인 응답이 잘못되었습니다",
  passkeyLoginRequestExpired:
    "Passkey 로그인 요청이 만료되었습니다. 다시 시도하세요",
  unableToUsePasskeyToSignIn: "이 Passkey로 로그인할 수 없습니다",
  cancel: "취소",
  saving: "저장 중…",
  save: "저장",
  connectionFailedPleaseTryAgainLater:
    "연결에 실패했습니다. 잠시 후 다시 시도하세요",
  theServerReturnedAnInvalidResponse: "서버 응답이 잘못되었습니다",
  everyone: "모두",
  unknown: "알 수 없음",
  atLeastOneParticipantIsRequired: "참여자가 최소 1명 필요합니다",
  usedByAnExpense: "지출에 사용됨",
  youAreOfflineReconnectAndTryAgain:
    "오프라인입니다. 다시 연결한 후 시도하세요",
  working: "처리 중…",
  unableToApplyChanges: "변경 사항을 적용할 수 없습니다",
  applying: "적용 중…",
  noBalancesYet: "아직 잔액이 없습니다.",
  settled: "정산 완료",
  getsBack: "받을 금액",
  owes: "낼 금액",
  newTaiwanDollar: "신타이완 달러",
  japaneseYen: "일본 엔",
  usDollar: "미국 달러",
  euro: "유로",
  food: "식비",
  transport: "교통",
  lodging: "숙박",
  tickets: "입장권",
  shopping: "쇼핑",
  other: "기타",
  unsavedChangesWillBeLostDiscardTheDraft:
    "저장하지 않은 내용이 사라집니다. 초안을 버릴까요?",
  unableToSwitchGroups: "그룹을 전환할 수 없습니다",
  loadingGroup: "그룹 불러오는 중",
  yourSelectionWillAppearAfterItsDataLoads:
    "데이터를 불러오면 선택한 내용이 표시됩니다.",
  unableToLoadGroup: "그룹을 불러올 수 없습니다",
  groupSwitcher: "그룹 전환",
  groups: "그룹",
  countActiveGroups: (values: MessageValues) =>
    interpolate("사용 중인 그룹 {count}개", values),
  everyTripAddsUpToSomethingWonderful: "모든 여행이 멋진 추억이 됩니다.",
  recordSharedExpensesAndFocusOnThePeopleBesideYou:
    "공동 지출을 기록하고 함께하는 사람들에게 집중하세요.",
  archivedAndReadOnlyDataIsPreservedTheOwnerCanRestoreItUnderMore:
    "보관됨 · 읽기 전용입니다. 데이터는 유지됩니다. 소유자는 그룹 설정에서 복원할 수 있습니다.",
  addTravelCompanionsFirst: "먼저 동행자 추가",
  thereIsOnlyOneParticipantAddSomeoneToSplitWithBeforeRecordingTheFirstExpense:
    "현재 참여자는 1명입니다. 첫 지출을 기록하기 전에 함께 분담할 사람을 추가하세요.",
  addExpenseParticipant: "분담 참여자 추가",
  switchGroups: "그룹 전환",
  youWillLeaveTheCurrentGroupOnlyAfterTheNewOneLoads:
    "새 그룹을 불러온 후에만 현재 그룹에서 이동합니다.",
  participantsPeopleExpensesExpensesCurrency: (values: MessageValues) =>
    interpolate("{participants}명 · 지출 {expenses}건 · {currency}", values),
  archived: "보관됨",
  everydayMomentsTogether: "함께하는 일상",
  collaborator: "공동 편집자",
  owner: "소유자",
  baseCurrencyCurrency: (values: MessageValues) =>
    interpolate("기준 통화 {currency}", values),
  usingCustomExchangeRates: "사용자 지정 환율 사용 중",
  usingBankOfTaiwanExchangeRates: "Bank of Taiwan 기본 환율 사용 중",
  usingFixedFallbackRates:
    "Bank of Taiwan에 연결할 수 없어 대체 고정 환율 사용 중",
  loadingGroup2: "그룹 불러오는 중…",
  people: "참여자",
  expenses: "지출",
  base: "기준",
  overview: "개요",
  more: "더 보기",
  groupWorkspace: "그룹 작업 공간",
  addExpense: "지출 기록",
  archivedGroups: "보관된 그룹",
  unableToCreateGroup: "그룹을 만들 수 없습니다",
  createGroup: "그룹 만들기",
  addCompanionsAfterCreatingTheGroupThenRecordSharedExpenses:
    "그룹을 만든 후 동행자를 추가하고 공동 지출을 기록하세요.",
  groupName: "그룹 이름",
  fiveDaysInTokyo: "도쿄 5일 여행",
  baseCurrency: "기준 통화",
  createYourFirstGroup: "첫 그룹 만들기",
  addATripOrEventGroupOrCreateOneFromAnExistingJsonBackup:
    "여행이나 모임 그룹을 추가하거나 기존 JSON 백업으로 그룹을 만드세요.",
  groupExpenseSummary: "그룹 지출 요약",
  totalSharedExpenses: "공동 지출 합계",
  convertedToBaseCurrency: "기준 통화로 환산됨",
  outstanding: "미정산",
  countSuggestedPaymentsToSettleUp: (values: MessageValues) =>
    interpolate("정산을 위한 권장 결제 {count}건", values),
  nothingIsCurrentlyOutstanding: "현재 미정산 금액이 없습니다",
  settlementSuggestionsAppearAfterExpensesAreAdded:
    "지출을 추가하면 정산 제안이 표시됩니다",
  expenseRecords: "지출 기록",
  sharedAmongCountPeople: (values: MessageValues) =>
    interpolate("{count}명이 분담", values),
  calculatedFromCurrentExpensesAndRecordedPayments:
    "현재 지출과 기록된 결제로 계산됩니다.",
  settleUp: "정산",
  countEntries: (values: MessageValues) => interpolate("{count}건", values),
  entries: "건",
  seePaymentsAndSharesAtAGlance: "결제 금액과 분담 금액을 한눈에 확인하세요.",
  balances: "참여자별 잔액",
  recentExpenses: "최근 지출",
  noExpensesYet: "아직 지출이 없습니다",
  thisGroupHasNotRecordedAnySharedExpenses:
    "이 그룹에 아직 공동 지출이 기록되지 않았습니다.",
  recordTheFirstSharedExpense: "첫 공동 지출 기록",
  addThePeopleSplittingExpensesToCalculateEachBalance:
    "먼저 분담 참여자를 추가한 후 첫 지출을 기록하세요. 잔액과 정산 제안이 자동으로 표시됩니다.",
  balancesAndSettlementSuggestionsWillAppearHereAfterYouAddExpenses:
    "지출을 추가하면 여기에 잔액과 정산 제안이 표시됩니다.",
  addPerson: "참여자 추가",
  managePeople: "참여자 관리",
  everythingIsSettled: "모두 정산되었습니다",
  thereAreNoOutstandingPayments: "미정산 결제가 없습니다.",
  paymentRecorded: "결제가 기록되었습니다",
  unableToRecordPayment: "결제를 기록할 수 없습니다",
  recordPayment: "결제 기록",
  recordSettlementPayment: "정산 결제 기록",
  fromPaysToTheFullSuggestedAmountIsPrefilled: (values: MessageValues) =>
    interpolate(
      "{from}에서 {to}(으)로 결제합니다. 권장 금액 전체가 미리 입력되어 있습니다.",
      values,
    ),
  paymentAmountCurrency: (values: MessageValues) =>
    interpolate("결제 금액 ({currency})", values),
  enterAPaymentAmount: "결제 금액을 입력하세요",
  thePaymentMustBeGreaterThan0AndNoMoreThanTheSuggestedAmount:
    "결제 금액은 0보다 크고 권장 금액 이하여야 합니다",
  expectedRemainder: "적용 후 예상 잔액: ",
  paymentDate: "결제일",
  noteOptional: "메모 (선택)",
  recordPayment2: "결제 기록 확인",
  paymentHistory: "결제 내역",
  dateFromPaidTo: (values: MessageValues) =>
    interpolate("{date} · {from}에서 {to}(으)로 결제", values),
  deletePayment: "결제 기록 삭제",
  remainingSettlementSuggestionsWillBeRecalculated:
    "남은 정산 제안이 다시 계산됩니다.",
  paymentDeleted: "결제 기록이 삭제되었습니다",
  deleteFailed: "삭제에 실패했습니다",
  deleteThisPayment: "이 결제 기록을 삭제할까요?",
  delete: "삭제",
  datePaidByNameSplitWithSplit: (values: MessageValues) =>
    interpolate("{date} · {name} 결제 · {split} 분담", values),
  dailySpending: "일별 지출",
  paidByPerson: "참여자별 결제 금액",
  byCategory: "분류별",
  spendingAnalysis: "지출 분석",
  totalAmount: (values: MessageValues) =>
    interpolate("총 지출 {amount}", values),
  noDataYet: "아직 데이터가 없습니다.",
  showingShownOfTotalExpenses: (values: MessageValues) =>
    interpolate("지출 {total}건 중 {shown}건 표시", values),
  searchDescriptions: "설명 검색",
  searchExpenseDescriptions: "지출 설명 검색",
  sort: "정렬",
  groupBy: "묶기",
  noGrouping: "묶지 않음",
  groupByDate: "날짜별로 묶기",
  groupByPayer: "결제자별로 묶기",
  dateNewestFirst: "최신 날짜순",
  dateOldestFirst: "오래된 날짜순",
  amountHighToLow: "높은 금액순",
  amountLowToHigh: "낮은 금액순",
  moreFilters: "추가 필터",
  countApplied: (values: MessageValues) =>
    interpolate("{count}개 적용됨", values),
  datePersonCurrencyCategoryAndTag: "날짜, 참여자, 통화, 분류, 태그",
  from: "시작일",
  to: "종료일",
  paidBy: "결제자",
  splitWith: "분담 참여자",
  expenseParticipants: "분담 참여자 관리",
  currency: "통화",
  allCurrencies: "모든 통화",
  category: "분류",
  allCategories: "모든 분류",
  tag: "태그",
  exactTag: "태그 정확히 일치",
  applied: "적용됨: ",
  clearAll: "모두 지우기",
  allPeople: "모든 참여자",
  categoryValue: (values: MessageValues) =>
    interpolate("분류: {value}", values),
  currencyValue: (values: MessageValues) =>
    interpolate("통화: {value}", values),
  fromValue: (values: MessageValues) => interpolate("시작일: {value}", values),
  toValue: (values: MessageValues) => interpolate("종료일: {value}", values),
  tagValue: (values: MessageValues) => interpolate("태그: {value}", values),
  aCompleteHistoryWillAppearHereAfterTheFirstSharedExpense:
    "첫 공동 지출을 기록하면 여기에 전체 내역이 표시됩니다.",
  recordFirstExpense: "첫 지출 기록",
  noMatchingExpenses: "조건에 맞는 지출이 없습니다",
  adjustOrClearTheFiltersToSeeAllExpenses:
    "조건을 변경하거나 필터를 지워 모든 지출을 확인하세요.",
  clearFilters: "필터 지우기",
  filteredExpenses: "필터링된 지출",
  allExpenses: "모든 지출",
  columns: "열",
  chooseExpenseColumns: "지출 열 선택",
  expenseName: "지출 이름",
  splitParticipants: "분담 대상",
  receipt: "영수증",
  tags: "태그",
  restoreDefaults: "기본값 복원",
  actions: "작업",
  expenseGroupSummary: (values: MessageValues) =>
    interpolate("{count}건 · 합계 {total}", values),
  countPeople: (values: MessageValues) => interpolate("{count}명", values),
  viewReceiptForName: (values: MessageValues) =>
    interpolate('"{name}" 영수증 보기', values),
  receiptPreviewForName: (values: MessageValues) =>
    interpolate('"{name}" 영수증', values),
  receiptImageForName: (values: MessageValues) =>
    interpolate('"{name}" 영수증 이미지', values),
  closeReceiptPreviewHint: "이미지를 클릭하거나 Esc를 누르면 닫힙니다.",
  closeReceiptPreview: "영수증 미리 보기 닫기",
  openOriginalReceipt: "원본 이미지 열기",
  moreActionsForName: (values: MessageValues) =>
    interpolate('"{name}" 추가 작업', values),
  datePaidByName: (values: MessageValues) =>
    interpolate("{date} · {name} 결제", values),
  splitWithSplit: (values: MessageValues) =>
    interpolate("{split} 분담", values),
  edit: "수정",
  receiptUploadFailed: "영수증 업로드에 실패했습니다",
  receiptUploaded: "영수증이 업로드되었습니다",
  uploading: "업로드 중…",
  uploadReceipt: "영수증 업로드",
  receiptFileRequirements: "JPEG, PNG 또는 WebP · 최대 5 MB",
  selectReceiptPhoto: "사진 업로드",
  takeReceiptPhoto: "사진 촬영",
  removeReceiptPhoto: "사진 삭제",
  receiptOnlineOnly:
    "사진 업로드에는 연결이 필요합니다. 오프라인 초안에는 사진이 저장되지 않습니다. 사진을 삭제하거나 다시 연결하세요.",
  receiptFileTooLarge: "사진은 5 MB 이하여야 합니다",
  expenseSavedReceiptFailed:
    "지출은 생성되었지만 영수증 업로드에 실패했습니다. 다시 시도하거나 나중에 지출 목록에서 업로드하세요.",
  retryReceiptUpload: "영수증 업로드 다시 시도",
  receiptAlreadyAttached:
    "이 지출에는 영수증이 있습니다. 지출 목록에서 확인하세요. 자동으로 덮어쓰지 않습니다.",
  uploadReceiptLater: "나중에 업로드",
  expenseCreationUncertain:
    "지출 생성 여부를 확인할 수 없습니다. 다시 추가하기 전에 지출 목록을 확인하세요. 바로 재시도하지 마세요.",
  viewReceipt: "영수증 보기",
  noReceipt: "영수증 없음",
  deleteReceipt: "영수증 삭제",
  youCanUploadAnotherReceiptLaterTheExpenseWillNotBeDeleted:
    "나중에 다른 영수증을 업로드할 수 있습니다. 지출 자체는 삭제되지 않습니다.",
  receiptDeleted: "영수증이 삭제되었습니다",
  deleteThisReceipt: "이 영수증을 삭제할까요?",
  deleteName: (values: MessageValues) => interpolate('"{name}" 삭제', values),
  thisCannotBeUndoneAllBalancesAndSettlementSuggestionsWillBeRecalculated:
    "되돌릴 수 없습니다. 모든 잔액과 정산 제안이 다시 계산됩니다.",
  expenseDeleted: "지출이 삭제되었습니다",
  deleteThisExpense: "이 지출을 삭제할까요?",
  invalidSplitFormat: "분담 형식이 잘못되었습니다",
  selectAtLeastOnePersonToSplitWith: "분담 참여자를 최소 1명 선택하세요",
  expenseChangesSaved: "지출 변경 사항이 저장되었습니다",
  expenseRecorded: "지출이 기록되었습니다",
  unableToSaveExpense: "지출을 저장할 수 없습니다",
  reviewTheSplitPreviewBeforeSavingChanges:
    "분담 미리 보기를 확인한 후 변경 사항을 저장하세요.",
  enterTheRequiredDetailsFirstCustomSplitsAndTagsAreAvailableBelow:
    "먼저 필수 항목을 입력하세요. 아래에서 사용자 지정 분담과 태그를 설정할 수 있습니다.",
  editExpense: "지출 수정",
  addExpense2: "지출 추가",
  discardDraft: "초안 버리기",
  unsavedChangesWillBeLostExistingDataWillNotChange:
    "저장하지 않은 내용이 사라집니다. 기존 데이터는 변경되지 않습니다.",
  discardThisDraft: "이 초안을 버릴까요?",
  description: "설명",
  dinnerHotelTrainTickets: "저녁 식사, 호텔, 기차표",
  enterAnExpenseDescription: "지출 설명을 입력하세요",
  amount: "금액",
  enterAnExpenseAmount: "지출 금액을 입력하세요",
  date: "날짜",
  currency2: "통화",
  splitPreview: "분담 미리 보기",
  enterAnAmountToPreviewEachPersonsShare:
    "금액을 입력하면 참여자별 분담 금액이 표시됩니다.",
  namePaidAmount: (values: MessageValues) =>
    interpolate("{name} 결제 금액 {amount}", values),
  changePeopleAndSplitMethod: "분담 참여자 및 방식 변경",
  selectedSelectedOfTotal: (values: MessageValues) =>
    interpolate("{total}명 중 {selected}명 선택", values),
  selectAll: "모두 선택",
  clear: "지우기",
  splitMethod: "분담 방식",
  splitEqually: "균등 분담",
  exactAmounts: "금액 지정",
  percentages: "비율",
  shares: "몫",
  nameSKind: (values: MessageValues) => interpolate("{name}의 {kind}", values),
  moreDetails: "추가 정보",
  categoryAndTags: "분류, 태그",
  separateWithCommasForExampleBreakfastTransport:
    "쉼표로 구분하세요. 예: 아침 식사, 교통",
  unsavedChangesWillBeLost: "저장하지 않은 내용이 사라집니다.",
  cancelEditing: "수정을 취소할까요?",
  saveChanges: "변경 사항 저장",
  recordExpense: "지출 기록",
  settlementRepresentative: "정산 대표자",
  settledByName: (values: MessageValues) =>
    interpolate("정산 대표자: {name}", values),
  settleSeparately: "본인 (개별 정산)",
  settlementRepresentativeHelp:
    "지출은 참여자별로 분담됩니다. 잔액과 정산 제안에서는 소속 참여자의 순액을 대표자에게 합산합니다. 대표자는 다른 사람에게 소속될 수 없습니다.",
  representativeHasDependents:
    "이 사람에게 소속된 참여자가 있습니다. 먼저 소속을 해제하세요.",
  settlementRepresentativeUpdated: "정산 대표자가 변경되었습니다",
  unableToUpdateSettlementRepresentative: "정산 대표자를 변경할 수 없습니다",
  provideParticipantChanges: "변경할 참여자 정보를 제공하세요",
  invalidSettlementRepresentative: "정산 대표자 형식이 잘못되었습니다",
  settlementRepresentativeMustBeAnotherGroupMember:
    "정산 대표자는 같은 그룹의 다른 참여자여야 합니다",
  settlementRepresentativeCannotBeAssignedOrHaveDependents:
    "대표자는 다른 사람에게 정산을 맡길 수 없으며, 소속 참여자가 있는 사람도 다른 대표자에게 정산을 맡길 수 없습니다",
  invalidBackupSettlementRepresentative:
    "백업의 정산 대표자 형식이 잘못되었습니다",
  expenseParticipantAdded: "분담 참여자가 추가되었습니다",
  unableToAddPerson: "참여자를 추가할 수 없습니다",
  expenseParticipantsDoNotNeedToSignInManageAccountsWithAccessUnderMoreSharingAndAccess:
    '분담 참여자는 로그인할 필요가 없습니다. 접근 권한이 있는 계정은 "그룹 설정 → 공유 및 접근 권한"에서 관리하세요.',
  personsName: "참여자 이름",
  friendsName: "친구 이름",
  enterAName: "이름을 입력하세요",
  archivedGroupsAreReadOnlyRestoreThisGroupToChangeParticipants:
    "보관된 그룹은 읽기 전용입니다. 참여자를 변경하려면 그룹을 복원하세요.",
  usedByAPayment: "결제에 사용됨",
  cannotDeleteReasonUpdateRelatedExpensesFirstOrUseTheMergeToolBelow: (
    values: MessageValues,
  ) =>
    interpolate(
      "삭제할 수 없습니다: {reason}. 관련 지출을 수정하거나 아래 병합 도구를 사용하세요.",
      values,
    ),
  deleteName2: (values: MessageValues) => interpolate("{name} 삭제", values),
  thisPersonHasNoExpensesOrPaymentsDeletionCannotBeUndone:
    "이 참여자는 지출이나 결제에 사용되지 않았습니다. 삭제는 되돌릴 수 없습니다.",
  expenseParticipantDeleted: "분담 참여자가 삭제되었습니다",
  deleteThisExpenseParticipant: "분담 참여자를 삭제할까요?",
  nameUpdated: "참여자 이름이 변경되었습니다",
  unableToUpdateName: "이름을 변경할 수 없습니다",
  rename: "이름 변경",
  renameName: (values: MessageValues) =>
    interpolate("{name} 이름 변경", values),
  existingExpensesAndPaymentsWillRemainLinkedToThisPerson:
    "기존 지출과 결제는 이 참여자와 계속 연결됩니다.",
  newName: "새 이름",
  saveName: "이름 저장",
  advancedPeopleTools: "참여자 고급 도구",
  mergeDuplicatePeople: "중복 참여자 병합",
  sourcePerson: "원본 참여자",
  targetPerson: "대상 참여자",
  mergeInto: "병합 대상",
  changePreview: "변경 미리 보기",
  expensesRelatedExpensesAndPaymentsPaymentsForSourceWillMoveToTargetThenTheSourcePersonWillBeDeleted:
    (values: MessageValues) =>
      interpolate(
        "{source}의 관련 지출 {expenses}건과 결제 {payments}건을 {target}(으)로 옮긴 후 원본 참여자를 삭제합니다.",
        values,
      ),
  mergePeople: "참여자 병합 확인",
  sourceWillBeDeletedAndRelatedDataWillBeTransferredToTargetAtomically: (
    values: MessageValues,
  ) =>
    interpolate(
      "{source}을(를) 삭제하고 관련 데이터를 {target}(으)로 원자적으로 옮깁니다.",
      values,
    ),
  expenseParticipantsMerged: "분담 참여자가 병합되었습니다",
  mergeFailed: "병합에 실패했습니다",
  applyMerge: "병합을 적용할까요?",
  previewAndMerge: "미리 보고 병합",
} satisfies CatalogShape<typeof zhTW>;
