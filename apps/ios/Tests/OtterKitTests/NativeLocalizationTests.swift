import Foundation
import Testing

@testable import OtterKit

struct NativeLocalizationTests {
    private func withBundle(_ test: (Bundle) throws -> Void) throws {
        let directory = FileManager.default.temporaryDirectory.appending(
            path: "otter-localization-\(UUID().uuidString).bundle", directoryHint: .isDirectory)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        let info: [String: Any] = [
            "CFBundleIdentifier": "dev.otter.localization-test", "CFBundleDevelopmentRegion": "en",
            "CFBundleLocalizations": ["en", "fr", "zh-Hant"],
        ]
        try PropertyListSerialization.data(fromPropertyList: info, format: .xml, options: 0).write(
            to: directory.appending(path: "Info.plist"))
        let translations = ["en": "Appearance", "fr": "Apparence", "zh-Hant": "外觀"]
        for (code, value) in translations {
            let folder = directory.appending(path: code + ".lproj", directoryHint: .isDirectory)
            try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
            try Data(
                "\"appearance\" = \"\(value)\";\n\"%lld items\" = \"%lld unités\";\n\"Value: %@\" = \"Valeur : %@\";\n"
                    .utf8
            )
            .write(to: folder.appending(path: "Localizable.strings"))
            let plural: [String: Any] = [
                "%lld cats and %lld dogs": [
                    "NSStringLocalizedFormatKey": "%1$#@cats@ et %2$#@dogs@",
                    "cats": [
                        "NSStringFormatSpecTypeKey": "NSStringPluralRuleType",
                        "NSStringFormatValueTypeKey": "lld", "one": "%lld chat",
                        "other": "%lld chats",
                    ],
                    "dogs": [
                        "NSStringFormatSpecTypeKey": "NSStringPluralRuleType",
                        "NSStringFormatValueTypeKey": "lld", "one": "%lld chien",
                        "other": "%lld chiens",
                    ],
                ]
            ]
            try PropertyListSerialization.data(fromPropertyList: plural, format: .xml, options: 0)
                .write(to: folder.appending(path: "Localizable.stringsdict"))
        }
        try test(#require(Bundle(url: directory)))
    }

    @Test func selectedLanguageOverridesDeviceLanguageWithoutGlobalWrites() throws {
        let original = UserDefaults.standard.object(forKey: "AppleLanguages") as? [String]
        try withBundle { bundle in
            #expect(
                NativeLocalization.string(
                    "appearance", locale: Locale(identifier: "fr-FR"), bundle: bundle)
                    == "Apparence")
            #expect(
                NativeLocalization.string(
                    "appearance", locale: Locale(identifier: "zh-TW"), bundle: bundle) == "外觀")
            #expect(
                NativeLocalization.string(
                    "appearance", locale: Locale(identifier: "en-GB"), bundle: bundle)
                    == "Appearance")
            #expect(
                NativeLocalization.string(
                    "appearance", locale: Locale(identifier: "ar"), bundle: bundle) == "Appearance")
        }
        #expect(UserDefaults.standard.object(forKey: "AppleLanguages") as? [String] == original)
    }

    @Test func independentPluralCountsResolveUsingTheSelectedLanguage() throws {
        try withBundle { bundle in
            let first = 1
            let second = 2
            #expect(
                NativeLocalization.string(
                    "\(first) cats and \(second) dogs", locale: Locale(identifier: "fr"),
                    bundle: bundle) == "1 chat et 2 chiens")
            #expect(
                NativeLocalization.string(
                    "\(second) cats and \(first) dogs", locale: Locale(identifier: "fr"),
                    bundle: bundle) == "2 chats et 1 chien")
            let zero = 0
            #expect(
                NativeLocalization.string(
                    "\(zero) cats and \(first) dogs", locale: Locale(identifier: "fr"),
                    bundle: bundle) == "0 chat et 1 chien")
        }
    }

    @Test func typedArgumentsUseTheSelectedResourceWithoutChangingTheirValue() throws {
        try withBundle { bundle in
            let count = 2
            #expect(
                NativeLocalization.string(
                    "\(count) items", locale: Locale(identifier: "fr"), bundle: bundle)
                    == "2 unités")
            let userData = "appearance <secret> %@"
            #expect(
                NativeLocalization.string(
                    "Value: \(userData)", locale: Locale(identifier: "fr"), bundle: bundle)
                    == "Valeur : appearance <secret> %@")
        }
    }
}
