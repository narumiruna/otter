import Foundation
import Testing

@testable import OtterKit

// Synchronous storage is required by the production transaction API. Protect all test state.
final class ExpenseTestStorage: @unchecked Sendable {
    enum Failure: Error { case full }
    private let lock = NSLock()
    private var bytes: Data?
    private var writes = 0
    private var failAt: Int?

    init(_ bytes: Data? = nil) { self.bytes = bytes }

    var storage: ExpenseLocalStorage {
        ExpenseLocalStorage(
            load: { self.lock.withLock { self.bytes } },
            save: { data in
                try self.lock.withLock {
                    self.writes += 1
                    if self.writes == self.failAt { throw Failure.full }
                    self.bytes = data
                }
            })
    }

    func fail(write: Int?) { lock.withLock { failAt = write } }
    var data: Data? { lock.withLock { bytes } }
    var writeCount: Int { lock.withLock { writes } }
}

private actor QueueSender {
    enum Mode: Equatable, Sendable {
        case success, dropped
        case http(Int)
        case heldSuccess, heldDrop
    }
    struct Request: Sendable {
        let context: ExpenseContext
        let body: Data
        let operationID: UUID
    }
    private var mode: Mode
    private var requests: [Request] = []
    private var arrival: CheckedContinuation<Void, Never>?
    private var release: CheckedContinuation<Void, Never>?

    init(_ mode: Mode = .success) { self.mode = mode }
    func setMode(_ mode: Mode) { self.mode = mode }
    func captured() -> [Request] { requests }

    func waitForSubmission() async {
        if !requests.isEmpty { return }
        await withCheckedContinuation { arrival = $0 }
    }

    func resume() {
        release?.resume()
        release = nil
    }

    func send(_ context: ExpenseContext, _ body: Data, _ operationID: UUID) async throws
        -> TripPayload
    {
        requests.append(Request(context: context, body: body, operationID: operationID))
        let mode = mode
        // Establish the release barrier before notifying the test that submission occurred.
        if mode == .heldSuccess || mode == .heldDrop {
            await withCheckedContinuation { continuation in
                release = continuation
                arrival?.resume()
                arrival = nil
            }
        } else {
            arrival?.resume()
            arrival = nil
        }
        switch mode {
        case .dropped, .heldDrop: throw APIError.invalidResponse
        case .http(let status):
            if status == 401 { throw APIError.unauthorized }
            throw APIResponseError(
                status: status, code: nil, message: "Not persisted", retryAfter: nil)
        default:
            return try JSONDecoder().decode(
                TripPayload.self,
                from: Data(
                    #"{"trip":{"id":"trip_1","name":"Trip","baseCurrency":"USD","participants":[],"expenses":[]},"balances":[],"settlements":[]}"#
                        .utf8))
        }
    }
}

private func queueContext(
    origin: String = "https://otter.example", user: String = "user_1", trip: String = "trip_1"
) throws -> ExpenseContext {
    try ExpenseContext(origin: URL(string: origin)!, userID: user, tripID: trip)
}

private func queueDraft(_ description: String = "Lunch") -> NewExpense {
    NewExpense(
        description: description, amount: "12.50", currency: .usd, paidById: "p1",
        participantIds: ["p1", "p2"], expenseDate: "2026-10-23", splitMode: .amount,
        splitValues: ["p1": "5.00", "p2": "7.50"], category: "Food", tags: ["trip"])
}

private func queueSession(_ context: ExpenseContext, generation: UUID = UUID()) throws
    -> ExpenseQueueSession
{
    try ExpenseQueueSession(
        origin: context.origin, userID: context.userID, credentialGeneration: generation,
        authentication: .session)
}

private func activate(
    _ queue: ExpenseQueue, _ sender: QueueSender, _ context: ExpenseContext,
    session: ExpenseQueueSession? = nil
) async throws {
    let session = try session ?? queueSession(context)
    await queue.activate(
        session: session, verifyUser: { context.userID },
        send: { try await sender.send($0, $1, $2) })
}

struct ExpenseQueueTests {
    @Test func canonicalContextUsesOriginUserAndTrip() throws {
        #expect(try queueContext(origin: "https://OTTER.example:443/") == queueContext())
        #expect(try queueContext(user: "other") != queueContext())
        for invalid in [
            "https://a.example/path", "https://a.example/?token=secret", "https://u:p@a.example",
            "http://a.example",
        ] {
            #expect(throws: ExpenseStorageError.invalidContext) {
                try queueContext(origin: invalid)
            }
        }
    }

    @Test func persistFailureNeverSendsOrClaimsSaved() async throws {
        let memory = ExpenseTestStorage()
        let queue = ExpenseQueue(storage: memory.storage)
        let context = try queueContext()
        memory.fail(write: 1)
        await #expect(throws: ExpenseTestStorage.Failure.self) {
            try await queue.enqueue(queueDraft(), in: context)
        }
        #expect(try await queue.list(in: context).isEmpty)
        memory.fail(write: nil)
        _ = try await queue.enqueue(queueDraft(), in: context)
        memory.fail(write: 3)
        let sender = QueueSender()
        try await activate(queue, sender, context)
        await #expect(throws: ExpenseTestStorage.Failure.self) { try await queue.synchronize() }
        #expect(await sender.captured().isEmpty)
        #expect(try await queue.list(in: context).first?.status == .pending)
    }

    @Test func repeatedTriggersAndEditDuringSubmissionAreSerialized() async throws {
        let memory = ExpenseTestStorage()
        let queue = ExpenseQueue(storage: memory.storage)
        let context = try queueContext()
        let item = try await queue.enqueue(queueDraft(), in: context)
        let sender = QueueSender(.heldSuccess)
        try await activate(queue, sender, context)
        let first = Task { try await queue.synchronize() }
        await sender.waitForSubmission()
        let durable = ExpenseQueue(storage: memory.storage)
        #expect(try await durable.list(in: context).first?.status == .attempted)
        #expect(try await durable.list(in: context).first?.body == item.body)
        _ = try await queue.synchronize()
        _ = try await queue.synchronize()
        await #expect(throws: ExpenseStorageError.editLocked) {
            try await queue.beginEditing(id: item.id, in: context)
        }
        #expect(await sender.captured().count == 1)
        await sender.resume()
        #expect(try await first.value.successes.count == 1)
        #expect(try await queue.list(in: context).isEmpty)
    }

    @Test func droppedResponseSurvivesRestartAndRetriesIdenticalBytesAndKey() async throws {
        let memory = ExpenseTestStorage()
        let queue = ExpenseQueue(storage: memory.storage)
        let context = try queueContext()
        let item = try await queue.enqueue(queueDraft("Café 🍜"), in: context)
        let sender = QueueSender(.dropped)
        try await activate(queue, sender, context)
        #expect(try await queue.synchronize().stop == .unknownResult)
        let restarted = ExpenseQueue(storage: memory.storage)
        let saved = try #require(await restarted.list(in: context).first)
        #expect(saved.status == .attempted)
        await #expect(throws: ExpenseStorageError.editLocked) {
            try await restarted.revise(id: item.id, in: context, draft: queueDraft("Changed"))
        }
        await #expect(throws: ExpenseStorageError.deletionNeedsServerCheck) {
            try await restarted.delete(id: item.id, in: context)
        }
        await sender.setMode(.success)
        try await activate(restarted, sender, context)
        #expect(try await restarted.synchronize().successes.count == 1)
        let requests = await sender.captured()
        #expect(requests.count == 2)
        #expect(requests[0].body == requests[1].body)
        #expect(requests[0].operationID == requests[1].operationID)
        #expect(requests[1].body == item.body)
        #expect(requests[1].operationID == item.operationID)
    }

    @Test func realFileRestartAndUnrecognizedDataAreNeverOverwritten() async throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(
            UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: directory) }
        let url = directory.appendingPathComponent("queue.json")
        let storage = ExpenseLocalStorage.file(at: url)
        let context = try queueContext()
        let queue = ExpenseQueue(storage: storage)
        let saved = try await queue.enqueue(queueDraft(), in: context)
        let restarted = ExpenseQueue(storage: storage)
        #expect(try await restarted.list(in: context).first?.draft == saved.draft)
        for raw in [#"{"version":9,"expenses":[]}"#, "corrupt"] {
            let bytes = Data(raw.utf8)
            try bytes.write(to: url, options: .atomic)
            let broken = ExpenseQueue(storage: storage)
            await #expect(throws: ExpenseStorageError.self) { try await broken.list(in: context) }
            await #expect(throws: ExpenseStorageError.self) {
                try await broken.enqueue(queueDraft(), in: context)
            }
            #expect(try Data(contentsOf: url) == bytes)
        }
    }

    @Test func validationRejectionBecomesEditableWithNewOperationOnlyAfterEdit() async throws {
        let queue = ExpenseQueue(storage: ExpenseTestStorage().storage)
        let context = try queueContext()
        let original = try await queue.enqueue(queueDraft(), in: context)
        let sender = QueueSender(.http(400))
        try await activate(queue, sender, context)
        _ = try await queue.synchronize()
        #expect(try await queue.list(in: context).first?.status == .invalid)
        _ = try await queue.synchronize()
        #expect(await sender.captured().count == 1)
        let revised = try await queue.revise(
            id: original.id, in: context, draft: queueDraft("Corrected"))
        #expect(revised.operationID != original.operationID)
        #expect(revised.body != original.body)
        #expect(revised.status == .pending)
        await sender.setMode(.success)
        _ = try await queue.synchronize()
        #expect(await sender.captured().last?.operationID == revised.operationID)
    }

    @Test func editPauseSkipsDraftUntilEditorCloses() async throws {
        let queue = ExpenseQueue(storage: ExpenseTestStorage().storage)
        let context = try queueContext()
        let original = try await queue.enqueue(queueDraft(), in: context)
        try await queue.beginEditing(id: original.id, in: context)
        let sender = QueueSender()
        try await activate(queue, sender, context)
        _ = try await queue.synchronize()
        #expect(await sender.captured().isEmpty)
        let revised = try await queue.revise(
            id: original.id, in: context, draft: queueDraft("Edited"))
        await queue.endEditing(id: original.id)
        _ = try await queue.synchronize()
        #expect(await sender.captured().first?.body == revised.body)
    }

    @Test func abandonedEditCanSynchronizeTheOriginalDraftAfterUnlock() async throws {
        let queue = ExpenseQueue(storage: ExpenseTestStorage().storage)
        let context = try queueContext()
        let original = try await queue.enqueue(queueDraft(), in: context)
        try await queue.beginEditing(id: original.id, in: context)
        let sender = QueueSender()
        try await activate(queue, sender, context)
        #expect(try await queue.synchronize().successes.isEmpty)
        #expect(await sender.captured().isEmpty)
        await queue.endEditing(id: original.id)
        #expect(try await queue.synchronize().successes.count == 1)
        let request = try #require(await sender.captured().first)
        #expect(request.body == original.body)
        #expect(request.operationID == original.operationID)
        #expect(try await queue.list(in: context).isEmpty)
    }

    @Test func unauthorizedStopsUntilCredentialGenerationChanges() async throws {
        let queue = ExpenseQueue(storage: ExpenseTestStorage().storage)
        let context = try queueContext()
        _ = try await queue.enqueue(queueDraft(), in: context)
        _ = try await queue.enqueue(queueDraft("Second"), in: context)
        let sender = QueueSender(.http(401))
        let session = try queueSession(context)
        try await activate(queue, sender, context, session: session)
        #expect(try await queue.synchronize().stop == .authenticationLost)
        #expect(try await queue.synchronize().stop == .authenticationLost)
        await queue.deactivate()
        try await activate(queue, sender, context, session: session)
        #expect(try await queue.synchronize().stop == .authenticationLost)
        #expect(await sender.captured().count == 1)
        try await activate(queue, sender, queueContext(user: "other"))
        try await activate(queue, sender, context, session: session)
        #expect(try await queue.synchronize().stop == .authenticationLost)
        #expect(await sender.captured().count == 1)
        await sender.setMode(.success)
        try await activate(queue, sender, context)
        #expect(try await queue.synchronize().successes.count == 2)
    }

    @Test func mismatchedAccountVerificationNeverSubmits() async throws {
        let queue = ExpenseQueue(storage: ExpenseTestStorage().storage)
        let context = try queueContext()
        _ = try await queue.enqueue(queueDraft(), in: context)
        let sender = QueueSender()
        await queue.activate(
            session: try queueSession(context), verifyUser: { "other_user" },
            send: { try await sender.send($0, $1, $2) })
        #expect(try await queue.synchronize().stop == .authenticationLost)
        #expect(await sender.captured().isEmpty)
        #expect(try await queue.list(in: context).first?.status == .pending)
    }

    @Test func switchingAccountOrOriginCannotReplayOrApplyLateResult() async throws {
        let queue = ExpenseQueue(storage: ExpenseTestStorage().storage)
        let firstContext = try queueContext()
        let otherUser = try queueContext(user: "user_2")
        let otherOrigin = try queueContext(origin: "https://other.example")
        for context in [firstContext, otherUser, otherOrigin] {
            _ = try await queue.enqueue(queueDraft(), in: context)
        }
        let oldSender = QueueSender(.heldSuccess)
        try await activate(queue, oldSender, firstContext)
        let oldTask = Task { try await queue.synchronize() }
        await oldSender.waitForSubmission()
        await queue.deactivate()
        let newSender = QueueSender()
        try await activate(queue, newSender, otherUser)
        _ = try await queue.synchronize()
        #expect(await newSender.captured().isEmpty)
        await oldSender.resume()
        #expect(try await oldTask.value.stop == .sessionChanged)
        #expect(try await oldTask.value.successes.isEmpty)
        #expect(try await queue.list(in: firstContext).first?.status == .attempted)
        _ = try await queue.synchronize()
        #expect(await newSender.captured().count == 1)
        #expect(await newSender.captured().first?.context == otherUser)
        #expect(try await queue.list(in: otherOrigin).count == 1)
    }

    @Test func cancellationAfterSubmissionKeepsOriginalAttempt() async throws {
        let queue = ExpenseQueue(storage: ExpenseTestStorage().storage)
        let context = try queueContext()
        let item = try await queue.enqueue(queueDraft(), in: context)
        let sender = QueueSender(.heldSuccess)
        try await activate(queue, sender, context)
        let task = Task { try await queue.synchronize() }
        await sender.waitForSubmission()
        task.cancel()
        await sender.resume()
        #expect(try await task.value.stop == .cancelled)
        #expect(try await queue.list(in: context).first?.status == .attempted)
        await sender.setMode(.success)
        _ = try await queue.synchronize()
        #expect(await sender.captured().last?.body == item.body)
        #expect(await sender.captured().last?.operationID == item.operationID)
    }

    @Test(arguments: [403, 404, 409])
    func permissionArchiveAndMissingTripConflictsRequireExplicitRetry(_ status: Int) async throws {
        let queue = ExpenseQueue(storage: ExpenseTestStorage().storage)
        let context = try queueContext()
        let first = try await queue.enqueue(queueDraft(), in: context)
        _ = try await queue.enqueue(queueDraft("Second"), in: context)
        let sender = QueueSender(.http(status))
        try await activate(queue, sender, context)
        _ = try await queue.synchronize()
        #expect(try await queue.list(in: context).first?.status == .conflict)
        _ = try await queue.synchronize()
        #expect(await sender.captured().count == 1)
        await #expect(throws: ExpenseStorageError.editLocked) {
            try await queue.revise(id: first.id, in: context, draft: queueDraft("Changed"))
        }
        try await queue.retry(id: first.id, in: context)
        await sender.setMode(.success)
        _ = try await queue.synchronize()
        #expect(await sender.captured()[1].operationID == first.operationID)
        #expect(await sender.captured()[1].body == first.body)
        #expect(try await queue.list(in: context).isEmpty)
    }

    @Test func orphanListAndExplicitDeletionAreLocalOnly() async throws {
        let memory = ExpenseTestStorage()
        let queue = ExpenseQueue(storage: memory.storage)
        let context = try queueContext()
        let item = try await queue.enqueue(queueDraft(), in: context)
        let sender = QueueSender(.dropped)
        try await activate(queue, sender, context)
        _ = try await queue.synchronize()
        #expect(
            try await queue.orphans(
                origin: context.origin, userID: context.userID, knownTripIDs: []
            ).map(\.id) == [item.id])
        #expect(
            try await queue.orphans(origin: context.origin, userID: "other", knownTripIDs: [])
                .isEmpty)
        let deletion = try await queue.delete(
            id: item.id, in: context, acknowledgingUnknownResult: true)
        #expect(deletion.mayExistOnServer)
        #expect(deletion.operationID == item.operationID)
        #expect(await sender.captured().count == 1)
        #expect(try await ExpenseQueue(storage: memory.storage).list(in: context).isEmpty)
    }

    @Test(arguments: [429, 500, 503])
    func transientHTTPFailuresKeepAnImmutableAttempt(_ status: Int) async throws {
        let queue = ExpenseQueue(storage: ExpenseTestStorage().storage)
        let context = try queueContext()
        let item = try await queue.enqueue(queueDraft(), in: context)
        let sender = QueueSender(.http(status))
        try await activate(queue, sender, context)
        #expect(try await queue.synchronize().stop == .unknownResult)
        #expect(try await queue.list(in: context).first?.status == .attempted)
        await sender.setMode(.success)
        _ = try await queue.synchronize()
        #expect(await sender.captured().last?.body == item.body)
        #expect(await sender.captured().last?.operationID == item.operationID)
    }

    @Test func successRemovalMustPersistAndFailureCanOnlyReplayOriginalRequest() async throws {
        let memory = ExpenseTestStorage()
        let queue = ExpenseQueue(storage: memory.storage)
        let context = try queueContext()
        let item = try await queue.enqueue(queueDraft(), in: context)
        memory.fail(write: 3)  // Enqueue, attempted, then success removal.
        let sender = QueueSender()
        try await activate(queue, sender, context)
        await #expect(throws: ExpenseTestStorage.Failure.self) { try await queue.synchronize() }
        let restarted = ExpenseQueue(storage: memory.storage)
        #expect(try await restarted.list(in: context).first?.status == .attempted)
        memory.fail(write: nil)
        try await activate(restarted, sender, context)
        _ = try await restarted.synchronize()
        #expect(await sender.captured().count == 2)
        #expect(await sender.captured().last?.body == item.body)
        #expect(await sender.captured().last?.operationID == item.operationID)
    }

    @Test func unknownFieldsAndMismatchedBodyFailClosed() async throws {
        let original = ExpenseTestStorage()
        let context = try queueContext()
        _ = try await ExpenseQueue(storage: original.storage).enqueue(queueDraft(), in: context)
        let bytes = try #require(original.data)
        for mutation in ["unknown", "mismatch", "receipt"] {
            var file = try #require(JSONSerialization.jsonObject(with: bytes) as? [String: Any])
            var items = try #require(file["expenses"] as? [[String: Any]])
            if mutation == "unknown" {
                items[0]["futureField"] = "Do not discard"
            } else {
                let base64 = try #require(items[0]["body"] as? String)
                let body = try #require(Data(base64Encoded: base64))
                var object = try #require(
                    JSONSerialization.jsonObject(with: body) as? [String: Any])
                object[mutation == "receipt" ? "receipt" : "amount"] = "changed"
                items[0]["body"] = try JSONSerialization.data(
                    withJSONObject: object, options: .sortedKeys
                ).base64EncodedString()
            }
            file["expenses"] = items
            let changed = try JSONSerialization.data(withJSONObject: file)
            let memory = ExpenseTestStorage(changed)
            let queue = ExpenseQueue(storage: memory.storage)
            let sender = QueueSender()
            try await activate(queue, sender, context)
            await #expect(throws: ExpenseStorageError.corruptData) { try await queue.synchronize() }
            await #expect(throws: ExpenseStorageError.corruptData) {
                try await queue.enqueue(queueDraft(), in: context)
            }
            #expect(memory.data == changed)
            #expect(memory.writeCount == 0)
            #expect(await sender.captured().isEmpty)
        }
    }

    @Test func changingSessionGenerationIgnoresLateResultEvenForTheSameAccount() async throws {
        let queue = ExpenseQueue(storage: ExpenseTestStorage().storage)
        let context = try queueContext()
        let item = try await queue.enqueue(queueDraft(), in: context)
        let oldSender = QueueSender(.heldSuccess)
        try await activate(queue, oldSender, context)
        let first = Task { try await queue.synchronize() }
        await oldSender.waitForSubmission()
        let newSender = QueueSender()
        try await activate(queue, newSender, context)
        await oldSender.resume()
        #expect(try await first.value.stop == .sessionChanged)
        #expect(try await first.value.successes.isEmpty)
        #expect(try await queue.list(in: context).first?.status == .attempted)
        _ = try await queue.synchronize()
        #expect(await newSender.captured().first?.operationID == item.operationID)
        #expect(await newSender.captured().first?.body == item.body)
    }

    @Test func deletingDuringSubmittedRequestDoesNotResurrectDraft() async throws {
        let queue = ExpenseQueue(storage: ExpenseTestStorage().storage)
        let context = try queueContext()
        let item = try await queue.enqueue(queueDraft(), in: context)
        let sender = QueueSender(.heldDrop)
        try await activate(queue, sender, context)
        let task = Task { try await queue.synchronize() }
        await sender.waitForSubmission()
        _ = try await queue.delete(id: item.id, in: context, acknowledgingUnknownResult: true)
        await sender.resume()
        _ = try await task.value
        #expect(try await queue.list(in: context).isEmpty)
    }
}
