import Foundation
import UIKit
import XCTest

@testable import Otter
@testable import OtterKit

@MainActor
private final class EditorCredentials: CredentialStore {
    var saved: SavedSession?
    func load() throws -> SavedSession? { saved }
    func save(_ value: SavedSession) throws { saved = value }
    func delete() throws { saved = nil }
}

/// In-memory HTTP responses test request sequencing, not a live browser or server workflow.
private actor EditorTransport: HTTPTransport {
    enum Scenario: Sendable {
        case receiptFailure, receiptConflict, conflict, unknown, delayed, missingCreatedID
    }
    let scenario: Scenario
    var writes: [String] = []
    var versions: [String?] = []
    var blocked: CheckedContinuation<Void, Never>?
    init(_ scenario: Scenario) { self.scenario = scenario }

    func data(for request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        let path = request.url!.path
        let method = request.httpMethod!
        var status = 200
        let bytes: Data
        if path == "/api/me" {
            bytes = Data(#"{"user":{"id":"u","name":"User","username":"user"}}"#.utf8)
        } else if method == "GET" {
            bytes =
                path.hasSuffix("/receipt")
                ? Data([1, 2, 3]) : try JSONEncoder().encode(Self.payload(version: 9))
        } else {
            writes.append(method + " " + path)
            versions.append(request.value(forHTTPHeaderField: "If-Match"))
            switch scenario {
            case .receiptFailure:
                if method == "PUT" && writes.count == 2 {
                    status = 503
                    bytes = Data(#"{"error":"Upload failed"}"#.utf8)
                } else {
                    bytes = try JSONEncoder().encode(
                        Self.payload(
                            version: writes.count + 1,
                            createdID: method == "POST" ? "e" : nil))
                }
            case .receiptConflict:
                if method == "PUT" && writes.count == 2 {
                    status = 412
                    bytes = Data(#"{"error":"Receipt conflict"}"#.utf8)
                } else {
                    bytes = try JSONEncoder().encode(
                        Self.payload(
                            version: writes.count + 1,
                            createdID: method == "POST" ? "e" : nil))
                }
            case .conflict:
                if writes.count == 1 {
                    status = 412
                    bytes = Data(#"{"error":"Conflict"}"#.utf8)
                } else {
                    bytes = try JSONEncoder().encode(Self.payload(version: 10))
                }
            case .unknown: throw URLError(.timedOut)
            case .delayed:
                await withCheckedContinuation { blocked = $0 }
                bytes = try JSONEncoder().encode(Self.payload(version: 2, createdID: "e"))
            case .missingCreatedID:
                bytes = try JSONEncoder().encode(Self.payload(version: 2))
            }
        }
        return (
            bytes,
            HTTPURLResponse(
                url: request.url!, statusCode: status, httpVersion: nil, headerFields: nil)!
        )
    }
    func release() {
        blocked?.resume()
        blocked = nil
    }
    func pending() -> Bool { blocked != nil }
    static func payload(version: Int = 1, createdID: String? = nil) -> TripPayload {
        TripPayload(
            trip: Trip(
                id: "t", ownerId: "u", name: "Trip", baseCurrency: .twd,
                allowApiWrites: true,
                participants: [
                    Participant(id: "a", name: "Alice"), Participant(id: "b", name: "Bob"),
                ],
                expenses: [expense(version: version)]), currentUserRole: .owner,
            createdExpenseId: createdID)
    }
    static func expense(version: Int = 1) -> Expense {
        Expense(
            id: "e", description: "Original", amountMinor: 101, currency: .twd,
            paidById: "a", participantIds: ["b", "a"], expenseDate: "2020-01-02", version: version,
            exchangeRate: ExpenseExchangeRate(baseCurrency: .twd, rateToBase: 1, source: "fixed"),
            participantShares: [
                ParticipantShare(participantId: "b", shareMinor: 70),
                ParticipantShare(participantId: "a", shareMinor: 31),
            ],
            category: "餐飲", tags: ["tag"], receiptId: "old")
    }
}

@MainActor
final class ExpenseEditorTests: XCTestCase {
    func testInputLimitsUseServerUTF16Units() {
        let state = ExpenseEditorState(payload: EditorTransport.payload(), mode: .new)
        state.amount = "100"
        state.description = String(repeating: "😀", count: 60)
        XCTAssertNil(state.validation)
        state.description += "😀"
        XCTAssertNotNil(state.validation)
        state.description = "Valid"
        state.tags = String(repeating: "😀", count: 12)
        XCTAssertNil(state.validation)
        state.tags += "😀"
        XCTAssertNotNil(state.validation)
    }

    func testTagsKeepDistinctUTF16SpellingsAndRejectElevenRawTags() {
        let state = ExpenseEditorState(payload: EditorTransport.payload(), mode: .new)
        state.description = "Valid"
        state.amount = "100"
        state.tags = "\u{00E9}, e\u{0301}, \u{00E9}"
        XCTAssertEqual(
            state.input.tags.map { Array($0.utf16) },
            [Array("\u{00E9}".utf16), Array("e\u{0301}".utf16)])
        XCTAssertNil(state.validation)
        state.tags += "," + (1...9).map { "tag\($0)" }.joined(separator: ",")
        XCTAssertEqual(state.input.tags.count, 11)
        XCTAssertNotNil(state.validation)
    }

    func testUnicodeOnlyDescriptionAndTagEditsAreDirtyAndKeepNewSpelling() {
        for (old, replacement) in [("\u{00E9}", "e\u{0301}"), ("e\u{0301}", "\u{00E9}")] {
            let draft = NewExpense(
                description: old, amount: "100", currency: .twd, paidById: "a",
                participantIds: ["a"], expenseDate: "2026-10-23", tags: [old])
            let state = ExpenseEditorState(payload: EditorTransport.payload(), draft: draft)
            XCTAssertFalse(state.dirty)
            state.description = replacement
            XCTAssertEqual(Array(state.input.description.utf16), Array(replacement.utf16))
            XCTAssertTrue(state.dirty)
            state.description = old
            XCTAssertFalse(state.dirty)
            state.tags = replacement
            XCTAssertEqual(state.input.tags.map { Array($0.utf16) }, [Array(replacement.utf16)])
            XCTAssertTrue(state.dirty)
            state.tags = old
            XCTAssertFalse(state.dirty)
        }
    }

    func testBusinessFieldsUseWebTrimWithoutNormalizingSpelling() {
        let state = ExpenseEditorState(payload: EditorTransport.payload(), mode: .new)
        state.description = "\u{FEFF}Cafe\u{0301}\u{FEFF}"
        state.amount = "\u{FEFF}100\u{FEFF}"
        state.tags = "\u{FEFF}e\u{0301}\u{FEFF},\u{0085}tag\u{0085},\u{200B}tag\u{200B}"
        XCTAssertEqual(Array(state.input.description.utf16), Array("Cafe\u{0301}".utf16))
        XCTAssertEqual(Array(state.input.amount.utf16), Array("100".utf16))
        XCTAssertEqual(
            state.input.tags.map { Array($0.utf16) },
            ["e\u{0301}", "\u{0085}tag\u{0085}", "\u{200B}tag\u{200B}"].map { Array($0.utf16) })
        XCTAssertNil(state.validation)
        for text in ["\u{0085}", "\u{180E}", "\u{200B}", "\u{0000}"] {
            state.amount = text + "100" + text
            XCTAssertNotNil(state.validation)
        }
    }

    func testDescriptionOnlyEqualEditKeepsRemainderParticipantOrder() {
        let expense = Expense(
            id: "equal", description: "Original", amountMinor: 101, currency: .twd,
            paidById: "a", participantIds: ["b", "a"], expenseDate: "2026-10-23", version: 1)
        let state = ExpenseEditorState(payload: EditorTransport.payload(), mode: .edit(expense))
        state.description = "Renamed"
        XCTAssertEqual(state.input.participantIds, ["b", "a"])
        XCTAssertEqual(
            state.preview,
            [
                ParticipantShare(participantId: "b", shareMinor: 51),
                ParticipantShare(participantId: "a", shareMinor: 50),
            ])
        XCTAssertNil(state.validation)
    }

    private func session(_ transport: EditorTransport) async -> AppSession {
        let session = AppSession(
            store: EditorCredentials(),
            makeClient: { server, token in
                try OtterClient(server: server, token: token, transport: transport)
            })
        await session.signIn(server: "https://otter.example", token: "otter_api_test")
        return session
    }
    private func newState(_ session: AppSession) -> ExpenseEditorState {
        let state = ExpenseEditorState(payload: EditorTransport.payload(), mode: .new)
        state.bind(session: session)
        state.description = "Draft"
        state.amount = "100"
        return state
    }
    private func waitUntilPending(_ transport: EditorTransport) async throws {
        for _ in 0..<10_000 {
            if await transport.pending() { return }
            await Task.yield()
        }
        XCTFail("The test request did not reach the transport")
        throw CancellationError()
    }

    func testReconstructsExactSavedSharesAndObservedVersion() {
        let expense = EditorTransport.expense(version: 7)
        let state = ExpenseEditorState(payload: EditorTransport.payload(), mode: .edit(expense))
        XCTAssertEqual(state.splitMode, .amount)
        XCTAssertEqual(state.input.splitValues, ["a": "31", "b": "70"])
        XCTAssertEqual(state.input.participantIds, ["b", "a"])
        XCTAssertEqual(state.input.expenseDate, "2020-01-02")
        XCTAssertEqual(state.observed?.version, 7)
        state.description = "Changed only"
        XCTAssertEqual(state.preview, expense.participantShares)
        XCTAssertTrue(state.dirty)
    }

    func testCopyUsesTodayAndExcludesReceiptAndObservedSnapshot() {
        let state = ExpenseEditorState(
            payload: EditorTransport.payload(), mode: .copy(EditorTransport.expense()))
        XCTAssertEqual(state.input.expenseDate, ExpenseEditorState.dateString(Date()))
        XCTAssertNil(state.observed)
        XCTAssertNil(state.photo)
        XCTAssertNil(state.receiptExpense)
        XCTAssertEqual(state.input.category, "餐飲")
        XCTAssertEqual(state.input.tags, ["tag"])
        XCTAssertEqual(state.input.splitValues, ["b": "70", "a": "31"])
    }

    func testAmountsNeverRescaleAndPreviewMustBalance() {
        let state = ExpenseEditorState(
            payload: EditorTransport.payload(), mode: .edit(EditorTransport.expense()))
        state.amount = "202"
        XCTAssertEqual(state.splitValues, ["a": "31", "b": "70"])
        XCTAssertNil(state.preview)
        XCTAssertNotNil(state.validation)
        state.currency = .usd
        XCTAssertEqual(state.splitValues, ["a": "31", "b": "70"])
        XCTAssertNil(state.preview)
    }

    func testAllFourModesConservePreviewTotal() {
        let state = ExpenseEditorState(payload: EditorTransport.payload(), mode: .new)
        state.description = "Preview"
        state.amount = "101"
        for mode in SplitMode.allCases {
            state.splitMode = mode
            state.splitValues = mode == .amount ? ["a": "50", "b": "51"] : ["a": "1", "b": "2"]
            XCTAssertEqual(state.preview?.reduce(0, { $0 + $1.shareMinor }), 101, mode.rawValue)
            XCTAssertNil(state.validation, mode.rawValue)
        }
    }

    func testMissingParticipantsRequireManualCorrection() {
        let state = ExpenseEditorState(
            payload: EditorTransport.payload(), mode: .edit(EditorTransport.expense()))
        state.payload = TripPayload(
            trip: Trip(
                id: "t", name: "Trip", baseCurrency: .twd,
                participants: [Participant(id: "b", name: "Bob")]))
        XCTAssertNotNil(state.validation)
        state.correctMissingParticipants()
        XCTAssertEqual(state.participantIDs, ["b"])
        XCTAssertEqual(state.paidByID, "a")
        XCTAssertEqual(state.splitValues["b"], "70")
        XCTAssertNotNil(state.validation)
    }

    func testQueuedDraftKeepsAllFieldsAndDoesNotApplyNewDefaults() {
        let draft = NewExpense(
            description: "Queued", amount: "9.50", currency: .usd,
            paidById: "b", participantIds: ["b", "a"], expenseDate: "2021-12-03",
            splitMode: .ratio, splitValues: ["a": "1.5", "b": "2"],
            category: nil, tags: ["tag,with,commas", "another"])
        let state = ExpenseEditorState(payload: EditorTransport.payload(), draft: draft)
        XCTAssertEqual(state.input, draft)
        XCTAssertFalse(state.dirty)
        XCTAssertNil(state.observed)
        XCTAssertNil(state.photo)
    }

    func testInvalidQueuedDateRemainsVisibleUntilExplicitCorrection() {
        let draft = NewExpense(
            description: "Queued", amount: "9", currency: .twd,
            paidById: "a", participantIds: ["a"], expenseDate: "not-a-date")
        let state = ExpenseEditorState(payload: EditorTransport.payload(), draft: draft)
        XCTAssertEqual(state.input.expenseDate, "not-a-date")
        XCTAssertNotNil(state.validation)
        XCTAssertFalse(state.dirty)
    }

    func testReceiptFailureRetriesOnlyReceiptUsingCreatedIDAndVersion() async {
        let transport = EditorTransport(.receiptFailure)
        let session = await session(transport)
        let state = newState(session)
        state.photo = Data([1, 2, 3])
        var callbacks = 0
        await state.submit(session: session) { _ in callbacks += 1 }
        XCTAssertEqual(state.savedExpenseID, "e")
        XCTAssertFalse(state.finished)
        XCTAssertNotNil(state.photo)
        await state.submit(session: session) { _ in callbacks += 1 }
        XCTAssertTrue(state.finished)
        XCTAssertEqual(callbacks, 2)
        let writes = await transport.writes
        let versions = await transport.versions
        XCTAssertEqual(
            writes,
            [
                "POST /api/trips/t/expenses", "PUT /api/trips/t/expenses/e/receipt",
                "PUT /api/trips/t/expenses/e/receipt",
            ])
        XCTAssertEqual(versions[1], "\"2\"")
        XCTAssertEqual(versions[2], "\"2\"")
    }

    func testReceiptConflictRequiresExplicitReviewAndUsesLatestVersionWithoutPost() async {
        let transport = EditorTransport(.receiptConflict)
        let session = await session(transport)
        let state = newState(session)
        state.photo = Data([1, 2, 3])
        await state.submit(session: session) { _ in }
        XCTAssertTrue(state.conflict)
        XCTAssertEqual(state.savedExpenseID, "e")
        XCTAssertEqual(state.reviewExpense?.version, 9)
        await state.submit(session: session) { _ in }
        let blocked = await transport.writes
        XCTAssertEqual(blocked.count, 2)
        state.confirmReview()
        await state.submit(session: session) { _ in }
        let writes = await transport.writes
        let versions = await transport.versions
        XCTAssertEqual(writes.filter { $0.hasPrefix("POST") }.count, 1)
        XCTAssertEqual(versions, [nil, "\"2\"", "\"9\""])
        XCTAssertTrue(state.finished)
    }

    func testMissingCreatedIDDoesNotGuessIDOrRepeatPost() async {
        let transport = EditorTransport(.missingCreatedID)
        let session = await session(transport)
        let state = newState(session)
        state.photo = Data([1])
        await state.submit(session: session) { _ in }
        XCTAssertTrue(state.unknownCreate)
        XCTAssertTrue(state.creationConfirmed)
        XCTAssertNil(state.savedExpenseID)
        state.unknownCreate = false
        await state.submit(session: session) { _ in }
        let writes = await transport.writes
        XCTAssertEqual(writes, ["POST /api/trips/t/expenses"])
    }

    func testConflictLoadsLatestButDoesNotRetryOrAcceptVersion() async {
        let transport = EditorTransport(.conflict)
        let session = await session(transport)
        let state = ExpenseEditorState(
            payload: EditorTransport.payload(), mode: .edit(EditorTransport.expense(version: 1)))
        state.bind(session: session)
        state.description = "My draft"
        await state.submit(session: session) { _ in }
        XCTAssertTrue(state.conflict)
        XCTAssertTrue(state.reviewLoaded)
        XCTAssertEqual(state.description, "My draft")
        XCTAssertEqual(state.observed?.version, 1)
        XCTAssertEqual(state.reviewExpense?.version, 9)
        await state.submit(session: session) { _ in }
        let before = await transport.writes
        XCTAssertEqual(before.count, 1)
        state.confirmReview()
        XCTAssertEqual(state.observed?.version, 9)
        await state.submit(session: session) { _ in }
        let after = await transport.writes
        let versions = await transport.versions
        XCTAssertEqual(after.count, 2)
        XCTAssertEqual(versions, ["\"1\"", "\"9\""])
        XCTAssertTrue(state.finished)
    }

    func testMissingObservedVersionLoadsReviewWithoutSendingUnversionedPatch() async {
        let transport = EditorTransport(.conflict)
        let session = await session(transport)
        let expense = Expense(
            id: "e", description: "Version missing", amountMinor: 100, currency: .twd,
            paidById: "a", participantIds: ["a", "b"], expenseDate: "2020-01-01")
        let state = ExpenseEditorState(payload: EditorTransport.payload(), mode: .edit(expense))
        state.bind(session: session)
        await state.submit(session: session) { _ in }
        XCTAssertTrue(state.conflict)
        XCTAssertTrue(state.reviewLoaded)
        XCTAssertNil(state.observed?.version)
        XCTAssertEqual(state.reviewExpense?.version, 9)
        let writes = await transport.writes
        XCTAssertTrue(writes.isEmpty)
    }

    func testUnknownPostRequiresGroupCheckAndStillDoesNotAutoRetry() async {
        let transport = EditorTransport(.unknown)
        let session = await session(transport)
        let state = newState(session)
        await state.submit(session: session) { _ in }
        XCTAssertTrue(state.unknownCreate)
        await state.submit(session: session) { _ in }
        let writes = await transport.writes
        XCTAssertEqual(writes.count, 1)
        await state.reloadReview(session: session) { _ in }
        XCTAssertTrue(state.checkedUnknown)
        XCTAssertTrue(state.unknownCreate)
    }

    func testSessionChangeIgnoresLateCallbacksAndDoesNotUploadReceipt() async throws {
        let transport = EditorTransport(.delayed)
        let session = await session(transport)
        let state = newState(session)
        state.photo = Data([1, 2, 3])
        var callbacks = 0
        let task = Task { await state.submit(session: session) { _ in callbacks += 1 } }
        try await waitUntilPending(transport)
        await session.signOut()
        await transport.release()
        await task.value
        XCTAssertEqual(callbacks, 0)
        XCTAssertNil(state.savedExpenseID)
        let writes = await transport.writes
        XCTAssertEqual(writes.count, 1)
    }

    func testDuplicateSubmitWhilePendingDoesNotSendTwice() async throws {
        let transport = EditorTransport(.delayed)
        let session = await session(transport)
        let state = newState(session)
        let task = Task { await state.submit(session: session) { _ in } }
        try await waitUntilPending(transport)
        await state.submit(session: session) { _ in }
        let writes = await transport.writes
        XCTAssertEqual(writes.count, 1)
        await transport.release()
        await task.value
        XCTAssertTrue(state.finished)
    }

    func testAnotherEditorForSameSessionAndGroupCannotMutateWhilePending() async throws {
        let transport = EditorTransport(.delayed)
        let session = await session(transport)
        let first = newState(session)
        let second = newState(session)
        let task = Task { await first.submit(session: session) { _ in } }
        try await waitUntilPending(transport)
        await second.submit(session: session) { _ in XCTFail("Second editor must not submit") }
        let writes = await transport.writes
        XCTAssertEqual(writes.count, 1)
        XCTAssertNotNil(second.issue)
        await transport.release()
        await task.value
    }

    func testReadOnlyAndArchivedGroupsCannotSubmit() async {
        let transport = EditorTransport(.receiptFailure)
        let session = await session(transport)
        let state = newState(session)
        let original = state.payload
        state.payload = TripPayload(trip: original.trip, currentUserRole: .owner, readonly: true)
        await state.submit(session: session) { _ in XCTFail("Read-only write callback") }
        state.payload = TripPayload(
            trip: Trip(
                id: "t", ownerId: "u", name: "Trip", baseCurrency: .twd,
                archivedAt: "2020-01-01", allowApiWrites: true,
                participants: original.trip.participants), currentUserRole: .owner)
        await state.submit(session: session) { _ in XCTFail("Archived write callback") }
        let writes = await transport.writes
        XCTAssertTrue(writes.isEmpty)
    }

    private func revision() -> ExpenseRevision {
        ExpenseRevision(
            id: "r", expenseId: "e", version: 2, action: .updated, source: .expense,
            recordedAt: "2020-01-01T00:00:00Z",
            snapshot: ExpenseSnapshot(
                expense: EditorTransport.expense(),
                participants: EditorTransport.payload().trip.participants))
    }

    func testRestoreReviewUsesCurrentVersionNotVisibleOrLatestHistoryVersion() throws {
        let review = try ExpenseRestoreReview(
            payload: EditorTransport.payload(version: 8), revision: revision(),
            latestRevision: ExpenseLatestRevision(version: 99, action: .updated))
        XCTAssertEqual(review.version, 8)
        XCTAssertNotNil(review.current)
        XCTAssertTrue(review.missingParticipantIDs.isEmpty)
    }

    func testDeletedRestoreRequiresLatestDeletedRevision() throws {
        let payload = TripPayload(
            trip: Trip(
                id: "t", name: "Trip", baseCurrency: .twd,
                participants: EditorTransport.payload().trip.participants))
        let review = try ExpenseRestoreReview(
            payload: payload, revision: revision(),
            latestRevision: ExpenseLatestRevision(version: 9, action: .deleted))
        XCTAssertEqual(review.version, 9)
        XCTAssertNil(review.current)
        XCTAssertThrowsError(
            try ExpenseRestoreReview(
                payload: payload, revision: revision(),
                latestRevision: ExpenseLatestRevision(version: 9, action: .updated)))
        XCTAssertThrowsError(
            try ExpenseRestoreReview(payload: payload, revision: revision(), latestRevision: nil))
    }

    func testExistingExpenseWithoutVersionCannotFallBackToHistory() {
        let expense = Expense(
            id: "e", description: "No version", amountMinor: 10, currency: .twd,
            paidById: "a", participantIds: ["a"], expenseDate: "2020-01-01")
        let payload = TripPayload(
            trip: Trip(id: "t", name: "Trip", baseCurrency: .twd, expenses: [expense]))
        XCTAssertThrowsError(
            try ExpenseRestoreReview(
                payload: payload, revision: revision(),
                latestRevision: ExpenseLatestRevision(version: 9, action: .deleted)))
    }

    func testRestoreReviewDetectsMissingSnapshotParticipants() throws {
        let payload = TripPayload(
            trip: Trip(
                id: "t", name: "Trip", baseCurrency: .twd,
                participants: [Participant(id: "b", name: "Bob")],
                expenses: [EditorTransport.expense()]))
        let review = try ExpenseRestoreReview(
            payload: payload, revision: revision(), latestRevision: nil)
        XCTAssertEqual(review.missingParticipantIDs, Set(["a"]))
    }

    func testReceiptEncoderProducesBoundedJPEGFromPNGImage() throws {
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        let image = UIGraphicsImageRenderer(size: CGSize(width: 20, height: 30), format: format)
            .image { context in
                UIColor.red.setFill()
                context.fill(CGRect(x: 0, y: 0, width: 20, height: 30))
            }
        let png = try XCTUnwrap(image.pngData())
        let decodedPNG = try XCTUnwrap(UIImage(data: png))
        let jpeg = try ReceiptImageEncoder.jpegData(decodedPNG)
        XCTAssertEqual(Array(jpeg.prefix(2)), [0xff, 0xd8])
        XCTAssertLessThanOrEqual(jpeg.count, ReceiptImageEncoder.maximumBytes)
        let decodedJPEG = try XCTUnwrap(UIImage(data: jpeg))
        XCTAssertEqual(decodedJPEG.imageOrientation, .up)
        XCTAssertEqual(decodedJPEG.size.width, 20)
        XCTAssertEqual(decodedJPEG.size.height, 30)
    }

    func testReceiptEncoderRejectsEmptyImage() {
        XCTAssertThrowsError(try ReceiptImageEncoder.jpegData(UIImage()))
    }
}
