import Foundation

public enum TripOperation: CaseIterable, Sendable {
    case read, editDailyData, readHistory, manageAccess, manageAPIWrites
    case changePreferences, archive, deleteTrip, copyTrip, downloadBackup, restoreBackup,
        queueExpense
}

public struct TripPermissions: Sendable {
    public let payload: TripPayload
    public let auth: ClientAuthentication
    public let userID: String?

    public init(payload: TripPayload, auth: ClientAuthentication, userID: String?) {
        self.payload = payload
        self.auth = auth
        self.userID = userID
    }

    public func allows(_ operation: TripOperation) -> Bool {
        let isPublic = payload.readonly == true || payload.shareMode == .readonly
        if isPublic { return operation == .read }
        let role =
            payload.currentUserRole
            ?? (userID != nil && payload.trip.ownerId == userID ? .owner : nil)
        let active = payload.trip.archivedAt == nil
        switch auth {
        case .anonymous: return false
        case .share(let tripID, _):
            guard tripID == payload.trip.id, payload.shareMode == .anyoneEdit else { return false }
            return operation == .read || operation == .readHistory
                || (operation == .editDailyData && active)
        case .bearer, .session:
            guard role != nil else { return false }
            let canMutate = auth.isSession || payload.trip.allowApiWrites == true
            switch operation {
            case .read, .readHistory: return true
            case .editDailyData: return active && canMutate
            case .queueExpense: return active && canMutate && userID != nil
            case .manageAccess, .manageAPIWrites: return role == .owner && auth.isSession
            case .changePreferences: return role == .owner && active && canMutate
            case .archive, .deleteTrip, .copyTrip: return role == .owner && canMutate
            case .downloadBackup: return role == .owner
            case .restoreBackup: return true
            }
        }
    }
}
