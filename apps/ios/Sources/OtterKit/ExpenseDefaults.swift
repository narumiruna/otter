import Foundation

/// Only these fields can be saved. Description, amount, payer, dates, tags, and receipts are excluded.
public struct ExpenseDefaults: Codable, Sendable {
    public let currency: Currency
    public let splitMode: SplitMode
    public let participantIDs: [String]
    public let splitValues: [String: String]

    public init(
        currency: Currency, splitMode: SplitMode = .equal,
        participantIDs: [String], splitValues: [String: String] = [:]
    ) {
        self.currency = currency
        self.splitMode = splitMode
        self.participantIDs = participantIDs
        // Unselected participants do not become saved defaults.
        self.splitValues = splitValues.filter { participantIDs.contains($0.key) }
    }
}

public struct ExpenseDefaultsResolution: Sendable {
    public struct Split: Sendable {
        public let mode: SplitMode
        public let participantIDs: [String]
        public let values: [String: String]
    }

    public let currency: Currency
    /// Nil means the saved split is invalid. Use the current trip's normal equal-split defaults.
    public let split: Split?
    public let invalidSplit: Bool
}

/// Explicit local defaults only. This actor never modifies a NewExpense or an expense queue.
/// Apply resolved values only when creating a new, empty expense, not when editing or copying.
public actor ExpenseDefaultsStore {
    private struct Entry: Codable {
        let context: ExpenseContext
        let defaults: ExpenseDefaults
    }

    private struct File: Codable {
        var version = 1
        var entries: [Entry] = []
    }

    private let storage: ExpenseLocalStorage
    private var file: File?

    public init(storage: ExpenseLocalStorage) { self.storage = storage }

    private func contents() throws -> File {
        if let file { return file }
        let decoded =
            try storage.load().map { try decodeExpenseFile(File.self, from: $0) } ?? File()
        guard Set(decoded.entries.map(\.context)).count == decoded.entries.count else {
            throw ExpenseStorageError.corruptData
        }
        file = decoded
        return decoded
    }

    private func commit(_ next: File) throws {
        try storage.save(encodeExpenseFile(next))
        file = next
    }

    /// Save only on an explicit user action. Invalid splits remain visible as a warning on load.
    public func save(_ defaults: ExpenseDefaults, in context: ExpenseContext) throws {
        var next = try contents()
        next.entries.removeAll { $0.context == context }
        next.entries.append(Entry(context: context, defaults: defaults))
        try commit(next)
    }

    public func clear(in context: ExpenseContext) throws {
        var next = try contents()
        next.entries.removeAll { $0.context == context }
        try commit(next)
    }

    /// Reconcile in memory only. Reading never saves, deletes, or rescales an amount.
    /// Invalid participant IDs or input values clear the entire split, but keep the currency.
    public func load(
        in context: ExpenseContext, currentParticipantIDs: Set<String>
    ) throws -> ExpenseDefaultsResolution? {
        guard let saved = try contents().entries.first(where: { $0.context == context })?.defaults
        else {
            return nil
        }
        let valid = Self.validSplit(saved, currentParticipantIDs: currentParticipantIDs)
        let split =
            valid
            ? ExpenseDefaultsResolution.Split(
                mode: saved.splitMode, participantIDs: saved.participantIDs,
                values: saved.splitValues)
            : nil
        return ExpenseDefaultsResolution(
            currency: saved.currency, split: split, invalidSplit: !valid)
    }

    private static func validSplit(_ saved: ExpenseDefaults, currentParticipantIDs: Set<String>)
        -> Bool
    {
        let ids = Set(saved.participantIDs)
        guard !ids.isEmpty, ids.count == saved.participantIDs.count,
            ids.isSubset(of: currentParticipantIDs), Set(saved.splitValues.keys).isSubset(of: ids)
        else { return false }
        if saved.splitMode == .equal { return true }
        if saved.splitMode == .amount {
            var total: Int64 = 0
            for id in saved.participantIDs {
                guard let input = saved.splitValues[id],
                    let value = amountIncludingZero(input, currency: saved.currency)
                else { return false }
                let (sum, overflow) = total.addingReportingOverflow(value)
                guard !overflow, sum <= 9_007_199_254_740_991 else { return false }
                total = sum
            }
            return true
        }
        var total: Double = 0
        for id in saved.participantIDs {
            guard
                let input = saved.splitValues[id].map(WebText.trim),
                input.range(of: #"^[0-9]+(\.[0-9]+)?\z"#, options: .regularExpression) != nil,
                let value = Double(input), value.isFinite, value > 0
            else { return false }
            total += value
        }
        return total.isFinite
    }

    // The API accepts zero for an individual amount share, but not for the expense amount.
    private static func amountIncludingZero(_ input: String, currency: Currency) -> Int64? {
        let value = WebText.trim(input)
        let parts = value.split(separator: ".", omittingEmptySubsequences: false)
        guard (1...2).contains(parts.count),
            parts.allSatisfy({ !$0.isEmpty && $0.utf8.allSatisfy { (48...57).contains($0) } }),
            parts.count == 1 || parts[1].count <= currency.minorUnits
        else { return nil }
        if parts.allSatisfy({ $0.allSatisfy { $0 == "0" } }) { return 0 }
        return try? currency.parseAmount(value)
    }
}
