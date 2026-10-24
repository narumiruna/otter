import Observation
import OtterKit
import SwiftUI
import UIKit

/// Kept by the account sheet, including when navigation returns to the account screen.
@MainActor @Observable
final class AccountTokenDraft {
    var name = ""
    var pending: CreateApiTokenRequest?
    var pendingUncertain = false
    var secret: String?
    var busy = false
    var mustKeepOpen: Bool { pending != nil || secret != nil || busy }
    var validName: Bool {
        let value = WebText.trim(name)
        return !value.isEmpty && value.utf16.count <= 80
    }
}

@MainActor
struct TokenSettingsView: View {
    @Environment(AppSession.self) private var session
    @Environment(\.locale) private var locale
    @State var draft: AccountTokenDraft
    @State private var tokens: [ApiToken] = []
    @State private var loaded = false
    @State private var message: String?
    @State private var revocation: ApiToken?
    @State private var operation: Task<Void, Never>?

    init(draft: AccountTokenDraft) { _draft = State(initialValue: draft) }

    var body: some View {
        @Bindable var draft = draft
        Form {
            if let message { Section { Text(message).foregroundStyle(.red) } }
            if let secret = draft.secret {
                Section {
                    Text(secret).font(.body.monospaced()).textSelection(.enabled).privacySensitive()
                    Button("複製 token") {
                        UIPasteboard.general.setItems(
                            [[UIPasteboard.typeAutomatic: secret]],
                            options: [
                                .localOnly: true, .expirationDate: Date().addingTimeInterval(120),
                            ])
                    }
                    ShareLink("分享 token", item: secret)
                    Button("已保存，關閉密鑰") { draft.secret = nil }
                } header: {
                    Text("請立即保存 token")
                } footer: {
                    Text("密鑰只顯示這一次。關閉後不能再次查看。請勿分享給不信任的人。剪貼簿副本會在 2 分鐘後到期。")
                }
            }
            if draft.pending != nil {
                Section {
                    Text("建立結果尚未確認。請重新查詢，或重試同一個要求。App 不會產生第二組密鑰。")
                    Button("查詢建立結果") { reconcile() }
                    Button("重試同一個建立要求") { create() }
                }
            } else if draft.secret == nil {
                Section {
                    TextField("Token 名稱", text: $draft.name)
                        .accessibilityIdentifier("tokens.name")
                    Button("建立 API token") { create() }
                        .disabled(!draft.validName)
                } header: {
                    Text("新增 token")
                } footer: {
                    Text("名稱最多 80 個字。Token 在建立後 90 天到期。")
                }
            }
            Section("有效的 token") {
                if loaded && tokens.isEmpty { Text("沒有有效的 token。") }
                ForEach(tokens) { token in
                    VStack(alignment: .leading, spacing: 6) {
                        Text(token.name).font(.headline)
                        Text(
                            NativeLocalization.string(
                                "native.tokenSettingsView.createdAt",
                                defaultValue:
                                    "建立時間：\(NativeDisplayFormatting.timestamp(token.createdAt, locale: locale))",
                                locale: locale)
                        ).font(.caption)
                        Text(
                            "到期時間：\(NativeDisplayFormatting.timestamp(token.expiresAt, locale: locale))"
                        ).font(.caption)
                        Button("撤銷 token", role: .destructive) { revocation = token }
                            .disabled(draft.pending != nil)
                    }
                }
                Button("重新載入") { reconcile() }
            }
            if draft.busy { ProgressView("正在處理…") }
        }
        .disabled(draft.busy || session.client?.auth.isSession != true)
        .navigationTitle("web.apiTokens")
        .navigationBarBackButtonHidden(draft.mustKeepOpen)
        .interactiveDismissDisabled(draft.mustKeepOpen)
        .confirmationDialog(
            "撤銷此 token？",
            isPresented: Binding(
                get: { revocation != nil }, set: { if !$0 { revocation = nil } }
            ), titleVisibility: .visible
        ) {
            if let token = revocation {
                Button("撤銷", role: .destructive) { revoke(token) }
            }
            Button("取消", role: .cancel) { revocation = nil }
        } message: {
            Text("使用此 token 的裝置將無法繼續存取帳號。此操作不能復原。")
        }
        .task { if !loaded { reconcile() } }
        .onDisappear { operation?.cancel() }
    }

    private func run(_ action: @escaping @MainActor (OtterClient, UUID) async throws -> Void) {
        guard !draft.busy, let client = session.client, client.auth.isSession else { return }
        let generation = session.sessionID
        draft.busy = true
        message = nil
        operation = Task { @MainActor in
            defer { if session.sessionID == generation { draft.busy = false } }
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

    private func create() {
        guard !draft.busy, session.client?.auth.isSession == true else { return }
        if draft.pending == nil {
            guard draft.validName else { return }
            draft.pendingUncertain = false
            do { draft.pending = try CreateApiTokenRequest(name: draft.name) } catch {
                message = NativeLocalization.string("無法安全產生 token。請稍後再試。")
                return
            }
        }
        guard let request = draft.pending else { return }
        run { client, generation in
            do {
                let response = try await client.createToken(request)
                try Task.checkCancellation()
                guard session.sessionID == generation else { return }
                guard response.token.id == request.id, response.accessToken == request.accessToken
                else {
                    throw APIError.invalidResponse
                }
                accept(request, token: response.token)
            } catch {
                guard session.sessionID == generation else { return }
                if let response = error as? APIResponseError,
                    [400, 401, 403, 409, 422, 429].contains(response.status),
                    !draft.pendingUncertain
                {
                    draft.pending = nil
                } else {
                    draft.pendingUncertain = true
                }
                // A rejected retry cannot prove that an earlier uncertain attempt failed.
                // Keep its exact ID and secret until a successful response or list reconciliation.
                throw error
            }
        }
    }

    private func reconcile() {
        run { client, generation in
            let result = try await client.tokens()
            try Task.checkCancellation()
            guard session.sessionID == generation else { return }
            tokens = result.tokens
            loaded = true
            if let pending = draft.pending {
                if let token = tokens.first(where: { $0.id == pending.id }) {
                    accept(pending, token: token)
                } else {
                    message = NativeLocalization.string("列表尚未包含此要求。可重試同一個建立要求；不會產生新的密鑰。")
                }
            }
        }
    }

    private func accept(_ request: CreateApiTokenRequest, token: ApiToken) {
        draft.secret = request.accessToken
        draft.pending = nil
        draft.pendingUncertain = false
        draft.name = ""
        tokens.removeAll { $0.id == token.id }
        tokens.insert(token, at: 0)
        loaded = true
        message = nil
    }

    private func revoke(_ token: ApiToken) {
        revocation = nil
        run { client, generation in
            try await client.revokeToken(id: token.id)
            try Task.checkCancellation()
            guard session.sessionID == generation else { return }
            tokens.removeAll { $0.id == token.id }
            message = NativeLocalization.string("已撤銷 token。")
        }
    }
}
