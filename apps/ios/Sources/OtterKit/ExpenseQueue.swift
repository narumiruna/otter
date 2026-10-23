import Foundation

#if canImport(Darwin)
    import Darwin
#elseif canImport(Glibc)
    import Glibc
#endif

/// The identity of local expense data. This value never contains credentials.
public struct ExpenseContext: Codable, Hashable, Sendable {
    public let origin: URL
    public let userID: String
    public let tripID: String

    public init(origin: URL, userID: String, tripID: String) throws {
        self.origin = try Self.canonicalOrigin(origin)
        guard !userID.isEmpty, !tripID.isEmpty else { throw ExpenseStorageError.invalidContext }
        self.userID = userID
        self.tripID = tripID
    }

    public static func canonicalOrigin(_ url: URL) throws -> URL {
        guard var parts = URLComponents(url: url, resolvingAgainstBaseURL: false),
            let host = parts.host?.lowercased(), !host.isEmpty,
            let scheme = parts.scheme?.lowercased(),
            scheme == "https" || (scheme == "http" && host == "localhost"),
            parts.user == nil, parts.password == nil, parts.query == nil, parts.fragment == nil,
            parts.path.isEmpty || parts.path == "/"
        else { throw ExpenseStorageError.invalidContext }
        parts.scheme = scheme
        parts.host = host
        if (scheme == "https" && parts.port == 443) || (scheme == "http" && parts.port == 80) {
            parts.port = nil
        }
        parts.path = ""
        guard let canonical = parts.url else { throw ExpenseStorageError.invalidContext }
        return canonical
    }

    public init(from decoder: any Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        try self.init(
            origin: values.decode(URL.self, forKey: .origin),
            userID: values.decode(String.self, forKey: .userID),
            tripID: values.decode(String.self, forKey: .tripID))
    }
}

public enum ExpenseStorageError: Error, LocalizedError, Equatable, Sendable {
    case invalidContext
    case unsupportedVersion(Int)
    case corruptData
    case notFound
    case editLocked
    case deletionNeedsServerCheck

    public var errorDescription: String? {
        switch self {
        case .invalidContext:
            NativeLocalization.string("此裝置資料的帳號或群組識別無效。")
        case .unsupportedVersion(let version):
            NativeLocalization.string("本機資料格式較新（版本 \(version)）。請更新 App；不會清除資料或同步。")
        case .corruptData:
            NativeLocalization.string("本機草稿資料無法驗證，已停止讀取與同步，未刪除原檔。")
        case .notFound:
            NativeLocalization.string("此本機草稿已被移除，請重新載入。")
        case .editLocked:
            NativeLocalization.string("此草稿正在同步或提交結果不明，不能修改內容。")
        case .deletionNeedsServerCheck:
            NativeLocalization.string("提交結果可能不明。請先核對伺服器，再明確確認刪除本機資料。")
        }
    }
}

/// Use separate files for the queue and defaults, and one actor per file.
/// Closures are synchronous so a transaction cannot yield before its durable commit.
public struct ExpenseLocalStorage: Sendable {
    public let load: @Sendable () throws -> Data?
    public let save: @Sendable (Data) throws -> Void

    public init(
        load: @escaping @Sendable () throws -> Data?,
        save: @escaping @Sendable (Data) throws -> Void
    ) {
        self.load = load
        self.save = save
    }

    public static func file(at url: URL) -> Self {
        Self(
            load: {
                do { return try Data(contentsOf: url) } catch let error as CocoaError
                    where error.code == .fileReadNoSuchFile
                { return nil }
            },
            save: { data in
                let directory = url.deletingLastPathComponent()
                try FileManager.default.createDirectory(
                    at: directory, withIntermediateDirectories: true)
                #if os(iOS)
                    try FileManager.default.setAttributes(
                        [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication],
                        ofItemAtPath: directory.path)
                    var protectedDirectory = directory
                    var attributes = URLResourceValues()
                    attributes.isExcludedFromBackup = true
                    try protectedDirectory.setResourceValues(attributes)
                    try data.write(
                        to: url,
                        options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
                #else
                    try data.write(to: url, options: .atomic)
                #endif
                let handle = try FileHandle(forWritingTo: url)
                defer { try? handle.close() }
                try handle.synchronize()
                // The atomic rename must also survive a power loss, not only a process restart.
                let descriptor = open(directory.path, O_RDONLY)
                guard descriptor >= 0 else {
                    throw POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO)
                }
                defer { _ = close(descriptor) }
                guard fsync(descriptor) == 0 else {
                    throw POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO)
                }
            })
    }
}

private struct ExpenseFileHeader: Decodable { let version: Int }

// There is no legacy schema to migrate. Never rewrite an unknown version or a failed decode.
func decodeExpenseFile<T: Codable>(_ type: T.Type, from data: Data) throws -> T {
    let header: ExpenseFileHeader
    do { header = try JSONDecoder().decode(ExpenseFileHeader.self, from: data) } catch {
        throw ExpenseStorageError.corruptData
    }
    guard header.version == 1 else { throw ExpenseStorageError.unsupportedVersion(header.version) }
    do {
        let decoded = try JSONDecoder().decode(type, from: data)
        // Codable normally ignores unknown keys. A durable file must not silently discard them.
        guard let original = try JSONSerialization.jsonObject(with: data) as? NSDictionary,
            let known = try JSONSerialization.jsonObject(with: encodeExpenseFile(decoded))
                as? NSDictionary,
            original.isEqual(known)
        else { throw ExpenseStorageError.corruptData }
        return decoded
    } catch { throw ExpenseStorageError.corruptData }
}

func encodeExpenseFile<T: Encodable>(_ value: T) throws -> Data {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.sortedKeys]
    return try encoder.encode(value)
}

public enum QueuedExpenseStatus: String, Codable, Sendable {
    case pending
    /// Includes transport failures and cancellation after submission. The result can be unknown.
    case attempted
    /// A confirmed HTTP 400. The server did not create this expense.
    case invalid
    /// Permission, missing trip, archive, or idempotency conflict. The body stays locked.
    case conflict
}

public struct QueuedExpense: Codable, Identifiable, Sendable {
    public let id: UUID
    public let context: ExpenseContext
    public let createdAt: Date
    public fileprivate(set) var draft: NewExpense
    public fileprivate(set) var operationID: UUID
    /// Exact bytes passed to the transport, not JSON reconstructed during retry.
    public fileprivate(set) var body: Data
    public fileprivate(set) var status: QueuedExpenseStatus
    /// Only a status code is stored. Server messages can contain private data.
    public fileprivate(set) var rejectionStatus: Int?

    public var isEditable: Bool { status == .pending || status == .invalid }
    public var needsServerCheckBeforeDeletion: Bool { status == .attempted || status == .conflict }
}

public struct ExpenseQueueDeletion: Sendable {
    public let id: UUID
    public let operationID: UUID
    /// Deletion removed local data only. Check the server before creating a replacement.
    public let mayExistOnServer: Bool
}

public struct ExpenseQueueSession: Hashable, Sendable {
    public enum Authentication: Hashable, Sendable { case session, bearer }
    public let origin: URL
    public let userID: String
    public let credentialGeneration: UUID
    public let authentication: Authentication

    public init(
        origin: URL, userID: String, credentialGeneration: UUID,
        authentication: Authentication
    ) throws {
        self.origin = try ExpenseContext.canonicalOrigin(origin)
        guard !userID.isEmpty else { throw ExpenseStorageError.invalidContext }
        self.userID = userID
        self.credentialGeneration = credentialGeneration
        self.authentication = authentication
    }
}

public struct ExpenseQueueSuccess: Sendable {
    public let context: ExpenseContext
    public let operationID: UUID
    public let payload: TripPayload
}

public struct ExpenseSyncReport: Sendable {
    public enum Stop: Sendable {
        case idle, authenticationLost, sessionChanged, cancelled, unknownResult
    }
    public let session: ExpenseQueueSession?
    public let successes: [ExpenseQueueSuccess]
    public let stop: Stop
}

/// Owns the durable queue and its single synchronizer. Do not create two instances for one file.
public actor ExpenseQueue {
    public typealias VerifyUser = @Sendable () async throws -> String
    public typealias Send = @Sendable (ExpenseContext, Data, UUID) async throws -> TripPayload

    private struct File: Codable {
        var version = 1
        var expenses: [QueuedExpense] = []
    }

    private struct Active: Sendable {
        let session: ExpenseQueueSession
        let token = UUID()
        let verifyUser: VerifyUser
        let send: Send
    }

    private let storage: ExpenseLocalStorage
    private var file: File?
    private var active: Active?
    private var failedSessions: Set<ExpenseQueueSession> = []
    private var running = false
    private var editing: Set<UUID> = []
    private var inFlight: UUID?

    public init(storage: ExpenseLocalStorage) { self.storage = storage }

    private func contents() throws -> File {
        if let file { return file }
        let decoded =
            try storage.load().map { try decodeExpenseFile(File.self, from: $0) } ?? File()
        guard Set(decoded.expenses.map(\.id)).count == decoded.expenses.count,
            Set(decoded.expenses.map(\.operationID)).count == decoded.expenses.count
        else { throw ExpenseStorageError.corruptData }
        for item in decoded.expenses {
            // Validate both forms. Do not replay a partially decoded or altered request.
            let bodyDraft: NewExpense
            do { bodyDraft = try JSONDecoder().decode(NewExpense.self, from: item.body) } catch {
                throw ExpenseStorageError.corruptData
            }
            guard try encodeExpenseFile(bodyDraft) == encodeExpenseFile(item.draft),
                try Self.expenseBody(bodyDraft) == item.body,
                item.status == .invalid ? item.rejectionStatus == 400 : true,
                item.status == .conflict
                    ? [403, 404, 409].contains(item.rejectionStatus ?? 0) : true
            else { throw ExpenseStorageError.corruptData }
        }
        file = decoded
        return decoded
    }

    private static func expenseBody(_ draft: NewExpense) throws -> Data {
        let body = try encodeExpenseFile(draft)
        let allowed: Set<String> = [
            "description", "amount", "currency", "paidById", "participantIds", "expenseDate",
            "splitMode", "splitValues", "category", "tags",
        ]
        guard let object = try JSONSerialization.jsonObject(with: body) as? [String: Any],
            Set(object.keys).isSubset(of: allowed)
        else { throw ExpenseStorageError.corruptData }
        return body
    }

    private func commit(_ next: File) throws {
        try storage.save(encodeExpenseFile(next))
        file = next
    }

    @discardableResult
    public func enqueue(_ draft: NewExpense, in context: ExpenseContext) throws -> QueuedExpense {
        var next = try contents()
        let item = QueuedExpense(
            id: UUID(), context: context, createdAt: Date(), draft: draft,
            operationID: UUID(), body: try Self.expenseBody(draft), status: .pending)
        next.expenses.append(item)
        try commit(next)
        return item
    }

    public func list(in context: ExpenseContext) throws -> [QueuedExpense] {
        try contents().expenses.filter { $0.context == context }
    }

    public func list(origin: URL, userID: String) throws -> [QueuedExpense] {
        let canonical = try ExpenseContext.canonicalOrigin(origin)
        return try contents().expenses.filter {
            $0.context.origin == canonical && $0.context.userID == userID
        }
    }

    /// Pass the complete trip ID set only after an authoritative list fetch, not a filtered UI list.
    public func orphans(origin: URL, userID: String, knownTripIDs: Set<String>) throws
        -> [QueuedExpense]
    {
        try list(origin: origin, userID: userID).filter {
            !knownTripIDs.contains($0.context.tripID)
        }
    }

    public func beginEditing(id: UUID, in context: ExpenseContext) throws {
        let item = try find(id, in: context)
        guard item.isEditable, inFlight != id else { throw ExpenseStorageError.editLocked }
        editing.insert(id)
    }

    public func endEditing(id: UUID) { editing.remove(id) }

    @discardableResult
    public func revise(id: UUID, in context: ExpenseContext, draft: NewExpense) throws
        -> QueuedExpense
    {
        let current = try find(id, in: context)
        guard current.isEditable, inFlight != id else { throw ExpenseStorageError.editLocked }
        var next = try contents()
        let index = next.expenses.firstIndex { $0.id == id }!
        next.expenses[index].draft = draft
        next.expenses[index].body = try Self.expenseBody(draft)
        next.expenses[index].operationID = UUID()
        next.expenses[index].status = .pending
        next.expenses[index].rejectionStatus = nil
        try commit(next)
        return next.expenses[index]
    }

    /// Explicit retry of a permission/archive conflict. Never changes the frozen request.
    /// Refresh the trip and permissions in the caller before offering this action.
    public func retry(id: UUID, in context: ExpenseContext) throws {
        let item = try find(id, in: context)
        guard item.status != .invalid, !editing.contains(id), inFlight != id else {
            throw ExpenseStorageError.editLocked
        }
        guard item.status == .conflict else { return }
        var next = try contents()
        let index = next.expenses.firstIndex { $0.id == id }!
        next.expenses[index].status = .attempted
        next.expenses[index].rejectionStatus = nil
        try commit(next)
    }

    @discardableResult
    public func delete(
        id: UUID, in context: ExpenseContext, acknowledgingUnknownResult: Bool = false
    ) throws -> ExpenseQueueDeletion {
        let item = try find(id, in: context)
        guard !item.needsServerCheckBeforeDeletion || acknowledgingUnknownResult else {
            throw ExpenseStorageError.deletionNeedsServerCheck
        }
        var next = try contents()
        next.expenses.removeAll { $0.id == id }
        try commit(next)
        editing.remove(id)
        return ExpenseQueueDeletion(
            id: id, operationID: item.operationID,
            mayExistOnServer: item.needsServerCheckBeforeDeletion)
    }

    private func find(_ id: UUID, in context: ExpenseContext) throws -> QueuedExpense {
        guard
            let item = try contents().expenses.first(where: { $0.id == id && $0.context == context }
            )
        else {
            throw ExpenseStorageError.notFound
        }
        return item
    }

    /// Both closures MUST capture the client for this exact credential generation, not a mutable
    /// current-client reference. verifyUser uses /api/me. Guests and public clients cannot activate.
    public func activate(
        session: ExpenseQueueSession, verifyUser: @escaping VerifyUser, send: @escaping Send
    ) {
        if active?.session == session { return }
        active = Active(session: session, verifyUser: verifyUser, send: send)
    }

    public func deactivate() { active = nil }

    private func isCurrent(_ scope: Active) -> Bool { active?.token == scope.token }

    private func statusCode(_ error: any Error) -> Int? {
        if let response = error as? APIResponseError { return response.status }
        if let api = error as? APIError {
            switch api {
            case .unauthorized: return 401
            case .http(let status, _): return status
            default: break
            }
        }
        return nil
    }

    /// Repeated foreground/retry triggers do not start a second drain. Failures remain visible
    /// in the queue. The caller must also check report.session before applying returned payloads.
    public func synchronize() async throws -> ExpenseSyncReport {
        guard !running, let scope = active else {
            return ExpenseSyncReport(session: active?.session, successes: [], stop: .idle)
        }
        guard !failedSessions.contains(scope.session) else {
            return ExpenseSyncReport(
                session: scope.session, successes: [], stop: .authenticationLost)
        }
        running = true
        defer {
            running = false
            inFlight = nil
        }
        var successes: [ExpenseQueueSuccess] = []
        func report(_ stop: ExpenseSyncReport.Stop) -> ExpenseSyncReport {
            ExpenseSyncReport(session: scope.session, successes: successes, stop: stop)
        }
        let ids = try contents().expenses.filter {
            $0.context.origin == scope.session.origin && $0.context.userID == scope.session.userID
                && ($0.status == .pending || $0.status == .attempted)
        }.map(\.id)
        guard !ids.isEmpty else { return report(.idle) }
        do {
            let userID = try await scope.verifyUser()
            guard isCurrent(scope) else { return report(.sessionChanged) }
            guard !Task.isCancelled else { return report(.cancelled) }
            guard userID == scope.session.userID else {
                failedSessions.insert(scope.session)
                return report(.authenticationLost)
            }
        } catch {
            guard isCurrent(scope) else { return report(.sessionChanged) }
            if Task.isCancelled { return report(.cancelled) }
            if statusCode(error) == 401 {
                failedSessions.insert(scope.session)
                return report(.authenticationLost)
            }
            return report(.unknownResult)
        }
        var blockedTrips = Set(
            try contents().expenses.filter {
                $0.context.origin == scope.session.origin
                    && $0.context.userID == scope.session.userID
                    && $0.status == .conflict
            }.map { $0.context.tripID })
        for id in ids {
            guard isCurrent(scope) else { return report(.sessionChanged) }
            guard !Task.isCancelled else { return report(.cancelled) }
            var next = try contents()
            guard let index = next.expenses.firstIndex(where: { $0.id == id }),
                !editing.contains(id)
            else { continue }
            let current = next.expenses[index]
            guard !blockedTrips.contains(current.context.tripID),
                current.status == .pending || current.status == .attempted
            else { continue }
            // Synchronous durable commit MUST complete before the first transport call.
            next.expenses[index].status = .attempted
            next.expenses[index].rejectionStatus = nil
            try commit(next)
            let attempt = next.expenses[index]
            inFlight = id
            let payload: TripPayload
            do {
                payload = try await scope.send(attempt.context, attempt.body, attempt.operationID)
            } catch {
                inFlight = nil
                guard isCurrent(scope) else { return report(.sessionChanged) }
                guard !Task.isCancelled else { return report(.cancelled) }
                let code = statusCode(error)
                if code == 401 {
                    failedSessions.insert(scope.session)
                    return report(.authenticationLost)
                }
                if let code, [400, 403, 404, 409].contains(code) {
                    var rejected = try contents()
                    if let index = rejected.expenses.firstIndex(where: {
                        $0.id == id && $0.operationID == attempt.operationID
                    }) {
                        rejected.expenses[index].status = code == 400 ? .invalid : .conflict
                        rejected.expenses[index].rejectionStatus = code
                        try commit(rejected)
                    }
                    if code != 400 { blockedTrips.insert(attempt.context.tripID) }
                    continue
                }
                // Cancellation, decoding failures, 429, and 5xx are not confirmed rejection.
                return report(.unknownResult)
            }
            inFlight = nil
            guard isCurrent(scope) else { return report(.sessionChanged) }
            guard !Task.isCancelled else { return report(.cancelled) }
            var completed = try contents()
            completed.expenses.removeAll { $0.id == id && $0.operationID == attempt.operationID }
            try commit(completed)
            successes.append(
                ExpenseQueueSuccess(
                    context: attempt.context, operationID: attempt.operationID, payload: payload))
        }
        return report(.idle)
    }
}
