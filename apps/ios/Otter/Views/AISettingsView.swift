import OtterKit
import SwiftUI

struct AISettingsView: View {
    @Environment(AppSession.self) private var session
    @Environment(\.scenePhase) private var scenePhase
    @State private var state = AISettingsState()
    @State private var disconnecting: AIConnection?

    private var controlsDisabled: Bool {
        state.busy || state.loading || state.pending || !state.loaded || state.loadFailed
    }

    var body: some View {
        Form {
            if session.client?.auth.isSession != true {
                Section {
                    Text("AI 設定需要帳號登入；API token 或分享連結不能使用此功能。")
                }
            } else {
                Section {
                    Text("連線 AI 供應商並保存模型偏好。此功能不會傳送提示或執行模型推論。")
                    Text("API key 連線只表示金鑰已保存，不表示供應商已驗證金鑰。")
                        .font(.footnote)
                    if state.loading { ProgressView("載入中⋯") }
                    if let issue = state.issue { issueText(issue).foregroundStyle(.red) }
                    if let notice = state.notice { noticeText(notice).foregroundStyle(.secondary) }
                    Button("重新載入") { Task { await state.reload() } }
                        .disabled(state.busy || state.loading)
                }
                connectionsSection
                connectionSetup
                if state.pending { loginSection }
                modelSection
            }
        }
        .navigationTitle("AI 設定")
        .task(id: session.sessionID) {
            await state.activate(session: session, active: scenePhase == .active)
        }
        .onChange(of: scenePhase) { _, phase in state.setActive(phase == .active) }
        .onDisappear { state.leave() }
        .confirmationDialog(
            "解除供應商連線？",
            isPresented: Binding(
                get: { disconnecting != nil }, set: { if !$0 { disconnecting = nil } }),
            titleVisibility: .visible
        ) {
            if let connection = disconnecting {
                Button("解除連線", role: .destructive) {
                    Task { await state.disconnect(connection.provider) }
                    disconnecting = nil
                }
            }
            Button("取消", role: .cancel) { disconnecting = nil }
        } message: {
            Text("Otter 會刪除此連線及使用此供應商的已保存設定。這不會撤銷供應商端的授權。")
        }
    }

    private var connectionsSection: some View {
        Section("供應商連線") {
            if state.connections.isEmpty { Text("尚未連線任何供應商。") }
            ForEach(state.connections) { connection in
                VStack(alignment: .leading, spacing: 8) {
                    Text(verbatim: providerName(connection.provider)).font(.headline)
                    methodText(connection.method).foregroundStyle(.secondary)
                    HStack {
                        Button("替換連線") {
                            state.connectionProvider = connection.provider
                            let methods =
                                state.catalog?.providers.first {
                                    $0.id == connection.provider
                                }?.authMethods ?? []
                            state.connectionMethod =
                                methods.contains(connection.method)
                                ? connection.method : (methods.first ?? .oauth)
                        }
                        .disabled(
                            controlsDisabled || state.catalog?.authenticationEnabled != true
                                || state.catalog?.providers.first {
                                    $0.id == connection.provider
                                }?.authMethods.isEmpty != false)
                        Button("解除連線", role: .destructive) { disconnecting = connection }
                            .disabled(controlsDisabled)
                    }
                    .buttonStyle(.borderless)
                }
            }
            if state.catalog?.authenticationEnabled == false {
                Text("伺服器目前無法建立或替換連線。您仍可讀取設定或解除連線。")
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var connectionSetup: some View {
        Section("建立或替換連線") {
            Picker("native.aiSettingsView.authMethod", selection: $state.connectionMethod) {
                ForEach(AIAuthMethod.allCases, id: \.self) { method in
                    methodText(method).tag(method)
                        .disabled(
                            state.catalog?.providers.contains { $0.authMethods.contains(method) }
                                != true)
                }
            }
            .onChange(of: state.connectionMethod) { _, method in
                if state.catalog?.providers.first(where: { $0.id == state.connectionProvider })?
                    .authMethods.contains(method) != true
                {
                    state.connectionProvider = ""
                }
            }
            AISearchPicker(
                title: "供應商", selection: $state.connectionProvider,
                options: (state.catalog?.providers ?? [])
                    .filter { $0.authMethods.contains(state.connectionMethod) }
                    .map { AISearchOption(id: $0.id, name: $0.name) })
            if state.connectionMethod == .apiKey {
                Text("請僅在登入提示欄位輸入 API key。金鑰不會保存在此裝置。")
                    .font(.footnote)
            }
            if state.connections.contains(where: { $0.provider == state.connectionProvider }) {
                Text("新連線成功前，原有連線會保持不變。模型偏好不會自動變更。")
                    .font(.footnote)
            }
            Button("開始連線") { Task { await state.connect() } }
                .disabled(!state.canConnect)
        }
        .disabled(controlsDisabled || state.catalog?.authenticationEnabled != true)
    }

    private var loginSection: some View {
        Section("登入進度") {
            if let login = state.login {
                Text(verbatim: providerName(login.provider)).font(.headline)
                ProgressView("等待供應商登入⋯")
                if login.method == .oauth {
                    Text("如需外部授權，請使用下方按鈕開啟供應商網站，完成後返回此畫面。")
                        .font(.footnote)
                }
                Text("登入會在約 10 分鐘後到期。")
                    .font(.footnote)
                ForEach(Array(uniqueEvents(login.events).enumerated()), id: \.offset) { _, event in
                    AIEventView(event: event)
                }
                if let prompt = login.prompt {
                    Text(verbatim: prompt.message)
                    promptInput(prompt)
                        .id(prompt.id)
                        .disabled(state.busy || state.loading)
                    Button("web.aiAuthContinue") { Task { await state.respond() } }
                        .disabled(!state.canRespond)
                }
                Button("取消登入", role: .cancel) { Task { await state.cancel() } }
                    .disabled(state.busy || state.loading)
            }
        }
        .privacySensitive()
    }

    @ViewBuilder
    private func promptInput(_ prompt: AIAuthPrompt) -> some View {
        switch prompt {
        case .text(let input):
            TextField("回應", text: $state.input, prompt: Text(verbatim: input.placeholder ?? ""))
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .textContentType(nil)
        case .secret(let input), .manualCode(let input):
            SecureField("回應", text: $state.input, prompt: Text(verbatim: input.placeholder ?? ""))
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .textContentType(nil)
        case .select(let select):
            Picker("選項", selection: $state.input) {
                Text("請選擇").tag("")
                ForEach(select.options) { option in
                    Text(verbatim: option.label).tag(option.id)
                }
            }
            if let description = select.options.first(where: { $0.id == state.input })?.description
            {
                Text(verbatim: description).font(.footnote)
            }
        }
    }

    private var modelSection: some View {
        Section("模型偏好") {
            if let saved = state.saved {
                LabeledContent("目前保存的供應商", value: providerName(saved.provider))
                LabeledContent("目前保存的模型", value: saved.model)
                LabeledContent("目前保存的思考程度", value: saved.thinkingLevel.rawValue)
                if !savedIsAvailable(saved) {
                    Text("已保存的選項目前無法使用。原設定會保留，直到您明確保存新選項或解除該供應商連線。")
                        .foregroundStyle(.secondary)
                }
            }
            if state.connections.isEmpty { Text("請先連線供應商，再選擇模型。") }
            AISearchPicker(
                title: "供應商",
                selection: Binding(
                    get: { state.draft.provider }, set: { state.selectProvider($0) }),
                options: (state.catalog?.providers ?? [])
                    .filter { provider in state.connections.contains { $0.provider == provider.id }
                    }
                    .map { AISearchOption(id: $0.id, name: $0.name) }
            )
            .disabled(controlsDisabled)
            AISearchPicker(
                title: "模型",
                selection: Binding(get: { state.draft.model }, set: { state.selectModel($0) }),
                options: (state.provider?.models ?? []).map {
                    AISearchOption(id: $0.id, name: $0.name)
                }
            )
            .disabled(controlsDisabled || state.provider == nil)
            AISearchPicker(
                title: "思考程度",
                selection: Binding(
                    get: { state.draft.thinkingLevel.rawValue },
                    set: {
                        if let level = AIThinkingLevel(rawValue: $0) {
                            state.draft.thinkingLevel = level
                        }
                    }),
                options: (state.model?.thinkingLevels ?? []).map {
                    AISearchOption(id: $0.rawValue, name: $0.rawValue)
                }
            )
            .disabled(controlsDisabled || state.model == nil)
            Button("保存模型偏好") { Task { await state.save() } }
                .disabled(!state.canSave)
        }
    }

    private func savedIsAvailable(_ saved: AISettings) -> Bool {
        state.connections.contains { $0.provider == saved.provider }
            && state.catalog?.providers.first { $0.id == saved.provider }?
                .models.first { $0.id == saved.model }?.thinkingLevels.contains(saved.thinkingLevel)
                == true
    }

    private func providerName(_ id: String) -> String {
        state.catalog?.providers.first { $0.id == id }?.name ?? id
    }

    private func uniqueEvents(_ events: [AIAuthEvent]) -> [AIAuthEvent] {
        events.reduce(into: []) { if !$0.contains($1) { $0.append($1) } }
    }

    private func methodText(_ method: AIAuthMethod) -> Text {
        switch method {
        case .oauth: Text("供應商帳號登入")
        case .apiKey: Text("API key")
        }
    }

    private func issueText(_ issue: AISettingsState.Issue) -> Text {
        switch issue {
        case .load: Text("無法載入 AI 設定。請檢查網路後重新載入。")
        case .login: Text("登入未完成或回應已失效。請檢查目前提示，或取消後重試。")
        case .save: Text("無法保存模型偏好。請重新載入後重試。")
        case .disconnect: Text("無法確認解除連線結果。請重新載入後檢查連線。")
        case .expired: Text("登入已到期或伺服器已重新啟動。請重新開始登入。")
        case .rateLimited: Text("登入次數已達上限。請取消待處理的登入，或稍後重試。")
        case .unavailable: Text("伺服器目前無法建立連線。請稍後重試。")
        }
    }

    private func noticeText(_ notice: AISettingsState.Notice) -> Text {
        switch notice {
        case .saved: Text("模型偏好已保存。")
        case .connected: Text("供應商連線已保存。")
        case .disconnected: Text("供應商連線已解除。")
        case .cancelled: Text("登入已取消。請檢查連線清單；取消不會撤銷已保存的連線。")
        }
    }
}

private struct AISearchOption: Identifiable {
    let id: String
    let name: String
}

private struct AISearchPicker: View {
    let title: LocalizedStringKey
    @Binding var selection: String
    let options: [AISearchOption]
    @State private var presented = false
    @State private var search = ""

    var body: some View {
        Button {
            search = ""
            presented = true
        } label: {
            LabeledContent {
                if selection.isEmpty {
                    Text("請選擇")
                } else {
                    Text(verbatim: options.first { $0.id == selection }?.name ?? selection)
                }
            } label: {
                Text(title)
            }
        }
        .disabled(options.isEmpty)
        .sheet(isPresented: $presented) {
            NavigationStack {
                List {
                    ForEach(
                        options.filter {
                            search.isEmpty || $0.name.localizedCaseInsensitiveContains(search)
                                || $0.id.localizedCaseInsensitiveContains(search)
                        }
                    ) { option in
                        Button {
                            selection = option.id
                            presented = false
                        } label: {
                            HStack {
                                VStack(alignment: .leading) {
                                    Text(verbatim: option.name)
                                    if option.name != option.id {
                                        Text(verbatim: option.id).font(.caption).foregroundStyle(
                                            .secondary)
                                    }
                                }
                                Spacer()
                                if option.id == selection { Image(systemName: "checkmark") }
                            }
                        }
                        .accessibilityAddTraits(option.id == selection ? .isSelected : [])
                    }
                }
                .searchable(text: $search, prompt: "搜尋名稱或 ID")
                .navigationTitle(Text(title))
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("取消") { presented = false }
                    }
                }
            }
        }
    }
}

private struct AIEventView: View {
    let event: AIAuthEvent
    @Environment(\.openURL) private var openURL

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            switch event {
            case .info(let message, let links):
                Text(verbatim: message)
                ForEach(Array((links ?? []).enumerated()), id: \.offset) { _, link in
                    providerButton(link.url, label: link.label)
                }
            case .progress(let message): Text(verbatim: message)
            case .authURL(let url, let instructions):
                providerButton(url)
                if let instructions { Text(verbatim: instructions) }
            case .deviceCode(let code, let uri, _, let expires):
                LabeledContent("裝置驗證碼") {
                    Text(verbatim: code).monospaced().textSelection(.enabled)
                }
                providerButton(uri)
                if let expires { Text("驗證碼有效時間：\(expires) 秒").font(.footnote) }
            }
        }
    }

    @ViewBuilder
    private func providerButton(_ value: String, label: String? = nil) -> some View {
        if let url = AIProviderURL.validated(value) {
            Button {
                openURL(url)
            } label: {
                if let label { Text(verbatim: label) } else { Text("在瀏覽器開啟供應商登入頁") }
            }
        } else {
            Text("供應商登入連結不安全，無法開啟。請取消後重試。")
                .foregroundStyle(.red)
        }
    }
}
