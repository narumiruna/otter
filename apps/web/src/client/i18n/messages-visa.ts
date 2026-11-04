import { interpolate, type MessageValues } from "./message-types.js";

export const zhTWVisa = {
  visaSettlementTitle: "Visa 匯率結清",
  visaSettlementCurrency: "結清貨幣",
  visaSettlementEnable: "以支出當天 Visa 匯率換算所有支出，並用所選貨幣結清",
  visaSettlementHelp:
    "新群組預設啟用。原幣金額不變；啟用時，每筆支出依支出日期的 Visa 匯率換算成所選結清貨幣並保存匯率。結清貨幣與基準貨幣相同時，重用已保存的換算結果，不會額外查詢 Visa 匯率。適用所有支出，包含現金；不含銀行手續費。Visa 匯率僅供參考，實際帳單可能不同。已有付款紀錄必須使用所選結清貨幣，才能啟用或更換貨幣。",
  visaSettlementSaved: "Visa 結清設定已儲存",
  visaSettlementOn: (values: MessageValues) =>
    interpolate("啟用 · {currency}", values),
  visaSettlementOff: "關閉",
  visaRateLabel: "Visa",
  visaSettingInvalid: "Visa 結清設定格式錯誤",
  visaIncompatiblePayments: "既有付款紀錄必須使用所選結清貨幣",
  visaSettingUnavailable: "目前無法取得 Visa 匯率，設定未變更，請稍後再試",
  visaPaymentCurrency: "Visa 結清付款必須使用所選貨幣",
  visaRateUnavailable: (values: MessageValues) =>
    interpolate(
      "無法取得 {date} {currency}/{target} Visa 匯率，請稍後再試",
      values,
    ),
};

export const enVisa = {
  visaSettlementTitle: "Visa-based settlements",
  visaSettlementCurrency: "Settlement currency",
  visaSettlementEnable:
    "Convert all expenses with dated Visa rates and settle in the selected currency",
  visaSettlementHelp:
    "New groups have this enabled by default. Original amounts stay unchanged. Uses expense-date Visa rates and your selected currency for balances and settlements. If the settlement currency matches the base currency, saved conversions are reused with no extra Visa request. Applies to all expenses, including cash, with no bank fees. Visa rates are estimates; card bills can differ. Existing payments must use the selected currency before enabling or changing currencies.",
  visaSettlementSaved: "Visa settlement setting saved",
  visaSettlementOn: (values: MessageValues) =>
    interpolate("On · {currency}", values),
  visaSettlementOff: "Off",
  visaRateLabel: "Visa",
  visaSettingInvalid: "Invalid Visa settlement setting",
  visaIncompatiblePayments:
    "Existing payment records must use the selected settlement currency",
  visaSettingUnavailable:
    "Visa rates are unavailable. The setting was not changed. Try again later.",
  visaPaymentCurrency:
    "Visa settlement payments must use the selected currency",
  visaRateUnavailable: (values: MessageValues) =>
    interpolate(
      "The Visa {currency}/{target} rate for {date} is unavailable. Try again later.",
      values,
    ),
};

export const jaVisa = {
  visaSettlementTitle: "Visa レートで精算",
  visaSettlementCurrency: "精算通貨",
  visaSettlementEnable:
    "すべての支出を支出日の Visa レートで換算し、選択した通貨で精算",
  visaSettlementHelp:
    "新しいグループでは初期設定でオンです。元の通貨の金額は変更しません。有効な場合、支出日ごとの Visa レートを保存し、選択した通貨で残高と精算額を計算します。精算通貨が基準通貨と同じ場合は、保存済みの換算結果を再利用し、Visa への追加リクエストは行いません。現金を含むすべての支出に適用し、銀行手数料は含みません。Visa レートは目安で、実際の請求額は異なる場合があります。有効化または通貨の変更には、既存の支払記録が選択した通貨である必要があります。",
  visaSettlementSaved: "Visa 精算設定を保存しました",
  visaSettlementOn: (values: MessageValues) =>
    interpolate("オン · {currency}", values),
  visaSettlementOff: "オフ",
  visaRateLabel: "Visa",
  visaSettingInvalid: "Visa 精算設定が無効です",
  visaIncompatiblePayments: "既存の支払記録には選択した精算通貨が必要です",
  visaSettingUnavailable:
    "Visa レートを取得できません。設定は変更していません。しばらくしてから再試行してください。",
  visaPaymentCurrency: "Visa 精算の支払いには選択した通貨を使用してください",
  visaRateUnavailable: (values: MessageValues) =>
    interpolate(
      "{date} の Visa {currency}/{target} レートを取得できません。しばらくしてから再試行してください。",
      values,
    ),
};

export const koVisa = {
  visaSettlementTitle: "Visa 환율 정산",
  visaSettlementCurrency: "정산 통화",
  visaSettlementEnable:
    "모든 지출을 지출일의 Visa 환율로 환산하고 선택한 통화로 정산",
  visaSettlementHelp:
    "새 그룹에서는 기본적으로 켜져 있습니다. 원래 통화의 금액은 유지됩니다. 켜져 있으면 각 지출일의 Visa 환율을 저장하고 선택한 통화로 잔액과 정산액을 계산합니다. 정산 통화와 기준 통화가 같으면 저장된 환산 결과를 재사용하며 Visa에 추가 요청을 보내지 않습니다. 현금을 포함한 모든 지출에 적용하며 은행 수수료는 포함하지 않습니다. Visa 환율은 예상치이며 실제 청구액은 다를 수 있습니다. 켜거나 통화를 변경하려면 기존 지급 기록이 선택한 통화를 사용해야 합니다.",
  visaSettlementSaved: "Visa 정산 설정을 저장했습니다",
  visaSettlementOn: (values: MessageValues) =>
    interpolate("켜짐 · {currency}", values),
  visaSettlementOff: "꺼짐",
  visaRateLabel: "Visa",
  visaSettingInvalid: "Visa 정산 설정이 올바르지 않습니다",
  visaIncompatiblePayments:
    "기존 지급 기록은 선택한 정산 통화를 사용해야 합니다",
  visaSettingUnavailable:
    "Visa 환율을 가져올 수 없습니다. 설정은 변경되지 않았습니다. 나중에 다시 시도하세요.",
  visaPaymentCurrency: "Visa 정산 지급은 선택한 통화를 사용해야 합니다",
  visaRateUnavailable: (values: MessageValues) =>
    interpolate(
      "{date}의 Visa {currency}/{target} 환율을 가져올 수 없습니다. 나중에 다시 시도하세요.",
      values,
    ),
};
