import Foundation
import Observation
import OtterKit

/// One gate for mutations from the three management screens.
@MainActor
@Observable
final class GroupManagementGate {
    static let shared = GroupManagementGate()
    private var keys: Set<String> = []

    func contains(sessionID: UUID, tripID: String) -> Bool {
        keys.contains(key(sessionID, tripID))
    }
    func acquire(sessionID: UUID, tripID: String) -> Bool {
        keys.insert(key(sessionID, tripID)).inserted
    }
    func release(sessionID: UUID, tripID: String) {
        keys.remove(key(sessionID, tripID))
    }
    private func key(_ sessionID: UUID, _ tripID: String) -> String {
        "\(sessionID.uuidString):\(tripID)"
    }
}

@MainActor
@Observable
final class GroupManagementState {
    var issue: String?
    var busy = false
    private var generation = UUID()

    func invalidate() {
        generation = UUID()
        busy = false
    }

    func request(sessionID: UUID) -> GroupManagementRequest {
        GroupManagementRequest(sessionID: sessionID, generation: generation)
    }

    func run<Value: Sendable>(
        request: GroupManagementRequest,
        session: AppSession, payload: TripPayload, operation: TripOperation,
        work: @MainActor (OtterClient) async throws -> Value,
        publish: @MainActor (Value) -> Void = { _ in },
        accept: @MainActor (Value) -> Void = { _ in }
    ) async {
        guard request.sessionID == session.sessionID, request.generation == generation,
            !busy, let client = session.client,
            TripPermissions(payload: payload, auth: client.auth, userID: session.user?.id)
                .allows(operation)
        else { return }
        let sessionID = request.sessionID
        let requestGeneration = request.generation
        let tripID = payload.trip.id
        guard GroupManagementGate.shared.acquire(sessionID: sessionID, tripID: tripID) else {
            issue = NativeLocalization.string("另一項群組操作仍在處理中，請稍後再試。")
            return
        }
        busy = true
        issue = nil
        defer {
            GroupManagementGate.shared.release(sessionID: sessionID, tripID: tripID)
            if generation == requestGeneration { busy = false }
        }
        do {
            let value = try await work(client)
            guard session.sessionID == sessionID else { return }
            // A completed write must update the workspace even after its page disappears.
            publish(value)
            try Task.checkCancellation()
            guard generation == requestGeneration else { return }
            accept(value)
        } catch {
            guard session.sessionID == sessionID, generation == requestGeneration else { return }
            if error is CancellationError || (error as? URLError)?.code == .cancelled { return }
            issue = error.localizedDescription
            session.handle(error, for: sessionID)
        }
    }
}

struct GroupManagementRequest: Sendable {
    fileprivate let sessionID: UUID
    fileprivate let generation: UUID
}
