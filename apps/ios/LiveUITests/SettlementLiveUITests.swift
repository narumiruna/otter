import XCTest

@MainActor
final class SettlementLiveUITests: LiveWorkflowTestCase {
    func testPartialSettlementDateMemoAndDeletion() async throws {
        let origin = try LiveAPIFixture.origin()
        let fixture = try await LiveAPIFixture.shared(origin: origin)
        let name = "Live settlement " + UUID().uuidString
        let friend = "Settlement friend"
        let empty = try await fixture.createGroup(name: name, friend: friend)
        let trip = try await fixture.seedUnequalExpense(in: empty, description: "Settlement dinner")
        let initial = try await fixture.trip(id: trip.id)
        let initialPayments = try XCTUnwrap(
            initial.settlementPayments, "Owner GET must include settlementPayments.")
        XCTAssertTrue(initialPayments.isEmpty)
        let username = fixture.credentials.username
        launchLogin(origin: origin)
        authenticate(fixture.credentials)
        openGroup(trip)
        tab("總覽")
        assertMoney("待結算總額", digits: "75")
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = .current
        formatter.dateFormat = "yyyy-MM-dd"
        let expectedDate = formatter.string(from: Date())
        tap(app.buttons["記錄 \(friend) 付給 \(username) 的付款"])
        reveal(app.staticTexts["請先完成付款。此操作只記錄已付款，不會進行實際轉帳。"])
        replace(app.textFields["付款金額，TWD"], with: "20")
        // SwiftUI exposes the visible label as a sibling of the compact DatePicker.
        let dateRow = app.cells.containing(.staticText, identifier: "付款日期").firstMatch
        let dateButton = dateRow.datePickers.firstMatch.buttons.firstMatch
        reveal(dateButton)
        XCTAssertFalse((dateButton.value as? String ?? "").isEmpty)
        replace(app.textFields["付款備註，最多 160 字"], with: "Live partial payment")
        tap(app.buttons["確認已付款並記錄"])
        let confirmation = app.staticTexts.containing(
            NSPredicate(
                format: "label CONTAINS %@ AND label CONTAINS %@", "付款日期：", "此操作不會進行實際轉帳。")
        ).firstMatch
        XCTAssertTrue(confirmation.waitForExistence(timeout: 10))
        tap(app.buttons["確認並記錄已付款"])
        XCTAssertTrue(app.tabBars.buttons["總覽"].waitForExistence(timeout: 15))
        assertMoney("待結算總額", digits: "55")
        reveal(app.staticTexts["Live partial payment"])
        let recorded = try await fixture.trip(id: trip.id)
        let recordedPayments = try XCTUnwrap(
            recorded.settlementPayments, "Owner GET must include settlementPayments.")
        XCTAssertEqual(recordedPayments.count, 1)
        XCTAssertEqual(recordedPayments.first?.amountMinor, 20)
        XCTAssertEqual(recordedPayments.first?.paidAt, expectedDate)
        XCTAssertEqual(recordedPayments.first?.note, "Live partial payment")
        let deletePayment = app.buttons.containing(
            NSPredicate(
                format: "label BEGINSWITH %@ AND label CONTAINS %@", "刪除 \(friend)", "的付款紀錄")
        ).firstMatch
        tap(deletePayment)
        tap(app.buttons["刪除付款紀錄"])
        assertMoney("待結算總額", digits: "75")
        reveal(app.staticTexts["尚無付款紀錄。"])
        XCTAssertFalse(app.staticTexts["Live partial payment"].exists)
        let deleted = try await fixture.trip(id: trip.id)
        let deletedPayments = try XCTUnwrap(
            deleted.settlementPayments, "Owner GET must include settlementPayments.")
        XCTAssertTrue(deletedPayments.isEmpty)
        XCTAssertEqual(deleted.expenses.count, 1)
        print("PASS live UI partial payment date/memo and deletion recalculate 75 to 55 to 75")
    }
}
