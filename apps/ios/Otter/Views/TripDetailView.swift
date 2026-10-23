import OtterKit
import SwiftUI

@MainActor
struct TripDetailView: View {
    @Environment(AppSession.self) private var session
    @Environment(LocalExpenseState.self) private var local
    @Environment(\.dismiss) private var dismiss
    let tripID: String
    let reload: (@MainActor () async throws -> TripPayload)?
    let onCreated: (@MainActor (TripPayload) -> Void)?
    let onDeleted: (@MainActor () -> Void)?
    let initialExpenseID: String?
    let route: AppNavigation.WorkspaceRoute?
    @State private var payload: TripPayload?
    @State private var loading = false
    @State private var loadID: UUID?
    @State private var issue: String?
    @State private var selectedTab: WorkspaceTab
    @State private var presentation: WorkspacePresentation?
    @State private var openedInitialEditor = false
    @State private var handledRoute: UUID?

    init(
        tripID: String, initialPayload: TripPayload? = nil,
        reload: (@MainActor () async throws -> TripPayload)? = nil,
        onCreated: (@MainActor (TripPayload) -> Void)? = nil,
        onDeleted: (@MainActor () -> Void)? = nil,
        initialView: String = "overview", initialExpenseID: String? = nil,
        route: AppNavigation.WorkspaceRoute? = nil
    ) {
        self.tripID = tripID
        self.reload = reload
        self.onCreated = onCreated
        self.onDeleted = onDeleted
        self.initialExpenseID = initialExpenseID
        self.route = route
        _payload = State(initialValue: initialPayload)
        _selectedTab = State(initialValue: WorkspaceTab(rawValue: initialView) ?? .overview)
    }

    var body: some View {
        Group {
            if let payload {
                content(payload)
            } else if loading {
                ProgressView("正在載入群組…")
            } else {
                ContentUnavailableView {
                    Label("無法載入群組", systemImage: "exclamationmark.circle")
                } description: {
                    Text(issue ?? NativeLocalization.string("請確認連線後再試。"))
                } actions: {
                    Button("重新載入") { Task { await load() } }
                }
            }
        }
        .navigationTitle(payload?.trip.name ?? NativeLocalization.string("群組"))
        .navigationBarTitleDisplayMode(.inline)
        .task(id: route?.id) { await load() }
        .onChange(of: local.successID) { _, _ in Task { await load() } }
        .sheet(
            item: $presentation, onDismiss: { Task { await load() } },
            content: { item in
                if let payload { sheet(item, payload: payload) }
            })
    }

    private func content(_ value: TripPayload) -> some View {
        let generation = session.sessionID
        let receive: @MainActor (TripPayload) -> Void = { next in
            accept(next, generation: generation)
        }
        let rules = permissions(value)
        return VStack(spacing: 0) {
            if value.trip.archivedAt != nil {
                Label("已封存：日常資料僅供檢視", systemImage: "archivebox")
                    .font(.footnote).padding(8).frame(maxWidth: .infinity).background(.thinMaterial)
            } else if !rules.allows(.editDailyData) && value.readonly != true {
                Label("此登入模式沒有日常修改權限", systemImage: "lock")
                    .font(.footnote).padding(8)
            }
            if let issue { Text(issue).font(.footnote).foregroundStyle(.red).padding(.horizontal) }
            TabView(selection: $selectedTab) {
                OverviewView(
                    payload: value, onPayload: receive, onEdit: { open(.editor(.edit($0))) },
                    onAdd: { open(.editor(.new)) }
                )
                .tag(WorkspaceTab.overview).tabItem { Label("總覽", systemImage: "square.grid.2x2") }
                ExpenseBrowserView(
                    payload: value, origin: session.client?.baseURL ?? URL(filePath: "/"),
                    userID: session.user?.id,
                    onEdit: { open(.editor(.edit($0))) }, onCopy: { open(.editor(.copy($0))) },
                    onHistory: { open(.history($0?.id)) },
                    onDelete: { expense in
                        try await delete(expense, generation: generation)
                    }
                )
                .tag(WorkspaceTab.expenses).tabItem { Label("支出", systemImage: "receipt") }
                AnalysisView(payload: value)
                    .tag(WorkspaceTab.analysis).tabItem { Label("花費分析", systemImage: "chart.bar") }
                if value.readonly != true {
                    PeopleView(payload: value, onPayload: receive)
                        .tag(WorkspaceTab.people).tabItem {
                            Label("web.people", systemImage: "person.3")
                        }
                    if session.client?.auth.isShare != true {
                        GroupSettingsView(
                            payload: value, onPayload: receive,
                            onCreated: { created($0, generation: generation) },
                            onDeleted: { deleted(generation: generation) }
                        )
                        .tag(WorkspaceTab.more).tabItem { Label("群組設定", systemImage: "gearshape") }
                    }
                }
            }
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    if rules.allows(.editDailyData) {
                        Button("新增支出", systemImage: "plus.circle") { open(.editor(.new)) }
                            .disabled(value.trip.participants.isEmpty)
                    }
                    if rules.allows(.readHistory) {
                        Button("修改紀錄", systemImage: "clock.arrow.circlepath") {
                            open(.history(nil))
                        }
                    }
                    if rules.allows(.manageAccess) {
                        Button("分享與協作者", systemImage: "person.crop.circle.badge.plus") {
                            open(.access)
                        }
                    }
                    Button("資料與列印", systemImage: "square.and.arrow.up") { open(.data) }
                    if session.user != nil && session.client?.auth.isShare != true {
                        Button("此裝置的支出預設", systemImage: "slider.horizontal.3") { open(.defaults) }
                        Button("待同步支出（\(queuedCount)）", systemImage: "icloud.and.arrow.up") {
                            open(.queue)
                        }
                        Button("帳號設定", systemImage: "person.crop.circle") { open(.account) }
                    }
                    Button("重新整理", systemImage: "arrow.clockwise") { Task { await load() } }
                        .disabled(loading)
                } label: {
                    Label("群組操作", systemImage: "ellipsis.circle")
                }
            }
        }
    }

    @ViewBuilder private func sheet(_ item: WorkspacePresentation, payload: TripPayload)
        -> some View
    {
        let generation = item.generation
        let receive: @MainActor (TripPayload) -> Void = { accept($0, generation: generation) }
        switch item.content {
        case .editor(let mode):
            ExpenseEditorView(
                payload: payload, mode: mode,
                localDefaults: session.user == nil ? nil : local.defaults,
                context: try? local.context(tripID: tripID, session: session),
                onQueue: queueAction(payload: payload, generation: generation),
                initialAccountSettings: item.initialAccountSettings, onPayload: receive)
        case .history(let id):
            ExpenseHistoryView(payload: payload, expenseID: id, onPayload: receive)
        case .account: AccountSettingsView()
        case .queue: ExpenseQueueView(currentPayload: payload, knownTripIDs: nil)
        case .access:
            NavigationStack {
                AccessSettingsView(payload: payload, onPayload: receive)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("web.close") { presentation = nil }
                        }
                    }
            }
        case .data:
            NavigationStack {
                TripDataToolsView(
                    payload: payload,
                    onCreated: { created($0, generation: generation) }, onPayload: receive
                )
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("web.close") { presentation = nil }
                    }
                }
            }
        case .defaults:
            ExpenseDefaultsResetView(payload: payload)
        }
    }

    private func queueAction(payload: TripPayload, generation: UUID) -> (
        @MainActor (NewExpense) async throws -> Void
    )? {
        guard permissions(payload).allows(.queueExpense) else { return nil }
        return { draft in
            guard generation == session.sessionID else { throw CancellationError() }
            try await local.enqueue(draft, payload: payload, session: session)
        }
    }

    private var queuedCount: Int { local.visibleItems(session: session, tripID: tripID).count }
    private func permissions(_ value: TripPayload) -> TripPermissions {
        TripPermissions(
            payload: value, auth: session.client?.auth ?? .anonymous, userID: session.user?.id)
    }
    private func open(
        _ content: WorkspacePresentation.Content, initialAccountSettings: Bool = false
    ) {
        presentation = WorkspacePresentation(
            generation: session.sessionID, content: content,
            initialAccountSettings: initialAccountSettings)
    }
    private func accept(_ value: TripPayload, generation: UUID) {
        guard generation == session.sessionID, value.trip.id == tripID else { return }
        payload = value
        issue = nil
    }
    private func created(_ value: TripPayload, generation: UUID) {
        guard generation == session.sessionID else { return }
        presentation = nil
        onCreated?(value)
    }
    private func deleted(generation: UUID) {
        guard generation == session.sessionID else { return }
        presentation = nil
        onDeleted?()
        dismiss()
    }
    private func load() async {
        guard presentation == nil, let client = session.client else { return }
        let generation = session.sessionID
        let requestID = UUID()
        loadID = requestID
        loading = true
        defer { if loadID == requestID { loading = false } }
        do {
            let value: TripPayload
            if let reload {
                value = try await reload()
            } else {
                value = try await client.trip(id: tripID)
            }
            try Task.checkCancellation()
            guard loadID == requestID, generation == session.sessionID, session.client === client,
                value.trip.id == tripID
            else { return }
            accept(value, generation: generation)
            applyInitialDestination(value, generation: generation)
        } catch {
            guard loadID == requestID, generation == session.sessionID, !Task.isCancelled
            else { return }
            issue = error.localizedDescription
            if let response = error as? APIResponseError, [403, 404].contains(response.status) {
                payload = nil
            }
            session.handle(error, for: generation)
        }
    }
    private func applyInitialDestination(_ value: TripPayload, generation: UUID) {
        guard generation == session.sessionID, presentation == nil else { return }
        let mode: IncomingLink.WorkspaceMode?
        let expenseID: String?
        let accountSettings: Bool
        if let route {
            guard route.id != handledRoute, route.tripID == tripID,
                route.sessionID == generation, route.userID == session.user?.id,
                let client = session.client, IncomingLink.sameOrigin(route.origin, client.baseURL)
            else { return }
            handledRoute = route.id
            selectedTab = WorkspaceTab(rawValue: route.view) ?? .overview
            mode = route.mode
            expenseID = route.expenseID
            accountSettings = route.accountSettings && client.auth.isSession
        } else {
            guard !openedInitialEditor else { return }
            openedInitialEditor = true
            mode = initialExpenseID == nil ? nil : .editExpense
            expenseID = initialExpenseID
            accountSettings = false
        }
        var editor: ExpenseEditorMode?
        if permissions(value).allows(.editDailyData) {
            if mode == .addExpense, !value.trip.participants.isEmpty {
                editor = .new
            } else if mode == .editExpense, let expenseID,
                let expense = value.trip.expenses.first(where: { $0.id == expenseID })
            {
                // Never substitute a version for a deep-linked expense.
                if let version = expense.version, version > 0 {
                    editor = .edit(expense)
                } else {
                    issue = NativeLocalization.string("最新回應仍缺少有效版本。不能覆寫，請重新載入。")
                }
            }
        }
        if let editor {
            open(.editor(editor), initialAccountSettings: accountSettings)
        } else if accountSettings {
            open(.account)
        }
    }

    private func delete(_ expense: Expense, generation: UUID) async throws {
        guard generation == session.sessionID, let client = session.client, let payload,
            permissions(payload).allows(.editDailyData)
        else { throw APIError.unauthorized }
        do {
            let result = try await client.deleteExpense(tripID: tripID, expense: expense)
            guard generation == session.sessionID else { throw CancellationError() }
            accept(result, generation: generation)
        } catch {
            if case APIError.unauthorized = error { session.handle(error, for: generation) }
            throw error
        }
    }
}

private enum WorkspaceTab: String { case overview, expenses, analysis, people, more }
private struct WorkspacePresentation: Identifiable {
    let id = UUID()
    let generation: UUID
    let content: Content
    var initialAccountSettings = false
    enum Content {
        case editor(ExpenseEditorMode)
        case history(String?)
        case access, data, defaults, queue, account
    }
}

@MainActor
private struct ExpenseDefaultsResetView: View {
    @Environment(AppSession.self) private var session
    @Environment(LocalExpenseState.self) private var local
    @Environment(\.dismiss) private var dismiss
    let payload: TripPayload
    @State private var busy = false
    @State private var issue: String?
    @State private var done = false
    var body: some View {
        NavigationStack {
            Form {
                Text("只清除此裝置、目前帳號與群組的支出預設。不刪除支出、登入資料、離線草稿或其他群組設定。")
                if let issue { Text(issue).foregroundStyle(.red) }
                if done { Text("本群組的本機支出預設已清除。") }
                Button("清除本群組的支出預設", role: .destructive) {
                    let generation = session.sessionID
                    Task {
                        guard !busy, generation == session.sessionID else { return }
                        busy = true
                        defer { busy = false }
                        do {
                            let context = try local.context(
                                tripID: payload.trip.id, session: session)
                            try await local.defaults.clear(in: context)
                            guard generation == session.sessionID, !Task.isCancelled else { return }
                            done = true
                        } catch {
                            guard generation == session.sessionID, !Task.isCancelled else { return }
                            issue = error.localizedDescription
                        }
                    }
                }.disabled(busy)
            }
            .navigationTitle("本機支出預設")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("web.close") { dismiss() }.disabled(busy)
                }
            }
        }
    }
}
