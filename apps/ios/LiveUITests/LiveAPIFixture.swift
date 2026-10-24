import Foundation

/// Uses only public REST endpoints. Credentials and the session cookie stay in memory.
@MainActor
final class LiveAPIFixture {
    struct Credentials {
        let username: String
        let password: String

        static func unique(_ prefix: String) -> Self {
            Self(
                username: prefix + "-" + UUID().uuidString.prefix(12).lowercased(),
                password: UUID().uuidString + "-aA1")
        }
    }

    struct Person: Decodable {
        let id: String
        let name: String
    }

    struct Expense: Decodable {
        let description: String
        let amountMinor: Int
        let version: Int
    }

    struct Payment: Decodable {
        let amountMinor: Int
        let paidAt: String
        let note: String
    }

    struct Trip: Decodable {
        let id: String
        let name: String
        let allowApiWrites: Bool
        let archivedAt: String?
        let participants: [Person]
        let expenses: [Expense]
        let settlementPayments: [Payment]?
    }

    struct Payload: Decodable {
        let trip: Trip
    }

    private struct TripList: Decodable {
        struct Summary: Decodable {
            let id: String
            let name: String
        }
        let trips: [Summary]
    }

    private struct Login: Encodable {
        let username: String
        let password: String
    }

    private struct Account: Decodable {
        struct User: Decodable { let username: String }
        let user: User
    }

    private struct NewTrip: Encodable {
        let name: String
        let baseCurrency = "TWD"
    }

    private struct NewPerson: Encodable { let name: String }

    private struct NewExpense: Encodable {
        let description: String
        let amount = "100"
        let currency = "TWD"
        let paidById: String
        let participantIds: [String]
        let expenseDate = "2026-09-19"
        let splitMode = "amount"
        let splitValues: [String: String]
    }

    private enum Failure: Error {
        case invalidOrigin, invalidPath, response, credentials, authentication, cookie, people,
            missingTrip
        case httpStatus(Int)
    }

    private struct DecodingFailure: Error, CustomStringConvertible {
        let description: String
    }

    // Node registers one account before UI testing. Each runner process logs in separately.
    // Cache failures within this process too: do not repeat a failed login.
    private static var accounts: [String: Task<LiveAPIFixture, Error>] = [:]

    static func origin() throws -> URL {
        guard let raw = ProcessInfo.processInfo.environment["OTTER_IOS_TEST_ORIGIN"],
            let url = URL(string: raw), url.scheme == "http", url.host == "localhost",
            let port = url.port, (1...65535).contains(port), url.path.isEmpty,
            url.user == nil, url.password == nil, url.query == nil, url.fragment == nil
        else { throw Failure.invalidOrigin }
        return url
    }

    static func shared(origin: URL) async throws -> LiveAPIFixture {
        let key = origin.absoluteString
        if let task = accounts[key] { return try await task.value }
        let task = Task { @MainActor in
            let fixture = try LiveAPIFixture(origin: origin)
            try await fixture.login()
            return fixture
        }
        accounts[key] = task
        return try await task.value
    }

    static var passwords: [String] = []
    let credentials: Credentials
    let origin: URL
    private let session: URLSession
    private var cookie: String?

    private init(origin: URL) throws {
        // Xcode removes TEST_RUNNER_ when it forwards these values to XCTest only.
        let environment = ProcessInfo.processInfo.environment
        guard let username = environment["OTTER_IOS_FIXTURE_USERNAME"],
            username.range(of: "^[a-z0-9_-]{3,32}$", options: .regularExpression) != nil,
            let password = environment["OTTER_IOS_FIXTURE_PASSWORD"], password.count >= 8,
            password == password.trimmingCharacters(in: .whitespacesAndNewlines)
        else { throw Failure.credentials }
        credentials = Credentials(username: username, password: password)
        self.origin = origin
        let configuration = URLSessionConfiguration.ephemeral
        configuration.httpCookieStorage = nil
        configuration.httpShouldSetCookies = false
        configuration.httpCookieAcceptPolicy = .never
        configuration.urlCache = nil
        configuration.urlCredentialStorage = nil
        configuration.requestCachePolicy = .reloadIgnoringLocalAndRemoteCacheData
        configuration.timeoutIntervalForRequest = 15
        configuration.timeoutIntervalForResource = 20
        session = URLSession(
            configuration: configuration, delegate: NoFixtureRedirects(), delegateQueue: nil)
        Self.passwords.append(credentials.password)
    }

    private func login() async throws {
        let (data, response) = try await send(
            "POST", ["api", "auth", "login"],
            body: JSONEncoder().encode(
                Login(username: credentials.username, password: credentials.password)))
        let account: Account = try decode(data, status: response.statusCode)
        guard account.user.username == credentials.username else { throw Failure.authentication }
        guard let header = response.value(forHTTPHeaderField: "Set-Cookie") else {
            throw Failure.cookie
        }
        let cookies = HTTPCookie.cookies(
            withResponseHeaderFields: ["Set-Cookie": header], for: origin)
        guard cookies.count == 1, let own = cookies.first,
            own.name == "otter_session", own.domain == "localhost", own.path == "/",
            !own.isSecure, !own.value.isEmpty,
            own.expiresDate.map({ $0 > Date() }) ?? true,
            own.value.range(of: "^[A-Za-z0-9_-]+$", options: .regularExpression) != nil
        else { throw Failure.cookie }
        cookie = own.name + "=" + own.value
    }

    func createGroup(name: String, friend: String) async throws -> Trip {
        let created: Payload = try await request(
            "POST", ["api", "trips"], body: JSONEncoder().encode(NewTrip(name: name)))
        let added: Payload = try await request(
            "POST", ["api", "trips", created.trip.id, "participants"],
            body: JSONEncoder().encode(NewPerson(name: friend)))
        guard added.trip.participants.count == 2,
            added.trip.participants.contains(where: { $0.name == credentials.username }),
            added.trip.participants.contains(where: { $0.name == friend }),
            !added.trip.allowApiWrites, added.trip.expenses.isEmpty
        else { throw Failure.people }
        return added.trip
    }

    func trip(id: String) async throws -> Trip {
        let payload: Payload = try await request("GET", ["api", "trips", id])
        return payload.trip
    }

    func trip(named name: String) async throws -> Trip {
        let list: TripList = try await request("GET", ["api", "trips"])
        let matches = list.trips.filter { $0.name == name }
        guard matches.count == 1, let match = matches.first else { throw Failure.missingTrip }
        return try await trip(id: match.id)
    }

    func seedUnequalExpense(in trip: Trip, description: String) async throws -> Trip {
        guard trip.participants.count == 2,
            let payer = trip.participants.first(where: { $0.name == credentials.username }),
            let friend = trip.participants.first(where: { $0.id != payer.id })
        else { throw Failure.people }
        let payload: Payload = try await request(
            "POST", ["api", "trips", trip.id, "expenses"],
            body: JSONEncoder().encode(
                NewExpense(
                    description: description, paidById: payer.id,
                    participantIds: [payer.id, friend.id],
                    splitValues: [payer.id: "25", friend.id: "75"])))
        return payload.trip
    }

    private func request<Result: Decodable>(
        _ method: String, _ segments: [String], body: Data? = nil
    ) async throws -> Result {
        let (data, response) = try await send(method, segments, body: body)
        return try decode(data, status: response.statusCode)
    }

    private func decode<Result: Decodable>(_ data: Data, status: Int) throws -> Result {
        do {
            return try JSONDecoder().decode(Result.self, from: data)
        } catch let error as DecodingError {
            throw safeDecodingError(error, status: status)
        } catch {
            throw Failure.response
        }
    }

    private func safeDecodingError(_ error: DecodingError, status: Int) -> DecodingFailure {
        let kind: String
        let path: [any CodingKey]
        switch error {
        case .keyNotFound(let key, let context):
            kind = "keyNotFound"
            path = context.codingPath + [key]
        case .valueNotFound(_, let context):
            kind = "valueNotFound"
            path = context.codingPath
        case .typeMismatch(_, let context):
            kind = "typeMismatch"
            path = context.codingPath
        case .dataCorrupted(let context):
            kind = "dataCorrupted"
            path = context.codingPath
        @unknown default:
            kind = "unknown"
            path = []
        }
        // Only schema keys and array indexes are included. Never include response data,
        // context.debugDescription, or an underlying error that can contain that data.
        let location = path.reduce("$") { result, key in
            if let index = key.intValue { return result + "[\(index)]" }
            return result + "." + key.stringValue
        }
        return DecodingFailure(description: "HTTP \(status): JSON \(kind) at \(location)")
    }

    private func send(_ method: String, _ segments: [String], body: Data?) async throws
        -> (Data, HTTPURLResponse)
    {
        guard segments.first == "api",
            segments.allSatisfy({
                $0.range(of: "^[A-Za-z0-9_-]+$", options: .regularExpression) != nil
            }), var components = URLComponents(url: origin, resolvingAgainstBaseURL: false)
        else { throw Failure.invalidPath }
        components.path = "/" + segments.joined(separator: "/")
        guard let url = components.url, url.scheme == origin.scheme,
            url.host == origin.host, url.port == origin.port
        else { throw Failure.invalidOrigin }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.httpBody = body
        request.httpShouldHandleCookies = false
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(origin.absoluteString, forHTTPHeaderField: "Origin")
        if let cookie { request.setValue(cookie, forHTTPHeaderField: "Cookie") }
        let result: (Data, URLResponse)
        do { result = try await session.data(for: request) } catch { throw Failure.response }
        guard let response = result.1 as? HTTPURLResponse, response.url == url else {
            throw Failure.response
        }
        guard (200..<300).contains(response.statusCode) else {
            throw Failure.httpStatus(response.statusCode)
        }
        return (result.0, response)
    }
}

/// Refuse redirects before URLSession can forward a request body or Cookie header.
private final class NoFixtureRedirects: NSObject, URLSessionTaskDelegate {
    func urlSession(
        _ session: URLSession, task: URLSessionTask,
        willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest,
        completionHandler: @escaping @Sendable (URLRequest?) -> Void
    ) {
        completionHandler(nil)
    }
}
