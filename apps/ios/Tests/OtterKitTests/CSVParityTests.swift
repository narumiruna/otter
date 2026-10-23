import Foundation
import Testing

@testable import OtterKit

struct CSVParityTests {
    private let header = "date,description,amount,currency,paid_by,category,tags,split_participants"
    private let required = "date,description,amount,currency,paid_by,split_participants"
    private let people = [
        Participant(id: "alice", name: "Alice"), Participant(id: "bob", name: "Bob, Jr"),
    ]

    @Test func webExpenseExportFixture() throws {
        let trip = Trip(
            id: "trip-1", name: "Tokyo", baseCurrency: .twd, participants: people,
            expenses: [
                Expense(
                    id: "expense-1", description: "Dinner, \"sushi\"", amountMinor: 12345,
                    currency: .usd,
                    paidById: "alice", participantIds: ["alice", "bob"], expenseDate: "2026-06-24",
                    category: "餐飲", tags: ["food", "night"])
            ])
        #expect(
            try CSV.tripExpenses(trip: trip) == header
                + "\n2026-06-24,\"Dinner, \"\"sushi\"\"\",123.45,USD,Alice,餐飲,food|night,\"Alice; Bob, Jr\""
        )
    }

    @Test func webUnequalSplitFixtureAndUnknownFallback() throws {
        let trip = Trip(
            id: "trip-1", name: "Tokyo", baseCurrency: .twd,
            participants: [people[0], Participant(id: "bob", name: "Bob")],
            expenses: [
                Expense(
                    id: "e", description: "Taxi", amountMinor: 1000, currency: .twd,
                    paidById: "alice",
                    participantIds: ["alice", "bob"], expenseDate: "2026-06-24",
                    participantShares: [
                        .init(participantId: "alice", shareMinor: 700),
                        .init(participantId: "bob", shareMinor: 300),
                    ]),
                Expense(
                    id: "unknown", description: "Missing", amountMinor: 100, currency: .usd,
                    paidById: "missing", participantIds: ["missing"], expenseDate: "2026-06-25"),
            ])
        #expect(
            try CSV.tripExpenses(trip: trip) == header
                + "\n2026-06-24,Taxi,1000,TWD,Alice,其他,,Alice=700; Bob=300"
                + "\n2026-06-25,Missing,1.00,USD,未知,其他,,未知")
    }

    @Test func webResultFixtureIncludesPaymentsAndNegativeBalances() throws {
        let alice = "Alice, A"
        let bob = "Bob \"B\""
        let trip = Trip(
            id: "t", name: "Tokyo", baseCurrency: .twd,
            participants: [.init(id: "alice", name: alice), .init(id: "bob", name: bob)],
            settlementPayments: [
                .init(
                    id: "p", fromId: "bob", toId: "alice", amountMinor: 100,
                    currency: .twd, paidAt: "2026-06-25", note: "paid cash")
            ])
        let payload = TripPayload(
            trip: trip,
            balances: [
                .init(participantId: "alice", name: alice, amountMinor: 100, currency: .twd),
                .init(participantId: "bob", name: bob, amountMinor: -100, currency: .twd),
            ],
            settlements: [
                .init(
                    fromId: "bob", fromName: bob, toId: "alice", toName: alice, amountMinor: 100,
                    currency: .twd)
            ])
        #expect(
            try CSV.tripResults(payload: payload)
                == [
                    "type,participant,from,to,amount,currency,note",
                    "balance,\"Alice, A\",,,100,TWD,",
                    "balance,\"Bob \"\"B\"\"\",,,-100,TWD,",
                    "settlement,,\"Bob \"\"B\"\"\",\"Alice, A\",100,TWD,",
                    "payment,,\"Bob \"\"B\"\"\",\"Alice, A\",100,TWD,paid cash",
                ].joined(separator: "\n"))
    }

    @Test(arguments: Currency.allCases)
    func allCurrencyExportsUseMajorUnits(_ currency: Currency) throws {
        let amount = currency.minorUnits == 0 ? "12345" : "123.45"
        let trip = Trip(
            id: "t", name: "n", baseCurrency: currency, participants: people,
            expenses: [
                .init(
                    id: "e", description: "Taxi", amountMinor: 12345, currency: currency,
                    paidById: "alice", participantIds: ["alice"], expenseDate: "2026-06-24")
            ])
        let csv = try CSV.tripExpenses(trip: trip)
        #expect(csv.contains(",\(amount),\(currency.rawValue),"))
        #expect(CSV.parseImport(csv, participantNames: ["Alice"]).canImport)
        let payload = TripPayload(
            trip: trip,
            balances: [
                .init(
                    participantId: "alice", name: "Alice", amountMinor: -12345, currency: currency)
            ])
        #expect(try CSV.tripResults(payload: payload).contains(",-\(amount),\(currency.rawValue),"))
    }

    @Test func webQuotedMultilineImportAndBOM() {
        let csv =
            "\u{FEFF}" + header
            + "\r\n2026-06-24,\"Dinner\nSushi, \"\"wow\"\"\",123.45,USD,Alice,餐飲,\"food,night\",\"Alice; Bob\"\r\n"
        let preview = CSV.parseImport(csv, participantNames: [" ALICE ", "bob"])
        #expect(preview.canImport)
        #expect(preview.rows.count == 1)
        #expect(preview.rows[0].rowNumber == 2)
        #expect(preview.rows[0].description == "Dinner\nSushi, \"wow\"")
        #expect(preview.rows[0].category == "餐飲")
        #expect(preview.rows[0].tags == "food,night")
        #expect(preview.rows[0].splitParticipants == ["Alice", "Bob"])
        #expect(preview.rows[0].splitShares == nil)
    }

    @Test func crlfInsideCellsIsQuotedAndPreserved() throws {
        let description = "Dinner\r\nSushi"
        let trip = Trip(
            id: "t", name: "n", baseCurrency: .usd, participants: people,
            expenses: [
                .init(
                    id: "e", description: description, amountMinor: 100, currency: .usd,
                    paidById: "alice", participantIds: ["alice"], expenseDate: "2026-06-24")
            ])
        let csv = try CSV.tripExpenses(trip: trip)
        #expect(csv.contains("\"Dinner\r\nSushi\""))
        #expect(CSV.parseImport(csv).rows[0].description == description)
    }

    @Test func participantNamesUseLowercaseButNotCanonicalEquivalence() {
        // packages/core/src/csv.ts uses a JavaScript Set after lowercasing.
        for (known, other) in [("Jos\u{00E9}", "Jose\u{0301}"), ("Jose\u{0301}", "Jos\u{00E9}")] {
            let control = CSV.parseImport(
                required + "\n2026-06-24,Taxi,1,TWD,\(known.uppercased()),\(known)",
                participantNames: [known])
            #expect(control.canImport)
            for (payer, split) in [(other, known), (known, other), (known, other + "=1")] {
                let preview = CSV.parseImport(
                    required + "\n2026-06-24,Taxi,1,TWD,\(payer),\(split)",
                    participantNames: [known])
                #expect(!preview.canImport)
                #expect(preview.errors.count == 1)
                #expect(preview.errors.first?.row == 2)
                #expect(
                    preview.errors.first.map { Array($0.message.utf16) }
                        == Array("找不到參與者：\(other)".utf16))
            }
        }
    }

    @Test func importFieldsUseECMAScriptTrimWithoutChangingRawSpelling() {
        for space in WebTextFixtures.whitespace {
            // Quote cells so CSV record delimiters remain part of the field under test.
            let cells = ["2026-06-24", "Cafe\u{0301}", "1", "TWD", "Alice", "Alice=1"]
                .map { "\"" + space + $0 + space + "\"" }.joined(separator: ",")
            let preview = CSV.parseImport(
                required + "\n" + cells, participantNames: [space + "ALICE" + space])
            #expect(preview.canImport)
            #expect(
                preview.rows.first.map { Array($0.description.utf16) }
                    == Array("Cafe\u{0301}".utf16))
        }
        for text in WebTextFixtures.nonWhitespace {
            let preview = CSV.parseImport(
                required
                    + "\n2026-06-24,\(text)Taxi\(text),\(text)1\(text),TWD,\(text)Alice\(text),Alice",
                participantNames: ["Alice"])
            #expect(preview.errors.map(\.row) == [2, 2])
            #expect(preview.errors.first?.message == "金額格式錯誤")
            #expect(
                preview.rows.first.map { Array($0.description.utf16) }
                    == Array((text + "Taxi" + text).utf16))
        }
    }

    @Test func webMissingHeadersAndUnknownParticipantErrors() {
        #expect(
            CSV.parseImport("date,amount\n2026-06-24,10").errors == [
                .init(row: 1, message: "缺少欄位：description, currency, paid_by, split_participants")
            ])
        let preview = CSV.parseImport(
            required + "\nbad,Dinner,abc,BTC,Alice,Alice; Missing", participantNames: ["Alice"])
        #expect(
            preview.errors == [
                .init(row: 2, message: "日期格式必須是 YYYY-MM-DD"),
                .init(row: 2, message: "不支援的貨幣"),
                .init(row: 2, message: "找不到參與者：Missing"),
            ])
        #expect(preview.rows.count == 1)
        #expect(!preview.canImport)
    }

    @Test func webExplicitSharesAndPartialShares() {
        let good = CSV.parseImport(
            required + "\n2026-06-24,Taxi,100,TWD,Alice,Alice=70; Bob=30",
            participantNames: ["Alice", "Bob"])
        #expect(good.canImport)
        #expect(
            good.rows[0].splitShares == [
                .init(name: "Alice", amount: "70"), .init(name: "Bob", amount: "30"),
            ])
        #expect(good.rows[0].splitParticipants == ["Alice", "Bob"])
        #expect(
            CSV.parseImport(required + "\n2026-06-24,Taxi,100,TWD,Alice,Alice=70; Bob").errors == [
                .init(row: 2, message: "不平均分帳需每位成員都有金額"),
                .init(row: 2, message: "分帳金額加總必須等於支出金額"),
            ])
        #expect(
            CSV.parseImport(required + "\n2026-06-24,Taxi,100,TWD,Alice,Alice=bad; Bob=30").errors
                == [
                    .init(row: 2, message: "分帳金額格式錯誤"),
                    .init(row: 2, message: "分帳金額加總必須等於支出金額"),
                ])
    }

    @Test func allRowsAreValidatedAndErrorsPreventImport() {
        let preview = CSV.parseImport(
            required + "\n2026-02-29,,0,USD,,\n2024-02-29,Taxi,1.00,USD,Alice,Alice")
        #expect(preview.rows.count == 2)
        #expect(!preview.canImport)
        #expect(
            preview.errors.map(\.message) == [
                "日期格式必須是 YYYY-MM-DD", "描述需為 1-120 字", "金額格式錯誤", "付款人必填", "分帳參與者必填",
            ])
        #expect(preview.errors.allSatisfy { $0.row == 2 })
    }

    @Test(arguments: ["0", "-1", "1.001", "90071992547409.92", "NaN", "1e2", "１"])
    func invalidAmountsMatchWeb(_ amount: String) {
        #expect(
            CSV.parseImport(required + "\n2026-06-24,Taxi,\(amount),USD,Alice,Alice").errors.map(
                \.message) == ["金額格式錯誤"])
    }

    @Test func blankRecordsHeaderOnlyAndDuplicateHeadersMatchWeb() {
        #expect(CSV.parseImport("\u{FEFF}\r\n,,\n").errors == [.init(row: 1, message: "CSV 沒有資料")])
        #expect(CSV.parseImport(header).rows.isEmpty)
        #expect(!CSV.parseImport(header).canImport)
        let preview = CSV.parseImport(
            required + ",description\n\n2026-06-24,ignored,1,TWD,Alice,Alice,Taxi")
        #expect(preview.canImport)
        #expect(preview.rows[0].description == "Taxi")
        #expect(preview.rows[0].rowNumber == 2)
    }

    @Test func unicodeLengthUsesJavaScriptUTF16AndMetadataIsPreserved() {
        let description = String(repeating: "😀", count: 61)
        #expect(
            CSV.parseImport(required + "\n2026-06-24,\(description),1,TWD,Alice,Alice").errors.map(
                \.message) == ["描述需為 1-120 字"])
        let preview = CSV.parseImport(header + "\n2026-06-24,Taxi,1,TWD,Alice,other,one|two,Alice")
        // Core CSV parsing leaves category and tag validation to the server.
        #expect(preview.canImport)
        #expect(preview.rows[0].category == "other")
        #expect(preview.rows[0].tags == "one|two")
    }

    @Test func printEscapesDangerousTextAndUsesOnlyAvailableData() {
        let dangerous = "<script>alert(\"x\")</script><img src='https://secret.test'>&"
        let trip = Trip(
            id: "private-trip-id", ownerId: "private-owner", name: dangerous, baseCurrency: .twd,
            participants: [.init(id: "alice", name: dangerous)],
            expenses: [
                .init(
                    id: "e", description: dangerous, amountMinor: 100, currency: .usd,
                    paidById: "alice",
                    participantIds: ["alice"], expenseDate: "2026-06-24", category: "餐飲",
                    tags: [dangerous],
                    receiptUrl: "https://private-receipt.test")
            ])
        let html = CSV.printHTML(payload: TripPayload(trip: trip, readonly: true))
        #expect(!html.contains("<script>"))
        #expect(!html.contains("<img"))
        #expect(!html.contains("private-owner"))
        #expect(!html.contains("private-trip-id"))
        #expect(!html.contains("private-receipt"))
        #expect(html.contains("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"))
        #expect(html.contains("&#39;https://secret.test&#39;"))
        #expect(html.contains("&amp;"))
        #expect(html.contains("此分享未提供付款明細"))
        #expect(html.contains("display:table-header-group"))
        #expect(html.contains("overflow-wrap:anywhere"))
        #expect(!html.contains("overflow:hidden"))
    }

    @Test func printIncludesEveryExpenseAndPaymentWithoutTruncation() {
        let longName = String(repeating: "長名稱", count: 100)
        let expenses = (0..<120).map { index in
            Expense(
                id: "e\(index)", description: "expense-\(index)", amountMinor: 100, currency: .twd,
                paidById: "a", participantIds: ["a"], expenseDate: "2026-06-24")
        }
        let trip = Trip(
            id: "t", name: longName, baseCurrency: .twd,
            participants: [.init(id: "a", name: longName)], expenses: expenses,
            settlementPayments: [
                .init(
                    id: "p", fromId: "a", toId: "b", amountMinor: 100,
                    currency: .usd, paidAt: "2026-06-25", note: "cash <done>")
            ])
        let html = CSV.printHTML(payload: TripPayload(trip: trip))
        #expect(html.contains(longName))
        for index in 0..<120 { #expect(html.contains("expense-\(index)</td>")) }
        #expect(html.contains("cash &lt;done&gt;"))
        #expect(html.contains("USD 1.00"))
    }
}
