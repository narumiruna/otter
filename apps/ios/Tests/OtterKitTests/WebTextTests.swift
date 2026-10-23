import Testing

@testable import OtterKit

// packages/core money.ts, expense-splits.ts, csv.ts and username.ts use String.trim().
enum WebTextFixtures {
    static let whitespace: [String] =
        ([UInt32](0x0009...0x000D) + [
            0x0020, 0x00A0, 0x1680,
        ] + [UInt32](0x2000...0x200A) + [
            0x2028, 0x2029, 0x202F, 0x205F, 0x3000, 0xFEFF,
        ]).map { String(Unicode.Scalar($0)!) }
    static let nonWhitespace = ["\u{0085}", "\u{180E}", "\u{200B}", "\u{0000}"]
}

struct WebTextTests {
    @Test(arguments: WebTextFixtures.whitespace)
    func trimUsesAll25ECMAScriptCharacters(_ space: String) {
        #expect(WebTextFixtures.whitespace.count == 25)
        #expect(WebText.trim(space).isEmpty)
        #expect(Array(WebText.trim(space + "e\u{0301}" + space).utf16) == Array("e\u{0301}".utf16))
        #expect(
            Array(WebText.trim(space + "a" + space + "b" + space).utf16)
                == Array(("a" + space + "b").utf16))
    }

    @Test(arguments: WebTextFixtures.nonWhitespace)
    func trimPreservesNonECMAScriptCharacters(_ text: String) {
        let raw = text + "e\u{0301}" + text
        #expect(Array(WebText.trim(" \u{FEFF}" + raw + "\u{FEFF} ").utf16) == Array(raw.utf16))
    }

    @Test func literalComparisonDoesNotNormalizeOrRequireGraphemeBoundaries() {
        #expect(WebText.trim("").isEmpty)
        #expect(WebText.trim(WebTextFixtures.whitespace.joined()).isEmpty)
        #expect(!WebText.equal("\u{00E9}", "e\u{0301}"))
        #expect(WebText.equal("e\u{0301}", "e\u{0301}"))
        #expect(!WebText.equal("Tag", "tag"))
        #expect(!WebText.contains("Caf\u{00E9}", "Cafe\u{0301}"))
        #expect(!WebText.contains("Cafe\u{0301}", "Caf\u{00E9}"))
        #expect(WebText.contains("Cafe\u{0301}", "e"))
        #expect(WebText.contains("Cafe\u{0301}", "\u{0301}"))
        #expect(WebText.contains("😀\u{0000}tag", "\u{0000}tag"))
        #expect(WebText.contains("", ""))
        #expect(WebText.contains("tag", ""))
        #expect(!WebText.contains("", "tag"))
    }

    @Test(arguments: WebTextFixtures.whitespace)
    func moneyTrimsExactlyECMAScriptWhitespace(_ space: String) throws {
        #expect(try Currency.usd.parseAmount(space + "12.34" + space) == 1234)
        #expect(try Currency.twd.parseAmount(space + "12" + space) == 12)
    }

    @Test(arguments: WebTextFixtures.nonWhitespace)
    func moneyRejectsNonECMAScriptWhitespace(_ text: String) {
        for currency in [Currency.usd, .twd] {
            #expect(throws: APIError.self) { try currency.parseAmount(text + "12" + text) }
            #expect(throws: APIError.self) { try currency.parseAmount("12" + text) }
        }
    }
}
