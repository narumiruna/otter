import CryptoKit
import Foundation
import OtterKit

// Private protocol: one request on stdin, one non-secret result on stdout.
// Never print an Error, HTTP body, cookie, password, or share capability.
private struct Failure: Error { let check: String }

private func require(_ condition: Bool, _ check: String) throws {
    if !condition { throw Failure(check: check) }
}

private func needed<T>(_ value: T?, _ check: String) throws -> T {
    guard let value else { throw Failure(check: check) }
    return value
}

private struct SameData: Codable, Equatable, Sendable {
    let userID: String
    let tripID: String
    let ownerID: String
    let friendID: String
    let expenseID: String
    let originalVersion: Int
}

private struct Result: Codable, Sendable {
    let same: SameData
    var checks: [String: Bool] = [:]
    var version = 1
    var expenseCount = 1
    var groupCount = 1
    var remainingMinor: Int64 = 70
    var restoredID: String?
    var restoredExpenseID: String?
    var csvID: String?
    var csvExpenseID: String?
    var queuedID: String?
    var operationID: String?
    var bodySHA256: String?

    mutating func check(_ condition: Bool, _ name: String) throws {
        try require(condition && checks[name] == nil, name)
        checks[name] = true
    }
}

private struct Request: Decodable {
    let phase: String
    let origin: String
    let username: String
    let password: String
    let queueDirectory: String
    let previous: Result?
    let csv: String?
    let backupBase64: String?

    func validatedOrigin() throws -> URL {
        let url = try needed(URL(string: origin), "origin")
        let parts = try needed(URLComponents(url: url, resolvingAgainstBaseURL: false), "origin")
        try require(
            parts.scheme == "http" && parts.host == "localhost"
                && parts.port.map { (1024...65535).contains($0) } == true
                && parts.user == nil && parts.password == nil && parts.query == nil
                && parts.fragment == nil && parts.path.isEmpty
                && url.absoluteString == origin, "origin")
        try require(
            username.range(of: "^cross-[a-f0-9]{24}$", options: .regularExpression) != nil
                && password.range(of: "^[A-Za-z0-9_-]{40,100}$", options: .regularExpression)
                    != nil,
            "synthetic-credentials")
        try require(queueDirectory.hasPrefix("/"), "queue-directory")
        return url
    }
}

private func verifyDinner(
    _ payload: TripPayload, same: SameData, description: String, version: Int, count: Int = 1
) throws {
    try require(
        payload.trip.id == same.tripID && payload.trip.ownerId == same.userID
            && payload.currentUserRole == .owner && payload.trip.baseCurrency == .twd
            && payload.trip.participants.map(\.id) == [same.ownerID, same.friendID]
            && payload.trip.expenses.count == count, "same-group")
    let expense = try needed(
        payload.trip.expenses.first { $0.id == same.expenseID }, "same-expense")
    try require(
        expense.description == description && expense.version == version
            && expense.amountMinor == 101 && expense.currency == .twd
            && expense.paidById == same.ownerID
            && expense.participantIds == [same.ownerID, same.friendID]
            && expense.expenseDate == "2026-10-23"
            && expense.participantShares == [
                ParticipantShare(participantId: same.ownerID, shareMinor: 31),
                ParticipantShare(participantId: same.friendID, shareMinor: 70),
            ], "dinner-values")
}

private func verifyDebt(_ payload: TripPayload, same: SameData, amount: Int64) throws {
    try require(payload.settlements.count == 1, "settlement-count")
    let debt = payload.settlements[0]
    try require(
        debt.fromId == same.friendID && debt.toId == same.ownerID
            && debt.amountMinor == amount && debt.currency == .twd, "remaining-debt")
    let local = try Finance.settlements(trip: payload.trip)
    try require(
        local.count == 1 && local[0].fromId == debt.fromId && local[0].toId == debt.toId
            && local[0].amountMinor == amount && local[0].currency == .twd, "native-finance")
}

private func login(_ request: Request, register: Bool = false) async throws -> OtterClient {
    _ = try request.validatedOrigin()  // Before any credential can reach a transport.
    let anonymous = try OtterClient(server: request.origin)
    let authenticated = try await anonymous.passwordLogin(
        username: request.username, password: request.password, register: register)
    try require(authenticated.client.auth.isSession, "session-login")
    try require(try await authenticated.client.user().id == authenticated.user.id, "login-identity")
    if let previous = request.previous {
        try require(authenticated.user.id == previous.same.userID, "same-account")
    }
    return authenticated.client
}

private func create(_ request: Request) async throws -> Result {
    try require(request.previous == nil, "create-once")
    let client = try await login(request, register: true)
    let user = try await client.user()
    var payload = try await client.createTrip(
        name: "Cross-client " + UUID().uuidString, currency: .twd)
    try require(
        payload.trip.participants.count == 1 && payload.trip.expenses.isEmpty, "empty-group")
    let ownerID = payload.trip.participants[0].id
    payload = try await client.renameParticipant(
        tripID: payload.trip.id, participantID: ownerID, name: "Cross owner")
    payload = try await client.addParticipant(tripID: payload.trip.id, name: "Cross friend")
    let friendID = try needed(
        payload.trip.participants.first { $0.name == "Cross friend" }?.id, "friend")
    let added = try await client.addExpense(
        tripID: payload.trip.id,
        input: NewExpense(
            description: "Native dinner", amount: "101", currency: .twd, paidById: ownerID,
            participantIds: [ownerID, friendID], expenseDate: "2026-10-23",
            splitMode: .amount, splitValues: [ownerID: "31", friendID: "70"]))
    let expenseID = try needed(added.createdExpenseId, "created-expense-id")
    let same = SameData(
        userID: user.id, tripID: added.trip.id, ownerID: ownerID, friendID: friendID,
        expenseID: expenseID, originalVersion: 1)
    try verifyDinner(added, same: same, description: "Native dinner", version: 1)
    try verifyDebt(added, same: same, amount: 70)
    try require(try await client.trips().trips.count == 1, "one-group")
    var result = Result(same: same)
    try result.check(true, "nativeCreate")
    try result.check(true, "unequalShares")
    try result.check(true, "sameAccount")
    try await client.logout()
    return result
}

private func review(_ request: Request) async throws -> Result {
    let previous = try needed(request.previous, "review-input")
    let same = previous.same
    try require(same.originalVersion == 1 && previous.version == 1, "observed-version")
    let client = try await login(request)
    var result = Result(same: same)
    // Use the original observed version as data. Do not fetch or substitute v2 first.
    let path = "api/trips/\(same.tripID)/expenses/\(same.expenseID)"
    var rejected = false
    do {
        let _: TripPayload = try await client.api(
            "PATCH", path: path,
            body: JSONEncoder().encode(ExpenseUpdate(description: "Stale native overwrite")),
            version: same.originalVersion)
    } catch let error as APIResponseError {
        try require(error.status == 412, "exact-412")
        rejected = true
    }
    try result.check(rejected, "stale412")
    let web = try await client.trip(id: same.tripID)
    try verifyDinner(web, same: same, description: "Web updated dinner", version: 2)
    try verifyDebt(web, same: same, amount: 70)
    try require(web.trip.settlementPayments?.isEmpty == true, "stale-no-payment")
    try result.check(true, "webEditPreserved")
    // Explicit latest review, then one description-only PATCH with that observed version.
    let latest = try needed(web.trip.expenses.first { $0.id == same.expenseID }, "review-latest")
    let reviewed: TripPayload = try await client.api(
        "PATCH", path: path,
        body: JSONEncoder().encode(ExpenseUpdate(description: "Native reviewed dinner")),
        version: latest.version)
    try verifyDinner(reviewed, same: same, description: "Native reviewed dinner", version: 3)
    try result.check(true, "explicitLatestReview")
    // This records a payment only. It does not transfer funds and is never retried.
    let paid = try await client.recordPayment(
        tripID: same.tripID, fromID: same.friendID, toID: same.ownerID, amount: "20",
        currency: .twd, paidAt: "2026-10-23", note: "Cross-client partial payment")
    try verifyDebt(paid, same: same, amount: 50)
    let payments = try needed(paid.trip.settlementPayments, "payments-visible")
    try require(
        payments.count == 1 && payments[0].amountMinor == 20
            && payments[0].fromId == same.friendID && payments[0].toId == same.ownerID
            && payments[0].currency == .twd, "one-partial-payment")
    try result.check(true, "partialPayment")

    let shared = try await client.createShare(tripID: same.tripID, mode: .readonly)
    let link = try needed(
        shared.shareLinks?.first { $0.url != nil && $0.mode == .readonly }, "share")
    let url = try needed(link.url.flatMap(URL.init(string:)), "share-url")
    // Only the token path component is consumed. Never follow or print a returned URL.
    let token = url.lastPathComponent
    let publicPayload = try await ShareClient(
        origin: request.validatedOrigin(), transport: PublicBoundsTransport()
    ).readonlyPayload(token: token)
    try require(
        publicPayload.trip.id == same.tripID && publicPayload.readonly == true
            && publicPayload.trip.ownerId == nil && publicPayload.trip.settlementPayments == nil
            && publicPayload.collaborators == nil && publicPayload.shareLinks == nil
            && publicPayload.currentUserRole == nil
            && publicPayload.trip.expenses.count == 1
            && publicPayload.trip.expenses[0].id == same.expenseID
            && publicPayload.trip.expenses.allSatisfy {
                $0.receiptId == nil && $0.receiptUrl == nil
            },
        "readonly-bounds")
    try require(
        try Finance.memberAccounts(payload: publicPayload).allSatisfy {
            !$0.paymentDetailsAvailable && $0.payments.isEmpty
        }, "no-hidden-payment-inference")
    try result.check(true, "readonlyShareBounds")
    try await client.logout()
    result.version = 3
    result.remainingMinor = 50
    return result
}

// Check absence in the real public response, not just optional Codable fields.
private struct PublicBoundsTransport: HTTPTransport {
    private let underlying = URLSessionTransport()

    func data(for request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        try require(
            request.value(forHTTPHeaderField: "Cookie") == nil
                && request.value(forHTTPHeaderField: "Authorization") == nil,
            "anonymous-share-transport")
        let response = try await underlying.data(for: request)
        try require(response.1.statusCode == 200, "public-share-status")
        let payload = try needed(
            JSONSerialization.jsonObject(with: response.0) as? [String: Any], "public-json")
        let trip = try needed(payload["trip"] as? [String: Any], "public-trip-json")
        let expenses = try needed(trip["expenses"] as? [[String: Any]], "public-expense-json")
        try require(
            ["collaborators", "shareLinks", "currentUserRole"].allSatisfy { payload[$0] == nil }
                && ["ownerId", "settlementPayments"].allSatisfy { trip[$0] == nil }
                && expenses.allSatisfy { $0["receiptId"] == nil && $0["receiptUrl"] == nil },
            "raw-public-field-absence")
        return response
    }
}

private func bodyDigest(_ data: Data) -> String {
    SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
}

// Only the first queued POST loses its reply, after the real HTTP response arrives.
// Snapshots never contain Authorization or Cookie headers.
private actor LostReplyTransport: HTTPTransport {
    struct Attempt: Equatable, Sendable {
        let body: Data
        let operation: String
        let queueUser: String
        let contentType: String
    }
    private let underlying = URLSessionTransport()
    private let target: URL
    private let storage: ExpenseLocalStorage
    private let expected: QueuedExpense
    private let loseFirst: Bool
    private var attempts: [Attempt] = []
    private var verified = false

    init(target: URL, storage: ExpenseLocalStorage, expected: QueuedExpense, loseFirst: Bool) {
        self.target = target
        self.storage = storage
        self.expected = expected
        self.loseFirst = loseFirst
    }

    func markVerified() { verified = true }

    func data(for request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        guard request.httpMethod == "POST", request.url == target else {
            return try await underlying.data(for: request)
        }
        try require(verified, "verify-user-before-send")
        struct QueueFile: Decodable {
            let version: Int
            let expenses: [QueuedExpense]
        }
        let bytes = try needed(storage.load(), "durable-queue")
        let file = try JSONDecoder().decode(QueueFile.self, from: bytes)
        let persisted = try needed(file.expenses.first { $0.id == expected.id }, "durable-row")
        try require(
            file.version == 1 && file.expenses.count == 1 && persisted.status == .attempted
                && persisted.operationID == expected.operationID && persisted.body == expected.body
                && persisted.context == expected.context, "attempted-before-send")
        let attempt = Attempt(
            body: try needed(request.httpBody, "queue-body"),
            operation: request.value(forHTTPHeaderField: "Idempotency-Key") ?? "",
            queueUser: request.value(forHTTPHeaderField: "X-Otter-Queue-User") ?? "",
            contentType: request.value(forHTTPHeaderField: "Content-Type") ?? "")
        try require(
            attempt.body == expected.body
                && attempt.operation == expected.operationID.uuidString.lowercased()
                && attempt.queueUser == expected.context.userID
                && attempt.contentType == "application/json", "frozen-body-and-headers")
        if let first = attempts.first { try require(first == attempt, "same-retry") }
        attempts.append(attempt)
        let response = try await underlying.data(for: request)
        try require((200...299).contains(response.1.statusCode), "real-queue-commit")
        if loseFirst && attempts.count == 1 { throw URLError(.networkConnectionLost) }
        return response
    }

    func verifySingleSend() throws {
        try require(verified && attempts.count == 1, "one-queue-post")
    }
}

private func queueStorage(_ request: Request) throws -> ExpenseLocalStorage {
    let directory = URL(fileURLWithPath: request.queueDirectory, isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    try FileManager.default.setAttributes([.posixPermissions: 0o700], ofItemAtPath: directory.path)
    let url = directory.appendingPathComponent("expenses.json")
    let file = ExpenseLocalStorage.file(at: url)
    // Keep Core's atomic write and synchronization; restrict permissions after each commit.
    return ExpenseLocalStorage(
        load: file.load,
        save: { data in
            try file.save(data)
            try FileManager.default.setAttributes(
                [.posixPermissions: 0o600], ofItemAtPath: url.path)
        })
}

private func activate(
    _ queue: ExpenseQueue, client: OtterClient, request: Request, expected: QueuedExpense,
    storage: ExpenseLocalStorage, loseFirst: Bool
) async throws -> LostReplyTransport {
    let same = try needed(request.previous, "queue-input").same
    let origin = try request.validatedOrigin()
    let target = try needed(
        URL(string: request.origin + "/api/trips/\(same.tripID)/expenses"), "queue-target")
    let transport = LostReplyTransport(
        target: target, storage: storage, expected: expected, loseFirst: loseFirst)
    let queuedClient = try OtterClient(
        server: request.origin, auth: client.auth, transport: transport)
    let session = try ExpenseQueueSession(
        origin: origin, userID: same.userID, credentialGeneration: UUID(), authentication: .session)
    await queue.activate(
        session: session,
        verifyUser: {
            let user = try await queuedClient.user()
            try require(user.id == same.userID, "queue-current-user")
            await transport.markVerified()
            return user.id
        },
        send: { context, body, operation in
            try require(
                context.origin == origin && context.userID == same.userID
                    && context.tripID == same.tripID,
                "queue-account-context")
            return try await queuedClient.addQueuedExpense(
                tripID: context.tripID, body: body, operationID: operation, userID: context.userID)
        })
    return transport
}

private func verifyImported(_ payload: TripPayload, same: SameData) throws -> String {
    try require(
        payload.trip.id != same.tripID && payload.currentUserRole == .owner
            && payload.trip.ownerId == same.userID && payload.trip.baseCurrency == .twd
            && payload.trip.expenses.count == 1 && payload.trip.participants.count == 2,
        "restored-owner-role")
    let owner = try needed(
        payload.trip.participants.first { $0.name == "Cross owner" }, "restored-owner")
    let friend = try needed(
        payload.trip.participants.first { $0.name == "Cross friend" }, "restored-friend")
    try require(
        Set(payload.trip.participants.map(\.id)).isDisjoint(with: [same.ownerID, same.friendID]),
        "participant-id-remap")
    let expense = payload.trip.expenses[0]
    try require(
        expense.id != same.expenseID && expense.description == "Web updated dinner"
            && expense.amountMinor == 101 && expense.currency == .twd
            && expense.paidById == owner.id
            && expense.participantIds == [owner.id, friend.id]
            && expense.participantShares == [
                ParticipantShare(participantId: owner.id, shareMinor: 31),
                ParticipantShare(participantId: friend.id, shareMinor: 70),
            ] && expense.receiptId == nil && expense.receiptUrl == nil
            && payload.trip.settlementPayments?.isEmpty == true, "restored-financial-values")
    return expense.id
}

private func interopLoss(_ request: Request) async throws -> Result {
    var result = try needed(request.previous, "interop-input")
    try require(result.version == 3, "interop-stage")
    result.checks = [:]
    let same = result.same
    let client = try await login(request)
    let original = try await client.trip(id: same.tripID)
    try verifyDinner(original, same: same, description: "Native reviewed dinner", version: 3)
    try verifyDebt(original, same: same, amount: 50)

    let csv = try needed(request.csv, "web-csv")
    let preview = CSV.parseImport(csv, participantNames: ["Cross owner", "Cross friend"])
    try require(preview.canImport && preview.rows.count == 1, "csv-preview")
    let row = preview.rows[0]
    try require(
        row.description == "Web updated dinner" && row.amount == "101" && row.currency == "TWD"
            && row.paidBy == "Cross owner"
            && row.splitParticipants == ["Cross owner", "Cross friend"]
            && row.splitShares?.map(\.name) == ["Cross owner", "Cross friend"]
            && row.splitShares?.map(\.amount) == ["31", "70"], "csv-web-values")
    try result.check(true, "nativeCSVPreview")
    let backup = try needed(request.backupBase64.flatMap { Data(base64Encoded: $0) }, "web-json")
    let backupPreview = try BackupPreview(data: backup)
    try require(
        backupPreview.version == 2 && backupPreview.baseCurrency == .twd
            && backupPreview.participantCount == 2 && backupPreview.expenseCount == 1
            && backupPreview.paymentCount == 0, "json-v2-preview")
    try result.check(true, "nativeBackupV2Preview")
    // Exactly one restore. An uncertain response must fail; never retry this POST.
    let restored = try await client.restoreBackup(backupPreview.originalData)
    result.restoredExpenseID = try verifyImported(restored, same: same)
    result.restoredID = restored.trip.id
    try result.check(true, "backupRestoreRemapsIDs")
    var imported = try await client.createTrip(name: "Cross-client CSV import", currency: .twd)
    let initial = try needed(imported.trip.participants.first, "csv-initial-owner")
    imported = try await client.renameParticipant(
        tripID: imported.trip.id, participantID: initial.id, name: "Cross owner")
    imported = try await client.addParticipant(tripID: imported.trip.id, name: "Cross friend")
    imported = try await client.importCSV(tripID: imported.trip.id, csv: csv)
    result.csvExpenseID = try verifyImported(imported, same: same)
    result.csvID = imported.trip.id
    try result.check(true, "csvImportRemapsIDs")

    let storage = try queueStorage(request)
    let queue = ExpenseQueue(storage: storage)
    let context = try ExpenseContext(
        origin: request.validatedOrigin(), userID: same.userID, tripID: same.tripID)
    try require(try await queue.list(in: context).isEmpty, "fresh-queue")
    let expected = try await queue.enqueue(
        NewExpense(
            description: "Native queued snack", amount: "9", currency: .twd, paidById: same.ownerID,
            participantIds: [same.ownerID], expenseDate: "2026-10-23"), in: context)
    let transport = try await activate(
        queue, client: client, request: request, expected: expected, storage: storage,
        loseFirst: true)
    let report = try await queue.synchronize()
    guard case .unknownResult = report.stop else { throw Failure(check: "lost-reply-stop") }
    try require(report.successes.isEmpty, "lost-reply-unconfirmed")
    let pending = try await queue.list(in: context)
    try require(
        pending.count == 1 && pending[0].status == .attempted
            && pending[0].body == expected.body && pending[0].operationID == expected.operationID,
        "lost-reply-persisted")
    try await transport.verifySingleSend()
    let after = try await client.trip(id: same.tripID)
    try verifyDinner(after, same: same, description: "Native reviewed dinner", version: 3, count: 2)
    try verifyDebt(after, same: same, amount: 50)
    let queued = try needed(
        after.trip.expenses.first { $0.id != same.expenseID }, "committed-queued-id")
    try require(
        queued.description == "Native queued snack" && queued.amountMinor == 9, "committed-on-loss")
    result.queuedID = queued.id
    result.operationID = expected.operationID.uuidString.lowercased()
    result.bodySHA256 = bodyDigest(expected.body)
    result.expenseCount = 2
    result.groupCount = 3
    try require(try await client.trips().trips.count == 3, "three-groups")
    try result.check(true, "realCommitThenResponseLoss")
    try result.check(true, "durableAttemptBeforeSend")
    await queue.deactivate()
    try await client.logout()
    return result
}

private func replay(_ request: Request) async throws -> Result {
    var result = try needed(request.previous, "replay-input")
    result.checks = [:]
    let same = result.same
    let client = try await login(request)
    // A new process reads the actual Core queue file. No request is reconstructed.
    let storage = try queueStorage(request)
    let queue = ExpenseQueue(storage: storage)
    let context = try ExpenseContext(
        origin: request.validatedOrigin(), userID: same.userID, tripID: same.tripID)
    let persisted = try await queue.list(in: context)
    try require(
        persisted.count == 1 && persisted[0].status == .attempted
            && persisted[0].operationID.uuidString.lowercased() == result.operationID
            && bodyDigest(persisted[0].body) == result.bodySHA256,
        "restart-attempted-operation")
    let expected = persisted[0]
    let transport = try await activate(
        queue, client: client, request: request, expected: expected, storage: storage,
        loseFirst: false)
    let report = try await queue.synchronize()
    guard case .idle = report.stop else { throw Failure(check: "replay-stop") }
    try require(
        report.successes.count == 1 && report.successes[0].operationID == expected.operationID
            && report.successes[0].payload.createdExpenseId == result.queuedID,
        "confirmed-same-operation")
    try await transport.verifySingleSend()
    try require(try await queue.list(in: context).isEmpty, "queue-row-removed")
    let after = try await client.trip(id: same.tripID)
    try verifyDinner(after, same: same, description: "Native reviewed dinner", version: 3, count: 2)
    try verifyDebt(after, same: same, amount: 50)
    try require(
        after.trip.expenses.filter {
            $0.id == result.queuedID && $0.description == "Native queued snack"
        }.count == 1
            && after.trip.settlementPayments?.count == 1, "one-queued-expense-no-payment-retry")
    try result.check(true, "persistentQueueReplay")
    try result.check(true, "sameOperationBodyHeaders")
    try result.check(true, "confirmedRowRemoval")
    await queue.deactivate()
    try await client.logout()
    let relogged = try await login(request)
    try verifyDinner(
        try await relogged.trip(id: same.tripID), same: same,
        description: "Native reviewed dinner", version: 3, count: 2)
    try require(try await relogged.trips().trips.count == 3, "relogin-groups")
    try result.check(true, "realRelogin")
    try await relogged.logout()
    return result
}

@main
private struct Bridge {
    static func main() async {
        do {
            let input = FileHandle.standardInput.readDataToEndOfFile()
            try require(input.count <= 24 * 1024 * 1024, "input-size")
            let request = try JSONDecoder().decode(Request.self, from: input)
            _ = try request.validatedOrigin()
            let result: Result
            switch request.phase {
            case "create": result = try await create(request)
            case "review": result = try await review(request)
            case "interopLoss": result = try await interopLoss(request)
            case "replay": result = try await replay(request)
            default: throw Failure(check: "unknown-phase")
            }
            let bytes = try JSONEncoder().encode(result)
            FileHandle.standardOutput.write(bytes)
            FileHandle.standardOutput.write(Data("\n".utf8))
        } catch {
            // Fixed failure text also redacts Foundation and server errors that contain URLs.
            FileHandle.standardError.write(Data("Cross-client native phase failed.\n".utf8))
            exit(1)
        }
    }
}
