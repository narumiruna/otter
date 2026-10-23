import OtterKit
import SwiftUI

@MainActor
struct ExpenseSnapshotDetails: View {
    @Environment(\.locale) private var locale
    let expense: Expense
    let participants: [Participant]
    var receipt: ExpenseReceipt? = nil
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(expense.description).font(.headline)
            Text("支出識別碼：\(expense.id)").font(.caption)
            Text(
                verbatim:
                    "\(expense.currency.formatted(expense.amountMinor)) · \(NativeDisplayFormatting.dateOnly(expense.expenseDate, locale: locale))"
            )
            Text("付款人：\(name(expense.paidById))")
            Text("分類：\(NativeExpenseLabels.category(expense.category, locale: locale))")
            Text("標籤：\(NativeDisplayFormatting.list(expense.tags ?? [], locale: locale))")
            ForEach(expense.participantIds, id: \.self) { id in
                if let share = expense.participantShares?.first(where: { $0.participantId == id }) {
                    Text(
                        verbatim:
                            "\(name(id))：\(expense.currency.formatted(share.shareMinor))"
                    )
                } else {
                    Text("分攤成員：\(name(id))（平均）")
                }
            }
            if let rate = expense.exchangeRate {
                Text(
                    "匯率快照：\(rate.baseCurrency.rawValue) × \(NativeDisplayFormatting.number(rate.rateToBase, locale: locale)) · \(rate.source)"
                )
                if let provider = rate.provider { Text("匯率提供者：\(provider)") }
                if let type = rate.rateType { Text("匯率種類：\(type)") }
                if let fetched = rate.fetchedAt {
                    Text("匯率時間：\(NativeDisplayFormatting.timestamp(fetched, locale: locale))")
                }
            }
            if let rate = expense.visaExchangeRate {
                Text(
                    "Visa 快照：\(rate.sourceCurrency.rawValue) → \(rate.targetCurrency.rawValue) × \(NativeDisplayFormatting.number(rate.rate, locale: locale)) · \(NativeDisplayFormatting.dateOnly(rate.date, locale: locale))"
                )
                Text(
                    "Visa 匯率時間：\(NativeDisplayFormatting.timestamp(rate.fetchedAt, locale: locale))"
                )
            }
            Text(
                receipt != nil || expense.receiptId != nil || expense.receiptUrl != nil
                    ? LocalizedStringKey("快照記錄有收據；不代表可還原舊圖片。") : LocalizedStringKey("快照未記錄收據。"))
            if let receipt {
                Text("收據：\(receipt.id) · \(receipt.mimeType)")
            } else if let id = expense.receiptId {
                Text("收據：\(id)")
            }
            if let createdAt = expense.createdAt {
                Text(
                    NativeLocalization.string(
                        "native.expenseEditorSnapshotDetails.createdAt",
                        defaultValue:
                            "建立時間：\(NativeDisplayFormatting.timestamp(createdAt, locale: locale))",
                        locale: locale))
            }
            if let version = expense.version { Text("版本：\(version)") }
        }.font(.subheadline).textSelection(.enabled)
    }
    private func name(_ id: String) -> String {
        participants.first { $0.id == id }?.name
            ?? NativeLocalization.string("不存在的成員（\(id)）", locale: locale)
    }
    static func label(_ field: ExpenseChangeField) -> LocalizedStringKey {
        switch field {
        case .description: "支出說明"
        case .amountMinor: "金額"
        case .currency: "幣別"
        case .exchangeRate: "匯率快照"
        case .visaExchangeRate: "Visa 匯率快照"
        case .expenseDate: "支出日期"
        case .paidById: "付款人"
        case .category: "分類"
        case .tags: "web.tags"
        case .participantIds: "native.expenseEditorSnapshotDetails.participants"
        case .participantShares: "指定分攤金額"
        case .receipt: "收據"
        }
    }
    static func value(
        _ field: ExpenseChangeField, snapshot: ExpenseSnapshot,
        locale: Locale = AppPreferences.displayLocale()
    ) -> String {
        let expense = snapshot.expense
        func name(_ id: String) -> String {
            snapshot.participants.first { $0.id == id }?.name ?? id
        }
        switch field {
        case .description: return expense.description
        case .amountMinor:
            return expense.currency.formatted(expense.amountMinor)
        case .currency: return expense.currency.rawValue
        case .expenseDate:
            return NativeDisplayFormatting.dateOnly(expense.expenseDate, locale: locale)
        case .paidById: return name(expense.paidById)
        case .category: return NativeExpenseLabels.category(expense.category, locale: locale)
        case .tags: return NativeDisplayFormatting.list(expense.tags ?? [], locale: locale)
        case .participantIds:
            return NativeDisplayFormatting.list(expense.participantIds.map(name), locale: locale)
        case .participantShares:
            guard let shares = expense.participantShares else {
                return NativeLocalization.string("平均分攤", locale: locale)
            }
            return NativeDisplayFormatting.list(
                shares.map {
                    "\(name($0.participantId))：\(expense.currency.formatted($0.shareMinor))"
                }, locale: locale)
        case .receipt:
            return snapshot.receipt.map { "\($0.id)（\($0.mimeType)）" }
                ?? expense.receiptId ?? NativeLocalization.string("無", locale: locale)
        case .exchangeRate:
            guard let rate = expense.exchangeRate else {
                return NativeLocalization.string("無", locale: locale)
            }
            return
                "\(rate.baseCurrency.rawValue) × \(NativeDisplayFormatting.number(rate.rateToBase, locale: locale)) · \(rate.source) · \(rate.provider ?? "") · \(rate.rateType ?? "") · \(rate.fetchedAt.map { NativeDisplayFormatting.timestamp($0, locale: locale) } ?? "")"
        case .visaExchangeRate:
            guard let rate = expense.visaExchangeRate else {
                return NativeLocalization.string("無", locale: locale)
            }
            return
                "\(rate.sourceCurrency.rawValue) → \(rate.targetCurrency.rawValue) × \(NativeDisplayFormatting.number(rate.rate, locale: locale)) · \(NativeDisplayFormatting.dateOnly(rate.date, locale: locale)) · \(NativeDisplayFormatting.timestamp(rate.fetchedAt, locale: locale))"
        }
    }
}
