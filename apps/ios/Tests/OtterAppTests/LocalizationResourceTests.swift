import Foundation
import OtterKit
import XCTest

@testable import Otter

@MainActor
final class LocalizationResourceTests: XCTestCase {
    func testBundledLanguagesAndFormattedAliasesUseTheSelectedResource() {
        XCTAssertEqual(
            NativeLocalization.string("外觀", locale: Locale(identifier: "en")), "Appearance")
        XCTAssertEqual(NativeLocalization.string("外觀", locale: Locale(identifier: "ja")), "外観")
        XCTAssertEqual(
            NativeLocalization.string(
                "native.rootView.authMethod", locale: Locale(identifier: "en")), "Sign-in method")
        let value = "餐飲 <%1$@> & \"user\""
        XCTAssertEqual(
            NativeLocalization.string(
                "native.accountSettingsView.createdAt", defaultValue: "建立時間：\(value)",
                locale: Locale(identifier: "en")), "Created: \(value)")
        XCTAssertEqual(
            NativeLocalization.string("分類：\(value)", locale: Locale(identifier: "ja")),
            "カテゴリ：\(value)")
    }

    func testPrintLocalizesPresentationWithoutChangingExpenseDataOrAddingHiddenPayments() {
        let expense = Expense(
            id: "expense", description: "餐飲 <script>", amountMinor: 101,
            currency: .twd, paidById: "person", participantIds: ["person"],
            expenseDate: "2026-10-23", category: "餐飲", tags: ["user-tag"])
        let trip = Trip(
            id: "trip", name: "旅行 <script>", baseCurrency: .twd,
            participants: [Participant(id: "person", name: "餐飲")], expenses: [expense])
        let payload = TripPayload(trip: trip, readonly: true)
        let html = CSV.printHTML(payload: payload, locale: Locale(identifier: "en"))
        XCTAssertTrue(html.contains("<html lang=\"en\">"))
        XCTAssertTrue(html.contains("<h2>Expenses</h2>"))
        XCTAssertTrue(html.contains("<h2>Payment history</h2>"))
        XCTAssertTrue(html.contains("This shared view does not provide payment details."))
        XCTAssertTrue(html.contains("餐飲 &lt;script&gt;"))
        XCTAssertTrue(html.contains("Food／user-tag"))
        XCTAssertFalse(html.contains("<script>"))
        XCTAssertEqual(expense.category, "餐飲")
        XCTAssertEqual(expense.expenseDate, "2026-10-23")
        XCTAssertEqual(expense.amountMinor, 101)
        XCTAssertEqual(expense.description, "餐飲 <script>")
        XCTAssertNil(trip.settlementPayments)
    }
}
