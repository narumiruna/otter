import OtterKit
import SwiftUI

@MainActor
struct DeviceApprovalView: View {
    @Environment(AppSession.self) private var session
    @Environment(\.locale) private var locale
    @State private var code: String
    @State private var inspection: DeviceInspection?
    @State private var message: String?
    @State private var busy = false
    @State private var approved = false
    @State private var confirmApproval = false
    @State private var operation: Task<Void, Never>?

    init(initialCode: String = "") { _code = State(initialValue: initialCode) }

    var body: some View {
        Form {
            if let message { Section { Text(message).foregroundStyle(.red) } }
            if approved {
                Section { Label("已批准裝置登入", systemImage: "checkmark.circle") }
            } else {
                Section {
                    TextField("裝置代碼或裝置登入網址", text: $code)
                        .textInputAutocapitalization(.characters).autocorrectionDisabled()
                        .privacySensitive().accessibilityIdentifier("device.code")
                        .onChange(of: code) { _, _ in inspection = nil }
                    Button("查看登入要求") { inspect() }
                        .disabled(code.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                } footer: {
                    Text("只輸入您正在使用的裝置所顯示的代碼。請先確認裝置與用戶端，再批准登入。")
                }
                if let inspection {
                    Section("請確認此要求") {
                        LabeledContent("用戶端", value: inspection.clientName)
                        LabeledContent("裝置代碼", value: inspection.userCode)
                        LabeledContent(
                            "到期時間",
                            value: NativeDisplayFormatting.timestamp(
                                inspection.expiresAt, locale: locale))
                        Button("批准此裝置登入") { confirmApproval = true }
                    }
                }
            }
            if busy { ProgressView("正在處理…") }
        }
        .disabled(busy || session.client?.auth.isSession != true)
        .navigationTitle("裝置登入")
        .navigationBarBackButtonHidden(busy)
        .interactiveDismissDisabled(busy)
        .confirmationDialog("批准此裝置存取帳號？", isPresented: $confirmApproval, titleVisibility: .visible)
        {
            Button("批准登入") { approve() }
            Button("取消", role: .cancel) {}
        } message: {
            Text("只有您正在操作的用戶端「\(inspection?.clientName ?? "")」才應獲得授權。")
        }
        .task { if !code.isEmpty && inspection == nil && !approved { inspect() } }
        .onDisappear { operation?.cancel() }
    }

    private func run(_ action: @escaping @MainActor (OtterClient, UUID) async throws -> Void) {
        guard !busy, let client = session.client, client.auth.isSession else { return }
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

    private func inspect() {
        guard let client = session.client else { return }
        var submitted = code.trimmingCharacters(in: .whitespacesAndNewlines)
        if submitted.contains("/") {
            guard let components = URLComponents(string: submitted), components.path == "/device",
                components.host == nil
                    || (components.scheme == client.baseURL.scheme
                        && components.host == client.baseURL.host),
                let value = components.queryItems?.first(where: { $0.name == "code" })?.value
            else {
                message = NativeLocalization.string("請輸入此伺服器的裝置登入網址或裝置代碼。")
                return
            }
            submitted = value
        }
        submitted = submitted.uppercased().replacingOccurrences(of: " ", with: "")
        guard submitted.range(of: "^[A-Z2-9]{4}-?[A-Z2-9]{4}$", options: .regularExpression) != nil
        else {
            message = NativeLocalization.string("請輸入有效的 8 位裝置代碼。")
            return
        }
        inspection = nil
        let submittedCode = submitted
        run { client, generation in
            let result = try await client.inspectDevice(code: submittedCode)
            try Task.checkCancellation()
            guard session.sessionID == generation else { return }
            inspection = result
        }
    }

    private func approve() {
        guard let inspected = inspection else { return }
        run { client, generation in
            try await client.approveDevice(code: inspected.userCode)
            try Task.checkCancellation()
            guard session.sessionID == generation else { return }
            approved = true
            inspection = nil
            code = ""
        }
    }
}
