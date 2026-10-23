import Foundation
import Observation
import XCTest

@testable import Otter
@testable import OtterKit

@MainActor
private final class AIStateCredentials: CredentialStore {
    var saved: SavedSession?
    func load() throws -> SavedSession? { saved }
    func save(_ value: SavedSession) throws { saved = value }
    func delete() throws { saved = nil }
}

/// These responses test native state behavior, not a live provider or server.
private enum AIStateJSON {
    // Provider methods follow the reviewed contract. Model IDs are synthetic.
    static let catalog = #"""
        {"authenticationEnabled":true,"providers":[
          {"id":"openai","name":"OpenAI","authMethods":["api_key"],"models":[
            {"id":"chat","name":"Chat","thinkingLevels":["off","high"]},
            {"id":"reason","name":"Reason","thinkingLevels":["low","max"]}]},
          {"id":"openai-codex","name":"OpenAI Codex","authMethods":["oauth"],"models":[
            {"id":"code","name":"Code","thinkingLevels":["medium","high"]}]},
          {"id":"read-only","name":"Read only","authMethods":[],"models":[]}
        ]}
        """#
    static let selection = AISettings(provider: "openai", model: "chat", thinkingLevel: .off)
    static let saved =
        #"{"settings":{"provider":"openai","model":"chat","thinkingLevel":"off"}}"#
    static let emptySettings = #"{"settings":null}"#
    static let linked = #"{"connections":[{"provider":"openai","method":"api_key"}]}"#
    static let emptyConnections = #"{"connections":[]}"#
    static let failure = #"{"error":"Synthetic failure","code":"synthetic_failure"}"#
    static let ok = #"{"ok":true}"#

    static func login(status: String = "pending", prompt: String = "text") -> String {
        let options = prompt == "select" ? #", "options":[{"id":"allowed","label":"Allowed"}]"# : ""
        return """
            {"login":{"id":"login-1","provider":"openai","method":"api_key",
            "status":"\(status)","events":[],"createdAt":0,"expiresAt":0,
            "prompt":{"id":"prompt-1","type":"\(prompt)","message":"Input"\(options)}}}
            """
    }

    static func pending(_ prompt: String = "text") throws -> AILoginState {
        try JSONDecoder().decode(AILoginResponse.self, from: Data(login(prompt: prompt).utf8)).login
    }
}

/// A bounded XCTest wait observes entry. Release also works before entry.
private actor AIStateRequestGate {
    nonisolated let entered = XCTestExpectation(description: "Synthetic request entered")
    private var continuation: CheckedContinuation<Void, Never>?
    private var released = false

    func wait() async {
        entered.fulfill()
        if !released { await withCheckedContinuation { continuation = $0 } }
    }

    func release() {
        released = true
        continuation?.resume()
        continuation = nil
    }
}

private actor AIStateTransport: HTTPTransport {
    struct Reply: Sendable {
        var status = 200
        var json: String
        var gate: AIStateRequestGate?
        var loseResponse = false
    }

    private var replies: [String: [Reply]] = [:]
    private var requests: [URLRequest] = []
    private var unexpected: [String] = []

    func enqueue(_ route: String, _ reply: Reply) {
        replies[route, default: []].append(reply)
    }

    func data(for request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        requests.append(request)
        let route = Self.route(request)
        let reply: Reply
        if var queue = replies[route], !queue.isEmpty {
            reply = queue.removeFirst()
            replies[route] = queue
        } else {
            switch route {
            case "GET catalog": reply = Reply(json: AIStateJSON.catalog)
            case "GET settings": reply = Reply(json: AIStateJSON.emptySettings)
            case "GET connections": reply = Reply(json: AIStateJSON.linked)
            default:
                unexpected.append(route)
                reply = Reply(status: 500, json: AIStateJSON.failure)
            }
        }
        if let gate = reply.gate { await gate.wait() }
        if reply.loseResponse { throw URLError(.networkConnectionLost) }
        return (
            Data(reply.json.utf8),
            HTTPURLResponse(
                url: request.url!, statusCode: reply.status, httpVersion: nil,
                headerFields: ["Content-Type": "application/json"])!
        )
    }

    private static func route(_ request: URLRequest) -> String {
        let path = request.url!.path
        let prefix = "/api/auth/ai/"
        return (request.httpMethod ?? "GET") + " "
            + (path.hasPrefix(prefix) ? String(path.dropFirst(prefix.count)) : path)
    }

    func routes() -> [String] { requests.map(Self.route) }
    func unexpectedRoutes() -> [String] { unexpected }

    // Keep bodies and headers inside fixture memory. Failures report only Boolean checks.
    func bodyMatches(_ route: String, _ expected: [String: String]) -> Bool {
        guard let request = requests.last(where: { Self.route($0) == route }),
            let data = request.httpBody,
            let body = try? JSONDecoder().decode([String: String].self, from: data)
        else { return false }
        return body.count == expected.count
            && expected.allSatisfy { key, value in
                body[key].map { Array($0.utf16) == Array(value.utf16) } == true
            } && request.url?.query == nil
            && request.value(forHTTPHeaderField: "Content-Type") == "application/json"
    }

    func deletesUseJSONAndCookie(_ cookie: String) -> Bool {
        let deletes = requests.filter { $0.httpMethod == "DELETE" }
        return !deletes.isEmpty
            && deletes.allSatisfy {
                $0.httpBody == nil
                    && $0.value(forHTTPHeaderField: "Content-Type") == "application/json"
                    && $0.value(forHTTPHeaderField: "Cookie") == "otter_session=" + cookie
                    && $0.value(forHTTPHeaderField: "Authorization") == nil
                    && $0.value(forHTTPHeaderField: "X-Otter-Share-Token") == nil
            }
    }
}

/// Observe state changes instead of polling with sleeps or Task.yield loops.
@MainActor
private final class AIStateObservation {
    let fulfilled = XCTestExpectation(description: "Expected native state")
    private let predicate: @MainActor () -> Bool
    private var finished = false

    init(_ predicate: @escaping @MainActor () -> Bool) {
        self.predicate = predicate
        check()
    }

    private func check() {
        guard !finished else { return }
        let matches = withObservationTracking {
            predicate()
        } onChange: { [weak self] in
            Task { @MainActor in self?.check() }
        }
        if matches {
            finished = true
            fulfilled.fulfill()
        }
    }
}

@MainActor
final class AISettingsStateTests: XCTestCase {
    private let server = "https://otter.example"

    private func session(_ transport: AIStateTransport) throws -> AppSession {
        let value = AppSession(
            store: AIStateCredentials(),
            makeClient: { try OtterClient(server: $0, token: $1, transport: transport) },
            makeSessionClient: { try OtterClient(server: $0, auth: $1, transport: transport) })
        try login(value, transport: transport)
        return value
    }

    private func login(
        _ session: AppSession, transport: AIStateTransport, account: String = "a",
        auth: ClientAuthentication? = nil
    ) throws {
        let client = try OtterClient(
            server: server,
            auth: auth
                ?? .session(
                    SessionCookie(
                        value: "synthetic_" + account,
                        expiresAt: Date(timeIntervalSince1970: 4_102_444_800))),
            transport: transport)
        try session.acceptLogin(
            AuthenticatedLogin(
                client: client, user: User(id: account, name: "Synthetic", username: account)),
            for: session.sessionID)
    }

    private func wait(_ expectation: XCTestExpectation, timeout: TimeInterval = 2) async {
        let result = await XCTWaiter.fulfillment(of: [expectation], timeout: timeout)
        XCTAssertEqual(result, .completed)
    }

    private func ready(_ state: AISettingsState) {
        state.selectProvider("openai")
        state.selectModel("chat")
        state.connectionProvider = "openai"
        state.connectionMethod = .apiKey
    }

    private func assertNoUnexpected(_ transport: AIStateTransport) async {
        let routes = await transport.unexpectedRoutes()
        XCTAssertTrue(routes.isEmpty, "Only declared synthetic routes are permitted")
    }

    func testNonSessionContextsCannotStartAnyMutation() async throws {
        let auths: [ClientAuthentication] = [
            .anonymous, .bearer("otter_api_synthetic"),
            .share(tripID: "trip", token: String(repeating: "s", count: 43)),
        ]
        for auth in auths {
            let transport = AIStateTransport()
            let session = try session(transport)
            try login(session, transport: transport, auth: auth)
            let state = AISettingsState()
            defer {
                state.setActive(false)
                state.leave()
            }
            await state.activate(session: session, active: true)
            XCTAssertFalse(state.loaded)
            // Even otherwise valid public state cannot bypass the session context guard.
            state.catalog = try JSONDecoder().decode(
                AICatalogResponse.self, from: Data(AIStateJSON.catalog.utf8))
            state.connections = try JSONDecoder().decode(
                AIConnectionsResponse.self, from: Data(AIStateJSON.linked.utf8)
            ).connections
            state.loaded = true
            ready(state)
            await state.save()
            await state.connect()
            await state.disconnect("openai")
            state.login = try AIStateJSON.pending()
            state.input = "synthetic"
            await state.respond()
            await state.cancel()
            let requests = await transport.routes()
            XCTAssertTrue(requests.isEmpty)
        }
    }

    func testUnloadedFailedAndDisabledCatalogsBlockSaveAndConnect() async throws {
        let transport = AIStateTransport()
        let session = try session(transport)
        let state = AISettingsState()
        defer {
            state.setActive(false)
            state.leave()
        }
        ready(state)
        XCTAssertFalse(state.canConnect)
        XCTAssertFalse(state.canSave)
        await transport.enqueue("GET catalog", .init(status: 503, json: AIStateJSON.failure))
        await state.activate(session: session, active: true)
        ready(state)
        XCTAssertTrue(state.loadFailed)
        XCTAssertFalse(state.canConnect)
        XCTAssertFalse(state.canSave)
        if case .unavailable = state.issue {} else { XCTFail("Expected unavailable") }
        await state.save()
        await state.connect()
        let before = await transport.routes()
        XCTAssertTrue(before.allSatisfy { $0.hasPrefix("GET ") })

        await state.reload()
        ready(state)
        XCTAssertTrue(state.canSave)
        XCTAssertTrue(state.canConnect)
        await transport.enqueue("GET catalog", .init(status: 503, json: AIStateJSON.failure))
        await state.reload()
        XCTAssertTrue(state.loaded)
        XCTAssertTrue(state.validDraft)
        XCTAssertTrue(state.loadFailed)
        XCTAssertFalse(
            state.canSave, "A cached catalog cannot authorize a save after refresh fails")
        XCTAssertFalse(state.canConnect)
        await state.save()
        await state.connect()
        let failedReloadRoutes = await transport.routes()
        XCTAssertTrue(failedReloadRoutes.allSatisfy { $0.hasPrefix("GET ") })

        let disabled = AIStateJSON.catalog.replacingOccurrences(
            of: "\"authenticationEnabled\":true", with: "\"authenticationEnabled\":false")
        await transport.enqueue("GET catalog", .init(json: disabled))
        await state.reload()
        ready(state)
        XCTAssertTrue(state.loaded)
        XCTAssertFalse(state.loadFailed)
        XCTAssertFalse(state.canConnect)
        // Authentication availability does not disable settings for an existing connection.
        XCTAssertTrue(state.canSave)
        await assertNoUnexpected(transport)
    }

    func testCatalogControlsMethodsModelsAndThinkingResets() async throws {
        let transport = AIStateTransport()
        let session = try session(transport)
        let state = AISettingsState()
        defer {
            state.setActive(false)
            state.leave()
        }
        await state.activate(session: session, active: true)
        ready(state)
        XCTAssertTrue(state.canConnect)
        state.connectionMethod = .oauth
        XCTAssertFalse(state.canConnect)
        state.connectionProvider = "openai-codex"
        XCTAssertTrue(state.canConnect)
        state.connectionMethod = .apiKey
        XCTAssertFalse(state.canConnect)
        state.connectionProvider = "read-only"
        XCTAssertFalse(state.canConnect)
        state.connectionProvider = "not-in-catalog"
        XCTAssertFalse(state.canConnect)

        state.draft.thinkingLevel = .high
        state.selectModel("reason")
        XCTAssertEqual(state.draft.thinkingLevel, .low)
        state.draft.thinkingLevel = .max
        XCTAssertTrue(state.validDraft)
        state.draft.thinkingLevel = .xhigh
        XCTAssertFalse(state.validDraft)
        XCTAssertFalse(state.canSave)
        state.selectModel("missing")
        XCTAssertFalse(state.validDraft)
        state.selectProvider("openai-codex")
        XCTAssertEqual(state.draft.model, "")
        XCTAssertEqual(state.draft.thinkingLevel, .off)
        state.selectModel("code")
        XCTAssertEqual(state.draft.thinkingLevel, .medium)
        XCTAssertFalse(state.validDraft, "A catalog entry alone is not a saved connection")
        let requests = await transport.routes()
        XCTAssertEqual(Set(requests), Set(["GET catalog", "GET settings", "GET connections"]))
        await assertNoUnexpected(transport)
    }

    func testSave503And429PreserveDraftUntilExplicitSuccessfulRetry() async throws {
        let transport = AIStateTransport()
        let session = try session(transport)
        let state = AISettingsState()
        defer {
            state.setActive(false)
            state.leave()
        }
        await state.activate(session: session, active: true)
        ready(state)
        for status in [503, 429] {
            await transport.enqueue(
                "PUT settings", .init(status: status, json: AIStateJSON.failure))
            await state.save()
            XCTAssertEqual(state.draft, AIStateJSON.selection)
            XCTAssertNil(state.saved)
            XCTAssertNil(state.notice)
            XCTAssertTrue(state.canSave)
            if status == 503 {
                if case .unavailable = state.issue {} else { XCTFail("Expected unavailable") }
            } else {
                if case .rateLimited = state.issue {} else { XCTFail("Expected rate limited") }
            }
        }
        await transport.enqueue("PUT settings", .init(json: AIStateJSON.saved))
        await state.save()
        XCTAssertEqual(state.saved, state.draft)
        XCTAssertFalse(state.canSave)
        if case .saved = state.notice {} else { XCTFail("Expected saved notice") }
        let bodyMatches = await transport.bodyMatches(
            "PUT settings", ["provider": "openai", "model": "chat", "thinkingLevel": "off"])
        XCTAssertTrue(bodyMatches)
        let routes = await transport.routes()
        XCTAssertEqual(routes.filter { $0 == "PUT settings" }.count, 3)
        await assertNoUnexpected(transport)
    }

    func testAccountActivationClearsPrivateInputAndCachedStateAndIgnoresOldRefresh() async throws {
        let first = AIStateTransport()
        let second = AIStateTransport()
        let session = try session(first)
        let state = AISettingsState()
        defer {
            state.setActive(false)
            state.leave()
        }
        await state.activate(session: session, active: true)
        ready(state)
        state.saved = AIStateJSON.selection
        state.input = "synthetic private input"
        let oldGate = AIStateRequestGate()
        await first.enqueue("GET catalog", .init(json: AIStateJSON.catalog, gate: oldGate))
        let oldRefresh = Task { await state.reload() }
        await wait(oldGate.entered)
        try login(session, transport: second, account: "b")
        let newGate = AIStateRequestGate()
        await second.enqueue("GET catalog", .init(json: AIStateJSON.catalog, gate: newGate))
        await second.enqueue("GET connections", .init(json: AIStateJSON.emptyConnections))
        let activation = Task { await state.activate(session: session, active: true) }
        await wait(newGate.entered)
        XCTAssertEqual(state.input, "")
        XCTAssertNil(state.catalog)
        XCTAssertNil(state.saved)
        XCTAssertNil(state.login)
        XCTAssertTrue(state.connections.isEmpty)
        XCTAssertEqual(state.draft, AISettings(provider: "", model: "", thinkingLevel: .off))
        await oldGate.release()
        await oldRefresh.value
        XCTAssertNil(state.catalog)
        XCTAssertTrue(state.loading, "An old refresh must not end the new account's loading state")
        await newGate.release()
        await activation.value
        XCTAssertTrue(state.loaded)
        XCTAssertTrue(state.connections.isEmpty)
        XCTAssertNil(state.saved)
        await assertNoUnexpected(first)
        await assertNoUnexpected(second)
    }

    func testLateSaveSuccessOr401CannotChangeNewAccount() async throws {
        for status in [200, 401] {
            let first = AIStateTransport()
            let second = AIStateTransport()
            let session = try session(first)
            let state = AISettingsState()
            defer {
                state.setActive(false)
                state.leave()
            }
            await state.activate(session: session, active: true)
            ready(state)
            let gate = AIStateRequestGate()
            await first.enqueue(
                "PUT settings",
                .init(
                    status: status, json: status == 200 ? AIStateJSON.saved : AIStateJSON.failure,
                    gate: gate))
            let saving = Task { await state.save() }
            await wait(gate.entered)
            try login(session, transport: second, account: "b")
            let generation = session.sessionID
            await state.activate(session: session, active: true)
            await gate.release()
            await saving.value
            XCTAssertEqual(session.sessionID, generation)
            XCTAssertEqual(session.user?.id, "b")
            XCTAssertNotNil(session.client)
            XCTAssertNil(session.errorMessage)
            XCTAssertNil(state.saved)
            XCTAssertNil(state.notice)
            XCTAssertNil(state.issue)
            XCTAssertFalse(state.busy)
            await assertNoUnexpected(first)
            await assertNoUnexpected(second)
        }
    }

    func testCurrent401ClearsSessionAndInput() async throws {
        let transport = AIStateTransport()
        let session = try session(transport)
        let state = AISettingsState()
        defer {
            state.setActive(false)
            state.leave()
        }
        await state.activate(session: session, active: true)
        ready(state)
        state.input = "synthetic input"
        await transport.enqueue("PUT settings", .init(status: 401, json: AIStateJSON.failure))
        await state.save()
        XCTAssertNil(session.client)
        XCTAssertNil(session.user)
        XCTAssertEqual(state.input, "")
        await assertNoUnexpected(transport)
    }

    func testPromptValidationUsesTypesNULAndUTF16LimitsAndAllowsEmptyText() throws {
        let state = AISettingsState()
        defer { state.leave() }
        for prompt in ["secret", "manual_code", "text"] {
            state.login = try AIStateJSON.pending(prompt)
            state.input = " \n\t"
            XCTAssertEqual(state.canRespond, prompt == "text")
            state.input = ""
            XCTAssertEqual(state.canRespond, prompt == "text")
            state.input = "valid\u{0000}input"
            XCTAssertFalse(state.canRespond)
            state.input = String(repeating: "😀", count: 8192)
            XCTAssertTrue(state.canRespond)
            state.input += "a"
            XCTAssertFalse(state.canRespond)
        }
        state.login = try AIStateJSON.pending("select")
        state.input = "allowed"
        XCTAssertTrue(state.canRespond)
        state.input = "Allowed"
        XCTAssertFalse(state.canRespond)
        state.input = ""
        XCTAssertFalse(state.canRespond)
        state.input = "allowed"
        state.busy = true
        XCTAssertFalse(state.canRespond)
        state.busy = false
        state.loading = true
        XCTAssertFalse(state.canRespond)
    }

    func testSecretAndManualCodeEmptinessUsesECMAScriptTrimOnly() throws {
        let state = AISettingsState()
        defer { state.leave() }
        for prompt in ["secret", "manual_code"] {
            state.login = try AIStateJSON.pending(prompt)
            state.input = "\u{FEFF}"
            XCTAssertFalse(state.canRespond)
            for input in ["\u{0085}", "\u{200B}", " \u{FEFF}Jose\u{0301} "] {
                state.input = input
                XCTAssertTrue(state.canRespond)
                XCTAssertEqual(Array(state.input.utf16), Array(input.utf16))
            }
        }
    }

    func testRespondClearsInputBeforeAwaitAndRecoversCompletedObsoleteOrLostReply() async throws {
        let cases = [
            (prompt: "secret", value: " \u{FEFF}Jose\u{0301}\u{0085}\u{200B} ", lostReply: false),
            (
                prompt: "manual_code", value: "https://provider.example/callback?code=synthetic",
                lostReply: true
            ),
            (prompt: "text", value: "", lostReply: false),
        ]
        for fixture in cases {
            let transport = AIStateTransport()
            let session = try session(transport)
            let state = AISettingsState()
            defer {
                state.setActive(false)
                state.leave()
            }
            await state.activate(session: session, active: true)
            state.login = try AIStateJSON.pending(fixture.prompt)
            state.input = fixture.value
            let gate = AIStateRequestGate()
            await transport.enqueue(
                "POST logins/login-1/respond",
                .init(
                    status: 400, json: AIStateJSON.failure, gate: gate,
                    loseResponse: fixture.lostReply))
            await transport.enqueue(
                "GET logins/login-1", .init(json: AIStateJSON.login(status: "complete")))
            await transport.enqueue("GET settings", .init(json: AIStateJSON.saved))
            let response = Task { await state.respond() }
            await wait(gate.entered)
            XCTAssertEqual(state.input, "")
            XCTAssertTrue(state.busy)
            await state.respond()
            await state.connect()
            await gate.release()
            await response.value
            XCTAssertEqual(state.login?.status, .complete)
            XCTAssertNil(state.issue)
            if case .connected = state.notice {} else { XCTFail("Expected recovered connection") }
            XCTAssertEqual(state.saved, AIStateJSON.selection)
            XCTAssertEqual(state.connections.map(\.provider), ["openai"])
            let bodyMatches = await transport.bodyMatches(
                "POST logins/login-1/respond",
                ["promptId": "prompt-1", "value": fixture.value])
            XCTAssertTrue(bodyMatches)
            let routes = await transport.routes()
            XCTAssertEqual(routes.filter { $0 == "POST logins/login-1/respond" }.count, 1)
            XCTAssertEqual(routes.filter { $0 == "GET logins/login-1" }.count, 1)
            XCTAssertFalse(routes.contains("POST logins"))
            XCTAssertEqual(routes.filter { $0 == "GET connections" }.count, 2)
            await assertNoUnexpected(transport)
        }
    }

    func testCancelSuccessOr404RefreshesConnectionThatAlreadyCommitted() async throws {
        for status in [200, 404] {
            let transport = AIStateTransport()
            let session = try session(transport)
            let state = AISettingsState()
            defer {
                state.setActive(false)
                state.leave()
            }
            await transport.enqueue("GET connections", .init(json: AIStateJSON.emptyConnections))
            await state.activate(session: session, active: true)
            state.login = try AIStateJSON.pending()
            state.input = "synthetic input"
            await transport.enqueue(
                "DELETE logins/login-1",
                .init(status: status, json: status == 200 ? AIStateJSON.ok : AIStateJSON.failure))
            await transport.enqueue("GET settings", .init(json: AIStateJSON.saved))
            await state.cancel()
            XCTAssertNil(state.login)
            XCTAssertEqual(state.input, "")
            XCTAssertEqual(state.saved, AIStateJSON.selection)
            XCTAssertEqual(state.connections.map(\.provider), ["openai"])
            XCTAssertNil(state.issue)
            if status == 200 {
                if case .cancelled = state.notice {} else { XCTFail("Cancel is not revocation") }
            } else {
                XCTAssertNil(state.notice)
            }
            let routes = await transport.routes()
            XCTAssertEqual(routes.filter { $0 == "GET connections" }.count, 2)
            XCTAssertFalse(routes.contains("DELETE connections/openai"))
            let safeDelete = await transport.deletesUseJSONAndCookie("synthetic_a")
            XCTAssertTrue(safeDelete)
            await assertNoUnexpected(transport)
        }
    }

    func testDisconnectReadsServerClearedSelectionAndConnections() async throws {
        let transport = AIStateTransport()
        let session = try session(transport)
        let state = AISettingsState()
        defer {
            state.setActive(false)
            state.leave()
        }
        await transport.enqueue("GET settings", .init(json: AIStateJSON.saved))
        await state.activate(session: session, active: true)
        XCTAssertEqual(state.saved, AIStateJSON.selection)
        await transport.enqueue("DELETE connections/openai", .init(json: AIStateJSON.ok))
        await transport.enqueue("GET connections", .init(json: AIStateJSON.emptyConnections))
        await state.disconnect("openai")
        XCTAssertNil(state.saved)
        XCTAssertTrue(state.connections.isEmpty)
        XCTAssertFalse(state.validDraft)
        XCTAssertFalse(state.canSave)
        if case .disconnected = state.notice {} else { XCTFail("Expected disconnected") }
        let routes = await transport.routes()
        XCTAssertEqual(routes.filter { $0 == "GET settings" }.count, 2)
        XCTAssertEqual(routes.filter { $0 == "GET connections" }.count, 2)
        let safeDelete = await transport.deletesUseJSONAndCookie("synthetic_a")
        XCTAssertTrue(safeDelete)
        await assertNoUnexpected(transport)
    }

    func testBackgroundStopsPollClearsInputAndBlocksMutationsUntilActive() async throws {
        let transport = AIStateTransport()
        let session = try session(transport)
        let state = AISettingsState()
        defer {
            state.setActive(false)
            state.leave()
        }
        await state.activate(session: session, active: false)
        ready(state)
        await state.save()
        await state.connect()
        await state.disconnect("openai")
        state.login = try AIStateJSON.pending()
        let gate = AIStateRequestGate()
        await transport.enqueue(
            "GET logins/login-1", .init(json: AIStateJSON.login(status: "complete"), gate: gate))
        state.setActive(true)
        await wait(gate.entered)
        state.input = "synthetic input"
        state.setActive(false)
        XCTAssertEqual(state.input, "")
        state.input = "synthetic response"
        await state.respond()
        await state.cancel()
        let before = await transport.routes()
        let unwantedCompletion = AIStateObservation { state.login?.status == .complete }
        unwantedCompletion.fulfilled.isInverted = true
        await gate.release()
        await wait(unwantedCompletion.fulfilled, timeout: 0.1)
        XCTAssertEqual(state.login?.status, .pending)
        XCTAssertNil(state.notice)
        XCTAssertTrue(before.allSatisfy { $0.hasPrefix("GET ") })
        // Resume and explicitly finish the pending login before test cleanup.
        await transport.enqueue("DELETE logins/login-1", .init(json: AIStateJSON.ok))
        state.setActive(true)
        await state.cancel()
        let after = await transport.routes()
        XCTAssertEqual(after.filter { $0 == "GET logins/login-1" }.count, 1)
        XCTAssertNil(state.login)
        state.leave()
        XCTAssertEqual(state.input, "")
        await assertNoUnexpected(transport)
    }

    func testLateConnectAfterLeaveCancelsOnlyOriginalSessionAndNeverAnotherAccount() async throws {
        for switchAccount in [false, true] {
            let first = AIStateTransport()
            let second = AIStateTransport()
            let session = try session(first)
            let state = AISettingsState()
            defer {
                state.setActive(false)
                state.leave()
            }
            await state.activate(session: session, active: true)
            ready(state)
            let gate = AIStateRequestGate()
            await first.enqueue("POST logins", .init(json: AIStateJSON.login(), gate: gate))
            if !switchAccount {
                await first.enqueue("DELETE logins/login-1", .init(json: AIStateJSON.ok))
            }
            let connect = Task { await state.connect() }
            await wait(gate.entered)
            state.input = "synthetic input"
            state.leave()
            XCTAssertEqual(state.input, "")
            if switchAccount {
                try login(session, transport: second, account: "b")
                await state.activate(session: session, active: true)
            }
            await gate.release()
            await connect.value
            XCTAssertNil(state.login)
            XCTAssertNil(state.notice)
            if !switchAccount {
                await state.connect()
                await state.save()
                await state.disconnect("openai")
            }
            let firstRoutes = await first.routes()
            let secondRoutes = await second.routes()
            XCTAssertEqual(firstRoutes.filter { $0 == "POST logins" }.count, 1)
            XCTAssertFalse(firstRoutes.contains("PUT settings"))
            XCTAssertFalse(firstRoutes.contains("DELETE connections/openai"))
            XCTAssertEqual(
                firstRoutes.filter { $0 == "DELETE logins/login-1" }.count, switchAccount ? 0 : 1)
            XCTAssertFalse(secondRoutes.contains { $0.hasPrefix("DELETE ") })
            let startMatches = await first.bodyMatches(
                "POST logins", ["provider": "openai", "method": "api_key"])
            XCTAssertTrue(startMatches)
            if !switchAccount {
                let safeDelete = await first.deletesUseJSONAndCookie("synthetic_a")
                XCTAssertTrue(safeDelete)
            }
            await assertNoUnexpected(first)
            await assertNoUnexpected(second)
        }
    }

    func testServerExpiredPollClearsLoginAndRefreshesInsteadOfTrustingCachedConnection()
        async throws
    {
        let transport = AIStateTransport()
        let session = try session(transport)
        let state = AISettingsState()
        defer {
            state.setActive(false)
            state.leave()
        }
        await transport.enqueue("GET settings", .init(json: AIStateJSON.saved))
        await state.activate(session: session, active: false)
        XCTAssertEqual(state.saved, AIStateJSON.selection)
        // The DTO has no expiry property. Extra timestamps do not override server status.
        state.login = try AIStateJSON.pending()
        state.input = "synthetic input"
        await transport.enqueue("GET logins/login-1", .init(status: 404, json: AIStateJSON.failure))
        await transport.enqueue("GET connections", .init(json: AIStateJSON.emptyConnections))
        let expired = AIStateObservation {
            if case .expired = state.issue {
                return state.login == nil && state.saved == nil && state.connections.isEmpty
                    && !state.loading
            }
            return false
        }
        state.setActive(true)
        await wait(expired.fulfilled)
        state.setActive(false)
        XCTAssertNil(state.login)
        XCTAssertNil(state.saved)
        XCTAssertTrue(state.connections.isEmpty)
        XCTAssertEqual(state.input, "")
        if case .expired = state.issue {} else { XCTFail("Expected server expiry") }
        let routes = await transport.routes()
        XCTAssertEqual(routes.filter { $0 == "GET logins/login-1" }.count, 1)
        XCTAssertFalse(routes.contains("POST logins"))
        await assertNoUnexpected(transport)
    }
}
