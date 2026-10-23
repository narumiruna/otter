import XCTest

/// Shared UI operations only. Each test owns its group and its Keychain login session.
@MainActor
class LiveWorkflowTestCase: XCTestCase {
    let app = XCUIApplication()
    var ownsSession = false
    var privatePasswords: [String] = []

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
    }

    override func tearDown() async throws {
        if testRun?.hasSucceeded == false {
            let screenshot = XCTAttachment(screenshot: app.screenshot())
            screenshot.name = "workspace-failure"
            screenshot.lifetime = .keepAlways
            add(screenshot)
            var hierarchy = app.debugDescription
            for password in privatePasswords + LiveAPIFixture.passwords {
                hierarchy = hierarchy.replacingOccurrences(of: password, with: "[REDACTED]")
            }
            let attachment = XCTAttachment(string: hierarchy)
            attachment.name = "workspace-hierarchy"
            attachment.lifetime = .keepAlways
            add(attachment)
        }
        // Relaunch closes any open sheet. Only this test's session is signed out.
        if ownsSession {
            app.terminate()
            app.launch()
            if app.buttons["帳號"].waitForExistence(timeout: 15) {
                signOut()
            }
            XCTAssertTrue(
                app.textFields["login.username"].waitForExistence(timeout: 15),
                "Cleanup must sign out this test's account.")
        }
        app.terminate()
    }

    func launchLogin(origin: URL) {
        app.launch()
        XCTAssertTrue(app.textFields["login.username"].waitForExistence(timeout: 15))
        let chineseMode = app.segmentedControls["login.mode"].buttons["Token 受限模式"]
        // Use production Appearance UI only when the saved locale needs to change.
        // The smoke suite separately tests language selection and sheet dismissal.
        if !chineseMode.exists {
            tap(app.buttons["login.preferences"])
            tap(app.buttons["appearance.language"])
            let languageOption = app.buttons["正體中文"]
            tapPresentedButton(languageOption)
            waitForMenuOptionToDisappear(languageOption)
            let preferencesDone = app.buttons["login.preferences.done"]
            tap(preferencesDone)
            let dismissed = XCTNSPredicateExpectation(
                predicate: NSPredicate(format: "exists == false"), object: preferencesDone)
            XCTAssertEqual(XCTWaiter.wait(for: [dismissed], timeout: 5), .completed)
        }
        XCTAssertTrue(chineseMode.waitForExistence(timeout: 10))
        XCTAssertTrue(app.textFields["login.username"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.secureTextFields["login.password"].exists)
        XCTAssertFalse(app.secureTextFields["login.token"].exists)
        XCTAssertFalse(app.buttons["login.submit"].isEnabled)
        replace(app.textFields["login.server"], with: origin.absoluteString)
    }

    func authenticate(_ credentials: LiveAPIFixture.Credentials, register: Bool = false) {
        privatePasswords.append(credentials.password)
        app.segmentedControls["login.mode"].buttons[register ? "註冊" : "登入"].tap()
        replace(app.textFields["login.username"], with: credentials.username)
        enterPassword(credentials.password)
        // Cleanup also runs if a successful server login is followed by a UI failure.
        ownsSession = true
        tap(app.buttons["login.submit"])
        XCTAssertTrue(app.buttons["建立群組"].waitForExistence(timeout: 20))
    }

    func openGroup(_ trip: LiveAPIFixture.Trip) {
        tap(app.buttons["trip.\(trip.id)"])
        XCTAssertTrue(workspaceTab("群組設定").waitForExistence(timeout: 15))
        assertGroupName(trip.name)
    }

    func assertGroupName(_ name: String) {
        // Check editable group data, not a parent navigation title. Resolve from the app
        // so a destination change cannot leave the query tied to the previous Form.
        tab("群組設定")
        let actualName = app.textFields.matching(
            NSPredicate(format: "value == %@", name)
        ).firstMatch
        // Copy can replace the detail after the first tab tap. Select Settings again
        // only while the requested group's actual content is not yet present.
        for _ in 0..<3 {
            if actualName.waitForExistence(timeout: 3) { break }
            tab("群組設定")
        }
        reveal(actualName)
        XCTAssertEqual(actualName.value as? String, name)
    }

    func signOut() {
        // Do not scroll a transient Menu or confirmation dialog. XCTest waits for
        // the selected button to become hittable when tap() runs.
        let account = app.buttons["帳號"]
        XCTAssertTrue(account.waitForExistence(timeout: 10))
        account.tap()
        let logout = app.buttons["登出"]
        XCTAssertTrue(logout.waitForExistence(timeout: 10), "The account Menu must expose logout.")
        logout.tap()
        XCTAssertTrue(logout.waitForExistence(timeout: 10), "Logout must require confirmation.")
        logout.tap()
        XCTAssertTrue(app.textFields["login.username"].waitForExistence(timeout: 15))
        ownsSession = false
    }

    func enterPassword(_ password: String) {
        let field = app.secureTextFields["login.password"]
        reveal(field)
        field.tap()
        dismissPasswordSuggestion()
        // Enter the first character separately because AutoFill can appear on first input.
        // Do not empty or re-tap the field: either action can open the suggestion again.
        // XCTest redacts all input to SecureField. Never put credentials in an activity name.
        field.typeText(String(password.prefix(1)))
        dismissPasswordSuggestion()
        // Closing the registration suggestion can clear the character that opened it.
        let value = field.value as? String ?? ""
        let enteredCount = value == field.placeholderValue ? 0 : value.count
        XCTAssertLessThanOrEqual(enteredCount, 1)
        field.typeText(String(password.dropFirst(enteredCount)))
        dismissPasswordSuggestion()
        XCTAssertEqual((field.value as? String)?.count, password.count)
        dismissKeyboard()
    }

    private func dismissPasswordSuggestion() {
        if app.buttons["GenerateStrongPasswordButton"].waitForExistence(timeout: 1) {
            app.buttons["Close"].tap()
            let dismissed = XCTNSPredicateExpectation(
                predicate: NSPredicate(format: "exists == false"),
                object: app.buttons["GenerateStrongPasswordButton"])
            XCTAssertEqual(XCTWaiter.wait(for: [dismissed], timeout: 5), .completed)
            XCTAssertFalse(app.buttons["GenerateStrongPasswordButton"].exists)
        }
        for title in ["Use My Own Password", "Choose My Own Password"] {
            if app.buttons[title].exists { app.buttons[title].tap() }
        }
    }

    func tapLastButton(_ title: String) {
        let buttons = app.buttons.matching(NSPredicate(format: "label == %@", title))
            .allElementsBoundByIndex.filter { $0.isHittable }
        XCTAssertGreaterThan(buttons.count, 0)
        guard let button = buttons.last else { return }
        tapPresentedButton(button)
    }

    func workspaceTab(_ title: String) -> XCUIElement {
        let tab = app.tabBars.buttons[title]
        if tab.exists { return tab }
        // iPad can expose TabView buttons without a TabBar container.
        return app.buttons.matching(NSPredicate(format: "label == %@", title)).firstMatch
    }

    func tab(_ title: String) {
        tapPresentedButton(workspaceTab(title))
    }

    func selectMenuOption(_ title: String) {
        let option = app.buttons[title]
        tapPresentedButton(option)
        waitForMenuOptionToDisappear(option)
    }

    func selectSplit(_ title: String) {
        let picker = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "分帳方式"))
            .firstMatch
        tap(picker)
        // A Picker menu is transient. Do not dismiss a keyboard or scroll its parent Form.
        selectMenuOption(title)
    }

    private func waitForMenuOptionToDisappear(_ option: XCUIElement) {
        let dismissed = XCTNSPredicateExpectation(
            predicate: NSPredicate(format: "exists == false"), object: option)
        XCTAssertEqual(XCTWaiter.wait(for: [dismissed], timeout: 10), .completed)
    }

    func tapPresentedButton(_ element: XCUIElement) {
        let available = XCTNSPredicateExpectation(
            predicate: NSPredicate(format: "exists == true AND hittable == true"), object: element)
        XCTAssertEqual(XCTWaiter.wait(for: [available], timeout: 10), .completed)
        XCTAssertTrue(element.isEnabled)
        element.tap()
    }

    func assertMoney(_ title: String, digits: String) {
        let row = app.descendants(matching: .any).matching(
            NSPredicate(format: "label == %@", title)
        ).firstMatch
        reveal(row)
        let predicate = NSPredicate(format: "value == %@", "TWD \(digits)")
        expectation(for: predicate, evaluatedWith: row)
        waitForExpectations(timeout: 10)
    }

    func expectValue(_ element: XCUIElement, _ value: String) {
        expectation(for: NSPredicate(format: "value == %@", value), evaluatedWith: element)
        waitForExpectations(timeout: 10)
    }

    private var foregroundScroll: XCUIElement {
        // A keyboard can cover a Form's hit point while its visible cells remain interactive.
        let surfaces =
            app.collectionViews.allElementsBoundByIndex + app.tables.allElementsBoundByIndex
        return surfaces.last(where: { surface in
            surface.isHittable
                || surface.cells.allElementsBoundByIndex.contains(where: { $0.isHittable })
        }) ?? app
    }

    func dismissKeyboard() {
        if app.keyboards.firstMatch.exists {
            app.navigationBars.allElementsBoundByIndex.last(where: { $0.isHittable })?.tap()
            // A sheet has its own Form above the background navigation stack.
            // Drag that Form when a navigation-bar tap does not dismiss its keyboard.
            if app.keyboards.firstMatch.exists { scrollForeground(down: true) }
        }
    }

    func replace(_ field: XCUIElement, with value: String) {
        reveal(field)
        field.tap()
        if !app.keyboards.firstMatch.waitForExistence(timeout: 2) { field.tap() }
        let previous = field.value as? String ?? ""
        let placeholder = field.placeholderValue ?? ""
        if previous != placeholder && !previous.isEmpty {
            field.tap(withNumberOfTaps: 3, numberOfTouches: 1)
            field.typeText(
                String(repeating: XCUIKeyboardKey.delete.rawValue, count: previous.count))
        }
        field.typeText(value)
        dismissKeyboard()
    }

    func tap(_ element: XCUIElement) {
        reveal(element)
        XCTAssertTrue(element.isEnabled)
        element.tap()
    }

    private func scrollForeground(down: Bool, surface: XCUIElement? = nil) {
        let scroll = surface ?? foregroundScroll
        var visible = scroll.frame.intersection(app.frame)
        if let navigation = app.navigationBars.allElementsBoundByIndex.last(where: { $0.isHittable }
        ) {
            let top = max(visible.minY, navigation.frame.maxY)
            visible = CGRect(
                x: visible.minX, y: top, width: visible.width, height: max(0, visible.maxY - top))
        }
        let keyboard = app.keyboards.firstMatch
        if keyboard.exists {
            visible.size.height = max(0, min(visible.maxY, keyboard.frame.minY - 12) - visible.minY)
        }
        XCTAssertFalse(visible.isEmpty, "The foreground Form must have a visible scroll region.")
        let upper = app.coordinate(withNormalizedOffset: .zero).withOffset(
            CGVector(dx: visible.midX, dy: visible.minY + visible.height * 0.25))
        let lower = app.coordinate(withNormalizedOffset: .zero).withOffset(
            CGVector(dx: visible.midX, dy: visible.minY + visible.height * 0.85))
        if down {
            upper.press(forDuration: 0.05, thenDragTo: lower)
        } else {
            lower.press(forDuration: 0.05, thenDragTo: upper)
        }
    }

    func reveal(_ element: XCUIElement, upward: Bool = false) {
        // Revealing a control must not dismiss or drag a transient Menu or dialog.
        if element.waitForExistence(timeout: 3), element.isHittable { return }
        let scroll = foregroundScroll
        for attempt in 0..<24 {
            if element.exists && element.isHittable { return }
            let above =
                element.exists && !element.frame.isEmpty && element.frame.maxY < app.frame.midY
            let down = above || (!element.exists && (attempt >= 12 ? !upward : upward))
            scrollForeground(down: down, surface: scroll)
        }
        XCTAssertTrue(element.exists && element.isHittable, "Required UI element is not available.")
    }
}
