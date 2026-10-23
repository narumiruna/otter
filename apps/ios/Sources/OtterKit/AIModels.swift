import Foundation

public enum AIAuthMethod: String, Codable, Sendable, CaseIterable {
    case oauth
    case apiKey = "api_key"
}

public enum AIThinkingLevel: String, Codable, Sendable, CaseIterable {
    case off, minimal, low, medium, high, xhigh, max
}

public struct AISettings: Codable, Sendable, Equatable {
    public var provider: String
    public var model: String
    public var thinkingLevel: AIThinkingLevel

    public init(provider: String, model: String, thinkingLevel: AIThinkingLevel) {
        self.provider = provider
        self.model = model
        self.thinkingLevel = thinkingLevel
    }
}

public struct AIModelOption: Codable, Sendable, Equatable, Identifiable {
    public let id: String
    public let name: String
    public let thinkingLevels: [AIThinkingLevel]
}

public struct AIProviderOption: Codable, Sendable, Equatable, Identifiable {
    public let id: String
    public let name: String
    public let authMethods: [AIAuthMethod]
    public let models: [AIModelOption]
}

public struct AICatalogResponse: Codable, Sendable, Equatable {
    public let providers: [AIProviderOption]
    public let authenticationEnabled: Bool
}

public struct AISettingsResponse: Codable, Sendable, Equatable {
    public let settings: AISettings?

    private enum CodingKeys: String, CodingKey { case settings }

    public init(from decoder: any Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        settings = try values.decode(AISettings?.self, forKey: .settings)
    }

    public func encode(to encoder: any Encoder) throws {
        var values = encoder.container(keyedBy: CodingKeys.self)
        try values.encode(settings, forKey: .settings)
    }
}

public struct AIConnection: Codable, Sendable, Equatable, Identifiable {
    public let provider: String
    public let method: AIAuthMethod
    public var id: String { provider }
}

public struct AIConnectionsResponse: Codable, Sendable, Equatable {
    public let connections: [AIConnection]
}

public struct AIAuthLink: Codable, Sendable, Equatable {
    public let url: String
    public let label: String?
}

public enum AIAuthEvent: Codable, Sendable, Equatable {
    case info(message: String, links: [AIAuthLink]?)
    case authURL(url: String, instructions: String?)
    case deviceCode(
        userCode: String, verificationURI: String, intervalSeconds: Int?, expiresInSeconds: Int?)
    case progress(message: String)

    private enum Kind: String, Codable {
        case info
        case authURL = "auth_url"
        case deviceCode = "device_code"
        case progress
    }
    private enum CodingKeys: String, CodingKey {
        case type, message, links, url, instructions, userCode, verificationUri
        case intervalSeconds, expiresInSeconds
    }

    public init(from decoder: any Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        switch try values.decode(Kind.self, forKey: .type) {
        case .info:
            self = .info(
                message: try values.decode(String.self, forKey: .message),
                links: try values.decodeIfPresent([AIAuthLink].self, forKey: .links))
        case .authURL:
            self = .authURL(
                url: try values.decode(String.self, forKey: .url),
                instructions: try values.decodeIfPresent(String.self, forKey: .instructions))
        case .deviceCode:
            self = .deviceCode(
                userCode: try values.decode(String.self, forKey: .userCode),
                verificationURI: try values.decode(String.self, forKey: .verificationUri),
                intervalSeconds: try values.decodeIfPresent(Int.self, forKey: .intervalSeconds),
                expiresInSeconds: try values.decodeIfPresent(Int.self, forKey: .expiresInSeconds))
        case .progress:
            self = .progress(message: try values.decode(String.self, forKey: .message))
        }
    }

    public func encode(to encoder: any Encoder) throws {
        var values = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .info(let message, let links):
            try values.encode(Kind.info, forKey: .type)
            try values.encode(message, forKey: .message)
            try values.encodeIfPresent(links, forKey: .links)
        case .authURL(let url, let instructions):
            try values.encode(Kind.authURL, forKey: .type)
            try values.encode(url, forKey: .url)
            try values.encodeIfPresent(instructions, forKey: .instructions)
        case .deviceCode(
            let userCode, let verificationURI, let intervalSeconds, let expiresInSeconds):
            try values.encode(Kind.deviceCode, forKey: .type)
            try values.encode(userCode, forKey: .userCode)
            try values.encode(verificationURI, forKey: .verificationUri)
            try values.encodeIfPresent(intervalSeconds, forKey: .intervalSeconds)
            try values.encodeIfPresent(expiresInSeconds, forKey: .expiresInSeconds)
        case .progress(let message):
            try values.encode(Kind.progress, forKey: .type)
            try values.encode(message, forKey: .message)
        }
    }
}

public struct AIInputPrompt: Codable, Sendable, Equatable, Identifiable {
    public let id: String
    public let message: String
    public let placeholder: String?
}

public struct AISelectOption: Codable, Sendable, Equatable, Identifiable {
    public let id: String
    public let label: String
    public let description: String?
}

public struct AISelectPrompt: Codable, Sendable, Equatable, Identifiable {
    public let id: String
    public let message: String
    public let options: [AISelectOption]
}

public enum AIAuthPrompt: Codable, Sendable, Equatable, Identifiable {
    case text(AIInputPrompt)
    case secret(AIInputPrompt)
    case manualCode(AIInputPrompt)
    case select(AISelectPrompt)

    public var id: String {
        switch self {
        case .text(let prompt), .secret(let prompt), .manualCode(let prompt): prompt.id
        case .select(let prompt): prompt.id
        }
    }

    public var message: String {
        switch self {
        case .text(let prompt), .secret(let prompt), .manualCode(let prompt): prompt.message
        case .select(let prompt): prompt.message
        }
    }

    private enum Kind: String, Codable {
        case text
        case secret
        case manualCode = "manual_code"
        case select
    }
    private enum CodingKeys: String, CodingKey { case type }

    public init(from decoder: any Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        switch try values.decode(Kind.self, forKey: .type) {
        case .text: self = .text(try AIInputPrompt(from: decoder))
        case .secret: self = .secret(try AIInputPrompt(from: decoder))
        case .manualCode: self = .manualCode(try AIInputPrompt(from: decoder))
        case .select: self = .select(try AISelectPrompt(from: decoder))
        }
    }

    public func encode(to encoder: any Encoder) throws {
        var values = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .text(let prompt):
            try values.encode(Kind.text, forKey: .type)
            try prompt.encode(to: encoder)
        case .secret(let prompt):
            try values.encode(Kind.secret, forKey: .type)
            try prompt.encode(to: encoder)
        case .manualCode(let prompt):
            try values.encode(Kind.manualCode, forKey: .type)
            try prompt.encode(to: encoder)
        case .select(let prompt):
            try values.encode(Kind.select, forKey: .type)
            try prompt.encode(to: encoder)
        }
    }
}

public enum AILoginStatus: String, Codable, Sendable {
    case pending, complete, error
}

public struct AILoginState: Codable, Sendable, Equatable, Identifiable {
    public let id: String
    public let provider: String
    public let method: AIAuthMethod
    public let status: AILoginStatus
    public let events: [AIAuthEvent]
    public let prompt: AIAuthPrompt?
}

public struct AILoginResponse: Codable, Sendable, Equatable {
    public let login: AILoginState
}

public struct AIOKResponse: Codable, Sendable, Equatable {
    public let ok: Bool
}

/// Provider URLs are opened without Otter cookies, headers, or added query values.
public enum AIProviderURL {
    public static func validated(_ value: String) -> URL? {
        guard let parts = URLComponents(string: value),
            parts.scheme?.lowercased() == "https",
            let host = parts.host, !host.isEmpty,
            parts.user == nil, parts.password == nil,
            let url = parts.url
        else { return nil }
        return url
    }
}
