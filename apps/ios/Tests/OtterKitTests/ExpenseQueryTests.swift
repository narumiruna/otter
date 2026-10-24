import Foundation
import Testing

@testable import OtterKit

struct ExpenseQueryTests {
    private let locale = Locale(identifier: "en_US")
    private func fixture() -> Trip {
        Trip(
            id: "t", name: "Example", baseCurrency: .twd,
            participants: [Participant(id: "b", name: "B"), Participant(id: "a", name: "A")],
            expenses: [
                Expense(
                    id: "z", description: "Lunch", amountMinor: 100, currency: .usd, paidById: "a",
                    participantIds: ["a", "b"], expenseDate: "2026-10-23", category: "餐飲",
                    tags: ["food"], createdAt: "2026-10-23T00:00:00Z"),
                Expense(
                    id: "a", description: "Lunch train", amountMinor: 32, currency: .twd,
                    paidById: "b", participantIds: ["a"], expenseDate: "2026-10-23", category: "交通",
                    tags: ["travel"], createdAt: "2026-10-23T01:00:00Z"),
                Expense(
                    id: "b", description: "Coffee", amountMinor: 200, currency: .jpy, paidById: "b",
                    participantIds: ["b"], expenseDate: "2026-10-24", tags: ["food"],
                    createdAt: "2026-10-23T00:00:00Z"),
                Expense(
                    id: "c", description: "Earlier", amountMinor: 20, currency: .twd, paidById: "a",
                    participantIds: ["a"], expenseDate: "2026-10-22",
                    createdAt: "2026-10-23T00:00:00Z"),
                Expense(
                    id: "d", description: "Snapshot", amountMinor: 100, currency: .usd,
                    paidById: "a", participantIds: ["a"], expenseDate: "2026-10-23",
                    exchangeRate: ExpenseExchangeRate(
                        baseCurrency: .twd, rateToBase: 10, source: "custom"),
                    createdAt: "2026-10-23T01:00:00Z"),
            ], visaSettlementEnabled: true, visaSettlementCurrency: .jpy)
    }

    private func ids(_ filters: ExpenseFilters) throws -> [String] {
        try ExpenseQuery.filterAndSort(trip: fixture(), filters: filters, locale: locale).map(\.id)
    }

    @Test func everyFilterAndInclusiveDateRange() throws {
        #expect(try ids(ExpenseFilters(query: "  LUNCH  ")) == ["a", "z"])
        #expect(
            try ids(ExpenseFilters(dateFrom: "2026-10-23", dateTo: "2026-10-23")) == [
                "d", "a", "z",
            ])
        #expect(try ids(ExpenseFilters(paidById: "b")) == ["b", "a"])
        #expect(try ids(ExpenseFilters(participantId: "b")) == ["b", "z"])
        #expect(try ids(ExpenseFilters(currency: "USD")) == ["d", "z"])
        #expect(try ids(ExpenseFilters(category: "其他")) == ["b", "d", "c"])
        #expect(try ids(ExpenseFilters(tag: "food")) == ["b", "z"])
        #expect(try ids(ExpenseFilters(tag: "Food")).isEmpty)
        #expect(
            try ids(
                ExpenseFilters(
                    query: "lunch", dateFrom: "2026-10-23", dateTo: "2026-10-23", paidById: "a",
                    participantId: "b", currency: "USD", category: "餐飲", tag: "food")) == ["z"])
        #expect(try ids(ExpenseFilters(dateFrom: "2026-10-24", dateTo: "2026-10-22")).isEmpty)
    }

    @Test func descriptionAndTagMatchingUseRawUTF16LikeWebIncludes() throws {
        // apps/web/src/client/client-support.ts lowercases descriptions, but not tags.
        for (stored, other) in [("Caf\u{00E9}", "Cafe\u{0301}"), ("Cafe\u{0301}", "Caf\u{00E9}")] {
            let trip = Trip(
                id: "t", name: "Trip", baseCurrency: .twd,
                expenses: [
                    Expense(
                        id: "e", description: "Before " + stored + " after", amountMinor: 1,
                        currency: .twd, paidById: "a", participantIds: ["a"],
                        expenseDate: "2026-10-23", tags: [stored])
                ])
            for query in [stored, stored.uppercased(), "BEFORE", "after"] {
                #expect(
                    try ExpenseQuery.filterAndSort(
                        trip: trip, filters: ExpenseFilters(query: query)
                    ).count
                        == 1)
            }
            #expect(
                try ExpenseQuery.filterAndSort(trip: trip, filters: ExpenseFilters(query: other))
                    .isEmpty)
            #expect(
                try ExpenseQuery.filterAndSort(trip: trip, filters: ExpenseFilters(tag: other))
                    .isEmpty)
            #expect(
                try ExpenseQuery.filterAndSort(trip: trip, filters: ExpenseFilters(tag: stored))
                    .count == 1)
            #expect(
                try ExpenseQuery.filterAndSort(
                    trip: trip, filters: ExpenseFilters(tag: stored.uppercased())
                ).isEmpty)
        }
    }

    @Test func queryUsesECMAScriptTrim() throws {
        for space in WebTextFixtures.whitespace {
            #expect(try ids(ExpenseFilters(query: space + "LUNCH" + space)) == ["a", "z"])
        }
        for text in WebTextFixtures.nonWhitespace {
            #expect(try ids(ExpenseFilters(query: text + "LUNCH" + text)).isEmpty)
        }
    }

    @Test func dateSortHasCreatedAtAndIDTieBreakers() throws {
        #expect(try ids(ExpenseFilters()) == ["b", "d", "a", "z", "c"])
        #expect(try ids(ExpenseFilters(sort: .dateAscending)) == ["c", "z", "a", "d", "b"])
    }

    @Test func amountSortUsesBaseSnapshotsNotVisaAndStableTies() throws {
        #expect(try ids(ExpenseFilters(sort: .amountAscending)) == ["d", "c", "z", "a", "b"])
        #expect(try ids(ExpenseFilters(sort: .amountDescending)) == ["b", "z", "a", "c", "d"])
    }

    @Test func groupingMatchesWebOrderAndOriginalCurrencyTotals() throws {
        let trip = fixture()
        let expenses = try ExpenseQuery.filterAndSort(trip: trip, locale: locale)
        let byDate = try ExpenseQuery.groups(
            expenses: expenses, trip: trip, grouping: .date, locale: locale)
        #expect(byDate.map(\.key) == ["2026-10-24", "2026-10-23", "2026-10-22"])
        #expect(byDate[1].expenses.map(\.id) == ["d", "a", "z"])
        #expect(byDate[1].totals.map(\.currency) == [.usd, .twd])
        #expect(byDate[1].totals.map(\.amountMinor) == [200, 32])
        let dateAsc = try ExpenseQuery.groups(
            expenses: expenses, trip: trip, grouping: .date, sort: .dateAscending, locale: locale)
        #expect(dateAsc.map(\.key) == ["2026-10-22", "2026-10-23", "2026-10-24"])
        let byPayer = try ExpenseQuery.groups(
            expenses: expenses, trip: trip, grouping: .payer, locale: locale)
        #expect(byPayer.map(\.key) == ["b", "a"])
        #expect(byPayer[0].expenses.map(\.id) == ["b", "a"])
        let none = try ExpenseQuery.groups(expenses: expenses, trip: trip, grouping: .none)
        #expect(none.count == 1 && none[0].key == "all")
        #expect(none[0].expenses.map(\.id) == expenses.map(\.id))
    }

    @Test func unknownPayersFollowKnownParticipantsAndMissingTimestampsAreCompatible() throws {
        let expenses = ["z", "a", "b"].map { id in
            Expense(
                id: id, description: "Example", amountMinor: 1, currency: .twd, paidById: id,
                participantIds: [id], expenseDate: "2026-10-23")
        }
        let trip = Trip(
            id: "t", name: "Example", baseCurrency: .twd,
            participants: [Participant(id: "b", name: "B")], expenses: expenses)
        #expect(
            try ExpenseQuery.filterAndSort(trip: trip, locale: locale).map(\.id) == ["z", "b", "a"])
        #expect(
            try ExpenseQuery.groups(
                expenses: expenses, trip: trip, grouping: .payer, locale: locale
            ).map(\.key) == ["b", "a", "z"])
        #expect(try ExpenseQuery.groups(expenses: [], trip: trip, grouping: .date).isEmpty)
    }

    @Test func filtersRoundTripAndOverflowIsRejected() throws {
        let filters = ExpenseFilters(query: "Example", tag: "travel", sort: .amountAscending)
        #expect(
            try JSONDecoder().decode(ExpenseFilters.self, from: JSONEncoder().encode(filters))
                == filters)
        let huge = Expense(
            id: "e", description: "Example", amountMinor: ExpenseMath.maximumSafeInteger,
            currency: .twd, paidById: "a", participantIds: ["a"], expenseDate: "2026-10-23")
        #expect(throws: (any Error).self) {
            try ExpenseQuery.groups(expenses: [huge, huge], trip: fixture(), grouping: .none)
        }
    }
}
