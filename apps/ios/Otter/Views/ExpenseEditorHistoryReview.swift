import OtterKit

/// A review uses fresh group data and the filtered history's latest revision only.
struct ExpenseRestoreReview {
    let current: Expense?
    let version: Int
    let missingParticipantIDs: Set<String>

    init(payload: TripPayload, revision: ExpenseRevision, latestRevision: ExpenseLatestRevision?)
        throws
    {
        current = payload.trip.expenses.first { $0.id == revision.expenseId }
        if let current {
            guard let observed = current.version, observed > 0 else {
                throw APIError.missingVersion
            }
            version = observed
        } else {
            guard let latestRevision, latestRevision.action == .deleted, latestRevision.version > 0
            else {
                throw APIError.missingVersion
            }
            version = latestRevision.version
        }
        let target = revision.snapshot.expense
        missingParticipantIDs = Set(target.participantIds + [target.paidById])
            .subtracting(payload.trip.participants.map(\.id))
    }
}
