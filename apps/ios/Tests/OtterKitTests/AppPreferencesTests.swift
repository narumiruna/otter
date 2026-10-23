import Foundation
import Observation
import Testing

@testable import OtterKit

@MainActor
struct AppPreferencesTests {
    private func withDefaults(_ test: (UserDefaults) throws -> Void) throws {
        let suite = "otter.preferences.tests.\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        try test(defaults)
    }

    @Test func registryMatchesWebOrderAndNativeLabels() {
        #expect(
            AppPreferences.languageOptions.map(\.id) == [
                "zh-TW", "en", "ja", "ko", "hi", "es", "fr", "pt", "id", "de", "vi", "tr",
                "fil", "th", "it", "pl", "ms", "nl",
            ])
        #expect(
            AppPreferences.languageOptions.map(\.label) == [
                "正體中文", "English", "日本語", "한국어", "हिन्दी", "Español", "Français",
                "Português", "Bahasa Indonesia", "Deutsch", "Tiếng Việt", "Türkçe", "Filipino",
                "ไทย", "Italiano", "Polski", "Bahasa Melayu", "Nederlands",
            ])
        #expect(AppAppearance.allCases == [.system, .light, .dark])
        #expect(AppPalette.allCases == [.forest, .parchment, .ocean, .lavender, .sunset, .rose])
    }

    @Test func deviceMatchingUsesFirstSupportedCanonicalLanguage() {
        let cases: [([String], String)] = [
            (["ja-JP", "en-US"], "ja"), (["KO-kr", "ja"], "ko"),
            (["fr-FR", "ja"], "fr"), (["en-GB", "ko-KR"], "en"),
            (["zh-Hant", "ja"], "zh-TW"), (["zh-Hans-CN"], "zh-TW"),
            (["zh", "en"], "zh-TW"), (["ar", "de"], "de"),
            (["ar", "uk"], "en"), (["enochian", "jargon", "korean"], "en"),
            (["en--US", "de_DE", "fr-CA"], "fr"), (["tl-PH", "en"], "fil"),
            (["TL", "en"], "fil"), (["pt-BR", "es-MX"], "pt"), (["pt-PT"], "pt"),
            (["en-US-Latn", "ja"], "ja"), (["en-abc", "ja"], "ja"),
            (["en\n", "ja"], "ja"), (["en-", "ko"], "ko"), ([" ja ", "fr"], "fr"),
            (["en-a-foo-a-bar", "de"], "de"), (["en-variant-variant", "de"], "de"),
            (["fr-u-ca-gregory", "en"], "fr"), (["de-x-private", "en"], "de"),
            (["in-ID", "en"], "id"), (["eng-US", "ja"], "en"),
            (["fra", "en"], "fr"), (["deu", "en"], "de"), ([], "en"),
        ]
        for (languages, expected) in cases {
            #expect(AppPreferences.matchDeviceLanguages(languages) == expected)
        }
        for option in AppPreferences.languageOptions {
            let tag = option.id == "zh-TW" ? "zh-Hant-TW" : "\(option.id)-US"
            #expect(AppPreferences.matchDeviceLanguages([tag.uppercased()]) == option.id)
        }
    }

    @Test func detectionDoesNotPersistAndExplicitChoiceSurvivesRestart() throws {
        try withDefaults { defaults in
            let preferences = AppPreferences(defaults: defaults, deviceLanguages: ["ja-JP"])
            #expect(preferences.localeID == "ja")
            #expect(preferences.locale.identifier == "ja")
            #expect(preferences.appearance == .system)
            #expect(preferences.palette == .forest)
            for key in [
                AppPreferences.localeKey, AppPreferences.appearanceKey, AppPreferences.paletteKey,
            ] {
                #expect(defaults.object(forKey: key) == nil)
            }
            preferences.localeID = "ja"  // Explicit even when equal to detection.
            preferences.appearance = .dark
            preferences.palette = .lavender
            let restarted = AppPreferences(defaults: defaults, deviceLanguages: ["de-DE"])
            #expect(restarted.localeID == "ja")
            #expect(restarted.appearance == .dark)
            #expect(restarted.palette == .lavender)
            #expect(defaults.string(forKey: AppPreferences.localeKey) == "ja")
            #expect(defaults.string(forKey: AppPreferences.appearanceKey) == "dark")
            #expect(defaults.string(forKey: AppPreferences.paletteKey) == "lavender")
        }
    }

    @Test func onlyExactCanonicalStoredChoicesAreAccepted() throws {
        try withDefaults { defaults in
            for option in AppPreferences.languageOptions {
                defaults.set(option.id, forKey: AppPreferences.localeKey)
                #expect(
                    AppPreferences(defaults: defaults, deviceLanguages: ["ar"]).localeID
                        == option.id)
            }
            for invalid in [
                "", "ja-JP", "ZH-tw", "zh-Hant", "tl", "fr-CA", "EN", "ar", " English ",
            ] {
                defaults.set(invalid, forKey: AppPreferences.localeKey)
                defaults.set("invalid", forKey: AppPreferences.appearanceKey)
                defaults.set("invalid", forKey: AppPreferences.paletteKey)
                let preferences = AppPreferences(defaults: defaults, deviceLanguages: ["ko-KR"])
                #expect(preferences.localeID == "ko")
                #expect(preferences.appearance == .system)
                #expect(preferences.palette == .forest)
            }
            defaults.set(["wrong": "type"], forKey: AppPreferences.localeKey)
            defaults.set(["wrong"], forKey: AppPreferences.appearanceKey)
            defaults.set(["wrong"], forKey: AppPreferences.paletteKey)
            let preferences = AppPreferences(defaults: defaults, deviceLanguages: [])
            #expect(preferences.localeID == "en")
            #expect(preferences.appearance == .system)
            #expect(preferences.palette == .forest)
        }
    }

    @Test func invalidSelectionResetsToDetectionWithoutSavingAnAlias() throws {
        try withDefaults { defaults in
            let preferences = AppPreferences(defaults: defaults, deviceLanguages: ["fr-FR"])
            preferences.localeID = "en"
            preferences.localeID = "tl-PH"
            #expect(preferences.localeID == "fr")
            #expect(defaults.object(forKey: AppPreferences.localeKey) == nil)
            #expect(AppPreferences(defaults: defaults, deviceLanguages: ["ko"]).localeID == "ko")
        }
    }

    @Test func allModesAndPalettesPersist() throws {
        try withDefaults { defaults in
            let preferences = AppPreferences(defaults: defaults, deviceLanguages: [])
            for appearance in AppAppearance.allCases {
                preferences.appearance = appearance
                #expect(AppPreferences(defaults: defaults).appearance == appearance)
            }
            for palette in AppPalette.allCases {
                preferences.palette = palette
                #expect(AppPreferences(defaults: defaults).palette == palette)
            }
        }
    }

    @Test func injectedSuitesAreIsolatedAndOtherNamespacesAreUnchanged() throws {
        try withDefaults { first in
            try withDefaults { second in
                first.set(["de-DE"], forKey: "AppleLanguages")
                first.set("unchanged", forKey: "otter.session.test-sentinel")
                let preferences = AppPreferences(defaults: first, deviceLanguages: ["ja"])
                preferences.localeID = "fil"
                preferences.appearance = .light
                preferences.palette = .rose
                let other = AppPreferences(defaults: second, deviceLanguages: ["ko"])
                #expect(other.localeID == "ko")
                #expect(other.appearance == .system)
                #expect(other.palette == .forest)
                #expect(first.stringArray(forKey: "AppleLanguages") == ["de-DE"])
                #expect(first.string(forKey: "otter.session.test-sentinel") == "unchanged")
            }
        }
    }

    @Test nonisolated func formattingLocaleCanBeReadOutsideMainActor() throws {
        let suite = "otter.preferences.tests.\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        #expect(
            AppPreferences.displayLocale(defaults: defaults, deviceLanguages: ["tl-PH"]).identifier
                == "fil")
        #expect(defaults.object(forKey: AppPreferences.localeKey) == nil)
        defaults.set("fr", forKey: AppPreferences.localeKey)
        #expect(
            AppPreferences.displayLocale(defaults: defaults, deviceLanguages: ["ja"]).identifier
                == "fr")
        defaults.set("fr-CA", forKey: AppPreferences.localeKey)
        #expect(
            AppPreferences.displayLocale(defaults: defaults, deviceLanguages: ["zh-Hans"])
                .identifier == "zh-TW")
    }

    @Test func localeParticipatesInObservation() throws {
        try withDefaults { defaults in
            let preferences = AppPreferences(defaults: defaults, deviceLanguages: ["en"])
            let changed = ObservationFlag()
            withObservationTracking {
                _ = preferences.locale
            } onChange: {
                changed.set()
            }
            preferences.localeID = "fr"
            #expect(changed.value)
        }
    }
}

/// Observation callbacks are Sendable, including when the observed store is MainActor-bound.
private final class ObservationFlag: @unchecked Sendable {
    private let lock = NSLock()
    private var storage = false
    var value: Bool { lock.withLock { storage } }
    func set() { lock.withLock { storage = true } }
}
