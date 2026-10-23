import Foundation
import OtterKit
import XCTest

@testable import Otter

// This suite runs in the OtterTests target without a server.
final class GroupManagementRulesTests: XCTestCase {
    private let people = [
        Participant(id: "a", name: "Alice"), Participant(id: "b", name: "Bob"),
        Participant(id: "c", name: "Carol"),
    ]
    private func trip(
        participants: [Participant]? = nil, expenses: [Expense] = [],
        payments: [SettlementPayment]? = []
    ) -> Trip {
        Trip(
            id: "trip", name: "Trip", baseCurrency: .twd,
            participants: participants ?? people, expenses: expenses, settlementPayments: payments)
    }
    private var expense: Expense {
        Expense(
            id: "expense", description: "Dinner", amountMinor: 100, currency: .twd,
            paidById: "a", participantIds: ["b"], expenseDate: "2026-10-23")
    }
    private var payment: SettlementPayment {
        SettlementPayment(
            id: "payment", fromId: "a", toId: "b", amountMinor: 10,
            currency: .twd, paidAt: "2026-10-23")
    }

    func testDeletionPrecedenceAndHiddenPaymentDetails() {
        XCTAssertEqual(
            PeopleRules.deletionBlock(
                trip: trip(participants: [people[0]], expenses: [expense], payments: [payment]),
                participantID: "a"), .lastParticipant)
        for id in ["a", "b"] {
            XCTAssertEqual(
                PeopleRules.deletionBlock(
                    trip: trip(expenses: [expense], payments: [payment]), participantID: id),
                .expense)
            XCTAssertEqual(
                PeopleRules.deletionBlock(
                    trip: trip(payments: [payment]), participantID: id), .payment)
        }
        XCTAssertNil(PeopleRules.deletionBlock(trip: trip(), participantID: "c"))
        XCTAssertEqual(
            PeopleRules.deletionBlock(
                trip: trip(payments: nil), participantID: "c"), .paymentDetailsUnavailable)
    }

    func testNameValidationMatchesLengthAndDuplicateRules() {
        XCTAssertFalse(PeopleRules.validName("  ALICE  ", trip: trip()))
        XCTAssertTrue(PeopleRules.validName("Alice", trip: trip(), exceptID: "a"))
        XCTAssertFalse(PeopleRules.validName(" \n ", trip: trip()))
        XCTAssertTrue(PeopleRules.validName(String(repeating: "人", count: 80), trip: trip()))
        XCTAssertFalse(PeopleRules.validName(String(repeating: "人", count: 81), trip: trip()))
        XCTAssertFalse(PeopleRules.validName(String(repeating: "😀", count: 41), trip: trip()))
    }

    func testParticipantNamesUseECMAScriptTrimAndRawDuplicateComparison() {
        let nfc = "Jos\u{00E9}"
        let nfd = "Jose\u{0301}"
        XCTAssertNotEqual(Array(nfc.utf16), Array(nfd.utf16))
        let value = trip(participants: [Participant(id: "a", name: nfc)])
        XCTAssertTrue(PeopleRules.validName(nfd, trip: value))
        XCTAssertFalse(PeopleRules.validName("\u{FEFF}JOS\u{00C9}\u{FEFF}", trip: value))
        XCTAssertFalse(PeopleRules.validName("\u{FEFF}", trip: value))
        for name in ["\u{0085}", "\u{200B}"] {
            XCTAssertTrue(PeopleRules.validName(name, trip: value))
            XCTAssertEqual(Array(WebText.trim(name).utf16), Array(name.utf16))
        }
    }

    func testGroupNamesUseTrimmedUTF16AndDetectSpellingChanges() {
        XCTAssertFalse(GroupRules.validName("\u{FEFF}"))
        XCTAssertTrue(GroupRules.validName("\u{0085}"))
        XCTAssertTrue(GroupRules.validName("\u{200B}"))
        XCTAssertTrue(GroupRules.validName(" " + String(repeating: "😀", count: 50) + " "))
        XCTAssertFalse(GroupRules.validName(String(repeating: "😀", count: 51)))
        XCTAssertFalse(GroupRules.nameChanged("\u{FEFF} Trip \u{FEFF}", original: "Trip"))
        XCTAssertTrue(GroupRules.nameChanged("Jose\u{0301}", original: "Jos\u{00E9}"))
        XCTAssertTrue(GroupRules.nameChanged("\u{200B}Trip", original: "Trip"))
        // Destructive confirmation compares the raw input, without trimming or normalization.
        XCTAssertFalse(WebText.equal("Jose\u{0301}", "Jos\u{00E9}"))
        XCTAssertFalse(WebText.equal(" Trip ", "Trip"))
        XCTAssertTrue(WebText.equal("Jos\u{00E9}", "Jos\u{00E9}"))
    }

    func testCustomRateBlankRulesMatchECMAScriptWithoutNewNumberFormats() throws {
        XCTAssertEqual(
            try GroupRatesRules.customRates(values: ["USD": "\u{FEFF}"], base: .twd), [:])
        XCTAssertEqual(
            try GroupRatesRules.customRates(values: ["USD": "\u{FEFF}32.5\u{FEFF}"], base: .twd),
            ["USD": 32.5])
        for value in ["\u{0085}", "\u{200B}"] {
            XCTAssertThrowsError(
                try GroupRatesRules.customRates(values: ["USD": value], base: .twd))
        }
    }

    @MainActor func testTokenDraftValidatesTrimmedUTF16Name() {
        let draft = AccountTokenDraft()
        for name in [" " + String(repeating: "a", count: 80) + " ", "\u{0085}", "\u{200B}"] {
            draft.name = name
            XCTAssertTrue(draft.validName)
            XCTAssertEqual(Array(draft.name.utf16), Array(name.utf16))
        }
        for name in ["\u{FEFF}", " \n ", String(repeating: "😀", count: 41)] {
            draft.name = name
            XCTAssertFalse(draft.validName)
        }
    }

    func testRepresentativesCannotCreateSelfOrMultilevelRelationships() {
        let members = [
            Participant(id: "a", name: "Alice", settledById: "b"), people[1], people[2],
        ]
        let value = trip(participants: members)
        XCTAssertEqual(
            PeopleRules.representatives(trip: value, participantID: "a").map(\.id), ["b", "c"])
        XCTAssertEqual(PeopleRules.representatives(trip: value, participantID: "b").map(\.id), [])
        XCTAssertEqual(
            PeopleRules.representatives(trip: value, participantID: "c").map(\.id), ["b"])
    }

    func testMergeImpactIncludesBothPaymentDirections() {
        let reversed = SettlementPayment(
            id: "reverse", fromId: "b", toId: "a", amountMinor: 20,
            currency: .twd, paidAt: "2026-10-23")
        let value = trip(expenses: [expense], payments: [payment, reversed])
        XCTAssertEqual(PeopleRules.affectedExpenses(trip: value, sourceID: "b"), 1)
        XCTAssertEqual(PeopleRules.removedPayments(trip: value, sourceID: "a", targetID: "b"), 2)
        XCTAssertNil(
            PeopleRules.removedPayments(trip: trip(payments: nil), sourceID: "a", targetID: "b"))
    }

    func testShareURLsMustBeResponseURLsOnActualServerOrigin() throws {
        let base = try XCTUnwrap(URL(string: "https://otter.example:8443"))
        let token = String(repeating: "a", count: 43)
        XCTAssertNotNil(
            AccessRules.shareURL("https://otter.example:8443/share/\(token)", baseURL: base))
        for invalid in [
            "https://otter.example/share/\(token)",
            "http://otter.example:8443/share/\(token)",
            "https://evil.example:8443/share/\(token)",
            "https://otter.example.evil:8443/share/\(token)",
            "https://user@otter.example:8443/share/\(token)",
            "https://otter.example:8443/share/\(token)?copy=1",
            "https://otter.example:8443/share/\(token)#fragment",
            "https://otter.example:8443/other/\(token)",
            "https://otter.example:8443/share/short",
            "/share/\(token)",
        ] { XCTAssertNil(AccessRules.shareURL(invalid, baseURL: base), invalid) }
        XCTAssertNil(AccessRules.shareURL(nil, baseURL: base))
        let https = try XCTUnwrap(URL(string: "https://otter.example"))
        XCTAssertNotNil(
            AccessRules.shareURL("https://OTTER.example:443/share/\(token)", baseURL: https))
    }

    func testCustomRatesRejectInvalidNumbersWithoutChangingDraft() throws {
        let values = ["USD": " 32.5 ", "JPY": "", "TWD": "invalid"]
        XCTAssertEqual(try GroupRatesRules.customRates(values: values, base: .twd), ["USD": 32.5])
        for invalid in ["0", "-1", "nan", "inf", "1e999", "text", "1,25"] {
            XCTAssertThrowsError(
                try GroupRatesRules.customRates(values: ["USD": invalid], base: .twd))
        }
        XCTAssertEqual(values["USD"], " 32.5 ")
    }

    func testAutomaticRatesRebaseWithoutPreservingCustomOverrides() {
        let payload = TripPayload(
            trip: trip(),
            exchangeRateInfo: ExchangeRateInfo(
                source: "custom", customRates: ["USD": 99],
                defaults: ExchangeRateDefaults(source: "bank", rates: ["TWD": 1, "USD": 32])))
        XCTAssertEqual(
            GroupRatesRules.automaticRates(payload, base: .usd), ["TWD": 1.0 / 32, "USD": 1])
    }

    func testRatePreviewPreservesExpenseSnapshot() throws {
        let frozen = Expense(
            id: "frozen", description: "Hotel", amountMinor: 100,
            currency: .usd, paidById: "a", participantIds: ["b"], expenseDate: "2026-10-23",
            exchangeRate: ExpenseExchangeRate(baseCurrency: .twd, rateToBase: 30, source: "custom"))
        let original = trip(expenses: [frozen])
        let preview = GroupRatesRules.previewTrip(
            original, base: .twd, rates: ["TWD": 1, "USD": 99])
        XCTAssertEqual(preview.expenses[0].exchangeRate?.rateToBase, 30)
        XCTAssertEqual(try Finance.balances(trip: preview).map(\.amountMinor), [30, -30, 0])
        let converted = GroupRatesRules.previewTrip(
            original, base: .jpy, rates: ["TWD": 1, "JPY": 0.2])
        XCTAssertEqual(try Finance.balances(trip: converted).map(\.amountMinor), [150, -150, 0])
    }

    func testSnapshotValidation() {
        func snapshot(_ time: String, rates: ExchangeRates = ["TWD": 1, "USD": 32])
            -> ExchangeRateSnapshot
        {
            ExchangeRateSnapshot(baseCurrency: .twd, fetchedAt: time, rates: rates)
        }
        XCTAssertTrue(
            GroupRatesRules.validSnapshot(snapshot("2026-10-23T12:00:00.000Z"), base: .twd))
        XCTAssertFalse(GroupRatesRules.validSnapshot(snapshot("not a date"), base: .twd))
        XCTAssertFalse(GroupRatesRules.validSnapshot(snapshot("2026-10-23T12:00:00Z"), base: .usd))
        XCTAssertFalse(
            GroupRatesRules.validSnapshot(
                snapshot("2026-10-23T12:00:00Z", rates: ["TWD": 2]), base: .twd))
        XCTAssertFalse(
            GroupRatesRules.validSnapshot(
                snapshot("2026-10-23T12:00:00Z", rates: ["TWD": 1, "BTC": 20]), base: .twd))
    }
}
