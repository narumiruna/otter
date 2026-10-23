import Foundation
import OtterKit

struct IntegrationFailure: Error, CustomStringConvertible {
    let description: String
    init(_ description: String) { self.description = description }
}

func require(_ condition: Bool, _ message: String) throws {
    guard condition else { throw IntegrationFailure(message) }
}

func unwrap<T>(_ value: T?, _ message: String) throws -> T {
    guard let value else { throw IntegrationFailure(message) }
    return value
}

func json<T: Encodable>(_ value: T) throws -> JSONValue {
    try JSONDecoder().decode(JSONValue.self, from: JSONEncoder().encode(value))
}

func decode<T: Decodable>(_ value: JSONValue, as type: T.Type = T.self) throws -> T {
    try JSONDecoder().decode(type, from: JSONEncoder().encode(value))
}

struct DifferentialFixture: Decodable {
    let cases: [DifferentialCase]
    let csv: String
}

struct DifferentialCase: Decodable {
    let name: String
    let kind: String
    let input: JSONValue
    let expected: JSONValue
    let throwsError: Bool
}

private struct SplitInput: Decodable {
    let mode: SplitMode
    let participantIDs: [String]
    let amountMinor: Int64
    let values: [String: String]
    let currency: Currency
}
private struct ExistingInput: Decodable {
    let participantIDs: [String]
    let amountMinor: Int64
    let previousAmountMinor: Int64
    let previousShares: [ParticipantShare]?
}
private struct ConvertInput: Decodable {
    let amountMinor: Int64
    let from: Currency
    let to: Currency
    let rates: ExchangeRates?
}
private struct ExpenseConvertInput: Decodable {
    let amountMinor: Int64
    let currency: Currency
    let baseCurrency: Currency
    let snapshot: ExpenseExchangeRate?
    let rates: ExchangeRates?
}
private struct VisaConvertInput: Decodable {
    let amountMinor: Int64
    let currency: Currency
    let date: String
    let rate: VisaExpenseRate?
    let targetCurrency: Currency?
}
private struct ParseInput: Decodable {
    let amount: String
    let currency: Currency
}
private struct QueryInput: Decodable {
    let trip: Trip
    let filters: ExpenseFilters
    let grouping: ExpenseGrouping?
}
private struct GroupIDs: Encodable {
    let key: String
    let ids: [String]
    let totals: [ExpenseCurrencyTotal]
}

private func evaluate(_ test: DifferentialCase) throws -> JSONValue {
    switch test.kind {
    case "balances":
        return try json(Finance.balances(trip: decode(test.input)))
    case "settlements":
        return try json(Finance.settlements(trip: decode(test.input)))
    case "accounts":
        return try json(Finance.memberAccounts(trip: decode(test.input)))
    case "summary":
        return try json(Finance.spendingSummary(trip: decode(test.input)))
    case "split":
        let input: SplitInput = try decode(test.input)
        return try json(
            ExpenseMath.preview(
                mode: input.mode, participantIDs: input.participantIDs,
                amountMinor: input.amountMinor, values: input.values, currency: input.currency))
    case "existing":
        let input: ExistingInput = try decode(test.input)
        return try json(
            ExpenseMath.sharesFromExisting(
                participantIDs: input.participantIDs,
                amountMinor: input.amountMinor, previousAmountMinor: input.previousAmountMinor,
                previousShares: input.previousShares))
    case "convert":
        let input: ConvertInput = try decode(test.input)
        return try json(
            ExpenseMath.convertMinor(
                amountMinor: input.amountMinor, from: input.from,
                to: input.to, rates: input.rates))
    case "expense-convert":
        let input: ExpenseConvertInput = try decode(test.input)
        return try json(
            ExpenseMath.convertExpenseMinor(
                amountMinor: input.amountMinor,
                currency: input.currency, baseCurrency: input.baseCurrency,
                snapshot: input.snapshot,
                rates: input.rates))
    case "visa-convert":
        let input: VisaConvertInput = try decode(test.input)
        return try json(
            ExpenseMath.convertVisaExpenseMinor(
                amountMinor: input.amountMinor,
                currency: input.currency, date: input.date, rate: input.rate,
                targetCurrency: input.targetCurrency))
    case "parse":
        let input: ParseInput = try decode(test.input)
        return try json(input.currency.parseAmount(input.amount))
    case "query", "groups":
        let input: QueryInput = try decode(test.input)
        let expenses = try ExpenseQuery.filterAndSort(
            trip: input.trip, filters: input.filters,
            locale: Locale(identifier: "en_US_POSIX"))
        if test.kind == "query" { return try json(expenses.map(\.id)) }
        let groups = try ExpenseQuery.groups(
            expenses: expenses, trip: input.trip,
            grouping: unwrap(input.grouping, "Missing grouping"), sort: input.filters.sort,
            locale: Locale(identifier: "en_US_POSIX"))
        return try json(
            groups.map { GroupIDs(key: $0.key, ids: $0.expenses.map(\.id), totals: $0.totals) })
    default: throw IntegrationFailure("Unknown differential kind: \(test.kind)")
    }
}

func runDifferential(_ fixture: DifferentialFixture) throws {
    var counts: [String: Int] = [:]
    for test in fixture.cases {
        let result: JSONValue
        do {
            result = try evaluate(test)
        } catch {
            guard test.throwsError, error is FinanceError || error is APIError else {
                throw IntegrationFailure(
                    "Differential case failed: \(test.name) (\(type(of: error)))")
            }
            counts[test.kind, default: 0] += 1
            continue
        }
        try require(!test.throwsError, "Differential case did not reject: \(test.name)")
        try require(result == test.expected, "Differential result differs: \(test.name)")
        counts[test.kind, default: 0] += 1
    }
    for kind in counts.keys.sorted() { print("PASS differential \(kind): \(counts[kind] ?? 0)") }
    print("PASS differential total: \(fixture.cases.count)")
}
