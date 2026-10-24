import Foundation

public struct SessionCookie: Codable, Equatable, Sendable {
    public let value: String
    public let expiresAt: Date?
    public let secure: Bool

    public init(value: String, expiresAt: Date? = nil, secure: Bool = true) {
        self.value = value
        self.expiresAt = expiresAt
        self.secure = secure
    }

    var isValid: Bool {
        !value.isEmpty
            && value.utf8.allSatisfy {
                (33...126).contains($0) && ![34, 44, 59, 92].contains($0)
            }
    }

    static func read(from response: HTTPURLResponse, origin: URL, now: Date = Date()) throws
        -> SessionCookie
    {
        guard let header = response.value(forHTTPHeaderField: "Set-Cookie"),
            let cookie = HTTPCookie.cookies(
                withResponseHeaderFields: ["Set-Cookie": header], for: origin
            )
            .first(where: { $0.name == "otter_session" }),
            cookie.domain.lowercased().trimmingCharacters(in: CharacterSet(charactersIn: "."))
                == origin.host?.lowercased(),
            cookie.path == "/"
        else { throw APIError.invalidResponse }
        var expires = cookie.expiresDate
        for item in header.split(separator: ";") {
            let pair = item.trimmingCharacters(in: .whitespaces).split(separator: "=", maxSplits: 1)
            if pair.count == 2, pair[0].lowercased() == "max-age",
                let seconds = TimeInterval(pair[1])
            {
                expires = now.addingTimeInterval(seconds)
            }
        }
        let result = SessionCookie(
            value: cookie.value, expiresAt: expires,
            secure: cookie.isSecure || origin.scheme == "https")
        guard result.isValid, expires.map({ $0 > now }) ?? true else { throw APIError.unauthorized }
        return result
    }
}

public enum ClientAuthentication: Codable, Equatable, Sendable {
    case anonymous
    case bearer(String)
    case session(SessionCookie)
    case share(tripID: String, token: String)

    public var isSession: Bool { if case .session = self { true } else { false } }
    public var isBearer: Bool { if case .bearer = self { true } else { false } }
    public var isShare: Bool { if case .share = self { true } else { false } }
}

public struct APIResponseError: Error, LocalizedError, Sendable {
    public let status: Int
    public let code: String?
    public let message: String
    public let retryAfter: TimeInterval?

    public var errorDescription: String? {
        if status == 412 {
            return NativeLocalization.string("這筆支出已被修改。請保留草稿，重新載入並確認最新內容後再操作。")
        }
        return message
    }
}

public struct OkResponse: Codable, Sendable {
    public let ok: Bool
}
