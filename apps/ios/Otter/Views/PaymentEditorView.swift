import Foundation
import OtterKit
import SwiftUI

@MainActor
struct PaymentEditorView: View {
    let payload: TripPayload
    let settlement: Settlement
    let onPayload: @MainActor (TripPayload) -> Void
    @Environment(AppSession.self) private var session
    @Environment(\.locale) private var locale
    @Environment(\.dismiss) private var dismiss
    @State private var amount: String
    @State private var paidAt = Date()
    @State private var note = ""
    @State private var saving = false
    @State private var confirming = false
    @State private var issue: String?
    @State private var uncertainResult = false
    @State private var revision = UUID()

    init(
        payload: TripPayload, settlement: Settlement,
        onPayload: @MainActor @escaping (TripPayload) -> Void
    ) {
        self.payload = payload
        self.settlement = settlement
        self.onPayload = onPayload
        _amount = State(initialValue: settlement.currency.majorString(settlement.amountMinor))
    }

    private var canEdit: Bool {
        guard let client = session.client else { return false }
        return TripPermissions(payload: payload, auth: client.auth, userID: session.user?.id)
            .allows(.editDailyData)
    }
    private var currentSuggestion: Bool {
        payload.settlements.contains {
            $0.id == settlement.id && $0.amountMinor == settlement.amountMinor
                && $0.amountMinor > 0 && $0.amountMinor <= ExpenseMath.maximumSafeInteger
        }
    }
    private var parsedAmount: Result<Int64, Error> {
        Result {
            let minor = try settlement.currency.parseAmount(amount)
            guard minor <= settlement.amountMinor else { throw FinanceError.invalidAmount }
            return minor
        }
    }
    private var valid: Bool {
        guard case .success = parsedAmount else { return false }
        return note.utf16.count <= 160 && currentSuggestion && canEdit && !uncertainResult
    }
    private var dateOnly: String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = .current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: paidAt)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text(
                        NativeLocalization.string(
                            "native.paymentEditorView.paymentRoute",
                            defaultValue: "\(settlement.fromName) 付給 \(settlement.toName)",
                            locale: locale)
                    )
                    .font(.headline).fixedSize(horizontal: false, vertical: true)
                    OverviewMoneyRow(
                        title: "建議付款金額（已預填全額）", amount: settlement.amountMinor,
                        currency: settlement.currency)
                    Text("請先完成付款。此操作只記錄已付款，不會進行實際轉帳。")
                }
                Section("付款金額") {
                    Text("幣別：\(settlement.currency.rawValue)（由伺服器結算建議決定）")
                    TextField("金額（\(settlement.currency.rawValue)）", text: $amount)
                        .keyboardType(.decimalPad)
                        .accessibilityLabel("付款金額，\(settlement.currency.rawValue)")
                    switch parsedAmount {
                    case .success(let minor):
                        OverviewMoneyRow(
                            title: "預計剩餘待付款", amount: settlement.amountMinor - minor,
                            currency: settlement.currency
                        )
                        .accessibilityAddTraits(.updatesFrequently)
                    case .failure:
                        Text("金額必須大於零、不可超過建議金額，且須符合幣別的小數位數。")
                            .foregroundStyle(.red)
                    }
                }
                Section("付款資料") {
                    DatePicker("付款日期", selection: $paidAt, displayedComponents: .date)
                    TextField("備註（選填，最多 160 字）", text: $note, axis: .vertical)
                        .accessibilityLabel("付款備註，最多 160 字")
                    if note.utf16.count > 160 {
                        Text("備註超過 160 字，請縮短後再儲存。")
                            .foregroundStyle(.red)
                    }
                }
                if !canEdit || !currentSuggestion {
                    Section { Text("權限或結算建議已變更。請關閉並重新載入群組後再試。") }
                }
                if let issue {
                    Section {
                        Text(verbatim: issue).foregroundStyle(.red).fixedSize(
                            horizontal: false, vertical: true)
                    }
                }
                if uncertainResult {
                    Section {
                        Text("無法確認伺服器是否已記錄付款。為避免重複記錄，不能直接重送。請關閉此表單，重新載入群組並檢查付款紀錄。")
                    }
                }
                Section {
                    Button("確認已付款並記錄") { confirming = true }
                        .disabled(!valid || saving)
                    if saving { ProgressView("正在記錄付款…") }
                }
            }
            .disabled(saving)
            .otterList()
            .navigationTitle("記錄已付款")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }.disabled(saving)
                }
            }
            .confirmationDialog("確認已完成付款？", isPresented: $confirming, titleVisibility: .visible) {
                Button("確認並記錄已付款") { save() }
                Button("取消", role: .cancel) {}
            } message: {
                if case .success(let minor) = parsedAmount {
                    Text(
                        "\(settlement.fromName) 已付給 \(settlement.toName) \(settlement.currency.formatted(minor))\n付款日期：\(NativeDisplayFormatting.dateOnly(dateOnly, locale: locale))\n此操作不會進行實際轉帳。"
                    )
                }
            }
        }
        .interactiveDismissDisabled(saving)
        .onDisappear { revision = UUID() }
        .onChange(of: OverviewFinanceSupport.snapshot(payload)) { _, _ in revision = UUID() }
        .onChange(of: session.sessionID) { _, _ in
            revision = UUID()
            dismiss()
        }
    }

    private func save() {
        guard !saving, valid, let client = session.client,
            case .success(let minor) = parsedAmount
        else { return }
        // Capture credentials and input before suspension. Never replace the parent's data on failure.
        let generation = session.sessionID
        let requestRevision = revision
        let tripID = payload.trip.id
        let submittedNote = note
        let submittedDate = dateOnly
        saving = true
        issue = nil
        Task { @MainActor in
            defer { saving = false }
            do {
                let result = try await client.recordPayment(
                    tripID: tripID, fromID: settlement.fromId, toID: settlement.toId,
                    amount: settlement.currency.majorString(minor), currency: settlement.currency,
                    paidAt: submittedDate, note: submittedNote)
                guard !Task.isCancelled, session.sessionID == generation else { return }
                guard revision == requestRevision else {
                    uncertainResult = true
                    issue = NativeLocalization.string("群組資料已變更，未套用過期回應。請重新載入以確認付款紀錄。")
                    return
                }
                onPayload(result)
                dismiss()
            } catch {
                guard !Task.isCancelled, session.sessionID == generation else { return }
                guard revision == requestRevision else {
                    uncertainResult = true
                    return
                }
                // Payment creation has no idempotency key. Do not blindly retry an unknown result.
                uncertainResult = MutationOutcome.isUncertain(error)
                issue = NativeLocalization.string("無法記錄付款：\(error.localizedDescription)")
                session.handle(error, for: generation)
            }
        }
    }
}
