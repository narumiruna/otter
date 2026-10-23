import Foundation
import Security
import XCTest

@testable import OtterKit

@MainActor
final class SessionStoreTests: XCTestCase {
    func testRealKeychainRoundTripUsesDeviceOnlyProtectionAndDeletesOnlyOwnedItem() throws {
        let service = "dev.narumi.otter.tests.\(UUID().uuidString)"
        let store = SessionStore(service: service)
        defer { try? store.delete() }
        XCTAssertNil(try store.load())
        let saved = SavedSession(
            server: "https://otter.example",
            auth: .session(
                SessionCookie(
                    value: "synthetic-test-session", expiresAt: Date().addingTimeInterval(60))),
            user: User(id: "test", name: "Test", username: "test"))
        try store.save(saved)
        let loaded = try XCTUnwrap(store.load())
        XCTAssertTrue(loaded.auth == saved.auth)
        XCTAssertEqual(loaded.user?.id, "test")
        var metadata: CFTypeRef?
        let status = SecItemCopyMatching(
            [
                kSecClass: kSecClassGenericPassword,
                kSecAttrService: service,
                kSecAttrAccount: "api-session",
                kSecReturnAttributes: true,
                kSecMatchLimit: kSecMatchLimitOne,
            ] as CFDictionary, &metadata)
        XCTAssertEqual(status, errSecSuccess)
        let attributes = try XCTUnwrap(metadata as? [String: Any])
        XCTAssertTrue(
            (attributes[kSecAttrAccessible as String] as? String)
                == (kSecAttrAccessibleWhenUnlockedThisDeviceOnly as String))
        XCTAssertTrue((attributes[kSecAttrSynchronizable as String] as? Bool) != true)
        try store.delete()
        XCTAssertNil(try store.load())
    }

    func testLegacyKeychainBytesAreReadableAndReplacedOnlyBySuccessfulSave() throws {
        let service = "dev.narumi.otter.tests.\(UUID().uuidString)"
        let store = SessionStore(service: service)
        defer { try? store.delete() }
        let legacy = Data(
            #"{"server":"https://otter.example","token":"otter_api_synthetic_legacy"}"#.utf8)
        let status = SecItemAdd(
            [
                kSecClass: kSecClassGenericPassword,
                kSecAttrService: service,
                kSecAttrAccount: "api-session",
                kSecAttrSynchronizable: false,
                kSecAttrAccessible: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
                kSecValueData: legacy,
            ] as CFDictionary, nil)
        XCTAssertEqual(status, errSecSuccess)
        let loaded = try XCTUnwrap(store.load())
        XCTAssertTrue(loaded.auth == .bearer("otter_api_synthetic_legacy"))
        try store.save(loaded)
        XCTAssertTrue(try store.load()?.auth == loaded.auth)
    }
}
