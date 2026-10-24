import Foundation

public enum AIClientError: Error, LocalizedError, Sendable {
    case sessionRequired

    public var errorDescription: String? {
        NativeLocalization.string("AI 設定需要帳號登入；API token 或分享連結不能使用此功能。")
    }
}

extension OtterClient {
    public func aiCatalog() async throws -> AICatalogResponse {
        try await aiRequest("GET", path: "catalog")
    }

    public func aiSettings() async throws -> AISettingsResponse {
        try await aiRequest("GET", path: "settings")
    }

    public func aiConnections() async throws -> AIConnectionsResponse {
        try await aiRequest("GET", path: "connections")
    }

    public func saveAISettings(_ settings: AISettings) async throws -> AISettingsResponse {
        try await aiRequest("PUT", path: "settings", body: JSONEncoder().encode(settings))
    }

    public func startAILogin(provider: String, method: AIAuthMethod) async throws -> AILoginResponse
    {
        struct Body: Encodable {
            let provider: String
            let method: AIAuthMethod
        }
        return try await aiRequest(
            "POST", path: "logins",
            body: JSONEncoder().encode(Body(provider: provider, method: method)))
    }

    public func aiLogin(id: String) async throws -> AILoginResponse {
        try await aiRequest("GET", path: "logins/" + aiIdentifier(id))
    }

    public func respondToAILogin(id: String, promptID: String, value: String) async throws
        -> AILoginResponse
    {
        struct Body: Encodable {
            let promptId: String
            let value: String
        }
        return try await aiRequest(
            "POST", path: "logins/" + aiIdentifier(id) + "/respond",
            body: JSONEncoder().encode(Body(promptId: promptID, value: value)))
    }

    @discardableResult
    public func cancelAILogin(id: String) async throws -> AIOKResponse {
        try await aiRequest("DELETE", path: "logins/" + aiIdentifier(id))
    }

    @discardableResult
    public func disconnectAIProvider(_ provider: String) async throws -> AIOKResponse {
        try await aiRequest("DELETE", path: "connections/" + aiIdentifier(provider))
    }

    private func aiRequest<T: Decodable & Sendable>(
        _ method: String, path: String, body: Data? = nil
    ) async throws -> T {
        // Fail before transport. These routes reject mixed cookie/Bearer/share credentials.
        guard auth.isSession else { throw AIClientError.sessionRequired }
        return try await api(
            method, path: "api/auth/ai/" + path, body: body,
            headers: method == "GET" ? [:] : ["Content-Type": "application/json"])
    }

    private func aiIdentifier(_ value: String) throws -> String {
        guard (1...200).contains(value.utf8.count), value != ".", value != "..",
            value.utf8.allSatisfy({
                (65...90).contains($0) || (97...122).contains($0) || (48...57).contains($0)
                    || $0 == 45 || $0 == 95 || $0 == 46
            })
        else { throw APIError.invalidIdentifier }
        return value
    }
}
