import XCTest

/// Run on a dedicated Simulator with no saved Otter login.
@MainActor
final class LoginUITests: XCTestCase {
    private func selectTokenMode(_ app: XCUIApplication) {
        app.buttons["login.preferences"].tap()
        let language = app.buttons["appearance.language"]
        let forms = app.collectionViews.allElementsBoundByIndex + app.tables.allElementsBoundByIndex
        let form = forms.last ?? app
        for _ in 0..<4 {
            if language.exists && language.isHittable { break }
            form.swipeUp()
        }
        XCTAssertTrue(language.waitForExistence(timeout: 5))
        language.tap()
        let option = app.buttons["正體中文"]
        option.tap()
        XCTAssertTrue(option.waitForNonExistence(timeout: 5))
        let done = app.buttons["login.preferences.done"]
        done.tap()
        XCTAssertTrue(
            done.waitForNonExistence(timeout: 5),
            "Preferences must be dismissed, not hidden behind another query.")
        let mode = app.segmentedControls["login.mode"]
        XCTAssertTrue(mode.waitForExistence(timeout: 10))
        mode.buttons["Token 受限模式"].tap()
    }

    func testPasswordLoginIsDefaultAndPasskeyDoesNotNeedUsername() {
        let app = XCUIApplication()
        app.launch()
        XCTAssertTrue(app.textFields["login.username"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.secureTextFields["login.password"].exists)
        XCTAssertFalse(app.buttons["login.submit"].isEnabled)
        XCTAssertTrue(app.buttons["login.passkey"].isEnabled)
        XCTAssertFalse(app.secureTextFields["login.token"].exists)
    }

    func testTokenIsRequiredAndUsesSecureField() {
        let app = XCUIApplication()
        app.launch()
        selectTokenMode(app)
        let token = app.secureTextFields["login.token"]
        XCTAssertTrue(token.waitForExistence(timeout: 10))
        XCTAssertFalse(app.buttons["login.submit"].isEnabled)

        token.tap()
        token.typeText("otter_api_ui_test")
        XCTAssertTrue(app.buttons["login.submit"].isEnabled)
    }

    func testInsecureServerIsRejectedWithoutLosingInput() {
        let app = XCUIApplication()
        app.launch()
        selectTokenMode(app)
        let server = app.textFields["login.server"]
        XCTAssertTrue(server.waitForExistence(timeout: 10))
        server.tap()
        if !app.keyboards.firstMatch.waitForExistence(timeout: 3) {
            server.tap()
        }
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))
        let original = server.value as? String ?? ""
        server.tap(withNumberOfTaps: 3, numberOfTouches: 1)
        server.typeText(
            String(repeating: XCUIKeyboardKey.delete.rawValue, count: original.count)
                + "http://example.com")

        let token = app.secureTextFields["login.token"]
        token.tap()
        token.typeText("otter_api_ui_test")
        app.buttons["login.submit"].tap()

        let alert = app.alerts["發生錯誤"]
        XCTAssertTrue(alert.waitForExistence(timeout: 5))
        XCTAssertTrue(
            alert.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "HTTPS"))
                .firstMatch.exists)
        alert.buttons["好"].tap()
        XCTAssertEqual(server.value as? String, "http://example.com")
        XCTAssertTrue(app.buttons["login.submit"].isEnabled)
    }
}
