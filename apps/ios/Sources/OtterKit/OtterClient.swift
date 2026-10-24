import Foundation

public protocol HTTPTransport: Sendable {
    func data(for request: URLRequest) async throws -> (Data, HTTPURLResponse)
}

private final class RedirectBlocker: NSObject, URLSessionTaskDelegate, Sendable {
    func urlSession(
        _ session: URLSession, task: URLSessionTask,
        willPerformHTTPRedirection response: HTTPURLResponse,
        newRequest request: URLRequest,
        completionHandler: @escaping @Sendable (URLRequest?) -> Void
    ) {
        completionHandler(nil)
    }
}

public struct URLSessionTransport: HTTPTransport {
    private let session: URLSession
    private let redirectBlocker = RedirectBlocker()

    public init() {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.httpCookieStorage = nil
        configuration.httpShouldSetCookies = false
        configuration.urlCache = nil
        configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
        configuration.timeoutIntervalForRequest = 30
        configuration.timeoutIntervalForResource = 60
        session = URLSession(configuration: configuration)
    }

    public func data(for request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        let (data, response) = try await session.data(for: request, delegate: redirectBlocker)
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }
        return (data, http)
    }
}

private actor ClientMutationGate {
    private var locked = false
    private var waiting: [CheckedContinuation<Void, Never>] = []
    func run<T: Sendable>(_ operation: @Sendable () async throws -> T) async rethrows -> T {
        if locked { await withCheckedContinuation { waiting.append($0) } } else { locked = true }
        defer {
            if waiting.isEmpty { locked = false } else { waiting.removeFirst().resume() }
        }
        return try await operation()
    }
}

public final class OtterClient: Sendable {
    public let baseURL: URL
    public let auth: ClientAuthentication
    let transport: any HTTPTransport
    private let mutations = ClientMutationGate()

    public convenience init(
        server: String, token: String, transport: any HTTPTransport = URLSessionTransport()
    ) throws {
        try self.init(
            server: server, auth: .bearer(token.trimmingCharacters(in: .whitespacesAndNewlines)),
            transport: transport)
    }

    public init(
        server: String, auth: ClientAuthentication = .anonymous,
        transport: any HTTPTransport = URLSessionTransport()
    ) throws {
        let trimmed = server.trimmingCharacters(in: .whitespacesAndNewlines)
        guard var parts = URLComponents(string: trimmed), let host = parts.host, !host.isEmpty,
            parts.scheme == "https" || (parts.scheme == "http" && host == "localhost"),
            parts.user == nil, parts.password == nil, parts.query == nil, parts.fragment == nil,
            parts.path.isEmpty || parts.path == "/",
            parts.port.map({ (1...65535).contains($0) }) ?? true
        else { throw APIError.invalidServer }
        parts.path = ""
        guard let url = parts.url else { throw APIError.invalidServer }
        switch auth {
        case .bearer(let token):
            guard !token.isEmpty, token.count <= 4096,
                token.range(of: "^[A-Za-z0-9._~+/-]+=*$", options: .regularExpression) != nil
            else { throw APIError.invalidToken }
        case .session(let cookie):
            guard cookie.isValid, !(cookie.secure && url.scheme != "https") else {
                throw APIError.invalidToken
            }
        case .share(let tripID, let token):
            _ = try Self.identifier(tripID)
            guard token.utf8.count == 43,
                token.utf8.allSatisfy({
                    (65...90).contains($0) || (97...122).contains($0) || (48...57).contains($0)
                        || $0 == 45 || $0 == 95
                })
            else { throw APIError.invalidToken }
        case .anonymous: break
        }
        baseURL = url
        self.auth = auth
        self.transport = transport
    }

    public func api<T: Decodable & Sendable>(
        _ method: String, path: String, body: Data? = nil, version: Int? = nil,
        headers: [String: String] = [:]
    ) async throws -> T {
        let (data, _) = try await perform(
            method, path: path, body: body, version: version, headers: headers)
        do { return try JSONDecoder().decode(T.self, from: data) } catch {
            throw APIError.invalidResponse
        }
    }

    public func data(
        _ method: String, path: String, body: Data? = nil, version: Int? = nil,
        headers: [String: String] = [:]
    ) async throws -> Data {
        try await perform(method, path: path, body: body, version: version, headers: headers).0
    }

    func perform(
        _ method: String, path: String, body: Data? = nil, version: Int? = nil,
        headers: [String: String] = [:]
    ) async throws -> (Data, HTTPURLResponse) {
        let relative = path.hasPrefix("/") ? String(path.dropFirst()) : path
        guard !relative.contains("://"), !relative.contains("\\"),
            let suffix = URLComponents(string: relative), suffix.scheme == nil, suffix.host == nil,
            suffix.fragment == nil,
            suffix.path.split(separator: "/").allSatisfy({ $0 != "." && $0 != ".." }),
            suffix.path.hasPrefix("api/")
        else { throw APIError.invalidIdentifier }
        var target = URLComponents(url: baseURL, resolvingAgainstBaseURL: false)!
        target.path = "/" + suffix.path
        target.percentEncodedQuery = suffix.percentEncodedQuery
        guard let url = target.url else { throw APIError.invalidIdentifier }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.httpBody = body
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if method != "GET" && method != "HEAD" {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        for (name, value) in headers {
            guard
                !["authorization", "cookie", "x-otter-share-token", "host", "origin", "referer"]
                    .contains(name.lowercased()),
                !value.contains("\r"), !value.contains("\n")
            else { throw APIError.invalidIdentifier }
            request.setValue(value, forHTTPHeaderField: name)
        }
        switch auth {
        case .anonymous: break
        case .bearer(let token):
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        case .session(let cookie):
            guard cookie.expiresAt.map({ $0 > Date() }) ?? true else { throw APIError.unauthorized }
            request.setValue("otter_session=\(cookie.value)", forHTTPHeaderField: "Cookie")
        case .share(let tripID, let token):
            let prefix = "api/trips/\(tripID)"
            guard suffix.path == prefix || suffix.path.hasPrefix(prefix + "/") else {
                throw APIError.unauthorized
            }
            request.setValue(token, forHTTPHeaderField: "X-Otter-Share-Token")
        }
        if let version {
            guard version > 0, version <= 9_007_199_254_740_991 else {
                throw APIError.missingVersion
            }
            request.setValue("\"\(version)\"", forHTTPHeaderField: "If-Match")
        }
        try Task.checkCancellation()
        let finalRequest = request
        let result: (Data, HTTPURLResponse)
        if method == "GET" || method == "HEAD" {
            result = try await transport.data(for: finalRequest)
        } else {
            result = try await mutations.run {
                try Task.checkCancellation()
                return try await self.transport.data(for: finalRequest)
            }
        }
        let (data, response) = result
        guard response.url == request.url else { throw APIError.invalidResponse }
        if response.statusCode == 401 { throw APIError.unauthorized }
        guard (200...299).contains(response.statusCode) else {
            let error = try? JSONDecoder().decode(ErrorBody.self, from: data)
            let retry = response.value(forHTTPHeaderField: "Retry-After").flatMap(TimeInterval.init)
            throw APIResponseError(
                status: response.statusCode, code: error?.code,
                message: error?.error
                    ?? NativeLocalization.string("伺服器錯誤（HTTP \(response.statusCode)）。"),
                retryAfter: retry)
        }
        return (data, response)
    }

    struct ErrorBody: Decodable {
        let error: String
        let code: String?
    }

    static func identifier(_ id: String) throws -> String {
        guard (1...200).contains(id.count),
            id.utf8.allSatisfy({
                (65...90).contains($0) || (97...122).contains($0) || (48...57).contains($0)
                    || $0 == 45 || $0 == 95
            })
        else { throw APIError.invalidIdentifier }
        return id
    }

    func tripPath(_ id: String) throws -> String { "api/trips/" + (try Self.identifier(id)) }

    func encode<T: Encodable>(_ value: T) throws -> Data { try JSONEncoder().encode(value) }
}
