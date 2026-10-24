import Foundation

public enum SplitMode: String, Codable, CaseIterable, Sendable { case equal, amount, ratio, shares }

public struct ParticipantShare: Codable, Sendable, Equatable {
    public let participantId: String
    public let shareMinor: Int64
    public init(participantId: String, shareMinor: Int64) {
        self.participantId = participantId
        self.shareMinor = shareMinor
    }
}

public struct ExpenseExchangeRate: Codable, Sendable, Equatable {
    public let baseCurrency: Currency
    public let rateToBase: Double
    public let source: String
    public let provider: String?
    public let rateType: String?
    public let fetchedAt: String?
    public init(
        baseCurrency: Currency, rateToBase: Double, source: String,
        provider: String? = nil, rateType: String? = nil, fetchedAt: String? = nil
    ) {
        self.baseCurrency = baseCurrency
        self.rateToBase = rateToBase
        self.source = source
        self.provider = provider
        self.rateType = rateType
        self.fetchedAt = fetchedAt
    }
}

public struct VisaExpenseRate: Codable, Sendable, Equatable {
    public let sourceCurrency: Currency
    public let targetCurrency: Currency
    public let date: String
    public let rate: Double
    public let fetchedAt: String
    public init(
        sourceCurrency: Currency, targetCurrency: Currency, date: String, rate: Double,
        fetchedAt: String
    ) {
        self.sourceCurrency = sourceCurrency
        self.targetCurrency = targetCurrency
        self.date = date
        self.rate = rate
        self.fetchedAt = fetchedAt
    }
}

public struct Expense: Codable, Identifiable, Sendable {
    public let id: String
    public let description: String
    public let amountMinor: Int64
    public let currency: Currency
    public let paidById: String
    public let participantIds: [String]
    public let expenseDate: String
    public let version: Int?
    public let exchangeRate: ExpenseExchangeRate?
    public let visaExchangeRate: VisaExpenseRate?
    public let participantShares: [ParticipantShare]?
    public let category: String?
    public let tags: [String]?
    public let receiptId: String?
    public let receiptUrl: String?
    public let createdAt: String?
    public init(
        id: String, description: String, amountMinor: Int64, currency: Currency,
        paidById: String, participantIds: [String], expenseDate: String, version: Int? = nil,
        exchangeRate: ExpenseExchangeRate? = nil, visaExchangeRate: VisaExpenseRate? = nil,
        participantShares: [ParticipantShare]? = nil, category: String? = nil,
        tags: [String]? = nil, receiptId: String? = nil, receiptUrl: String? = nil,
        createdAt: String? = nil
    ) {
        self.id = id
        self.description = description
        self.amountMinor = amountMinor
        self.currency = currency
        self.paidById = paidById
        self.participantIds = participantIds
        self.expenseDate = expenseDate
        self.version = version
        self.exchangeRate = exchangeRate
        self.visaExchangeRate = visaExchangeRate
        self.participantShares = participantShares
        self.category = category
        self.tags = tags
        self.receiptId = receiptId
        self.receiptUrl = receiptUrl
        self.createdAt = createdAt
    }
}

public struct NewExpense: Codable, Sendable, Equatable {
    public let description: String
    public let amount: String
    public let currency: Currency
    public let paidById: String
    public let participantIds: [String]
    public let expenseDate: String
    public let splitMode: SplitMode
    public let splitValues: [String: String]
    public let category: String?
    public let tags: [String]

    public init(
        description: String, amount: String, currency: Currency,
        paidById: String, participantIds: [String], expenseDate: String,
        splitMode: SplitMode = .equal, splitValues: [String: String] = [:],
        category: String? = nil, tags: [String] = []
    ) {
        self.description = description
        self.amount = amount
        self.currency = currency
        self.paidById = paidById
        self.participantIds = participantIds
        self.expenseDate = expenseDate
        self.splitMode = splitMode
        self.splitValues = splitValues
        self.category = category
        self.tags = tags
    }

    private enum CodingKeys: String, CodingKey {
        case description, amount, currency, paidById, participantIds, expenseDate, splitMode,
            splitValues, category, tags
    }
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.init(
            description: try container.decode(String.self, forKey: .description),
            amount: try container.decode(String.self, forKey: .amount),
            currency: try container.decode(Currency.self, forKey: .currency),
            paidById: try container.decode(String.self, forKey: .paidById),
            participantIds: try container.decode([String].self, forKey: .participantIds),
            expenseDate: try container.decode(String.self, forKey: .expenseDate),
            splitMode: try container.decodeIfPresent(SplitMode.self, forKey: .splitMode) ?? .equal,
            splitValues: try container.decodeIfPresent([String: String].self, forKey: .splitValues)
                ?? [:],
            category: try container.decodeIfPresent(String.self, forKey: .category),
            tags: try container.decodeIfPresent([String].self, forKey: .tags) ?? [])
    }
}

// The PATCH contract uses the same value types as NewExpense. Nil fields are omitted.
public struct ExpenseUpdate: Codable, Sendable, Equatable {
    public var description: String?
    public var amount: String?
    public var currency: Currency?
    public var paidById: String?
    public var participantIds: [String]?
    public var expenseDate: String?
    public var splitMode: SplitMode?
    public var splitValues: [String: String]?
    public var category: String?
    public var tags: [String]?
    public init(
        description: String? = nil, amount: String? = nil, currency: Currency? = nil,
        paidById: String? = nil, participantIds: [String]? = nil, expenseDate: String? = nil,
        splitMode: SplitMode? = nil, splitValues: [String: String]? = nil,
        category: String? = nil, tags: [String]? = nil
    ) {
        self.description = description
        self.amount = amount
        self.currency = currency
        self.paidById = paidById
        self.participantIds = participantIds
        self.expenseDate = expenseDate
        self.splitMode = splitMode
        self.splitValues = splitValues
        self.category = category
        self.tags = tags
    }
}

public struct ExpenseReceipt: Codable, Sendable {
    public let id: String
    public let mimeType: String
    public init(id: String, mimeType: String) {
        self.id = id
        self.mimeType = mimeType
    }
}

public struct ExpenseSnapshot: Codable, Sendable {
    public let schemaVersion: Int
    public let expense: Expense
    public let participants: [Participant]
    public let receipt: ExpenseReceipt?
    public init(
        schemaVersion: Int = 1, expense: Expense, participants: [Participant],
        receipt: ExpenseReceipt? = nil
    ) {
        self.schemaVersion = schemaVersion
        self.expense = expense
        self.participants = participants
        self.receipt = receipt
    }
    private enum CodingKeys: String, CodingKey {
        case schemaVersion, expense, participants, receipt
    }
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(schemaVersion, forKey: .schemaVersion)
        try container.encode(expense, forKey: .expense)
        try container.encode(participants, forKey: .participants)
        try container.encode(receipt, forKey: .receipt)
    }
}

public enum RevisionSource: String, Codable, CaseIterable, Sendable {
    case expense, receipt, migration
    case csvImport = "csv_import"
    case backupRestore = "backup_restore"
    case participantMerge = "participant_merge"
    case developmentSeed = "development_seed"
    case versionRestore = "version_restore"
    case visaSettlement = "visa_settlement"
}

public enum ExpenseChangeField: String, Codable, CaseIterable, Sendable {
    case description, amountMinor, currency, exchangeRate, visaExchangeRate, expenseDate
    case paidById, category, tags, participantIds, participantShares, receipt
}

public enum ExpenseRevisionAction: String, Codable, Sendable {
    case baseline, created, updated, deleted, restored
}

public struct ExpenseRevisionActor: Codable, Sendable {
    public let id: String
    public let name: String
    public init(id: String, name: String) {
        self.id = id
        self.name = name
    }
}

public struct ExpenseRevision: Codable, Identifiable, Sendable {
    public let id: String
    public let expenseId: String
    public let version: Int
    public let action: ExpenseRevisionAction
    public let source: RevisionSource
    public let actor: ExpenseRevisionActor?
    public let recordedAt: String
    public let snapshot: ExpenseSnapshot
    public let previousSnapshot: ExpenseSnapshot?
    public let changedFields: [ExpenseChangeField]
    public init(
        id: String, expenseId: String, version: Int, action: ExpenseRevisionAction,
        source: RevisionSource, actor: ExpenseRevisionActor? = nil, recordedAt: String,
        snapshot: ExpenseSnapshot, previousSnapshot: ExpenseSnapshot? = nil,
        changedFields: [ExpenseChangeField] = []
    ) {
        self.id = id
        self.expenseId = expenseId
        self.version = version
        self.action = action
        self.source = source
        self.actor = actor
        self.recordedAt = recordedAt
        self.snapshot = snapshot
        self.previousSnapshot = previousSnapshot
        self.changedFields = changedFields
    }
    private enum CodingKeys: String, CodingKey {
        case id, expenseId, version, action, source, actor, recordedAt, snapshot, previousSnapshot,
            changedFields
    }
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(expenseId, forKey: .expenseId)
        try container.encode(version, forKey: .version)
        try container.encode(action, forKey: .action)
        try container.encode(source, forKey: .source)
        try container.encode(actor, forKey: .actor)
        try container.encode(recordedAt, forKey: .recordedAt)
        try container.encode(snapshot, forKey: .snapshot)
        try container.encode(previousSnapshot, forKey: .previousSnapshot)
        try container.encode(changedFields, forKey: .changedFields)
    }
}

public struct ExpenseLatestRevision: Codable, Sendable {
    public let version: Int
    public let action: ExpenseRevisionAction
    public init(version: Int, action: ExpenseRevisionAction) {
        self.version = version
        self.action = action
    }
}

public struct ExpenseHistoryPage: Codable, Sendable {
    public let revisions: [ExpenseRevision]
    public let nextCursor: String?
    public let latestRevision: ExpenseLatestRevision?
    public init(
        revisions: [ExpenseRevision], nextCursor: String? = nil,
        latestRevision: ExpenseLatestRevision? = nil
    ) {
        self.revisions = revisions
        self.nextCursor = nextCursor
        self.latestRevision = latestRevision
    }
    private enum CodingKeys: String, CodingKey { case revisions, nextCursor, latestRevision }
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(revisions, forKey: .revisions)
        try container.encode(nextCursor, forKey: .nextCursor)
        try container.encodeIfPresent(latestRevision, forKey: .latestRevision)
    }
}
