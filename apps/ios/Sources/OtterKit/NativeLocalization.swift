import Foundation

/// Resolve only application-owned resources. Keep user data and external diagnostics verbatim.
public enum NativeLocalization {
    public static func string(
        _ value: String.LocalizationValue,
        locale: Locale = AppPreferences.displayLocale(),
        bundle: Bundle = .main
    ) -> String {
        String(localized: value, bundle: resourceBundle(locale: locale, in: bundle), locale: locale)
    }

    public static func string(
        _ key: StaticString,
        defaultValue: String.LocalizationValue,
        locale: Locale = AppPreferences.displayLocale(),
        bundle: Bundle = .main
    ) -> String {
        String(
            localized: key, defaultValue: defaultValue,
            bundle: resourceBundle(locale: locale, in: bundle), locale: locale)
    }

    /// The locale argument formats values; an explicit resource bundle selects the language.
    public static func resourceBundle(locale: Locale, in bundle: Bundle = .main) -> Bundle {
        let tag = locale.identifier.replacingOccurrences(of: "_", with: "-")
        let language = AppPreferences.matchDeviceLanguages([tag])
        let resourceID = language == "zh-TW" ? "zh-Hant" : language
        for candidate in [resourceID, "en"] {
            if let url = bundle.url(forResource: candidate, withExtension: "lproj"),
                let localized = Bundle(url: url)
            {
                return localized
            }
        }
        return bundle
    }
}
