import Foundation
import Observation
import OtterKit

@MainActor
@Observable
final class AISettingsState {
    enum Issue { case load, login, save, disconnect, expired, rateLimited, unavailable }
    enum Notice { case saved, connected, disconnected, cancelled }

    var catalog: AICatalogResponse?
    var connections: [AIConnection] = []
    var saved: AISettings?
    var draft = AISettings(provider: "", model: "", thinkingLevel: .off)
    var login: AILoginState?
    var input = ""
    var connectionProvider = ""
    var connectionMethod: AIAuthMethod = .oauth
    var loading = false
    var busy = false
    var loaded = false
    var loadFailed = false
    var issue: Issue?
    var notice: Notice?

    private weak var session: AppSession?
    private var owner: UUID?
    private var visible = false
    private var active = false
    private var pollTask: Task<Void, Never>?
    private var pollGeneration = UUID()

    private struct Context {
        let client: OtterClient
        let sessionID: UUID
    }

    var pending: Bool { login?.status == .pending }
    var provider: AIProviderOption? { catalog?.providers.first { $0.id == draft.provider } }
    var model: AIModelOption? { provider?.models.first { $0.id == draft.model } }
    var validDraft: Bool {
        connections.contains { $0.provider == draft.provider }
            && model?.thinkingLevels.contains(draft.thinkingLevel) == true
    }
    var canSave: Bool {
        loaded && !loadFailed && !busy && !loading && !pending && validDraft && saved != draft
    }
    var canRespond: Bool {
        guard !busy, !loading, pending, let prompt = login?.prompt,
            input.utf16.count <= 16_384, !input.contains("\u{0000}")
        else { return false }
        switch prompt {
        case .text: return true  // The server can permit an empty domain response.
        case .secret, .manualCode:
            return !WebText.trim(input).isEmpty
        case .select(let prompt): return prompt.options.contains { $0.id == input }
        }
    }
    var canConnect: Bool {
        loaded && !loadFailed && !busy && !loading && !pending
            && catalog?.authenticationEnabled == true
            && catalog?.providers.contains {
                $0.id == connectionProvider && $0.authMethods.contains(connectionMethod)
            } == true
    }

    func activate(session: AppSession, active: Bool) async {
        if owner != session.sessionID {
            stopPolling()
            owner = session.sessionID
            catalog = nil
            connections = []
            saved = nil
            draft = AISettings(provider: "", model: "", thinkingLevel: .off)
            login = nil
            input = ""
            loaded = false
            loadFailed = false
            loading = false
            busy = false
            issue = nil
            notice = nil
        }
        self.session = session
        visible = true
        self.active = active
        guard let context = context() else { return }
        if !busy && !loading { await refresh(context, initial: !loaded) }
        startPolling()
    }

    func setActive(_ value: Bool) {
        active = value
        if value {
            startPolling()
        } else {
            input = ""
            stopPolling()
        }
    }

    func leave() {
        visible = false
        input = ""
        stopPolling()
        // Use only the original session. Never cancel a login under a new account.
        guard let context = context(), let login, login.status == .pending else { return }
        Task {
            guard current(context) else { return }
            _ = try? await context.client.cancelAILogin(id: login.id)
            // Cancellation may race a committed credential. Refresh on the next appearance.
        }
    }

    func reload() async {
        guard !busy, !loading, let context = context() else { return }
        stopPolling()
        issue = nil
        await refresh(context, initial: !loaded)
        startPolling()
    }

    func selectProvider(_ id: String) {
        draft.provider = id
        draft.model = ""
        draft.thinkingLevel = .off
        notice = nil
    }

    func selectModel(_ id: String) {
        draft.model = id
        if let levels = model?.thinkingLevels, !levels.contains(draft.thinkingLevel) {
            draft.thinkingLevel = levels.first ?? .off
        }
        notice = nil
    }

    func save() async {
        guard canSave, let context = begin() else { return }
        defer { end(context) }
        let selection = draft
        do {
            let response = try await context.client.saveAISettings(selection)
            guard current(context) else { return }
            saved = response.settings
            notice = .saved
        } catch { report(error, context, fallback: .save) }
    }

    func connect() async {
        guard canConnect, let context = begin() else { return }
        defer { end(context) }
        do {
            let response = try await context.client.startAILogin(
                provider: connectionProvider, method: connectionMethod)
            guard current(context) else { return }
            if !visible {
                _ = try? await context.client.cancelAILogin(id: response.login.id)
                return
            }
            await accept(response.login, context)
        } catch {
            report(error, context, fallback: .login)
            await refresh(context)
        }
    }

    func respond() async {
        guard canRespond, let login, let prompt = login.prompt,
            let context = begin()
        else { return }
        let value = input
        input = ""
        defer { end(context) }
        do {
            let response = try await context.client.respondToAILogin(
                id: login.id, promptID: prompt.id, value: value)
            guard current(context) else { return }
            await accept(response.login, context)
        } catch {
            report(error, context, fallback: .login)
            // An obsolete prompt or a lost response can mean login already completed.
            await recoverLogin(login.id, context)
        }
    }

    func cancel() async {
        guard let login, let context = begin() else { return }
        input = ""
        defer { end(context) }
        do {
            try await context.client.cancelAILogin(id: login.id)
            guard current(context) else { return }
            self.login = nil
            notice = .cancelled
        } catch {
            guard current(context) else { return }
            if (error as? APIResponseError)?.status == 404 {
                self.login = nil
            } else {
                report(error, context, fallback: .login)
            }
        }
        // A cancel is not a revocation. Read the database even after an uncertain result.
        await refresh(context)
    }

    func disconnect(_ provider: String) async {
        guard !pending, let context = begin() else { return }
        defer { end(context) }
        do {
            try await context.client.disconnectAIProvider(provider)
            guard current(context) else { return }
            notice = .disconnected
        } catch { report(error, context, fallback: .disconnect) }
        // The server also removes selected settings in this transaction.
        await refresh(context)
    }

    private func context() -> Context? {
        guard let session, session.sessionID == owner, let client = session.client,
            client.auth.isSession
        else { return nil }
        return Context(client: client, sessionID: session.sessionID)
    }

    private func current(_ context: Context) -> Bool {
        session?.sessionID == context.sessionID && owner == context.sessionID
    }

    private func begin() -> Context? {
        guard !busy, !loading, visible, active, let context = context() else { return nil }
        busy = true
        issue = nil
        notice = nil
        stopPolling()
        return context
    }

    private func end(_ context: Context) {
        guard current(context) else { return }
        busy = false
        startPolling()
    }

    private func refresh(_ context: Context, initial: Bool = false) async {
        guard current(context) else { return }
        loading = true
        defer { if current(context) { loading = false } }
        do {
            async let options = context.client.aiCatalog()
            async let preferences = context.client.aiSettings()
            async let linked = context.client.aiConnections()
            let (catalog, settings, connections) = try await (options, preferences, linked)
            try Task.checkCancellation()
            guard current(context) else { return }
            self.catalog = catalog
            self.connections = connections.connections
            saved = settings.settings
            if initial {
                draft =
                    settings.settings ?? AISettings(provider: "", model: "", thinkingLevel: .off)
            }
            loaded = true
            loadFailed = false
        } catch {
            if current(context), !(error is CancellationError),
                (error as? URLError)?.code != .cancelled
            {
                loadFailed = true
            }
            report(error, context, fallback: .load)
        }
    }

    private func accept(_ next: AILoginState, _ context: Context) async {
        guard current(context) else { return }
        if next.prompt?.id != login?.prompt?.id || next.status != .pending { input = "" }
        login = next
        switch next.status {
        case .pending: issue = nil
        case .complete:
            issue = nil
            notice = .connected
            await refresh(context)
        case .error:
            issue = .login
            await refresh(context)
        }
    }

    private func recoverLogin(_ id: String, _ context: Context) async {
        guard current(context) else { return }
        do {
            let response = try await context.client.aiLogin(id: id)
            try Task.checkCancellation()
            guard current(context) else { return }
            await accept(response.login, context)
        } catch {
            report(error, context, fallback: .login)
            if (error as? APIResponseError)?.status == 404, current(context) {
                login = nil
                input = ""
                issue = .expired
                await refresh(context)
            }
        }
    }

    private func startPolling() {
        guard pollTask == nil, visible, active, !busy, !loading, pending,
            let context = context()
        else { return }
        let generation = UUID()
        pollGeneration = generation
        pollTask = Task { [weak self] in
            guard let self else { return }
            while !Task.isCancelled, self.current(context), self.visible, self.active,
                self.pollGeneration == generation, let login = self.login, login.status == .pending
            {
                await self.recoverLogin(login.id, context)
                guard !Task.isCancelled else { break }
                do { try await Task.sleep(for: .seconds(self.issue == nil ? 1 : 3)) } catch {
                    break
                }
            }
            if self.pollGeneration == generation { self.pollTask = nil }
        }
    }

    private func stopPolling() {
        pollGeneration = UUID()
        pollTask?.cancel()
        pollTask = nil
    }

    private func report(_ error: Error, _ context: Context, fallback: Issue) {
        guard current(context), !(error is CancellationError),
            (error as? URLError)?.code != .cancelled
        else { return }
        // Do not display SDK data, submitted secrets, or redirect input in diagnostics.
        if case APIError.unauthorized = error {
            input = ""
            stopPolling()
            session?.handle(error, for: context.sessionID)
            return
        }
        switch (error as? APIResponseError)?.status {
        case 429: issue = .rateLimited
        case 503: issue = .unavailable
        default: issue = fallback
        }
    }
}
