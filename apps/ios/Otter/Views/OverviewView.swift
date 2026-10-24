import Foundation
import OtterKit
import SwiftUI

@MainActor
struct OverviewView: View {
    let payload: TripPayload
    let onPayload: @MainActor (TripPayload) -> Void
    let onEdit: @MainActor (Expense) -> Void
    let onAdd: @MainActor () -> Void
    @Environment(AppSession.self) private var session
    @Environment(\.locale) private var locale
    @Environment(AppPreferences.self) private var preferences
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @State private var selectedSettlement: Settlement?
    @State private var pendingDeletion: SettlementPayment?
    @State private var deleting = false
    @State private var issue: String?
    @State private var revision = UUID()

    init(
        payload: TripPayload,
        onPayload: @MainActor @escaping (TripPayload) -> Void,
        onEdit: @MainActor @escaping (Expense) -> Void,
        onAdd: @MainActor @escaping () -> Void
    ) {
        self.payload = payload
        self.onPayload = onPayload
        self.onEdit = onEdit
        self.onAdd = onAdd
    }

    private var isPublic: Bool { payload.readonly == true || payload.shareMode == .readonly }
    private var canEdit: Bool {
        guard let client = session.client else { return false }
        return TripPermissions(payload: payload, auth: client.auth, userID: session.user?.id)
            .allows(.editDailyData)
    }
    private var recentExpenses: [Expense] {
        Array(
            payload.trip.expenses.sorted {
                if $0.expenseDate != $1.expenseDate { return $0.expenseDate > $1.expenseDate }
                return ($0.createdAt ?? "") > ($1.createdAt ?? "")
            }.prefix(3))
    }

    var body: some View {
        List {
            summary
            if payload.trip.archivedAt != nil {
                Section { Label("群組已封存，僅供檢視。", systemImage: "archivebox") }
            } else if isPublic {
                Section { Label("目前為唯讀檢視。", systemImage: "lock") }
            }
            if let issue {
                Section {
                    Text(verbatim: issue).foregroundStyle(.red).accessibilityAddTraits(
                        .updatesFrequently)
                }
            }
            settlements
            balances
            recent
            if !isPublic { paymentHistory }
        }
        .otterList()
        .navigationTitle("總覽")
        .disabled(deleting)
        .overlay { if deleting { ProgressView("正在刪除付款紀錄…") } }
        .sheet(item: $selectedSettlement) { settlement in
            PaymentEditorView(payload: payload, settlement: settlement, onPayload: onPayload)
        }
        .confirmationDialog(
            "確認刪除此筆付款紀錄？",
            isPresented: Binding(
                get: { pendingDeletion != nil },
                set: { if !$0 { pendingDeletion = nil } }
            ), titleVisibility: .visible, presenting: pendingDeletion
        ) { payment in
            Button("刪除付款紀錄", role: .destructive) { delete(payment) }
            Button("取消", role: .cancel) { pendingDeletion = nil }
        } message: { payment in
            Text(
                "\(route(payment))\n\(payment.currency.formatted(payment.amountMinor))\n刪除後會重新計算結算建議，不會撤回實際轉帳。"
            )
        }
        .onDisappear { revision = UUID() }
        .onChange(of: OverviewFinanceSupport.snapshot(payload)) { _, _ in
            revision = UUID()
            pendingDeletion = nil
        }
        .onChange(of: session.sessionID) { _, _ in
            selectedSettlement = nil
            pendingDeletion = nil
            issue = nil
        }
    }

    private var summary: some View {
        Section("群組概覽") {
            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(verbatim: payload.trip.name).font(.title2.weight(.semibold))
                        .fixedSize(horizontal: false, vertical: true)
                    Text(
                        "\(payload.trip.expenses.count) 筆支出 · \(payload.trip.participants.count) 位成員"
                    )
                    .font(.subheadline).otterSecondaryText()
                }
                switch Result(catching: { try Finance.spendingSummary(trip: payload.trip) }) {
                case .success(let summary):
                    OtterMetric(
                        title: "共同支出總額（基本幣別）", amount: summary.totalMinor,
                        currency: payload.trip.baseCurrency)
                case .failure(let error): mathIssue(error)
                }
                // Do not add different server settlement currencies together.
                if payload.settlements.isEmpty {
                    Text("目前沒有待結算款項。")
                } else {
                    ForEach(
                        Currency.allCases.filter { currency in
                            payload.settlements.contains { $0.currency == currency }
                        }
                    ) { currency in
                        switch Result(catching: {
                            try OverviewFinanceSupport.checkedSum(
                                payload.settlements.filter { $0.currency == currency }.map(
                                    \.amountMinor))
                        }) {
                        case .success(let total):
                            OverviewMoneyRow(title: "待結算總額", amount: total, currency: currency)
                        case .failure(let error): mathIssue(error)
                        }
                    }
                }
                Text("支出總額換算為基本幣別；結算使用伺服器回傳的幣別。不同幣別不直接加總。")
                    .font(.footnote).otterSecondaryText()
            }
            .padding(.bottom, 4)
            .listRowInsets(EdgeInsets())
            .listRowBackground(Color.clear)
        }
        .textCase(nil)
    }

    private var settlements: some View {
        Section {
            if payload.settlements.isEmpty { Text("目前沒有待結算的款項。") }
            ForEach(payload.settlements) { settlement in
                VStack(alignment: .leading, spacing: 8) {
                    OverviewMoneyRow(
                        localizedTitle: NativeLocalization.string(
                            "native.overviewView.paymentRoute",
                            defaultValue: "\(settlement.fromName) 付給 \(settlement.toName)",
                            locale: locale),
                        amount: settlement.amountMinor, currency: settlement.currency)
                    if canEdit {
                        Button("記錄已付款", systemImage: "checkmark.circle") {
                            selectedSettlement = settlement
                        }
                        .buttonStyle(.bordered)
                        .buttonBorderShape(.roundedRectangle(radius: 8))
                        .disabled(
                            settlement.amountMinor <= 0
                                || settlement.amountMinor > ExpenseMath.maximumSafeInteger
                        )
                        .accessibilityLabel("記錄 \(settlement.fromName) 付給 \(settlement.toName) 的付款")
                    }
                }
                .padding(.vertical, 8)
            }
        } header: {
            Text("待結算款項（\(payload.settlements.count)）")
        } footer: {
            Text("此處只記錄已完成的付款，不會進行實際轉帳。")
        }
    }

    private var balances: some View {
        Section {
            switch Result(catching: { try Finance.memberAccounts(payload: payload) }) {
            case .success(let accounts):
                if accounts.isEmpty { Text("尚無成員餘額。") }
                ForEach(accounts) { account in
                    OverviewMoneyRow(
                        title:
                            "\(OverviewFinanceSupport.name(account.participantId, trip: payload.trip, locale: locale)) · \(NativeExpenseLabels.balance(account.balanceMinor, locale: locale))",
                        amount: account.balanceMinor, currency: account.balanceCurrency
                    )
                    .foregroundStyle(
                        account.balanceMinor < 0
                            ? preferences.palette.colors.destructive
                            : preferences.palette.colors.accentText
                    )
                    .padding(.vertical, 8)
                }
            case .failure(let error): mathIssue(error)
            }
        } header: {
            Text("成員餘額")
        } footer: {
            Text("正數為應收，負數為應付。以伺服器提供的餘額為準。")
        }
    }

    private var recent: some View {
        Section("最近支出") {
            if recentExpenses.isEmpty { Text("尚無支出。新增支出後即可檢視餘額與結算建議。") }
            ForEach(recentExpenses) { expense in
                if canEdit {
                    Button {
                        onEdit(expense)
                    } label: {
                        expenseRow(expense)
                    }
                    .buttonStyle(.plain)
                    .accessibilityHint("編輯此筆支出")
                } else {
                    expenseRow(expense)
                }
            }
            if canEdit {
                Button("新增支出", systemImage: "plus.circle", action: onAdd)
                    .disabled(payload.trip.participants.isEmpty)
                if payload.trip.participants.isEmpty { Text("請先新增成員，再新增支出。") }
            }
        }
    }

    private var paymentHistory: some View {
        Section("付款紀錄") {
            if let payments = payload.trip.settlementPayments {
                if payments.isEmpty { Text("尚無付款紀錄。") }
                ForEach(payments.sorted { $0.paidAt > $1.paidAt }) { payment in
                    VStack(alignment: .leading, spacing: 8) {
                        OverviewMoneyRow(
                            localizedTitle: route(payment), amount: payment.amountMinor,
                            currency: payment.currency)
                        Text(verbatim: OverviewFinanceSupport.date(payment.paidAt, locale: locale))
                            .font(.subheadline).otterSecondaryText()
                        if !payment.note.isEmpty {
                            Text(verbatim: payment.note).fixedSize(
                                horizontal: false, vertical: true)
                        }
                        if canEdit {
                            Button("刪除付款紀錄", role: .destructive) { pendingDeletion = payment }
                                .accessibilityLabel(
                                    "刪除 \(route(payment))，\(payment.currency.formatted(payment.amountMinor)) 的付款紀錄"
                                )
                        }
                    }
                }
            } else {
                Text("未提供付款明細，不能據此判斷是否已有付款。餘額以伺服器資料為準。")
            }
        }
    }

    private func expenseRow(_ expense: Expense) -> some View {
        HStack(alignment: .top, spacing: 12) {
            OtterIconBadge(symbol: "receipt")
            VStack(alignment: .leading, spacing: 8) {
                let layout =
                    dynamicTypeSize.isAccessibilitySize
                    ? AnyLayout(VStackLayout(alignment: .leading, spacing: 6))
                    : AnyLayout(HStackLayout(alignment: .firstTextBaseline, spacing: 12))
                layout {
                    Text(verbatim: expense.description).font(.body.weight(.semibold))
                        .frame(maxWidth: .infinity, alignment: .leading)
                    Text(verbatim: expense.currency.formatted(expense.amountMinor))
                        .font(.headline).monospacedDigit().layoutPriority(1)
                }
                .fixedSize(horizontal: false, vertical: true)
                Text(
                    "\(NativeDisplayFormatting.dateOnly(expense.expenseDate, locale: locale)) · \(OverviewFinanceSupport.name(expense.paidById, trip: payload.trip, locale: locale)) 付款 · \(expense.participantIds.count) 人分攤"
                )
                .font(.footnote).otterSecondaryText()
            }
        }
        .padding(.vertical, 8)
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityElement(children: .combine)
    }

    private func mathIssue(_ error: Error) -> some View {
        Text(verbatim: OverviewFinanceSupport.mathError(error, locale: locale)).foregroundStyle(
            .red)
    }

    private func route(_ payment: SettlementPayment) -> String {
        NativeLocalization.string(
            "native.overviewView.namedPaymentRoute",
            defaultValue:
                "\(OverviewFinanceSupport.name(payment.fromId, trip: payload.trip, locale: locale)) 付給 \(OverviewFinanceSupport.name(payment.toId, trip: payload.trip, locale: locale))",
            locale: locale)
    }

    private func delete(_ payment: SettlementPayment) {
        guard !deleting, canEdit, !isPublic, let client = session.client,
            payload.trip.settlementPayments?.contains(where: { $0.id == payment.id }) == true,
            OverviewFinanceSupport.snapshot(payload) != nil
        else { return }
        let generation = session.sessionID
        let requestRevision = revision
        let tripID = payload.trip.id
        deleting = true
        issue = nil
        pendingDeletion = nil
        Task { @MainActor in
            defer { deleting = false }
            do {
                let result = try await client.deletePayment(tripID: tripID, paymentID: payment.id)
                guard session.sessionID == generation else { return }
                onPayload(result)
            } catch {
                guard !Task.isCancelled, session.sessionID == generation,
                    revision == requestRevision
                else { return }
                issue = NativeLocalization.string("無法刪除付款紀錄：\(error.localizedDescription)")
                session.handle(error, for: generation)
            }
        }
    }
}
