import OtterKit
import SwiftUI

@MainActor
public struct ExpenseEditorView: View {
    @Environment(AppSession.self) private var session
    @Environment(\.dismiss) private var dismiss
    @Environment(\.locale) private var locale
    @State private var state: ExpenseEditorState
    @State private var showsAccount = false
    @State private var discard = false
    @State private var deleting = false
    @State private var allowAnotherCreate = false
    private let localDefaults: ExpenseDefaultsStore?
    private let context: ExpenseContext?
    private let onQueue: (@MainActor (NewExpense) async throws -> Void)?
    private let onPayload: @MainActor (TripPayload) -> Void

    public init(
        payload: TripPayload, mode: ExpenseEditorMode = .new,
        localDefaults: ExpenseDefaultsStore? = nil, context: ExpenseContext? = nil,
        onQueue: (@MainActor (NewExpense) async throws -> Void)? = nil,
        initialAccountSettings: Bool = false,
        onPayload: @escaping @MainActor (TripPayload) -> Void
    ) {
        _state = State(initialValue: ExpenseEditorState(payload: payload, mode: mode))
        _showsAccount = State(initialValue: initialAccountSettings)
        self.localDefaults = localDefaults
        self.context = context
        self.onQueue = onQueue
        self.onPayload = onPayload
    }
    public var body: some View {
        NavigationStack {
            Form {
                if state.generation != nil && state.generation != session.sessionID {
                    Section { Text("登入狀態已變更。請關閉此表單，重新開啟。").foregroundStyle(.red) }
                } else {
                    if !state.permits(.editDailyData, session: session) {
                        Section { Text("目前群組或登入權限不允許修改支出。封存群組不能修改。") }
                    }
                    ExpenseDraftFields(state: state).disabled(
                        state.locked || !state.permits(.editDailyData, session: session))
                    receiptSection
                    if let notice = state.notice { Section { Text(notice) } }
                    if let issue = state.issue {
                        Section {
                            Text(issue).foregroundStyle(.red).accessibilityIdentifier(
                                "expense-error")
                        }
                    }
                    if state.savedExpenseID != nil && !state.finished {
                        Section {
                            Text("支出已儲存。表單已鎖定，接下來只處理收據，不會再新增支出。")
                            Button("保留支出，稍後處理收據") { dismiss() }.disabled(state.busy)
                        }
                    }
                    if state.conflict { conflictSection }
                    if state.unknownCreate { unknownSection }
                    if state.creationConfirmed && state.savedExpenseID == nil && state.photo != nil
                    {
                        Section { Text("支出已建立，但回應缺少新支出識別碼。請關閉表單，從群組開啟已建立的支出後再上傳收據；此表單不會再次新增。") }
                    }
                    defaultsSection
                    if canQueue {
                        Section {
                            Button("僅將支出加入離線佇列") { Task { await queue() } }
                                .disabled(
                                    state.busy || state.receiptLoading || state.validation != nil
                                        || state.photo != nil)
                            Text("離線佇列不儲存照片。請先移除所選照片。加入佇列後，不會在此表單再次新增。")
                        }
                    }
                    if state.isEdit && state.savedExpenseID == nil {
                        Section {
                            Button("刪除此支出", role: .destructive) { deleting = true }
                                .disabled(
                                    state.busy || state.receiptLoading || state.conflict
                                        || !state.permits(.editDailyData, session: session))
                        }
                    }
                    if state.busy { Section { ProgressView("正在處理…") } }
                }
            }
            .scrollDismissesKeyboard(.immediately)
            .accessibilityIdentifier("expense.form")
            .navigationTitle(state.title)
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarBackButtonHidden(true)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { if state.dirty { discard = true } else { dismiss() } }.disabled(
                        state.busy || state.receiptLoading)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("帳號設定", systemImage: "person.crop.circle") { showsAccount = true }
                        .labelStyle(.iconOnly)
                        .accessibilityIdentifier("expense.accountSettings")
                        .disabled(state.busy || state.receiptLoading)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(LocalizedStringKey(state.savedExpenseID == nil ? "儲存" : "重試收據")) {
                        Task { await state.submit(session: session, onPayload: onPayload) }
                    }
                    .disabled(
                        state.busy || state.receiptLoading || state.conflict || state.unknownCreate
                            || !state.permits(.editDailyData, session: session)
                            || (state.savedExpenseID == nil && state.validation != nil))
                }
            }
            .confirmationDialog(
                "要放棄尚未儲存的變更嗎？已儲存的支出不會被刪除。", isPresented: $discard, titleVisibility: .visible
            ) {
                Button("放棄變更", role: .destructive) { dismiss() }
                Button("繼續編輯", role: .cancel) {}
            }
            .confirmationDialog(
                "確定刪除此支出？可從修改紀錄檢查並還原。", isPresented: $deleting, titleVisibility: .visible
            ) {
                Button("刪除支出", role: .destructive) {
                    Task { await state.deleteExpense(session: session, onPayload: onPayload) }
                }
            }
            .confirmationDialog(
                "請先確認群組中沒有剛才的支出。若已有支出，請關閉表單；再次新增可能造成重複。", isPresented: $allowAnotherCreate,
                titleVisibility: .visible
            ) {
                Button("已確認沒有支出，允許再次新增", role: .destructive) {
                    state.unknownCreate = false
                    state.checkedUnknown = false
                    state.issue = nil
                }
            }
        }
        .sheet(isPresented: $showsAccount) {
            AccountSettingsView(hasUnsavedExpense: state.dirty)
        }
        .environment(\.locale, locale)
        .interactiveDismissDisabled(state.busy || state.receiptLoading || state.dirty)
        .task {
            state.bind(session: session)
            await state.loadDefaults(localDefaults, context: context, session: session)
            await state.loadReceipt(session: session)
        }
        .onChange(of: state.finished) { _, finished in if finished { dismiss() } }
    }
    private var canQueue: Bool {
        state.isNew && onQueue != nil && state.savedExpenseID == nil && !state.unknownCreate
            && !state.creationConfirmed
            && state.permits(.queueExpense, session: session)
    }
    @ViewBuilder private var receiptSection: some View {
        Section("收據") {
            ReceiptPickerView(
                photo: $state.photo, removeExisting: $state.removeReceipt,
                loading: $state.receiptLoading,
                existingPhoto: state.existingPhoto,
                hasExisting: state.receiptExpense?.receiptId != nil
                    || state.receiptExpense?.receiptUrl != nil,
                sessionGeneration: session.sessionID
            )
            .disabled(
                state.busy || state.unknownCreate
                    || !state.permits(.editDailyData, session: session))
            if state.photo != nil { Text("照片只保留在記憶體，儲存支出後才上傳。上傳格式為 JPEG，最多 5 MB。") }
        }
    }
    @ViewBuilder private var conflictSection: some View {
        Section("版本衝突：比較最新內容與上方草稿") {
            Button("載入最新群組以比較") {
                Task { await state.reloadReview(session: session, onPayload: onPayload) }
            }.disabled(state.busy)
            if state.reviewLoaded {
                if let expense = state.reviewExpense {
                    ExpenseSnapshotDetails(
                        expense: expense, participants: state.payload.trip.participants)
                    Text("上方輸入值未變更。請檢查付款人、成員、總額、逐人分攤及收據，再確認最新版本。")
                    if (expense.version ?? 0) <= 0 {
                        Text("最新回應仍缺少有效版本。不能覆寫，請重新載入。").foregroundStyle(.red)
                    }
                    Button("已比較，繼續使用此草稿") { state.confirmReview() }
                        .disabled(
                            state.busy || (expense.version ?? 0) <= 0
                                || (state.savedExpenseID == nil && state.validation != nil)
                                || !state.permits(.editDailyData, session: session))
                } else {
                    Text("目前支出已不存在。請關閉表單並檢查群組。")
                }
            }
        }
    }
    @ViewBuilder private var unknownSection: some View {
        Section("請先檢查群組，避免重複新增") {
            Button("載入最新群組") {
                Task { await state.reloadReview(session: session, onPayload: onPayload) }
            }.disabled(state.busy)
            if state.checkedUnknown {
                ForEach(state.payload.trip.expenses) { expense in
                    DisclosureGroup(
                        "\(expense.description) · \(expense.currency.rawValue) \(expense.currency.majorString(expense.amountMinor))"
                    ) {
                        ExpenseSnapshotDetails(
                            expense: expense, participants: state.payload.trip.participants)
                    }
                }
                if state.savedExpenseID == nil && !state.creationConfirmed {
                    Button("已檢查，仍需再次新增") { allowAnotherCreate = true }.disabled(state.busy)
                }
                Button("關閉並保留群組中的支出") { dismiss() }.disabled(state.busy)
            }
        }
    }
    @ViewBuilder private var defaultsSection: some View {
        if state.isNew, let localDefaults, let context,
            state.validContext(context, session: session)
        {
            Section("本機預設值") {
                Button("明確儲存目前幣別及分攤設定") {
                    Task {
                        await state.saveDefaults(
                            localDefaults, context: context, clear: false, session: session)
                    }
                }.disabled(state.locked || state.validation != nil)
                Button("清除已儲存的預設值", role: .destructive) {
                    Task {
                        await state.saveDefaults(
                            localDefaults, context: context, clear: true, session: session)
                    }
                }.disabled(state.busy)
            }
        }
    }
    private func queue() async {
        guard canQueue, !state.busy, !state.receiptLoading, state.validation == nil,
            state.photo == nil,
            let onQueue, let id = state.generation,
            ExpenseMutationGate.shared.acquire(sessionID: id, tripID: state.payload.trip.id)
        else { return }
        state.busy = true
        state.issue = nil
        defer {
            state.busy = false
            ExpenseMutationGate.shared.release(sessionID: id, tripID: state.payload.trip.id)
        }
        do {
            try await onQueue(state.input)
            guard state.isCurrent(session, id) else { return }
            state.finished = true
        } catch {
            guard state.isCurrent(session, id) else { return }
            state.issue = error.localizedDescription
        }
    }
}

@MainActor
struct ExpenseDraftFields: View {
    @Environment(\.locale) private var locale
    @Bindable var state: ExpenseEditorState
    private var splitValueName: String {
        switch state.splitMode {
        case .equal, .amount: NativeLocalization.string("金額", locale: locale)
        case .ratio: NativeLocalization.string("比例", locale: locale)
        case .shares: NativeLocalization.string("份數", locale: locale)
        }
    }
    var body: some View {
        Section("支出") {
            TextField("支出說明", text: $state.description, axis: .vertical).lineLimit(1...4)
                .accessibilityIdentifier("expense-description")
            TextField("金額", text: $state.amount).keyboardType(.decimalPad)
                .accessibilityIdentifier("expense-amount")
            Picker("幣別", selection: $state.currency) {
                ForEach(Currency.allCases) { Text($0.rawValue).tag($0) }
            }
            DatePicker("支出日期", selection: $state.date, displayedComponents: .date)
                .environment(\.calendar, Calendar(identifier: .gregorian))
                .onChange(of: state.date) { _, _ in state.invalidDate = nil }
            if let invalidDate = state.invalidDate {
                Text("原始日期無效：\(invalidDate)").foregroundStyle(.red)
                Button("改用今天的日期") {
                    state.date = Date()
                    state.invalidDate = nil
                }
            }
            Picker("付款人", selection: $state.paidByID) {
                if !state.payload.trip.participants.contains(where: { $0.id == state.paidByID }) {
                    Text("請重新選擇付款人").tag(state.paidByID)
                }
                ForEach(state.payload.trip.participants) { Text($0.name).tag($0.id) }
            }
            Picker("分類", selection: $state.category) {
                Text("未分類").tag("")
                if !state.category.isEmpty
                    && !["餐飲", "交通", "住宿", "門票", "購物", "其他"].contains(state.category)
                {
                    Text("無效分類：\(state.category)").tag(state.category)
                }
                ForEach(["餐飲", "交通", "住宿", "門票", "購物", "其他"], id: \.self) {
                    Text(NativeExpenseLabels.category($0, locale: locale)).tag($0)
                }
            }
            TextField("標籤（逗號分隔）", text: $state.tags)
        }
        Section {
            Picker("分攤方式", selection: $state.splitMode) {
                Text("平均").tag(SplitMode.equal)
                Text("指定金額").tag(SplitMode.amount)
                Text("比例").tag(SplitMode.ratio)
                Text("份數").tag(SplitMode.shares)
            }
            ForEach(state.payload.trip.participants) { person in
                Toggle(
                    person.name,
                    isOn: Binding(
                        get: { state.participantIDs.contains(person.id) },
                        set: { state.toggle(person.id, selected: $0) }))
                if state.participantIDs.contains(person.id) && state.splitMode != .equal {
                    TextField(
                        "\(person.name) 的\(splitValueName)",
                        text: Binding(
                            get: { state.splitValues[person.id] ?? "" },
                            set: { state.splitValues[person.id] = $0 })
                    )
                    .keyboardType(.decimalPad)
                }
            }
            if !state.missingIDs.isEmpty {
                Text("不存在的成員：\(state.missingIDs.joined(separator: ", "))").foregroundStyle(.red)
                Button("移除不存在的分攤成員") { state.correctMissingParticipants() }
            }
        } header: {
            Text("分攤成員與設定")
        } footer: {
            Text("平均分攤依選取順序處理尾差。比例與份數為相對權重。指定金額不會因總額、成員或幣別改變而自動調整。")
        }
        Section("逐人分攤預覽") {
            if let preview = state.preview {
                ForEach(preview, id: \.participantId) { share in
                    LabeledContent(
                        state.payload.trip.participants.first { $0.id == share.participantId }?.name
                            ?? share.participantId,
                        value: state.currency.formatted(share.shareMinor)
                    )
                }
            }
            if let validation = state.validation { Text(validation).foregroundStyle(.red) }
        }
    }
}
