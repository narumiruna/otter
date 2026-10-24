import Foundation
import Observation

public enum AppAppearance: String, CaseIterable, Sendable {
    case system, light, dark
}

public enum AppPalette: String, CaseIterable, Sendable {
    case forest, parchment, ocean, lavender, sunset, rose
}

public struct AppLanguageOption: Identifiable, Equatable, Sendable {
    public let id: String
    public let label: String
}

/// Device-only UI preferences. This store contains no account data or credentials.
@MainActor @Observable
public final class AppPreferences {
    public nonisolated static let languageOptions: [AppLanguageOption] = [
        .init(id: "zh-TW", label: "正體中文"),
        .init(id: "en", label: "English"),
        .init(id: "ja", label: "日本語"),
        .init(id: "ko", label: "한국어"),
        .init(id: "hi", label: "हिन्दी"),
        .init(id: "es", label: "Español"),
        .init(id: "fr", label: "Français"),
        .init(id: "pt", label: "Português"),
        .init(id: "id", label: "Bahasa Indonesia"),
        .init(id: "de", label: "Deutsch"),
        .init(id: "vi", label: "Tiếng Việt"),
        .init(id: "tr", label: "Türkçe"),
        .init(id: "fil", label: "Filipino"),
        .init(id: "th", label: "ไทย"),
        .init(id: "it", label: "Italiano"),
        .init(id: "pl", label: "Polski"),
        .init(id: "ms", label: "Bahasa Melayu"),
        .init(id: "nl", label: "Nederlands"),
    ]

    // Keep these keys separate from session, queue, and expense defaults storage.
    nonisolated static let localeKey = "otter.preferences.locale"
    nonisolated static let appearanceKey = "otter.preferences.appearance"
    nonisolated static let paletteKey = "otter.preferences.palette"

    @ObservationIgnored private let defaults: UserDefaults
    @ObservationIgnored private let detectedLocaleID: String
    private var selectedLocaleID: String

    public var localeID: String {
        get { selectedLocaleID }
        set {
            if Self.isSupportedLocale(newValue) {
                selectedLocaleID = newValue
                defaults.set(newValue, forKey: Self.localeKey)
            } else {
                // Invalid input must not become an explicit language choice.
                selectedLocaleID = detectedLocaleID
                defaults.removeObject(forKey: Self.localeKey)
            }
        }
    }

    public var locale: Locale { Locale(identifier: localeID) }

    public var appearance: AppAppearance {
        didSet { defaults.set(appearance.rawValue, forKey: Self.appearanceKey) }
    }

    public var palette: AppPalette {
        didSet { defaults.set(palette.rawValue, forKey: Self.paletteKey) }
    }

    public init(
        defaults: UserDefaults = .standard,
        deviceLanguages: [String] = Locale.preferredLanguages
    ) {
        self.defaults = defaults
        detectedLocaleID = Self.matchDeviceLanguages(deviceLanguages)
        let stored = defaults.string(forKey: Self.localeKey)
        selectedLocaleID =
            stored.flatMap { Self.isSupportedLocale($0) ? $0 : nil }
            ?? detectedLocaleID
        appearance =
            defaults.string(forKey: Self.appearanceKey)
            .flatMap(AppAppearance.init(rawValue:)) ?? .system
        palette =
            defaults.string(forKey: Self.paletteKey)
            .flatMap(AppPalette.init(rawValue:)) ?? .forest
        // Do not persist detection or defaults. Only explicit selections are saved.
    }

    /// Read the selected formatting locale without an actor hop or a global locale change.
    public nonisolated static func displayLocale(
        defaults: UserDefaults = .standard,
        deviceLanguages: [String] = Locale.preferredLanguages
    ) -> Locale {
        let stored = defaults.string(forKey: localeKey)
        let identifier =
            stored.flatMap { isSupportedLocale($0) ? $0 : nil }
            ?? matchDeviceLanguages(deviceLanguages)
        return Locale(identifier: identifier)
    }

    public nonisolated static func isSupportedLocale(_ value: String) -> Bool {
        languageOptions.contains { $0.id == value }
    }

    /// Match the first supported device language, as the Web browser matcher does.
    public nonisolated static func matchDeviceLanguages(_ languages: [String]) -> String {
        for language in languages {
            guard isLanguageTag(language) else { continue }
            let canonical = Locale.canonicalLanguageIdentifier(from: language)
            let base = canonical.lowercased().split(separator: "-").first.map(String.init) ?? ""
            if base == "zh" { return "zh-TW" }
            if base == "tl" { return "fil" }
            if isSupportedLocale(base) { return base }
        }
        return "en"
    }

    /// Validate before Foundation canonicalization, which also accepts malformed tags.
    private nonisolated static func isLanguageTag(_ tag: String) -> Bool {
        let pattern =
            "^(?:[A-Za-z]{2,3}|[A-Za-z]{5,8})(?:-[A-Za-z]{4})?(?:-(?:[A-Za-z]{2}|[0-9]{3}))?"
            + "(?:-(?:[A-Za-z0-9]{5,8}|[0-9][A-Za-z0-9]{3}))*"
            + "(?:-[0-9A-WY-Za-wy-z](?:-[A-Za-z0-9]{2,8})+)*"
            + "(?:-[xX](?:-[A-Za-z0-9]{1,8})+)?\\z"
        guard tag.range(of: pattern, options: .regularExpression) != nil else { return false }
        let parts = tag.lowercased().split(separator: "-").dropFirst()
        var variants = Set<Substring>()
        var extensions = Set<Substring>()
        var inExtension = false
        for part in parts {
            if part == "x" { break }
            if part.count == 1 {
                guard extensions.insert(part).inserted else { return false }
                inExtension = true
            } else if !inExtension
                && (part.count >= 5 || (part.count == 4 && part.first?.isNumber == true))
            {
                guard variants.insert(part).inserted else { return false }
            }
        }
        return true
    }
}
