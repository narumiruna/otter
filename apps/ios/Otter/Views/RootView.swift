import OtterKit
import SwiftUI

@MainActor
struct RootView: View {
    @Environment(AppSession.self) private var session

    var body: some View {
        Group {
            if session.isRestoring {
                ProgressView("正在還原登入狀態…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if session.client != nil {
                TripListView()
            } else {
                LoginView()
            }
        }
        .id(session.sessionID)
        .alert(
            "發生錯誤",
            isPresented: Binding(
                get: { session.errorMessage != nil },
                set: { if !$0 { session.errorMessage = nil } }
            )
        ) {
            Button("好", role: .cancel) { session.errorMessage = nil }
        } message: {
            Text(session.errorMessage ?? NativeLocalization.string("請稍後再試。"))
        }
    }
}

@MainActor
struct LoginView: View {
    private enum Mode: String, CaseIterable {
        case login = "登入"
        case register = "註冊"
        case token = "Token 受限模式"
    }
    private struct PendingSignup {
        let server: URL
        let username: String
        let challengeID: String
        let expiresAt: Date
    }
    @Environment(AppSession.self) private var session
    @State private var server = "https://otter.narumi.dev"
    @State private var username = ""
    @State private var password = ""
    @State private var token = ""
    @State private var mode = Mode.login
    @State private var busy = false
    @State private var pendingSignup: PendingSignup?
    @State private var coordinator = PasskeyCoordinator()
    @State private var operation: Task<Void, Never>?
    @State private var showsPreferences = false

    init(initialServer: String = "https://otter.narumi.dev") {
        _server = State(initialValue: initialServer)
    }

    private var normalizedUsername: String {
        AccountUsername.normalized(username)
    }
    private var canSubmit: Bool {
        guard !busy, !session.isSigningIn,
            !server.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        else { return false }
        if mode == .token { return !token.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
        return !normalizedUsername.isEmpty && !password.isEmpty
            && (mode != .register
                || (AccountUsername.isValid(username) && password.utf16.count >= 8))
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Label("Otter", systemImage: "creditcard").font(.largeTitle.bold())
                    Text("與朋友一起管理旅行與共同支出。").foregroundStyle(.secondary)
                    Picker("native.rootView.authMethod", selection: $mode) {
                        ForEach(Mode.allCases, id: \.self) { mode in
                            Text(LocalizedStringKey(mode.rawValue)).tag(mode)
                        }
                    }
                    .pickerStyle(.segmented)
                    .accessibilityIdentifier("login.mode")
                }
                Section("連線資料") {
                    TextField("伺服器網址", text: $server)
                        .accessibilityIdentifier("login.server")
                        .keyboardType(.URL).textContentType(.URL)
                        .textInputAutocapitalization(.never).autocorrectionDisabled()
                }
                if mode == .token {
                    Section {
                        SecureField("native.rootView.apiToken", text: $token)
                            .accessibilityIdentifier("login.token")
                            .privacySensitive()
                            .textInputAutocapitalization(.never).autocorrectionDisabled()
                    } footer: {
                        Text(
                            "Token 為受限模式，不能管理帳號、Passkey、API token 或 AI 設定。新增支出或記錄付款需要群組的 API 修改權限。")
                    }
                } else {
                    Section {
                        TextField("Username", text: $username)
                            .accessibilityIdentifier("login.username")
                            .textContentType(.username)
                            .textInputAutocapitalization(.never).autocorrectionDisabled()
                        SecureField("密碼", text: $password)
                            .accessibilityIdentifier("login.password")
                            .textContentType(mode == .register ? .newPassword : .password)
                            .privacySensitive()
                    } footer: {
                        if mode == .register {
                            Text(
                                "Username 需為 3–32 個英文字母、數字、底線或連字號，不分大小寫。密碼至少 8 個字。也可以只使用 Passkey 註冊，不需要密碼。"
                            )
                        }
                    }
                }
                Section {
                    Button(action: submitPasswordOrToken) {
                        HStack {
                            Text(
                                LocalizedStringKey(
                                    busy ? "正在處理…" : mode == .register ? "使用密碼註冊" : "登入"))
                            Spacer()
                            if busy { ProgressView() }
                        }
                    }
                    .accessibilityIdentifier("login.submit")
                    .disabled(!canSubmit)
                    if mode != .token {
                        Button(
                            LocalizedStringKey(
                                mode == .register ? "只使用 Passkey 註冊" : "使用 Passkey 登入")
                        ) {
                            submitPasskey()
                        }
                        .accessibilityIdentifier("login.passkey")
                        .disabled(busy || (mode == .register && !AccountUsername.isValid(username)))
                    }
                } footer: {
                    if mode == .register, pendingSignup != nil {
                        Text("Passkey 註冊取消後，可在 5 分鐘內重試或改用密碼完成同一個 Username 的註冊。")
                    }
                }
            }
            .disabled(busy || session.isSigningIn)
            .navigationTitle(Text(LocalizedStringKey(mode == .register ? "建立帳號" : "登入")))
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("外觀與語言", systemImage: "globe") { showsPreferences = true }
                        .accessibilityIdentifier("login.preferences")
                        .disabled(busy || session.isSigningIn)
                }
            }
            .onChange(of: mode) { _, _ in
                password = ""
                token = ""
            }
            .onDisappear {
                operation?.cancel()
                coordinator.cancel()
                password = ""
                token = ""
            }
        }
        .sheet(isPresented: $showsPreferences) {
            NavigationStack {
                AppearanceSettingsView()
                    .toolbar {
                        ToolbarItem(placement: .confirmationAction) {
                            Button("完成") { showsPreferences = false }
                                .accessibilityIdentifier("login.preferences.done")
                        }
                    }
            }
        }
    }

    private func challenge(for client: OtterClient) -> PendingSignup? {
        guard let pendingSignup, pendingSignup.server == client.baseURL,
            pendingSignup.username == normalizedUsername, pendingSignup.expiresAt > Date()
        else { return nil }
        return pendingSignup
    }

    private func submitPasswordOrToken() {
        guard canSubmit else { return }
        let generation = session.sessionID
        let challengeID: String?
        do {
            // Validate the origin before consuming input. Validation errors keep the form intact.
            let candidate: OtterClient
            if mode == .token {
                candidate = try OtterClient(
                    server: server, token: token.trimmingCharacters(in: .whitespacesAndNewlines))
            } else {
                candidate = try OtterClient(server: server, auth: .anonymous)
            }
            challengeID = challenge(for: candidate)?.challengeID
        } catch {
            session.handle(error, for: generation)
            return
        }
        let submittedServer = server
        let submittedUsername = normalizedUsername
        let submittedPassword = password
        let submittedToken = token.trimmingCharacters(in: .whitespacesAndNewlines)
        let register = mode == .register
        let isToken = mode == .token
        password = ""
        token = ""
        busy = true
        operation = Task { @MainActor in
            defer { if session.sessionID == generation { busy = false } }
            guard session.sessionID == generation, !Task.isCancelled else { return }
            if isToken {
                await session.signIn(server: submittedServer, token: submittedToken)
            } else {
                await session.signIn(
                    server: submittedServer, username: submittedUsername,
                    password: submittedPassword, register: register,
                    challengeID: register ? challengeID : nil)
            }
        }
    }

    private func submitPasskey() {
        guard !busy, !session.isSigningIn else { return }
        let generation = session.sessionID
        let signup = mode == .register
        let submittedUsername = normalizedUsername
        let submittedServer = server
        busy = true
        password = ""
        operation = Task { @MainActor in
            defer { if session.sessionID == generation { busy = false } }
            do {
                try Task.checkCancellation()
                guard session.sessionID == generation else { return }
                let client = try OtterClient(server: submittedServer, auth: .anonymous)
                let previous = challenge(for: client)
                let ceremony =
                    try await signup
                    ? client.passkeySignupOptions(
                        username: submittedUsername, challengeID: previous?.challengeID)
                    : client.passkeyLoginOptions()
                try Task.checkCancellation()
                guard session.sessionID == generation else { return }
                if signup {
                    pendingSignup = PendingSignup(
                        server: client.baseURL, username: submittedUsername,
                        challengeID: ceremony.challengeId,
                        expiresAt: previous?.expiresAt ?? Date().addingTimeInterval(300))
                }
                let response = try await coordinator.perform(
                    ceremony, server: client.baseURL, registration: signup)
                try Task.checkCancellation()
                guard session.sessionID == generation else { return }
                let login = try await client.finishPasskeyLogin(
                    ceremony: ceremony, response: response, signup: signup)
                try Task.checkCancellation()
                try session.acceptLogin(login, for: generation)
            } catch { session.handle(error, for: generation) }
        }
    }
}
