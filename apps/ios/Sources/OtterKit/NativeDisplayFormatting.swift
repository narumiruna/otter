import Foundation

/// Presentation only. These helpers do not change wire values or input formats.
public enum NativeDisplayFormatting {
    public static func dateOnly(
        _ value: String, locale: Locale = AppPreferences.displayLocale()
    ) -> String {
        guard let date = parseDateOnly(value) else { return value }

        let formatter = DateFormatter()
        formatter.locale = locale
        // A date-only value has no time zone. Keep its day in every device time zone.
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }

    public static func timestamp(
        _ value: String, locale: Locale = AppPreferences.displayLocale(),
        timeZone: TimeZone = .current
    ) -> String {
        if value.utf8.count == 10 { return dateOnly(value, locale: locale) }
        // ISO8601DateFormatter can normalize invalid calendar days. Reject them first.
        guard parseDateOnly(String(value.prefix(10))) != nil else { return value }
        let parser = ISO8601DateFormatter()
        parser.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let fractional = parser.date(from: value)
        parser.formatOptions = [.withInternetDateTime]
        guard let date = fractional ?? parser.date(from: value) else { return value }
        let formatter = DateFormatter()
        formatter.locale = locale
        formatter.timeZone = timeZone
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }

    private static func parseDateOnly(_ value: String) -> Date? {
        let parser = DateFormatter()
        parser.calendar = Calendar(identifier: .gregorian)
        parser.locale = Locale(identifier: "en_US_POSIX")
        parser.timeZone = TimeZone(secondsFromGMT: 0)
        parser.dateFormat = "yyyy-MM-dd"
        parser.isLenient = false
        guard value.utf8.count == 10,
            let date = parser.date(from: value), parser.string(from: date) == value
        else { return nil }
        return date
    }

    public static func number(
        _ value: Double, locale: Locale = AppPreferences.displayLocale()
    ) -> String {
        value.formatted(.number.locale(locale))
    }

    public static func number(
        _ value: Int, locale: Locale = AppPreferences.displayLocale()
    ) -> String {
        value.formatted(.number.locale(locale))
    }

    public static func list(
        _ values: [String], locale: Locale = AppPreferences.displayLocale()
    ) -> String {
        values.formatted(.list(type: .and).locale(locale))
    }
}
