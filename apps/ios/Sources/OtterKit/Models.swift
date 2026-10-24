import Foundation

public typealias ExchangeRates = [String: Double]

public enum TripRole: String, Codable, Sendable { case owner, editor }
public enum ShareMode: String, Codable, CaseIterable, Sendable {
    case readonly
    case signedInEdit = "signed-in-edit"
    case anyoneEdit = "anyone-edit"
}

public struct User: Codable, Sendable {
    public let id: String
    public let name: String
    public let username: String
    public init(id: String, name: String, username: String) {
        self.id = id
        self.name = name
        self.username = username
    }
}

public struct UserResponse: Codable, Sendable {
    public let user: User?
    public init(user: User?) { self.user = user }
    private enum CodingKeys: String, CodingKey { case user }
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(user, forKey: .user)
    }
}

public struct TripsResponse: Codable, Sendable {
    public let trips: [TripSummary]
    public let archivedTrips: [TripSummary]
    public init(trips: [TripSummary], archivedTrips: [TripSummary] = []) {
        self.trips = trips
        self.archivedTrips = archivedTrips
    }
}

public struct TripSummary: Codable, Identifiable, Sendable {
    public let id: String
    public let name: String
    public let baseCurrency: Currency
    public let archivedAt: String?
    public let participantCount: Int
    public let expenseCount: Int
    public init(
        id: String, name: String, baseCurrency: Currency, archivedAt: String? = nil,
        participantCount: Int, expenseCount: Int
    ) {
        self.id = id
        self.name = name
        self.baseCurrency = baseCurrency
        self.archivedAt = archivedAt
        self.participantCount = participantCount
        self.expenseCount = expenseCount
    }
}

public struct TripCollaborator: Codable, Identifiable, Sendable {
    public let userId: String
    public let name: String
    public let username: String
    public let role: TripRole
    public let createdAt: String
    public var id: String { userId }
    public init(userId: String, name: String, username: String, role: TripRole, createdAt: String) {
        self.userId = userId
        self.name = name
        self.username = username
        self.role = role
        self.createdAt = createdAt
    }
}

public struct TripShareLink: Codable, Identifiable, Sendable {
    public let id: String
    public let mode: ShareMode
    public let createdAt: String
    public let revokedAt: String?
    public let expiresAt: String?
    public let url: String?
    public init(
        id: String, mode: ShareMode, createdAt: String, revokedAt: String? = nil,
        expiresAt: String? = nil, url: String? = nil
    ) {
        self.id = id
        self.mode = mode
        self.createdAt = createdAt
        self.revokedAt = revokedAt
        self.expiresAt = expiresAt
        self.url = url
    }
    private enum CodingKeys: String, CodingKey {
        case id, mode, createdAt, revokedAt, expiresAt, url
    }
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(mode, forKey: .mode)
        try container.encode(createdAt, forKey: .createdAt)
        try container.encode(revokedAt, forKey: .revokedAt)
        try container.encode(expiresAt, forKey: .expiresAt)
        try container.encodeIfPresent(url, forKey: .url)
    }
}

// Optional fields correspond to the source-discriminated contract variants.
public struct ExchangeRateDefaults: Codable, Sendable {
    public let source: String
    public let rates: ExchangeRates
    public let fetchedAt: String?
    public let provider: String?
    public let rateType: String?
    public init(
        source: String, rates: ExchangeRates, fetchedAt: String? = nil,
        provider: String? = nil, rateType: String? = nil
    ) {
        self.source = source
        self.rates = rates
        self.fetchedAt = fetchedAt
        self.provider = provider
        self.rateType = rateType
    }
}

public struct ExchangeRateInfo: Codable, Sendable {
    public let source: String
    public let fetchedAt: String?
    public let provider: String?
    public let rateType: String?
    public let customRates: ExchangeRates?
    public let defaults: ExchangeRateDefaults?
    public init(
        source: String, fetchedAt: String? = nil, provider: String? = nil,
        rateType: String? = nil, customRates: ExchangeRates? = nil,
        defaults: ExchangeRateDefaults? = nil
    ) {
        self.source = source
        self.fetchedAt = fetchedAt
        self.provider = provider
        self.rateType = rateType
        self.customRates = customRates
        self.defaults = defaults
    }
}

public struct ExchangeRateSnapshot: Codable, Sendable {
    public let baseCurrency: Currency
    public let fetchedAt: String
    public let rates: ExchangeRates
    public let rateType: String
    public let source: String
    public init(
        baseCurrency: Currency, fetchedAt: String, rates: ExchangeRates,
        rateType: String = "spotMid", source: String = "BANK_OF_TAIWAN"
    ) {
        self.baseCurrency = baseCurrency
        self.fetchedAt = fetchedAt
        self.rates = rates
        self.rateType = rateType
        self.source = source
    }
}

public struct TripPayload: Codable, Sendable {
    public let trip: Trip
    public let balances: [Balance]
    public let settlements: [Settlement]
    public let exchangeRateInfo: ExchangeRateInfo?
    public let currentUserRole: TripRole?
    public let collaborators: [TripCollaborator]?
    public let shareLinks: [TripShareLink]?
    public let readonly: Bool?
    public let shareMode: ShareMode?
    public let createdExpenseId: String?
    public init(
        trip: Trip, balances: [Balance] = [], settlements: [Settlement] = [],
        exchangeRateInfo: ExchangeRateInfo? = nil, currentUserRole: TripRole? = nil,
        collaborators: [TripCollaborator]? = nil, shareLinks: [TripShareLink]? = nil,
        readonly: Bool? = nil, shareMode: ShareMode? = nil, createdExpenseId: String? = nil
    ) {
        self.trip = trip
        self.balances = balances
        self.settlements = settlements
        self.exchangeRateInfo = exchangeRateInfo
        self.currentUserRole = currentUserRole
        self.collaborators = collaborators
        self.shareLinks = shareLinks
        self.readonly = readonly
        self.shareMode = shareMode
        self.createdExpenseId = createdExpenseId
    }
}

public struct Trip: Codable, Identifiable, Sendable {
    public let id: String
    public let ownerId: String?
    public let name: String
    public let baseCurrency: Currency
    public let archivedAt: String?
    public let allowApiWrites: Bool?
    public let participants: [Participant]
    public let expenses: [Expense]
    // Nil means that payment details are not available, not that no payments exist.
    public let settlementPayments: [SettlementPayment]?
    public let exchangeRates: ExchangeRates?
    public let visaSettlementEnabled: Bool?
    public let visaSettlementCurrency: Currency?
    public let createdAt: String?

    public var canWrite: Bool { allowApiWrites == true && archivedAt == nil }
    public var settlementCurrency: Currency {
        visaSettlementEnabled == true ? visaSettlementCurrency ?? baseCurrency : baseCurrency
    }
    public init(
        id: String, ownerId: String? = nil, name: String, baseCurrency: Currency,
        archivedAt: String? = nil, allowApiWrites: Bool? = nil,
        participants: [Participant] = [], expenses: [Expense] = [],
        settlementPayments: [SettlementPayment]? = nil, exchangeRates: ExchangeRates? = nil,
        visaSettlementEnabled: Bool? = nil, visaSettlementCurrency: Currency? = nil,
        createdAt: String? = nil
    ) {
        self.id = id
        self.ownerId = ownerId
        self.name = name
        self.baseCurrency = baseCurrency
        self.archivedAt = archivedAt
        self.allowApiWrites = allowApiWrites
        self.participants = participants
        self.expenses = expenses
        self.settlementPayments = settlementPayments
        self.exchangeRates = exchangeRates
        self.visaSettlementEnabled = visaSettlementEnabled
        self.visaSettlementCurrency = visaSettlementCurrency
        self.createdAt = createdAt
    }
}

public struct Participant: Codable, Identifiable, Sendable {
    public let id: String
    public let name: String
    public let settledById: String?
    public init(id: String, name: String, settledById: String? = nil) {
        self.id = id
        self.name = name
        self.settledById = settledById
    }
}

public struct Balance: Codable, Identifiable, Sendable {
    public let participantId: String
    public let name: String
    public let amountMinor: Int64
    public let currency: Currency
    public var id: String { participantId }
    public init(participantId: String, name: String, amountMinor: Int64, currency: Currency) {
        self.participantId = participantId
        self.name = name
        self.amountMinor = amountMinor
        self.currency = currency
    }
}

public struct Settlement: Codable, Identifiable, Sendable {
    public let fromId: String
    public let fromName: String
    public let toId: String
    public let toName: String
    public let amountMinor: Int64
    public let currency: Currency
    public var id: String { "\(fromId):\(toId):\(currency.rawValue)" }
    public init(
        fromId: String, fromName: String, toId: String, toName: String,
        amountMinor: Int64, currency: Currency
    ) {
        self.fromId = fromId
        self.fromName = fromName
        self.toId = toId
        self.toName = toName
        self.amountMinor = amountMinor
        self.currency = currency
    }
}

public struct SettlementPayment: Codable, Identifiable, Sendable {
    public let id: String
    public let fromId: String
    public let toId: String
    public let amountMinor: Int64
    public let currency: Currency
    public let paidAt: String
    public let note: String
    public let createdAt: String?
    public init(
        id: String, fromId: String, toId: String, amountMinor: Int64, currency: Currency,
        paidAt: String, note: String = "", createdAt: String? = nil
    ) {
        self.id = id
        self.fromId = fromId
        self.toId = toId
        self.amountMinor = amountMinor
        self.currency = currency
        self.paidAt = paidAt
        self.note = note
        self.createdAt = createdAt
    }
}
