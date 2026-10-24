import Foundation
import XCTest

@testable import Otter
@testable import OtterKit

@MainActor
private final class GroupTestCredentials: CredentialStore {
    var saved: SavedSession?
    func load() throws -> SavedSession? { saved }
    func save(_ value: SavedSession) throws { saved = value }
    func delete() throws { saved = nil }
}

@MainActor
private final class GroupTestPause {
    private var continuation: CheckedContinuation<Void, Never>?
    func wait() async { await withCheckedContinuation { continuation = $0 } }
    func release() {
        continuation?.resume()
        continuation = nil
    }
}

// This suite runs in the OtterTests target with in-memory credentials.
final class GroupManagementStateTests: XCTestCase {
    @MainActor
    private func session() throws -> AppSession {
        let value = AppSession(store: GroupTestCredentials()) {
            try OtterClient(server: $0, token: $1)
        }
        try login(value, userID: "owner")
        return value
    }
    @MainActor
    private func login(_ session: AppSession, userID: String) throws {
        let client = try OtterClient(server: "https://otter.example", token: "otter_api_test")
        try session.acceptLogin(
            AuthenticatedLogin(
                client: client, user: User(id: userID, name: userID, username: userID)),
            for: session.sessionID)
    }
    private var payload: TripPayload {
        TripPayload(
            trip: Trip(
                id: "trip", ownerId: "owner", name: "Trip", baseCurrency: .twd,
                allowApiWrites: true), currentUserRole: .owner)
    }

    @MainActor
    func testSubmissionFromAnOldViewDoesNotStart() async throws {
        let session = try session()
        let state = GroupManagementState()
        let request = state.request(sessionID: session.sessionID)
        state.invalidate()
        var called = false
        await state.run(
            request: request, session: session, payload: payload, operation: .changePreferences
        ) { _ in
            called = true
            return true
        } accept: { _ in
            XCTFail("An invalidated request must not be accepted")
        }
        XCTAssertFalse(called)
    }

    @MainActor
    func testLateUnauthorizedDoesNotClearAnotherAccount() async throws {
        let session = try session()
        let state = GroupManagementState()
        let pause = GroupTestPause()
        let request = state.request(sessionID: session.sessionID)
        let pending = Task { @MainActor in
            await state.run(
                request: request, session: session, payload: payload, operation: .changePreferences
            ) { _ -> Bool in
                await pause.wait()
                throw APIError.unauthorized
            } accept: { _ in
                XCTFail("A failed request must not be accepted")
            }
        }
        while !state.busy { await Task.yield() }
        try login(session, userID: "other")
        let newID = session.sessionID
        pause.release()
        await pending.value
        XCTAssertEqual(session.sessionID, newID)
        XCTAssertEqual(session.user?.id, "other")
        XCTAssertNotNil(session.client)
        XCTAssertNil(session.errorMessage)
        XCTAssertNil(state.issue)
    }

    @MainActor
    func testLateSuccessDoesNotUpdateAnInvalidatedScreen() async throws {
        let session = try session()
        let state = GroupManagementState()
        let pause = GroupTestPause()
        let request = state.request(sessionID: session.sessionID)
        var accepted = false
        let pending = Task { @MainActor in
            await state.run(
                request: request, session: session, payload: payload, operation: .changePreferences
            ) { _ in
                await pause.wait()
                return true
            } accept: { _ in
                accepted = true
            }
        }
        while !state.busy { await Task.yield() }
        state.invalidate()
        pause.release()
        await pending.value
        XCTAssertFalse(accepted)
        XCTAssertFalse(
            GroupManagementGate.shared.contains(
                sessionID: session.sessionID, tripID: payload.trip.id))
    }

    @MainActor
    func testLateSuccessPublishesWorkspaceWithoutUpdatingInvalidatedPage() async throws {
        let session = try session()
        let state = GroupManagementState()
        let pause = GroupTestPause()
        var published = false
        var accepted = false
        let pending = Task { @MainActor in
            await state.run(
                request: state.request(sessionID: session.sessionID), session: session,
                payload: payload, operation: .changePreferences
            ) { _ in
                await pause.wait()
                return true
            } publish: { value in
                published = value
            } accept: { _ in
                accepted = true
            }
        }
        while !state.busy { await Task.yield() }
        state.invalidate()
        pause.release()
        await pending.value
        XCTAssertTrue(published)
        XCTAssertFalse(accepted)
    }

    @MainActor
    func testCompletedWritePublishesAfterTaskCancellation() async throws {
        let session = try session()
        let state = GroupManagementState()
        let pause = GroupTestPause()
        var published = false
        var accepted = false
        let pending = Task { @MainActor in
            await state.run(
                request: state.request(sessionID: session.sessionID), session: session,
                payload: payload, operation: .changePreferences
            ) { _ in
                await pause.wait()
                return true
            } publish: { value in
                published = value
            } accept: { _ in
                accepted = true
            }
        }
        while !state.busy { await Task.yield() }
        pending.cancel()
        pause.release()
        await pending.value
        XCTAssertTrue(published)
        XCTAssertFalse(accepted)
        XCTAssertNil(state.issue)
    }

    @MainActor
    func testLateSuccessCannotPublishIntoAnotherAccount() async throws {
        let session = try session()
        let state = GroupManagementState()
        let pause = GroupTestPause()
        let pending = Task { @MainActor in
            await state.run(
                request: state.request(sessionID: session.sessionID), session: session,
                payload: payload, operation: .changePreferences
            ) { _ in
                await pause.wait()
                return true
            } publish: { _ in
                XCTFail("A response for the old account must not update the workspace")
            } accept: { _ in
                XCTFail("A response for the old account must not update the page")
            }
        }
        while !state.busy { await Task.yield() }
        try login(session, userID: "other")
        pause.release()
        await pending.value
        XCTAssertEqual(session.user?.id, "other")
    }

    @MainActor
    func testManagementScreensUseOneMutationGate() async throws {
        let session = try session()
        let first = GroupManagementState()
        let second = GroupManagementState()
        let pause = GroupTestPause()
        let firstRequest = first.request(sessionID: session.sessionID)
        let pending = Task { @MainActor in
            await first.run(
                request: firstRequest, session: session, payload: payload,
                operation: .changePreferences
            ) { _ in
                await pause.wait()
                return true
            } accept: { _ in
            }
        }
        while !first.busy { await Task.yield() }
        var called = false
        await second.run(
            request: second.request(sessionID: session.sessionID), session: session,
            payload: payload, operation: .changePreferences
        ) { _ in
            called = true
            return true
        } accept: { _ in
        }
        XCTAssertFalse(called)
        XCTAssertNotNil(second.issue)
        pause.release()
        await pending.value
        await second.run(
            request: second.request(sessionID: session.sessionID), session: session,
            payload: payload, operation: .changePreferences
        ) { _ in
            called = true
            return true
        } accept: { _ in
        }
        XCTAssertTrue(called)
        XCTAssertNil(second.issue)
    }

    @MainActor
    func testPermissionIsCheckedBeforeWork() async throws {
        let session = try session()
        let state = GroupManagementState()
        var called = false
        await state.run(
            request: state.request(sessionID: session.sessionID), session: session,
            payload: payload, operation: .manageAccess
        ) { _ in
            called = true
            return true
        } accept: { _ in
            XCTFail("Bearer authentication cannot manage access")
        }
        XCTAssertFalse(called)
    }
}
