import XCTest

@MainActor
final class WorkspaceLiveUITests: LiveWorkflowTestCase {
    private let friend = "Expense friend"

    func testExpenseSplitModes() async throws {
        let (fixture, trip) = try await beginNewExpense()
        selectSplit("比例")
        reveal(app.textFields["\(friend)的比例"])
        XCTAssertTrue(app.textFields["\(friend)的比例"].exists)
        selectSplit("份數")
        reveal(app.textFields["\(friend)的份數"])
        XCTAssertTrue(app.textFields["\(friend)的份數"].exists)
        selectSplit("平均分帳")
        XCTAssertFalse(app.textFields["\(friend)的份數"].exists)
        selectSplit("指定金額")
        reveal(app.textFields["\(friend)的金額"])
        XCTAssertTrue(app.textFields["\(friend)的金額"].exists)
        tap(app.buttons["取消"])
        selectMenuOption("放棄變更")
        let saved = try await fixture.trip(id: trip.id)
        XCTAssertTrue(saved.expenses.isEmpty)
        print("PASS live UI four split modes and explicit draft discard")
    }

    func testDraftSurvivesAccountSettings() async throws {
        let (fixture, trip) = try await beginNewExpense()
        let username = fixture.credentials.username
        selectSplit("指定金額")
        replace(app.textFields["\(username)的金額"], with: "25")
        replace(app.textFields["\(friend)的金額"], with: "75")
        tap(app.buttons["expense.accountSettings"])
        XCTAssertTrue(app.navigationBars["帳號設定"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.textFields["account.username"].waitForExistence(timeout: 10))
        expectValue(app.textFields["account.username"], username)
        tap(app.buttons["完成"])
        XCTAssertTrue(app.buttons["expense.accountSettings"].waitForExistence(timeout: 10))
        reveal(app.textFields["\(friend)的金額"])
        expectValue(app.textFields["\(friend)的金額"], "75")
        reveal(app.textFields["\(username)的金額"])
        expectValue(app.textFields["\(username)的金額"], "25")
        let splitPicker = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "分帳方式"))
            .firstMatch
        reveal(splitPicker)
        XCTAssertEqual(splitPicker.label, "分帳方式、指定金額")
        reveal(app.textFields["expense-amount"], upward: true)
        expectValue(app.textFields["expense-amount"], "100")
        reveal(app.textFields["expense-description"], upward: true)
        expectValue(app.textFields["expense-description"], "Unequal dinner")
        print(
            "PASS live UI account settings Done preserves unsaved description, amount and unequal split"
        )
        saveExpense()
        tab("支出")
        XCTAssertTrue(app.buttons["Unequal dinner"].waitForExistence(timeout: 10))
        let saved = try await fixture.trip(id: trip.id)
        XCTAssertEqual(saved.expenses.count, 1)
        XCTAssertEqual(saved.expenses.first?.version, 1)
        XCTAssertEqual(saved.expenses.first?.description, "Unequal dinner")
        XCTAssertEqual(saved.expenses.first?.amountMinor, 100)
    }

    func testExpenseEditAndRevisionHistory() async throws {
        let origin = try LiveAPIFixture.origin()
        let fixture = try await LiveAPIFixture.shared(origin: origin)
        let trip = try await fixture.createGroup(
            name: "Live history " + UUID().uuidString, friend: friend)
        _ = try await fixture.seedUnequalExpense(in: trip, description: "Unequal dinner")
        launchLogin(origin: origin)
        authenticate(fixture.credentials)
        openGroup(trip)
        tab("支出")
        tap(app.buttons["Unequal dinner"])
        replace(app.textFields["expense-description"], with: "Unequal dinner updated")
        saveExpense()
        XCTAssertTrue(app.buttons["Unequal dinner updated"].waitForExistence(timeout: 10))
        tap(app.buttons["修改紀錄"])
        XCTAssertTrue(app.navigationBars["群組修改紀錄"].waitForExistence(timeout: 10))
        let updated = app.staticTexts.containing(
            NSPredicate(format: "label CONTAINS %@ AND label CONTAINS %@", "版本 2", "修改")
        ).firstMatch
        XCTAssertTrue(
            updated.waitForExistence(timeout: 15),
            "An edit must create version 2, not another expense.")
        reveal(
            app.staticTexts.containing(
                NSPredicate(format: "label CONTAINS %@ AND label CONTAINS %@", "版本 1", "新增")
            ).firstMatch)
        tap(app.buttons["關閉"])
        let saved = try await fixture.trip(id: trip.id)
        XCTAssertEqual(saved.expenses.count, 1)
        XCTAssertEqual(saved.expenses.first?.version, 2)
        XCTAssertEqual(saved.expenses.first?.description, "Unequal dinner updated")
        XCTAssertEqual(saved.expenses.first?.amountMinor, 100)
        print("PASS live UI expense edit and version 1/2 history without duplicate creation")
    }

    private func beginNewExpense() async throws -> (LiveAPIFixture, LiveAPIFixture.Trip) {
        let origin = try LiveAPIFixture.origin()
        let fixture = try await LiveAPIFixture.shared(origin: origin)
        let trip = try await fixture.createGroup(
            name: "Live expenses " + UUID().uuidString, friend: friend)
        launchLogin(origin: origin)
        authenticate(fixture.credentials)
        openGroup(trip)
        tab("總覽")
        app.buttons["群組操作"].tap()
        tapLastButton("新增支出")
        replace(app.textFields["expense-description"], with: "Unequal dinner")
        replace(app.textFields["expense-amount"], with: "100")
        return (fixture, trip)
    }

    private func saveExpense() {
        let button = app.buttons["儲存"]
        tap(button)
        let dismissed = XCTNSPredicateExpectation(
            predicate: NSPredicate(format: "exists == false"), object: button)
        XCTAssertEqual(XCTWaiter.wait(for: [dismissed], timeout: 10), .completed)
        XCTAssertTrue(workspaceTab("支出").waitForExistence(timeout: 15))
    }
}
