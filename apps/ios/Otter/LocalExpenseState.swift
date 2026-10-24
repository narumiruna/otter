import Foundation
import Network
import Observation
import OtterKit

/// One queue actor owns the file across all windows and groups.
@MainActor
@Observable
final class LocalExpenseState {
    let queue: ExpenseQueue
    let defaults: ExpenseDefaultsStore
    private(set) var items: [QueuedExpense] = []
    private(set) var isSyncing = false
    private(set) var isOnline = true
    private(set) var lastSuccess: ExpenseQueueSuccess?
    private(set) var successID = UUID()
    var issue: String?
    private var activeSession: ExpenseQueueSession?
    private let monitor = NWPathMonitor()

    convenience init() {
        let directory = URL.applicationSupportDirectory.appending(
            path: "Otter", directoryHint: .isDirectory)
        self.init(
            queue: ExpenseQueue(
                storage: .file(at: directory.appending(path: "expense-queue.json"))),
            defaults: ExpenseDefaultsStore(
                storage: .file(at: directory.appending(path: "expense-defaults.json"))))
    }

    init(queue: ExpenseQueue, defaults: ExpenseDefaultsStore) {
        self.queue = queue
        self.defaults = defaults
        monitor.pathUpdateHandler = { [weak self] path in
            Task { @MainActor in self?.isOnline = path.status == .satisfied }
        }
        monitor.start(queue: DispatchQueue(label: "otter.network"))
    }

    func context(tripID: String, session: AppSession) throws -> ExpenseContext {
        guard let client = session.client, let user = session.user,
            client.auth.isSession || client.auth.isBearer
        else { throw APIError.sessionRequired }
        return try ExpenseContext(origin: client.baseURL, userID: user.id, tripID: tripID)
    }

    func visibleItems(session: AppSession, tripID: String? = nil) -> [QueuedExpense] {
        items.filter { item in
            (tripID == nil || item.context.tripID == tripID)
                && (try? context(tripID: item.context.tripID, session: session)) == item.context
        }
    }

    func checkedContext(_ item: QueuedExpense, session: AppSession) throws -> ExpenseContext {
        guard (try? context(tripID: item.context.tripID, session: session)) == item.context else {
            throw CancellationError()
        }
        return item.context
    }

    private func isCurrent(_ session: AppSession, generation: UUID, client: OtterClient) -> Bool {
        generation == session.sessionID && session.client === client
    }

    private func clearCachedState() {
        items = []
        lastSuccess = nil
        successID = UUID()
        issue = nil
    }

    func activate(session: AppSession) async {
        let generation = session.sessionID
        guard let client = session.client, let user = session.user,
            client.auth.isSession || client.auth.isBearer
        else {
            activeSession = nil
            clearCachedState()
            await queue.deactivate()
            return
        }
        do {
            let identity = try ExpenseQueueSession(
                origin: client.baseURL, userID: user.id,
                credentialGeneration: generation,
                authentication: client.auth.isSession ? .session : .bearer)
            guard activeSession != identity else { return }
            // Clear private cached data before the first suspension. Durable drafts stay intact.
            clearCachedState()
            activeSession = identity
            await queue.deactivate()
            guard isCurrent(session, generation: generation, client: client),
                activeSession == identity
            else { return }
            await queue.activate(
                session: identity, verifyUser: { try await client.user().id },
                send: { context, body, operation in
                    try await client.addQueuedExpense(
                        tripID: context.tripID, body: body, operationID: operation,
                        userID: context.userID)
                })
            guard isCurrent(session, generation: generation, client: client),
                activeSession == identity
            else { return }
            try await reload(session: session)
        } catch {
            guard isCurrent(session, generation: generation, client: client),
                !(error is CancellationError)
            else { return }
            issue = error.localizedDescription
        }
    }

    func reload(session: AppSession) async throws {
        guard let client = session.client, let user = session.user,
            client.auth.isSession || client.auth.isBearer
        else {
            clearCachedState()
            return
        }
        let generation = session.sessionID
        do {
            let value = try await queue.list(origin: client.baseURL, userID: user.id)
            guard isCurrent(session, generation: generation, client: client),
                session.user?.id == user.id
            else { throw CancellationError() }
            items = value
        } catch {
            guard isCurrent(session, generation: generation, client: client),
                session.user?.id == user.id
            else { throw CancellationError() }
            throw error
        }
    }

    func beginEditing(_ item: QueuedExpense, session: AppSession) async throws {
        let context = try checkedContext(item, session: session)
        let generation = session.sessionID
        try await queue.beginEditing(id: item.id, in: context)
        guard generation == session.sessionID,
            (try? checkedContext(item, session: session)) == context
        else {
            await queue.endEditing(id: item.id)
            throw CancellationError()
        }
    }

    func revise(_ item: QueuedExpense, draft: NewExpense, session: AppSession) async throws {
        let context = try checkedContext(item, session: session)
        let generation = session.sessionID
        try await queue.revise(id: item.id, in: context, draft: draft)
        guard generation == session.sessionID else { throw CancellationError() }
        _ = try checkedContext(item, session: session)
        try await reload(session: session)
    }

    func delete(_ item: QueuedExpense, session: AppSession) async throws {
        let context = try checkedContext(item, session: session)
        let generation = session.sessionID
        _ = try await queue.delete(
            id: item.id, in: context,
            acknowledgingUnknownResult: item.needsServerCheckBeforeDeletion)
        guard generation == session.sessionID else { throw CancellationError() }
        _ = try checkedContext(item, session: session)
        try await reload(session: session)
    }

    func retry(_ item: QueuedExpense, session: AppSession) async throws {
        let context = try checkedContext(item, session: session)
        let generation = session.sessionID
        try await queue.retry(id: item.id, in: context)
        guard generation == session.sessionID else { throw CancellationError() }
        _ = try checkedContext(item, session: session)
        try await reload(session: session)
    }

    func enqueue(_ draft: NewExpense, payload: TripPayload, session: AppSession) async throws {
        guard let client = session.client,
            TripPermissions(payload: payload, auth: client.auth, userID: session.user?.id).allows(
                .queueExpense)
        else { throw APIError.sessionRequired }
        let context = try context(tripID: payload.trip.id, session: session)
        let generation = session.sessionID
        _ = try await queue.enqueue(draft, in: context)
        guard isCurrent(session, generation: generation, client: client),
            (try? self.context(tripID: context.tripID, session: session)) == context
        else { throw CancellationError() }
        try await reload(session: session)
    }

    func synchronize(session: AppSession) async {
        guard isOnline, !isSyncing, let identity = activeSession,
            let client = session.client, client.auth.isSession || client.auth.isBearer,
            identity.credentialGeneration == session.sessionID,
            (try? ExpenseContext.canonicalOrigin(client.baseURL)) == identity.origin,
            session.user?.id == identity.userID
        else { return }
        let generation = session.sessionID
        isSyncing = true
        defer { isSyncing = false }
        do {
            let report = try await queue.synchronize()
            guard isCurrent(session, generation: generation, client: client),
                report.session == activeSession
            else { return }
            for success in report.successes {
                lastSuccess = success
                successID = UUID()
            }
            switch report.stop {
            case .authenticationLost: session.handle(APIError.unauthorized, for: generation)
            case .unknownResult:
                issue = NativeLocalization.string("提交結果尚未確認。請先核對群組，再以相同操作重試；不要建立重複支出。")
            case .idle, .cancelled, .sessionChanged: break
            }
            try await reload(session: session)
        } catch {
            guard isCurrent(session, generation: generation, client: client),
                !(error is CancellationError)
            else { return }
            issue = error.localizedDescription
        }
    }
}
