import XCTest

@testable import Otter

final class AccountUsernameTests: XCTestCase {
    func testValidatesTrimmedOriginalASCIIBeforeLowercasing() {
        XCTAssertTrue(AccountUsername.isValid("Kate"))
        XCTAssertEqual(Array(AccountUsername.normalized("Kate").utf16), Array("kate".utf16))
        for name in [
            "\u{212A}ate", "Ｋate", "katé", "kate\u{0085}", "kate\u{200B}", "kate\u{180E}",
            "kate\u{0000}",
            "ka", String(repeating: "a", count: 33),
        ] {
            XCTAssertFalse(AccountUsername.isValid(name), name)
        }
        for name in [
            "a_B-9", String(repeating: "A", count: 32), "\u{FEFF}Kate\u{FEFF}", " \tKate\n",
        ] {
            XCTAssertTrue(AccountUsername.isValid(name), name)
        }
        XCTAssertEqual(
            Array(AccountUsername.normalized("\u{FEFF}Kate\u{FEFF}").utf16), Array("kate".utf16))
    }
}
