import OtterKit
import SwiftUI

@MainActor
struct ExpenseQueueView: View {
    @Environment(AppSession.self) private var session
    @Environment(LocalExpenseState.self) private var local
    @Environment(\.dismiss) private var dismiss
    @Environment(\.locale) private var locale
    let currentPayload: TripPayload?
    let knownTripIDs: Set<String>?
    @State private var deletion: QueuedExpense?
    @State private var retry: QueuedExpense?
    @State private var editor: QueueEditor?
    @State private var lockedItem: QueuedExpense?
    @State private var editRequestID: UUID?
    @State private var busy = false
    @State private var issue: String?

    private var items: [QueuedExpense] {
        local.visibleItems(session: session, tripID: currentPayload?.trip.id)
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text("待同步草稿只存在此裝置，不計入正式餘額。登出不會刪除草稿，也不會用其他帳號重送。")
                    Button(
                        local.isSyncing ? LocalizedStringKey("同步中…") : LocalizedStringKey("同步待處理支出")
                    ) {
                        Task { await local.synchronize(session: session) }
                    }.disabled(local.isSyncing || busy || !local.isOnline)
                    if let issue = issue ?? local.issue { Text(issue).foregroundStyle(.red) }
                }
                if items.isEmpty {
                    ContentUnavailableView("沒有待同步草稿", systemImage: "checkmark.icloud")
                }
                ForEach(items) { item in
                    Section {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(item.draft.description).font(.headline)
                            Text("\(item.draft.currency.rawValue) \(item.draft.amount)")
                                .monospacedDigit()
                            Text(status(item)).foregroundStyle(.secondary)
                            Text(
                                NativeDisplayFormatting.dateOnly(
                                    item.draft.expenseDate, locale: locale)
                            ).font(.caption)
                            if let knownTripIDs, !knownTripIDs.contains(item.context.tripID) {
                                Text("此群組已不在可存取清單中。草稿不會自動重送；請先核對伺服器結果，再決定是否刪除本機資料。")
                                    .font(.footnote)
                            }
                        }
                        if item.isEditable {
                            Button("編輯草稿") { Task { await edit(item) } }
                                .disabled(busy || local.isSyncing)
                        }
                        if item.status == .conflict {
                            Button("權限已恢復，以原請求重試") { retry = item }
                                .disabled(busy || local.isSyncing || !local.isOnline)
                        }
                        if item.needsServerCheckBeforeDeletion {
                            Text("此請求可能已在伺服器記帳。刪除本機草稿不會刪除伺服器支出。")
                                .font(.footnote).foregroundStyle(.secondary)
                        }
                        Button("刪除本機草稿", role: .destructive) { deletion = item }
                            .disabled(busy || local.isSyncing)
                    }
                }
            }
            .navigationTitle("待同步支出")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("web.close") { dismiss() }.disabled(busy)
                }
            }
            .task { await reload() }
            .refreshable { await reload() }
            .confirmationDialog(
                "刪除本機草稿？",
                isPresented: Binding(get: { deletion != nil }, set: { if !$0 { deletion = nil } }),
                titleVisibility: .visible, presenting: deletion
            ) { item in
                Button(
                    item.needsServerCheckBeforeDeletion
                        ? LocalizedStringKey("已核對伺服器，刪除本機資料") : LocalizedStringKey("刪除草稿"),
                    role: .destructive
                ) {
                    Task { await remove(item) }
                }
            } message: { item in
                Text(
                    item.needsServerCheckBeforeDeletion
                        ? LocalizedStringKey("提交結果可能不明。請先在群組核對是否已記帳；此操作只刪除本機資料，不撤銷伺服器操作。")
                        : LocalizedStringKey("這會永久刪除此裝置上的待同步草稿。"))
            }
            .confirmationDialog(
                "確認已恢復權限並核對群組？",
                isPresented: Binding(get: { retry != nil }, set: { if !$0 { retry = nil } }),
                titleVisibility: .visible, presenting: retry
            ) { item in
                Button("以相同操作 ID 與內容重試") { Task { await retryOriginal(item) } }
            } message: { _ in
                Text("不會改動原請求。若仍無權限或已封存，同步將再次停止。")
            }
            .sheet(item: $editor, onDismiss: { unlock() }) { value in
                QueuedExpenseEditorView(payload: value.payload, draft: value.item.draft) { draft in
                    let generation = value.generation
                    guard generation == session.sessionID else { throw CancellationError() }
                    try await local.revise(value.item, draft: draft, session: session)
                }
            }
        }
        .interactiveDismissDisabled(busy)
        .onDisappear {
            editRequestID = nil
            if editor == nil { unlock() }
        }
    }

    private func status(_ item: QueuedExpense) -> LocalizedStringKey {
        switch item.status {
        case .pending: "尚未送出"
        case .attempted: "已嘗試送出，結果可能不明；重試不會改動操作 ID"
        case .invalid: "伺服器已確認未記帳，請修正草稿"
        case .conflict: "權限、群組或資料衝突；保留原請求"
        }
    }
    private func reload() async {
        let generation = session.sessionID
        do { try await local.reload(session: session) } catch {
            guard generation == session.sessionID, !(error is CancellationError) else { return }
            issue = error.localizedDescription
        }
    }
    private func edit(_ item: QueuedExpense) async {
        guard !busy, let client = session.client else { return }
        let generation = session.sessionID
        let requestID = UUID()
        editRequestID = requestID
        busy = true
        defer {
            busy = false
            if editRequestID == requestID { editRequestID = nil }
        }
        do {
            try await local.beginEditing(item, session: session)
            lockedItem = item
            guard editRequestID == requestID, generation == session.sessionID else {
                unlock()
                return
            }
            let payload: TripPayload
            if let currentPayload, currentPayload.trip.id == item.context.tripID {
                payload = currentPayload
            } else {
                payload = try await client.trip(id: item.context.tripID)
            }
            guard editRequestID == requestID, generation == session.sessionID else {
                unlock()
                return
            }
            _ = try local.checkedContext(item, session: session)
            editor = QueueEditor(item: item, payload: payload, generation: generation)
        } catch {
            unlock()
            guard editRequestID == requestID, generation == session.sessionID,
                !(error is CancellationError)
            else { return }
            issue = error.localizedDescription
            session.handle(error, for: generation)
        }
    }
    private func unlock() {
        guard let item = lockedItem else { return }
        lockedItem = nil
        Task { await local.queue.endEditing(id: item.id) }
    }
    private func remove(_ item: QueuedExpense) async {
        let generation = session.sessionID
        busy = true
        defer { busy = false }
        do {
            try await local.delete(item, session: session)
            guard generation == session.sessionID else { return }
            deletion = nil
        } catch {
            if generation == session.sessionID, !(error is CancellationError) {
                issue = error.localizedDescription
            }
        }
    }
    private func retryOriginal(_ item: QueuedExpense) async {
        let generation = session.sessionID
        busy = true
        defer { busy = false }
        do {
            try await local.retry(item, session: session)
            guard generation == session.sessionID else { return }
            retry = nil
            await local.synchronize(session: session)
        } catch {
            if generation == session.sessionID, !(error is CancellationError) {
                issue = error.localizedDescription
            }
        }
    }
}

private struct QueueEditor: Identifiable {
    let item: QueuedExpense
    let payload: TripPayload
    let generation: UUID
    var id: UUID { item.id }
}
