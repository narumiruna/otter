import { interpolate, type MessageValues } from "./message-types.js";

export const zhTWInterface = {
  welcomeBackEyebrow: "歡迎回來",
  startNewJourneyEyebrow: "開始新旅程",
  parchmentTheme: "暖紙",
  expenseTotalLabel: "合計",
  expenseSplitSection: "分攤對象",
  expenseSplitHelp: "選擇分攤成員與方式，並確認分帳結果。",
  expenseTagPlaceholder: "新增標籤…",
  addShort: "新增",
  settingsShort: "設定",
  close: "關閉",
  groupDetails: "群組詳細資訊",
  filters: "篩選",
  viewAll: "查看全部",
  personLabel: "成員",
  preferencesLabel: "偏好",
  profileLabel: "個人資料",
  securityLabel: "安全性",
  backToGroups: "返回群組",
  createdLabel: "建立日期",
  statusLabel: "狀態",
  peopleDeletionHelp:
    "已用於帳目的成員不能刪除。個別限制可點擊資訊圖示查閱；重複成員可使用合併工具。",
  personRestriction: (values: MessageValues) =>
    interpolate("{name} 的刪除限制", values),
  representsPeople: (values: MessageValues) =>
    interpolate("代結算：{names}", values),
  expenseRateForName: (values: MessageValues) =>
    interpolate("查看「{name}」的金額與匯率明細", values),
  rateUnavailable: "舊版資料：匯率未提供",
};

export const enInterface = {
  welcomeBackEyebrow: "WELCOME BACK",
  startNewJourneyEyebrow: "START A NEW JOURNEY",
  parchmentTheme: "Parchment",
  expenseTotalLabel: "Total",
  expenseSplitSection: "Split among people",
  expenseSplitHelp:
    "Select who will split this expense, choose a method, and see the result.",
  expenseTagPlaceholder: "Add a tag…",
  addShort: "Add",
  settingsShort: "Settings",
  close: "Close",
  groupDetails: "Group details",
  filters: "Filters",
  viewAll: "View all",
  personLabel: "Person",
  preferencesLabel: "Preferences",
  profileLabel: "Profile",
  securityLabel: "Security",
  backToGroups: "Back to groups",
  createdLabel: "Created",
  statusLabel: "Status",
  peopleDeletionHelp:
    "People used in the ledger cannot be deleted. Check individual restrictions with the info button, or merge duplicate people.",
  personRestriction: (values: MessageValues) =>
    interpolate("Deletion restrictions for {name}", values),
  representsPeople: (values: MessageValues) =>
    interpolate("Represents {names}", values),
  expenseRateForName: (values: MessageValues) =>
    interpolate("View amount and exchange rate for {name}", values),
  rateUnavailable: "Rate unavailable (older payload)",
};
