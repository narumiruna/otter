import OtterKit
import SwiftUI
import UIKit

struct AccessSettingsView: View {
    let payload: TripPayload
    let onPayload: @MainActor (TripPayload) -> Void
    @Environment(AppSession.self) private var session
    @Environment(\.locale) private var locale
    @State private var mutation = GroupManagementState()
    @State private var username = ""
    @State private var mode: ShareMode = .readonly
    @State private var confirming: AccessConfirmation?
    @State private var createdLink: AccessCreatedLink?
    @State private var copied = false
    @State private var linkWarning = false

    init(payload: TripPayload, onPayload: @MainActor @escaping (TripPayload) -> Void) {
        self.payload = payload
        self.onPayload = onPayload
    }

    private var canManage: Bool {
        guard let client = session.client else { return false }
        return TripPermissions(payload: payload, auth: client.auth, userID: session.user?.id)
            .allows(.manageAccess)
    }
    private var busy: Bool {
        mutation.busy
            || GroupManagementGate.shared.contains(
                sessionID: session.sessionID, tripID: payload.trip.id)
    }

    var body: some View {
        Form {
            Section {
                Text("帳號存取權與支出參與者不同。新增參與者不會授予帳號權限。")
                if !canManage {
                    Text("只有以帳號工作階段登入的擁有者可管理協作者與分享連結。API token 不可執行此操作。")
                }
                if payload.trip.archivedAt != nil {
                    Text("群組已封存。仍可管理存取權，但不能編輯日常資料。")
                }
                if busy { ProgressView("處理中⋯") }
                if let issue = mutation.issue { Text(verbatim: issue).foregroundStyle(.red) }
            }
            collaboratorsSection
            if canManage {
                Section("邀請編輯者") {
                    TextField("使用者名稱", text: $username)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    Text("以既有帳號的使用者名稱授予編輯者權限，不會建立支出參與者。編輯者可以修改支出與參與者，但不能執行擁有者操作。")
                        .font(.footnote)
                    Button("新增編輯者") { invite() }
                        .disabled(WebText.trim(username).isEmpty)
                }
                .disabled(busy)
                shareCreationSection
            }
            if let createdLink, createdLink.sessionID == session.sessionID, canManage {
                Section("剛建立的分享連結") {
                    Text("完整連結只在建立回應中提供。離開此頁後無法再次取得；請現在複製或分享。持有連結者可依選取模式存取資料。")
                        .font(.footnote)
                    ShareLink(item: createdLink.url) {
                        Label("分享連結", systemImage: "square.and.arrow.up")
                    }
                    Button {
                        UIPasteboard.general.setItems(
                            [[UIPasteboard.typeAutomatic: createdLink.url.absoluteString]],
                            options: [
                                .localOnly: true, .expirationDate: Date().addingTimeInterval(300),
                            ])
                        copied = true
                    } label: {
                        Label("複製連結", systemImage: "doc.on.doc")
                    }
                    if copied { Text("已複製，剪貼簿內容會在 5 分鐘後到期。").font(.footnote) }
                }
                .privacySensitive()
                .disabled(busy)
            }
            if linkWarning {
                Section {
                    Text("連結已建立，但回應未提供有效的同來源網址，因此無法分享。可撤銷此連結後重試。")
                        .foregroundStyle(.red)
                }
            }
            shareListSection
        }
        .navigationTitle("存取與分享")
        .confirmationDialog(
            "確認存取權變更？",
            isPresented: Binding(get: { confirming != nil }, set: { if !$0 { confirming = nil } }),
            titleVisibility: .visible
        ) {
            switch confirming {
            case .remove(let person):
                Button("移除 \(person.name)", role: .destructive) { remove(person) }
            case .create(let selectedMode):
                Button("建立連結") { create(selectedMode) }
            case .revoke(let link):
                Button("撤銷連結", role: .destructive) { revoke(link) }
            case nil: EmptyView()
            }
            Button("取消", role: .cancel) { confirming = nil }
        } message: {
            switch confirming {
            case .remove:
                Text("此帳號會失去協作者權限，但仍可能透過有效的分享連結存取資料。支出參與者不會被刪除。")
            case .create(let selectedMode):
                modeExplanation(selectedMode)
            case .revoke:
                Text("此連結將無法繼續使用。已透過連結加入的登入帳號不會被移除；如需取消其權限，請另行移除協作者。")
            case nil: EmptyView()
            }
        }
        .onChange(of: session.sessionID) { _, _ in reset() }
        .onChange(of: payload.trip.id) { _, _ in reset() }
        .onDisappear {
            mutation.invalidate()
            createdLink = nil
            copied = false
            confirming = nil
        }
    }

    private var collaboratorsSection: some View {
        Section("帳號角色") {
            if let collaborators = payload.collaborators {
                ForEach(collaborators) { person in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(verbatim: person.name).font(.headline)
                        Text(verbatim: "@\(person.username)").font(.subheadline)
                        if person.role == .owner || person.userId == payload.trip.ownerId {
                            Text("擁有者").foregroundStyle(.secondary)
                        } else {
                            Text("編輯者").foregroundStyle(.secondary)
                            if canManage {
                                Button("移除存取權", role: .destructive) { confirming = .remove(person) }
                                    .disabled(busy)
                            }
                        }
                    }
                }
                if collaborators.isEmpty { Text("沒有可顯示的協作者。") }
            } else {
                Text("此回應未提供帳號成員清單。")
            }
        }
    }

    private var shareCreationSection: some View {
        Section("建立分享連結") {
            Picker("分享模式", selection: $mode) {
                ForEach(ShareMode.allCases, id: \.self) { item in modeName(item).tag(item) }
            }
            modeExplanation(mode).font(.footnote)
            Text("連結包含存取憑證，請只提供給信任的人。")
                .font(.footnote).foregroundStyle(.secondary)
            Button("檢查並建立連結") { confirming = .create(mode) }
        }
        .disabled(busy)
    }

    private var shareListSection: some View {
        Section("分享連結紀錄") {
            if let links = payload.shareLinks {
                if links.isEmpty { Text("尚無分享連結。") }
                ForEach(links) { link in
                    VStack(alignment: .leading, spacing: 6) {
                        modeName(link.mode).font(.headline)
                        Text(
                            NativeLocalization.string(
                                "native.accessSettingsView.createdAt",
                                defaultValue:
                                    "建立時間：\(NativeDisplayFormatting.timestamp(link.createdAt, locale: locale))",
                                locale: locale)
                        ).font(.caption)
                        if let expiresAt = link.expiresAt {
                            Text(
                                "到期時間：\(NativeDisplayFormatting.timestamp(expiresAt, locale: locale))"
                            ).font(.caption)
                        } else {
                            Text("未設定到期時間").font(.caption)
                        }
                        if let revokedAt = link.revokedAt {
                            Text(
                                "已撤銷：\(NativeDisplayFormatting.timestamp(revokedAt, locale: locale))"
                            ).font(.caption).foregroundStyle(.secondary)
                        } else if canManage {
                            Text("未撤銷（仍受到期時間限制）").font(.caption)
                            Button("撤銷連結", role: .destructive) { confirming = .revoke(link) }
                                .disabled(busy)
                        }
                    }
                }
            } else {
                Text("此回應未提供分享連結清單。")
            }
        }
    }

    private func modeName(_ value: ShareMode) -> Text {
        switch value {
        case .readonly: Text("唯讀")
        case .signedInEdit: Text("登入後編輯")
        case .anyoneEdit: Text("任何持有連結者可編輯")
        }
    }
    private func modeExplanation(_ value: ShareMode) -> Text {
        switch value {
        case .readonly:
            Text("任何持有連結者可檢視群組，但不能修改資料。部分付款與管理資料不會公開。")
        case .signedInEdit:
            Text("持有連結者登入後會加入群組，取得編輯者權限。撤銷連結不會移除已加入的帳號。")
        case .anyoneEdit:
            Text("任何持有連結者不必登入即可修改日常資料，包括支出與參與者。不能管理存取權或執行擁有者操作。請確認您接受此風險。")
        }
    }

    private func reset() {
        mutation.invalidate()
        mutation.issue = nil
        username = ""
        createdLink = nil
        confirming = nil
        copied = false
        linkWarning = false
        mode = .readonly
    }
    private func invite() {
        let value = WebText.trim(username)
        let request = mutation.request(sessionID: session.sessionID)
        Task { @MainActor in
            await mutation.run(
                request: request, session: session, payload: payload, operation: .manageAccess
            ) { client in
                try await client.addCollaborator(tripID: payload.trip.id, username: value)
            } accept: { next in
                username = ""
                onPayload(next)
            }
        }
    }
    private func remove(_ person: TripCollaborator) {
        confirming = nil
        guard person.role != .owner, person.userId != payload.trip.ownerId else { return }
        let request = mutation.request(sessionID: session.sessionID)
        Task { @MainActor in
            await mutation.run(
                request: request, session: session, payload: payload, operation: .manageAccess
            ) { client in
                try await client.removeCollaborator(tripID: payload.trip.id, userID: person.userId)
            } accept: { next in
                onPayload(next)
            }
        }
    }
    private func create(_ selectedMode: ShareMode) {
        confirming = nil
        let previousIDs = Set((payload.shareLinks ?? []).map(\.id))
        let request = mutation.request(sessionID: session.sessionID)
        Task { @MainActor in
            await mutation.run(
                request: request, session: session, payload: payload, operation: .manageAccess
            ) { client in
                try await client.createShare(tripID: payload.trip.id, mode: selectedMode)
            } accept: { next in
                let fresh = next.shareLinks?.first {
                    !previousIDs.contains($0.id) && $0.mode == selectedMode && $0.revokedAt == nil
                        && $0.url != nil
                }
                if let fresh, let baseURL = session.client?.baseURL,
                    let url = AccessRules.shareURL(fresh.url, baseURL: baseURL)
                {
                    createdLink = AccessCreatedLink(
                        id: fresh.id, url: url, sessionID: session.sessionID)
                    linkWarning = false
                } else {
                    createdLink = nil
                    linkWarning = true
                }
                copied = false
                onPayload(next)
            }
        }
    }
    private func revoke(_ link: TripShareLink) {
        confirming = nil
        let request = mutation.request(sessionID: session.sessionID)
        Task { @MainActor in
            await mutation.run(
                request: request, session: session, payload: payload, operation: .manageAccess
            ) { client in
                try await client.revokeShare(tripID: payload.trip.id, linkID: link.id)
            } accept: { next in
                if createdLink?.id == link.id {
                    createdLink = nil
                    copied = false
                }
                onPayload(next)
            }
        }
    }
}

private enum AccessConfirmation {
    case remove(TripCollaborator)
    case create(ShareMode)
    case revoke(TripShareLink)
}
private struct AccessCreatedLink {
    let id: String
    let url: URL
    let sessionID: UUID
}
