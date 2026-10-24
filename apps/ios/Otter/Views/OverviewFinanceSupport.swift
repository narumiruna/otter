import Foundation
import OtterKit
import SwiftUI

// Stack labels and values so large text never hides an amount or its currency.
struct OverviewMoneyRow: View {
    private let title: Text
    let amount: Int64
    let currency: Currency

    init(title: LocalizedStringKey, amount: Int64, currency: Currency) {
        self.title = Text(title)
        self.amount = amount
        self.currency = currency
    }

    init(localizedTitle: String, amount: Int64, currency: Currency) {
        self.title = Text(verbatim: localizedTitle)
        self.amount = amount
        self.currency = currency
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            title.font(.subheadline).otterSecondaryText()
            Text(verbatim: currency.formatted(amount))
                .font(.title3.weight(.semibold)).monospacedDigit()
        }
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(title)
        .accessibilityValue(Text(verbatim: currency.formatted(amount)))
    }
}

enum OverviewFinanceSupport {
    static func name(
        _ id: String, trip: Trip, locale: Locale = AppPreferences.displayLocale()
    ) -> String {
        trip.participants.first { $0.id == id }?.name
            ?? NativeLocalization.string("未知成員", locale: locale)
    }

    static func date(
        _ value: String, locale: Locale = AppPreferences.displayLocale()
    ) -> String {
        NativeDisplayFormatting.timestamp(value, locale: locale)
    }

    static func mathError(
        _ error: Error, locale: Locale = AppPreferences.displayLocale()
    ) -> String {
        let reason: String
        switch error as? FinanceError {
        case .invalidAmount: reason = NativeLocalization.string("金額無效", locale: locale)
        case .invalidParticipants: reason = NativeLocalization.string("參與者資料無效", locale: locale)
        case .invalidSplit: reason = NativeLocalization.string("分攤資料無效", locale: locale)
        case .invalidRate: reason = NativeLocalization.string("匯率資料無效或不完整", locale: locale)
        case .outOfRange: reason = NativeLocalization.string("金額超出可計算範圍", locale: locale)
        case nil: reason = NativeLocalization.string("資料無法計算", locale: locale)
        }
        return NativeLocalization.string(
            "無法計算：\(reason)。請重新載入並檢查資料，不會以零取代錯誤結果。", locale: locale)
    }

    static func checkedSum(_ values: [Int64]) throws -> Int64 {
        try values.reduce(0) { total, value in
            guard value > 0, value <= ExpenseMath.maximumSafeInteger else {
                throw FinanceError.invalidAmount
            }
            let (sum, overflow) = total.addingReportingOverflow(value)
            guard !overflow, sum <= ExpenseMath.maximumSafeInteger else {
                throw FinanceError.outOfRange
            }
            return sum
        }
    }

    static func snapshot(_ payload: TripPayload) -> Data? {
        let encoder = JSONEncoder()
        encoder.outputFormatting = .sortedKeys
        return try? encoder.encode(payload)
    }
}
