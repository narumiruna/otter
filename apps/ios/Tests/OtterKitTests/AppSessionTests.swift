import Foundation
import Testing

@testable import OtterKit

@MainActor
private final class MemoryCredentials: CredentialStore {
    var value: SavedSession?
    var failDelete = false

    func load() throws -> SavedSession? { value }
    func save(_ value: SavedSession) throws { self.value = value }
    func delete() throws {
        if failDelete { throw CocoaError(.fileWriteNoPermission) }
        value = nil
    }
}

private struct UserTransport: HTTPTransport {
    var status = 200
    var offline = false

    func data(for request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        if offline { throw URLError(.notConnectedToInternet) }
        let body = #"{"user":{"id":"u_1","name":"Alice","username":"alice"}}"#
        return (
            Data(body.utf8),
            HTTPURLResponse(
                url: request.url!, statusCode: status, httpVersion: "HTTP/1.1", headerFields: nil)!
        )
    }
}

private actor DelayedUnauthorizedTransport: HTTPTransport {
    private var continuation: CheckedContinuation<Void, Never>?
    private var released = false

    func data(for request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        if request.url?.path == "/api/me" { return try await UserTransport().data(for: request) }
        if !released {
            await withCheckedContinuation { continuation = $0 }
        }
        return (
            Data(#"{"error":"Expired token"}"#.utf8),
            HTTPURLResponse(
                url: request.url!, statusCode: 401, httpVersion: "HTTP/1.1", headerFields: nil)!
        )
    }

    func release() {
        released = true
        continuation?.resume()
        continuation = nil
    }
}

@MainActor
struct AppSessionTests {
    private func session(
        store: MemoryCredentials, transport: any HTTPTransport = UserTransport()
    ) -> AppSession {
        AppSession(store: store) { server, token in
            try OtterClient(server: server, token: token, transport: transport)
        }
    }

    @Test func signInPersistsValidatedCredentialsAndSignOutDeletesThem() async {
        let store = MemoryCredentials()
        let session = session(store: store)
        await session.signIn(server: "https://otter.example", token: "otter_api_first")
        #expect(session.client != nil)
        #expect(store.value?.token == "otter_api_first")
        #expect(!session.isSigningIn)
        await session.signOut()
        #expect(session.client == nil)
        #expect(store.value == nil)
    }

    @Test func invalidSignInDoesNotSaveCredentials() async {
        let store = MemoryCredentials()
        let session = session(store: store, transport: UserTransport(status: 401))
        await session.signIn(server: "https://otter.example", token: "otter_api_invalid")
        #expect(session.client == nil)
        #expect(store.value == nil)
        #expect(session.errorMessage != nil)
    }

    @Test func offlineRestoreKeepsCredentials() async {
        let store = MemoryCredentials()
        store.value = SavedSession(server: "https://otter.example", token: "otter_api_saved")
        let session = session(store: store, transport: UserTransport(offline: true))
        await session.restore()
        #expect(session.client != nil)
        #expect(store.value?.token == "otter_api_saved")
        #expect(!session.isRestoring)
        #expect(session.errorMessage != nil)
    }

    @Test func expiredRestoreRemovesCredentials() async {
        let store = MemoryCredentials()
        store.value = SavedSession(server: "https://otter.example", token: "otter_api_expired")
        let session = session(store: store, transport: UserTransport(status: 401))
        await session.restore()
        #expect(session.client == nil)
        #expect(store.value == nil)
        #expect(!session.isRestoring)
    }

    @Test func delayed401CannotDeleteANewSession() async throws {
        let store = MemoryCredentials()
        let transport = DelayedUnauthorizedTransport()
        let session = session(store: store, transport: transport)
        await session.signIn(server: "https://otter.example", token: "otter_api_first")
        let previousSessionID = session.sessionID
        let oldClient = try #require(session.client)
        let oldRequest = Task {
            do { _ = try await oldClient.trips() } catch {
                session.handle(error, for: previousSessionID)
            }
        }

        await session.signOut()
        await session.signIn(server: "https://otter.example", token: "otter_api_second")
        let newSessionID = session.sessionID
        await transport.release()
        await oldRequest.value

        #expect(session.client != nil)
        #expect(session.sessionID == newSessionID)
        #expect(store.value?.token == "otter_api_second")
        #expect(session.errorMessage == nil)
    }

    @Test func current401ClearsCredentialsButCancellationDoesNot() async {
        let store = MemoryCredentials()
        let session = session(store: store)
        await session.signIn(server: "https://otter.example", token: "otter_api_first")
        session.handle(URLError(.cancelled), for: session.sessionID)
        #expect(session.client != nil)
        #expect(session.errorMessage == nil)
        session.handle(APIError.unauthorized, for: session.sessionID)
        #expect(session.client == nil)
        #expect(store.value == nil)
    }

    @Test func failedCredentialDeletionDoesNotPretendToSignOut() async {
        let store = MemoryCredentials()
        let session = session(store: store)
        await session.signIn(server: "https://otter.example", token: "otter_api_first")
        store.failDelete = true
        await session.signOut()
        #expect(session.client != nil)
        #expect(store.value != nil)
        #expect(session.errorMessage != nil)
    }
}
