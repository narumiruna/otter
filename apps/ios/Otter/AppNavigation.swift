import Foundation
import Observation
import OtterKit

@MainActor
@Observable
final class AppNavigation {
    struct WorkspaceRoute {
        let id = UUID()
        let origin: URL
        let tripID: String
        let view: String
        let expenseID: String?
        var mode: IncomingLink.WorkspaceMode? = nil
        var accountSettings = false
        let sessionID: UUID
        let userID: String?
    }
    var route: WorkspaceRoute?
}
