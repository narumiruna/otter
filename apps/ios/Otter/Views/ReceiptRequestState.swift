import Foundation
import Observation

/// Keep request identity and loading state in the same lifecycle.
@MainActor
@Observable
final class ReceiptRequestState {
    private(set) var id = UUID()
    private(set) var loading = false

    func begin() -> UUID {
        id = UUID()
        loading = true
        return id
    }

    func invalidate() {
        id = UUID()
        loading = false
    }

    func finish(_ requestID: UUID) {
        if id == requestID { loading = false }
    }
}
