import Foundation

public enum FinanceError: Error, Equatable, Sendable {
    case invalidAmount, invalidParticipants, invalidSplit, invalidRate, outOfRange
}

public enum ExpenseMath {
    public static let maximumSafeInteger: Int64 = 9_007_199_254_740_991

    static func checked(_ value: Int64) throws -> Int64 {
        guard value >= -maximumSafeInteger && value <= maximumSafeInteger else {
            throw FinanceError.outOfRange
        }
        return value
    }
    static func add(_ left: Int64, _ right: Int64) throws -> Int64 {
        let (result, overflow) = left.addingReportingOverflow(right)
        guard !overflow else { throw FinanceError.outOfRange }
        return try checked(result)
    }
    static func positive(_ value: Int64) throws {
        guard value > 0 else { throw FinanceError.invalidAmount }
        _ = try checked(value)
    }

    // Math.round chooses the integer toward +infinity at a half, including negative halves.
    // Do not use floor(value + 0.5): the addition loses precision near a half or 2^52.
    static func jsRound(_ value: Double) throws -> Int64 {
        guard value.isFinite else { throw FinanceError.outOfRange }
        let lower = floor(value)
        let result = value - lower < 0.5 ? lower : lower + 1
        guard result >= -Double(maximumSafeInteger), result <= Double(maximumSafeInteger) else {
            throw FinanceError.outOfRange
        }
        return Int64(result)
    }

    public static func preview(
        mode: SplitMode, participantIDs: [String], amountMinor: Int64,
        values: [String: String], currency: Currency
    ) throws -> [ParticipantShare] {
        try positive(amountMinor)
        guard !participantIDs.isEmpty, Set(participantIDs).count == participantIDs.count,
            participantIDs.allSatisfy({ !$0.isEmpty })
        else { throw FinanceError.invalidParticipants }
        if mode == .amount {
            let shares = try participantIDs.map {
                ParticipantShare(
                    participantId: $0, shareMinor: try currency.parseAmount(values[$0] ?? ""))
            }
            let total = try shares.reduce(Int64(0)) { try add($0, $1.shareMinor) }
            guard total == amountMinor else { throw FinanceError.invalidSplit }
            return shares
        }
        let weights = try participantIDs.map { id -> Double in
            if mode == .equal { return 1 }
            let text = WebText.trim(values[id] ?? "")
            guard text.range(of: #"^[0-9]+(\.[0-9]+)?\z"#, options: .regularExpression) != nil,
                text.utf8.allSatisfy({ (48...57).contains($0) || $0 == 46 }),
                let weight = Double(text), weight.isFinite, weight > 0
            else { throw FinanceError.invalidSplit }
            return weight
        }
        return try weighted(
            participantIDs: participantIDs, amountMinor: amountMinor, weights: weights)
    }

    private static func weighted(participantIDs: [String], amountMinor: Int64, weights: [Double])
        throws -> [ParticipantShare]
    {
        let total = weights.reduce(0, +)
        guard total.isFinite, total > 0 else { throw FinanceError.invalidSplit }
        var shares = try weights.map { weight -> Int64 in
            let raw = floor((Double(amountMinor) * weight) / total)
            guard raw.isFinite, raw >= 0, raw <= Double(maximumSafeInteger) else {
                throw FinanceError.outOfRange
            }
            return Int64(raw)
        }
        var remainder = try add(amountMinor, -shares.reduce(Int64(0), { try add($0, $1) }))
        for index in shares.indices where remainder > 0 {
            shares[index] = try add(shares[index], 1)
            remainder -= 1
        }
        guard remainder == 0, shares.allSatisfy({ $0 > 0 }) else { throw FinanceError.invalidSplit }
        return zip(participantIDs, shares).map {
            ParticipantShare(participantId: $0, shareMinor: $1)
        }
    }

    public static func sharesFromExisting(
        participantIDs: [String], amountMinor: Int64,
        previousAmountMinor: Int64, previousShares: [ParticipantShare]?
    ) throws -> [ParticipantShare]? {
        guard let previousShares, !previousShares.isEmpty else { return nil }
        guard Set(previousShares.map(\.participantId)).count == previousShares.count,
            Set(participantIDs).count == participantIDs.count, !participantIDs.isEmpty
        else {
            throw FinanceError.invalidParticipants
        }
        try positive(amountMinor)
        let byID = Dictionary(
            uniqueKeysWithValues: previousShares.map { ($0.participantId, $0.shareMinor) })
        let weights = participantIDs.map { byID[$0] ?? 0 }
        guard weights.allSatisfy({ $0 > 0 }),
            try weights.reduce(Int64(0), { try add($0, $1) }) == previousAmountMinor
        else { return nil }
        return try weighted(
            participantIDs: participantIDs, amountMinor: amountMinor,
            weights: weights.map(Double.init))
    }

    public static func fixedExchangeRates(baseCurrency: Currency) -> ExchangeRates {
        Dictionary(
            uniqueKeysWithValues: Currency.allCases.map {
                ($0.rawValue, fixedRate($0) / fixedRate(baseCurrency))
            })
    }

    private static func fixedRate(_ currency: Currency) -> Double {
        switch currency {
        case .twd: 1
        case .jpy: 0.22
        case .usd: 32
        case .eur: 35
        case .sgd: 24
        case .gbp: 41
        case .aud: 21
        case .cad: 23
        case .krw: 0.024
        }
    }
    static func factor(_ currency: Currency) -> Double { currency.minorUnits == 0 ? 1 : 100 }
    private static func validateRates(_ rates: ExchangeRates?) throws {
        guard
            rates?.allSatisfy({
                Currency(rawValue: $0.key) != nil && $0.value.isFinite && $0.value > 0
            }) ?? true
        else {
            throw FinanceError.invalidRate
        }
    }
    public static func convertMinor(
        amountMinor: Int64, from: Currency, to: Currency,
        rates: ExchangeRates? = nil
    ) throws -> Int64 {
        _ = try checked(amountMinor)
        try validateRates(rates)
        if from == to { return amountMinor }
        let major = Double(amountMinor) / factor(from)
        let target: Double
        if let fromRate = rates?[from.rawValue], let toRate = rates?[to.rawValue] {
            target = (major * fromRate) / toRate
        } else {
            target = (major * fixedRate(from)) / fixedRate(to)
        }
        return try jsRound(target * factor(to))
    }

    public static func convertExpenseMinor(
        amountMinor: Int64, currency: Currency, baseCurrency: Currency,
        snapshot: ExpenseExchangeRate? = nil, rates: ExchangeRates? = nil
    ) throws -> Int64 {
        _ = try checked(amountMinor)
        try validateRates(rates)
        guard let snapshot else {
            return try convertMinor(
                amountMinor: amountMinor, from: currency, to: baseCurrency, rates: rates)
        }
        guard snapshot.rateToBase.isFinite, snapshot.rateToBase > 0,
            currency != snapshot.baseCurrency || snapshot.rateToBase == 1,
            ["bank", "custom", "fixed", "legacy"].contains(snapshot.source)
        else { throw FinanceError.invalidRate }
        if snapshot.source == "bank" {
            guard snapshot.provider == "BANK_OF_TAIWAN", snapshot.rateType == "spotMid",
                validTimestamp(snapshot.fetchedAt)
            else { throw FinanceError.invalidRate }
        } else if snapshot.provider != nil || snapshot.rateType != nil || snapshot.fetchedAt != nil
        {
            throw FinanceError.invalidRate
        }
        if currency == snapshot.baseCurrency && currency == baseCurrency { return amountMinor }
        let original = try jsRound(
            (Double(amountMinor) / factor(currency)) * snapshot.rateToBase
                * factor(snapshot.baseCurrency))
        return snapshot.baseCurrency == baseCurrency
            ? original
            : try convertMinor(
                amountMinor: original, from: snapshot.baseCurrency, to: baseCurrency, rates: rates)
    }

    public static func convertVisaExpenseMinor(
        amountMinor: Int64, currency: Currency, date: String,
        rate: VisaExpenseRate?, targetCurrency: Currency? = nil
    ) throws -> Int64 {
        _ = try checked(amountMinor)
        guard let rate, rate.sourceCurrency == currency, rate.date == date,
            validDate(date), validTimestamp(rate.fetchedAt), rate.rate.isFinite, rate.rate > 0,
            targetCurrency == nil || targetCurrency == rate.targetCurrency,
            currency != rate.targetCurrency || rate.rate == 1
        else { throw FinanceError.invalidRate }
        let result = try jsRound(
            (Double(amountMinor) / factor(currency)) * rate.rate * factor(rate.targetCurrency))
        guard result >= 0 else { throw FinanceError.invalidAmount }
        return result
    }

    static func validTimestamp(_ text: String?) -> Bool {
        guard let text else { return false }
        let formatter = ISO8601DateFormatter()
        if formatter.date(from: text) != nil { return true }
        formatter.formatOptions.insert(.withFractionalSeconds)
        return formatter.date(from: text) != nil
    }
    static func validDate(_ text: String) -> Bool {
        guard text.utf8.count == 10 else { return false }
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.isLenient = false
        guard let date = formatter.date(from: text) else { return false }
        return formatter.string(from: date) == text
    }
}

public struct SpendingDailyTotal: Codable, Sendable {
    public let amountMinor: Int64
    public let date: String
}
public struct SpendingPayerTotal: Codable, Sendable {
    public let amountMinor: Int64
    public let name: String
    public let participantId: String
}
public struct SpendingCategoryTotal: Codable, Sendable {
    public let amountMinor: Int64
    public let category: String
}
public struct SpendingSummary: Codable, Sendable {
    public let totalMinor: Int64
    public let dailyTotals: [SpendingDailyTotal]
    public let payerTotals: [SpendingPayerTotal]
    public let categoryTotals: [SpendingCategoryTotal]
}
public struct MemberExpenseEntry: Codable, Sendable {
    public let expenseId: String
    public let amountMinor: Int64
}
public enum PaymentDirection: String, Codable, Sendable { case paid, received }
public struct MemberPaymentEntry: Codable, Sendable {
    public let paymentId: String
    public let amountMinor: Int64
    public let direction: PaymentDirection
}
public struct MemberAdjustmentEntry: Codable, Sendable {
    public let participantId: String
    public let amountMinor: Int64
}
public struct MemberAccount: Codable, Identifiable, Sendable {
    public let participantId: String
    public var paidMinor: Int64
    public var sharedMinor: Int64
    public var balanceMinor: Int64
    public let currency: Currency
    public var balanceCurrency: Currency
    public var paidExpenses: [MemberExpenseEntry]
    public var sharedExpenses: [MemberExpenseEntry]
    public var payments: [MemberPaymentEntry]
    public var adjustments: [MemberAdjustmentEntry]
    public let paymentDetailsAvailable: Bool
    public var id: String { participantId }
}

public enum Finance {
    // Spending analysis always uses base currency, including Visa trips.
    public static func spendingSummary(trip: Trip) throws -> SpendingSummary {
        var daily: [String: Int64] = [:]
        var payers: [String: Int64] = [:]
        var categories: [String: Int64] = [:]
        var payerOrder: [String] = []
        var categoryOrder: [String] = []
        var total: Int64 = 0
        for expense in trip.expenses {
            try ExpenseMath.positive(expense.amountMinor)
            let amount = try ExpenseMath.convertExpenseMinor(
                amountMinor: expense.amountMinor, currency: expense.currency,
                baseCurrency: trip.baseCurrency, snapshot: expense.exchangeRate,
                rates: trip.exchangeRates)
            total = try ExpenseMath.add(total, amount)
            daily[expense.expenseDate] = try ExpenseMath.add(
                daily[expense.expenseDate] ?? 0, amount)
            if payers[expense.paidById] == nil { payerOrder.append(expense.paidById) }
            payers[expense.paidById] = try ExpenseMath.add(payers[expense.paidById] ?? 0, amount)
            let category = expense.category ?? "其他"
            if categories[category] == nil { categoryOrder.append(category) }
            categories[category] = try ExpenseMath.add(categories[category] ?? 0, amount)
        }
        return SpendingSummary(
            totalMinor: total,
            dailyTotals: daily.keys.sorted().map {
                SpendingDailyTotal(amountMinor: daily[$0] ?? 0, date: $0)
            },
            payerTotals: payerOrder.map { id in
                SpendingPayerTotal(
                    amountMinor: payers[id] ?? 0,
                    name: trip.participants.first { $0.id == id }?.name ?? "Unknown",
                    participantId: id)
            }.enumerated().sorted {
                $0.element.amountMinor == $1.element.amountMinor
                    ? $0.offset < $1.offset : $0.element.amountMinor > $1.element.amountMinor
            }.map(\.element),
            categoryTotals: categoryOrder.map {
                SpendingCategoryTotal(amountMinor: categories[$0] ?? 0, category: $0)
            }
            .enumerated().sorted {
                $0.element.amountMinor == $1.element.amountMinor
                    ? $0.offset < $1.offset : $0.element.amountMinor > $1.element.amountMinor
            }.map(\.element))
    }

    public static func convertExpense(amountMinor: Int64, expense: Expense, trip: Trip) throws
        -> Int64
    {
        if trip.visaSettlementEnabled == true {
            return try ExpenseMath.convertVisaExpenseMinor(
                amountMinor: amountMinor, currency: expense.currency,
                date: expense.expenseDate, rate: expense.visaExchangeRate,
                targetCurrency: trip.settlementCurrency)
        }
        return try ExpenseMath.convertExpenseMinor(
            amountMinor: amountMinor, currency: expense.currency,
            baseCurrency: trip.baseCurrency, snapshot: expense.exchangeRate,
            rates: trip.exchangeRates)
    }

    public static func memberAccounts(trip: Trip) throws -> [MemberAccount] {
        try accounts(trip: trip, includePaymentDetails: trip.settlementPayments != nil)
    }

    // Supplied balances are authoritative. Hidden payment records must not be reconstructed.
    public static func memberAccounts(payload: TripPayload) throws -> [MemberAccount] {
        var result = try accounts(
            trip: payload.trip,
            includePaymentDetails: payload.readonly != true && payload.shareMode != .readonly
                && payload.trip.settlementPayments != nil)
        for index in result.indices {
            if let balance = payload.balances.first(where: {
                $0.participantId == result[index].participantId
            }) {
                result[index].balanceMinor = try ExpenseMath.checked(balance.amountMinor)
                result[index].balanceCurrency = balance.currency
            }
        }
        return result
    }

    private static func accounts(trip: Trip, includePaymentDetails: Bool) throws -> [MemberAccount]
    {
        let ids = trip.participants.map(\.id)
        guard Set(ids).count == ids.count else { throw FinanceError.invalidParticipants }
        var result = trip.participants.map { person in
            MemberAccount(
                participantId: person.id, paidMinor: 0, sharedMinor: 0, balanceMinor: 0,
                currency: trip.settlementCurrency, balanceCurrency: trip.settlementCurrency,
                paidExpenses: [], sharedExpenses: [], payments: [], adjustments: [],
                paymentDetailsAvailable: includePaymentDetails)
        }
        let indexByID = Dictionary(uniqueKeysWithValues: ids.enumerated().map { ($1, $0) })
        for expense in trip.expenses {
            guard let payer = indexByID[expense.paidById] else { continue }
            let split = expense.participantIds.compactMap { indexByID[$0] }.sorted()
            if split.isEmpty { continue }
            guard Set(split).count == split.count else { throw FinanceError.invalidParticipants }
            try ExpenseMath.positive(expense.amountMinor)
            let amount = try convertExpense(
                amountMinor: expense.amountMinor, expense: expense, trip: trip)
            result[payer].paidMinor = try ExpenseMath.add(result[payer].paidMinor, amount)
            result[payer].balanceMinor = try ExpenseMath.add(result[payer].balanceMinor, amount)
            result[payer].paidExpenses.append(
                MemberExpenseEntry(expenseId: expense.id, amountMinor: amount))
            var shares: [Int64]
            if let explicit = expense.participantShares {
                guard Set(explicit.map(\.participantId)).count == explicit.count,
                    Set(explicit.map(\.participantId)) == Set(expense.participantIds)
                else { throw FinanceError.invalidSplit }
                for share in explicit { try ExpenseMath.positive(share.shareMinor) }
                guard
                    try explicit.reduce(Int64(0), { try ExpenseMath.add($0, $1.shareMinor) })
                        == expense.amountMinor
                else {
                    throw FinanceError.invalidSplit
                }
                let byID = Dictionary(
                    uniqueKeysWithValues: explicit.map { ($0.participantId, $0.shareMinor) })
                shares = try split.map {
                    try convertExpense(
                        amountMinor: byID[ids[$0]] ?? 0, expense: expense, trip: trip)
                }
                var remainder = try ExpenseMath.add(
                    amount, -shares.reduce(Int64(0), { try ExpenseMath.add($0, $1) }))
                for index in shares.indices {
                    let adjustment =
                        index == shares.count - 1
                        ? remainder : (remainder == 0 ? 0 : remainder > 0 ? 1 : -1)
                    remainder -= adjustment
                    shares[index] = try ExpenseMath.add(shares[index], adjustment)
                }
            } else {
                let share = amount / Int64(split.count)
                let remainder = amount % Int64(split.count)
                shares = split.indices.map { share + (Int64($0) < remainder ? 1 : 0) }
            }
            for (offset, index) in split.enumerated() {
                result[index].sharedMinor = try ExpenseMath.add(
                    result[index].sharedMinor, shares[offset])
                result[index].balanceMinor = try ExpenseMath.add(
                    result[index].balanceMinor, -shares[offset])
                result[index].sharedExpenses.append(
                    MemberExpenseEntry(expenseId: expense.id, amountMinor: shares[offset]))
            }
        }
        if includePaymentDetails {
            for payment in trip.settlementPayments ?? [] {
                guard let from = indexByID[payment.fromId], let to = indexByID[payment.toId] else {
                    continue
                }
                try ExpenseMath.positive(payment.amountMinor)
                guard
                    trip.visaSettlementEnabled != true
                        || payment.currency == trip.settlementCurrency
                else { throw FinanceError.invalidRate }
                let amount = try ExpenseMath.convertMinor(
                    amountMinor: payment.amountMinor, from: payment.currency,
                    to: trip.settlementCurrency, rates: trip.exchangeRates)
                result[from].balanceMinor = try ExpenseMath.add(result[from].balanceMinor, amount)
                result[to].balanceMinor = try ExpenseMath.add(result[to].balanceMinor, -amount)
                result[from].payments.append(
                    MemberPaymentEntry(paymentId: payment.id, amountMinor: amount, direction: .paid)
                )
                result[to].payments.append(
                    MemberPaymentEntry(
                        paymentId: payment.id, amountMinor: amount, direction: .received))
            }
            // Match core iteration order, including chains in legacy data.
            for (index, person) in trip.participants.enumerated() {
                if let id = person.settledById, let representative = indexByID[id],
                    representative != index
                {
                    let transferred = result[index].balanceMinor
                    result[index].adjustments.append(
                        MemberAdjustmentEntry(participantId: id, amountMinor: -transferred))
                    result[representative].adjustments.append(
                        MemberAdjustmentEntry(participantId: person.id, amountMinor: transferred))
                    result[representative].balanceMinor = try ExpenseMath.add(
                        result[representative].balanceMinor, transferred)
                    result[index].balanceMinor = 0
                }
            }
        }
        return result
    }

    public static func balances(trip: Trip) throws -> [Balance] {
        // Pure core calculations treat an absent payment list as empty. Public views must use the payload overload.
        let accounts = try accounts(trip: trip, includePaymentDetails: true)
        return zip(trip.participants, accounts).map { person, account in
            Balance(
                participantId: person.id, name: person.name, amountMinor: account.balanceMinor,
                currency: account.currency)
        }
    }

    public static func settlements(trip: Trip) throws -> [Settlement] {
        let balances = try balances(trip: trip)
        var debtors = balances.enumerated().filter { $0.element.amountMinor < 0 }
            .sorted {
                $0.element.amountMinor == $1.element.amountMinor
                    ? $0.offset < $1.offset : $0.element.amountMinor < $1.element.amountMinor
            }
            .map { ($0.element, -$0.element.amountMinor) }
        var creditors = balances.enumerated().filter { $0.element.amountMinor > 0 }
            .sorted {
                $0.element.amountMinor == $1.element.amountMinor
                    ? $0.offset < $1.offset : $0.element.amountMinor > $1.element.amountMinor
            }
            .map { ($0.element, $0.element.amountMinor) }
        var result: [Settlement] = []
        var debtor = 0
        var creditor = 0
        while debtor < debtors.count && creditor < creditors.count {
            let amount = min(debtors[debtor].1, creditors[creditor].1)
            if amount > 0 {
                let from = debtors[debtor].0
                let to = creditors[creditor].0
                result.append(
                    Settlement(
                        fromId: from.participantId, fromName: from.name,
                        toId: to.participantId, toName: to.name, amountMinor: amount,
                        currency: trip.settlementCurrency))
            }
            debtors[debtor].1 -= amount
            creditors[creditor].1 -= amount
            if debtors[debtor].1 == 0 { debtor += 1 }
            if creditors[creditor].1 == 0 { creditor += 1 }
        }
        return result
    }
}
