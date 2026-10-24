import Foundation

/// An in-memory route. Do not store incoming URLs or share capabilities.
public struct IncomingLink: Identifiable, Sendable, CustomStringConvertible,
    CustomDebugStringConvertible
{
    public enum WorkspaceMode: String, Equatable, Sendable {
        case addExpense = "add-expense"
        case editExpense = "edit-expense"
    }

    public enum Destination: Equatable, Sendable, CustomStringConvertible,
        CustomDebugStringConvertible
    {
        case share(token: String)
        case device(code: String)
        case workspace(
            tripID: String, view: String, expenseID: String?,
            mode: WorkspaceMode? = nil, accountSettings: Bool = false
        )
        case accountSettings

        public var description: String {
            switch self {
            case .share: "share(redacted)"
            case .device: "device(redacted)"
            case .workspace: "workspace"
            case .accountSettings: "accountSettings"
            }
        }
        public var debugDescription: String { description }
    }

    public let id = UUID()
    public let origin: URL
    public let destination: Destination
    public var description: String { "IncomingLink(\(origin.absoluteString), redacted)" }
    public var debugDescription: String { description }

    private init(origin: URL, destination: Destination) {
        self.origin = origin
        self.destination = destination
    }

    public static func parse(_ url: URL) throws -> IncomingLink {
        try parse(url.absoluteString)
    }

    public static func parse(_ value: String) throws -> IncomingLink {
        // Decode query values as URLSearchParams does, but never decode a route path.
        guard !value.isEmpty, value.utf8.allSatisfy({ (33...126).contains($0) }),
            !value.contains("\\"), safeEncodedText(value),
            let parts = URLComponents(string: value),
            !parts.percentEncodedPath.contains("%"),
            !parts.path.split(separator: "/").contains(where: { $0 == "." || $0 == ".." })
        else { throw IncomingLinkError.invalidLink }
        let origin = try origin(from: parts)
        var form = URLComponents()
        form.percentEncodedQuery = parts.percentEncodedQuery?.replacingOccurrences(
            of: "+", with: "%20")
        let known: Set<String> = ["trip", "view", "mode", "expense", "account", "code"]
        var query: [String: String] = [:]
        for item in form.queryItems ?? [] {
            guard safeText(item.name), safeText(item.value ?? "") else {
                throw IncomingLinkError.invalidLink
            }
            guard known.contains(item.name) else { continue }
            // The web takes the first value. Reject duplicate route keys instead: other
            // URL consumers can take the last value and select a different resource.
            guard query[item.name] == nil else { throw IncomingLinkError.invalidLink }
            query[item.name] = item.value ?? ""
        }
        guard safeText(parts.fragment ?? "") else { throw IncomingLinkError.invalidLink }
        // Unconsumed tracking parameters and fragments never enter the in-memory route.
        let destination: Destination
        if parts.path.hasPrefix("/share/") {
            guard query.isEmpty else { throw IncomingLinkError.invalidLink }
            let token = String(parts.path.dropFirst("/share/".count))
            try validateShareToken(token)
            destination = .share(token: token)
        } else if parts.path == "/device" {
            if query.isEmpty {
                destination = .device(code: "")
            } else {
                guard Set(query.keys) == ["code"], let code = query["code"],
                    code.range(
                        of: "^[A-HJ-NP-Z2-9]{4}-?[A-HJ-NP-Z2-9]{4}$", options: .regularExpression)
                        != nil
                else { throw IncomingLinkError.invalidLink }
                destination = .device(code: code)
            }
        } else if parts.path == "/" || parts.path.isEmpty {
            let accountSettings = query["account"] == "settings"
            if let tripID = query["trip"], !tripID.isEmpty {
                guard (try? OtterClient.identifier(tripID)) != nil else {
                    throw IncomingLinkError.invalidLink
                }
                let mode = query["mode"].flatMap(WorkspaceMode.init(rawValue:))
                let rawView = query["view"] ?? "overview"
                let view =
                    mode == .editExpense
                    ? "expenses"
                    : (["overview", "expenses", "analysis", "people", "more"].contains(rawView)
                        ? rawView : "overview")
                let expenseID =
                    mode == .editExpense ? query["expense"].flatMap { $0.isEmpty ? nil : $0 } : nil
                if let expenseID, (try? OtterClient.identifier(expenseID)) == nil {
                    throw IncomingLinkError.invalidLink
                }
                destination = .workspace(
                    tripID: tripID, view: view, expenseID: expenseID,
                    mode: mode, accountSettings: accountSettings)
            } else if accountSettings {
                destination = .accountSettings
            } else {
                throw IncomingLinkError.invalidLink
            }
        } else {
            throw IncomingLinkError.invalidLink
        }
        return IncomingLink(origin: origin, destination: destination)
    }

    /// Accept only server origins, not route URLs. Normalize case and default ports.
    public static func canonicalOrigin(_ url: URL) throws -> URL {
        let value = url.absoluteString
        guard value.utf8.allSatisfy({ (33...126).contains($0) }), !value.contains("\\"),
            let parts = URLComponents(string: value), parts.path.isEmpty || parts.path == "/",
            parts.query == nil, parts.fragment == nil
        else { throw IncomingLinkError.invalidLink }
        return try origin(from: parts)
    }

    public static func sameOrigin(_ first: URL, _ second: URL) -> Bool {
        guard let first = try? canonicalOrigin(first), let second = try? canonicalOrigin(second)
        else {
            return false
        }
        return first == second
    }

    static func validateShareToken(_ token: String) throws {
        guard token.utf8.count == 43, token.utf8.allSatisfy(isIdentifierByte)
        else { throw IncomingLinkError.invalidLink }
    }

    private static func safeText(_ value: String) -> Bool {
        !value.contains("\\")
            && value.unicodeScalars.allSatisfy {
                !CharacterSet.controlCharacters.contains($0)
                    && !CharacterSet.illegalCharacters.contains($0) && $0.value != 0xFEFF
            }
    }

    private static func safeEncodedText(_ value: String) -> Bool {
        let bytes = Array(value.utf8)
        var decoded: [UInt8] = []
        var index = 0
        func hex(_ byte: UInt8) -> UInt8? {
            switch byte {
            case 48...57: byte - 48
            case 65...70: byte - 65 + 10
            case 97...102: byte - 97 + 10
            default: nil
            }
        }
        while index < bytes.count {
            if bytes[index] == 37 {
                guard index + 2 < bytes.count,
                    let high = hex(bytes[index + 1]), let low = hex(bytes[index + 2])
                else { return false }
                decoded.append(high * 16 + low)
                index += 3
            } else {
                decoded.append(bytes[index])
                index += 1
            }
        }
        // Foundation URL decoding can remove a leading UTF-8 BOM. Validate the
        // original decoded bytes before URLComponents can normalize them.
        let text = String(decoding: decoded, as: UTF8.self)
        return Array(text.utf8) == decoded && safeText(text)
    }

    private static func isIdentifierByte(_ byte: UInt8) -> Bool {
        (65...90).contains(byte) || (97...122).contains(byte) || (48...57).contains(byte)
            || byte == 45
            || byte == 95
    }

    private static func origin(from parts: URLComponents) throws -> URL {
        guard let scheme = parts.scheme?.lowercased(), let host = parts.host?.lowercased(),
            !host.isEmpty, parts.user == nil, parts.password == nil,
            parts.percentEncodedHost == parts.host,
            host.utf8.allSatisfy({ (isIdentifierByte($0) && $0 != 95) || $0 == 46 }),
            !host.hasPrefix("."), !host.hasSuffix("."), !host.contains(".."),
            scheme == "https" || (scheme == "http" && host == "localhost"),
            parts.port.map({ (1...65535).contains($0) }) ?? true
        else { throw IncomingLinkError.invalidLink }
        var origin = URLComponents()
        origin.scheme = scheme
        origin.host = host
        let defaultPort = scheme == "https" ? 443 : 80
        origin.port = parts.port == defaultPort ? nil : parts.port
        guard let url = origin.url else { throw IncomingLinkError.invalidLink }
        return url
    }
}

public enum IncomingLinkError: Error, LocalizedError, Sendable {
    case invalidLink, differentOrigin, invalidShare

    public var errorDescription: String? {
        switch self {
        case .invalidLink: NativeLocalization.string("此連結無效或不受支援。")
        case .differentOrigin: NativeLocalization.string("請先登入此連結所屬的伺服器。")
        case .invalidShare: NativeLocalization.string("分享連結無效、已到期或已撤銷。")
        }
    }
}
