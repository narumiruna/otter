import OtterKit
import SwiftUI

/// Present above the account subtree so login does not discard the pending invite.
@MainActor
struct IncomingLinkView: View {
    let link: IncomingLink
    let onWorkspace: @MainActor (AppNavigation.WorkspaceRoute) -> Void
    @Environment(AppSession.self) private var account
    @Environment(\.dismiss) private var dismiss
    @State private var confirmedOrigin = false
    @State private var result: ShareOpenResult?
    @State private var workspace: PublicWorkspace?
    @State private var busy = false
    @State private var message: String?
    @State private var showLogin = false
    @State private var attemptedJoinSessionID: UUID?
    @State private var completed = false
    @State private var retryID = UUID()
    @State private var isActive = true

    init(
        link: IncomingLink,
        onWorkspace: @MainActor @escaping (AppNavigation.WorkspaceRoute) -> Void
    ) {
        self.link = link
        self.onWorkspace = onWorkspace
    }

    private var knownOrigin: Bool {
        IncomingLink.sameOrigin(link.origin, URL(string: "https://otter.narumi.dev")!)
            || account.client.map { IncomingLink.sameOrigin(link.origin, $0.baseURL) } == true
    }
    private var trusted: Bool { knownOrigin || confirmedOrigin }
    private var sameOriginSession: Bool {
        guard let client = account.client else { return false }
        return client.auth.isSession && IncomingLink.sameOrigin(link.origin, client.baseURL)
    }
    private var taskID: RouteTaskID {
        RouteTaskID(
            sessionID: account.sessionID, userID: account.user?.id,
            trusted: trusted, retryID: retryID)
    }

    var body: some View {
        NavigationStack {
            Group {
                if !trusted {
                    originConfirmation
                } else if let workspace {
                    TripDetailView(
                        tripID: workspace.payload.trip.id, initialPayload: workspace.payload,
                        reload: workspace.reload
                    )
                    .environment(workspace.session)
                } else {
                    routeContent
                }
            }
            .navigationTitle("開啟連結")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("web.close") { dismiss() }
                }
            }
        }
        .onAppear { isActive = true }
        .task(id: taskID) { await advance(id: taskID) }
        .onDisappear { isActive = false }
        .sheet(isPresented: $showLogin) {
            LoginView(initialServer: link.origin.absoluteString)
                .environment(account)
                .safeAreaInset(edge: .top) {
                    VStack(alignment: .leading) {
                        Text("請登入此伺服器以繼續開啟連結。")
                        Text(link.origin.absoluteString).font(.caption).textSelection(.enabled)
                        if case .preview(let preview) = result {
                            Text("邀請加入：\(preview.tripName)")
                        }
                        Button("返回連結") { showLogin = false }
                    }
                    .padding().frame(maxWidth: .infinity, alignment: .leading)
                    .background(.regularMaterial)
                }
        }
        .onChange(of: account.sessionID) { _, _ in
            if sameOriginSession { showLogin = false }
        }
    }

    private var originConfirmation: some View {
        Form {
            Section("此連結使用其他伺服器") {
                Text(link.origin.absoluteString).textSelection(.enabled)
                Text("請確認您信任此伺服器。繼續後才會連線；目前帳號的登入資料不會傳送到此伺服器。")
                Button("信任並繼續") { confirmedOrigin = true }
                Button("取消", role: .cancel) { dismiss() }
            }
        }
    }

    @ViewBuilder
    private var routeContent: some View {
        if case .device(let code) = link.destination, sameOriginSession {
            DeviceApprovalView(initialCode: code)
        } else if case .accountSettings = link.destination, sameOriginSession {
            AccountSettingsView()
        } else {
            Form {
                Section("伺服器") { Text(link.origin.absoluteString).textSelection(.enabled) }
                if case .preview(let preview) = result {
                    Section("群組邀請") {
                        Text(preview.tripName).font(.headline)
                        Text("登入此伺服器後，將自動加入此群組並取得編輯權限。")
                    }
                }
                if let message {
                    Section { Text(message).foregroundStyle(.red) }
                }
                if busy { ProgressView("正在開啟連結…") }
                if needsLogin {
                    Section {
                        Text("需要此伺服器的帳號登入。API token 不能用於接受邀請或批准裝置。")
                        Button("登入或註冊") { showLogin = true }.disabled(busy)
                    }
                } else if message != nil {
                    Button("重試") {
                        attemptedJoinSessionID = nil
                        retryID = UUID()
                    }.disabled(busy)
                }
            }
        }
    }

    private var needsLogin: Bool {
        if case .share = link.destination {
            guard case .preview = result else { return false }
            return !sameOriginSession
        }
        if case .workspace(_, _, _, _, let accountSettings) = link.destination {
            guard let client = account.client else { return true }
            if accountSettings && !client.auth.isSession { return true }
            return !(client.auth.isSession || client.auth.isBearer)
                || !IncomingLink.sameOrigin(link.origin, client.baseURL)
        }
        return !sameOriginSession
    }

    private func advance(id: RouteTaskID) async {
        guard isActive, trusted, !completed, !Task.isCancelled else { return }
        busy = true
        message = nil
        defer { if taskID == id { busy = false } }
        do {
            switch link.destination {
            case .share(let token):
                let share = try ShareClient(origin: link.origin)
                if result == nil {
                    let opened = try await share.open(token: token)
                    try checkCurrent(id)
                    result = opened
                }
                switch result {
                case .readonly(let payload):
                    if workspace == nil {
                        let session = try AppSession(ephemeralClient: share.readonlyClient)
                        workspace = PublicWorkspace(
                            payload: payload, session: session,
                            reload: {
                                let refreshed = try await share.readonlyPayload(token: token)
                                guard refreshed.trip.id == payload.trip.id else {
                                    throw IncomingLinkError.invalidShare
                                }
                                return refreshed
                            })
                    }
                case .anyoneEdit(let payload):
                    if workspace == nil {
                        let guest = try share.guestClient(token: token, payload: payload)
                        let session = try AppSession(ephemeralClient: guest)
                        workspace = PublicWorkspace(
                            payload: payload, session: session,
                            reload: {
                                do { return try await guest.trip(id: payload.trip.id) } catch {
                                    if error is CancellationError { throw CancellationError() }
                                    throw IncomingLinkError.invalidShare
                                }
                            })
                    }
                case .preview:
                    guard sameOriginSession, attemptedJoinSessionID != id.sessionID,
                        let client = account.client
                    else { return }
                    attemptedJoinSessionID = id.sessionID
                    let payload = try await share.join(token: token, session: client)
                    try checkCurrent(id)
                    completed = true
                    sendWorkspace(tripID: payload.trip.id, view: "overview", id: id)
                    dismiss()
                case nil: break
                }
            case .workspace(let tripID, let view, let expenseID, let mode, let accountSettings):
                guard !needsLogin else { return }
                try checkCurrent(id)
                completed = true
                sendWorkspace(
                    tripID: tripID, view: view, expenseID: expenseID,
                    mode: mode, accountSettings: accountSettings, id: id)
                dismiss()
            case .device, .accountSettings: break
            }
        } catch {
            guard isActive, taskID == id, !Task.isCancelled, !(error is CancellationError) else {
                return
            }
            if case APIError.unauthorized = error {
                account.handle(APIError.unauthorized, for: id.sessionID)
            }
            message = NativeLocalization.string("無法開啟連結。請確認登入狀態、連線，以及連結是否仍然有效。")
        }
    }

    private func sendWorkspace(
        tripID: String, view: String, expenseID: String? = nil,
        mode: IncomingLink.WorkspaceMode? = nil, accountSettings: Bool = false,
        id: RouteTaskID
    ) {
        guard isActive, taskID == id, !Task.isCancelled else { return }
        onWorkspace(
            AppNavigation.WorkspaceRoute(
                origin: link.origin, tripID: tripID, view: view, expenseID: expenseID,
                mode: mode, accountSettings: accountSettings,
                sessionID: id.sessionID, userID: id.userID))
    }

    private func checkCurrent(_ id: RouteTaskID) throws {
        try Task.checkCancellation()
        guard isActive, taskID == id else { throw CancellationError() }
    }
}

private struct RouteTaskID: Equatable {
    let sessionID: UUID
    let userID: String?
    let trusted: Bool
    let retryID: UUID
}

@MainActor
private struct PublicWorkspace {
    let payload: TripPayload
    let session: AppSession
    let reload: @MainActor () async throws -> TripPayload
}
