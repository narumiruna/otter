import Foundation
import Testing

@testable import OtterKit

struct FinanceTests {
    // Expected values obtained from packages/core money, expense-splits, settlement and visa-settlement.
    private let people = [
        Participant(id: "a", name: "A"), Participant(id: "b", name: "B", settledById: "c"),
        Participant(id: "c", name: "C"),
    ]
    private let date = "2026-10-23"
    private let timestamp = "2026-10-23T00:00:00Z"

    @Test func allCurrencyConversionsMatchCoreMatrix() throws {
        let expected: [[Int64]] = [
            [12345, 56114, 38578, 35271, 51438, 30110, 58786, 53674, 514375],
            [2716, 12345, 8487, 7760, 11316, 6624, 12933, 11808, 113163],
            [3950, 17956, 12345, 11287, 16460, 9635, 18811, 17176, 164600],
            [4321, 19640, 13502, 12345, 18003, 10538, 20575, 18786, 180031],
            [2963, 13467, 9259, 8465, 12345, 7226, 14109, 12882, 123450],
            [5061, 23007, 15817, 14461, 21089, 12345, 24102, 22006, 210894],
            [2592, 11784, 8101, 7407, 10802, 6323, 12345, 11272, 108019],
            [2839, 12906, 8873, 8112, 11831, 6925, 13521, 12345, 118306],
            [296, 1347, 926, 847, 1235, 723, 1411, 1288, 12345],
        ]
        for (row, from) in Currency.allCases.enumerated() {
            for (column, to) in Currency.allCases.enumerated() {
                #expect(
                    try ExpenseMath.convertMinor(amountMinor: 12345, from: from, to: to)
                        == expected[row][column])
            }
            #expect(ExpenseMath.fixedExchangeRates(baseCurrency: from)[from.rawValue] == 1)
        }
    }

    @Test func javascriptRoundingAndPartialRateFallback() throws {
        for (input, output): (Int64, Int64) in [
            (-5, -2), (-3, -1), (-1, 0), (1, 1), (3, 2), (5, 3),
        ] {
            #expect(
                try ExpenseMath.convertMinor(
                    amountMinor: input, from: .twd, to: .jpy, rates: ["TWD": 1, "JPY": 2]) == output
            )
        }
        #expect(try ExpenseMath.jsRound(0.49999999999999994) == 0)
        #expect(try ExpenseMath.jsRound(-0.5000000000000001) == -1)
        #expect(
            try ExpenseMath.convertMinor(amountMinor: 100, from: .usd, to: .twd, rates: ["USD": 99])
                == 32)
        #expect(
            try ExpenseMath.convertMinor(
                amountMinor: 100, from: .usd, to: .twd, rates: ["USD": 99, "TWD": 1]) == 99)
    }

    @Test func allSplitsAllCurrenciesAndInputOrder() throws {
        for currency in Currency.allCases {
            let ids = ["c", "a", "b"]
            let equal = try ExpenseMath.preview(
                mode: .equal, participantIDs: ids, amountMinor: 101, values: [:], currency: currency
            )
            #expect(equal.map(\.participantId) == ids)
            #expect(equal.map(\.shareMinor) == [34, 34, 33])
            let values = Dictionary(
                uniqueKeysWithValues: zip(ids, [Int64(34), 33, 34]).map {
                    ($0, currency.majorString($1))
                })
            #expect(
                try ExpenseMath.preview(
                    mode: .amount, participantIDs: ids, amountMinor: 101, values: values,
                    currency: currency
                ).map(\.shareMinor) == [34, 33, 34])
            for mode in [SplitMode.ratio, .shares] {
                let result = try ExpenseMath.preview(
                    mode: mode, participantIDs: ids, amountMinor: 101,
                    values: ["c": "1", "a": "2", "b": "3"], currency: currency)
                #expect(result.map(\.shareMinor) == [17, 34, 50])
                #expect(result.reduce(0) { $0 + $1.shareMinor } == 101)
            }
        }
        #expect(
            try ExpenseMath.preview(
                mode: .ratio, participantIDs: ["a", "b"], amountMinor: 7,
                values: ["a": "0.1", "b": "0.2"], currency: .twd
            ).map(\.shareMinor) == [3, 4])
        #expect(
            try ExpenseMath.preview(
                mode: .equal, participantIDs: ["a", "b", "c"],
                amountMinor: ExpenseMath.maximumSafeInteger, values: [:], currency: .usd
            ).map(\.shareMinor) == [
                3_002_399_751_580_331, 3_002_399_751_580_330, 3_002_399_751_580_330,
            ])
    }

    @Test func splitInputsUseECMAScriptTrim() throws {
        for mode in [SplitMode.amount, .ratio, .shares] {
            for space in WebTextFixtures.whitespace {
                #expect(
                    try ExpenseMath.preview(
                        mode: mode, participantIDs: ["a"], amountMinor: 100,
                        values: ["a": space + "1.00" + space], currency: .usd
                    ).map(\.shareMinor) == [100])
            }
            for text in WebTextFixtures.nonWhitespace {
                #expect(throws: (any Error).self) {
                    try ExpenseMath.preview(
                        mode: mode, participantIDs: ["a"], amountMinor: 100,
                        values: ["a": text + "1.00" + text], currency: .usd)
                }
            }
        }
    }

    @Test func rejectInvalidSplitsAndUnsafeNumbers() throws {
        #expect(throws: (any Error).self) {
            try ExpenseMath.preview(
                mode: .equal, participantIDs: [], amountMinor: 1, values: [:], currency: .usd)
        }
        #expect(throws: (any Error).self) {
            try ExpenseMath.preview(
                mode: .equal, participantIDs: ["a", "a"], amountMinor: 2, values: [:],
                currency: .usd)
        }
        #expect(throws: (any Error).self) {
            try ExpenseMath.preview(
                mode: .equal, participantIDs: ["a", "b"], amountMinor: 1, values: [:],
                currency: .usd)
        }
        #expect(throws: (any Error).self) {
            try ExpenseMath.preview(
                mode: .equal, participantIDs: ["a"], amountMinor: .max, values: [:], currency: .usd)
        }
        #expect(throws: (any Error).self) {
            try ExpenseMath.preview(
                mode: .amount, participantIDs: ["a", "b"], amountMinor: 100,
                values: ["a": "0.50", "b": "0.51"], currency: .usd)
        }
        for invalid in [
            "", "0", "-1", "1e2", "1.", ".5", "NaN", "Infinity", "１２",
            String(repeating: "9", count: 400),
        ] {
            #expect(throws: (any Error).self) {
                try ExpenseMath.preview(
                    mode: .ratio, participantIDs: ["a"], amountMinor: 100, values: ["a": invalid],
                    currency: .usd)
            }
        }
        #expect(throws: (any Error).self) {
            try ExpenseMath.preview(
                mode: .ratio, participantIDs: ["a", "b"], amountMinor: 10,
                values: [
                    "a": String(repeating: "9", count: 308),
                    "b": String(repeating: "9", count: 308),
                ], currency: .usd)
        }
        for invalid in [Double.nan, .infinity, 0, -1] {
            #expect(throws: (any Error).self) {
                try ExpenseMath.convertMinor(
                    amountMinor: 1, from: .usd, to: .twd, rates: ["USD": invalid, "TWD": 1])
            }
        }
        #expect(throws: (any Error).self) {
            try ExpenseMath.convertMinor(amountMinor: .max, from: .usd, to: .usd)
        }
        #expect(throws: (any Error).self) {
            try ExpenseMath.convertMinor(
                amountMinor: ExpenseMath.maximumSafeInteger, from: .usd, to: .jpy)
        }
    }

    @Test func preserveAndRescaleExistingShares() throws {
        let old = [
            ParticipantShare(participantId: "a", shareMinor: 1),
            ParticipantShare(participantId: "b", shareMinor: 2),
        ]
        #expect(
            try ExpenseMath.sharesFromExisting(
                participantIDs: ["b", "a"], amountMinor: 3,
                previousAmountMinor: 3, previousShares: old)?.map(\.shareMinor) == [2, 1])
        #expect(
            try ExpenseMath.sharesFromExisting(
                participantIDs: ["a", "b"], amountMinor: 10,
                previousAmountMinor: 3, previousShares: old)?.map(\.shareMinor) == [4, 6])
        #expect(
            try ExpenseMath.sharesFromExisting(
                participantIDs: ["a", "c"], amountMinor: 3,
                previousAmountMinor: 3, previousShares: old) == nil)
    }

    @Test func expenseSnapshotAndRoundedBridge() throws {
        let snapshot = ExpenseExchangeRate(baseCurrency: .twd, rateToBase: 31.5, source: "custom")
        #expect(
            try ExpenseMath.convertExpenseMinor(
                amountMinor: 101, currency: .usd, baseCurrency: .twd,
                snapshot: snapshot, rates: ["USD": 99, "TWD": 1]) == 32)
        #expect(
            try ExpenseMath.convertExpenseMinor(
                amountMinor: 101, currency: .usd, baseCurrency: .eur,
                snapshot: snapshot, rates: ["TWD": 1, "EUR": 35, "USD": 99]) == 91)
        let bank = ExpenseExchangeRate(
            baseCurrency: .twd, rateToBase: 31.5, source: "bank",
            provider: "BANK_OF_TAIWAN", rateType: "spotMid", fetchedAt: timestamp)
        #expect(
            try ExpenseMath.convertExpenseMinor(
                amountMinor: 101, currency: .usd, baseCurrency: .twd, snapshot: bank) == 32)
        for invalid in [
            ExpenseExchangeRate(baseCurrency: .usd, rateToBase: 2, source: "fixed"),
            ExpenseExchangeRate(baseCurrency: .twd, rateToBase: 2, source: "bank"),
            ExpenseExchangeRate(
                baseCurrency: .twd, rateToBase: 2, source: "custom", provider: "BANK_OF_TAIWAN"),
            ExpenseExchangeRate(baseCurrency: .twd, rateToBase: .nan, source: "fixed"),
        ] {
            #expect(throws: (any Error).self) {
                try ExpenseMath.convertExpenseMinor(
                    amountMinor: 100, currency: .usd, baseCurrency: .twd, snapshot: invalid)
            }
        }
    }

    private func roundingExpense() -> Expense {
        Expense(
            id: "e", description: "Example", amountMinor: 5, currency: .usd, paidById: "a",
            participantIds: ["c", "b", "a"], expenseDate: date,
            exchangeRate: ExpenseExchangeRate(baseCurrency: .twd, rateToBase: 50, source: "custom"),
            participantShares: [
                ParticipantShare(participantId: "a", shareMinor: 1),
                ParticipantShare(participantId: "b", shareMinor: 1),
                ParticipantShare(participantId: "c", shareMinor: 3),
            ])
    }

    @Test func explicitConversionRemainderPaymentsAndRepresentatives() throws {
        let payment = SettlementPayment(
            id: "p", fromId: "b", toId: "a", amountMinor: 1, currency: .twd, paidAt: date)
        let trip = Trip(
            id: "t", name: "Example", baseCurrency: .twd, participants: people,
            expenses: [roundingExpense()], settlementPayments: [payment])
        let accounts = try Finance.memberAccounts(trip: trip)
        #expect(accounts.map(\.paidMinor) == [3, 0, 0])
        #expect(accounts.map(\.sharedMinor) == [0, 1, 2])
        #expect(accounts.map(\.balanceMinor) == [2, 0, -2])
        #expect(accounts[0].payments[0].direction == .received)
        #expect(accounts[1].payments[0].direction == .paid)
        #expect(accounts[1].adjustments[0].amountMinor == 0)
        #expect(try Finance.balances(trip: trip).map(\.amountMinor) == [2, 0, -2])
        let settlements = try Finance.settlements(trip: trip)
        #expect(settlements.count == 1)
        #expect(
            settlements[0].fromId == "c" && settlements[0].toId == "a"
                && settlements[0].amountMinor == 2)
        let chainedPeople = [
            Participant(id: "a", name: "A", settledById: "b"),
            Participant(id: "b", name: "B", settledById: "c"), Participant(id: "c", name: "C"),
        ]
        let chain = Trip(
            id: "t", name: "Example", baseCurrency: .twd, participants: chainedPeople,
            expenses: [roundingExpense()], settlementPayments: [])
        #expect(try Finance.balances(trip: chain).map(\.amountMinor) == [0, 0, 0])
    }

    @Test func equalSplitUsesParticipantOrderNotExpenseOrder() throws {
        let expense = Expense(
            id: "e", description: "Example", amountMinor: 5, currency: .twd,
            paidById: "a", participantIds: ["c", "b", "a"], expenseDate: date)
        let trip = Trip(
            id: "t", name: "Example", baseCurrency: .twd, participants: people,
            expenses: [expense], settlementPayments: [])
        #expect(try Finance.memberAccounts(trip: trip).map(\.sharedMinor) == [2, 2, 1])
        #expect(try Finance.balances(trip: trip).map(\.amountMinor) == [3, 0, -3])
    }

    @Test func visaSettlementAndBaseCurrencyAnalysisStaySeparate() throws {
        let visa = VisaExpenseRate(
            sourceCurrency: .usd, targetCurrency: .jpy, date: date, rate: 150.3,
            fetchedAt: timestamp)
        #expect(
            try ExpenseMath.convertVisaExpenseMinor(
                amountMinor: 101, currency: .usd, date: date, rate: visa, targetCurrency: .jpy)
                == 152)
        let expense = Expense(
            id: "e", description: "Example", amountMinor: 101, currency: .usd, paidById: "a",
            participantIds: ["a", "b"], expenseDate: date, visaExchangeRate: visa)
        let trip = Trip(
            id: "t", name: "Example", baseCurrency: .twd, participants: Array(people.prefix(2)),
            expenses: [expense], settlementPayments: [], visaSettlementEnabled: true,
            visaSettlementCurrency: .jpy)
        #expect(try Finance.memberAccounts(trip: trip).map(\.sharedMinor) == [76, 76])
        #expect(try Finance.spendingSummary(trip: trip).totalMinor == 32)
        #expect(try Finance.balances(trip: trip).first?.currency == .jpy)
        #expect(throws: (any Error).self) {
            try ExpenseMath.convertVisaExpenseMinor(
                amountMinor: 101, currency: .usd, date: "2026-10-24", rate: visa)
        }
        #expect(throws: (any Error).self) {
            try ExpenseMath.convertVisaExpenseMinor(
                amountMinor: 101, currency: .usd, date: date, rate: visa, targetCurrency: .eur)
        }
        #expect(throws: (any Error).self) {
            try ExpenseMath.convertVisaExpenseMinor(
                amountMinor: 101, currency: .usd, date: date, rate: nil)
        }
        let badPayment = SettlementPayment(
            id: "p", fromId: "b", toId: "a", amountMinor: 1, currency: .usd, paidAt: date)
        let badTrip = Trip(
            id: "t", name: "Example", baseCurrency: .twd, participants: people,
            expenses: [expense], settlementPayments: [badPayment], visaSettlementEnabled: true,
            visaSettlementCurrency: .jpy)
        #expect(throws: (any Error).self) { try Finance.memberAccounts(trip: badTrip) }
    }

    @Test func readonlyBalancesDoNotInferPrivatePaymentsOrAdjustments() throws {
        let trip = Trip(
            id: "t", name: "Example", baseCurrency: .twd, participants: people,
            expenses: [roundingExpense()])
        let balances = [
            Balance(participantId: "a", name: "A", amountMinor: 1, currency: .twd),
            Balance(participantId: "b", name: "B", amountMinor: 0, currency: .twd),
            Balance(participantId: "c", name: "C", amountMinor: -1, currency: .twd),
        ]
        let accounts = try Finance.memberAccounts(
            payload: TripPayload(
                trip: trip, balances: balances, readonly: true, shareMode: .readonly))
        #expect(accounts.map(\.balanceMinor) == [1, 0, -1])
        #expect(accounts.map(\.sharedMinor) == [0, 1, 2])
        #expect(
            accounts.allSatisfy {
                !$0.paymentDetailsAvailable && $0.payments.isEmpty && $0.adjustments.isEmpty
            })
        let privateTrip = Trip(
            id: "t", name: "Example", baseCurrency: .twd, participants: people,
            expenses: [roundingExpense()],
            settlementPayments: [
                SettlementPayment(
                    id: "secret", fromId: "c", toId: "a", amountMinor: 1, currency: .twd,
                    paidAt: date)
            ])
        let guarded = try Finance.memberAccounts(
            payload: TripPayload(trip: privateTrip, balances: balances, readonly: true))
        #expect(guarded.allSatisfy { $0.payments.isEmpty && $0.adjustments.isEmpty })
    }

    @Test func spendingSummaryOrderingAndConservation() throws {
        let expenses = [
            Expense(
                id: "1", description: "Example", amountMinor: 100, currency: .usd, paidById: "b",
                participantIds: ["b"], expenseDate: "2026-10-24", category: "餐飲"),
            Expense(
                id: "2", description: "Example", amountMinor: 32, currency: .twd, paidById: "a",
                participantIds: ["a"], expenseDate: date),
            Expense(
                id: "3", description: "Example", amountMinor: 100, currency: .jpy, paidById: "b",
                participantIds: ["b"], expenseDate: date, category: "餐飲"),
        ]
        let trip = Trip(
            id: "t", name: "Example", baseCurrency: .twd, participants: people, expenses: expenses)
        let summary = try Finance.spendingSummary(trip: trip)
        #expect(summary.totalMinor == 86)
        #expect(summary.dailyTotals.map(\.amountMinor) == [54, 32])
        #expect(summary.payerTotals.map(\.participantId) == ["b", "a"])
        #expect(summary.categoryTotals.map(\.category) == ["餐飲", "其他"])
        #expect(try Finance.balances(trip: trip).reduce(0) { $0 + $1.amountMinor } == 0)
    }

    @Test func paymentsFloatWhileExpenseSnapshotsStayFixed() throws {
        let expense = Expense(
            id: "e", description: "Example", amountMinor: 100, currency: .usd,
            paidById: "a", participantIds: ["a", "b"], expenseDate: date,
            exchangeRate: ExpenseExchangeRate(baseCurrency: .twd, rateToBase: 30, source: "custom"))
        let payment = SettlementPayment(
            id: "p", fromId: "b", toId: "a", amountMinor: 50,
            currency: .usd, paidAt: date)
        let participants = [Participant(id: "a", name: "A"), Participant(id: "b", name: "B")]
        let initial = Trip(
            id: "t", name: "Example", baseCurrency: .twd, participants: participants,
            expenses: [expense], settlementPayments: [payment],
            exchangeRates: ["TWD": 1, "USD": 30])
        let changed = Trip(
            id: "t", name: "Example", baseCurrency: .twd, participants: participants,
            expenses: [expense], settlementPayments: [payment],
            exchangeRates: ["TWD": 1, "USD": 20])
        #expect(try Finance.balances(trip: initial).map(\.amountMinor) == [0, 0])
        #expect(try Finance.settlements(trip: initial).isEmpty)
        #expect(try Finance.balances(trip: changed).map(\.amountMinor) == [5, -5])
        #expect(try Finance.spendingSummary(trip: initial).totalMinor == 30)
        #expect(try Finance.spendingSummary(trip: changed).totalMinor == 30)
        #expect(try Finance.memberAccounts(trip: changed)[1].payments.first?.amountMinor == 10)
    }

    @Test func visaRejectsUnsafeRatesDatesAndAmounts() throws {
        for invalid in [Double.nan, .infinity, 0, -1] {
            let rate = VisaExpenseRate(
                sourceCurrency: .usd, targetCurrency: .jpy, date: date,
                rate: invalid, fetchedAt: timestamp)
            #expect(throws: (any Error).self) {
                try ExpenseMath.convertVisaExpenseMinor(
                    amountMinor: 100, currency: .usd, date: date, rate: rate)
            }
        }
        let sameCurrency = VisaExpenseRate(
            sourceCurrency: .usd, targetCurrency: .usd, date: date,
            rate: 2, fetchedAt: timestamp)
        #expect(throws: (any Error).self) {
            try ExpenseMath.convertVisaExpenseMinor(
                amountMinor: 100, currency: .usd, date: date, rate: sameCurrency)
        }
        let invalidDate = VisaExpenseRate(
            sourceCurrency: .usd, targetCurrency: .jpy, date: "2026-02-30",
            rate: 150, fetchedAt: timestamp)
        #expect(throws: (any Error).self) {
            try ExpenseMath.convertVisaExpenseMinor(
                amountMinor: 100, currency: .usd, date: "2026-02-30", rate: invalidDate)
        }
        let rate = VisaExpenseRate(
            sourceCurrency: .usd, targetCurrency: .jpy, date: date,
            rate: 150, fetchedAt: timestamp)
        #expect(throws: (any Error).self) {
            try ExpenseMath.convertVisaExpenseMinor(
                amountMinor: ExpenseMath.maximumSafeInteger,
                currency: .usd, date: date, rate: rate)
        }
    }

    @Test func rejectInvalidPersistedSharesAndAggregateOverflow() throws {
        let bad = Expense(
            id: "bad", description: "Example", amountMinor: 10, currency: .usd, paidById: "a",
            participantIds: ["a"], expenseDate: date,
            participantShares: [ParticipantShare(participantId: "a", shareMinor: 9)])
        #expect(throws: (any Error).self) {
            try Finance.memberAccounts(
                trip: Trip(
                    id: "t", name: "Example", baseCurrency: .usd, participants: people,
                    expenses: [bad]))
        }
        let huge = Expense(
            id: "large", description: "Example", amountMinor: ExpenseMath.maximumSafeInteger,
            currency: .usd, paidById: "a", participantIds: ["b"], expenseDate: date)
        let trip = Trip(
            id: "t", name: "Example", baseCurrency: .usd, participants: people,
            expenses: [huge, huge])
        #expect(throws: (any Error).self) { try Finance.spendingSummary(trip: trip) }
        #expect(throws: (any Error).self) { try Finance.memberAccounts(trip: trip) }
    }
}
