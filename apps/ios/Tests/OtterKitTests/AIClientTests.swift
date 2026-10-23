import Foundation
import Testing

@testable import OtterKit

private actor AITransport: HTTPTransport {
    private(set) var requests: [URLRequest] = []
    let status: Int
    let body: Data

    init(status: Int = 200, body: String) {
        self.status = status
        self.body = Data(body.utf8)
    }

    func data(for request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        requests.append(request)
        return (
            body,
            HTTPURLResponse(
                url: request.url!, statusCode: status, httpVersion: "HTTP/1.1",
                headerFields: ["Retry-After": "12"])!
        )
    }
}

private let aiCatalogJSON = #"""
    {"authenticationEnabled":false,"providers":[
      {"id":"provider-a","name":"Provider A","authMethods":["oauth","api_key"],"models":[
        {"id":"chat-a","name":"Chat A","thinkingLevels":["off","minimal","low","medium","high","xhigh","max"]}
      ]},
      {"id":"provider-b","name":"Provider B","authMethods":[],"models":[]}
    ]}
    """#

private let aiLoginJSON = #"""
    {"login":{"id":"login-1","provider":"provider-a","method":"oauth","status":"pending","events":[
      {"type":"info","message":"Instructions","links":[{"url":"https://provider.example/help","label":"Help"}]},
      {"type":"auth_url","url":"https://provider.example/authorize?flow=1","instructions":"Open browser"},
      {"type":"device_code","userCode":"ABCD-EFGH","verificationUri":"https://provider.example/device","intervalSeconds":5,"expiresInSeconds":600},
      {"type":"progress","message":"Waiting"}
    ],"prompt":{"id":"prompt-1","type":"manual_code","message":"Paste redirect","placeholder":"Redirect URL"}}}
    """#

private func aiTestClient(
    _ transport: any HTTPTransport,
    auth: ClientAuthentication = .session(SessionCookie(value: "test_session", secure: true))
) throws -> OtterClient {
    try OtterClient(server: "https://otter.example", auth: auth, transport: transport)
}

struct AIClientTests {
    @Test func catalogIsRuntimeTypedAndUsesOnlyTheSession() async throws {
        let transport = AITransport(body: aiCatalogJSON)
        let catalog = try await aiTestClient(transport).aiCatalog()
        #expect(!catalog.authenticationEnabled)
        #expect(catalog.providers[0].authMethods == [.oauth, .apiKey])
        #expect(catalog.providers[0].models[0].thinkingLevels == AIThinkingLevel.allCases)
        #expect(catalog.providers[1].authMethods.isEmpty)
        let request = try #require(await transport.requests.first)
        #expect(request.url?.absoluteString == "https://otter.example/api/auth/ai/catalog")
        #expect(request.httpMethod == "GET")
        #expect(request.httpBody == nil)
        #expect(request.value(forHTTPHeaderField: "Cookie") == "otter_session=test_session")
        #expect(request.value(forHTTPHeaderField: "Authorization") == nil)
        #expect(request.value(forHTTPHeaderField: "X-Otter-Share-Token") == nil)
        #expect(request.value(forHTTPHeaderField: "Accept") == "application/json")
    }

    @Test func readsConnectionsWithoutCredentialData() async throws {
        let transport = AITransport(
            body:
                #"{"connections":[{"provider":"provider-a","method":"api_key"},{"provider":"provider-old","method":"oauth"}]}"#
        )
        let response = try await aiTestClient(transport).aiConnections()
        #expect(response.connections[0].method == .apiKey)
        #expect(response.connections[1].provider == "provider-old")
        #expect(await transport.requests.first?.url?.path == "/api/auth/ai/connections")
    }

    @Test func readsNullAndUnavailableSavedPreferences() async throws {
        let empty = AITransport(body: #"{"settings":null}"#)
        #expect(try await aiTestClient(empty).aiSettings().settings == nil)
        let unavailable = AITransport(
            body:
                #"{"settings":{"provider":"removed-provider","model":"old-model","thinkingLevel":"high"}}"#
        )
        let response = try await aiTestClient(unavailable).aiSettings()
        #expect(response.settings?.provider == "removed-provider")
        #expect(response.settings?.model == "old-model")
        #expect(response.settings?.thinkingLevel == .high)
        #expect(await unavailable.requests.first?.url?.path == "/api/auth/ai/settings")
    }

    @Test func settingsAreSavedOnlyByExplicitPut() async throws {
        let transport = AITransport(
            body: #"{"settings":{"provider":"provider-a","model":"chat-a","thinkingLevel":"low"}}"#)
        let settings = AISettings(provider: "provider-a", model: "chat-a", thinkingLevel: .low)
        #expect(try await aiTestClient(transport).saveAISettings(settings).settings == settings)
        let request = try #require(await transport.requests.first)
        let body = try JSONDecoder().decode([String: String].self, from: #require(request.httpBody))
        #expect(request.httpMethod == "PUT")
        #expect(request.url?.path == "/api/auth/ai/settings")
        #expect(body == ["provider": "provider-a", "model": "chat-a", "thinkingLevel": "low"])
        #expect(request.value(forHTTPHeaderField: "Content-Type") == "application/json")
    }

    @Test(arguments: AIAuthMethod.allCases)
    func createsAndPollsLoginWithTypedEventsAndPrompt(_ method: AIAuthMethod) async throws {
        let json = aiLoginJSON.replacingOccurrences(
            of: #""method":"oauth""#, with: "\"method\":\"\(method.rawValue)\"")
        let transport = AITransport(status: 201, body: json)
        let api = try aiTestClient(transport)
        let login = try await api.startAILogin(provider: "provider-a", method: method).login
        #expect(login.method == method)
        #expect(login.status == .pending)
        #expect(login.events.count == 4)
        #expect(
            login.events[1]
                == .authURL(
                    url: "https://provider.example/authorize?flow=1", instructions: "Open browser"))
        #expect(
            login.events[2]
                == .deviceCode(
                    userCode: "ABCD-EFGH", verificationURI: "https://provider.example/device",
                    intervalSeconds: 5, expiresInSeconds: 600))
        #expect(login.prompt?.id == "prompt-1")
        if case .manualCode(let prompt) = login.prompt {
            #expect(prompt.placeholder == "Redirect URL")
        } else {
            Issue.record("Expected manual-code prompt")
        }
        _ = try await api.aiLogin(id: login.id)
        let requests = await transport.requests
        #expect(requests[0].httpMethod == "POST")
        #expect(requests[0].url?.path == "/api/auth/ai/logins")
        #expect(requests[0].value(forHTTPHeaderField: "Content-Type") == "application/json")
        let body = try JSONDecoder().decode(
            [String: String].self, from: #require(requests[0].httpBody))
        #expect(body == ["provider": "provider-a", "method": method.rawValue])
        #expect(requests[1].httpMethod == "GET")
        #expect(requests[1].url?.path == "/api/auth/ai/logins/login-1")
        #expect(requests[1].httpBody == nil)
    }

    @Test(arguments: [
        "secret key + / ? #", "https://provider.example/callback?code=private&state=a", "option-id",
        "",
    ])
    func responsesUseOnlyTheJSONBody(_ value: String) async throws {
        let transport = AITransport(body: aiLoginJSON)
        _ = try await aiTestClient(transport).respondToAILogin(
            id: "login-1", promptID: "opaque-prompt-id", value: value)
        let request = try #require(await transport.requests.first)
        #expect(request.httpMethod == "POST")
        #expect(
            request.url?.absoluteString
                == "https://otter.example/api/auth/ai/logins/login-1/respond")
        let body = try JSONDecoder().decode([String: String].self, from: #require(request.httpBody))
        #expect(body == ["promptId": "opaque-prompt-id", "value": value])
        #expect(request.value(forHTTPHeaderField: "Content-Type") == "application/json")
        #expect(request.value(forHTTPHeaderField: "Authorization") == nil)
    }

    @Test func bothBodylessDeletesStillRequireJSON() async throws {
        let transport = AITransport(body: #"{"ok":true}"#)
        let api = try aiTestClient(transport)
        #expect(try await api.cancelAILogin(id: "login-1").ok)
        #expect(try await api.disconnectAIProvider("provider-a").ok)
        let requests = await transport.requests
        #expect(
            requests.map { $0.url!.path } == [
                "/api/auth/ai/logins/login-1", "/api/auth/ai/connections/provider-a",
            ])
        for request in requests {
            #expect(request.httpMethod == "DELETE")
            #expect(request.httpBody == nil)
            #expect(request.value(forHTTPHeaderField: "Content-Type") == "application/json")
            #expect(request.value(forHTTPHeaderField: "Authorization") == nil)
            #expect(request.value(forHTTPHeaderField: "X-Otter-Share-Token") == nil)
        }
    }

    @Test(arguments: [
        ClientAuthentication.anonymous, .bearer("otter_api_test"),
        .share(tripID: "trip-1", token: String(repeating: "s", count: 43)),
    ])
    func everyRouteRejectsNonSessionClientsBeforeTransport(_ auth: ClientAuthentication)
        async throws
    {
        let transport = AITransport(body: #"{}"#)
        let api = try aiTestClient(transport, auth: auth)
        for route in 0..<9 {
            do {
                switch route {
                case 0: _ = try await api.aiCatalog()
                case 1: _ = try await api.aiSettings()
                case 2: _ = try await api.aiConnections()
                case 3:
                    _ = try await api.saveAISettings(
                        AISettings(provider: "a", model: "b", thinkingLevel: .off))
                case 4: _ = try await api.startAILogin(provider: "a", method: .apiKey)
                case 5: _ = try await api.aiLogin(id: "login-1")
                case 6:
                    _ = try await api.respondToAILogin(
                        id: "login-1", promptID: "p", value: "secret")
                case 7: _ = try await api.cancelAILogin(id: "login-1")
                default: _ = try await api.disconnectAIProvider("provider-a")
                }
                Issue.record("Expected session guard")
            } catch AIClientError.sessionRequired {}
        }
        #expect(await transport.requests.isEmpty)
    }

    @Test(arguments: [
        "../me", ".", "..", "provider?key=secret", "provider/child", "x#fragment", "",
    ])
    func pathInputsCannotEscapeAIRoutes(_ id: String) async throws {
        let transport = AITransport(body: #"{"ok":true}"#)
        do {
            _ = try await aiTestClient(transport).disconnectAIProvider(id)
            Issue.record("Expected invalid identifier")
        } catch APIError.invalidIdentifier {}
        #expect(await transport.requests.isEmpty)
    }

    @Test(arguments: ["pending", "complete", "error"])
    func loginStatusAndWireFormatRoundTrip(_ status: String) throws {
        let json = aiLoginJSON.replacingOccurrences(
            of: #""status":"pending""#, with: "\"status\":\"\(status)\"")
        let response = try JSONDecoder().decode(AILoginResponse.self, from: Data(json.utf8))
        #expect(response.login.status.rawValue == status)
        #expect(
            try JSONDecoder().decode(AILoginResponse.self, from: JSONEncoder().encode(response))
                == response)
    }

    @Test(arguments: [
        #"{"id":"p","type":"text","message":"Domain"}"#,
        #"{"id":"p","type":"secret","message":"Key","placeholder":"Key"}"#,
        #"{"id":"p","type":"manual_code","message":"Code"}"#,
        #"{"id":"p","type":"select","message":"Choose","options":[{"id":"opaque","label":"Option","description":"Details"}]}"#,
    ])
    func allPromptTypesRoundTrip(_ json: String) throws {
        let prompt = try JSONDecoder().decode(AIAuthPrompt.self, from: Data(json.utf8))
        #expect(prompt.id == "p")
        #expect(
            try JSONDecoder().decode(AIAuthPrompt.self, from: JSONEncoder().encode(prompt))
                == prompt)
    }

    @Test(arguments: [400, 403, 404, 429, 503])
    func failuresAreReportedWithoutRetry(_ status: Int) async throws {
        let transport = AITransport(
            status: status, body: #"{"error":"Safe failure","code":"ai_failure"}"#)
        do {
            _ = try await aiTestClient(transport).aiLogin(id: "login-1")
            Issue.record("Expected HTTP failure")
        } catch let error as APIResponseError {
            #expect(error.status == status)
            #expect(error.message == "Safe failure")
            #expect(error.code == "ai_failure")
            #expect(error.retryAfter == 12)
        }
        #expect(await transport.requests.count == 1)
    }

    @Test func sessionExpiryIsUnauthorized() async throws {
        let transport = AITransport(status: 401, body: #"{"error":"Sign in"}"#)
        do {
            _ = try await aiTestClient(transport).aiConnections()
            Issue.record("Expected unauthorized")
        } catch APIError.unauthorized {}
    }

    @Test(arguments: [
        "<html>Error</html>", #"{"providers":[],"authenticationEnabled":"yes"}"#,
        #"{"providers":[{"id":"p","name":"P","authMethods":["password"],"models":[]}],"authenticationEnabled":true}"#,
    ])
    func malformedCatalogFailsClosed(_ body: String) async throws {
        do {
            _ = try await aiTestClient(AITransport(body: body)).aiCatalog()
            Issue.record("Expected invalid response")
        } catch APIError.invalidResponse {}
    }

    @Test(arguments: [
        #"{}"#,
        #"{"settings":{"provider":"p","model":"m","thinkingLevel":"unreviewed"}}"#,
    ])
    func malformedSettingsFailClosed(_ body: String) async throws {
        do {
            _ = try await aiTestClient(AITransport(body: body)).aiSettings()
            Issue.record("Expected invalid response")
        } catch APIError.invalidResponse {}
    }

    @Test func unknownLoginStatusFailsThroughTransport() async throws {
        let body = aiLoginJSON.replacingOccurrences(of: "pending", with: "unreviewed")
        do {
            _ = try await aiTestClient(AITransport(body: body)).aiLogin(id: "login-1")
            Issue.record("Expected invalid response")
        } catch APIError.invalidResponse {}
    }

    @Test func expiredSessionDoesNotReachTransport() async throws {
        let transport = AITransport(body: aiCatalogJSON)
        let auth = ClientAuthentication.session(
            SessionCookie(value: "old_session", expiresAt: Date(timeIntervalSince1970: 1)))
        do {
            _ = try await aiTestClient(transport, auth: auth).aiCatalog()
            Issue.record("Expected unauthorized")
        } catch APIError.unauthorized {}
        #expect(await transport.requests.isEmpty)
    }

    @Test func unreviewedPromptAndEventTypesFailClosed() throws {
        #expect(throws: DecodingError.self) {
            try JSONDecoder().decode(
                AIAuthPrompt.self, from: Data(#"{"id":"p","type":"file","message":"Path"}"#.utf8))
        }
        #expect(throws: DecodingError.self) {
            try JSONDecoder().decode(
                AIAuthEvent.self,
                from: Data(#"{"type":"callback_listener","url":"https://provider.example"}"#.utf8))
        }
    }

    @Test(arguments: [
        "http://provider.example", "javascript:alert(1)", "https://u:p@provider.example",
        "https://@provider.example", "https:///", "/relative", "file:///tmp/key",
    ])
    func externalProviderURLsRejectUnsafeInput(_ value: String) {
        #expect(AIProviderURL.validated(value) == nil)
    }

    @Test func providerURLPreservesOnlyTheProviderSuppliedURL() throws {
        let value = "https://provider.example/device?flow=opaque#instructions"
        #expect(try #require(AIProviderURL.validated(value)).absoluteString == value)
    }
}
