import XCTest

@MainActor
final class GroupLifecycleLiveUITests: LiveWorkflowTestCase {
    func testGroupCreationAndSessionMemberWrites() async throws {
        let origin = try LiveAPIFixture.origin()
        let fixture = try await LiveAPIFixture.shared(origin: origin)
        let name = "Live lifecycle " + UUID().uuidString
        let friend = "Lifecycle friend"
        launchLogin(origin: origin)
        authenticate(fixture.credentials)
        tap(app.buttons["建立群組"])
        replace(app.textFields["群組名稱"], with: name)
        tap(app.buttons["建立"])
        XCTAssertTrue(workspaceTab("群組設定").waitForExistence(timeout: 15))
        assertGroupName(name)
        reveal(apiWrites)
        expectValue(apiWrites, "0")

        // A password session can write while API token writes are disabled.
        tab("成員")
        replace(app.textFields["名稱（1–80 字，不可重複）"], with: friend)
        tap(app.buttons["新增"])
        XCTAssertTrue(
            app.buttons.containing(NSPredicate(format: "label CONTAINS %@", friend))
                .firstMatch.waitForExistence(timeout: 10))
        let original = try await fixture.trip(named: name)
        XCTAssertFalse(original.allowApiWrites)
        XCTAssertEqual(original.participants.count, 2)
        XCTAssertEqual(
            Set(original.participants.map(\.name)), Set([fixture.credentials.username, friend]))
        print("PASS live UI group creation and session member write with API token writes disabled")

        _ = try await fixture.seedUnequalExpense(
            in: original, description: "Original preserved dinner")
        app.buttons["群組操作"].tap()
        selectMenuOption("重新整理")
        tab("總覽")
        reveal(app.staticTexts["1 筆支出 · 2 位成員"])
        assertMoney("待結算總額", digits: "75")
    }

    func testOwnerPermissionsArchiveRestoreAndCopy() async throws {
        let origin = try LiveAPIFixture.origin()
        let fixture = try await LiveAPIFixture.shared(origin: origin)
        let name = "Live owner " + UUID().uuidString
        let original = try await fixture.createGroup(name: name, friend: "Lifecycle friend")
        _ = try await fixture.seedUnequalExpense(
            in: original, description: "Original preserved dinner")
        launchLogin(origin: origin)
        authenticate(fixture.credentials)
        openGroup(original)
        reveal(apiWrites)
        expectValue(apiWrites, "0")
        setAPIWrites(true)
        let enabled = try await fixture.trip(id: original.id)
        XCTAssertTrue(enabled.allowApiWrites)
        setAPIWrites(false)
        let disabled = try await fixture.trip(id: original.id)
        XCTAssertFalse(disabled.allowApiWrites)
        tap(app.buttons["封存群組"])
        tapLastButton("封存群組")
        XCTAssertTrue(app.staticTexts["已封存：日常資料僅供檢視"].waitForExistence(timeout: 10))
        tab("成員")
        XCTAssertFalse(app.buttons["新增"].exists)
        tab("群組設定")
        tap(app.buttons["還原群組"])
        tapLastButton("還原群組")
        reveal(app.buttons["封存群組"])
        XCTAssertTrue(app.buttons["封存群組"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.staticTexts["已封存：日常資料僅供檢視"].exists)
        tap(app.buttons["複製群組"])
        tapLastButton("複製群組")
        assertGroupName(name + " (copy)")
        tab("總覽")
        reveal(app.staticTexts["0 筆支出 · 2 位成員"])
        reveal(app.staticTexts["目前沒有待結算款項。"])
        let copy = try await fixture.trip(named: name + " (copy)")
        XCTAssertNotEqual(copy.id, original.id)
        XCTAssertTrue(copy.expenses.isEmpty)
        XCTAssertEqual(Set(copy.participants.map(\.name)), Set(original.participants.map(\.name)))
        // Normal tab navigation must keep the copied workspace, not pop to the original.
        tab("群組設定")
        XCTAssertEqual(
            app.textFields["群組名稱（1–100 字）"].value as? String, name + " (copy)")

        // Select the original by its stable row ID, not a split-view Back container or title.
        app.terminate()
        app.launch()
        XCTAssertTrue(app.buttons["建立群組"].waitForExistence(timeout: 15))
        openGroup(original)
        tab("總覽")
        reveal(app.staticTexts["1 筆支出 · 2 位成員"])
        assertMoney("待結算總額", digits: "75")
        let preserved = try await fixture.trip(id: original.id)
        XCTAssertEqual(preserved.name, name)
        XCTAssertNil(preserved.archivedAt)
        XCTAssertFalse(preserved.allowApiWrites)
        XCTAssertEqual(preserved.expenses.count, 1)
        XCTAssertEqual(preserved.expenses.first?.description, "Original preserved dinner")
        XCTAssertEqual(preserved.expenses.first?.amountMinor, 100)
        XCTAssertEqual(preserved.expenses.first?.version, 1)
        XCTAssertEqual(
            Set(preserved.participants.map(\.name)), Set(original.participants.map(\.name)))
        print(
            "PASS live UI owner API permission toggles, archive/restore/copy and original preserved"
        )
    }

    private var apiWrites: XCUIElement {
        app.switches["允許 API token 修改此群組"].switches.firstMatch
    }

    private func setAPIWrites(_ enabled: Bool) {
        let control = apiWrites
        reveal(control)
        XCTAssertTrue(control.isEnabled)
        // Resolve a fresh frame after tab changes instead of a cached activation point.
        control.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        tapPresentedButton(app.buttons[enabled ? "允許 API token 寫入" : "停用 API token 寫入"])
        expectValue(apiWrites, enabled ? "1" : "0", timeout: 30)
    }
}
