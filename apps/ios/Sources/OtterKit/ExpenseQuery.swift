import Foundation

public enum ExpenseSort: String, Codable, CaseIterable, Sendable {
    case dateDescending = "date-desc"
    case dateAscending = "date-asc"
    case amountDescending = "amount-desc"
    case amountAscending = "amount-asc"
}
public enum ExpenseGrouping: String, Codable, CaseIterable, Sendable { case date, payer, none }

public struct ExpenseFilters: Codable, Sendable, Equatable {
    public var query: String
    public var dateFrom: String
    public var dateTo: String
    public var paidById: String
    public var participantId: String
    public var currency: String
    public var category: String
    public var tag: String
    public var sort: ExpenseSort
    public init(
        query: String = "", dateFrom: String = "", dateTo: String = "", paidById: String = "",
        participantId: String = "", currency: String = "", category: String = "", tag: String = "",
        sort: ExpenseSort = .dateDescending
    ) {
        self.query = query
        self.dateFrom = dateFrom
        self.dateTo = dateTo
        self.paidById = paidById
        self.participantId = participantId
        self.currency = currency
        self.category = category
        self.tag = tag
        self.sort = sort
    }
}

public struct ExpenseCurrencyTotal: Codable, Sendable {
    public let currency: Currency
    public let amountMinor: Int64
}
public struct ExpenseGroup: Codable, Identifiable, Sendable {
    public let key: String
    public let expenses: [Expense]
    // Group headings use original currencies, not converted or Visa totals.
    public let totals: [ExpenseCurrencyTotal]
    public var id: String { key }
}

public enum ExpenseQuery {
    // Web uses localeCompare with the current locale. Callers can supply that locale explicitly.
    private static func compare(_ left: String, _ right: String, locale: Locale) -> Int {
        switch left.compare(right, options: [], range: nil, locale: locale) {
        case .orderedAscending: -1
        case .orderedDescending: 1
        case .orderedSame: 0
        }
    }
    public static func filterAndSort(
        trip: Trip, filters: ExpenseFilters = ExpenseFilters(),
        locale: Locale = .current
    ) throws -> [Expense] {
        let query = WebText.trim(filters.query).lowercased()
        let expenses = trip.expenses.filter { expense in
            (query.isEmpty || WebText.contains(expense.description.lowercased(), query))
                && (filters.dateFrom.isEmpty || expense.expenseDate >= filters.dateFrom)
                && (filters.dateTo.isEmpty || expense.expenseDate <= filters.dateTo)
                && (filters.paidById.isEmpty || expense.paidById == filters.paidById)
                && (filters.participantId.isEmpty
                    || expense.participantIds.contains(filters.participantId))
                && (filters.currency.isEmpty || expense.currency.rawValue == filters.currency)
                && (filters.category.isEmpty || (expense.category ?? "其他") == filters.category)
                && (filters.tag.isEmpty
                    || (expense.tags ?? []).contains { WebText.equal($0, filters.tag) })
        }
        switch filters.sort {
        case .dateAscending, .dateDescending:
            return expenses.enumerated().sorted { left, right in
                var order = compare(
                    left.element.expenseDate, right.element.expenseDate, locale: locale)
                if order == 0 {
                    order = compare(
                        left.element.createdAt ?? "", right.element.createdAt ?? "", locale: locale)
                }
                if order == 0 { order = compare(left.element.id, right.element.id, locale: locale) }
                if order == 0 { return left.offset < right.offset }
                return filters.sort == .dateAscending ? order < 0 : order > 0
            }.map(\.element)
        case .amountAscending, .amountDescending:
            let amounts = try expenses.map { expense in
                try ExpenseMath.convertExpenseMinor(
                    amountMinor: expense.amountMinor, currency: expense.currency,
                    baseCurrency: trip.baseCurrency, snapshot: expense.exchangeRate,
                    rates: trip.exchangeRates)
            }
            return expenses.enumerated().sorted { left, right in
                let a = amounts[left.offset]
                let b = amounts[right.offset]
                if a == b { return left.offset < right.offset }
                return filters.sort == .amountAscending ? a < b : a > b
            }.map(\.element)
        }
    }

    public static func groups(
        expenses: [Expense], trip: Trip, grouping: ExpenseGrouping,
        sort: ExpenseSort = .dateDescending, locale: Locale = .current
    ) throws -> [ExpenseGroup] {
        var keys: [String] = []
        var grouped: [String: [Expense]] = [:]
        if grouping == .none {
            keys = ["all"]
            grouped["all"] = expenses
        } else {
            for expense in expenses {
                let key = grouping == .date ? expense.expenseDate : expense.paidById
                if grouped[key] == nil { keys.append(key) }
                grouped[key, default: []].append(expense)
            }
        }
        if grouping == .date {
            keys.sort { compare($0, $1, locale: locale) * (sort == .dateAscending ? 1 : -1) < 0 }
        } else if grouping == .payer {
            let order = Dictionary(
                trip.participants.enumerated().map { ($1.id, $0) },
                uniquingKeysWith: { first, _ in first })
            keys.sort {
                let a = order[$0] ?? Int.max
                let b = order[$1] ?? Int.max
                return a == b ? compare($0, $1, locale: locale) < 0 : a < b
            }
        }
        return try keys.map { key in
            let group = grouped[key] ?? []
            var currencies: [Currency] = []
            var totals: [Currency: Int64] = [:]
            for expense in group {
                if totals[expense.currency] == nil { currencies.append(expense.currency) }
                totals[expense.currency] = try ExpenseMath.add(
                    totals[expense.currency] ?? 0, expense.amountMinor)
            }
            return ExpenseGroup(
                key: key, expenses: group,
                totals: currencies.map {
                    ExpenseCurrencyTotal(currency: $0, amountMinor: totals[$0] ?? 0)
                })
        }
    }
}
