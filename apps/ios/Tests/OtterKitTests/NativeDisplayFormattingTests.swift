import Foundation
import Testing

@testable import OtterKit

struct NativeDisplayFormattingTests {
    private let utc = TimeZone(secondsFromGMT: 0)!

    private func expectedDate(
        _ date: Date, locale: Locale, timeZone: TimeZone, includesTime: Bool = false
    ) -> String {
        let formatter = DateFormatter()
        formatter.locale = locale
        formatter.timeZone = timeZone
        formatter.dateStyle = .medium
        formatter.timeStyle = includesTime ? .short : .none
        return formatter.string(from: date)
    }

    @Test func dateOnlyUsesSelectedLocaleWithoutChangingTheWireDay() throws {
        let original = "2024-02-29"
        let parser = ISO8601DateFormatter()
        let instant = try #require(parser.date(from: "2024-02-29T00:00:00Z"))
        let west = try #require(TimeZone(identifier: "America/Los_Angeles"))
        let east = try #require(TimeZone(identifier: "Pacific/Kiritimati"))
        for id in ["en_US", "de_DE", "ja_JP", "zh_TW", "th_TH"] {
            let locale = Locale(identifier: id)
            let expected = expectedDate(instant, locale: locale, timeZone: utc)
            #expect(NativeDisplayFormatting.dateOnly(original, locale: locale) == expected)
            // The timestamp entry point must also keep date-only records on the same day.
            #expect(
                NativeDisplayFormatting.timestamp(original, locale: locale, timeZone: west)
                    == expected)
            #expect(
                NativeDisplayFormatting.timestamp(original, locale: locale, timeZone: east)
                    == expected)
        }
        let english = Locale(identifier: "en_US")
        #expect(
            NativeDisplayFormatting.dateOnly(original, locale: english)
                != expectedDate(instant, locale: english, timeZone: west))
        #expect(
            NativeDisplayFormatting.dateOnly(original, locale: english)
                != NativeDisplayFormatting.dateOnly(original, locale: Locale(identifier: "de_DE")))
        #expect(original == "2024-02-29")
    }

    @Test func invalidOrNoncanonicalDateOnlyValuesStayVerbatim() {
        for original in [
            "", "not-a-date", "2023-02-29", "2024-02-30", "2024-13-01", "2024-00-01",
            "2024-01-00", "2024-1-01", "2024-01-1", " 2024-01-01", "2024-01-01 ",
            "2024/01/01", "２０２４-０１-０１", "2024-01-01T00:00:00Z",
        ] {
            #expect(
                NativeDisplayFormatting.dateOnly(original, locale: Locale(identifier: "ja_JP"))
                    == original)
        }
    }

    @Test func timestampsAcceptFractionalAndWholeSecondsAndUseTheSelectedTimeZone() throws {
        let whole = "2024-03-01T00:30:00Z"
        let fractional = "2024-03-01T00:30:00.123Z"
        let offset = "2024-03-01T09:30:00+09:00"
        let instant = try #require(ISO8601DateFormatter().date(from: whole))
        let west = try #require(TimeZone(identifier: "America/Los_Angeles"))
        for id in ["en_US", "de_DE", "ja_JP"] {
            let locale = Locale(identifier: id)
            for zone in [utc, west] {
                let expected = expectedDate(
                    instant, locale: locale, timeZone: zone, includesTime: true)
                for value in [whole, fractional, offset] {
                    #expect(
                        NativeDisplayFormatting.timestamp(value, locale: locale, timeZone: zone)
                            == expected)
                }
            }
        }
        #expect(
            NativeDisplayFormatting.timestamp(
                whole, locale: Locale(identifier: "en_US"), timeZone: utc)
                != NativeDisplayFormatting.timestamp(
                    whole, locale: Locale(identifier: "en_US"), timeZone: west))
        for original in [
            "invalid timestamp", "2024-13-01T00:00:00Z", "", "2023-02-29",
            "2024-02-30T00:30:00Z", "2023-02-29T00:30:00.123Z",
        ] {
            #expect(
                NativeDisplayFormatting.timestamp(
                    original, locale: Locale(identifier: "de_DE"), timeZone: west) == original)
        }
        #expect(fractional == "2024-03-01T00:30:00.123Z")
    }

    @Test func numbersAndListsUseLocaleButKeepNamesVerbatim() {
        let english = Locale(identifier: "en_US")
        let german = Locale(identifier: "de_DE")
        #expect(NativeDisplayFormatting.number(1234.5, locale: english) == "1,234.5")
        #expect(NativeDisplayFormatting.number(1234.5, locale: german) == "1.234,5")
        #expect(NativeDisplayFormatting.number(1234, locale: german) == "1.234")
        let names = ["Alice", "山田 太郎", "其他"]
        let enList = NativeDisplayFormatting.list(names, locale: english)
        let deList = NativeDisplayFormatting.list(names, locale: german)
        #expect(enList == names.formatted(.list(type: .and).locale(english)))
        #expect(deList == names.formatted(.list(type: .and).locale(german)))
        #expect(enList != deList)
        for name in names {
            #expect(enList.contains(name))
            #expect(deList.contains(name))
        }
        #expect(NativeDisplayFormatting.list([], locale: german).isEmpty)
        #expect(NativeDisplayFormatting.list([names[2]], locale: german) == names[2])
        #expect(names == ["Alice", "山田 太郎", "其他"])
    }
}
