import {
  type CatalogShape,
  interpolate,
  type MessageValues,
} from "./message-types.js";
import { filAi } from "./messages-ai.js";
import { filAiAuth } from "./messages-ai-auth.js";
import { automaticRateMessages } from "./messages-automatic-rates.js";
import { filAuth } from "./messages-fil-auth.js";
import { filExpenses } from "./messages-fil-expenses.js";
import { filGroups } from "./messages-fil-groups.js";
import { filSettings } from "./messages-fil-settings.js";
import type { zhTW } from "./messages-zh-tw.js";

export const fil = {
  ...automaticRateMessages("fil"),
  ...filAi,
  ...filAiAuth,
  ...filAuth,
  ...filGroups,
  ...filExpenses,
  ...filSettings,
  browserExpenseDefaults: "Mga default na setting ng gastos sa browser na ito",
  browserExpenseDefaultsHelp:
    "Burahin lamang ang mga default na setting ng pera at paghahati ng account na ito para sa grupong ito. Hindi magbabago ang mga account, pag-sign in, at pahintulot.",
  clearPersonalPreferences:
    "Burahin ang mga default na setting ng gastos para sa grupong ito",
  expenseDefaultsCleared:
    "Nabura ang mga default na setting ng gastos para sa grupong ito.",
  personalPreferencesChanged:
    "Hindi na magagamit ang iyong mga setting ng paghahati. Ginagamit ang mga wastong default; pumili muli.",
  personalStorageFailed:
    "Hindi na-save ang mga default na setting ng gastos. Magagamit pa ang kasalukuyang mga setting ngunit maaaring mawala kapag binuksan mong muli ang pahina.",
  rememberExpenseDefaults: "Tandaan ang mga setting ng pera at paghahati",
  expenseDefaultsRemembered:
    "Na-save ang mga setting ng pera at paghahati para sa grupong ito.",
  deleteExpense: "Burahin ang gastos",
  copyExpense: "Kopyahin bilang bagong gastos",
  copyExpenseNamed: (values: MessageValues) =>
    interpolate("Kopyahin ang {name} bilang bagong gastos", values),
  memberAccounts: "Mga tala ng miyembro",
  accountPaid: "Ibinayad",
  accountShared: "Bahagi sa gastos",
  accountBalance: "Tatanggapin / babayaran",
  accountReceivable: "Tatanggapin",
  accountPayable: "Babayaran",
  accountSettled: "Bayad na",
  accountPaidHelp:
    "Ang ibinayad ay ang halagang ibinayad sa mga tindahan at iba pang tagapagbigay ng produkto o serbisyo. Hindi kasama ang mga bayad sa pagitan ng mga miyembro para sa pag-aayos ng utang.",
  accountTotalsHelp:
    "Ang bahagi sa gastos ay ang halagang dapat sagutin ng bawat miyembro. Kasama rin sa mga balanse ang mga naitalang bayad at pagsasaayos para sa mga kinatawan. Hindi kasama ang mga draft na hindi pa naka-sync.",
  accountDetails: "Tingnan ang mga detalye",
  accountPaidExpenses: "Mga gastos na ibinayad para sa grupo",
  accountSharedExpenses: "Mga pinaghatiang gastos",
  accountExpenseTotal: "Kabuuang halaga ng buong gastos",
  accountPayments: "Mga bayad na ipinadala / natanggap",
  accountPaymentSent: "Ipinadala",
  accountPaymentReceived: "Natanggap",
  accountAdjustments: "Mga pagsasaayos para sa kinatawan",
  accountDetailsUnavailable:
    "Hindi kasama sa ibinahaging datos na ito ang mga detalye ng bayad. Ginagamit ng mga balanse ang mga resulta ng pagkalkula ng grupo.",
  accountRepresentedBy: (values: MessageValues) =>
    interpolate(
      "Si {name} ang nag-aayos ng utang para sa miyembrong ito. Ang balanseng zero ay hindi nangangahulugang nakapagbayad na ang miyembrong ito.",
      values,
    ),
  visaSettlementTitle: "Pag-aayos ng utang batay sa Visa",
  visaSettlementCurrency: "Pera para sa pag-aayos ng utang",
  visaSettlementEnable:
    "I-convert ang lahat ng gastos gamit ang mga rate ng Visa ayon sa petsa at ayusin ang utang sa napiling pera",
  visaSettlementHelp:
    "Naka-off bilang default. Hindi magbabago ang mga orihinal na halaga. Kapag naka-on, mase-save ang rate ng Visa para sa petsa ng bawat gastos at gagamitin ang napiling pera para sa mga balanse at pag-aayos ng utang. Saklaw ang lahat ng gastos, pati cash, nang walang bayarin sa bangko. Tantiya ang mga rate ng Visa; maaaring iba ang singil sa card. Dapat gamitin ng mga kasalukuyang bayad ang napiling pera bago ito i-on o palitan ang pera.",
  visaSettlementSaved:
    "Na-save ang setting ng pag-aayos ng utang gamit ang Visa",
  visaSettlementOn: (values: MessageValues) =>
    interpolate("Naka-on · {currency}", values),
  visaSettlementOff: "Naka-off",
  visaRateLabel: "Visa",
  visaSettingInvalid:
    "Hindi wasto ang setting ng pag-aayos ng utang gamit ang Visa",
  visaIncompatiblePayments:
    "Dapat gamitin ng mga kasalukuyang tala ng bayad ang napiling pera para sa pag-aayos ng utang",
  visaSettingUnavailable:
    "Hindi makuha ang mga rate ng Visa. Hindi binago ang setting. Subukan muli mamaya.",
  visaPaymentCurrency:
    "Dapat gamitin ng mga bayad para sa pag-aayos ng utang gamit ang Visa ang napiling pera",
  visaRateUnavailable: (values: MessageValues) =>
    interpolate(
      "Hindi makuha ang rate ng Visa na {currency}/{target} para sa {date}. Subukan muli mamaya.",
      values,
    ),
  offlineQueueBanner:
    "Offline: magagamit pa ang na-load na datos. Maaaring i-save ang mga bagong gastos sa device na ito; kailangan ng koneksyon para sa iba pang pagbabago.",
  queueSave: "I-save sa device na ito",
  queueSaved:
    "Na-save sa device na ito. Hindi pa kasama sa mga balanse; itatakda ang mga exchange rate kapag nag-sync.",
  queueStorageError:
    "Hindi ma-save sa device na ito. Panatilihing bukas ang pahinang ito at subukan muli.",
  queueTitle: "Mga gastos na hindi pa naka-sync",
  queueNotice:
    "Nasa device na ito lamang. Hindi kasama sa mga balanse. Itatakda ang mga exchange rate kapag nag-sync. Mawawala ang mga draft na ito kung buburahin ang datos ng browser.",
  queuePending: "Naghihintay na mag-sync",
  queueAttempted:
    "Hinihintay ang kumpirmasyon ng pag-sync; huwag baguhin ang orihinal na request",
  queueConflict:
    "Huminto ang pag-sync. Suriin ang access at mga kalahok bago subukan muli; pinanatili ang orihinal na request.",
  queueInvalid: "Hindi naitala. Baguhin ang draft at subukan muli.",
  queueEdit: "Baguhin ang draft",
  queueRetry: "Subukang muli ang orihinal na request",
  queueDelete: "Burahin ang lokal na draft",
  queueDeleteConfirm:
    "Burahin ang lokal na draft na ito? Maaaring naitala pa rin sa server ang isang naipadala nang request. Suriin muna ang grupo.",
  queueCount: (values: MessageValues) =>
    interpolate(
      "Mga gastos na hindi pa naka-sync sa device na ito: {count}",
      values,
    ),
  queueSyncPricing:
    "Orihinal na pera lamang ang ipinapakita sa preview. Itatakda ng server ang exchange rate kapag nag-sync.",
  queueOrphanTitle: "Mga draft mula sa mga grupong hindi na ma-access",
  queueOrphanNotice:
    "Hindi na ma-access ang mga grupong ito. Maaaring naitala ang isang naipadalang request; suriin bago burahin ang lokal na kopya nito.",
  queueOrphanTrip: (values: MessageValues) =>
    interpolate("ID ng grupo: {id}", values),
  accountSettings: "Mga setting ng account",
  manageYourUsernameAndPasskeys:
    "Pamahalaan ang hitsura, wika, username, mga Passkey, at mga API token.",
  appearance: "Hitsura",
  chooseHowOtterLooksOnThisBrowser:
    "Piliin ang hitsura ng Otter. Agad na ilalapat at ise-save sa browser na ito ang mga pagbabago.",
  colorTheme: "Tema ng kulay",
  forestTheme: "Kagubatan",
  oceanTheme: "Karagatan",
  lavenderTheme: "Lavanda",
  sunsetTheme: "Takipsilim",
  roseTheme: "Rosas",
  displayMode: "Mode ng display",
  systemMode: "Sistema",
  lightMode: "Maliwanag",
  darkMode: "Madilim",
  useTheNewUsernameTheNextTimeYouSignInYourCurrentSessionWillContinue:
    "Gamitin ang bagong username sa susunod mong pag-sign in. Magpapatuloy ang kasalukuyan mong session.",
  passkeys: "Mga Passkey",
  useAPasskeyToSignInWithoutYourPassword:
    "Gamitin ang pag-unlock ng iyong device upang mag-sign in nang hindi inilalagay ang iyong password.",
  unableToLoadPasskeys: "Hindi ma-load ang mga Passkey",
  unableToAddPasskey:
    "Hindi maidagdag ang Passkey. Kung kinansela mo ito, subukan muli.",
  unableToRemovePasskey: "Hindi maalis ang Passkey",
  passkeyAdded: "Naidagdag ang Passkey",
  passkeyRemoved: "Naalis ang Passkey",
  passkeyNumber: (values: MessageValues) =>
    interpolate("Passkey {number}", values),
  addedOnDate: (values: MessageValues) =>
    interpolate("Idinagdag noong {date}", values),
  removePasskeyNumber: (values: MessageValues) =>
    interpolate("Alisin ang Passkey {number}", values),
  noPasskeysAdded: "Wala pang naidagdag na Passkey.",
  addingPasskey: "Idinaragdag ang Passkey…",
  addPasskey: "Magdagdag ng Passkey",
  thisBrowserDoesNotSupportPasskeys:
    "Hindi sinusuportahan ng browser na ito ang mga Passkey.",
  apiTokens: "Mga API token",
  useApiTokensWithTheOtterCli:
    "Gumawa ng mga Bearer token para sa Otter CLI o mga tool sa automation.",
  loadingApiTokens: "Nilo-load ang mga API token…",
  unableToLoadApiTokens: "Hindi ma-load ang mga API token",
  unableToCreateApiToken: "Hindi magawa ang API token",
  apiTokenCreationUncertain:
    "Hindi tiyak ang resulta ng request para sa token. Subukan muli ang request na ito bago gumawa ng iba.",
  retryApiTokenCreation: "Subukang muli ang paggawa ng token",
  unableToRevokeApiToken: "Hindi mapawalang-bisa ang API token",
  unableToCopyApiToken: "Hindi makopya ang API token",
  apiTokenRevoked: "Napawalang-bisa ang API token",
  apiTokenCopied: "Nakopya ang API token",
  enterATokenName: "Maglagay ng pangalan ng token",
  newApiToken: "Bagong API token",
  copyYourApiTokenNow: "Kopyahin ngayon ang iyong API token",
  apiTokenShownOnce:
    "Isang beses lamang ipinapakita ang token na ito. Hindi mo na ito makikita muli pag-alis mo.",
  copyToken: "Kopyahin ang token",
  done: "Tapos na",
  tokenName: "Pangalan ng token",
  tokenNameExample: "Halimbawa: Automation sa paglalakbay",
  creatingApiToken: "Ginagawa ang token…",
  createApiToken: "Gumawa ng API token",
  apiTokenDates: (values: MessageValues) =>
    interpolate(
      "Ginawa noong {created} · Mawawalan ng bisa sa {expires}",
      values,
    ),
  revokeNamedApiToken: (values: MessageValues) =>
    interpolate('Pawalang-bisa ang API token na "{name}"', values),
  noActiveApiTokens: "Walang aktibong API token.",
  apiTokensExpireAfter90Days:
    "Mawawalan ng bisa ang mga token pagkalipas ng 90 araw. Upang gumamit ng isa sa CLI, itakda ito bilang",
  welcomeBackEyebrow: "MALIGAYANG PAGBABALIK",
  startNewJourneyEyebrow: "MAGSIMULA NG BAGONG PAGLALAKBAY",
  parchmentTheme: "Pergamino",
  expenseTotalLabel: "Kabuuan",
  expenseSplitSection: "Hatiin sa mga tao",
  expenseSplitHelp:
    "Piliin kung sino ang maghahati sa gastos na ito, pumili ng paraan, at tingnan ang resulta.",
  expenseTagPlaceholder: "Magdagdag ng tag…",
  addShort: "Idagdag",
  settingsShort: "Mga setting",
  close: "Isara",
  groupDetails: "Mga detalye ng grupo",
  filters: "Mga filter",
  viewAll: "Tingnan lahat",
  personLabel: "Tao",
  preferencesLabel: "Mga kagustuhan",
  profileLabel: "Propayl",
  securityLabel: "Seguridad",
  backToGroups: "Bumalik sa mga grupo",
  backToExpenseList: "Bumalik sa listahan ng gastos",
  expenseEditorUnavailable:
    "Hindi ma-edit ang gastos na ito. Maaaring wala na ito, o ang grupo ay para sa pagbasa lamang o naka-archive.",
  createdLabel: "Ginawa",
  statusLabel: "Katayuan",
  peopleDeletionHelp:
    "Hindi mabubura ang mga taong ginagamit sa talaan ng gastos. Suriin ang mga limitasyon ng bawat tao gamit ang button ng impormasyon, o pagsamahin ang mga dobleng tao.",
  personRestriction: (values: MessageValues) =>
    interpolate("Mga limitasyon sa pagbura kay {name}", values),
  representsPeople: (values: MessageValues) =>
    interpolate("Kinakatawan sina {names}", values),
  expenseRateForName: (values: MessageValues) =>
    interpolate("Tingnan ang halaga at exchange rate para sa {name}", values),
  rateUnavailable: "Hindi makuha ang rate (mas lumang datos)",
  expenseHistory: "Kasaysayan ng pagbabago",
  expenseHistoryDescription:
    "Mga pagbabago, pagbura, at pagpapanumbalik ng gastos; hindi kasaysayan ng bayad o mga dating balanse.",
  expenseHistoryEmpty: "Walang naitalang pagbabago",
  expenseHistoryMore: "Mag-load ng higit pang pagbabago",
  expenseHistoryCreated: "Ginawa",
  expenseHistoryUpdated: "Binago",
  expenseHistoryDeleted: "Binura",
  expenseHistoryRestored: "Ibinalik",
  expenseHistoryBaseline: "Paunang kopya ng estado",
  expenseHistorySystem: "Sistema",
  expenseHistoryBaselineNotice:
    "Estado noong pinagana ang kasaysayan; hindi alam ang mga naunang pagbabago at ang orihinal na may-akda.",
  expenseHistoryReceiptNotice:
    "Metadata lamang ng resibo ang pinanatili. Hindi magagamit ang mga dating larawan.",
  expenseHistoryShares: "Mga halagang hinati",
  expenseHistoryRate: "Kopya ng exchange rate",
  expenseHistoryRateBank: "Bank of Taiwan",
  expenseHistoryRateCustom: "Pasadya ng grupo",
  expenseHistoryRateFixed: "Nakapirming built-in",
  expenseHistoryRateLegacy: "Lumang tantiya",
  expenseHistoryRateTimeUnavailable: "Hindi makuha ang oras ng rate",
  expenseHistoryRateUnavailable: "Lumang bersyon: walang naitalang rate",
  expenseHistoryBefore: "Bago ang pagbabago",
  expenseHistoryAfter: "Pagkatapos ng pagbabago",
  expenseHistorySourceExpense: "Aksyon sa gastos",
  expenseHistorySourceCsv: "Pag-import ng CSV",
  expenseHistorySourceRestore: "Pagpapanumbalik ng backup",
  expenseHistorySourceMerge: "Pagsasama ng kalahok",
  expenseHistorySourceReceipt: "Aksyon sa resibo",
  expenseHistorySourceSeed: "Datos para sa development",
  expenseHistorySourceMigration: "Paglipat ng datos",
  expenseHistorySourceVersionRestore: "Pagpapanumbalik ng bersyon",
  expenseRestoreVersion: (values: MessageValues) =>
    interpolate("Ibalik ang v{version}", values),
  expenseRestoreTitle: "Ibalik ang bersyon ng gastos",
  expenseRestoreDescription:
    "Suriin ang kasalukuyang gastos at ang bersyong ibabalik. Magdaragdag ng bagong bersyon ang pagpapanumbalik; mananatiling magagamit ang mas bagong kasaysayan.",
  expenseRestoreKeepsReceipt:
    "Mananatiling naka-attach ang kasalukuyang resibo. Hindi ibabalik ang mga lumang larawan ng resibo.",
  expenseRestoreNoReceipt:
    "Ibabalik ang binurang gastos nang walang resibo. Hindi ibabalik ang mga lumang larawan ng resibo.",
  expenseRestoreMissingPerson:
    "May tinutukoy ang bersyong ito na wala na sa grupo. Sa halip, baguhin nang manu-mano ang gastos.",
  expenseRestoreUnavailable:
    "Hindi maibalik ang gastos na ito. I-reload at subukan muli.",
  expenseRestoreConflict:
    "Nagbago ang gastos. Suriin ang pinakabagong estado bago kumpirmahin muli.",
  expenseRestoreConfirm: "Ibalik ang bersyong ito",
  expenseRestored: "Naibalik ang bersyon ng gastos",
  expenseConflictParticipantsChanged:
    "Nagbago ang mga tao. Kapag kinumpirma, papalitan ng mga setting ng pinakabagong gastos ang mga napiling nagbayad o kahati na hindi na magagamit. Mananatili ang iba pang field ng draft; suriin ang mga halagang hinati bago i-save.",
  expenseVersionConflict:
    "Nagbago ang gastos na ito. Suriin ang pinakabagong bersyon bago kumpirmahin muli.",
  expenseVersionMissing:
    "Ibigay ang bersyon ng gastos. I-reload at subukan muli.",
  expenseVersionInvalid: "Hindi wastong bersyon ng gastos",
  reviewLatestExpense: "Suriin ang pinakabagong gastos",
  confirmLatestExpenseVersion:
    "Nasuri na ang pinakabagong bersyon; panatilihin ang aking draft at magpatuloy sa pag-edit",
  latestExpenseMissing:
    "Binura na ang gastos na ito o hindi na ito ma-access. Pinanatili ang iyong draft ngunit hindi ito mase-save.",
  deleteExpenseHistoryRetained:
    "Aalisin ang gastos sa kasalukuyang talaan at muling kakalkulahin ang mga balanse. Pananatilihin ang kasaysayan ng pagbabago; maaari mong ibalik ang mas lumang bersyon nang wala ang lumang larawan ng resibo nito.",
  expenseHistoryForName: (values: MessageValues) =>
    interpolate("Kasaysayan ng pagbabago: {name}", values),
} satisfies CatalogShape<typeof zhTW>;
