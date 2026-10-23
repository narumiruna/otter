import OtterKit
import SwiftUI

@MainActor
struct AnalysisView: View {
    @Environment(\.locale) private var locale
    let payload: TripPayload

    var body: some View {
        List {
            Section {
                Text(
                    "支出圖表一律換算為基本幣別 \(payload.trip.baseCurrency.rawValue)，包含 Visa 結算群組。成員帳目使用結算幣別 \(payload.trip.settlementCurrency.rawValue)，餘額以伺服器提供的數值與幣別為準。"
                )
                .font(.subheadline)
            }
            switch Result(catching: { try Finance.spendingSummary(trip: payload.trip) }) {
            case .success(let summary):
                Section("共同支出總額") {
                    OverviewMoneyRow(
                        title: "基本幣別總額", amount: summary.totalMinor,
                        currency: payload.trip.baseCurrency)
                }
                AnalysisBarSection(
                    title: "每日支出", currency: payload.trip.baseCurrency,
                    rows: summary.dailyTotals.map {
                        AnalysisBarRow(
                            id: $0.date,
                            label: NativeDisplayFormatting.dateOnly($0.date, locale: locale),
                            amount: $0.amountMinor)
                    })
                AnalysisBarSection(
                    title: "各付款人支出", currency: payload.trip.baseCurrency,
                    rows: summary.payerTotals.map {
                        AnalysisBarRow(
                            id: $0.participantId,
                            label: OverviewFinanceSupport.name(
                                $0.participantId, trip: payload.trip, locale: locale),
                            amount: $0.amountMinor)
                    })
                AnalysisBarSection(
                    title: "各類別支出", currency: payload.trip.baseCurrency,
                    rows: summary.categoryTotals.map {
                        AnalysisBarRow(
                            id: $0.category,
                            label: NativeExpenseLabels.category($0.category, locale: locale),
                            amount: $0.amountMinor)
                    })
            case .failure(let error):
                Section("支出分析無法計算") {
                    Text(verbatim: OverviewFinanceSupport.mathError(error, locale: locale))
                        .foregroundStyle(.red)
                }
            }
            memberAccounts
        }
        .navigationTitle("分析")
    }

    private var memberAccounts: some View {
        Section {
            Text("實付是代墊的支出，分攤是應負擔的支出。淨額包含已記錄的付款與代表人調整；正數為應收，負數為應付。不同幣別不直接加總。")
                .font(.footnote).foregroundStyle(.secondary)
            switch Result(catching: { try Finance.memberAccounts(payload: payload) }) {
            case .success(let accounts):
                if accounts.isEmpty { Text("尚無成員帳目。") }
                ForEach(accounts) { account in
                    AnalysisMemberAccountView(account: account, trip: payload.trip)
                }
            case .failure(let error):
                Text(verbatim: OverviewFinanceSupport.mathError(error, locale: locale))
                    .foregroundStyle(.red)
            }
        } header: {
            Text("成員帳目")
        }
    }
}

private struct AnalysisBarRow: Identifiable {
    let id: String
    let label: String
    let amount: Int64
}

private struct AnalysisBarSection: View {
    @Environment(\.locale) private var locale
    let title: String.LocalizationValue
    let currency: Currency
    let rows: [AnalysisBarRow]

    var body: some View {
        Section {
            if rows.isEmpty { Text("尚無支出資料。") }
            ForEach(rows) { row in
                VStack(alignment: .leading, spacing: 6) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(verbatim: row.label)
                        Text(verbatim: currency.formatted(row.amount)).monospacedDigit()
                    }
                    .fixedSize(horizontal: false, vertical: true)
                    ProgressView(
                        value: Double(row.amount),
                        total: Double(max(rows.map(\.amount).max() ?? 1, 1))
                    )
                    .tint(.accentColor)
                    .accessibilityHidden(true)
                }
                .padding(.vertical, 4)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(Text(verbatim: row.label))
                .accessibilityValue(Text(verbatim: currency.formatted(row.amount)))
            }
        } header: {
            Text(
                verbatim:
                    "\(NativeLocalization.string(title, locale: locale))（\(currency.rawValue)）")
        }
    }
}

private struct AnalysisMemberAccountView: View {
    @Environment(\.locale) private var locale
    let account: MemberAccount
    let trip: Trip

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(
                verbatim: OverviewFinanceSupport.name(
                    account.participantId, trip: trip, locale: locale)
            )
            .font(.headline).accessibilityAddTraits(.isHeader)
            if let representative = trip.participants.first(where: {
                $0.id == account.participantId
            })?.settledById {
                Text(
                    "由 \(OverviewFinanceSupport.name(representative, trip: trip, locale: locale)) 代為結算"
                )
                .font(.subheadline).foregroundStyle(.secondary)
            }
            OverviewMoneyRow(title: "實付支出", amount: account.paidMinor, currency: account.currency)
            OverviewMoneyRow(
                title: "應分攤支出", amount: account.sharedMinor, currency: account.currency)
            OverviewMoneyRow(
                title:
                    "淨額 · \(NativeExpenseLabels.balance(account.balanceMinor, locale: locale))",
                amount: account.balanceMinor, currency: account.balanceCurrency)
            DisclosureGroup {
                VStack(alignment: .leading, spacing: 16) {
                    expenseEntries(title: "實付支出明細", entries: account.paidExpenses)
                    expenseEntries(title: "分攤支出明細", entries: account.sharedExpenses)
                    if account.paymentDetailsAvailable {
                        paymentEntries
                        adjustments
                    } else {
                        Text("未提供付款與代表人調整明細。不能由餘額反推隱藏付款；淨額以伺服器資料為準。")
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.vertical, 8)
            } label: {
                Text("帳目明細")
                    .accessibilityLabel(
                        "\(OverviewFinanceSupport.name(account.participantId, trip: trip, locale: locale)) 的帳目明細"
                    )
            }
        }
        .fixedSize(horizontal: false, vertical: true)
        .padding(.vertical, 6)
    }

    private func expenseEntries(title: String.LocalizationValue, entries: [MemberExpenseEntry])
        -> some View
    {
        VStack(alignment: .leading, spacing: 8) {
            Text(
                verbatim:
                    "\(NativeLocalization.string(title, locale: locale))（\(account.currency.rawValue)）"
            ).font(.subheadline.bold())
            if entries.isEmpty { Text("尚無紀錄。") }
            ForEach(entries, id: \.expenseId) { entry in
                VStack(alignment: .leading, spacing: 4) {
                    if let expense = trip.expenses.first(where: { $0.id == entry.expenseId }) {
                        OverviewMoneyRow(
                            localizedTitle:
                                "\(NativeDisplayFormatting.dateOnly(expense.expenseDate, locale: locale)) · \(expense.description)",
                            amount: entry.amountMinor, currency: account.currency)
                        Text("原始支出總額：\(expense.currency.formatted(expense.amountMinor))")
                            .font(.footnote).foregroundStyle(.secondary)
                    } else {
                        OverviewMoneyRow(
                            title: "支出明細無法取得", amount: entry.amountMinor, currency: account.currency
                        )
                    }
                }
                .accessibilityElement(children: .combine)
            }
        }
    }

    private var paymentEntries: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("結算付款明細（\(account.currency.rawValue)）").font(.subheadline.bold())
            if account.payments.isEmpty { Text("尚無付款紀錄。") }
            ForEach(account.payments, id: \.paymentId) { entry in
                VStack(alignment: .leading, spacing: 4) {
                    if let payment = trip.settlementPayments?.first(where: {
                        $0.id == entry.paymentId
                    }) {
                        OverviewMoneyRow(
                            title:
                                "\(entry.direction == .paid ? NativeLocalization.string("已付出", locale: locale) : NativeLocalization.string("已收到", locale: locale)) · \(OverviewFinanceSupport.date(payment.paidAt, locale: locale)) · \(OverviewFinanceSupport.name(payment.fromId, trip: trip, locale: locale)) 付給 \(OverviewFinanceSupport.name(payment.toId, trip: trip, locale: locale))",
                            amount: entry.amountMinor, currency: account.currency)
                        Text("原始付款金額：\(payment.currency.formatted(payment.amountMinor))")
                            .font(.footnote).foregroundStyle(.secondary)
                        if !payment.note.isEmpty { Text(verbatim: payment.note).font(.subheadline) }
                    } else {
                        Text("付款明細無法取得，請重新載入。")
                    }
                }
                .accessibilityElement(children: .combine)
            }
        }
    }

    private var adjustments: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("代表人調整（\(account.currency.rawValue)）").font(.subheadline.bold())
            if account.adjustments.isEmpty { Text("尚無代表人調整。") }
            ForEach(Array(account.adjustments.enumerated()), id: \.offset) { _, entry in
                OverviewMoneyRow(
                    title:
                        "與 \(OverviewFinanceSupport.name(entry.participantId, trip: trip, locale: locale)) 的結算調整",
                    amount: entry.amountMinor, currency: account.currency)
            }
        }
    }
}
