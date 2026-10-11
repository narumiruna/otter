import { interpolate, type MessageValues } from "./message-types.js";

export const zhTWVisa = {
  visaSettlementTitle: "Visa 台幣結清",
  visaSettlementEnable: "以支出當天 Visa 匯率換算所有支出，並用台幣結清",
  visaSettlementHelp:
    "預設關閉。原幣金額不變；啟用後，每筆支出依支出日期換算成台幣並保存匯率。適用所有支出，包含現金；不含銀行手續費。Visa 匯率僅供參考，實際帳單可能不同。已有非台幣付款紀錄時無法啟用。",
  visaSettlementSaved: "Visa 台幣結清設定已儲存",
  visaSettlementOn: "啟用 · TWD",
  visaSettlementOff: "關閉",
  visaRateLabel: "Visa · TWD",
  visaSettingInvalid: "Visa 結清設定格式錯誤",
  visaNonTwdPayments: "請先移除非台幣付款紀錄，再啟用 Visa 台幣結清",
  visaSettingUnavailable: "目前無法取得 Visa 匯率，設定未變更，請稍後再試",
  visaPaymentCurrency: "Visa 結清付款必須使用台幣",
  visaRateUnavailable: (values: MessageValues) =>
    interpolate("無法取得 {date} {currency}/TWD Visa 匯率，請稍後再試", values),
};

export const enVisa = {
  visaSettlementTitle: "Visa TWD settlements",
  visaSettlementEnable:
    "Convert all expenses with dated Visa rates and settle in TWD",
  visaSettlementHelp:
    "Off by default. Original amounts stay unchanged. Enabling saves a Visa rate for each expense date and uses TWD for balances and settlements. Applies to all expenses, including cash, with no bank fees. Visa rates are estimates; card bills can differ. Remove non-TWD payment records before enabling.",
  visaSettlementSaved: "Visa settlement setting saved",
  visaSettlementOn: "On · TWD",
  visaSettlementOff: "Off",
  visaRateLabel: "Visa · TWD",
  visaSettingInvalid: "Invalid Visa settlement setting",
  visaNonTwdPayments:
    "Remove non-TWD payment records before enabling Visa TWD settlements",
  visaSettingUnavailable:
    "Visa rates are unavailable. The setting was not changed. Try again later.",
  visaPaymentCurrency: "Visa settlement payments must use TWD",
  visaRateUnavailable: (values: MessageValues) =>
    interpolate(
      "The Visa {currency}/TWD rate for {date} is unavailable. Try again later.",
      values,
    ),
};

export const jaVisa = {
  visaSettlementTitle: "Visa レートで TWD 精算",
  visaSettlementEnable:
    "すべての支出を支出日の Visa レートで換算し、TWD で精算",
  visaSettlementHelp:
    "初期設定はオフです。元の通貨の金額は変更しません。有効にすると、支出日ごとの Visa レートを保存し、残高と精算額を TWD で計算します。現金を含むすべての支出に適用し、銀行手数料は含みません。Visa レートは目安で、実際の請求額は異なる場合があります。TWD 以外の支払記録がある場合は有効にできません。",
  visaSettlementSaved: "Visa 精算設定を保存しました",
  visaSettlementOn: "オン · TWD",
  visaSettlementOff: "オフ",
  visaRateLabel: "Visa · TWD",
  visaSettingInvalid: "Visa 精算設定が無効です",
  visaNonTwdPayments:
    "Visa TWD 精算を有効にする前に、TWD 以外の支払記録を削除してください",
  visaSettingUnavailable:
    "Visa レートを取得できません。設定は変更していません。しばらくしてから再試行してください。",
  visaPaymentCurrency: "Visa 精算の支払いには TWD を使用してください",
  visaRateUnavailable: (values: MessageValues) =>
    interpolate(
      "{date} の Visa {currency}/TWD レートを取得できません。しばらくしてから再試行してください。",
      values,
    ),
};

export const koVisa = {
  visaSettlementTitle: "Visa 환율로 TWD 정산",
  visaSettlementEnable: "모든 지출을 지출일의 Visa 환율로 환산하고 TWD로 정산",
  visaSettlementHelp:
    "기본값은 꺼짐입니다. 원래 통화의 금액은 유지됩니다. 켜면 각 지출일의 Visa 환율을 저장하고 잔액과 정산액을 TWD로 계산합니다. 현금을 포함한 모든 지출에 적용하며 은행 수수료는 포함하지 않습니다. Visa 환율은 예상치이며 실제 청구액은 다를 수 있습니다. TWD 이외의 지급 기록이 있으면 켤 수 없습니다.",
  visaSettlementSaved: "Visa 정산 설정을 저장했습니다",
  visaSettlementOn: "켜짐 · TWD",
  visaSettlementOff: "꺼짐",
  visaRateLabel: "Visa · TWD",
  visaSettingInvalid: "Visa 정산 설정이 올바르지 않습니다",
  visaNonTwdPayments:
    "Visa TWD 정산을 켜기 전에 TWD 이외의 지급 기록을 삭제하세요",
  visaSettingUnavailable:
    "Visa 환율을 가져올 수 없습니다. 설정은 변경되지 않았습니다. 나중에 다시 시도하세요.",
  visaPaymentCurrency: "Visa 정산 지급은 TWD를 사용해야 합니다",
  visaRateUnavailable: (values: MessageValues) =>
    interpolate(
      "{date}의 Visa {currency}/TWD 환율을 가져올 수 없습니다. 나중에 다시 시도하세요.",
      values,
    ),
};
