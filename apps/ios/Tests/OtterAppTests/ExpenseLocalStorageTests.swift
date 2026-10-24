import Foundation
import XCTest

@testable import OtterKit

@MainActor
final class ExpenseLocalStorageTests: XCTestCase {
    private func withFile(_ test: (URL, URL, ExpenseLocalStorage) throws -> Void) throws {
        let directory = FileManager.default.temporaryDirectory.appending(
            path: "otter-storage-test-\(UUID().uuidString)", directoryHint: .isDirectory)
        defer { try? FileManager.default.removeItem(at: directory) }
        let url = directory.appending(path: "queue.json")
        let storage = ExpenseLocalStorage.file(at: url)
        try storage.save(Data("synthetic local draft".utf8))
        try test(directory, url, storage)
    }

    func testQueueFileRoundTripIsExcludedFromDeviceBackup() throws {
        try withFile { directory, _, storage in
            XCTAssertEqual(try storage.load(), Data("synthetic local draft".utf8))
            let flags = try directory.resourceValues(forKeys: [.isExcludedFromBackupKey])
            XCTAssertEqual(flags.isExcludedFromBackup, true)
        }
    }

    func testPhysicalDeviceQueueFileHasDataProtection() throws {
        #if targetEnvironment(simulator)
            throw XCTSkip(
                "Simulator does not expose Data Protection attributes. Run on a physical device; this is not a protection pass."
            )
        #else
            try withFile { _, url, _ in
                let attributes = try FileManager.default.attributesOfItem(atPath: url.path)
                XCTAssertEqual(
                    attributes[.protectionKey] as? String,
                    FileProtectionType.completeUntilFirstUserAuthentication.rawValue)
            }
        #endif
    }
}
