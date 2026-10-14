import { interpolate, type MessageValues } from "./message-types.js";

export const zhTWPersonal = {
  personalSummary: "我的帳務",
  whoAmI: "我是誰",
  choosePersonalIdentity: "選擇自己的群組身分",
  personalIdentityHelp: "僅儲存在此瀏覽器；選擇身分不會變更操作權限。",
  clearPersonalPreferences: "清除本群組個人偏好",
  personalPreferencesChanged:
    "原身分或分帳設定已失效，已使用有效預設；請重新選擇。",
  personalStorageFailed:
    "無法保存個人偏好；本次選擇仍可使用，重新開啟後可能遺失。",
  rememberExpenseDefaults: "記住貨幣與分帳設定",
  expenseDefaultsRemembered: "已記住本群組的貨幣與分帳設定。",
  copyExpense: "複製為新支出",
  copyExpenseNamed: (values: MessageValues) =>
    interpolate("複製「{name}」為新支出", values),
  personalPaid: "我墊付",
  personalShared: "我分攤",
  personalOwe: "我待付",
  personalOwed: "我待收",
  personalZeroBalance: "沒有待付或待收金額",
  personalTotalsHelp:
    "墊付與分攤不含結清付款；待付／待收含付款與代表人結算，不含待同步草稿。",
  personalSettledBy: (values: MessageValues) =>
    interpolate("由 {name} 代為結算；零餘額不代表已付款。", values),
  personalRepresentsHelp: "你的結算餘額包含其他成員，不等於個人墊付減分攤。",
};
export const enPersonal = {
  personalSummary: "My account",
  whoAmI: "Who am I",
  choosePersonalIdentity: "Select your person in this group",
  personalIdentityHelp:
    "Saved in this browser only. This selection does not change access permissions.",
  clearPersonalPreferences: "Clear personal preferences for this group",
  personalPreferencesChanged:
    "Your person or split settings are no longer available. Valid defaults are in use; select again.",
  personalStorageFailed:
    "Personal preferences could not be saved. Your selection is available now but may be lost when you reopen the page.",
  rememberExpenseDefaults: "Remember currency and split settings",
  expenseDefaultsRemembered:
    "Currency and split settings saved for this group.",
  copyExpense: "Copy as new expense",
  copyExpenseNamed: (values: MessageValues) =>
    interpolate("Copy {name} as new expense", values),
  personalPaid: "I paid",
  personalShared: "My share",
  personalOwe: "I owe",
  personalOwed: "Owed to me",
  personalZeroBalance: "No amount to pay or receive",
  personalTotalsHelp:
    "Paid and share totals exclude settlement payments. Your balance includes payments and representatives, but excludes unsynced drafts.",
  personalSettledBy: (values: MessageValues) =>
    interpolate(
      "{name} settles for you. A zero balance does not mean you have paid.",
      values,
    ),
  personalRepresentsHelp:
    "Your balance includes other people; it is not just your paid total minus your share.",
};
export const jaPersonal = {
  personalSummary: "自分の収支",
  whoAmI: "自分のメンバー",
  choosePersonalIdentity: "このグループの自分を選択",
  personalIdentityHelp:
    "このブラウザーにのみ保存されます。操作権限は変わりません。",
  clearPersonalPreferences: "このグループの個人設定を消去",
  personalPreferencesChanged:
    "メンバーまたは分割設定が無効になったため、既定値に戻しました。選び直してください。",
  personalStorageFailed:
    "個人設定を保存できませんでした。現在の選択は使えますが、ページを開き直すと失われる場合があります。",
  rememberExpenseDefaults: "通貨と分割設定を保存",
  expenseDefaultsRemembered: "このグループの通貨と分割設定を保存しました。",
  copyExpense: "新しい支出としてコピー",
  copyExpenseNamed: (values: MessageValues) =>
    interpolate("「{name}」を新しい支出としてコピー", values),
  personalPaid: "立替額",
  personalShared: "自分の負担額",
  personalOwe: "支払う額",
  personalOwed: "受け取る額",
  personalZeroBalance: "支払い・受け取り額なし",
  personalTotalsHelp:
    "立替額と負担額には精算支払いを含みません。残高には支払いと代表者の精算を含み、未同期の下書きは含みません。",
  personalSettledBy: (values: MessageValues) =>
    interpolate(
      "{name} が代わりに精算します。残高がゼロでも支払済みとは限りません。",
      values,
    ),
  personalRepresentsHelp:
    "残高には他のメンバーも含まれるため、自分の立替額から負担額を引いた金額とは異なります。",
};
export const koPersonal = {
  personalSummary: "내 정산",
  whoAmI: "내 참가자",
  choosePersonalIdentity: "이 그룹에서 본인을 선택하세요",
  personalIdentityHelp:
    "이 브라우저에만 저장됩니다. 선택해도 접근 권한은 바뀌지 않습니다.",
  clearPersonalPreferences: "이 그룹의 개인 설정 지우기",
  personalPreferencesChanged:
    "참가자 또는 분할 설정이 유효하지 않아 기본값을 사용합니다. 다시 선택하세요.",
  personalStorageFailed:
    "개인 설정을 저장하지 못했습니다. 현재 선택은 사용할 수 있지만 페이지를 다시 열면 사라질 수 있습니다.",
  rememberExpenseDefaults: "통화와 분할 설정 기억하기",
  expenseDefaultsRemembered: "이 그룹의 통화와 분할 설정을 저장했습니다.",
  copyExpense: "새 지출로 복사",
  copyExpenseNamed: (values: MessageValues) =>
    interpolate("{name}을 새 지출로 복사", values),
  personalPaid: "내가 낸 금액",
  personalShared: "내 분담액",
  personalOwe: "내가 보낼 금액",
  personalOwed: "내가 받을 금액",
  personalZeroBalance: "보내거나 받을 금액 없음",
  personalTotalsHelp:
    "지불액과 분담액에는 정산 송금이 포함되지 않습니다. 잔액에는 송금과 대표자 정산이 포함되며 미동기화 초안은 제외됩니다.",
  personalSettledBy: (values: MessageValues) =>
    interpolate(
      "{name}이 대신 정산합니다. 잔액이 0이라고 송금 완료를 뜻하지는 않습니다.",
      values,
    ),
  personalRepresentsHelp:
    "잔액에는 다른 참가자의 정산이 포함되어 개인 지불액에서 분담액을 뺀 금액과 다를 수 있습니다.",
};
