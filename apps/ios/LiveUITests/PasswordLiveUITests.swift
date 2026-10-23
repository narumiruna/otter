import XCTest

@MainActor
final class PasswordLiveUITests: LiveWorkflowTestCase {
    func testPasswordSignupLoginAndKeychainPersistence() throws {
        let origin = try LiveAPIFixture.origin()
        let credentials = LiveAPIFixture.Credentials.unique("ios-ui-auth")
        launchLogin(origin: origin)
        authenticate(credentials, register: true)
        print("PASS live UI password signup")
        signOut()

        app.terminate()
        launchLogin(origin: origin)
        authenticate(credentials)
        print("PASS live UI password login after logout/relaunch")
        app.terminate()
        app.launch()
        XCTAssertTrue(
            app.buttons["建立群組"].waitForExistence(timeout: 15),
            "A valid session must survive relaunch.")
        signOut()
        app.terminate()
        app.launch()
        XCTAssertTrue(app.textFields["login.username"].waitForExistence(timeout: 15))
        XCTAssertTrue(app.secureTextFields["login.password"].exists)
        XCTAssertFalse(app.secureTextFields["login.token"].exists)
        XCTAssertFalse(app.buttons["建立群組"].exists)
        XCTAssertFalse(app.buttons["login.submit"].isEnabled)
        print("PASS live UI Keychain persistence and logout/relaunch")
    }
}
