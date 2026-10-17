import { interpolate, type MessageValues } from "./message-types.js";

export const zhTWPersonal = {
  browserExpenseDefaults: "此瀏覽器的支出預設",
  browserExpenseDefaultsHelp:
    "僅清除此帳號在本群組的貨幣與分帳預設，不變更帳務、登入或操作權限。",
  clearPersonalPreferences: "清除本群組支出預設",
  expenseDefaultsCleared: "已清除本群組的支出預設。",
  personalPreferencesChanged: "原分帳設定已失效，已使用有效預設；請重新選擇。",
  personalStorageFailed:
    "無法保存支出預設；本次設定仍可使用，重新開啟後可能遺失。",
  rememberExpenseDefaults: "記住貨幣與分帳設定",
  expenseDefaultsRemembered: "已記住本群組的貨幣與分帳設定。",
  deleteExpense: "刪除支出",
  copyExpense: "複製為新支出",
  copyExpenseNamed: (values: MessageValues) =>
    interpolate("複製「{name}」為新支出", values),
  memberAccounts: "成員帳務",
  accountPaid: "實付",
  accountShared: "分攤",
  accountBalance: "待收／待付",
  accountReceivable: "待收",
  accountPayable: "待付",
  accountSettled: "已結清",
  accountPaidHelp: "實付為支付店家等支出的金額，不含成員間結清付款。",
  accountTotalsHelp:
    "分攤為應負擔的支出。餘額另含已記錄付款與代表人調整；不含待同步草稿。",
  accountDetails: "查看明細",
  accountPaidExpenses: "替群組支付的支出",
  accountSharedExpenses: "分攤的支出",
  accountExpenseTotal: "支出總額",
  accountPayments: "付款／收款紀錄",
  accountPaymentSent: "已付款",
  accountPaymentReceived: "已收款",
  accountAdjustments: "代表人結算調整",
  accountDetailsUnavailable: "此分享未提供付款明細；餘額以群組計算結果為準。",
  accountRepresentedBy: (values: MessageValues) =>
    interpolate("由 {name} 代為結算；零餘額不代表本人已有付款紀錄。", values),
};
export const enPersonal = {
  browserExpenseDefaults: "Expense defaults in this browser",
  browserExpenseDefaultsHelp:
    "Clear only this account's currency and split defaults for this group. Accounts, sign-in and permissions do not change.",
  clearPersonalPreferences: "Clear expense defaults for this group",
  expenseDefaultsCleared: "Expense defaults cleared for this group.",
  personalPreferencesChanged:
    "Your split settings are no longer available. Valid defaults are in use; select again.",
  personalStorageFailed:
    "Expense defaults could not be saved. Current settings remain available but may be lost when you reopen the page.",
  rememberExpenseDefaults: "Remember currency and split settings",
  expenseDefaultsRemembered:
    "Currency and split settings saved for this group.",
  deleteExpense: "Delete expense",
  copyExpense: "Copy as new expense",
  copyExpenseNamed: (values: MessageValues) =>
    interpolate("Copy {name} as new expense", values),
  memberAccounts: "Member accounts",
  accountPaid: "Paid",
  accountShared: "Share",
  accountBalance: "To receive / pay",
  accountReceivable: "To receive",
  accountPayable: "To pay",
  accountSettled: "Settled",
  accountPaidHelp:
    "Paid is the amount paid to shops and other expense providers. It excludes settlement payments between members.",
  accountTotalsHelp:
    "Share is the expense amount each member owes. Balances also include recorded payments and representative adjustments. Unsynced drafts are excluded.",
  accountDetails: "View details",
  accountPaidExpenses: "Expenses paid for the group",
  accountSharedExpenses: "Shared expenses",
  accountExpenseTotal: "Full expense total",
  accountPayments: "Payments sent / received",
  accountPaymentSent: "Sent",
  accountPaymentReceived: "Received",
  accountAdjustments: "Representative adjustments",
  accountDetailsUnavailable:
    "Payment details are not included in this share. Balances use the group calculation results.",
  accountRepresentedBy: (values: MessageValues) =>
    interpolate(
      "{name} settles for this member. A zero balance does not mean this member has made a payment.",
      values,
    ),
};
export const jaPersonal = {
  browserExpenseDefaults: "このブラウザーの支出初期設定",
  browserExpenseDefaultsHelp:
    "このアカウントのグループ用通貨・分割設定のみ消去します。帳簿、ログイン、操作権限は変わりません。",
  clearPersonalPreferences: "このグループの支出初期設定を消去",
  expenseDefaultsCleared: "このグループの支出初期設定を消去しました。",
  personalPreferencesChanged:
    "分割設定が無効になったため、既定値に戻しました。選び直してください。",
  personalStorageFailed:
    "支出初期設定を保存できませんでした。現在の設定は使えますが、開き直すと失われる場合があります。",
  rememberExpenseDefaults: "通貨と分割設定を保存",
  expenseDefaultsRemembered: "このグループの通貨と分割設定を保存しました。",
  deleteExpense: "支出を削除",
  copyExpense: "新しい支出としてコピー",
  copyExpenseNamed: (values: MessageValues) =>
    interpolate("「{name}」を新しい支出としてコピー", values),
  memberAccounts: "メンバーの収支",
  accountPaid: "立替額",
  accountShared: "負担額",
  accountBalance: "受取額／支払額",
  accountReceivable: "受取額",
  accountPayable: "支払額",
  accountSettled: "精算済み",
  accountPaidHelp:
    "立替額は店舗などに支払った支出額です。メンバー間の精算支払いは含みません。",
  accountTotalsHelp:
    "負担額は各メンバーが負担する支出です。残高には記録済みの支払いと代表者調整を含み、未同期の下書きは含みません。",
  accountDetails: "明細を表示",
  accountPaidExpenses: "グループの立替支出",
  accountSharedExpenses: "分担した支出",
  accountExpenseTotal: "支出総額",
  accountPayments: "支払い／受け取り履歴",
  accountPaymentSent: "支払い",
  accountPaymentReceived: "受け取り",
  accountAdjustments: "代表者の精算調整",
  accountDetailsUnavailable:
    "この共有には支払い明細がありません。残高はグループの計算結果です。",
  accountRepresentedBy: (values: MessageValues) =>
    interpolate(
      "{name} が代わりに精算します。残高ゼロでも本人の支払い記録があるとは限りません。",
      values,
    ),
};
export const koPersonal = {
  browserExpenseDefaults: "이 브라우저의 지출 기본 설정",
  browserExpenseDefaultsHelp:
    "이 계정의 그룹 통화 및 분할 기본 설정만 지웁니다. 장부, 로그인, 권한은 바뀌지 않습니다.",
  clearPersonalPreferences: "이 그룹의 지출 기본 설정 지우기",
  expenseDefaultsCleared: "이 그룹의 지출 기본 설정을 지웠습니다.",
  personalPreferencesChanged:
    "분할 설정이 유효하지 않아 기본값을 사용합니다. 다시 선택하세요.",
  personalStorageFailed:
    "지출 기본 설정을 저장하지 못했습니다. 현재 설정은 사용할 수 있지만 다시 열면 사라질 수 있습니다.",
  rememberExpenseDefaults: "통화와 분할 설정 기억하기",
  expenseDefaultsRemembered: "이 그룹의 통화와 분할 설정을 저장했습니다.",
  deleteExpense: "지출 삭제",
  copyExpense: "새 지출로 복사",
  copyExpenseNamed: (values: MessageValues) =>
    interpolate("{name}을 새 지출로 복사", values),
  memberAccounts: "멤버별 정산",
  accountPaid: "지불액",
  accountShared: "분담액",
  accountBalance: "받을 금액／보낼 금액",
  accountReceivable: "받을 금액",
  accountPayable: "보낼 금액",
  accountSettled: "정산 완료",
  accountPaidHelp:
    "지불액은 상점 등에 낸 지출액입니다. 멤버 간 정산 송금은 포함하지 않습니다.",
  accountTotalsHelp:
    "분담액은 각 멤버가 부담하는 지출입니다. 잔액에는 기록된 송금과 대표자 조정을 포함하며 미동기화 초안은 제외됩니다.",
  accountDetails: "상세 보기",
  accountPaidExpenses: "그룹을 위해 지불한 지출",
  accountSharedExpenses: "분담한 지출",
  accountExpenseTotal: "전체 지출액",
  accountPayments: "보낸／받은 송금 기록",
  accountPaymentSent: "보냄",
  accountPaymentReceived: "받음",
  accountAdjustments: "대표자 정산 조정",
  accountDetailsUnavailable:
    "이 공유에는 송금 상세가 없습니다. 잔액은 그룹 계산 결과를 사용합니다.",
  accountRepresentedBy: (values: MessageValues) =>
    interpolate(
      "{name}이 대신 정산합니다. 잔액이 0이어도 본인의 송금 기록이 있다는 뜻은 아닙니다.",
      values,
    ),
};
