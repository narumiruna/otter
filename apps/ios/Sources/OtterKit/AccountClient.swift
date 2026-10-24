import Foundation
import Security

public struct AuthenticatedLogin: Sendable {
    public let client: OtterClient
    public let user: User
}

public struct ApiToken: Codable, Identifiable, Sendable {
    public let createdAt: String
    public let expiresAt: String
    public let id: String
    public let name: String
}
public struct ApiTokensResponse: Codable, Sendable { public let tokens: [ApiToken] }
public struct CreateApiTokenRequest: Codable, Sendable {
    public let accessToken: String
    public let id: String
    public let name: String
    public init(name: String) throws {
        var bytes = [UInt8](repeating: 0, count: 32)
        guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else {
            throw APIError.invalidResponse
        }
        accessToken = "otter_api_" + Data(bytes).base64URL
        id = "token_" + UUID().uuidString.lowercased()
        self.name = WebText.trim(name)
    }
}
public struct CreateApiTokenResponse: Codable, Sendable {
    public let accessToken: String
    public let token: ApiToken
}
public struct DeviceInspection: Codable, Sendable {
    public let clientName: String
    public let expiresAt: String
    public let userCode: String
}
public struct PasskeySummary: Codable, Identifiable, Sendable {
    public let id: String
    public let createdAt: String
    public let lastUsedAt: String?
    public let backedUp: Bool
    public let deviceType: String
}
public struct PasskeysResponse: Codable, Sendable { public let passkeys: [PasskeySummary] }

/// Preserves the WebAuthn JSON shape without converting it through untyped dictionaries.
public enum JSONValue: Codable, Sendable, Equatable {
    case object([String: JSONValue])
    case array([JSONValue])
    case string(String)
    case number(Double)
    case bool(Bool)
    case null
    public init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() {
            self = .null
        } else if let value = try? c.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? c.decode(String.self) {
            self = .string(value)
        } else if let value = try? c.decode(Double.self) {
            self = .number(value)
        } else if let value = try? c.decode([String: JSONValue].self) {
            self = .object(value)
        } else {
            self = .array(try c.decode([JSONValue].self))
        }
    }
    public func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .object(let value): try c.encode(value)
        case .array(let value): try c.encode(value)
        case .string(let value): try c.encode(value)
        case .number(let value): try c.encode(value)
        case .bool(let value): try c.encode(value)
        case .null: try c.encodeNil()
        }
    }
    public subscript(_ key: String) -> JSONValue? {
        if case .object(let v) = self { v[key] } else { nil }
    }
    public var string: String? { if case .string(let value) = self { value } else { nil } }
    public var array: [JSONValue]? { if case .array(let value) = self { value } else { nil } }
}
public struct PasskeyCeremony: Codable, Sendable {
    public let challengeId: String
    public let options: JSONValue
}

extension Data {
    public var base64URL: String {
        base64EncodedString().replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
    }
    public init?(base64URL: String) {
        let value = base64URL.replacingOccurrences(of: "-", with: "+").replacingOccurrences(
            of: "_", with: "/")
        self.init(
            base64Encoded: value.padding(
                toLength: ((value.count + 3) / 4) * 4, withPad: "=", startingAt: 0))
    }
}

extension OtterClient {
    public func passwordLogin(
        username: String, password: String, register: Bool = false, challengeID: String? = nil
    ) async throws -> AuthenticatedLogin {
        guard case .anonymous = auth else { throw APIError.invalidToken }
        struct Body: Encodable {
            let username: String
            let password: String
            let challengeId: String?
        }
        let (bytes, response) = try await perform(
            "POST", path: "api/auth/" + (register ? "register" : "login"),
            body: encode(
                Body(
                    username: WebText.trim(username).lowercased(),
                    password: password, challengeId: challengeID)))
        guard let result = try? JSONDecoder().decode(UserResponse.self, from: bytes),
            let user = result.user
        else { throw APIError.invalidResponse }
        let cookie = try SessionCookie.read(from: response, origin: baseURL)
        let authenticated = try OtterClient(
            server: baseURL.absoluteString, auth: .session(cookie), transport: transport)
        return AuthenticatedLogin(client: authenticated, user: user)
    }
    public func logout() async throws {
        try requireSession()
        let _: OkResponse = try await api("POST", path: "api/auth/logout")
    }
    public func updateUsername(_ username: String) async throws -> User {
        try requireSession()
        let result: UserResponse = try await api(
            "PATCH", path: "api/me", body: encode(["username": username]))
        guard let user = result.user else { throw APIError.invalidResponse }
        return user
    }
    public func tokens() async throws -> ApiTokensResponse {
        try requireSession()
        return try await api("GET", path: "api/auth/tokens")
    }
    public func createToken(_ request: CreateApiTokenRequest) async throws -> CreateApiTokenResponse
    {
        try requireSession()
        return try await api("POST", path: "api/auth/tokens", body: encode(request))
    }
    public func revokeToken(id: String) async throws {
        try requireSession()
        let _: OkResponse = try await api("DELETE", path: "api/auth/tokens/" + Self.identifier(id))
    }
    public func revokeCurrentToken() async throws {
        guard auth.isBearer else { throw APIError.invalidToken }
        let _: OkResponse = try await api("DELETE", path: "api/auth/tokens/current")
    }
    public func inspectDevice(code: String) async throws -> DeviceInspection {
        try requireSession()
        return try await api(
            "GET",
            path: "api/auth/device/"
                + Self.identifier(code.uppercased().replacingOccurrences(of: " ", with: "")))
    }
    public func approveDevice(code: String) async throws {
        try requireSession()
        let _: OkResponse = try await api(
            "POST", path: "api/auth/device/approve", body: encode(["userCode": code]))
    }
    public func passkeys() async throws -> PasskeysResponse {
        try requireSession()
        return try await api("GET", path: "api/passkeys")
    }
    public func removePasskey(id: String) async throws {
        try requireSession()
        let _: OkResponse = try await api("DELETE", path: "api/passkeys/" + Self.identifier(id))
    }
    public func passkeyLoginOptions() async throws -> PasskeyCeremony {
        guard case .anonymous = auth else { throw APIError.invalidToken }
        return try await api("POST", path: "api/auth/passkey/options")
    }
    public func passkeySignupOptions(username: String, challengeID: String? = nil) async throws
        -> PasskeyCeremony
    {
        guard case .anonymous = auth else { throw APIError.invalidToken }
        struct Body: Encodable {
            let username: String
            let challengeId: String?
        }
        return try await api(
            "POST", path: "api/auth/passkey/register/options",
            body: encode(Body(username: username, challengeId: challengeID)))
    }
    public func passkeyRegistrationOptions() async throws -> PasskeyCeremony {
        try requireSession()
        return try await api("POST", path: "api/passkeys/registration/options")
    }
    public func finishPasskeyLogin(
        ceremony: PasskeyCeremony, response: JSONValue, signup: Bool = false
    ) async throws -> AuthenticatedLogin {
        guard case .anonymous = auth else { throw APIError.invalidToken }
        let body = JSONValue.object([
            "challengeId": .string(ceremony.challengeId), "response": response,
        ])
        let (_, http) = try await perform(
            "POST", path: signup ? "api/auth/passkey/register/verify" : "api/auth/passkey/verify",
            body: encode(body))
        let cookie = try SessionCookie.read(from: http, origin: baseURL)
        let authenticated = try OtterClient(
            server: baseURL.absoluteString, auth: .session(cookie), transport: transport)
        return AuthenticatedLogin(client: authenticated, user: try await authenticated.user())
    }
    public func finishPasskeyRegistration(ceremony: PasskeyCeremony, response: JSONValue)
        async throws
    {
        try requireSession()
        let _: OkResponse = try await api(
            "POST", path: "api/passkeys/registration/verify",
            body: encode(
                JSONValue.object([
                    "challengeId": .string(ceremony.challengeId), "response": response,
                ])))
    }
}
