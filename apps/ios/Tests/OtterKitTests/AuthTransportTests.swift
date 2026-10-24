import Foundation
import Testing

@testable import OtterKit

private actor AuthTransport: HTTPTransport {
    struct Reply: Sendable {
        let status: Int
        let body: String
        var headers: [String: String] = [:]
    }
    var replies: [Reply]
    private(set) var requests: [URLRequest] = []
    init(_ replies: [Reply]) { self.replies = replies }
    func data(for request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        requests.append(request)
        guard !replies.isEmpty else { throw URLError(.badServerResponse) }
        let reply = replies.removeFirst()
        return (
            Data(reply.body.utf8),
            HTTPURLResponse(
                url: request.url!, statusCode: reply.status, httpVersion: "HTTP/1.1",
                headerFields: reply.headers)!
        )
    }
}
private let authUserJSON = #"{"user":{"id":"user_alice","username":"alice","name":"Alice"}}"#

struct AuthTransportTests {
    @Test func passwordRegistrationUsesCookieAndNeverPersistsPasswordInClient() async throws {
        let transport = AuthTransport([
            .init(
                status: 201, body: authUserJSON,
                headers: [
                    "Set-Cookie":
                        "otter_session=session_123; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800; Secure"
                ]),
            .init(status: 200, body: "{\"tokens\":[]}"),
            .init(status: 200, body: "{\"ok\":true}"),
        ])
        let anonymous = try OtterClient(
            server: "https://otter.example", auth: .anonymous, transport: transport)
        let result = try await anonymous.passwordLogin(
            username: "  ALICE  ", password: "test-password-only", register: true)
        #expect(result.client.auth.isSession)
        #expect(result.user.id == "user_alice")
        _ = try await result.client.tokens()
        try await result.client.logout()
        let requests = await transport.requests
        #expect(requests[0].url?.path == "/api/auth/register")
        let first = try JSONDecoder().decode(
            [String: String].self, from: #require(requests[0].httpBody))
        #expect(first["username"] == "alice")
        #expect(requests[0].value(forHTTPHeaderField: "Cookie") == nil)
        #expect(requests[1].value(forHTTPHeaderField: "Cookie") == "otter_session=session_123")
        #expect(requests.allSatisfy { $0.value(forHTTPHeaderField: "Authorization") == nil })
        #expect(requests[2].url?.path == "/api/auth/logout")
        #expect(requests[2].value(forHTTPHeaderField: "Content-Type") == "application/json")
        let stored = try JSONEncoder().encode(result.client.auth)
        #expect(!String(decoding: stored, as: UTF8.self).contains("test-password-only"))
    }

    @Test(arguments: ["evil.example", ".evil.example"])
    func cookieDomainCannotMoveSessionToAnotherOrigin(_ domain: String) async throws {
        let transport = AuthTransport([
            .init(
                status: 200, body: authUserJSON,
                headers: ["Set-Cookie": "otter_session=value; Domain=\(domain); Path=/; Secure"])
        ])
        let client = try OtterClient(server: "https://otter.example", transport: transport)
        await #expect(throws: APIError.self) {
            try await client.passwordLogin(username: "alice", password: "test-only")
        }
    }

    @Test func expiredCookieNeverSendsRequest() async throws {
        let transport = AuthTransport([])
        let client = try OtterClient(
            server: "https://otter.example",
            auth: .session(SessionCookie(value: "expired", expiresAt: .distantPast)),
            transport: transport)
        await #expect(throws: APIError.self) { try await client.user() }
        #expect(await transport.requests.isEmpty)
    }

    @Test func secureCookieCannotBeRestoredOnHTTP() {
        #expect(throws: APIError.self) {
            try OtterClient(
                server: "http://localhost:17463", auth: .session(SessionCookie(value: "secure")))
        }
    }

    @Test func shareCredentialHasOnlyOneTripAndNoOtherCredential() async throws {
        let transport = AuthTransport([.init(status: 200, body: "{\"ok\":true}")])
        let client = try OtterClient(
            server: "https://otter.example",
            auth: .share(tripID: "trip_1", token: String(repeating: "a", count: 43)),
            transport: transport)
        let _: OkResponse = try await client.api("GET", path: "/api/trips/trip_1")
        for path in ["api/me", "api/auth/ai/catalog", "api/trips/trip_2", "api/trips/trip_10"] {
            do {
                let _: OkResponse = try await client.api("GET", path: path)
                Issue.record("Share escaped trip scope")
            } catch APIError.unauthorized {}
        }
        let requests = await transport.requests
        #expect(requests.count == 1)
        #expect(
            requests[0].value(forHTTPHeaderField: "X-Otter-Share-Token")
                == String(repeating: "a", count: 43))
        #expect(requests[0].value(forHTTPHeaderField: "Cookie") == nil)
        #expect(requests[0].value(forHTTPHeaderField: "Authorization") == nil)
    }

    @Test(arguments: [
        "https://evil.example/api/me", "//evil.example/api/me", "api/trips/../me",
        "api/trips/%2e%2e/me", "api/me#fragment", "api\\me",
    ])
    func requestPathCannotEscapeOrigin(_ path: String) async throws {
        let transport = AuthTransport([])
        let client = try OtterClient(
            server: "https://otter.example", token: "otter_api_test", transport: transport)
        await #expect(throws: APIError.self) {
            let _: OkResponse = try await client.api("GET", path: path)
        }
        #expect(await transport.requests.isEmpty)
    }

    @Test(arguments: ["Authorization", "Cookie", "X-Otter-Share-Token", "Host", "Origin"])
    func extraHeadersCannotMixCredentials(_ name: String) async throws {
        let transport = AuthTransport([])
        let client = try OtterClient(
            server: "https://otter.example", token: "otter_api_test", transport: transport)
        await #expect(throws: APIError.self) {
            let _: OkResponse = try await client.api(
                "GET", path: "api/me", headers: [name: "other"])
        }
        #expect(await transport.requests.isEmpty)
    }

    @Test func preservesServerErrorCodeAndRetryAfter() async throws {
        let transport = AuthTransport([
            .init(
                status: 429, body: #"{"error":"Slow down","code":"LIMIT"}"#,
                headers: ["Retry-After": "12"])
        ])
        let client = try OtterClient(server: "https://otter.example", transport: transport)
        do {
            _ = try await client.user()
            Issue.record("Expected rate limit")
        } catch let error as APIResponseError {
            #expect(error.status == 429)
            #expect(error.code == "LIMIT")
            #expect(error.retryAfter == 12)
        }
        #expect(await transport.requests.count == 1)
    }

    @Test func clearingCustomRatesUsesAnEmptyObjectNotNull() throws {
        let data = try JSONEncoder().encode(TripPatch(clearExchangeRates: true))
        let value = try JSONDecoder().decode([String: JSONValue].self, from: data)
        #expect(value["exchangeRates"] == .object([:]))
    }

    @Test func legacyKeychainPayloadMigratesWithoutLosingToken() throws {
        let saved = try JSONDecoder().decode(
            SavedSession.self,
            from: Data(#"{"server":"https://otter.example","token":"otter_api_legacy"}"#.utf8))
        #expect(saved.auth == .bearer("otter_api_legacy"))
        let reloaded = try JSONDecoder().decode(
            SavedSession.self, from: JSONEncoder().encode(saved))
        #expect(reloaded.auth == saved.auth)
        #expect(reloaded.server == saved.server)
    }

    @Test func loginTrimsOnlyBusinessUsernameAndPreservesRawPassword() async throws {
        for (username, expected) in [
            ("\u{FEFF} ALICE \u{FEFF}", "alice"),
            ("\u{0085}ALICE\u{200B}", "\u{0085}alice\u{200B}"),
        ] {
            let transport = AuthTransport([
                .init(
                    status: 200, body: authUserJSON,
                    headers: ["Set-Cookie": "otter_session=synthetic; Path=/; Secure"])
            ])
            let client = try OtterClient(server: "https://otter.example", transport: transport)
            let password = " \u{FEFF}Jose\u{0301}\u{0085}\u{200B} "
            _ = try await client.passwordLogin(username: username, password: password)
            let requests = await transport.requests
            let body = try JSONDecoder().decode(
                [String: String].self, from: #require(requests.first?.httpBody))
            #expect(Array(try #require(body["username"]).utf16) == Array(expected.utf16))
            #expect(Array(try #require(body["password"]).utf16) == Array(password.utf16))
        }
    }

    @Test func tokenNamesUseECMAScriptTrimWithoutNormalizingSpelling() throws {
        for (input, expected) in [
            ("\u{FEFF} Test \u{FEFF}", "Test"), ("\u{FEFF}", ""),
            ("\u{200B}", "\u{200B}"), ("\u{0085}", "\u{0085}"),
            (" Jose\u{0301} ", "Jose\u{0301}"),
        ] {
            let request = try CreateApiTokenRequest(name: input)
            #expect(Array(request.name.utf16) == Array(expected.utf16))
        }
    }

    @Test func tokenRequestUsesStableIdentityAnd32RandomBytes() throws {
        let first = try CreateApiTokenRequest(name: " Test ")
        let second = try CreateApiTokenRequest(name: "Test")
        #expect(first.name == "Test")
        #expect(first.id != second.id)
        #expect(first.accessToken != second.accessToken)
        #expect(first.accessToken.hasPrefix("otter_api_"))
        let bytes = Data(base64URL: String(first.accessToken.dropFirst(10)))
        #expect(bytes?.count == 32)
        #expect(first.id.hasPrefix("token_"))
        let encoded = try JSONEncoder().encode(first)
        let retry = try JSONDecoder().decode(CreateApiTokenRequest.self, from: encoded)
        #expect(retry.id == first.id)
        #expect(retry.accessToken == first.accessToken)
    }
}

struct TripPermissionsTests {
    private func payload(
        archived: Bool = false, apiWrites: Bool = false, role: TripRole = .owner,
        readonly: Bool = false, share: ShareMode? = nil
    ) -> TripPayload {
        TripPayload(
            trip: Trip(
                id: "trip_1", ownerId: "u_1", name: "Trip", baseCurrency: .twd,
                archivedAt: archived ? "2026-10-23" : nil, allowApiWrites: apiWrites),
            currentUserRole: role, readonly: readonly, shareMode: share)
    }
    @Test func sessionOwnerDoesNotNeedAPITokenWritePermission() {
        let p = TripPermissions(
            payload: payload(), auth: .session(SessionCookie(value: "test")), userID: "u_1")
        #expect(p.allows(.editDailyData))
        #expect(p.allows(.manageAPIWrites))
        #expect(p.allows(.manageAccess))
    }
    @Test func bearerCannotUpgradeItsOwnPermissions() {
        let p = TripPermissions(payload: payload(), auth: .bearer("test"), userID: "u_1")
        #expect(p.allows(.read))
        #expect(!p.allows(.editDailyData))
        #expect(!p.allows(.manageAPIWrites))
        let enabled = TripPermissions(
            payload: payload(apiWrites: true), auth: .bearer("test"), userID: "u_1")
        #expect(enabled.allows(.editDailyData))
        #expect(!enabled.allows(.manageAccess))
    }
    @Test func archivedOwnerKeepsLifecycleAndAccessControls() {
        let p = TripPermissions(
            payload: payload(archived: true), auth: .session(SessionCookie(value: "test")),
            userID: "u_1")
        for op in [
            TripOperation.read, .readHistory, .manageAccess, .manageAPIWrites, .archive, .copyTrip,
            .deleteTrip, .downloadBackup,
        ] { #expect(p.allows(op)) }
        for op in [TripOperation.editDailyData, .changePreferences, .queueExpense] {
            #expect(!p.allows(op))
        }
    }
    @Test func editorHasDailyDataButNoOwnerSettingsOrBackup() {
        let p = TripPermissions(
            payload: payload(role: .editor), auth: .session(SessionCookie(value: "test")),
            userID: "u_2")
        #expect(p.allows(.editDailyData))
        for op in [
            TripOperation.manageAccess, .manageAPIWrites, .changePreferences, .archive, .copyTrip,
            .deleteTrip, .downloadBackup,
        ] { #expect(!p.allows(op)) }
    }
    @Test func guestAndReadonlyNeverBecomeAccountMembers() {
        let guest = TripPermissions(
            payload: payload(role: .editor, share: .anyoneEdit),
            auth: .share(tripID: "trip_1", token: "test"), userID: nil)
        #expect(guest.allows(.editDailyData))
        #expect(guest.allows(.readHistory))
        #expect(!guest.allows(.queueExpense))
        #expect(!guest.allows(.restoreBackup))
        let readonly = TripPermissions(
            payload: payload(readonly: true, share: .readonly), auth: .anonymous, userID: nil)
        #expect(readonly.allows(.read))
        #expect(!readonly.allows(.readHistory))
        #expect(!readonly.allows(.editDailyData))
    }
}
