import Foundation
import XCTest

@testable import Otter
@testable import OtterKit

@MainActor
private final class IsolationCredentials: CredentialStore {
    var saved: SavedSession?
    func load() throws -> SavedSession? { saved }
    func save(_ value: SavedSession) throws { saved = value }
    func delete() throws { saved = nil }
}

/// Synthetic unit responses only. No request reaches a server.
private actor IsolationTransport: HTTPTransport {
    private(set) var writes = 0

    func data(for request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        let bytes: Data
        let status: Int
        if request.url?.path == "/api/me" {
            let isB = request.value(forHTTPHeaderField: "Authorization") == "Bearer fixture-b"
            bytes = try JSONEncoder().encode(
                UserResponse(
                    user: User(
                        id: isB ? "synthetic-b" : "synthetic-a", name: "Synthetic",
                        username: isB ? "fixture-b" : "fixture-a")))
            status = 200
        } else {
            writes += 1
            bytes = Data(#"{"error":"Synthetic conflict"}"#.utf8)
            status = 403
        }
        return (
            bytes,
            HTTPURLResponse(
                url: try XCTUnwrap(request.url), statusCode: status,
                httpVersion: nil, headerFields: nil)!
        )
    }
}

@MainActor
private final class IsolationFixture {
    let directory: URL
    let queueURL: URL
    let transport = IsolationTransport()
    let credentials = IsolationCredentials()
    let local: LocalExpenseState
    let session: AppSession

    init() {
        directory = FileManager.default.temporaryDirectory.appending(
            path: UUID().uuidString, directoryHint: .isDirectory)
        queueURL = directory.appending(path: "queue.json")
        local = LocalExpenseState(
            queue: ExpenseQueue(storage: .file(at: queueURL)),
            defaults: ExpenseDefaultsStore(
                storage: .file(at: directory.appending(path: "defaults.json"))))
        let transport = transport
        session = AppSession(
            store: credentials,
            makeClient: { server, token in
                try OtterClient(server: server, token: token, transport: transport)
            })
    }

    func cleanup() throws {
        if FileManager.default.fileExists(atPath: directory.path) {
            try FileManager.default.removeItem(at: directory)
        }
    }

    func login(_ token: String = "fixture-a", server: String = "https://queue.example") async throws
    {
        await session.signIn(server: server, token: token)
        XCTAssertNotNil(session.client)
        XCTAssertNil(session.errorMessage)
        _ = try XCTUnwrap(session.user)
    }

    func payload(tripID: String = "shared-trip") -> TripPayload {
        TripPayload(
            trip: Trip(
                id: tripID, ownerId: session.user?.id, name: "Synthetic trip", baseCurrency: .twd,
                allowApiWrites: true,
                participants: [Participant(id: "synthetic-participant", name: "Synthetic")]),
            currentUserRole: .owner)
    }

    func draft(_ description: String = "Synthetic draft") -> NewExpense {
        NewExpense(
            description: description, amount: "100", currency: .twd,
            paidById: "synthetic-participant", participantIds: ["synthetic-participant"],
            expenseDate: "2020-01-02")
    }

    func enqueue(tripID: String = "shared-trip") async throws -> QueuedExpense {
        try await local.enqueue(draft(), payload: payload(tripID: tripID), session: session)
        return try XCTUnwrap(local.visibleItems(session: session, tripID: tripID).last)
    }
}

@MainActor
final class LocalExpenseIsolationTests: XCTestCase {
    private func assertCancelled(
        file: StaticString = #filePath, line: UInt = #line,
        _ operation: () async throws -> Void
    ) async {
        do {
            try await operation()
            XCTFail("A foreign draft action must be cancelled", file: file, line: line)
        } catch is CancellationError {
            // A context mismatch must not become an authentication failure for the current user.
        } catch {
            XCTFail(
                "Expected CancellationError, received \(type(of: error))", file: file, line: line)
        }
    }

    private func assertAllActionsRejected(
        _ item: QueuedExpense, fixture: IsolationFixture, session: AppSession
    ) async {
        await assertCancelled { try await fixture.local.beginEditing(item, session: session) }
        await assertCancelled {
            try await fixture.local.revise(item, draft: fixture.draft("Changed"), session: session)
        }
        await assertCancelled { try await fixture.local.delete(item, session: session) }
        await assertCancelled { try await fixture.local.retry(item, session: session) }
    }

    func testNewAccountCannotReadOrChangeCachedDraftBeforeActivation() async throws {
        let fixture = IsolationFixture()
        defer { try? fixture.cleanup() }
        try await fixture.login()
        await fixture.local.activate(session: fixture.session)
        let itemA = try await fixture.enqueue()
        _ = try await fixture.enqueue(tripID: "other-trip")
        // The editor can outlive the account that opened it.
        try await fixture.local.beginEditing(itemA, session: fixture.session)
        let original = try Data(contentsOf: fixture.queueURL)

        try await fixture.login("fixture-b")
        let generationB = fixture.session.sessionID
        // Do not activate B yet: the old cache is deliberately still present.
        XCTAssertEqual(fixture.local.items.count, 2)
        XCTAssertEqual(fixture.local.visibleItems(session: fixture.session).count, 0)
        XCTAssertEqual(
            fixture.local.visibleItems(session: fixture.session, tripID: "shared-trip").count, 0)
        await assertAllActionsRejected(itemA, fixture: fixture, session: fixture.session)
        XCTAssertEqual(try Data(contentsOf: fixture.queueURL), original)
        XCTAssertEqual(fixture.session.user?.id, "synthetic-b")
        XCTAssertEqual(fixture.session.sessionID, generationB)
        XCTAssertNil(fixture.session.errorMessage)
        XCTAssertNil(fixture.local.issue)
        await fixture.local.queue.endEditing(id: itemA.id)

        let contextB = try fixture.local.context(tripID: "shared-trip", session: fixture.session)
        let itemB = try await fixture.local.queue.enqueue(fixture.draft("B draft"), in: contextB)
        fixture.local.issue = "Synthetic old issue"
        await fixture.local.activate(session: fixture.session)
        try await fixture.local.reload(session: fixture.session)
        XCTAssertEqual(fixture.local.items.map(\.id), [itemB.id])
        XCTAssertEqual(fixture.local.visibleItems(session: fixture.session).map(\.id), [itemB.id])
        XCTAssertNil(fixture.local.issue)
        XCTAssertNil(fixture.local.lastSuccess)
        let retainedA = try await fixture.local.queue.list(
            origin: itemA.context.origin, userID: itemA.context.userID)
        XCTAssertEqual(retainedA.count, 2)
        XCTAssertEqual(retainedA.first?.body, itemA.body)
        XCTAssertEqual(retainedA.first?.operationID, itemA.operationID)
        let writes = await fixture.transport.writes
        XCTAssertEqual(writes, 0)
    }

    func testSameUserAtAnotherOriginCannotReadOrChangeCachedDraft() async throws {
        let fixture = IsolationFixture()
        defer { try? fixture.cleanup() }
        try await fixture.login()
        await fixture.local.activate(session: fixture.session)
        let itemA = try await fixture.enqueue()
        let original = try Data(contentsOf: fixture.queueURL)

        try await fixture.login(server: "https://other-queue.example")
        XCTAssertEqual(fixture.session.user?.id, itemA.context.userID)
        XCTAssertEqual(fixture.local.items.count, 1)
        XCTAssertTrue(fixture.local.visibleItems(session: fixture.session).isEmpty)
        XCTAssertTrue(
            fixture.local.visibleItems(session: fixture.session, tripID: "shared-trip").isEmpty)
        await assertAllActionsRejected(itemA, fixture: fixture, session: fixture.session)
        XCTAssertEqual(try Data(contentsOf: fixture.queueURL), original)

        let otherContext = try fixture.local.context(
            tripID: "shared-trip", session: fixture.session)
        let otherItem = try await fixture.local.queue.enqueue(fixture.draft(), in: otherContext)
        await fixture.local.activate(session: fixture.session)
        XCTAssertEqual(
            fixture.local.visibleItems(session: fixture.session).map(\.id), [otherItem.id])
        let retained = try await fixture.local.queue.list(in: itemA.context)
        XCTAssertEqual(retained.map(\.id), [itemA.id])
        XCTAssertEqual(retained.first?.body, itemA.body)
    }

    func testSignedOutAnonymousAndShareSessionsCannotUseCachedAccountDraft() async throws {
        let fixture = IsolationFixture()
        defer { try? fixture.cleanup() }
        try await fixture.login()
        let item = try await fixture.enqueue()
        let original = try Data(contentsOf: fixture.queueURL)
        await fixture.session.signOut()
        XCTAssertTrue(fixture.local.visibleItems(session: fixture.session).isEmpty)
        await assertAllActionsRejected(item, fixture: fixture, session: fixture.session)

        for auth in [
            ClientAuthentication.anonymous,
            .share(tripID: "shared-trip", token: String(repeating: "s", count: 43)),
        ] {
            let client = try OtterClient(
                server: "https://queue.example", auth: auth, transport: fixture.transport)
            let session = try AppSession(ephemeralClient: client)
            // Even a matching cached user does not grant a guest account access.
            try session.acceptLogin(
                AuthenticatedLogin(
                    client: client,
                    user: User(id: item.context.userID, name: "Synthetic", username: "fixture-a")),
                for: session.sessionID)
            XCTAssertTrue(fixture.local.visibleItems(session: session).isEmpty)
            await assertAllActionsRejected(item, fixture: fixture, session: session)
            try await fixture.local.reload(session: session)
            XCTAssertTrue(fixture.local.items.isEmpty)
            try await fixture.login()
            try await fixture.local.reload(session: fixture.session)
        }
        XCTAssertEqual(try Data(contentsOf: fixture.queueURL), original)
    }

    func testCanonicalSameAccountCanEditReviseAndDeleteItsOwnDraft() async throws {
        let fixture = IsolationFixture()
        defer { try? fixture.cleanup() }
        try await fixture.login()
        let item = try await fixture.enqueue()
        let otherTrip = try await fixture.enqueue(tripID: "other-trip")
        try await fixture.login(server: "https://QUEUE.example:443/")
        XCTAssertEqual(fixture.local.visibleItems(session: fixture.session).count, 2)
        XCTAssertEqual(
            fixture.local.visibleItems(session: fixture.session, tripID: "shared-trip").map(\.id),
            [item.id])
        XCTAssertTrue(
            fixture.local.visibleItems(session: fixture.session, tripID: "missing").isEmpty)

        try await fixture.local.beginEditing(item, session: fixture.session)
        let revisedDraft = fixture.draft("Revised")
        try await fixture.local.revise(item, draft: revisedDraft, session: fixture.session)
        await fixture.local.queue.endEditing(id: item.id)
        let revised = try XCTUnwrap(fixture.local.visibleItems(session: fixture.session).first)
        XCTAssertEqual(revised.draft, revisedDraft)
        XCTAssertNotEqual(revised.operationID, item.operationID)
        try await fixture.local.delete(revised, session: fixture.session)
        XCTAssertEqual(
            fixture.local.visibleItems(session: fixture.session).map(\.id), [otherTrip.id])
        let retained = try await fixture.local.queue.list(in: otherTrip.context)
        XCTAssertEqual(retained.map(\.id), [otherTrip.id])
    }

    func testConflictRetryRejectsAnotherAccountAndPreservesOriginalRequestForOwner() async throws {
        let fixture = IsolationFixture()
        defer { try? fixture.cleanup() }
        try await fixture.login()
        await fixture.local.activate(session: fixture.session)
        let item = try await fixture.enqueue()
        // The real queue creates a conflict from the synthetic transport's HTTP 403 response.
        _ = try await fixture.local.queue.synchronize()
        try await fixture.local.reload(session: fixture.session)
        let conflict = try XCTUnwrap(fixture.local.visibleItems(session: fixture.session).first)
        XCTAssertEqual(conflict.status, .conflict)
        let original = try Data(contentsOf: fixture.queueURL)

        try await fixture.login("fixture-b")
        await assertAllActionsRejected(conflict, fixture: fixture, session: fixture.session)
        XCTAssertEqual(try Data(contentsOf: fixture.queueURL), original)
        XCTAssertEqual(fixture.session.user?.id, "synthetic-b")
        XCTAssertNil(fixture.session.errorMessage)

        try await fixture.login()
        try await fixture.local.retry(conflict, session: fixture.session)
        let retried = try XCTUnwrap(fixture.local.visibleItems(session: fixture.session).first)
        XCTAssertEqual(retried.status, .attempted)
        XCTAssertEqual(retried.operationID, item.operationID)
        XCTAssertEqual(retried.body, item.body)
        XCTAssertEqual(retried.draft, item.draft)
        XCTAssertNil(retried.rejectionStatus)
        let writes = await fixture.transport.writes
        XCTAssertEqual(writes, 1)
        try await fixture.local.delete(retried, session: fixture.session)
        XCTAssertTrue(fixture.local.visibleItems(session: fixture.session).isEmpty)
    }

    func testSessionCookieAccountCanUseOnlyItsOwnDrafts() async throws {
        let fixture = IsolationFixture()
        defer { try? fixture.cleanup() }
        try await fixture.login("fixture-b")
        let foreignItem = try await fixture.enqueue()
        let client = try OtterClient(
            server: "https://queue.example",
            auth: .session(SessionCookie(value: "fixture-session-a")), transport: fixture.transport)
        let user = try await client.user()
        try fixture.session.acceptLogin(
            AuthenticatedLogin(client: client, user: user), for: fixture.session.sessionID)
        XCTAssertTrue(fixture.local.visibleItems(session: fixture.session).isEmpty)
        await assertAllActionsRejected(foreignItem, fixture: fixture, session: fixture.session)
        await fixture.local.activate(session: fixture.session)
        let ownItem = try await fixture.enqueue()
        XCTAssertEqual(fixture.local.visibleItems(session: fixture.session).map(\.id), [ownItem.id])
        try await fixture.local.beginEditing(ownItem, session: fixture.session)
        try await fixture.local.revise(
            ownItem, draft: fixture.draft("Session edit"), session: fixture.session)
        await fixture.local.queue.endEditing(id: ownItem.id)
        try await fixture.local.delete(ownItem, session: fixture.session)
        let retained = try await fixture.local.queue.list(in: foreignItem.context)
        XCTAssertEqual(retained.map(\.id), [foreignItem.id])
    }
}
