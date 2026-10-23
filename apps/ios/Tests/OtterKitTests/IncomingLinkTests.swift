import Foundation
import Testing

@testable import OtterKit

private let inviteToken = String(repeating: "A", count: 43)
private let incomingOrigin = URL(string: "https://otter.example")!

private actor IncomingTransport: HTTPTransport {
    private(set) var requests: [URLRequest] = []
    let bodies: [Data]
    let status: Int

    init(_ bodies: [String], status: Int = 200) {
        self.bodies = bodies.map { Data($0.utf8) }
        self.status = status
    }

    func data(for request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        let index = requests.count
        requests.append(request)
        let response = HTTPURLResponse(
            url: request.url!, statusCode: status, httpVersion: nil, headerFields: nil)!
        return (bodies[min(index, bodies.count - 1)], response)
    }
}

@MainActor
private final class IncomingMemoryStore: CredentialStore {
    var saved: SavedSession?
    func load() throws -> SavedSession? { saved }
    func save(_ value: SavedSession) throws { saved = value }
    func delete() throws { saved = nil }
}

private func publicTripJSON(mode: String = "readonly", readonly: Bool = true) -> String {
    """
    {"trip":{"id":"trip_1","name":"Trip","baseCurrency":"JPY","participants":[],"expenses":[]},
    "balances":[],"settlements":[],"shareMode":"\(mode)","readonly":\(readonly)}
    """
}

struct IncomingLinkTests {
    @Test func parsesSupportedRoutesWithoutStoringRawURL() throws {
        let share = try IncomingLink.parse("https://OTTER.example:443/share/\(inviteToken)")
        #expect(share.origin == incomingOrigin)
        #expect(share.destination == .share(token: inviteToken))
        #expect(!share.description.contains(inviteToken))
        #expect(!share.debugDescription.contains(inviteToken))
        let device = try IncomingLink.parse("http://localhost:5173/device?code=ABCD-2345")
        #expect(device.origin.absoluteString == "http://localhost:5173")
        #expect(device.destination == .device(code: "ABCD-2345"))
        #expect(
            try IncomingLink.parse("https://otter.example/device").destination == .device(code: ""))
        let workspace = try IncomingLink.parse(
            "https://otter.example/?trip=trip_1&view=expenses&mode=edit-expense&expense=expense_1")
        #expect(
            workspace.destination
                == .workspace(
                    tripID: "trip_1", view: "expenses", expenseID: "expense_1", mode: .editExpense))
        #expect(
            try IncomingLink.parse("https://otter.example/?trip=trip_1").destination
                == .workspace(tripID: "trip_1", view: "overview", expenseID: nil))
        #expect(
            try IncomingLink.parse("https://otter.example/?account=settings").destination
                == .accountSettings)
        #expect(
            try IncomingLink.parse(URL(string: "https://otter.example/?account=settings")!)
                .destination
                == .accountSettings)
    }

    @Test func matchesWebWorkspaceModesViewsAndAccountContext() throws {
        for view in ["overview", "expenses", "analysis", "people", "more"] {
            for rawMode in [nil, "add-expense", "edit-expense", "unsupported"] as [String?] {
                for account in [false, true] {
                    let modeQuery = rawMode.map { "&mode=\($0)" } ?? ""
                    let accountQuery = account ? "&account=settings" : ""
                    let route = try IncomingLink.parse(
                        "https://otter.example/?trip=trip_1&view=\(view)&expense=expense_1\(modeQuery)\(accountQuery)"
                    )
                    let mode = rawMode.flatMap(IncomingLink.WorkspaceMode.init(rawValue:))
                    #expect(
                        route.destination
                            == .workspace(
                                tripID: "trip_1", view: mode == .editExpense ? "expenses" : view,
                                expenseID: mode == .editExpense ? "expense_1" : nil,
                                mode: mode, accountSettings: account))
                }
            }
        }
    }

    @Test func decodesSafeFormValuesBeforeValidatingIDs() throws {
        let route = try IncomingLink.parse(
            "https://otter.example/?tr%69p=%74rip%5f1&view=%61nalysis&mode=%61dd-expense&account=%73ettings"
        )
        #expect(
            route.destination
                == .workspace(
                    tripID: "trip_1", view: "analysis", expenseID: nil,
                    mode: .addExpense, accountSettings: true))
        let edit = try IncomingLink.parse(
            "https://otter.example/?trip=t%2D1&view=people&mode=edit-expense&expense=e%5F1")
        #expect(
            edit.destination
                == .workspace(
                    tripID: "t-1", view: "expenses", expenseID: "e_1", mode: .editExpense))
        let device = try IncomingLink.parse("https://otter.example/device?code=%41BCD%2D2345")
        #expect(device.destination == .device(code: "ABCD-2345"))
    }

    @Test func usesWebFallbacksAndIgnoresUnconsumedExpense() throws {
        for suffix in ["", "&view=unknown", "&view=", "&mode=unknown", "&mode=add+expense"] {
            #expect(
                try IncomingLink.parse(
                    "https://otter.example/?trip=t&expense=ignored\(suffix)"
                ).destination
                    == .workspace(tripID: "t", view: "overview", expenseID: nil))
        }
        #expect(
            try IncomingLink.parse(
                "https://otter.example/?trip=t&mode=add-expense&view=people&expense=ignored"
            ).destination
                == .workspace(tripID: "t", view: "people", expenseID: nil, mode: .addExpense))
        // A missing expense selects the expenses view, but cannot create an edit target.
        for expense in ["", "&expense="] {
            #expect(
                try IncomingLink.parse(
                    "https://otter.example/?trip=t&mode=edit-expense\(expense)"
                ).destination
                    == .workspace(tripID: "t", view: "expenses", expenseID: nil, mode: .editExpense)
            )
        }
        #expect(
            try IncomingLink.parse(
                "https://otter.example/?account=settings&trip=&view=people&mode=add-expense"
            ).destination
                == .accountSettings)
        #expect(
            try IncomingLink.parse(
                "https://otter.example/?trip=t&account=unknown"
            ).destination
                == .workspace(tripID: "t", view: "overview", expenseID: nil))
    }

    @Test func discardsTrackingParametersAndFragmentsWithoutForwardingThem() throws {
        let tracking =
            "utm_source=a+b&utm_source=second&empty&next=%2Fother&label=%E6%97%85%E8%A1%8C#section%20one"
        let route = try IncomingLink.parse("https://otter.example/?trip=trip_1&\(tracking)")
        #expect(route.destination == .workspace(tripID: "trip_1", view: "overview", expenseID: nil))
        #expect(route.origin == incomingOrigin)
        #expect(!route.description.contains("utm_source"))
        #expect(!route.debugDescription.contains("section"))
        #expect(!route.destination.debugDescription.contains("trip_1"))
        #expect(
            try IncomingLink.parse(
                "https://otter.example/share/\(inviteToken)?\(tracking)"
            ).destination == .share(token: inviteToken))
        #expect(
            try IncomingLink.parse(
                "https://otter.example/device?code=ABCD2345&\(tracking)"
            ).destination == .device(code: "ABCD2345"))
        #expect(
            try IncomingLink.parse(
                "https://otter.example/?account=settings&\(tracking)"
            ).destination == .accountSettings)
    }

    @Test func rejectsDuplicateKnownParametersEvenWhenEncodedOrUnused() {
        // Deliberate security difference from URLSearchParams.get (first value):
        // duplicate known keys are ambiguous across first-value and last-value consumers.
        for key in ["trip", "view", "mode", "expense", "account", "code"] {
            for pair in ["\(key)=same&\(key)=same", "\(key)&\(key)=value"] {
                #expect(throws: IncomingLinkError.self) {
                    _ = try IncomingLink.parse("https://otter.example/?trip=t&\(pair)")
                }
            }
        }
        for query in ["trip=t&tr%69p=t", "trip=t&account=settings&%61ccount=settings"] {
            #expect(throws: IncomingLinkError.self) {
                _ = try IncomingLink.parse("https://otter.example/?\(query)")
            }
        }
    }

    @Test func rejectsControlsMalformedEscapesAndAuthenticationRoutes() {
        // Controls remain invalid even in ignored data: they can conceal route boundaries
        // when a URL is displayed or passed through another URL parser.
        for suffix in [
            "&tracking=%00", "&tracking=%0D%0A", "#%0A", "#%EF%BB%BF", "&trip%00=t",
            "&tracking=%5Cevil",
            "&tracking=%", "&tracking=%GG",
        ] {
            #expect(throws: IncomingLinkError.self) {
                _ = try IncomingLink.parse("https://otter.example/?trip=t\(suffix)")
            }
        }
        for path in [
            "/auth/callback?code=secret", "/api/auth/callback?code=secret", "/login?next=%2F",
            "/api/device/token?code=ABCD2345",
        ] {
            #expect(throws: IncomingLinkError.self) {
                _ = try IncomingLink.parse("https://otter.example\(path)")
            }
        }
        for id in [
            "t+1", "%20t", "t%2F1", "%2E%2E", "t%00", "%252F", String(repeating: "a", count: 201),
        ] {
            #expect(throws: IncomingLinkError.self) {
                _ = try IncomingLink.parse("https://otter.example/?trip=\(id)")
            }
            #expect(throws: IncomingLinkError.self) {
                _ = try IncomingLink.parse(
                    "https://otter.example/?trip=t&mode=edit-expense&expense=\(id)")
            }
        }
    }

    @Test @MainActor func lateAuthenticationCallbacksCannotReplaceAnotherLinkUser() async throws {
        let transport = IncomingTransport(["{}"])
        let store = IncomingMemoryStore()
        let session = AppSession(
            store: store, makeClient: { _, _ in throw APIError.unauthorized })
        let oldGeneration = session.sessionID
        let currentClient = try OtterClient(
            server: incomingOrigin.absoluteString,
            auth: .session(SessionCookie(value: "current")), transport: transport)
        try session.acceptLogin(
            AuthenticatedLogin(
                client: currentClient,
                user: User(id: "current", name: "Current", username: "current")),
            for: oldGeneration)
        let currentGeneration = session.sessionID
        let lateClient = try OtterClient(
            server: "https://other.example", auth: .session(SessionCookie(value: "late")),
            transport: transport)
        #expect(throws: CancellationError.self) {
            try session.acceptLogin(
                AuthenticatedLogin(
                    client: lateClient, user: User(id: "late", name: "Late", username: "late")),
                for: oldGeneration)
        }
        session.handle(APIError.unauthorized, for: oldGeneration)
        #expect(session.sessionID == currentGeneration)
        #expect(session.client === currentClient)
        #expect(session.user?.id == "current")
        #expect(store.saved?.user?.id == "current")
        #expect(session.errorMessage == nil)
        #expect(await transport.requests.isEmpty)
    }

    @Test func comparesCanonicalOriginsNotHostSuffixes() throws {
        #expect(IncomingLink.sameOrigin(incomingOrigin, URL(string: "https://OTTER.example:443/")!))
        #expect(
            IncomingLink.sameOrigin(
                URL(string: "http://localhost")!, URL(string: "http://LOCALHOST:80/")!))
        for value in [
            "https://otter.example.evil", "https://evil.example", "https://otter.example:444",
            "https://otter.example/path", "https://otter.example/?trip=x",
            "https://user@otter.example",
        ] {
            #expect(!IncomingLink.sameOrigin(incomingOrigin, URL(string: value)!))
        }
    }

    @Test func rejectsUnsafeOriginsAndUnexpectedRoutes() {
        let urls = [
            "http://otter.example/?trip=t", "http://localhost.evil/?trip=t",
            "http://127.0.0.1/?trip=t",
            "javascript:alert(1)", "otter://share/\(inviteToken)", "//otter.example/?trip=t",
            "https://user@otter.example/?trip=t", "https://otter.example@evil.example/?trip=t",
            "https://user:password@otter.example/?trip=t", "https://@otter.example/?trip=t",
            "https://otter.example:0/?trip=t", "https://otter.example:65536/?trip=t",
            "https://otter.example./?trip=t", "https://otter.example%2Fevil/?trip=t",
            "https://otter.example\\@evil.example/?trip=t",
            "https://otter.example/api/trips/t", "https://otter.example/share/\(inviteToken)/extra",
            "https://otter.example/share/\(inviteToken)?trip=t",
            "https://otter.example/device/?code=ABCD2345",
            "https://otter.example/../?trip=t", "https://otter.example/%2e%2e/?trip=t",
            "https://otter.example/%73hare/\(inviteToken)", "https://otter.example/?unknown=x",
            "\u{feff}https://otter.example/?trip=t", " https://otter.example/?trip=t",
            "https://otter.example/\u{feff}?trip=t", "https://otter.example/?trip=\u{feff}t",
            "https://otter.example/?trip=%EF%BB%BFt", "https://otter.example/?trip=t%0A",
            "https://otter.example/?trip=../t", "https://otter.example/?trip=%2e%2e%2Ft",
            "https://otter.example/?trip=%252e%252e", "https://otter.example/?trip=t&trip=other",
            "https://otter.example/?trip=",
            "https://otter.example/?trip=t&mode=edit-expense&expense=..",
            "https://otter.example/?account=other",
            "https://otter.example/device?code=ABCD2345&code=EFGH2345",
            "https://otter.example/device?code=ABCI2345",
        ]
        for (index, value) in urls.enumerated() {
            #expect(throws: IncomingLinkError.self, "Invalid route at index \(index)") {
                _ = try IncomingLink.parse(value)
            }
        }
    }

    @Test func rejectsMalformedCapabilities() {
        for token in [
            "", "a", String(repeating: "A", count: 42), String(repeating: "A", count: 44),
            String(repeating: "A", count: 42) + "=", "../" + inviteToken, "%2F" + inviteToken,
            String(repeating: "A", count: 42) + "+",
        ] {
            #expect(throws: IncomingLinkError.self) {
                _ = try IncomingLink.parse("https://otter.example/share/\(token)")
            }
        }
    }

    @Test func discriminatesPreviewModeFromPublicShareMode() throws {
        let decoder = JSONDecoder()
        let previewJSON = #"{"mode":"signed-in-edit","tripName":"Trip"}"#
        guard
            case .preview(let preview) = try decoder.decode(
                ShareOpenResult.self, from: Data(previewJSON.utf8))
        else {
            Issue.record("Expected standalone preview")
            return
        }
        #expect(preview.tripName == "Trip")
        #expect(preview.mode == .signedInEdit)
        guard
            case .preview = try decoder.decode(
                ShareOpenResult.self, from: JSONEncoder().encode(ShareOpenResult.preview(preview)))
        else {
            Issue.record("Expected preview round trip")
            return
        }
        guard
            case .readonly(let payload) = try decoder.decode(
                ShareOpenResult.self, from: Data(publicTripJSON().utf8))
        else {
            Issue.record("Expected readonly payload")
            return
        }
        #expect(payload.readonly == true)
        #expect(payload.trip.ownerId == nil)
        guard
            case .anyoneEdit = try decoder.decode(
                ShareOpenResult.self,
                from: Data(publicTripJSON(mode: "anyone-edit", readonly: false).utf8))
        else {
            Issue.record("Expected guest payload")
            return
        }
        for invalid in [
            #"{"mode":"readonly","tripName":"Trip"}"#,
            #"{"mode":"signed-in-edit","shareMode":"anyone-edit","tripName":"Trip"}"#,
            #"{"mode":"signed-in-edit","tripName":"Trip","trip":{}}"#,
            #"{"shareMode":"signed-in-edit","tripName":"Trip"}"#,
            publicTripJSON(mode: "signed-in-edit"), publicTripJSON(readonly: false),
            publicTripJSON(mode: "anyone-edit"), publicTripJSON(mode: "unknown"),
        ] {
            #expect(throws: (any Error).self) {
                _ = try decoder.decode(ShareOpenResult.self, from: Data(invalid.utf8))
            }
        }
    }

    @Test func publicReadsNeverSendAccountOrShareHeaders() async throws {
        let transport = IncomingTransport([publicTripJSON()])
        let share = try ShareClient(origin: incomingOrigin, transport: transport)
        let payload = try await share.readonlyPayload(token: inviteToken)
        #expect(payload.trip.id == "trip_1")
        #expect(share.readonlyClient.auth == .anonymous)
        let request = try #require(await transport.requests.first)
        #expect(request.url?.path == "/api/share/\(inviteToken)")
        #expect(request.httpMethod == "GET")
        #expect(request.value(forHTTPHeaderField: "Authorization") == nil)
        #expect(request.value(forHTTPHeaderField: "Cookie") == nil)
        #expect(request.value(forHTTPHeaderField: "X-Otter-Share-Token") == nil)
    }

    @Test func guestCredentialsStayWithinTripPathAndSeparateFromAccount() async throws {
        let publicJSON = publicTripJSON(mode: "anyone-edit", readonly: false)
        let tripJSON = publicJSON.replacingOccurrences(
            of: "\"shareMode\":\"anyone-edit\",", with: "")
        let transport = IncomingTransport([publicJSON, tripJSON])
        let share = try ShareClient(origin: incomingOrigin, transport: transport)
        guard case .anyoneEdit(let payload) = try await share.open(token: inviteToken) else {
            Issue.record("Expected guest payload")
            return
        }
        let guest = try share.guestClient(token: inviteToken, payload: payload)
        let reloaded = try await guest.trip(id: "trip_1")
        #expect(reloaded.shareMode == .anyoneEdit)
        let mutation: TripPayload = try await guest.api(
            "POST", path: "api/trips/trip_1/expenses", body: Data("{}".utf8))
        #expect(mutation.shareMode == .anyoneEdit)
        for path in [
            "api/user", "api/trips", "api/trips/trip_10", "api/trips/trip_1-other",
            "api/share/\(inviteToken)",
            "api/trips/trip_1/../trip_2", "api/trips/trip_1/%2e%2e/trip_2",
            "https://evil.example/api/trips/trip_1",
        ] {
            await #expect(throws: (any Error).self) { _ = try await guest.data("GET", path: path) }
        }
        await #expect(throws: (any Error).self) {
            _ = try await guest.data(
                "GET", path: "api/trips/trip_1", headers: ["Cookie": "account=secret"])
        }
        let requests = await transport.requests
        #expect(requests.count == 3)
        for request in requests.dropFirst() {
            #expect(request.value(forHTTPHeaderField: "X-Otter-Share-Token") == inviteToken)
            #expect(request.value(forHTTPHeaderField: "Authorization") == nil)
            #expect(request.value(forHTTPHeaderField: "Cookie") == nil)
        }
        let permissions = TripPermissions(payload: reloaded, auth: guest.auth, userID: nil)
        #expect(permissions.allows(.editDailyData))
        #expect(!permissions.allows(.manageAccess))
        #expect(!permissions.allows(.queueExpense))
        #expect(throws: IncomingLinkError.self) {
            _ = try share.guestClient(
                token: inviteToken,
                payload: TripPayload(trip: payload.trip, readonly: true, shareMode: .readonly))
        }
    }

    @Test func joiningRequiresSameOriginSessionBeforeAnyRequest() async throws {
        let publicTransport = IncomingTransport([#"{"mode":"signed-in-edit","tripName":"Trip"}"#])
        let share = try ShareClient(origin: incomingOrigin, transport: publicTransport)
        let accountTransport = IncomingTransport(["{\"tripId\":\"trip_1\"}", publicTripJSON()])
        for (origin, auth) in [
            ("https://evil.example", ClientAuthentication.session(SessionCookie(value: "secret"))),
            ("https://otter.example:444", .session(SessionCookie(value: "secret"))),
            ("https://otter.example.evil", .session(SessionCookie(value: "secret"))),
            ("https://otter.example", .bearer("secret")), ("https://otter.example", .anonymous),
            ("https://otter.example", .share(tripID: "trip_1", token: inviteToken)),
        ] {
            let client = try OtterClient(server: origin, auth: auth, transport: accountTransport)
            await #expect(throws: (any Error).self) {
                _ = try await share.join(token: inviteToken, session: client)
            }
        }
        #expect(await accountTransport.requests.isEmpty)
        #expect(await publicTransport.requests.isEmpty)
        let account = try OtterClient(
            server: "https://OTTER.example:443", auth: .session(SessionCookie(value: "secret")),
            transport: accountTransport)
        _ = try await share.join(token: inviteToken, session: account)
        let requests = await accountTransport.requests
        #expect(requests.count == 2)
        #expect(requests[0].httpMethod == "POST")
        #expect(requests[0].url?.path == "/api/share/\(inviteToken)/join")
        #expect(requests[1].url?.path == "/api/trips/trip_1")
        for request in requests {
            #expect(request.value(forHTTPHeaderField: "Cookie") == "otter_session=secret")
            #expect(request.value(forHTTPHeaderField: "Authorization") == nil)
            #expect(request.value(forHTTPHeaderField: "X-Otter-Share-Token") == nil)
        }
    }

    @Test func invalidTokenAndJoinResponseCannotEscapePath() async throws {
        let transport = IncomingTransport([#"{"tripId":"../other"}"#])
        let share = try ShareClient(origin: incomingOrigin, transport: transport)
        await #expect(throws: IncomingLinkError.self) { _ = try await share.open(token: "../bad") }
        #expect(await transport.requests.isEmpty)
        let account = try OtterClient(
            server: incomingOrigin.absoluteString, auth: .session(SessionCookie(value: "secret")),
            transport: transport)
        await #expect(throws: IncomingLinkError.self) {
            _ = try await share.join(token: inviteToken, session: account)
        }
        #expect(await transport.requests.count == 1)
    }

    @Test func shareErrorsDoNotExposeCapabilities() async throws {
        let transport = IncomingTransport(["{\"error\":\"\(inviteToken)\"}"], status: 403)
        let share = try ShareClient(origin: incomingOrigin, transport: transport)
        do {
            _ = try await share.open(token: inviteToken)
            Issue.record("Expected failure")
        } catch { #expect(!error.localizedDescription.contains(inviteToken)) }
        let payload = TripPayload(
            trip: Trip(id: "trip_1", name: "Trip", baseCurrency: .jpy), shareMode: .anyoneEdit)
        let guest = try share.guestClient(token: inviteToken, payload: payload)
        do {
            _ = try await guest.trip(id: "trip_1")
            Issue.record("Expected failure")
        } catch { #expect(!error.localizedDescription.contains(inviteToken)) }
    }

    @Test @MainActor func ephemeralWorkspaceCannotReadOrReplaceStoredAccount() async throws {
        let transport = IncomingTransport(["{}"])
        let guest = try OtterClient(
            server: incomingOrigin.absoluteString,
            auth: .share(tripID: "trip_1", token: inviteToken), transport: transport)
        let workspace = try AppSession(ephemeralClient: guest)
        #expect(workspace.client === guest)
        #expect(!workspace.isRestoring)
        #expect(workspace.user == nil)
        await workspace.restore()
        await workspace.signIn(server: incomingOrigin.absoluteString, token: "secret")
        await workspace.signIn(
            server: incomingOrigin.absoluteString, username: "user", password: "password")
        #expect(workspace.client === guest)
        let account = try OtterClient(
            server: incomingOrigin.absoluteString,
            auth: .session(SessionCookie(value: "secret")), transport: transport)
        #expect(throws: APIError.self) { _ = try AppSession(ephemeralClient: account) }
        #expect(throws: APIError.self) {
            try workspace.acceptLogin(
                AuthenticatedLogin(
                    client: account, user: User(id: "u", name: "User", username: "user")),
                for: workspace.sessionID)
        }
        #expect(workspace.client === guest)
        #expect(await transport.requests.isEmpty)
        await workspace.signOut()
        #expect(workspace.client == nil)
        #expect(await transport.requests.isEmpty)
    }
}
