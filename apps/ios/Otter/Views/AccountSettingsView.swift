import OtterKit
import SwiftUI

/// Presented as a sheet so the underlying expense form remains mounted.
@MainActor
struct AccountSettingsView: View {
    let hasUnsavedExpense: Bool

    init(hasUnsavedExpense: Bool = false) {
        self.hasUnsavedExpense = hasUnsavedExpense
    }

    @Environment(AppSession.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var username = ""
    @State private var originalUsername = ""
    @State private var passkeys: [PasskeySummary] = []
    @State private var hasLoadedPasskeys = false
    @State private var busy = false
    @State private var message: String?
    @State private var removal: PasskeySummary?
    @State private var confirmSignOut = false
    @State private var confirmDiscard = false
    @State private var coordinator = PasskeyCoordinator()
    @State private var operation: Task<Void, Never>?
    @State private var tokenDraft = AccountTokenDraft()

    private var isSession: Bool { session.client?.auth.isSession == true }
    private var changed: Bool { AccountUsername.normalized(username) != originalUsername }

    var body: some View {
        NavigationStack {
            Form {
                if let message {
                    Section {
                        Text(message).foregroundStyle(.red).accessibilityAddTraits(.isStaticText)
                    }
                }
                Section("偏好設定") {
                    NavigationLink("外觀與語言") { AppearanceSettingsView() }
                }
                Section("帳號") {
                    LabeledContent("Username", value: session.user?.username ?? "—")
                    if isSession {
                        TextField("新的 Username", text: $username)
                            .textContentType(.username)
                            .textInputAutocapitalization(.never).autocorrectionDisabled()
                            .accessibilityIdentifier("account.username")
                        Text("需為 3–32 個英文字母、數字、底線或連字號，不分大小寫。開發環境預設帳號不能修改。")
                            .font(.footnote).foregroundStyle(.secondary)
                        Button("儲存 Username", action: updateUsername)
                            .disabled(busy || !changed || !AccountUsername.isValid(username))
                    } else {
                        Text("目前使用 API token 受限模式。請登出後，使用密碼或 Passkey 登入以管理帳號。")
                    }
                }
                if isSession {
                    Section {
                        if !hasLoadedPasskeys {
                            Text("尚未載入 Passkey。")
                        } else if passkeys.isEmpty {
                            Text("尚未新增 Passkey。")
                        }
                        ForEach(passkeys) { key in
                            VStack(alignment: .leading, spacing: 6) {
                                Text(LocalizedStringKey(key.backedUp ? "已備份的 Passkey" : "Passkey"))
                                Text(
                                    NativeLocalization.string(
                                        "native.accountSettingsView.createdAt",
                                        defaultValue:
                                            "建立時間：\(NativeDisplayFormatting.timestamp(key.createdAt))"
                                    )
                                ).font(.caption).foregroundStyle(
                                    .secondary)
                                if let lastUsed = key.lastUsedAt {
                                    Text("上次使用：\(NativeDisplayFormatting.timestamp(lastUsed))")
                                        .font(.caption).foregroundStyle(
                                            .secondary)
                                }
                                Text(key.id).font(.caption).lineLimit(2).textSelection(.enabled)
                                Button("移除此 Passkey", role: .destructive) { removal = key }
                            }
                        }
                        Button("重新載入 Passkey") { loadPasskeys() }
                        Button("新增 Passkey") { addPasskey() }
                    } header: {
                        Text("Passkey")
                    } footer: {
                        Text("可新增多組 Passkey。只使用 Passkey 的帳號不能移除最後一組；伺服器會檢查此限制。")
                    }
                    Section("授權與設定") {
                        NavigationLink("web.apiTokens") { TokenSettingsView(draft: tokenDraft) }
                        NavigationLink("批准裝置登入") { DeviceApprovalView() }
                        NavigationLink("AI 設定") { AISettingsView() }
                    }
                }
                Section {
                    Button("登出", role: .destructive) { confirmSignOut = true }
                        .disabled(busy || session.isSigningIn)
                }
                if busy { ProgressView("正在處理…") }
            }
            .disabled(busy)
            .otterList()
            .navigationTitle("帳號設定")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("完成") {
                        if changed { confirmDiscard = true } else { dismiss() }
                    }.disabled(busy || tokenDraft.mustKeepOpen)
                }
            }
            .confirmationDialog(
                "移除此 Passkey？",
                isPresented: Binding(
                    get: { removal != nil }, set: { if !$0 { removal = nil } }
                ), titleVisibility: .visible
            ) {
                if let removal {
                    Button("移除", role: .destructive) { removePasskey(removal) }
                }
                Button("取消", role: .cancel) { removal = nil }
            } message: {
                Text("移除後，不能再使用此 Passkey 登入。只使用 Passkey 的帳號必須保留至少一組。")
            }
            .confirmationDialog("登出此帳號？", isPresented: $confirmSignOut, titleVisibility: .visible) {
                Button("登出", role: .destructive) {
                    run { _, _ in await session.signOut() }
                }
                Button("取消", role: .cancel) {}
            } message: {
                if hasUnsavedExpense {
                    Text("要放棄尚未儲存的變更嗎？已儲存的支出不會被刪除。")
                }
            }
            .confirmationDialog(
                "捨棄 Username 修改？", isPresented: $confirmDiscard, titleVisibility: .visible
            ) {
                Button("捨棄修改", role: .destructive) { dismiss() }
                Button("繼續編輯", role: .cancel) {}
            }
        }
        .interactiveDismissDisabled(changed || busy || tokenDraft.mustKeepOpen)
        .task {
            username = session.user?.username ?? ""
            originalUsername = username
            if isSession { loadPasskeys() }
        }
        .onDisappear {
            operation?.cancel()
            coordinator.cancel()
        }
    }

    private func run(_ action: @escaping @MainActor (OtterClient, UUID) async throws -> Void) {
        guard !busy, let client = session.client else { return }
        let generation = session.sessionID
        busy = true
        message = nil
        operation = Task { @MainActor in
            defer { if session.sessionID == generation { busy = false } }
            do {
                try Task.checkCancellation()
                guard session.sessionID == generation else { return }
                try await action(client, generation)
            } catch {
                guard session.sessionID == generation, !(error is CancellationError) else { return }
                message = error.localizedDescription
                if case APIError.unauthorized = error { session.handle(error, for: generation) }
            }
        }
    }

    private func updateUsername() {
        let submitted = AccountUsername.normalized(username)
        guard AccountUsername.isValid(username), changed else { return }
        run { client, generation in
            _ = try await client.updateUsername(submitted)
            try Task.checkCancellation()
            guard session.sessionID == generation else { return }
            try await session.refreshUser()
            guard session.sessionID == generation else { return }
            username = session.user?.username ?? submitted
            originalUsername = username
            message = NativeLocalization.string("已更新 Username。")
        }
    }

    private func loadPasskeys() {
        run { client, generation in
            let result = try await client.passkeys()
            try Task.checkCancellation()
            guard session.sessionID == generation else { return }
            passkeys = result.passkeys
            hasLoadedPasskeys = true
        }
    }

    private func addPasskey() {
        run { client, generation in
            let ceremony = try await client.passkeyRegistrationOptions()
            try Task.checkCancellation()
            guard session.sessionID == generation else { return }
            let response = try await coordinator.perform(
                ceremony, server: client.baseURL, registration: true)
            try Task.checkCancellation()
            guard session.sessionID == generation else { return }
            try await client.finishPasskeyRegistration(ceremony: ceremony, response: response)
            try Task.checkCancellation()
            guard session.sessionID == generation else { return }
            let result = try await client.passkeys()
            guard session.sessionID == generation else { return }
            passkeys = result.passkeys
            hasLoadedPasskeys = true
            message = NativeLocalization.string("已新增 Passkey。")
        }
    }

    private func removePasskey(_ key: PasskeySummary) {
        removal = nil
        run { client, generation in
            try await client.removePasskey(id: key.id)
            try Task.checkCancellation()
            guard session.sessionID == generation else { return }
            passkeys.removeAll { $0.id == key.id }
            message = NativeLocalization.string("已移除 Passkey。")
        }
    }
}

enum AccountUsername {
    static func normalized(_ value: String) -> String {
        WebText.trim(value).lowercased()
    }
    static func isValid(_ value: String) -> Bool {
        let bytes = WebText.trim(value).utf8
        return (3...32).contains(bytes.count)
            && bytes.allSatisfy {
                (65...90).contains($0) || (97...122).contains($0)
                    || (48...57).contains($0) || $0 == 95 || $0 == 45
            }
    }
}
