import Foundation
import Observation

@MainActor
@Observable
public final class AppSession {
    public private(set) var client: OtterClient?
    public private(set) var user: User?
    public private(set) var sessionID = UUID()
    public private(set) var isRestoring = true
    public private(set) var isSigningIn = false
    public var errorMessage: String?
    private let store: any CredentialStore
    private let makeClient: (String, String) throws -> OtterClient
    private let makeSessionClient: (String, ClientAuthentication) throws -> OtterClient

    public convenience init() {
        self.init(store: SessionStore(), makeClient: { try OtterClient(server: $0, token: $1) })
    }
    init(
        store: any CredentialStore, makeClient: @escaping (String, String) throws -> OtterClient,
        makeSessionClient: @escaping (String, ClientAuthentication) throws -> OtterClient = {
            try OtterClient(server: $0, auth: $1)
        }
    ) {
        self.store = store
        self.makeClient = makeClient
        self.makeSessionClient = makeSessionClient
    }

    /// A share workspace cannot read or change the stored account.
    public convenience init(ephemeralClient: OtterClient) throws {
        switch ephemeralClient.auth {
        case .anonymous, .share: break
        case .bearer, .session: throw APIError.sessionRequired
        }
        self.init(
            store: EphemeralCredentialStore(),
            makeClient: { _, _ in throw APIError.sessionRequired },
            makeSessionClient: { _, _ in throw APIError.sessionRequired })
        client = ephemeralClient
        isRestoring = false
    }

    public func restore() async {
        guard isRestoring else { return }
        let requestSessionID = sessionID
        defer { isRestoring = false }
        do {
            guard let saved = try store.load() else { return }
            let candidate: OtterClient
            if case .bearer(let token) = saved.auth {
                candidate = try makeClient(saved.server, token)
            } else {
                candidate = try makeSessionClient(saved.server, saved.auth)
            }
            client = candidate
            user = saved.user
            let restoredUser = try await candidate.user()
            guard sessionID == requestSessionID else { return }
            try store.save(
                SavedSession(
                    server: candidate.baseURL.absoluteString, auth: candidate.auth,
                    user: restoredUser))
            user = restoredUser
        } catch { handle(error, for: requestSessionID) }
    }

    public func signIn(server: String, token: String) async {
        guard !isSigningIn else { return }
        let requestSessionID = sessionID
        isSigningIn = true
        defer { isSigningIn = false }
        do {
            let candidate = try makeClient(server, token)
            let user = try await candidate.user()
            try Task.checkCancellation()
            try acceptLogin(
                AuthenticatedLogin(client: candidate, user: user), for: requestSessionID)
        } catch { handle(error, for: requestSessionID) }
    }

    public func signIn(
        server: String, username: String, password: String, register: Bool = false,
        challengeID: String? = nil
    ) async {
        guard !isSigningIn else { return }
        let generation = sessionID
        isSigningIn = true
        defer { isSigningIn = false }
        do {
            let anonymous = try makeSessionClient(server, .anonymous)
            let login = try await anonymous.passwordLogin(
                username: username, password: password, register: register, challengeID: challengeID
            )
            try Task.checkCancellation()
            try acceptLogin(login, for: generation)
        } catch { handle(error, for: generation) }
    }

    public func acceptLogin(_ login: AuthenticatedLogin, for generation: UUID) throws {
        guard sessionID == generation else { throw CancellationError() }
        try store.save(
            SavedSession(
                server: login.client.baseURL.absoluteString, auth: login.client.auth,
                user: login.user))
        user = login.user
        client = login.client
        errorMessage = nil
        sessionID = UUID()
    }

    public func refreshUser() async throws {
        guard let client else { throw APIError.unauthorized }
        let generation = sessionID
        let value = try await client.user()
        guard generation == sessionID else { throw CancellationError() }
        try store.save(
            SavedSession(server: client.baseURL.absoluteString, auth: client.auth, user: value))
        user = value
    }

    public func signOut() async {
        guard !isSigningIn else { return }
        let generation = sessionID
        isSigningIn = true
        defer { isSigningIn = false }
        do {
            if let client, client.auth.isSession {
                do { try await client.logout() } catch APIError.unauthorized {
                    // An expired server session is already invalid.
                }
            }
            guard generation == sessionID else { return }
            try store.delete()
            client = nil
            user = nil
            sessionID = UUID()
            errorMessage = nil
        } catch { handle(error, for: generation) }
    }

    public func handle(_ error: Error, for requestSessionID: UUID) {
        guard sessionID == requestSessionID else { return }
        if error is CancellationError || (error as? URLError)?.code == .cancelled { return }
        if case APIError.unauthorized = error {
            client = nil
            user = nil
            sessionID = UUID()
            do { try store.delete() } catch {
                errorMessage = error.localizedDescription
                return
            }
        }
        errorMessage = error.localizedDescription
    }
}

private struct EphemeralCredentialStore: CredentialStore {
    func load() throws -> SavedSession? { nil }
    func save(_ value: SavedSession) throws {
        // Reject direct acceptLogin calls as well as the disabled login factories.
        switch value.auth {
        case .anonymous, .share: break
        case .bearer, .session: throw APIError.sessionRequired
        }
    }
    func delete() throws {}
}
