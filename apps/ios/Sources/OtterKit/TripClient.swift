import Foundation

public struct TripPatch: Encodable, Sendable {
    public var name: String?
    public var baseCurrency: Currency?
    public var archived: Bool?
    public var exchangeRates: [String: Double]?
    public var clearExchangeRates = false
    public var allowApiWrites: Bool?

    public init(
        name: String? = nil, baseCurrency: Currency? = nil, archived: Bool? = nil,
        exchangeRates: [String: Double]? = nil, clearExchangeRates: Bool = false,
        allowApiWrites: Bool? = nil
    ) {
        self.name = name
        self.baseCurrency = baseCurrency
        self.archived = archived
        self.exchangeRates = exchangeRates
        self.clearExchangeRates = clearExchangeRates
        self.allowApiWrites = allowApiWrites
    }
    enum CodingKeys: String, CodingKey {
        case name, baseCurrency, archived, exchangeRates, allowApiWrites
    }
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeIfPresent(name, forKey: .name)
        try container.encodeIfPresent(baseCurrency, forKey: .baseCurrency)
        try container.encodeIfPresent(archived, forKey: .archived)
        try container.encodeIfPresent(allowApiWrites, forKey: .allowApiWrites)
        if clearExchangeRates {
            try container.encode([String: Double](), forKey: .exchangeRates)
        } else {
            try container.encodeIfPresent(exchangeRates, forKey: .exchangeRates)
        }
    }
}

extension OtterClient {
    public func user() async throws -> User {
        let response: UserResponse = try await api("GET", path: "api/me")
        guard let user = response.user else { throw APIError.unauthorized }
        return user
    }
    public func trips() async throws -> TripsResponse { try await api("GET", path: "api/trips") }
    public func trip(id: String) async throws -> TripPayload {
        try await api("GET", path: tripPath(id))
    }
    public func createTrip(name: String, currency: Currency) async throws -> TripPayload {
        struct Body: Encodable {
            let name: String
            let baseCurrency: Currency
        }
        return try await api(
            "POST", path: "api/trips", body: encode(Body(name: name, baseCurrency: currency)))
    }
    public func updateTrip(id: String, patch: TripPatch) async throws -> TripPayload {
        try await api("PATCH", path: tripPath(id), body: encode(patch))
    }
    public func copyTrip(id: String) async throws -> TripPayload {
        try await api("POST", path: tripPath(id) + "/copy")
    }
    public func deleteTrip(id: String) async throws {
        let _: OkResponse = try await api("DELETE", path: tripPath(id))
    }
    public func setVisa(tripID: String, enabled: Bool, currency: Currency) async throws
        -> TripPayload
    {
        struct Body: Encodable {
            let enabled: Bool
            let currency: Currency
        }
        return try await api(
            "PATCH", path: tripPath(tripID) + "/visa-settlement",
            body: encode(Body(enabled: enabled, currency: currency)))
    }
    public func addParticipant(tripID: String, name: String) async throws -> TripPayload {
        try await api(
            "POST", path: tripPath(tripID) + "/participants", body: encode(["name": name]))
    }
    public func renameParticipant(tripID: String, participantID: String, name: String) async throws
        -> TripPayload
    {
        try await api(
            "PATCH", path: participantPath(tripID, participantID), body: encode(["name": name]))
    }
    public func setRepresentative(tripID: String, participantID: String, representativeID: String?)
        async throws -> TripPayload
    {
        struct Body: Encodable {
            let settledById: String?
            enum CodingKeys: String, CodingKey { case settledById }
            func encode(to encoder: Encoder) throws {
                var c = encoder.container(keyedBy: CodingKeys.self)
                try c.encode(settledById, forKey: .settledById)
            }
        }
        return try await api(
            "PATCH", path: participantPath(tripID, participantID),
            body: encode(Body(settledById: representativeID)))
    }
    public func deleteParticipant(tripID: String, participantID: String) async throws -> TripPayload
    {
        try await api("DELETE", path: participantPath(tripID, participantID))
    }
    public func mergeParticipant(tripID: String, sourceID: String, targetID: String) async throws
        -> TripPayload
    {
        try await api(
            "POST", path: participantPath(tripID, sourceID) + "/merge",
            body: encode(["targetParticipantId": targetID]))
    }
    public func addExpense(tripID: String, input: NewExpense) async throws -> TripPayload {
        _ = try input.currency.parseAmount(input.amount)
        return try await api("POST", path: tripPath(tripID) + "/expenses", body: encode(input))
    }
    public func addQueuedExpense(tripID: String, body: Data, operationID: UUID, userID: String)
        async throws -> TripPayload
    {
        try await api(
            "POST", path: tripPath(tripID) + "/expenses", body: body,
            headers: [
                "Idempotency-Key": operationID.uuidString.lowercased(),
                "X-Otter-Queue-User": userID,
            ])
    }
    public func updateExpense(tripID: String, expense: Expense, input: NewExpense) async throws
        -> TripPayload
    {
        _ = try input.currency.parseAmount(input.amount)
        return try await api(
            "PATCH", path: expensePath(tripID, expense.id), body: encode(input),
            version: observedVersion(expense))
    }
    public func deleteExpense(tripID: String, expense: Expense) async throws -> TripPayload {
        try await api(
            "DELETE", path: expensePath(tripID, expense.id), version: observedVersion(expense))
    }
    public func expenseHistory(tripID: String, expenseID: String? = nil, cursor: String? = nil)
        async throws -> ExpenseHistoryPage
    {
        var query = "?limit=20"
        if let expenseID { query += "&expenseId=" + (try Self.identifier(expenseID)) }
        if let cursor { query += "&cursor=" + (try Self.identifier(cursor)) }
        return try await api("GET", path: tripPath(tripID) + "/expense-history" + query)
    }
    public func restoreExpense(
        tripID: String, expenseID: String, revisionID: String, currentVersion: Int
    ) async throws -> TripPayload {
        try await api(
            "POST", path: expensePath(tripID, expenseID) + "/restore",
            body: encode(["revisionId": revisionID]), version: currentVersion)
    }
    public func receipt(tripID: String, expenseID: String) async throws -> Data {
        try await data(
            "GET", path: expensePath(tripID, expenseID) + "/receipt",
            headers: ["Accept": "image/jpeg,image/png,image/webp"])
    }
    public func uploadReceipt(tripID: String, expense: Expense, bytes: Data, mimeType: String)
        async throws -> TripPayload
    {
        guard ["image/jpeg", "image/png", "image/webp"].contains(mimeType), !bytes.isEmpty,
            bytes.count <= 5 * 1024 * 1024
        else { throw APIError.invalidReceipt }
        return try await api(
            "PUT", path: expensePath(tripID, expense.id) + "/receipt", body: bytes,
            version: observedVersion(expense), headers: ["Content-Type": mimeType])
    }
    public func deleteReceipt(tripID: String, expense: Expense) async throws -> TripPayload {
        try await api(
            "DELETE", path: expensePath(tripID, expense.id) + "/receipt",
            version: observedVersion(expense))
    }
    public func recordSettlement(tripID: String, settlement: Settlement) async throws -> TripPayload
    {
        try await recordPayment(
            tripID: tripID, fromID: settlement.fromId, toID: settlement.toId,
            amount: settlement.currency.majorString(settlement.amountMinor),
            currency: settlement.currency)
    }
    public func recordPayment(
        tripID: String, fromID: String, toID: String, amount: String, currency: Currency,
        paidAt: String? = nil, note: String = ""
    ) async throws -> TripPayload {
        struct Body: Encodable {
            let fromId: String
            let toId: String
            let amount: String
            let currency: Currency
            let paidAt: String?
            let note: String
        }
        _ = try currency.parseAmount(amount)
        return try await api(
            "POST", path: tripPath(tripID) + "/settlement-payments",
            body: encode(
                Body(
                    fromId: fromID, toId: toID, amount: amount, currency: currency, paidAt: paidAt,
                    note: note)))
    }
    public func deletePayment(tripID: String, paymentID: String) async throws -> TripPayload {
        try await api(
            "DELETE", path: tripPath(tripID) + "/settlement-payments/" + Self.identifier(paymentID))
    }
    public func addCollaborator(tripID: String, username: String) async throws -> TripPayload {
        try requireSession()
        return try await api(
            "POST", path: tripPath(tripID) + "/members", body: encode(["username": username]))
    }
    public func removeCollaborator(tripID: String, userID: String) async throws -> TripPayload {
        try requireSession()
        return try await api(
            "DELETE", path: tripPath(tripID) + "/members/" + Self.identifier(userID))
    }
    public func createShare(tripID: String, mode: ShareMode) async throws -> TripPayload {
        try requireSession()
        return try await api(
            "POST", path: tripPath(tripID) + "/share-links", body: encode(["mode": mode.rawValue]))
    }
    public func revokeShare(tripID: String, linkID: String) async throws -> TripPayload {
        try requireSession()
        return try await api(
            "DELETE", path: tripPath(tripID) + "/share-links/" + Self.identifier(linkID))
    }
    public func backup(tripID: String) async throws -> Data {
        try await data("GET", path: tripPath(tripID) + "/backup")
    }
    public func restoreBackup(_ bytes: Data) async throws -> TripPayload {
        guard bytes.count <= 10 * 1024 * 1024 else { throw APIError.invalidResponse }
        return try await api("POST", path: "api/trips/restore", body: bytes)
    }
    public func importCSV(tripID: String, csv: String) async throws -> TripPayload {
        try await api(
            "POST", path: tripPath(tripID) + "/expenses/import", body: encode(["csv": csv]))
    }
    func participantPath(_ tripID: String, _ participantID: String) throws -> String {
        try tripPath(tripID) + "/participants/" + Self.identifier(participantID)
    }
    func expensePath(_ tripID: String, _ expenseID: String) throws -> String {
        try tripPath(tripID) + "/expenses/" + Self.identifier(expenseID)
    }
    func observedVersion(_ expense: Expense) throws -> Int {
        guard let version = expense.version, version > 0 else { throw APIError.missingVersion }
        return version
    }
    public func requireSession() throws {
        guard auth.isSession else { throw APIError.sessionRequired }
    }
}
