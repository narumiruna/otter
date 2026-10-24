import Foundation
import OtterKit

enum GroupRules {
    static func validName(_ name: String) -> Bool {
        let value = WebText.trim(name)
        return !value.isEmpty && value.utf16.count <= 100
    }

    static func nameChanged(_ name: String, original: String) -> Bool {
        !WebText.equal(WebText.trim(name), original)
    }
}

enum PeopleDeletionBlock: Equatable {
    case lastParticipant, expense, payment, paymentDetailsUnavailable
}

enum PeopleRules {
    static func deletionBlock(trip: Trip, participantID: String) -> PeopleDeletionBlock? {
        if trip.participants.count <= 1 { return .lastParticipant }
        if trip.expenses.contains(where: {
            $0.paidById == participantID || $0.participantIds.contains(participantID)
        }) {
            return .expense
        }
        guard let payments = trip.settlementPayments else { return .paymentDetailsUnavailable }
        if payments.contains(where: { $0.fromId == participantID || $0.toId == participantID }) {
            return .payment
        }
        return nil
    }

    static func validName(_ name: String, trip: Trip, exceptID: String? = nil) -> Bool {
        let value = WebText.trim(name)
        return !value.isEmpty && value.utf16.count <= 80
            && !trip.participants.contains {
                $0.id != exceptID
                    && WebText.equal(WebText.trim($0.name).lowercased(), value.lowercased())
            }
    }

    static func representatives(trip: Trip, participantID: String) -> [Participant] {
        guard !trip.participants.contains(where: { $0.settledById == participantID }) else {
            return []
        }
        return trip.participants.filter { $0.id != participantID && $0.settledById == nil }
    }

    static func affectedExpenses(trip: Trip, sourceID: String) -> Int {
        trip.expenses.filter {
            $0.paidById == sourceID || $0.participantIds.contains(sourceID)
        }.count
    }

    static func removedPayments(trip: Trip, sourceID: String, targetID: String) -> Int? {
        trip.settlementPayments?.filter {
            ($0.fromId == sourceID && $0.toId == targetID)
                || ($0.fromId == targetID && $0.toId == sourceID)
        }.count
    }
}

enum AccessRules {
    /// The server supplies the token only in the create response. Never construct a token URL.
    static func shareURL(_ value: String?, baseURL: URL) -> URL? {
        guard let value, let parts = URLComponents(string: value),
            let base = URLComponents(url: baseURL, resolvingAgainstBaseURL: false),
            parts.scheme?.lowercased() == base.scheme?.lowercased(),
            parts.host?.lowercased() == base.host?.lowercased(),
            port(parts) == port(base), parts.user == nil, parts.password == nil,
            parts.query == nil, parts.fragment == nil,
            let url = parts.url
        else { return nil }
        let components = parts.path.split(separator: "/", omittingEmptySubsequences: false)
        guard components.count == 3, components[0].isEmpty, components[1] == "share",
            components[2].utf8.count == 43,
            components[2].utf8.allSatisfy({
                (65...90).contains($0) || (97...122).contains($0)
                    || (48...57).contains($0) || $0 == 45 || $0 == 95
            }), parts.percentEncodedPath == parts.path
        else { return nil }
        return url
    }
    private static func port(_ parts: URLComponents) -> Int {
        parts.port ?? (parts.scheme?.lowercased() == "https" ? 443 : 80)
    }
}

enum GroupRatesRules {
    static func customValues(_ payload: TripPayload) -> [String: String] {
        (payload.exchangeRateInfo?.customRates ?? [:]).mapValues { String($0) }
    }

    static func customRates(values: [String: String], base: Currency) throws -> ExchangeRates {
        var result: ExchangeRates = [:]
        for currency in Currency.allCases where currency != base {
            let value = WebText.trim(values[currency.rawValue] ?? "")
            if value.isEmpty { continue }
            guard let number = Double(value), number.isFinite, number > 0 else {
                throw GroupRatesError.invalidRate
            }
            result[currency.rawValue] = number
        }
        return result
    }

    static func automaticRates(_ payload: TripPayload, base: Currency) -> ExchangeRates {
        let rates: ExchangeRates
        if let defaults = payload.exchangeRateInfo?.defaults {
            rates = defaults.rates
        } else if payload.exchangeRateInfo?.source != "custom",
            let current = payload.trip.exchangeRates
        {
            rates = current
        } else {
            rates = ExpenseMath.fixedExchangeRates(baseCurrency: payload.trip.baseCurrency)
        }
        guard let baseRate = rates[base.rawValue], baseRate.isFinite, baseRate > 0 else {
            return ExpenseMath.fixedExchangeRates(baseCurrency: base)
        }
        return rates.mapValues { $0 / baseRate }
    }

    static func validSnapshot(_ snapshot: ExchangeRateSnapshot, base: Currency) -> Bool {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions.insert(.withFractionalSeconds)
        let validTime =
            formatter.date(from: snapshot.fetchedAt) != nil
            || ISO8601DateFormatter().date(from: snapshot.fetchedAt) != nil
        return snapshot.baseCurrency == base && snapshot.source == "BANK_OF_TAIWAN"
            && snapshot.rateType == "spotMid" && snapshot.rates[base.rawValue] == 1
            && validTime
            && snapshot.rates.allSatisfy {
                Currency(rawValue: $0.key) != nil && $0.value.isFinite && $0.value > 0
            }
    }

    static func previewTrip(_ trip: Trip, base: Currency, rates: ExchangeRates) -> Trip {
        Trip(
            id: trip.id, ownerId: trip.ownerId, name: trip.name, baseCurrency: base,
            archivedAt: trip.archivedAt, allowApiWrites: trip.allowApiWrites,
            participants: trip.participants, expenses: trip.expenses,
            settlementPayments: trip.settlementPayments, exchangeRates: rates,
            visaSettlementEnabled: trip.visaSettlementEnabled,
            visaSettlementCurrency: trip.visaSettlementCurrency, createdAt: trip.createdAt)
    }
}

enum GroupRatesError: LocalizedError {
    case invalidRate, invalidSnapshot
    var errorDescription: String? {
        switch self {
        case .invalidRate: NativeLocalization.string("匯率必須是大於零的有限數值。")
        case .invalidSnapshot: NativeLocalization.string("伺服器回傳的匯率快照無效，未變更設定。")
        }
    }
}
