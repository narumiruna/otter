import Foundation
import Security

struct SavedSession: Codable {
    let server: String
    let auth: ClientAuthentication
    let user: User?
    var token: String { if case .bearer(let token) = auth { token } else { "" } }

    init(server: String, token: String) {
        self.server = server
        auth = .bearer(token)
        user = nil
    }
    init(server: String, auth: ClientAuthentication, user: User?) {
        self.server = server
        self.auth = auth
        self.user = user
    }
    enum CodingKeys: String, CodingKey { case server, auth, user, token }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        server = try c.decode(String.self, forKey: .server)
        auth =
            try c.decodeIfPresent(ClientAuthentication.self, forKey: .auth)
            ?? .bearer(c.decode(String.self, forKey: .token))
        user = try c.decodeIfPresent(User.self, forKey: .user)
    }
    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(server, forKey: .server)
        try c.encode(auth, forKey: .auth)
        try c.encodeIfPresent(user, forKey: .user)
    }
}

@MainActor
protocol CredentialStore {
    func load() throws -> SavedSession?
    func save(_ value: SavedSession) throws
    func delete() throws
}

struct SessionStore: CredentialStore {
    private let service: String
    private let account: String

    init(service: String = "dev.narumi.otter.ios", account: String = "api-session") {
        self.service = service
        self.account = account
    }

    private var query: [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecAttrSynchronizable as String: false,
        ]
    }

    func load() throws -> SavedSession? {
        var request = query
        request[kSecReturnData as String] = true
        request[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        let status = SecItemCopyMatching(request as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = result as? Data else {
            throw KeychainError(status: status)
        }
        return try JSONDecoder().decode(SavedSession.self, from: data)
    }

    func save(_ value: SavedSession) throws {
        let data = try JSONEncoder().encode(value)
        let attributes: [String: Any] = [
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
        ]
        let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound {
            var item = query
            for (key, value) in attributes { item[key] = value }
            let addStatus = SecItemAdd(item as CFDictionary, nil)
            guard addStatus == errSecSuccess else { throw KeychainError(status: addStatus) }
        } else if status != errSecSuccess {
            throw KeychainError(status: status)
        }
    }

    func delete() throws {
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError(status: status)
        }
    }
}

private struct KeychainError: LocalizedError {
    let status: OSStatus
    var errorDescription: String? {
        NativeLocalization.string("無法存取裝置 Keychain（\(status)）。請解鎖裝置後再試。")
    }
}
