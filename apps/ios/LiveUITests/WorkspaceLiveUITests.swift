import XCTest

@MainActor
final class WorkspaceLiveUITests: LiveWorkflowTestCase {
    func testExpenseSplitsDraftSettingsAndRevisionHistory() async throws {
        let origin = try LiveAPIFixture.origin()
        let fixture = try await LiveAPIFixture.shared(origin: origin)
        let name = "Live expenses " + UUID().uuidString
        let friend = "Expense friend"
        let trip = try await fixture.createGroup(name: name, friend: friend)
        let username = fixture.credentials.username
        launchLogin(origin: origin)
        authenticate(fixture.credentials)
        openGroup(trip)
        tab("總覽")
        app.buttons["群組操作"].tap()
        tapLastButton("新增支出")
        replace(app.textFields["expense-description"], with: "Unequal dinner")
        replace(app.textFields["expense-amount"], with: "100")
        selectSplit("比例")
        reveal(app.textFields["\(friend)的比例"])
        XCTAssertTrue(app.textFields["\(friend)的比例"].exists)
        selectSplit("份數")
        reveal(app.textFields["\(friend)的份數"])
        XCTAssertTrue(app.textFields["\(friend)的份數"].exists)
        selectSplit("平均分帳")
        XCTAssertFalse(app.textFields["\(friend)的份數"].exists)
        selectSplit("指定金額")
        replace(app.textFields["\(username)的金額"], with: "25")
        replace(app.textFields["\(friend)的金額"], with: "75")
        tap(app.buttons["expense.accountSettings"])
        XCTAssertTrue(app.navigationBars["帳號設定"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.textFields["account.username"].waitForExistence(timeout: 10))
        expectValue(app.textFields["account.username"], username)
        tap(app.buttons["完成"])
        XCTAssertTrue(app.buttons["expense.accountSettings"].waitForExistence(timeout: 10))
        reveal(app.textFields["expense-description"])
        expectValue(app.textFields["expense-description"], "Unequal dinner")
        reveal(app.textFields["expense-amount"])
        expectValue(app.textFields["expense-amount"], "100")
        let splitPicker = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "分帳方式"))
            .firstMatch
        reveal(splitPicker)
        XCTAssertEqual(splitPicker.label, "分帳方式、指定金額")
        reveal(app.textFields["\(username)的金額"])
        expectValue(app.textFields["\(username)的金額"], "25")
        reveal(app.textFields["\(friend)的金額"])
        expectValue(app.textFields["\(friend)的金額"], "75")
        print(
            "PASS live UI account settings Done preserves unsaved description, amount and unequal split"
        )
        tap(app.buttons["儲存"])
        XCTAssertTrue(app.tabBars.buttons["支出"].waitForExistence(timeout: 15))
        tab("支出")
        tap(app.buttons["Unequal dinner"])
        replace(app.textFields["expense-description"], with: "Unequal dinner updated")
        tap(app.buttons["儲存"])
        XCTAssertTrue(app.tabBars.buttons["支出"].waitForExistence(timeout: 15))
        XCTAssertTrue(app.buttons["Unequal dinner updated"].waitForExistence(timeout: 10))
        tap(app.buttons["修改紀錄"])
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
        print("PASS live UI four split modes, unequal expense, edit and version 1/2 history")
    }
}
